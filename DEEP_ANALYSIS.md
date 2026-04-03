# 🎨 MADOPIC (MkD2Pic) 工程深度分析报告

## 📋 项目概览

**项目名称**: MkD2Pic (现为 madopic)
**位置**: `/Users/zyongzhu/workbase/github/moon/madopic`
**项目类型**: 纯前端单页应用 (SPA) - **零后端依赖**
**核心功能**: 将 Markdown 文本转换为精美的图片海报，特别适合社交媒体分享

### 关键特性
- ✅ **实时双向编辑** - 左侧输入，右侧即时预览
- ✅ **智能分页** - 自动按 3:4 比例分割长内容为多页
- ✅ **丰富导出** - PNG、PDF、HTML、多图 ZIP
- ✅ **多样背景** - 8 款渐变预设 + 自定义渐变 + 背景图虚化
- ✅ **完整页眉/页脚** - 头像、名称、页码、分隔线全面可配
- ✅ **数学公式** - KaTeX 公式 + 化学方程式支持
- ✅ **图表绘制** - Mermaid 流程图 + ECharts 数据可视化
- ✅ **代码高亮** - Prism.js 自动识别语言
- ✅ **动画效果** - 淡入、脉冲提示等 CSS 动画

---

## 🏗️ 项目结构

```
madopic/
├── index.html          # 主 HTML 页面（所有 UI 结构）
├── style.css           # 完整样式表（53,447 字节）
├── script.js           # 核心逻辑（4,773 行代码）
├── favicon.svg         # 网站图标
├── manifest.json       # PWA 配置
├── README.md           # 项目说明文档
├── Portrait.png        # 默认头像
└── image.png           # 演示图片
```

### 文件规模
| 文件 | 行数 | 字节 | 说明 |
|------|------|------|------|
| script.js | 4,773 | 172,129 | 业务逻辑 + 配置管理 + 渲染系统 |
| style.css | 1,892+ | 53,447 | Notion/Linear 极简风格 |
| index.html | 393 | 39,334 | 完整 UI 结构 + 动态容器 |

---

## 🛠️ 完整技术栈

### 核心库 (CDN 加载)
| 技术 | 版本 | 用途 | CDN |
|------|------|------|-----|
| **marked.js** | - | Markdown 解析引擎 | jsdelivr |
| **KaTeX** | 0.16.8 | 数学公式渲染 (LaTeX) | jsdelivr |
| **mhchem** | - | KaTeX 扩展，化学公式 | KaTeX 内置 |
| **Mermaid.js** | 10.6.1 | 流程图、甘特图、序列图等 | jsdelivr |
| **ECharts** | 5.4.3 | 数据可视化 (柱状图、折线图等) | jsdelivr |
| **Prism.js** | 1.29.0 | 代码语法高亮 (暗色主题) | jsdelivr |
| **html2canvas** | 1.4.1 | **DOM → Canvas** 渲染 (懒加载) | jsdelivr |
| **jsPDF** | 2.5.1 | **Canvas → PDF** 生成 (懒加载) | jsdelivr |
| **JSZip** | 3.10.1 | 多图打包 ZIP 下载 | jsdelivr |
| **Font Awesome** | 6.0.0 | 图标库 | cdnjs |

### UI 框架
- **无框架** - 纯原生 HTML/CSS/JS，无 React/Vue/Angular

### 动画库
- **CSS 动画** - @keyframes 定义，无需外部库
  - `fadeIn` - 淡入动画 (0.3s-0.5s)
  - `renderPulse` - 按钮脉冲提示 (1.5s 循环)

---

## 💡 核心功能详解

### 1️⃣ Markdown 渲染管线

#### 流程
```
用户输入 Markdown
    ↓
预处理 (数学公式、图表、卡片)
    ↓
marked.parse() 转 HTML
    ↓
XSS 清理 (sanitizeHTML)
    ↓
在 DOM 中渲染
    ↓
异步渲染器链
    ├─ KaTeX 数学公式
    ├─ Mermaid 图表
    ├─ ECharts 可视化
    ├─ 卡片组件
    └─ Prism 代码高亮
```

#### 关键文件路径和代码片段

