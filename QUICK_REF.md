# 🎨 MADOPIC 工程 - 快速查询表

## 📌 一句话总结
**纯前端 Markdown 转图片工具** — 无后端、无框架、所见即所得，支持多格式导出（PNG/PDF/HTML/ZIP）

---

## 1️⃣ 项目类型 & 技术栈

| 维度 | 答案 |
|------|------|
| **项目类型** | 纯前端单页应用 (SPA) - 零后端 |
| **框架** | 无框架（原生 HTML/CSS/JS） |
| **主要库** | marked.js, KaTeX, Mermaid, ECharts, Prism, html2canvas, jsPDF, JSZip |
| **文件数** | 3 个（index.html, style.css, script.js） |
| **代码量** | 4,773 行 JS + 1,892+ 行 CSS |
| **部署方式** | 直接双击 HTML 或本地 HTTP 服务器 |

---

## 2️⃣ 核心功能 & 实现方式

### A. 图文格式带动画效果

#### 动画类型
```
CSS 动画（无需外部库）
├─ fadeIn        → posterContent 淡入 (0.3s-0.5s)
└─ renderPulse   → Render 按钮脉冲 (1.5s 循环)
```

#### 动画定义位置
- **文件**: `style.css` 第 776-786 行（renderPulse）
- **文件**: `style.css` 第 1570-1577 行（fadeIn）

#### 动画触发方式
```javascript
// 首次预览时
posterContent.style.animation = 'fadeIn 0.3s ease';

// 配置变更时
#renderBtn.render-dirty {
    animation: renderPulse 1.5s ease-in-out infinite;
}
```

### B. Markdown 渲染管线

```
输入 → 预处理 → marked.parse() → DOM更新 → 异步渲染器链 → 完成
```

- **主函数**: `updatePreview()` (script.js 第 2088 行)
- **防抖**: 300ms 延迟避免频繁渲染

### C. 图片生成系统

#### 核心技术: html2canvas
- **库**: `html2canvas` v1.4.1 (CDN 懒加载)
- **功能**: DOM → Canvas 像素级渲染
- **位置**: `script.js` 第 2908-2992 行 (`renderWithFallbackScales`)

#### 导出流程
```
Markdown → DOM → 克隆节点 → Canvas渲染 → 透明边缘裁剪 → PNG/PDF/HTML/ZIP
```

#### 导出类型
| 格式 | 函数 | 实现 | 输出 |
|------|------|------|------|
| PNG | `exportToPNG()` | html2canvas | 单图/多图位图 |
| PDF | `exportToPDF()` | html2canvas + jsPDF | 矢量文档 |
| HTML | `exportToHTML()` | DOM 克隆 | 完整网页 |
| ZIP | 多图导出 | JSZip | 多张 PNG 打包 |

---

## 3️⃣ 关键文件结构

### index.html (主页面)
```html
<div class="app">
    <div class="toolbar">...</div>          <!-- 导出模式、按钮 -->
    <div class="main-content">
        <div class="editor-panel">...</div> <!-- Markdown 编辑 -->
        <div class="preview-container">
            <div class="markdown-poster">   <!-- 海报容器 -->
                <div class="poster-header">...</div>    <!-- z-index: 1 -->
                <div class="poster-bg-image">...</div>  <!-- z-index: 0 (背景) -->
                <div class="poster-content">...</div>   <!-- z-index: 1 (内容) -->
                <div class="poster-footer">...</div>    <!-- z-index: 1 -->
            </div>
        </div>
    </div>
    <div class="multi-preview-container">...</div>  <!-- 多图预览 -->
    <div class="settings-sidebar">...</div>         <!-- 设置侧边栏 -->
</div>
```

### style.css (样式体系)

| 位置 | 内容 | 用途 |
|------|------|------|
| 第 1-37 行 | CSS 变量 | 主色调、文字、背景、阴影 |
| 第 369-379 行 | `.poster-bg-image` | 背景图层（虚化、透明度）|
| 第 776-786 行 | `@keyframes renderPulse` | 脉冲动画 |
| 第 1120-1127 行 | `.bg-preset` | 8 款渐变预设 |
| 第 1570-1573 行 | `@keyframes fadeIn` | 淡入动画 |

### script.js (核心逻辑)

| 行号 | 函数/类 | 核心职能 |
|------|--------|--------|
| 1-200 | 状态管理 | AppState, MadopicConfig, localStorage |
| 233-268 | `applyBackgroundFromConfig()` | 应用 3 种背景 |
| 787-860 | 多页导出 | renderPageToImage, 分页 |
| 1280-1388 | `MathRenderer` | KaTeX 公式渲染 |
| 1391-1520 | `DiagramRenderer` | Mermaid 图表 |
| 2088-2167 | `updatePreview()` | Markdown 渲染管线 |
| 2510-2599 | `exportToPNG()` | PNG 导出 |
| 2908-2992 | `renderWithFallbackScales()` | **html2canvas 核心** |
| 3750-3860 | `measureMarkdownHeight()` | 离屏高度测量 |
| 3861-3991 | `splitMarkdownIntoPages()` | 智能分页算法 |
| 4547-4589 | `trimTransparentEdges()` | Canvas 透明边缘裁剪 |

