import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager } from "./browser.js";
import { loadConfig, mergeConfig } from "./config.js";
import path from "path";
import fs from "fs";

const server = new Server(
  {
    name: "mkd2pic",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const browserManager = new BrowserManager();

// 加载预设配置
const presetConfig = loadConfig();

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: "md2pic",
        description:
          "Convert Markdown content to picture/image. Supports rich formatting including code highlighting, KaTeX math formulas, Mermaid diagrams, ECharts charts, and info cards. Perfect for social media posts, blog images, or documentation.",
        inputSchema: {
          type: "object",
          properties: {
            markdown: {
              type: "string",
              description: "Markdown content to convert to image",
            },
            output_path: {
              type: "string",
              description:
                "Output file path for the generated image (default: ~/Downloads/mkd2pic-exports/{timestamp}.png)",
            },
            format: {
              type: "string",
              enum: ["xhs", "pyq", "free"],
              description:
                "Export format: xhs (Xiaohongshu 3:4), pyq (Moments 9:16), free (flexible)",
              default: "xhs",
            },
            mode: {
              type: "string",
              enum: ["single", "multi", "pdf"],
              description:
                "Export mode: single (one long image), multi (smart split + ZIP), pdf",
              default: "multi",
            },
            cover_title: {
              type: "string",
              description: "Cover page main title (if cover is enabled)",
            },
            cover_subtitle: {
              type: "string",
              description: "Cover page subtitle (if cover is enabled)",
            },
            background: {
              type: "object",
              description: "Background settings override",
              properties: {
                type: {
                  type: "string",
                  enum: ["gradient", "solid", "image"],
                },
                preset: {
                  type: "string",
                },
                customStartColor: {
                  type: "string",
                },
                customEndColor: {
                  type: "string",
                },
                gradientDirection: {
                  type: "string",
                },
                solidColor: {
                  type: "string",
                },
              },
            },
            header: {
              type: "object",
              description: "Header settings override",
              properties: {
                name: { type: "string" },
                nameColor: { type: "string" },
                avatar: { type: "string" },
              },
            },
            footer: {
              type: "object",
              description: "Footer settings override",
              properties: {
                text: { type: "string" },
                textColor: { type: "string" },
              },
            },
            layout: {
              type: "object",
              description: "Layout settings override",
              properties: {
                fontSize: { type: "number" },
                width: { type: "number" },
                padding: { type: "number" },
              },
            },
          },
          required: ["markdown"],
        },
      },
      {
        name: "md2pic_file",
        description:
          "Read a Markdown file and convert it to image. Similar to md2pic but reads from file path.",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the Markdown file to convert",
            },
            output_path: {
              type: "string",
              description: "Output file path for the generated image",
            },
            format: {
              type: "string",
              enum: ["xhs", "pyq", "free"],
              description: "Export format",
              default: "xhs",
            },
            mode: {
              type: "string",
              enum: ["single", "multi", "pdf"],
              description: "Export mode",
              default: "multi",
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "md2pic_preview",
        description:
          "Generate a preview of Markdown rendering without exporting. Useful for debugging or checking the layout before exporting.",
        inputSchema: {
          type: "object",
          properties: {
            markdown: {
              type: "string",
              description: "Markdown content to preview",
            },
            format: {
              type: "string",
              enum: ["xhs", "pyq", "free"],
              description: "Preview format",
              default: "xhs",
            },
          },
          required: ["markdown"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "md2pic" || name === "md2pic_file") {
      if (!args) {
        throw new Error("Missing arguments");
      }

      let markdown: string;
      let outputPath: string | undefined;
      let format = ((args.format as string) || presetConfig.export.default_format) as string;
      let mode = ((args.mode as string) || presetConfig.export.default_mode) as string;

      // 合并配置
      const config = mergeConfig(presetConfig, args);

      if (name === "md2pic_file") {
        const filePath = args.file_path as string;
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        markdown = fs.readFileSync(filePath, "utf-8");
        // 自动生成输出文件名
        if (!args.output_path) {
          const timestamp = Date.now();
          const ext = mode === "pdf" ? "pdf" : "png";
          outputPath = path.join(
            presetConfig.output.default_dir.replace("~", process.env.HOME || ""),
            `export-${timestamp}.${ext}`
          );
        } else {
          outputPath = args.output_path as string;
        }
      } else {
        markdown = args.markdown as string;
        outputPath = (args.output_path as string) || path.join(
          presetConfig.output.default_dir.replace("~", process.env.HOME || ""),
          `export-${Date.now()}.${mode === "pdf" ? "pdf" : "png"}`
        );
      }

      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 使用浏览器渲染并导出
      const result = await browserManager.convert(
        markdown,
        outputPath,
        format,
        mode,
        config.render
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === "md2pic_preview") {
      if (!args) {
        throw new Error("Missing arguments");
      }
      const markdown = args.markdown as string;
      const format = ((args.format as string) || "xhs") as string;

      const previewUrl = await browserManager.preview(markdown, format);

      return {
        content: [
          {
            type: "text",
            text: `Preview generated at: ${previewUrl}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mkd2pic MCP server started");
}

main().catch(console.error);