**文件**: `script.js` 第 2088-2167 行
**函数**: `updatePreview()`

```javascript
async function updatePreview() {
    const markdownText = markdownInput.value.trim();
    
    // 1. 预处理各类内容
    let processedMarkdown = mathRenderer.preprocessMath(markdownText);
    processedMarkdown = diagramRenderer.preprocessDiagram(processedMarkdown);
    processedMarkdown = echartsRenderer.preprocessECharts(processedMarkdown);
    processedMarkdown = cardRenderer.preprocessCards(processedMarkdown);
    
    // 2. 标记化解析
    let htmlContent = marked.parse(processedMarkdown);
    htmlContent = sanitizeHTML(htmlContent);  // XSS 防护
    
    posterContent.innerHTML = htmlContent;
    
    // 3. 异步渲染链（串行）
    mathRenderer.renderMath(posterContent);
    await diagramRenderer.renderDiagrams(posterContent);
    await echartsRenderer.renderECharts(posterContent);
    await cardRenderer.renderCards(posterContent);
    
    // 4. 代码高亮
    Prism.highlightAllUnder(posterContent);
    
    // 5. 动画效果（仅首次）
    if (!hasInitialPreviewRendered) {
        posterContent.style.animation = 'fadeIn 0.3s ease';
        hasInitialPreviewRendered = true;
    }
}
```

**防抖处理**:
```javascript
const debouncedUpdatePreview = debounce(updatePreview, 300);
```
- 每次输入后延迟 300ms，避免频繁渲染

---

### 2️⃣ 动画系统

#### CSS 动画定义

**文件**: `style.css` 第 776-786 行

```css
@keyframes renderPulse {
    0% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
    }
    70% {
        box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }
}

@keyframes fadeIn {
    from { 
        opacity: 0; 
        transform: translateY(10px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
}
```

**动画应用场景**:
1. **Preview 淡入** - `posterContent` 首次渲染时 (0.5s)
2. **Render 按钮脉冲** - 配置变更时 (1.5s 循环)

---

### 3️⃣ 背景系统 (3 种类型)

#### 背景配置对象

**文件**: `script.js` 第 103-110 行

```javascript
MadopicConfig.background = {
    type: 'gradient'              // 'gradient' | 'solid' | 'image'
    preset: 'gradient1',          // 8 款预设 + 'custom'
    customStartColor: '#667eea',
    customEndColor: '#764ba2',
    gradientDirection: '135deg',  // 0~360 度 + 预设方向
    solidColor: '#f5f5f5',
    imageData: null,              // Base64 图片数据
    imageBlur: 12,                // 0~30px 虚化
    imageOpacity: 0.3             // 0~1 透明度
}
```

#### 背景预设

**文件**: `style.css` 第 1120-1127 行

```css
.bg-preset[data-bg="gradient1"] { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.bg-preset[data-bg="gradient2"] { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.bg-preset[data-bg="gradient3"] { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.bg-preset[data-bg="gradient4"] { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.bg-preset[data-bg="gradient5"] { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.bg-preset[data-bg="gradient6"] { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
.bg-preset[data-bg="gradient7"] { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
.bg-preset[data-bg="gradient8"] { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
```

#### 应用背景函数

**文件**: `script.js` 第 233-268 行

```javascript
function applyBackgroundFromConfig() {
    const cfg = MadopicConfig.background;
    const poster = document.getElementById('markdownPoster');
    
    // 移除旧的背景图层
    const oldBgImg = poster.querySelector('.poster-bg-image');
    if (oldBgImg) oldBgImg.remove();
    
    if (cfg.type === 'gradient') {
        let bgCss;
        if (cfg.preset === 'custom') {
            bgCss = `linear-gradient(${cfg.gradientDirection}, 
                                   ${cfg.customStartColor} 0%, 
                                   ${cfg.customEndColor} 100%)`;
        } else {
            bgCss = backgroundPresets[cfg.preset] || backgroundPresets.gradient1;
        }
        poster.style.background = bgCss;
    } 
    else if (cfg.type === 'solid') {
        poster.style.background = cfg.solidColor;
    } 
    else if (cfg.type === 'image' && cfg.imageData) {
        poster.style.background = '#f5f5f5';
        
        // 创建虚化背景图层
        const bgLayer = document.createElement('div');
        bgLayer.className = 'poster-bg-image';
        bgLayer.style.backgroundImage = `url(${cfg.imageData})`;
        bgLayer.style.filter = `blur(${cfg.imageBlur}px)`;
        bgLayer.style.opacity = cfg.imageOpacity;
        
        // 扩展边缘防止虚化白边
        const expand = Math.max(cfg.imageBlur * 2, 20);
        bgLayer.style.top = `-${expand}px`;
        bgLayer.style.left = `-${expand}px`;
        bgLayer.style.right = `-${expand}px`;
        bgLayer.style.bottom = `-${expand}px`;
        
        poster.insertBefore(bgLayer, poster.firstChild);
    }
}
```

