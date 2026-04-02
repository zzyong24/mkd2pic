import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { ConvertConfig } from "./config.js";

interface ConvertResult {
  success: boolean;
  files: string[];
  page_count?: number;
  message?: string;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private mkd2picUrl: string = "http://localhost:8080";

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async convert(
    markdown: string,
    outputPath: string,
    format: string,
    mode: string,
    config: ConvertConfig
  ): Promise<ConvertResult> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 访问 mkd2pic
      await page.goto(this.mkd2picUrl, { waitUntil: "networkidle0" });

      // 注入 Markdown 内容
      await page.evaluate((md) => {
        const textarea = document.getElementById("markdownInput") as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = md;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, markdown);

      // 应用格式设置
      await page.evaluate((fmt) => {
        // 切换模式
        const modeMap = { xhs: "modeXhsBtn", pyq: "modePyqBtn", free: "modeFreeBtn" };
        const btnId = modeMap[fmt as keyof typeof modeMap] || "modeXhsBtn";
        const btn = document.getElementById(btnId);
        if (btn) btn.click();
      }, format);

      // 应用配置
      await this.applyConfig(page, config);

      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 导出
      if (mode === "multi") {
        await this.exportMulti(page, outputPath);
      } else if (mode === "pdf") {
        await this.exportPdf(page, outputPath);
      } else {
        await this.exportSingle(page, outputPath);
      }

      return {
        success: true,
        files: [outputPath],
        message: `Exported to ${outputPath}`,
      };
    } finally {
      await page.close();
    }
  }

  async preview(markdown: string, format: string): Promise<string> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(this.mkd2picUrl, { waitUntil: "networkidle0" });

      await page.evaluate((md) => {
        const textarea = document.getElementById("markdownInput") as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = md;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, markdown);

      await page.evaluate((fmt) => {
        const modeMap = { xhs: "modeXhsBtn", pyq: "modePyqBtn", free: "modeFreeBtn" };
        const btnId = modeMap[fmt as keyof typeof modeMap] || "modeXhsBtn";
        const btn = document.getElementById(btnId);
        if (btn) btn.click();
      }, format);

      // 返回当前页面 URL 作为预览
      return page.url();
    } finally {
      // 不关闭页面，让用户可以查看预览
    }
  }

  private async applyConfig(page: Page, config: ConvertConfig): Promise<void> {
    await page.evaluate((cfg) => {
      // 应用背景配置
      if (cfg.background) {
        const bg = cfg.background;
        if (bg.type === "gradient" && bg.preset) {
          const presetBtn = document.querySelector(`[data-bg="${bg.preset}"]`) as HTMLElement;
          if (presetBtn) presetBtn.click();
        }
      }

      // 应用封面配置
      if (cfg.cover) {
        const cover = cfg.cover;
        const coverEnabled = document.getElementById("coverEnabled") as HTMLInputElement;
        if (coverEnabled) coverEnabled.checked = cover.enabled;

        if (cover.title) {
          const titleEl = document.getElementById("coverTitle") as HTMLTextAreaElement;
          if (titleEl) titleEl.value = cover.title;
        }
        if (cover.subtitle) {
          const subtitleEl = document.getElementById("coverSubtitle") as HTMLTextAreaElement;
          if (subtitleEl) subtitleEl.value = cover.subtitle;
        }
      }

      // 应用页眉配置
      if (cfg.header) {
        const header = cfg.header;
        const headerName = document.getElementById("headerName") as HTMLInputElement;
        if (headerName && header.name) headerName.value = header.name;
      }

      // 应用页脚配置
      if (cfg.footer) {
        const footer = cfg.footer;
        const footerText = document.getElementById("footerText") as HTMLInputElement;
        if (footerText && footer.text) footerText.value = footer.text;
      }

      // 应用布局配置
      if (cfg.layout) {
        const layout = cfg.layout;
        if (layout.fontSize) {
          const fontSlider = document.getElementById("fontSizeSlider") as HTMLInputElement;
          if (fontSlider) {
            fontSlider.value = String(layout.fontSize);
            fontSlider.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        if (layout.width) {
          const widthSlider = document.getElementById("widthSlider") as HTMLInputElement;
          if (widthSlider) {
            widthSlider.value = String(layout.width);
            widthSlider.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        if (layout.padding) {
          const paddingSlider = document.getElementById("paddingSlider") as HTMLInputElement;
          if (paddingSlider) {
            paddingSlider.value = String(layout.padding);
            paddingSlider.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }

      // 点击渲染按钮
      const renderBtn = document.getElementById("renderBtn");
      if (renderBtn) renderBtn.click();
    }, config);
  }

  private async exportSingle(page: Page, outputPath: string): Promise<void> {
    await page.evaluate(() => {
      const btn = document.getElementById("exportPngBtn");
      if (btn) btn.click();
    });

    // 等待下载完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 下载后移到目标路径
    const downloadsDir = process.env.HOME + "/Downloads";
    const files = fs.readdirSync(downloadsDir);
    const latestFile = files
      .filter((f) => f.startsWith("madopic-export") && f.endsWith(".png"))
      .sort()
      .pop();

    if (latestFile) {
      const src = path.join(downloadsDir, latestFile);
      fs.copyFileSync(src, outputPath);
      fs.unlinkSync(src);
    }
  }

  private async exportMulti(page: Page, outputPath: string): Promise<void> {
    await page.evaluate(() => {
      const btn = document.getElementById("exportMultiPngBtn");
      if (btn) btn.click();
    });

    // 等待多图导出完成
    await new Promise(resolve => setTimeout(resolve, 5000));

    const downloadsDir = process.env.HOME + "/Downloads";
    const zipFile = fs
      .readdirSync(downloadsDir)
      .filter((f) => f.startsWith("madopic-multi") && f.endsWith(".zip"))
      .sort()
      .pop();

    if (zipFile) {
      const src = path.join(downloadsDir, zipFile);
      fs.copyFileSync(src, outputPath);
      fs.unlinkSync(src);
    }
  }

  private async exportPdf(page: Page, outputPath: string): Promise<void> {
    await page.evaluate(() => {
      const btn = document.getElementById("exportPdfBtn");
      if (btn) btn.click();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const downloadsDir = process.env.HOME + "/Downloads";
    const pdfFile = fs
      .readdirSync(downloadsDir)
      .filter((f) => f.startsWith("madopic") && f.endsWith(".pdf"))
      .sort()
      .pop();

    if (pdfFile) {
      const src = path.join(downloadsDir, pdfFile);
      fs.copyFileSync(src, outputPath);
      fs.unlinkSync(src);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