---

## 4️⃣ 库及其用途

### 必需库（核心功能）
| 库 | 版本 | 用途 | 加载方式 |
|----|------|------|--------|
| marked.js | - | Markdown 解析 | 预加载 |
| html2canvas | 1.4.1 | DOM→Canvas | 懒加载 |

### 可选库（功能扩展）
| 库 | 版本 | 用途 | 加载方式 |
|----|------|------|--------|
| KaTeX | 0.16.8 | 数学公式 `$...$` | 预加载 |
| mhchem | - | 化学公式 `\ce{...}` | 预加载 |
| Mermaid | 10.6.1 | 图表绘制 | 预加载 |
| ECharts | 5.4.3 | 数据可视化 | 预加载 |
| Prism | 1.29.0 | 代码高亮 | 预加载 |
| jsPDF | 2.5.1 | PDF 生成 | 懒加载 |
| JSZip | 3.10.1 | ZIP 打包 | 预加载 |

### 动画库
- **无外部库** — 100% 纯 CSS @keyframes

---

## 5️⃣ 输出格式详解

### PNG 导出
```javascript
// 文件: script.js 第 2510-2599 行
async function exportToPNG() {
    // 1. 创建导出节点
    // 2. 预处理图片跨域
    // 3. html2canvas 渲染
    // 4. 裁剪透明边缘
    // 5. canvas.toDataURL() → 数据URL
    // 6. 触发浏览器下载
}
```
- **输出**: 单张 PNG 或多张 PNG (ZIP)
- **特性**: 支持透明背景、高清、自动裁剪

### PDF 导出
```javascript
// 文件: script.js 第 2601-2717 行
async function exportToPDF() {
    // 1. html2canvas 渲染为 Canvas
    // 2. 计算 PDF 页面尺寸（A4 或自适应）
    // 3. jsPDF 创建 PDF 对象
    // 4. Canvas 图片嵌入 PDF
    // 5. 生成 PDF 文件
}
```
- **输出**: 单个 PDF
- **特性**: 矢量格式、自适应比例、适合打印

### HTML 导出
```javascript
// 文件: script.js 第 2719-2850 行
async function exportToHTML() {
    // 1. 克隆导出节点
    // 2. 内联所有样式
    // 3. 嵌入图片为 Base64
    // 4. 生成完整 HTML 文档
}
```
- **输出**: 独立 HTML 文件
- **特性**: 保留所有样式和交互

### 多图 ZIP
```javascript
// 文件: script.js 第 4398-4500 行
// 1. 智能分页：按 3:4 比例
// 2. 逐页生成 PNG
// 3. JSZip 打包
// 4. 自动下载 ZIP
```
- **输出**: ZIP 文件（包含多个 PNG）
- **特性**: 自动页码标注

---

## 6️⃣ 背景系统详解

### 3 种背景类型

#### 1. 渐变背景 (Gradient)
```javascript
MadopicConfig.background = {
    type: 'gradient',
    preset: 'gradient1',           // 8 款预设 + 'custom'
    customStartColor: '#667eea',
    customEndColor: '#764ba2',
    gradientDirection: '135deg'    // 支持自定义方向
}
```
- **CSS**: `linear-gradient(方向, 色1, 色2)`
- **预设**: 8 款渐变色 (style.css 第 1120-1127 行)

#### 2. 纯色背景 (Solid)
```javascript
MadopicConfig.background = {
    type: 'solid',
    solidColor: '#f5f5f5'
}
```

#### 3. 背景图 (Image)
```javascript
MadopicConfig.background = {
    type: 'image',
    imageData: 'data:image/png;base64,...',  // Base64 图片
    imageBlur: 12,      // 0~30px 虚化
    imageOpacity: 0.3   // 0~1 透明度
}
```
- **实现**: 额外的 div 层（`.poster-bg-image`）
- **z-index**: 0（最底层）
- **虚化**: CSS `filter: blur(12px)`

### 应用函数
```javascript
// 文件: script.js 第 233-268 行
function applyBackgroundFromConfig() {
    // 根据 type 应用背景
    // 创建背景图层（如需）
    // 计算虚化边缘扩展
}
```

---

## 7️⃣ 核心代码片段

### A. Canvas 渲染（最重要）
```javascript
// 文件: script.js 第 2908-2992 行
// 函数: renderWithFallbackScales(node, targetWidth, targetHeight, scales)

// 特点:
// 1. 多倍数回退（1.5x → 1x → 0.5x）
// 2. 跨域图片处理（crossorigin="anonymous"）
// 3. KaTeX/Mermaid/SVG 特殊处理
// 4. 防止 Canvas 污染（allowTaint: false）
```