#### 背景图层 CSS

**文件**: `style.css` 第 369-379 行

```css
.poster-bg-image {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-size: cover;
    background-position: center;
    z-index: 0;           /* 背景最底层 */
    pointer-events: none; /* 不影响交互 */
}
```

**海报容器结构**:
```
<div class="markdown-poster" id="markdownPoster">
    <div class="poster-bg-image">           <!-- z-index: 0 -->
    <div class="poster-header">             <!-- z-index: 1 -->
    <div class="poster-content">            <!-- z-index: 1 -->
    <div class="poster-footer">             <!-- z-index: 1 -->
</div>
```

---

### 4️⃣ Canvas 渲染 & 导出系统

#### 关键函数: `renderWithFallbackScales`

**文件**: `script.js` 第 2908-2992 行

这是导出系统的核心，使用 `html2canvas` 将 DOM 转换为 Canvas：

```javascript
async function renderWithFallbackScales(node, targetWidth, targetHeight, scales) {
    let lastError = null;
    
    // 尝试多个缩放倍数（如果高分辨率失败，自动降低）
    for (const scale of scales) {
        try {
            const canvas = await html2canvas(node, {
                backgroundColor: null,           // 保留透明背景
                scale,                           // 渲染倍数 (1.5x, 1x, 0.5x...)
                useCORS: true,                  // 启用跨域
                allowTaint: false,              // 防止 canvas 污染
                logging: false,
                width: targetWidth,
                height: targetHeight,
                windowWidth: targetWidth,
                windowHeight: targetHeight,
                scrollX: 0,
                scrollY: 0,
                imageTimeout: 5000,
                
                // 克隆文档时的特殊处理
                onclone: function (clonedDoc) {
                    // 1. 固定导出节点样式
                    const clonedTarget = clonedDoc.getElementById('madopic-export-poster')
                        || clonedDoc.querySelector('[id^="madopic-export-poster-page-"]');
                    if (clonedTarget) {
                        clonedTarget.style.setProperty('position', 'absolute', 'important');
                        clonedTarget.style.setProperty('top', '0', 'important');
                        clonedTarget.style.setProperty('left', '0', 'important');
                        clonedTarget.style.setProperty('margin', '0', 'important');
                        clonedTarget.style.setProperty('width', `${currentWidth}px`, 'important');
                        clonedTarget.style.setProperty('padding', `${currentPadding}px`, 'important');
                        clonedTarget.style.setProperty('box-sizing', 'border-box', 'important');
                    }
                    
                    // 2. 处理图片跨域
                    clonedDoc.querySelectorAll('img').forEach((img) => {
                        if (!img.getAttribute('crossorigin')) 
                            img.setAttribute('crossorigin', 'anonymous');
                        if (!img.getAttribute('referrerpolicy')) 
                            img.setAttribute('referrerpolicy', 'no-referrer');
                        if (!img.getAttribute('decoding')) 
                            img.setAttribute('decoding', 'sync');
                        if (!img.getAttribute('loading')) 
                            img.setAttribute('loading', 'eager');
                    });
                    
                    // 3. 特殊处理 KaTeX 公式
                    clonedDoc.querySelectorAll('.katex, .katex-display, .katex-mathml')
                        .forEach(el => {
                            el.style.setProperty('font-family', 'KaTeX_Main, serif', 'important');
                            if (el.classList.contains('katex-display')) {
                                el.style.setProperty('display', 'block', 'important');
                                el.style.setProperty('text-align', 'center', 'important');
                            }
                        });
                    
                    // 4. 特殊处理 Mermaid SVG
                    clonedDoc.querySelectorAll('.mermaid svg').forEach(svg => {
                        if (!svg.getAttribute('width') && svg.getBoundingClientRect) {
                            const rect = svg.getBoundingClientRect();
                            if (rect.width > 0) svg.setAttribute('width', rect.width);
                            if (rect.height > 0) svg.setAttribute('height', rect.height);
                        }
                        svg.style.setProperty('display', 'block', 'important');
                        svg.style.setProperty('max-width', '100%', 'important');
                    });
                    
                    clonedDoc.documentElement.style.setProperty('overflow', 'hidden', 'important');
                    clonedDoc.body.style.setProperty('margin', '0', 'important');
                    clonedDoc.body.style.setProperty('padding', '0', 'important');
                }
            });
            
            // 成功则返回 Canvas
            if (scale !== scales[0]) {
                showNotification(`显存不足，已自动降至 ${Math.round(scale * 100)}% 清晰度导出`, 'warning');
            }
            return canvas;
            
        } catch (err) {
            lastError = err;
            // 继续尝试下一个较低的倍数
        }
    }
    
    throw lastError || new Error('所有缩放倍数均导出失败');
}
```

