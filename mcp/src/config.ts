import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ConvertConfig {
  cover: {
    enabled: boolean;
    title: string;
    subtitle: string;
    titleFontSize: number;
    subtitleFontSize: number;
    titleColor: string;
    subtitleColor: string;
    titleWeight: string;
    subtitleWeight: string;
    fontFamily: string;
    textEffect: string;
    layout: string;
    gap: number;
    showHeader: boolean;
    showFooter: boolean;
  };
  header: {
    enabled: boolean;
    name: string;
    nameColor: string;
    paddingTop: number;
    paddingBottom: number;
    showPageNumber: boolean;
    pageNumberColor: string;
  };
  footer: {
    enabled: boolean;
    text: string;
    textColor: string;
    fontSize: number;
    letterSpacing: number;
    paddingTop: number;
    paddingBottom: number;
    showDivider: boolean;
    dividerColor: string;
  };
  background: {
    type: string;
    preset: string;
    customStartColor: string;
    customEndColor: string;
    gradientDirection: string;
    solidColor: string;
    imageBlur: number;
    imageOpacity: number;
  };
  layout: {
    fontSize: number;
    width: number;
    padding: number;
  };
}

export interface PresetConfig {
  output: {
    default_dir: string;
  };
  export: {
    default_format: string;
    default_mode: string;
  };
  render: ConvertConfig;
}

interface UserArgs {
  background?: Partial<ConvertConfig["background"]>;
  header?: Partial<ConvertConfig["header"]>;
  footer?: Partial<ConvertConfig["footer"]>;
  layout?: Partial<ConvertConfig["layout"]>;
  cover_title?: string;
  cover_subtitle?: string;
}

const defaultRenderConfig: ConvertConfig = {
  cover: {
    enabled: true,
    title: "",
    subtitle: "",
    titleFontSize: 48,
    subtitleFontSize: 22,
    titleColor: "#1a1a2e",
    subtitleColor: "#525252",
    titleWeight: "700",
    subtitleWeight: "400",
    fontFamily: "system",
    textEffect: "none",
    layout: "center",
    gap: 16,
    showHeader: true,
    showFooter: true,
  },
  header: {
    enabled: true,
    name: "MoonlitClear",
    nameColor: "#1a1a2e",
    paddingTop: 14,
    paddingBottom: 10,
    showPageNumber: true,
    pageNumberColor: "#878787",
  },
  footer: {
    enabled: true,
    text: "AI为基，认知破界",
    textColor: "#878787",
    fontSize: 12,
    letterSpacing: 1,
    paddingTop: 14,
    paddingBottom: 18,
    showDivider: true,
    dividerColor: "#787878",
  },
  background: {
    type: "gradient",
    preset: "gradient1",
    customStartColor: "#667eea",
    customEndColor: "#764ba2",
    gradientDirection: "135deg",
    solidColor: "#f5f5f5",
    imageBlur: 12,
    imageOpacity: 0.3,
  },
  layout: {
    fontSize: 18,
    width: 640,
    padding: 40,
  },
};

export function loadConfig(): PresetConfig {
  const configPath = path.join(__dirname, "..", "madopic_config.json");

  const preset: PresetConfig = {
    output: {
      default_dir: "~/Downloads/mkd2pic-exports",
    },
    export: {
      default_format: "xhs",
      default_mode: "multi",
    },
    render: JSON.parse(JSON.stringify(defaultRenderConfig)) as ConvertConfig,
  };

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const saved = JSON.parse(raw);

      if (saved.output) Object.assign(preset.output, saved.output);
      if (saved.export) Object.assign(preset.export, saved.export);
      if (saved.cover) Object.assign(preset.render.cover, saved.cover);
      if (saved.header) Object.assign(preset.render.header, saved.header);
      if (saved.footer) Object.assign(preset.render.footer, saved.footer);
      if (saved.background) Object.assign(preset.render.background, saved.background);
      if (saved.layout) Object.assign(preset.render.layout, saved.layout);
    } catch (e) {
      console.warn("Failed to load config, using defaults");
    }
  }

  return preset;
}

export function mergeConfig(
  preset: PresetConfig,
  userArgs: UserArgs
): PresetConfig {
  const merged = JSON.parse(JSON.stringify(preset)) as PresetConfig;

  // 合并背景
  if (userArgs.background) {
    Object.assign(merged.render.background, userArgs.background);
  }

  // 合并封面
  if (userArgs.cover_title !== undefined) {
    merged.render.cover.title = userArgs.cover_title;
  }
  if (userArgs.cover_subtitle !== undefined) {
    merged.render.cover.subtitle = userArgs.cover_subtitle;
  }

  // 合并页眉
  if (userArgs.header) {
    Object.assign(merged.render.header, userArgs.header);
  }

  // 合并页脚
  if (userArgs.footer) {
    Object.assign(merged.render.footer, userArgs.footer);
  }

  // 合并布局
  if (userArgs.layout) {
    Object.assign(merged.render.layout, userArgs.layout);
  }

  return merged;
}
