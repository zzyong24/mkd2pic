#!/usr/bin/env python3
"""
mkd2pic 本地开发服务器

提供静态文件服务 + 配置读写 API，打通 Web UI 与 MCP 配置文件。

用法：
    python server.py              # 默认 8090 端口
    python server.py --port 9000  # 自定义端口

路由：
    GET  /              → 静态文件（index.html 等）
    GET  /api/config    → 读取 mcp/madopic_config.json
    POST /api/config    → 深度合并写入 mcp/madopic_config.json
"""

import argparse
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# 配置文件路径（相对于本脚本所在目录）
BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "mcp" / "madopic_config.json"

DEFAULT_PORT = 8090


def deep_merge(base: dict, override: dict) -> dict:
    """深度合并 override 到 base（就地修改 base 并返回）"""
    for key, value in override.items():
        if (
            isinstance(value, dict)
            and key in base
            and isinstance(base[key], dict)
        ):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def read_config() -> dict:
    """读取配置文件，不存在则返回空字典"""
    if not CONFIG_PATH.exists():
        return {}
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def write_config(data: dict) -> None:
    """写入配置文件（确保目录存在）"""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


class MkdHandler(SimpleHTTPRequestHandler):
    """静态文件 + 配置 API"""

    def __init__(self, *args, **kwargs):
        # 以 BASE_DIR 为静态文件根目录
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    # ---------- API 路由 ----------

    def do_GET(self):
        if self.path == "/api/config":
            return self._handle_get_config()
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/config":
            return self._handle_post_config()
        self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        """处理 CORS 预检"""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    # ---------- 配置读写 ----------

    def _handle_get_config(self):
        try:
            config = read_config()
            body = json.dumps(config, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self._send_json_error(500, str(e))

    def _handle_post_config(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return self._send_json_error(400, "Empty body")
            if content_length > 1_000_000:  # 1 MB 上限
                return self._send_json_error(413, "Payload too large")

            raw = self.rfile.read(content_length)
            incoming = json.loads(raw.decode("utf-8"))

            if not isinstance(incoming, dict):
                return self._send_json_error(400, "Expected JSON object")

            # 深度合并到现有配置
            existing = read_config()
            merged = deep_merge(existing, incoming)
            write_config(merged)

            body = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(body)
        except json.JSONDecodeError as e:
            self._send_json_error(400, f"Invalid JSON: {e}")
        except Exception as e:
            self._send_json_error(500, str(e))

    # ---------- 辅助 ----------

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json_error(self, code: int, message: str):
        body = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # 简化日志：只显示 API 请求，静态文件请求静默
        msg = format % args
        if "/api/" in msg:
            sys.stderr.write(f"[mkd2pic] {msg}\n")


def main():
    parser = argparse.ArgumentParser(description="mkd2pic 本地服务器")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"监听端口（默认 {DEFAULT_PORT}）")
    args = parser.parse_args()

    server = HTTPServer(("127.0.0.1", args.port), MkdHandler)
    print(f"🎨 mkd2pic 服务器已启动: http://localhost:{args.port}")
    print(f"📁 配置文件: {CONFIG_PATH}")
    print("按 Ctrl+C 停止")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.server_close()


if __name__ == "__main__":
    main()