#### 导出流程

**文件**: `script.js` 第 2510-2599 行（PNG 导出）

```javascript
async function exportToPNG() {
    let exportNode = null;
    try {
        showNotification('正在生成图片...', 'info');
        
        // 1. 懒加载 html2canvas
        await ensureExportLibsLoaded();
        
        // 2. 创建导出节点（克隆 + 配置）
        exportNode = await createExactExportNode();
        
        // 3. 预处理图片（跨域处理）
        try {
            await prepareImagesForExport(exportNode);
        } catch (_) {
            // 忽略单个图片失败
        }
        
        // 4. 等待字体加载
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) { }
        }
        await new Promise(r => requestAnimationFrame(r));
        
        // 5. 获取节点尺寸
        const rect = exportNode.getBoundingClientRect();
        const targetWidth = Math.ceil(rect.width);
        const targetHeight = Math.ceil(rect.height);
        
        // 6. Canvas 尺寸预检查
        const maxCanvasSize = 32767;  // 浏览器限制
        const estimatedHeight = targetHeight * EXPORT_SCALE;
        if (estimatedHeight > maxCanvasSize) {
            showNotification(`内容过长（约${Math.round(estimatedHeight)}px），建议缩短内容`, 'warning');
        }
        
        // 7. 带回退缩放尝试渲染
        const tryScales = getExportScaleCandidates(EXPORT_SCALE);
        const canvas = await renderWithFallbackScales(exportNode, targetWidth, targetHeight, tryScales);
        
        // 8. 尝试裁剪透明边缘
        let trimmedCanvas = null;
        if (currentMode === 'free') {
            try {
                trimmedCanvas = trimTransparentEdges(canvas);
            } catch (error) {
                console.warn('无法裁剪透明边缘（可能包含跨域图片）:', error.message);
            }
        }
        const outputCanvas = trimmedCanvas || canvas;
        
        // 9. Canvas → PNG 数据 URL
        let dataUrl;
        try {
            dataUrl = outputCanvas.toDataURL('image/png', 1.0);
        } catch (dataUrlError) {
            console.error('toDataURL 失败:', dataUrlError);
            if (dataUrlError.name === 'SecurityError') {
                showNotification('导出失败：包含跨域资源，请移除外部图片', 'error');
            } else {
                showNotification('导出失败：无法生成图片数据', 'error');
            }
            return;
        }
        
        // 10. 触发下载
        const link = document.createElement('a');
        link.download = `mkd2pic-${getFormattedTimestamp()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('图片导出成功！', 'success');
        
    } catch (error) {
        console.error('导出失败:', error);
        showNotification('导出失败，请重试', 'error');
    } finally {
        // 清理临时节点
        if (exportNode && exportNode.parentNode) {
            exportNode.parentNode.removeChild(exportNode);
        }
    }
}
```

#### 透明边缘裁剪

**文件**: `script.js` 第 4547-4589 行

```javascript
function trimTransparentEdges(sourceCanvas) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 检测透明像素
    const isPixelTransparent = (idx) => data[idx * 4 + 3] === 0;
    const isRowTransparent = (row) => {
        for (let col = 0; col < width; col++) {
            if (!isPixelTransparent(row * width + col)) return false;
        }
        return true;
    };
    const isColTransparent = (col, top, bottom) => {
        for (let row = top; row <= bottom; row++) {
            if (!isPixelTransparent(row * width + col)) return false;
        }
        return true;
    };
    
    // 二分查找透明边界
    let top = 0, bottom = height - 1, left = 0, right = width - 1;
    
    while (top <= bottom && isRowTransparent(top)) top++;
    while (bottom >= top && isRowTransparent(bottom)) bottom--;
    while (left <= right && isColTransparent(left, top, bottom)) left++;
    while (right >= left && isColTransparent(right, top, bottom)) right++;
    
    // 若全透明或无需裁剪
    if (top === 0 && left === 0 && right === width - 1 && bottom === height - 1) return null;
    if (top > bottom || left > right) return null;
    
    // 创建裁剪后的 Canvas
    const newWidth = right - left + 1;
    const newHeight = bottom - top + 1;
    const trimmed = document.createElement('canvas');
    trimmed.width = newWidth;
    trimmed.height = newHeight;
    const tctx = trimmed.getContext('2d');
    tctx.drawImage(sourceCanvas, left, top, newWidth, newHeight, 0, 0, newWidth, newHeight);
    return trimmed;
}
```

---

### 5️⃣ 智能分页算法

**文件**: `script.js` 第 3861-3991 行

```javascript
async function splitMarkdownIntoPages(markdown, maxPageHeight, containerWidth, padding, fontSize) {
    // 1. 构建原子块单元
    const blocks = parseMarkdownBlocks(markdown);
    
    const pages = [];
    let currentPageBlocks = [];
    let currentPageHeight = 0;
    
    // 2. 逐块测量并分页
    for (const block of blocks) {
        const blockHeight = await measureBlockHeight(block, containerWidth, padding, fontSize);
        
        // 超过单页高度，则换页
        if (currentPageHeight + blockHeight > maxPageHeight && currentPageBlocks.length > 0) {
            pages.push(currentPageBlocks.join('\n\n'));
            currentPageBlocks = [];
            currentPageHeight = 0;
        }
        
        currentPageBlocks.push(block);
        currentPageHeight += blockHeight;
    }
    
    // 3. 添加最后一页
    if (currentPageBlocks.length > 0) {
        pages.push(currentPageBlocks.join('\n\n'));
    }
    
    return pages;
}
```

**关键特性**:
- ✅ 块完整性保证 - 代码块、图表、卡片不会被拆断
- ✅ 实际高度测量 - 离屏 DOM 容器真实计算，确保精确
- ✅ 多页缩略图 - 网格 + 轮播两种预览模式

---

## 📊 输出格式系统

### 支持的导出格式

| 格式 | 实现方式 | 描述 |
|------|--------|------|
| **PNG** | `html2canvas` | 单图/多图，高清位图，支持透明边缘裁剪 |
| **PDF** | `html2canvas` + `jsPDF` | 矢量格式，自动适配页面比例 |
| **HTML** | DOM 克隆 + 样式内联 | 保留所有样式和交互，完整网页 |
| **ZIP** | `JSZip` + 多图导出 | 智能分页后打包所有 PNG |

### 导出模式

**文件**: `script.js` 第 1-10 行

```javascript
const AppState = {
    mode: 'free'  // 'free' | 'xhs' | 'pyq'
};
```

- **自由模式** - 480~800px 宽度可调
- **小红书** - 固定 3:4 比例 (1080x1440px)
- **朋友圈** - 长图比例 (1080x1920px)

---

## 🎬 数学公式 & 图表渲染

### KaTeX 数学公式

**文件**: `script.js` 第 1280-1388 行

```javascript
class MathRenderer {
    renderMath(element) {
        renderMathInElement(element, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            trust: true,
            macros: {
                '\\emc': 'E=mc^{2}',
                '\\hbar': '\\hslash',
                '\\kb': 'k_B',
                // ... 物理、化学单位宏
            }
        });
    }
}
```

**支持**:
- ✅ 行内公式 `$...$`
- ✅ 块级公式 `$$...$$`
- ✅ 化学方程式 `\ce{...}`
- ✅ 物理单位宏

### Mermaid 图表

**文件**: `script.js` 第 1391-1497 行

```javascript
class DiagramRenderer {
    async renderDiagram(element, diagramCode, diagramId) {
        try {
            const { svg } = await mermaid.render(diagramId, diagramCode);
            element.innerHTML = svg;
            element.classList.add('mermaid-diagram');
        } catch (error) {
            this.showDiagramError(element, error.message);
        }
    }
}
```

**支持的图表类型**:
- 流程图 (Flowchart)
- 序列图 (Sequence)
- 甘特图 (Gantt)
- 类图 (Class)
- 状态图 (State)

---

## 💾 持久化系统

### localStorage 配置保存

**文件**: `script.js` 第 60-95 行

```javascript
const CONFIG_KEY = 'madopic_config';