### B. Markdown 渲染
```javascript
// 文件: script.js 第 2088-2167 行
// 函数: updatePreview()

// 流程:
// 1. 预处理 (数学、图表、卡片)
// 2. marked.parse() 转 HTML
// 3. XSS 清理
// 4. DOM 更新
// 5. 异步渲染链 (KaTeX, Mermaid, ECharts, Prism)
// 6. CSS 动画（首次淡入）
```

### C. 智能分页
```javascript
// 文件: script.js 第 3861-3991 行
// 函数: splitMarkdownIntoPages()

// 特点:
// 1. 逐块测量实际高度
// 2. 保证块完整性（不拆代码块、图表、卡片）
// 3. 按 maxPageHeight 分割
// 4. 多页预览支持
```

---

## 8️⃣ 关键数据结构

### MadopicConfig
```javascript
{
    cover: {
        enabled, title, subtitle, fontSize, color, layout, ...
    },
    header: {
        enabled, avatar, name, nameColor, ...
    },
    footer: {
        enabled, text, textColor, fontSize, ...
    },
    background: {
        type, preset, customStartColor, customEndColor, gradientDirection,
        solidColor, imageData, imageBlur, imageOpacity
    },
    layout: {
        fontSize: 14~22,
        width: 480~800,
        padding: 20~60
    }
}
```

### 状态管理
```javascript
const AppState = {
    zoom: 100,
    background: 'gradient1',
    fontSize: 18,
    padding: 40,
    width: 640,
    mode: 'free'  // 'free' | 'xhs' | 'pyq'
}
```

---

## 9️⃣ 性能优化策略

| 优化 | 实现 | 位置 |
|------|------|------|
| **防抖渲染** | 300ms 延迟 | updatePreview() |
| **懒加载库** | 按需加载 html2canvas/jsPDF | ensureExportLibsLoaded() |
| **图片缓存** | LRU 缓存管理 | imageCacheManager |
| **事件委托** | 减少事件监听 | 多图预览网格 |
| **多倍数回退** | 显存不足自动降分辨率 | renderWithFallbackScales() |

---

## 🔟 常见问题速查

### Q1: 如何实现"图文格式带动画效果"？
**A**: 使用 CSS @keyframes 定义淡入/脉冲动画，在预览更新时应用到 posterContent 元素

### Q2: 生成的图片如何质量高且快速？
**A**: html2canvas 库（DOM→Canvas），支持多倍数缩放回退，自动裁剪透明边缘

### Q3: 如何支持多种导出格式？
**A**: 基于 html2canvas 生成的 Canvas，可转 PNG、PDF、HTML，JSZip 打包多张

### Q4: 背景虚化是怎样实现的？
**A**: 创建额外 div 层（.poster-bg-image），CSS filter: blur()，z-index 置底

### Q5: 分页如何保证块完整性？
**A**: 逐块测量实际高度（离屏 DOM），超高时整块移至下一页

### Q6: 没有后端怎样处理导出？
**A**: 所有处理在浏览器端完成，最后生成 Data URL 或 Blob，触发 <a> 标签下载

---

## 📊 快速对比表

| 功能 | 实现方式 | 是否有动画 | 输出格式 |
|------|--------|----------|--------|
| Markdown 预览 | marked.js | ✅ fadeIn | 即时 DOM |
| 数学公式 | KaTeX | ❌ | HTML SVG |
| 图表 | Mermaid | ❌ | SVG |
| 图片生成 | html2canvas | ❌ | PNG/Canvas |
| PDF 导出 | jsPDF | ❌ | PDF |
| 背景虚化 | CSS filter | ❌ | CSS |
| 动画效果 | CSS @keyframes | ✅ | 淡入/脉冲 |

---

## 📍 核心文件速查

```
/Users/zyongzhu/workbase/github/moon/madopic/

├─ index.html (393 行)
│  ├─ 工具栏：导出按钮、模式切换
│  ├─ 编辑器面板：Markdown 输入
│  ├─ 预览容器：海报结构 (header/content/footer)
│  ├─ 多图预览：网格+轮播
│  └─ 设置侧边栏：4 标签页
│
├─ style.css (1,892+ 行, 53KB)
│  ├─ CSS 变量：主色调、文字、背景
│  ├─ 动画定义：renderPulse, fadeIn
│  ├─ 渐变预设：8 款颜色
│  └─ 背景图层：虚化、透明度
│
└─ script.js (4,773 行, 172KB)
   ├─ 状态管理：AppState, MadopicConfig
   ├─ 渲染管线：updatePreview()
   ├─ Canvas 导出：renderWithFallbackScales()
   ├─ 分页算法：splitMarkdownIntoPages()
   ├─ 数学/图表：MathRenderer, DiagramRenderer
   └─ 导出函数：exportToPNG(), exportToPDF(), ...
```