const MadopicConfig = {
    cover: { ... },      // 封面配置
    header: { ... },     // 页眉配置
    footer: { ... },     // 页脚配置
    background: { ... }, // 背景配置
    layout: { ... }      // 布局配置
};

function saveConfig() {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(MadopicConfig));
    } catch (e) {
        console.warn('保存配置失败:', e);
    }
}

function loadConfig() {
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            deepMerge(MadopicConfig, saved);
        }
    } catch (e) {
        console.warn('加载配置失败:', e);
    }
}
```

### 草稿自动保存

**文件**: `script.js` 第 2093-2094 行

```javascript
// 自动保存草稿
autoSave(markdownInput.value);
```

---

## 🔄 撤销/重做系统

**文件**: `script.js` 第 4591-4623 行

```javascript
class UndoRedoManager {
    constructor(maxSteps = 50) {
        this.history = [];
        this.pointer = -1;
        this.maxSteps = maxSteps;
    }
    
    push(state) {
        this.history = this.history.slice(0, this.pointer + 1);
        this.history.push(state);
        if (this.history.length > this.maxSteps) {
            this.history.shift();
        } else {
            this.pointer++;
        }
    }
    
    undo() {
        if (this.pointer > 0) {
            return this.history[--this.pointer];
        }
        return null;
    }
    
    redo() {
        if (this.pointer < this.history.length - 1) {
            return this.history[++this.pointer];
        }
        return null;
    }
}
```

**快捷键**:
- `Ctrl+Z` / `Cmd+Z` - 撤销
- `Ctrl+Y` / `Ctrl+Shift+Z` - 重做
- 最多 50 步历史

---

## 🎨 UI/UX 设计

### 设计风格

**Notion/Linear 极简风格** - 基于以下设计原则:
- 最小化视觉干扰
- 大量空白
- 一致的间距
- 微妙的阴影

### CSS 变量系统

**文件**: `style.css` 第 1-37 行

```css
:root {
    /* 主色调 */
    --primary-color: #5B5BD6;
    --primary-hover: #4A4AC4;
    --primary-light: #EDEDFC;
    
    /* 文字颜色 */
    --text-primary: #0F0F0F;
    --text-secondary: #525252;
    --text-tertiary: #878787;
    
    /* 背景颜色 */
    --background-primary: #FFFFFF;
    --background-secondary: #FAFAFA;
    --background-tertiary: #F5F5F5;
    
    /* 阴影 */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.06);
}
```

### 响应式设计

- **桌面** - 两栏布局 (编辑器 + 预览)
- **平板** - 自适应
- **手机** - 汉堡菜单折叠，单栏布局

---

## ⚡ 性能优化

### 1. 懒加载 CDN 库

**文件**: `script.js` 第 1103-1137 行

```javascript
async function ensureExportLibsLoaded() {
    // 仅在导出时加载这些大型库
    if (typeof html2canvas === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    }
    if (typeof jspdf === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    }
}
```

### 2. 防抖渲染

```javascript
const debouncedUpdatePreview = debounce(updatePreview, 300);
```
- 每次输入延迟 300ms，避免频繁 DOM 更新

### 3. 多图预览防抖锁

**文件**: `script.js` 第 752-810 行

```javascript
const multiPreviewRenderLock = { locked: false };

async function openMultiPreview() {
    if (multiPreviewRenderLock.locked) return;
    multiPreviewRenderLock.locked = true;
    
    try {
        // 生成所有页面缩略图
        // ...
    } finally {
        multiPreviewRenderLock.locked = false;
    }
}
```

### 4. 图片缓存管理

**文件**: `script.js` 第 829-862 行

```javascript
const imageCacheManager = {
    cache: new Map(),
    maxSize: 50,
    
    set(key, blob) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, blob);
    },
    
    get(key) {
        return this.cache.get(key);
    },
    
    clear() {
        this.cache.clear();
    }
};
```

---

## 🔐 安全特性

### XSS 防护

**文件**: `script.js` 第 2127 行

```javascript
htmlContent = sanitizeHTML(htmlContent);
```

### 跨域图片处理

```javascript
img.setAttribute('crossorigin', 'anonymous');
img.setAttribute('referrerpolicy', 'no-referrer');
img.setAttribute('loading', 'eager');
img.setAttribute('decoding', 'sync');
```

### Canvas 污染防护

```javascript
const canvas = await html2canvas(node, {
    allowTaint: false,  // 禁止污染 canvas
    useCORS: true,      // 启用跨域资源共享
});
```

---

## 📁 详细文件映射

### index.html - 主页面结构

| 位置 | 元素 | 说明 |
|------|------|------|
| 行 1-50 | `<head>` | CDN 库加载、样式表、favicon |
| 行 60-180 | 工具栏 | 导出模式、按钮组、GitHub 链接 |
| 行 185-202 | 编辑器面板 | Markdown 输入、行号、工具栏 |
| 行 205-220 | 预览容器 | 海报主容器 (header/content/footer) |
| 行 222-270 | 多图预览 | 网格 + 轮播视图 |
| 行 280-390 | 设置侧边栏 | 4 个标签页 (封面、页眉、页脚、背景) |

### script.js - 核心逻辑模块

| 行号 | 函数/类 | 职责 |
|------|--------|------|
| 1-200 | 状态管理 | AppState, StateManager, MadopicConfig |
| 233-293 | 配置系统 | applyBackgroundFromConfig, applyAllConfig |
| 295-730 | 设置侧边栏 | openSettingsSidebar, 页眉/页脚/背景控制 |
| 787-860 | 多页导出 | renderPageToImage, 多图生成 |
| 1280-1388 | 数学公式 | MathRenderer 类 |
| 1391-1520 | 图表渲染 | DiagramRenderer 类 (Mermaid) |
| 1560-1650 | ECharts 图表 | EchartsRenderer 类 |
| 1750-1800 | 卡片组件 | CardRenderer 类 |
| 2088-2167 | 预览渲染 | updatePreview(), markdown → HTML 管线 |
| 2273-2290 | 背景应用 | applyBackground 变体函数 |
| 2303-2380 | 导出节点 | createExactExportNode(), 克隆 + 配置 |
| 2409-2470 | 图片预处理 | prepareImagesForExport(), 跨域处理 |
| 2510-2599 | PNG 导出 | exportToPNG(), canvas → file |
| 2601-2717 | PDF 导出 | exportToPDF(), canvas → PDF |
| 2719-2850 | HTML 导出 | exportToHTML(), 完整网页 |
| 2908-2992 | Canvas 渲染 | renderWithFallbackScales(), 核心渲染引擎 |
| 3750-3860 | 高度测量 | measureMarkdownHeight(), 离屏测量 |
| 3861-3991 | 分页算法 | splitMarkdownIntoPages(), 智能分割 |
| 3991-4160 | 导出节点生成 | createCoverExportNode(), createPageExportNode() |
| 4398-4500 | 多图打包 | 生成 ZIP 下载 |
| 4547-4589 | 边缘裁剪 | trimTransparentEdges(), Canvas 操作 |
| 4591-4623 | 撤销/重做 | Undo/Redo 快捷键处理 |
| 4624-4720 | 拖拽图片 | setupDragDropImage(), 文件处理 |

### style.css - 样式表

| 行号 | 选择器 | 用途 |
|------|--------|------|
| 1-37 | `:root` | CSS 变量定义 |
| 369-379 | `.poster-bg-image` | 背景图层（虚化）|
| 382-420 | `.poster-header` / `.poster-footer` | 页眉/页脚 |
| 443-456 | `.poster-content` | 内容区域 |
| 776-786 | `@keyframes renderPulse` | 脉冲动画 |
| 1120-1127 | `.bg-preset` | 渐变预设 |
| 1570-1573 | `@keyframes fadeIn` | 淡入动画 |
| 1575-1577 | `.poster-content` | 动画应用 |

---

## 🚀 关键设计模式

### 1. 配置驱动
- 所有设置通过 `MadopicConfig` 对象管理
- 配置变更自动持久化到 localStorage
- 配置应用通过函数应用到 DOM

### 2. 异步渲染管线
```
用户输入 → 防抖 → 预处理 → 标记解析 → DOM 更新 → 异步渲染链 → 完成
```

### 3. 克隆导出
- 创建独立的导出节点
- 避免影响预览区域
- 便于测量和处理

### 4. 回退机制
- Canvas 渲染失败自动降低分辨率
- html2canvas 若返回污染 canvas，采用兜底方案
- 跨域图片失败独立处理，不阻塞导出

### 5. 事件委托
- 多图预览网格/轮播使用事件委托
- 减少事件监听器数量
- 性能优化

---

## 📈 数据流

### 预览流

```
┌─────────────────────┐
│  markdownInput      │
│  (textarea)         │
└──────────┬──────────┘
           │ input 事件
           ▼
    ┌──────────────┐
    │ debounce()   │ 300ms
    │ (防抖)       │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────┐
    │ updatePreview()      │
    ├──────────────────────┤
    │ 1. 预处理            │
    │ 2. marked.parse()    │
    │ 3. DOM 更新          │
    │ 4. 异步渲染          │
    │ 5. 代码高亮          │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  posterContent       │
    │  (渲染结果显示)      │
    └──────────────────────┘
```

### 导出流

```
┌─────────────────────┐
│  exportToPNG()      │
└────────┬────────────┘
         │
         ▼
    ┌──────────────────────┐
    │ createExactExportNode│
    │ (克隆+配置)          │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ prepareImagesForExport
    │ (跨域处理)           │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ renderWithFallbackScales
    │ (html2canvas)        │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ trimTransparentEdges │
    │ (裁剪透明边缘)       │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ canvas.toDataURL()   │
    │ (→ PNG 数据)         │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ 触发下载             │
    │ <a href=dataURL>     │
    └──────────────────────┘
```

---

## 🎯 总结

### 核心创新

1. **纯前端** - 零后端依赖，无服务器调用
2. **实时双向编辑** - 所见即所得体验
3. **智能分页** - 保证块完整性的多页生成
4. **多格式导出** - PNG + PDF + HTML + ZIP
5. **动画视觉** - CSS 动画 + 淡入过渡
6. **配置驱动** - localStorage 持久化，无需手动保存

### 技术亮点

| 方面 | 亮点 |
|------|------|
| **动画** | CSS @keyframes 定义，无外部库 |
| **图文** | HTML + CSS 排版，Canvas 导出 |
| **渲染** | html2canvas DOM→Canvas，精确度高 |
| **性能** | 防抖、懒加载、缓存管理 |
| **安全** | XSS 防护、跨域处理、Canvas 污染防护 |

### 依赖库职责

| 库 | 职责 | 必需性 |
|----|------|--------|
| marked.js | Markdown 解析 | 必需 |
| KaTeX | 数学公式 | 可选 |
| Mermaid | 图表绘制 | 可选 |
| ECharts | 数据可视化 | 可选 |
| Prism | 代码高亮 | 可选 |
| html2canvas | DOM→Canvas | 导出时必需 |
| jsPDF | Canvas→PDF | PDF 导出时必需 |
| JSZip | 打包 ZIP | 多图导出时必需 |

