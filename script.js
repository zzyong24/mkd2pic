// ===== 应用状态管理 =====
const AppState = {
    zoom: 100,
    background: 'gradient1',
    fontSize: 18,
    padding: 40,
    width: 640,
    mode: 'free', // 'free' | 'xhs' | 'pyq'
    fixedHeights: { xhs: null, pyq: null }
};

// 状态管理器
const StateManager = {
    state: AppState,
    listeners: [],

    get(key) {
        return this.state[key];
    },

    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notify(key, value, oldValue);
    },

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) this.listeners.splice(index, 1);
        };
    },

    notify(key, value, oldValue) {
        this.listeners.forEach(fn => {
            try {
                fn(key, value, oldValue);
            } catch (e) {
                console.error('状态监听器错误:', e);
            }
        });
    }
};

// 为了兼容性，保留旧的全局变量作为访问器
let currentZoom = AppState.zoom;
let currentBackground = AppState.background;
let currentFontSize = AppState.fontSize;
let currentPadding = AppState.padding;
let currentWidth = AppState.width;
let currentMode = AppState.mode;
let fixedHeights = AppState.fixedHeights;

// ===== Madopic 配置系统 =====
const CONFIG_KEY = 'madopic_config';

/**
 * 配置对象 — 管理页眉、页脚、背景、布局等全部设置
 * 所有配置变更通过 saveConfig() 持久化到 localStorage
 */
const MadopicConfig = {
    cover: {
        enabled: false,          // 是否启用封面页
        title: '',               // 主标题文案
        subtitle: '',            // 副标题文案
        titleFontSize: 48,       // 主标题字号 28~80
        subtitleFontSize: 22,    // 副标题字号 14~40
        titleColor: '#1a1a2e',   // 主标题颜色
        subtitleColor: '#525252',// 副标题颜色
        titleWeight: '700',      // 主标题字重 400|600|700|900
        subtitleWeight: '400',   // 副标题字重 400|600|700
        fontFamily: 'system',    // 字体族 system|serif|mono|hand|hei
        textEffect: 'none',     // 艺术字效果 none|stroke|shadow|gradient|neon|emboss
        layout: 'center',       // 布局 center|top|bottom
        gap: 16,                 // 主副标题间距 0~60
        showHeader: true,        // 封面是否显示页眉
        showFooter: true,        // 封面是否显示页脚
        bgMode: 'inherit'        // 背景模式 inherit|custom（inherit 继承全局）
    },
    header: {
        enabled: true,
        avatar: 'Portrait.png',
        name: 'MoonlitClear',
        nameColor: '#1a1a2e',
        paddingTop: 14,
        paddingBottom: 10,
        showPageNumber: true,
        pageNumberColor: '#878787'
    },
    footer: {
        enabled: true,
        text: 'AI为基，认知破界',
        textColor: '#878787',
        fontSize: 12,
        letterSpacing: 1,
        paddingTop: 14,
        paddingBottom: 18,
        showDivider: true,
        dividerColor: '#787878'
    },
    background: {
        type: 'gradient', // 'gradient' | 'solid' | 'image'
        preset: 'gradient1',
        customStartColor: '#667eea',
        customEndColor: '#764ba2',
        gradientDirection: '135deg',
        solidColor: '#f5f5f5',
        imageData: null,
        imageBlur: 12,
        imageOpacity: 0.3
    },
    layout: {
        fontSize: 18,
        width: 640,
        padding: 40
    }
};

/** 深合并对象 */
function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

/** 保存配置到 localStorage */
function saveConfig() {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(MadopicConfig));
    } catch (e) {
        console.warn('保存配置失败:', e);
    }
    // 配置变更后标记需要重新渲染（不再自动触发，由用户点击「渲染」按钮手动触发）
    _markRenderDirty();
}

/** 从 localStorage 加载配置 */
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

// ===== 配置应用函数 =====

/**
 * 封面页的字体族 CSS class 映射表
 * 设计决策：使用 CSS class 而非内联 style，以便在导出节点和预览中保持一致
 */
const COVER_FONT_CLASS_MAP = {
    system: 'cover-font-system',
    serif: 'cover-font-serif',
    mono: 'cover-font-mono',
    hei: 'cover-font-hei'
};

/**
 * 封面页的艺术字效果 CSS class 映射表
 */
const COVER_EFFECT_CLASS_MAP = {
    none: '',
    stroke: 'text-effect-stroke',
    shadow: 'text-effect-shadow',
    gradient: 'text-effect-gradient',
    neon: 'text-effect-neon',
    emboss: 'text-effect-emboss'
};

/** 将页眉配置同步到预览区 DOM */
function applyHeaderConfig() {
    const header = document.getElementById('posterHeader');
    if (!header) return;
    const cfg = MadopicConfig.header;

    header.style.display = cfg.enabled ? 'flex' : 'none';
    header.style.paddingTop = cfg.paddingTop + 'px';
    header.style.paddingBottom = cfg.paddingBottom + 'px';

    const avatar = header.querySelector('.header-avatar');
    if (avatar && cfg.avatar) avatar.src = cfg.avatar;

    const nameEl = header.querySelector('.header-name');
    if (nameEl) {
        nameEl.textContent = cfg.name;
        nameEl.style.color = cfg.nameColor;
    }
}

/** 将页脚配置同步到预览区 DOM */
function applyFooterConfig() {
    const footer = document.getElementById('posterFooter');
    if (!footer) return;
    const cfg = MadopicConfig.footer;

    footer.style.display = cfg.enabled ? 'flex' : 'none';
    footer.style.paddingTop = cfg.paddingTop + 'px';
    footer.style.paddingBottom = cfg.paddingBottom + 'px';

    const text = footer.querySelector('.footer-text');
    if (text) {
        text.textContent = cfg.text;
        text.style.color = cfg.textColor;
        text.style.fontSize = cfg.fontSize + 'px';
        text.style.letterSpacing = cfg.letterSpacing + 'px';
    }

    const lineL = footer.querySelector('.footer-line-left');
    const lineR = footer.querySelector('.footer-line-right');
    if (lineL) {
        lineL.style.display = cfg.showDivider ? 'block' : 'none';
        lineL.style.background = `linear-gradient(to left, ${hexToRgba(cfg.dividerColor, 0.3)}, transparent)`;
    }
    if (lineR) {
        lineR.style.display = cfg.showDivider ? 'block' : 'none';
        lineR.style.background = `linear-gradient(to right, ${hexToRgba(cfg.dividerColor, 0.3)}, transparent)`;
    }
}

/** 将背景配置应用到预览区 poster */
function applyBackgroundFromConfig() {
    const cfg = MadopicConfig.background;
    const poster = document.getElementById('markdownPoster');
    if (!poster) return;

    // 移除旧的背景图层
    const oldBgImg = poster.querySelector('.poster-bg-image');
    if (oldBgImg) oldBgImg.remove();

    if (cfg.type === 'gradient') {
        let bgCss;
        if (cfg.preset === 'custom') {
            bgCss = `linear-gradient(${cfg.gradientDirection}, ${cfg.customStartColor} 0%, ${cfg.customEndColor} 100%)`;
        } else {
            bgCss = backgroundPresets[cfg.preset] || backgroundPresets.gradient1;
        }
        poster.style.background = bgCss;
    } else if (cfg.type === 'solid') {
        poster.style.background = cfg.solidColor;
    } else if (cfg.type === 'image' && cfg.imageData) {
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

/** 应用全部配置到预览区 */
function applyAllConfig() {
    applyHeaderConfig();
    applyFooterConfig();
    applyBackgroundFromConfig();
    // 布局
    const lc = MadopicConfig.layout;
    currentFontSize = lc.fontSize;
    currentPadding = lc.padding;
    currentWidth = lc.width;
    applyFontSize(currentFontSize);
    applyPadding(currentPadding);
    applyWidth(currentWidth);
}

/** hex 颜色转 rgba */
function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ===== 设置侧边栏控制 =====

function openSettingsSidebar() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    syncSidebarFromConfig();
}

function closeSettingsSidebar() {
    const sidebar = document.getElementById('settingsSidebar');
    const overlayEl = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlayEl) overlayEl.classList.remove('active');
}

/** 将当前 MadopicConfig 同步到侧边栏控件 */
function syncSidebarFromConfig() {
    const cfg = MadopicConfig;
    // 封面
    _setChecked('coverEnabled', cfg.cover.enabled);
    _setVal('coverTitle', cfg.cover.title);
    _setVal('coverSubtitle', cfg.cover.subtitle);
    _setRange('coverTitleFontSize', cfg.cover.titleFontSize);
    _setRange('coverSubtitleFontSize', cfg.cover.subtitleFontSize);
    _setColor('coverTitleColor', cfg.cover.titleColor);
    _setColor('coverSubtitleColor', cfg.cover.subtitleColor);
    _setVal('coverTitleWeight', cfg.cover.titleWeight);
    _setVal('coverSubtitleWeight', cfg.cover.subtitleWeight);
    _setRange('coverGap', cfg.cover.gap);
    _setChecked('coverShowHeader', cfg.cover.showHeader);
    _setChecked('coverShowFooter', cfg.cover.showFooter);
    // 激活正确的字体按钮
    document.querySelectorAll('[data-cover-font]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cover-font') === cfg.cover.fontFamily);
    });
    // 激活正确的效果按钮
    document.querySelectorAll('[data-cover-effect]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cover-effect') === cfg.cover.textEffect);
    });
    // 激活正确的布局按钮
    document.querySelectorAll('[data-cover-layout]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cover-layout') === cfg.cover.layout);
    });
    // 页眉
    _setChecked('headerEnabled', cfg.header.enabled);
    _setVal('headerName', cfg.header.name);
    _setColor('headerNameColor', cfg.header.nameColor);
    _setRange('headerPaddingTop', cfg.header.paddingTop);
    _setRange('headerPaddingBottom', cfg.header.paddingBottom);
    _setChecked('showPageNumber', cfg.header.showPageNumber);
    _setColor('pageNumberColor', cfg.header.pageNumberColor);
    // 头像预览
    const avPrev = document.getElementById('avatarPreview');
    if (avPrev && cfg.header.avatar) avPrev.src = cfg.header.avatar;
    // 页脚
    _setChecked('footerEnabled', cfg.footer.enabled);
    _setVal('footerText', cfg.footer.text);
    _setColor('footerTextColor', cfg.footer.textColor);
    _setRange('footerFontSize', cfg.footer.fontSize);
    _setRange('footerLetterSpacing', cfg.footer.letterSpacing);
    _setRange('footerPaddingTop', cfg.footer.paddingTop);
    _setRange('footerPaddingBottom', cfg.footer.paddingBottom);
    _setChecked('footerShowDivider', cfg.footer.showDivider);
    _setColor('footerDividerColor', cfg.footer.dividerColor);
    // 背景
    _setColor('colorStart', cfg.background.customStartColor);
    _setColor('colorEnd', cfg.background.customEndColor);
    _setVal('gradientDirection', cfg.background.gradientDirection);
    _setColor('bgSolidColor', cfg.background.solidColor);
    _setRange('bgImageBlur', cfg.background.imageBlur);
    _setRange('bgImageOpacity', cfg.background.imageOpacity);
    // 布局
    _setRange('fontSizeSlider', cfg.layout.fontSize);
    _setRange('widthSlider', cfg.layout.width);
    _setRange('paddingSlider', cfg.layout.padding);
    // 激活正确的背景类型面板
    _activateBgTypePanel(cfg.background.type);
    // 激活正确的渐变预设
    document.querySelectorAll('.bg-preset').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-bg') === cfg.background.preset);
    });
    // 背景图预览
    if (cfg.background.imageData) {
        const prev = document.getElementById('bgImagePreview');
        if (prev) {
            prev.innerHTML = `<img src="${cfg.background.imageData}" alt="背景预览">`;
        }
    }
}

// 侧边栏工具函数
function _setChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = val; }
function _setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function _setColor(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const label = document.getElementById(id + 'Value');
    if (label) label.textContent = val;
}
function _setRange(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const label = document.getElementById(id + 'Value');
    if (label) {
        const unit = id.includes('Opacity') ? '' : 'px';
        label.textContent = val + unit;
    }
}
function _activateBgTypePanel(type) {
    // 按钮
    document.querySelectorAll('[data-bg-type]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-bg-type') === type);
    });
    // 面板
    document.getElementById('bgGradientPanel')?.classList.toggle('active', type === 'gradient');
    document.getElementById('bgSolidPanel')?.classList.toggle('active', type === 'solid');
    document.getElementById('bgImagePanel')?.classList.toggle('active', type === 'image');
}

/** 设置侧边栏内所有控件的事件绑定 */
function setupSettingsSidebar() {
    // Tab 切换
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = tab.getAttribute('data-tab');
            document.getElementById(panelId)?.classList.add('active');
        });
    });

    // 关闭侧边栏
    document.getElementById('closeSidebar')?.addEventListener('click', closeSettingsSidebar);
    document.getElementById('settingsBtn')?.addEventListener('click', openSettingsSidebar);

    // 渲染按钮 — 手动触发预览刷新
    document.getElementById('renderBtn')?.addEventListener('click', manualRender);

    // 存为 MCP 配置按钮
    document.getElementById('saveMcpConfigBtn')?.addEventListener('click', saveMcpConfig);

    setupCoverControls();
    setupHeaderControls();
    setupFooterControls();
    setupBackgroundControls();
    setupLayoutControls();
    setupResetButton();
}

function setupCoverControls() {
    _bindCheckbox('coverEnabled', v => { MadopicConfig.cover.enabled = v; saveConfig(); });
    // 主标题 — textarea 使用 input 事件防抖
    const titleEl = document.getElementById('coverTitle');
    if (titleEl) titleEl.addEventListener('input', debounce(() => { MadopicConfig.cover.title = titleEl.value; saveConfig(); }, 200));
    // 副标题
    const subtitleEl = document.getElementById('coverSubtitle');
    if (subtitleEl) subtitleEl.addEventListener('input', debounce(() => { MadopicConfig.cover.subtitle = subtitleEl.value; saveConfig(); }, 200));

    _bindSlider('coverTitleFontSize', v => { MadopicConfig.cover.titleFontSize = parseInt(v); saveConfig(); });
    _bindColor('coverTitleColor', v => { MadopicConfig.cover.titleColor = v; saveConfig(); });
    _bindSlider('coverSubtitleFontSize', v => { MadopicConfig.cover.subtitleFontSize = parseInt(v); saveConfig(); });
    _bindColor('coverSubtitleColor', v => { MadopicConfig.cover.subtitleColor = v; saveConfig(); });
    _bindSlider('coverGap', v => { MadopicConfig.cover.gap = parseInt(v); saveConfig(); });
    _bindCheckbox('coverShowHeader', v => { MadopicConfig.cover.showHeader = v; saveConfig(); });
    _bindCheckbox('coverShowFooter', v => { MadopicConfig.cover.showFooter = v; saveConfig(); });

    // 字重下拉
    const titleWeightEl = document.getElementById('coverTitleWeight');
    if (titleWeightEl) titleWeightEl.addEventListener('change', () => { MadopicConfig.cover.titleWeight = titleWeightEl.value; saveConfig(); });
    const subtitleWeightEl = document.getElementById('coverSubtitleWeight');
    if (subtitleWeightEl) subtitleWeightEl.addEventListener('change', () => { MadopicConfig.cover.subtitleWeight = subtitleWeightEl.value; saveConfig(); });

    // 字体族切换
    document.querySelectorAll('[data-cover-font]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-cover-font]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            MadopicConfig.cover.fontFamily = btn.getAttribute('data-cover-font');
            saveConfig();
        });
    });

    // 艺术字效果切换
    document.querySelectorAll('[data-cover-effect]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-cover-effect]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            MadopicConfig.cover.textEffect = btn.getAttribute('data-cover-effect');
            saveConfig();
        });
    });

    // 布局切换
    document.querySelectorAll('[data-cover-layout]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-cover-layout]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            MadopicConfig.cover.layout = btn.getAttribute('data-cover-layout');
            saveConfig();
        });
    });
}

function setupHeaderControls() {
    _bindCheckbox('headerEnabled', v => { MadopicConfig.header.enabled = v; applyHeaderConfig(); saveConfig(); });
    _bindInput('headerName', v => { MadopicConfig.header.name = v; applyHeaderConfig(); saveConfig(); });
    _bindColor('headerNameColor', v => { MadopicConfig.header.nameColor = v; applyHeaderConfig(); saveConfig(); });
    _bindSlider('headerPaddingTop', v => { MadopicConfig.header.paddingTop = parseInt(v); applyHeaderConfig(); saveConfig(); });
    _bindSlider('headerPaddingBottom', v => { MadopicConfig.header.paddingBottom = parseInt(v); applyHeaderConfig(); saveConfig(); });
    _bindCheckbox('showPageNumber', v => { MadopicConfig.header.showPageNumber = v; applyHeaderConfig(); saveConfig(); });
    _bindColor('pageNumberColor', v => { MadopicConfig.header.pageNumberColor = v; applyHeaderConfig(); saveConfig(); });

    // 头像更换
    document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
        document.getElementById('avatarInput')?.click();
    });
    document.getElementById('avatarInput')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            MadopicConfig.header.avatar = ev.target.result;
            applyHeaderConfig();
            saveConfig();
            const prev = document.getElementById('avatarPreview');
            if (prev) prev.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });
}

function setupFooterControls() {
    _bindCheckbox('footerEnabled', v => { MadopicConfig.footer.enabled = v; applyFooterConfig(); saveConfig(); });
    _bindInput('footerText', v => { MadopicConfig.footer.text = v; applyFooterConfig(); saveConfig(); });
    _bindColor('footerTextColor', v => { MadopicConfig.footer.textColor = v; applyFooterConfig(); saveConfig(); });
    _bindSlider('footerFontSize', v => { MadopicConfig.footer.fontSize = parseInt(v); applyFooterConfig(); saveConfig(); });
    _bindSlider('footerLetterSpacing', v => { MadopicConfig.footer.letterSpacing = parseFloat(v); applyFooterConfig(); saveConfig(); });
    _bindSlider('footerPaddingTop', v => { MadopicConfig.footer.paddingTop = parseInt(v); applyFooterConfig(); saveConfig(); });
    _bindSlider('footerPaddingBottom', v => { MadopicConfig.footer.paddingBottom = parseInt(v); applyFooterConfig(); saveConfig(); });
    _bindCheckbox('footerShowDivider', v => { MadopicConfig.footer.showDivider = v; applyFooterConfig(); saveConfig(); });
    _bindColor('footerDividerColor', v => { MadopicConfig.footer.dividerColor = v; applyFooterConfig(); saveConfig(); });
}

function setupBackgroundControls() {
    // 背景类型切换
    document.querySelectorAll('[data-bg-type]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-bg-type');
            MadopicConfig.background.type = type;
            _activateBgTypePanel(type);
            applyBackgroundFromConfig();
            saveConfig();
        });
    });

    // 渐变预设
    document.querySelectorAll('.bg-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            MadopicConfig.background.preset = preset.getAttribute('data-bg');
            MadopicConfig.background.type = 'gradient';
            _activateBgTypePanel('gradient');
            applyBackgroundFromConfig();
            saveConfig();
        });
    });

    // 自定义渐变
    _bindColor('colorStart', v => {
        MadopicConfig.background.customStartColor = v;
        MadopicConfig.background.preset = 'custom';
        document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
        applyBackgroundFromConfig();
        saveConfig();
    });
    _bindColor('colorEnd', v => {
        MadopicConfig.background.customEndColor = v;
        MadopicConfig.background.preset = 'custom';
        document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
        applyBackgroundFromConfig();
        saveConfig();
    });
    document.getElementById('gradientDirection')?.addEventListener('change', e => {
        MadopicConfig.background.gradientDirection = e.target.value;
        MadopicConfig.background.preset = 'custom';
        document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
        applyBackgroundFromConfig();
        saveConfig();
    });

    // 纯色
    _bindColor('bgSolidColor', v => {
        MadopicConfig.background.solidColor = v;
        applyBackgroundFromConfig();
        saveConfig();
    });

    // 背景图上传
    document.getElementById('bgImageUploadArea')?.addEventListener('click', () => {
        document.getElementById('bgImageInput')?.click();
    });
    document.getElementById('bgImageInput')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            MadopicConfig.background.imageData = ev.target.result;
            MadopicConfig.background.type = 'image';
            _activateBgTypePanel('image');
            applyBackgroundFromConfig();
            saveConfig();
            const prev = document.getElementById('bgImagePreview');
            if (prev) prev.innerHTML = `<img src="${ev.target.result}" alt="背景预览">`;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });
    document.getElementById('clearBgImage')?.addEventListener('click', () => {
        MadopicConfig.background.imageData = null;
        MadopicConfig.background.type = 'gradient';
        _activateBgTypePanel('gradient');
        applyBackgroundFromConfig();
        saveConfig();
        const prev = document.getElementById('bgImagePreview');
        if (prev) prev.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>点击上传背景图</span>';
    });

    // 虚化 & 透明度
    _bindSlider('bgImageBlur', v => { MadopicConfig.background.imageBlur = parseInt(v); applyBackgroundFromConfig(); saveConfig(); });
    _bindSlider('bgImageOpacity', v => { MadopicConfig.background.imageOpacity = parseFloat(v); applyBackgroundFromConfig(); saveConfig(); });
}

function setupLayoutControls() {
    _bindSlider('fontSizeSlider', v => {
        const n = parseFloat(v);
        MadopicConfig.layout.fontSize = n;
        currentFontSize = n;
        applyFontSize(n);
        saveConfig();
    });
    _bindSlider('widthSlider', v => {
        const n = parseInt(v);
        MadopicConfig.layout.width = n;
        currentWidth = n;
        applyWidth(n);
        saveConfig();
    });
    _bindSlider('paddingSlider', v => {
        const n = parseFloat(v);
        MadopicConfig.layout.padding = n;
        currentPadding = n;
        applyPadding(n);
        saveConfig();
    });
}

function setupResetButton() {
    document.getElementById('resetAllSettings')?.addEventListener('click', () => {
        if (!confirm('确认恢复所有设置为默认值？')) return;
        localStorage.removeItem(CONFIG_KEY);
        location.reload();
    });
}

// 控件绑定辅助函数
function _bindCheckbox(id, cb) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => cb(el.checked));
}
function _bindInput(id, cb) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debounce(() => cb(el.value), 200));
}
function _bindColor(id, cb) {
    const el = document.getElementById(id);
    if (!el) return;
    const valueEl = document.getElementById(id + 'Value');
    el.addEventListener('input', () => {
        if (valueEl) valueEl.textContent = el.value;
        cb(el.value);
    });
}
function _bindSlider(id, cb) {
    const el = document.getElementById(id);
    if (!el) return;
    const valueEl = document.getElementById(id + 'Value');
    el.addEventListener('input', () => {
        if (valueEl) {
            const unit = id.includes('Opacity') ? '' : 'px';
            valueEl.textContent = el.value + unit;
        }
        cb(el.value);
    });
}

// ===== 手动渲染控制 =====
// 设计决策：配置变更不再自动触发重渲染（html2canvas 很重），
// 改为标记 dirty 状态，用户点击「渲染」按钮后才执行。

let _renderDirty = false;

/** 标记配置已变更，需要重新渲染。渲染按钮会显示提示状态。 */
function _markRenderDirty() {
    _renderDirty = true;
    const btn = document.getElementById('renderBtn');
    if (btn) {
        btn.classList.add('render-dirty');
        btn.title = '配置已变更，点击刷新预览';
    }
}

/** 清除 dirty 标记 */
function _clearRenderDirty() {
    _renderDirty = false;
    const btn = document.getElementById('renderBtn');
    if (btn) {
        btn.classList.remove('render-dirty');
        btn.title = '应用设置并刷新预览';
    }
}

/**
 * 手动渲染：应用所有配置变更并刷新预览。
 * 由「渲染」按钮点击触发，同时刷新单页预览和多图预览（如果打开的话）。
 */
function manualRender() {
    _clearRenderDirty();
    // 刷新单页预览（重新应用所有样式配置）
    applyHeaderConfig();
    applyFooterConfig();
    applyBackgroundFromConfig();
    applyFontSize(MadopicConfig.layout.fontSize);
    applyWidth(MadopicConfig.layout.width);
    applyPadding(MadopicConfig.layout.padding);
    // 强制重新渲染 Markdown 内容
    lastRenderedMarkdown = '';
    updatePreview();
    // 如果多图预览正在显示，刷新多图预览
    const mc = document.getElementById('multiPreviewContainer');
    if (mc && mc.style.display !== 'none' && mc.style.display !== '') {
        _cachedPageSplitResult = null;
        _measureHeightCache.clear();
        openMultiPreview();
    }
}

// ===== 多图预览系统 =====

let multiPreviewPages = []; // 缓存的页面 Blob URL 列表
let multiPreviewCurrentIndex = 0;
let _multiPreviewRefreshTimer = null;

/**
 * 当多图预览处于打开状态时，防抖触发重新生成预览。
 * 在侧边栏配置变更后调用此函数，避免频繁操作时反复渲染。
 * 设计决策：使用 800ms 防抖而非即时刷新，因为 html2canvas 渲染较重，
 * 用户连续拖动滑块时不应每帧都重新渲染。
 */
function scheduleMultiPreviewRefresh() {
    const mc = document.getElementById('multiPreviewContainer');
    // 仅在多图预览可见时才刷新
    if (!mc || mc.style.display === 'none' || mc.style.display === '') return;
    if (_multiPreviewRefreshTimer) clearTimeout(_multiPreviewRefreshTimer);
    // 配置变更时清除分页缓存，确保重新计算
    _cachedPageSplitResult = null;
    _measureHeightCache.clear();
    _multiPreviewRefreshTimer = setTimeout(() => {
        _multiPreviewRefreshTimer = null;
        openMultiPreview();
    }, 800);
}

let _multiPreviewRendering = false; // 并发锁，防止重叠渲染

/**
 * 释放之前缓存的 Blob URL，防止内存泄漏
 */
function releaseMultiPreviewPages() {
    multiPreviewPages.forEach(url => {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    multiPreviewPages = [];
}

/**
 * 渲染单页为图片 Blob URL
 * 抽取为独立函数，供并发批处理调用
 */
async function renderPageToImage(pageMarkdown, pageIndex, totalPages, pageHeight, scales) {
    let node = null;
    try {
        node = await createPageExportNode(pageMarkdown, pageIndex, totalPages);
        node.style.height = `${pageHeight}px`;
        node.style.minHeight = `${pageHeight}px`;
        node.style.overflow = 'hidden';

        await prepareImagesForExport(node);
        if (document.fonts?.ready) try { await document.fonts.ready; } catch (_) {}
        await new Promise(r => requestAnimationFrame(r));

        const rect = node.getBoundingClientRect();
        const canvas = await renderWithFallbackScales(node, Math.ceil(rect.width), Math.ceil(rect.height), scales);

        // 使用 Blob URL 代替 base64 dataUrl，大幅降低内存占用
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(b => {
                if (b) resolve(b);
                else reject(new Error('toBlob 返回 null'));
            }, 'image/png', 0.85);
        });
        return URL.createObjectURL(blob);
    } finally {
        if (node?.parentNode) {
            echartsRenderer.destroyAll(node);
            node.parentNode.removeChild(node);
        }
    }
}

async function openMultiPreview() {
    const markdownText = markdownInput.value.trim();
    if (!markdownText) {
        showNotification('没有内容可预览', 'warning');
        return;
    }

    // 如果正在渲染，跳过本次（防抖后会再触发一次）
    if (_multiPreviewRendering) return;
    _multiPreviewRendering = true;

    showNotification('正在分析内容并分割页面...', 'info');

    try {
        // 确保导出库已加载
        await ensureExportLibsLoaded();

        const pageHeight = Math.round((currentWidth / 3) * 4);
        const pages = await splitMarkdownIntoPages(markdownText, pageHeight, currentWidth, currentPadding, currentFontSize);

        // 释放之前的缓存
        releaseMultiPreviewPages();

        // === 封面页渲染 ===
        let coverUrl = null;
        const coverCfg = MadopicConfig.cover;
        if (coverCfg.enabled && coverCfg.title) {
            showNotification('正在生成封面页...', 'info');
            let coverNode = null;
            try {
                coverNode = await createCoverExportNode(pageHeight);
                await prepareImagesForExport(coverNode);
                if (document.fonts?.ready) try { await document.fonts.ready; } catch (_) {}
                await new Promise(r => requestAnimationFrame(r));

                const rect = coverNode.getBoundingClientRect();
                const canvas = await renderWithFallbackScales(coverNode, Math.ceil(rect.width), Math.ceil(rect.height), [1.5, 1]);
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob(b => {
                        if (b) resolve(b);
                        else reject(new Error('toBlob 返回 null'));
                    }, 'image/png', 0.85);
                });
                coverUrl = URL.createObjectURL(blob);
            } catch (e) {
                console.error('封面页预览生成失败:', e);
                showNotification('封面页生成失败，继续生成内容页...', 'warning');
            } finally {
                if (coverNode?.parentNode) coverNode.parentNode.removeChild(coverNode);
            }
        }

        const totalDisplay = pages.length + (coverUrl ? 1 : 0);
        showNotification(`共 ${totalDisplay} 页，正在生成预览...`, 'info');

        const BATCH_SIZE = 3; // 每批并行渲染 3 页（平衡速度与内存）
        const results = new Array(pages.length);

        for (let batchStart = 0; batchStart < pages.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, pages.length);
            const batchPromises = [];

            for (let i = batchStart; i < batchEnd; i++) {
                batchPromises.push(
                    renderPageToImage(pages[i], i, pages.length, pageHeight, [1.5, 1])
                        .catch(e => {
                            console.error(`预览第 ${i + 1} 页失败:`, e);
                            return null;
                        })
                );
            }

            const batchResults = await Promise.all(batchPromises);
            for (let j = 0; j < batchResults.length; j++) {
                results[batchStart + j] = batchResults[j];
            }

            showNotification(`已生成 ${batchEnd} / ${pages.length} 页预览...`, 'info');
        }

        // 封面页插入到最前面
        const contentPages = results.filter(Boolean);
        multiPreviewPages = coverUrl ? [coverUrl, ...contentPages] : contentPages;

        if (multiPreviewPages.length === 0) {
            showNotification('多图预览生成失败', 'error');
            return;
        }

        // 切换到多图预览视图
        document.getElementById('previewContainer').style.display = 'none';
        const mc = document.getElementById('multiPreviewContainer');
        mc.style.display = 'flex';
        document.getElementById('multiPreviewInfo').textContent = `共 ${multiPreviewPages.length} 页`;

        // 默认显示网格视图
        switchMultiPreviewMode('grid');
        renderMultiPreviewGrid();

        showNotification(`已生成 ${multiPreviewPages.length} 页预览`, 'success');
    } catch (e) {
        console.error('多图预览失败:', e);
        showNotification('多图预览生成失败: ' + e.message, 'error');
    } finally {
        _multiPreviewRendering = false;
    }
}

function closeMultiPreview() {
    document.getElementById('multiPreviewContainer').style.display = 'none';
    document.getElementById('previewContainer').style.display = '';
    // 关闭时释放内存
    releaseMultiPreviewPages();
}

function switchMultiPreviewMode(mode) {
    const gridBtn = document.getElementById('gridViewBtn');
    const carouselBtn = document.getElementById('carouselViewBtn');
    const gridView = document.getElementById('multiPreviewGrid');
    const carouselView = document.getElementById('multiPreviewCarousel');

    if (mode === 'grid') {
        gridBtn?.classList.add('active');
        carouselBtn?.classList.remove('active');
        if (gridView) gridView.style.display = '';
        if (carouselView) carouselView.style.display = 'none';
        renderMultiPreviewGrid();
    } else {
        gridBtn?.classList.remove('active');
        carouselBtn?.classList.add('active');
        if (gridView) gridView.style.display = 'none';
        if (carouselView) carouselView.style.display = '';
        multiPreviewCurrentIndex = 0;
        renderCarouselPage();
        renderCarouselThumbnails();
    }
}

function renderMultiPreviewGrid() {
    const grid = document.getElementById('multiPreviewGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // 使用事件委托，避免为每个 card 注册独立监听
    grid.onclick = function (e) {
        const card = e.target.closest('.grid-page-card');
        if (!card) return;
        const idx = parseInt(card.dataset.index, 10);
        if (!isNaN(idx)) {
            switchMultiPreviewMode('carousel');
            multiPreviewCurrentIndex = idx;
            renderCarouselPage();
            renderCarouselThumbnails();
        }
    };

    // 使用 DocumentFragment 批量插入，减少重排
    const fragment = document.createDocumentFragment();
    const hasCoverPage = MadopicConfig.cover.enabled && MadopicConfig.cover.title;
    multiPreviewPages.forEach((url, i) => {
        const card = document.createElement('div');
        card.className = 'grid-page-card';
        card.dataset.index = i;
        const img = document.createElement('img');
        img.src = url;
        const isCover = hasCoverPage && i === 0;
        const pageLabel = isCover ? '封面' : `第 ${i + 1 - (hasCoverPage ? 1 : 0)} 页`;
        img.alt = pageLabel;
        img.loading = 'lazy'; // 浏览器原生懒加载
        const label = document.createElement('div');
        label.className = 'page-label';
        label.textContent = pageLabel;
        card.appendChild(img);
        card.appendChild(label);
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

function renderCarouselPage() {
    const viewport = document.getElementById('carouselViewport');
    if (!viewport || multiPreviewPages.length === 0) return;
    const url = multiPreviewPages[multiPreviewCurrentIndex];
    const hasCoverPage = MadopicConfig.cover.enabled && MadopicConfig.cover.title;
    const isCover = hasCoverPage && multiPreviewCurrentIndex === 0;
    const pageLabel = isCover ? '封面' : `第 ${multiPreviewCurrentIndex + 1 - (hasCoverPage ? 1 : 0)} 页`;
    viewport.innerHTML = `<img src="${url}" alt="${pageLabel}">`;
    // 更新缩略图高亮
    document.querySelectorAll('.carousel-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === multiPreviewCurrentIndex);
    });
}

function renderCarouselThumbnails() {
    const container = document.getElementById('carouselThumbnails');
    if (!container) return;
    container.innerHTML = '';

    // 使用事件委托
    container.onclick = function (e) {
        const thumb = e.target.closest('.carousel-thumb');
        if (!thumb) return;
        const idx = parseInt(thumb.dataset.index, 10);
        if (!isNaN(idx)) {
            multiPreviewCurrentIndex = idx;
            renderCarouselPage();
            // 更新高亮
            container.querySelectorAll('.carousel-thumb').forEach((t, i) => {
                t.classList.toggle('active', i === idx);
            });
        }
    };

    const fragment = document.createDocumentFragment();
    multiPreviewPages.forEach((url, i) => {
        const thumb = document.createElement('img');
        thumb.className = 'carousel-thumb' + (i === multiPreviewCurrentIndex ? ' active' : '');
        thumb.src = url;
        thumb.alt = `第 ${i + 1} 页`;
        thumb.loading = 'lazy';
        thumb.dataset.index = i;
        fragment.appendChild(thumb);
    });
    container.appendChild(fragment);
}

function navigateCarousel(direction) {
    if (multiPreviewPages.length === 0) return;
    multiPreviewCurrentIndex += direction;
    if (multiPreviewCurrentIndex < 0) multiPreviewCurrentIndex = multiPreviewPages.length - 1;
    if (multiPreviewCurrentIndex >= multiPreviewPages.length) multiPreviewCurrentIndex = 0;
    renderCarouselPage();
}

function setupMultiPreview() {
    document.getElementById('multiPreviewBtn')?.addEventListener('click', openMultiPreview);
    document.getElementById('closeMultiPreview')?.addEventListener('click', closeMultiPreview);
    document.getElementById('gridViewBtn')?.addEventListener('click', () => switchMultiPreviewMode('grid'));
    document.getElementById('carouselViewBtn')?.addEventListener('click', () => switchMultiPreviewMode('carousel'));
    document.getElementById('carouselPrev')?.addEventListener('click', () => navigateCarousel(-1));
    document.getElementById('carouselNext')?.addEventListener('click', () => navigateCarousel(1));
}

// ===== 工具函数 =====

/**
 * 防抖函数：延迟执行，在 delay 毫秒内多次调用只执行最后一次
 */
function debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * 动态加载脚本（懒加载 CDN）
 */
const loadedScripts = new Set();
async function loadScript(src) {
    if (loadedScripts.has(src)) return;
    if (src.includes('html2canvas') && typeof html2canvas !== 'undefined') {
        loadedScripts.add(src);
        return;
    }
    if (src.includes('jspdf') && typeof jsPDF !== 'undefined') {
        loadedScripts.add(src);
        return;
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            loadedScripts.add(src);
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * 确保导出所需的库已加载
 */
async function ensureExportLibsLoaded() {
    const libs = [
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    ];
    await Promise.all(libs.map(loadScript));
}

/**
 * CORS 图片代理：将跨域图片 URL 转换为代理 URL
 */
function corsProxyUrl(url) {
    // 跳过 data: 和 blob: URL
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
    // 跳过同源图片
    try {
        const imgUrl = new URL(url, window.location.href);
        if (imgUrl.origin === window.location.origin) return url;
    } catch (e) {
        return url;
    }
    // 使用 weserv.nl 代理（免费、支持 CORS）
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}

/**
 * HTML 清理函数：移除潜在的 XSS 攻击代码
 * 注意：这是一个基础版本，建议在生产环境中使用 DOMPurify 等专业库
 */
function sanitizeHTML(html) {
    // 创建临时 DOM 容器
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // 移除危险的标签
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link'];
    dangerousTags.forEach(tag => {
        const elements = temp.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });

    // 移除危险的属性（on* 事件处理器）
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
        // 移除所有 on* 属性
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });

        // 清理 href 和 src 中的 javascript: 协议
        if (el.hasAttribute('href')) {
            const href = el.getAttribute('href');
            if (href && href.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute('href');
            }
        }
        if (el.hasAttribute('src')) {
            const src = el.getAttribute('src');
            if (src && src.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute('src');
            }
        }
    });

    return temp.innerHTML;
}

// ===== 撤销/重做管理器 =====
class UndoRedoManager {
    constructor(maxHistory = 50) {
        this.history = [];
        this.index = -1;
        this.maxHistory = maxHistory;
        this.isUndoRedo = false;
    }

    push(state) {
        if (this.isUndoRedo) return;
        // 移除当前位置之后的历史
        this.history = this.history.slice(0, this.index + 1);
        this.history.push(state);
        // 限制历史大小
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.index++;
        }
    }

    undo() {
        if (this.index > 0) {
            this.index--;
            return this.history[this.index];
        }
        return null;
    }

    redo() {
        if (this.index < this.history.length - 1) {
            this.index++;
            return this.history[this.index];
        }
        return null;
    }

    canUndo() { return this.index > 0; }
    canRedo() { return this.index < this.history.length - 1; }
}

const undoRedoManager = new UndoRedoManager();

// ===== 自动保存 =====
const AUTOSAVE_KEY = 'madopic_draft';
const AUTOSAVE_SETTINGS_KEY = 'madopic_settings';

function autoSave(content) {
    try {
        localStorage.setItem(AUTOSAVE_KEY, content);
        localStorage.setItem(AUTOSAVE_SETTINGS_KEY, JSON.stringify({
            background: currentBackground,
            fontSize: typeof currentFontSize !== 'undefined' ? currentFontSize : 18,
            width: typeof currentWidth !== 'undefined' ? currentWidth : 640,
            padding: typeof currentPadding !== 'undefined' ? currentPadding : 40,
            mode: typeof currentMode !== 'undefined' ? currentMode : 'free'
        }));
    } catch (e) {
        console.warn('自动保存失败:', e);
        // 用户友好提示：可能是存储空间已满
        if (typeof showNotification === 'function') {
            showNotification('自动保存失败，可能是浏览器存储空间已满', 'warning');
        }
    }
}

function loadDraft() {
    try {
        return localStorage.getItem(AUTOSAVE_KEY);
    } catch (e) {
        console.warn('加载草稿失败:', e);
        if (typeof showNotification === 'function') {
            showNotification('加载草稿失败，将使用默认内容', 'info');
        }
        return null;
    }
}

function loadSettings() {
    try {
        const settings = localStorage.getItem(AUTOSAVE_SETTINGS_KEY);
        return settings ? JSON.parse(settings) : null;
    } catch (e) {
        console.warn('加载设置失败:', e);
        if (typeof showNotification === 'function') {
            showNotification('加载设置失败，将使用默认设置', 'info');
        }
        return null;
    }
}

// ===== 数学公式渲染器 =====
class MathRenderer {
    constructor() {
        this.isKaTeXLoaded = false;
        this.checkKaTeXAvailability();
    }

    checkKaTeXAvailability() {
        this.isKaTeXLoaded = typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined';
        if (!this.isKaTeXLoaded) {
            console.warn('KaTeX not loaded. Math formulas will not be rendered.');
        } else {
            // 检查mhchem扩展是否可用
            const hasMhchem = typeof katex.__defineMacro !== 'undefined' ||
                (window.katex && window.katex.__plugins && window.katex.__plugins['mhchem']);
            if (hasMhchem) {
                console.log('KaTeX with mhchem extension loaded successfully');
            } else {
                console.warn('KaTeX loaded but mhchem extension may not be available');
            }
        }
    }

    renderMath(element) {
        if (!this.isKaTeXLoaded) {
            console.warn('KaTeX not available for math rendering');
            return;
        }

        try {
            renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false,
                trust: true,
                macros: {
                    // 物理常量
                    '\\emc': 'E=mc^{2}',
                    '\\hbar': '\\hslash',
                    '\\kb': 'k_B',
                    '\\NA': 'N_A',
                    // 常用符号
                    '\\R': '\\mathbb{R}',
                    '\\C': '\\mathbb{C}',
                    '\\N': '\\mathbb{N}',
                    '\\Z': '\\mathbb{Z}',
                    '\\Q': '\\mathbb{Q}',
                    // 微积分
                    '\\dd': '\\mathrm{d}',
                    '\\dv': ['\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}', 2],
                    '\\pdv': ['\\frac{\\partial#1}{\\partial#2}', 2],
                    // 向量
                    '\\vb': ['\\mathbf{#1}', 1],
                    '\\vu': ['\\hat{\\mathbf{#1}}', 1],
                    // 物理单位
                    '\\unit': ['\\,\\mathrm{#1}', 1]
                },
                fleqn: false,
                displayMode: false
            });
        } catch (error) {
            console.error('Math rendering error:', error);
            this.showMathError(element, error.message);
        }
    }

    showMathError(element, errorMessage) {
        const errorElements = element.querySelectorAll('.katex-error');
        errorElements.forEach(errorEl => {
            errorEl.style.color = '#cc0000';
            errorEl.title = `Math Error: ${errorMessage}`;
        });
    }

    // 预处理Markdown中的数学公式
    preprocessMath(markdown) {
        // 处理质能守恒公式的特殊情况
        markdown = markdown.replace(/E\s*=\s*mc\^?2/g, '$E=mc^{2}$');

        // 处理其他常见物理公式
        markdown = markdown.replace(/F\s*=\s*ma/g, '$F=ma$');
        markdown = markdown.replace(/v\s*=\s*u\s*\+\s*at/g, '$v=u+at$');
        markdown = markdown.replace(/s\s*=\s*ut\s*\+\s*½at²/g, '$s=ut+\\frac{1}{2}at^{2}$');
        markdown = markdown.replace(/v²\s*=\s*u²\s*\+\s*2as/g, '$v^{2}=u^{2}+2as$');

        // 处理数学常量
        markdown = markdown.replace(/π/g, '$\\pi$');
        markdown = markdown.replace(/∞/g, '$\\infty$');
        markdown = markdown.replace(/±/g, '$\\pm$');
        markdown = markdown.replace(/≤/g, '$\\leq$');
        markdown = markdown.replace(/≥/g, '$\\geq$');
        markdown = markdown.replace(/≠/g, '$\\neq$');
        markdown = markdown.replace(/∈/g, '$\\in$');
        markdown = markdown.replace(/∉/g, '$\\notin$');
        markdown = markdown.replace(/⊆/g, '$\\subseteq$');
        markdown = markdown.replace(/⊇/g, '$\\supseteq$');
        markdown = markdown.replace(/∪/g, '$\\cup$');
        markdown = markdown.replace(/∩/g, '$\\cap$');
        markdown = markdown.replace(/∅/g, '$\\emptyset$');

        // 处理希腊字母
        markdown = markdown.replace(/α/g, '$\\alpha$');
        markdown = markdown.replace(/β/g, '$\\beta$');
        markdown = markdown.replace(/γ/g, '$\\gamma$');
        markdown = markdown.replace(/δ/g, '$\\delta$');
        markdown = markdown.replace(/ε/g, '$\\epsilon$');
        markdown = markdown.replace(/θ/g, '$\\theta$');
        markdown = markdown.replace(/λ/g, '$\\lambda$');
        markdown = markdown.replace(/μ/g, '$\\mu$');
        markdown = markdown.replace(/σ/g, '$\\sigma$');
        markdown = markdown.replace(/φ/g, '$\\phi$');
        markdown = markdown.replace(/ω/g, '$\\omega$');

        return markdown;
    }
}

// 创建全局数学渲染器实例
const mathRenderer = new MathRenderer();

// ===== 图表渲染器 =====
class DiagramRenderer {
    constructor() {
        this.isMermaidLoaded = false;
        this.mermaidConfig = {
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
                primaryColor: '#6366f1',
                primaryTextColor: '#1f2937',
                primaryBorderColor: '#4f46e5',
                lineColor: '#6b7280',
                secondaryColor: '#f3f4f6',
                tertiaryColor: '#ffffff'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            },
            sequence: {
                useMaxWidth: true,
                wrap: true
            },
            gantt: {
                useMaxWidth: true
            }
        };
        this.checkMermaidAvailability();
    }

    checkMermaidAvailability() {
        this.isMermaidLoaded = typeof mermaid !== 'undefined';
        if (this.isMermaidLoaded) {
            try {
                mermaid.initialize(this.mermaidConfig);
                console.log('Mermaid initialized successfully');
            } catch (error) {
                console.error('Mermaid initialization error:', error);
                this.isMermaidLoaded = false;
            }
        } else {
            console.warn('Mermaid not loaded. Diagrams will not be rendered.');
        }
    }

    async renderDiagram(element, diagramCode, diagramId) {
        if (!this.isMermaidLoaded) {
            console.warn('Mermaid not available for diagram rendering');
            this.showDiagramError(element, 'Mermaid library not loaded');
            return;
        }

        try {
            // 清除之前的内容
            element.innerHTML = '';

            // 渲染图表
            const { svg } = await mermaid.render(diagramId, diagramCode);
            element.innerHTML = svg;

            // 添加图表容器样式
            element.classList.add('mermaid-diagram');

        } catch (error) {
            console.error('Diagram rendering error:', error);
            this.showDiagramError(element, error.message);
        }
    }

    showDiagramError(element, errorMessage) {
        element.innerHTML = `
            <div class="diagram-error">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="error-title">图表渲染错误</div>
                <div class="error-message">${errorMessage}</div>
            </div>
        `;
        element.classList.add('diagram-error-container');
    }

    // 预处理Markdown中的图表代码
    preprocessDiagram(markdown) {
        // 为每个mermaid代码块生成唯一ID
        let diagramCounter = 0;
        return markdown.replace(/```mermaid\s*\n([\s\S]*?)\n```/g, (match, code) => {
            const diagramId = `mermaid-diagram-${++diagramCounter}`;
            return `<div class="mermaid-container" data-diagram-id="${diagramId}" data-diagram-code="${encodeURIComponent(code.trim())}"></div>`;
        });
    }

    // 渲染页面中的所有图表
    async renderDiagrams(container) {
        if (!this.isMermaidLoaded) {
            return;
        }

        const diagramContainers = container.querySelectorAll('.mermaid-container');

        for (const diagramContainer of diagramContainers) {
            const diagramId = diagramContainer.getAttribute('data-diagram-id');
            const diagramCode = decodeURIComponent(diagramContainer.getAttribute('data-diagram-code'));

            if (diagramId && diagramCode) {
                await this.renderDiagram(diagramContainer, diagramCode, diagramId);
            }
        }
    }

    // 设置主题
    setTheme(theme) {
        if (!this.isMermaidLoaded) {
            return;
        }

        this.mermaidConfig.theme = theme;
        try {
            mermaid.initialize(this.mermaidConfig);
        } catch (error) {
            console.error('Theme update error:', error);
        }
    }
}

// 创建全局图表渲染器实例
const diagramRenderer = new DiagramRenderer();

// ECharts 渲染器类
class EChartsRenderer {
    constructor() {
        this.isEChartsLoaded = false;
        // 使用 WeakMap 存储实例，自动垃圾回收
        this.instances = new WeakMap();
        this.checkEChartsAvailability();
    }

    checkEChartsAvailability() {
        this.isEChartsLoaded = typeof echarts !== 'undefined';
        if (!this.isEChartsLoaded) {
            console.warn('ECharts not loaded. ECharts diagrams will not be rendered.');
        }
    }

    async renderEChart(element, chartConfig, chartId) {
        if (!this.isEChartsLoaded) {
            console.warn('ECharts not available for chart rendering');
            this.showEChartError(element, 'ECharts library not loaded');
            return;
        }

        try {
            // 清理之前的实例（如果存在）
            this.destroy(element);

            // 清除之前的内容
            element.innerHTML = '';

            // 创建图表容器
            const chartContainer = document.createElement('div');
            chartContainer.id = chartId;
            chartContainer.style.width = '100%';
            chartContainer.style.height = '400px';
            chartContainer.style.minHeight = '300px';
            element.appendChild(chartContainer);

            // 解析配置
            let config;
            if (typeof chartConfig === 'string') {
                config = JSON.parse(chartConfig);
            } else {
                config = chartConfig;
            }

            // 初始化图表
            const chart = echarts.init(chartContainer);
            chart.setOption(config);

            // 响应式调整
            const resizeObserver = new ResizeObserver(() => {
                chart.resize();
            });
            resizeObserver.observe(chartContainer);

            // 使用 WeakMap 存储图表实例
            this.instances.set(element, {
                chart,
                resizeObserver,
                container: chartContainer
            });

        } catch (error) {
            console.error('ECharts rendering error:', error);
            this.showEChartError(element, error.message);
        }
    }

    showEChartError(element, errorMessage) {
        element.innerHTML = `
            <div class="echarts-error" style="
                padding: 20px;
                border: 2px dashed #ff6b6b;
                border-radius: 8px;
                background-color: #ffe0e0;
                color: #d63031;
                text-align: center;
                font-family: monospace;
            ">
                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                ECharts Error: ${errorMessage}
            </div>
        `;
    }

    preprocessECharts(markdown) {
        // 处理 ```echarts 代码块
        return markdown.replace(/```echarts\s*\n([\s\S]*?)\n```/g, (match, code) => {
            const chartId = 'echarts-' + Math.random().toString(36).substr(2, 9);
            return `<div class="echarts-container" data-echarts-id="${chartId}" data-echarts-config="${encodeURIComponent(code.trim())}"></div>`;
        });
    }

    async renderECharts(container) {
        const echartsElements = container.querySelectorAll('.echarts-container');

        for (const element of echartsElements) {
            const chartId = element.getAttribute('data-echarts-id');
            const configData = decodeURIComponent(element.getAttribute('data-echarts-config'));

            await this.renderEChart(element, configData, chartId);
        }
    }

    /**
     * 清理单个 ECharts 实例
     */
    destroy(element) {
        const instance = this.instances.get(element);
        if (instance) {
            try {
                // 断开 ResizeObserver
                if (instance.resizeObserver) {
                    instance.resizeObserver.disconnect();
                }
                // 销毁图表实例
                if (instance.chart) {
                    instance.chart.dispose();
                }
            } catch (e) {
                console.warn('清理 ECharts 实例失败:', e);
            }
            // 从 WeakMap 中删除
            this.instances.delete(element);
        }
    }

    /**
     * 清理指定容器内的所有 ECharts 实例
     */
    destroyAll(container) {
        if (!container) return;

        const echartsElements = container.querySelectorAll('.echarts-container');
        echartsElements.forEach(element => {
            this.destroy(element);
        });
    }
}


// 创建全局 ECharts 渲染器实例
const echartsRenderer = new EChartsRenderer();

// ===== 卡片渲染器 =====
class CardRenderer {
    constructor() {
        // 卡片渲染器不需要外部依赖
    }

    // 预处理Markdown中的卡片语法
    preprocessCards(markdown) {
        // 处理 :::card 语法，支持不同类型的卡片
        return markdown.replace(/:::card(?:\s+(info|success|warning|error))?\s*\n([\s\S]*?)\n:::/g, (match, type, content) => {
            const cardType = type || 'default';
            const cardId = 'card-' + Math.random().toString(36).substr(2, 9);
            return `<div class="card-container" data-card-id="${cardId}" data-card-type="${cardType}" data-card-content="${encodeURIComponent(content.trim())}"></div>`;
        });
    }

    // 渲染页面中的所有卡片
    async renderCards(container) {
        const cardContainers = container.querySelectorAll('.card-container');

        for (const cardContainer of cardContainers) {
            const cardId = cardContainer.getAttribute('data-card-id');
            const cardType = cardContainer.getAttribute('data-card-type');
            const cardContent = decodeURIComponent(cardContainer.getAttribute('data-card-content'));

            if (cardId && cardContent) {
                await this.renderCard(cardContainer, cardContent, cardType);
            }
        }
    }

    // 渲染单个卡片
    async renderCard(element, content, type) {
        try {
            // 清除之前的内容
            element.innerHTML = '';

            // 解析卡片内容的Markdown
            let htmlContent = '';
            try {
                htmlContent = marked.parse(content);
            } catch (err) {
                console.error('卡片内容Markdown解析失败: ', err);
                htmlContent = '<p>卡片内容解析失败</p>';
            }

            // 创建卡片HTML结构
            const cardHtml = `
                <div class="madopic-card ${type !== 'default' ? 'card-' + type : ''}">
                    <div class="card-content">
                        ${htmlContent}
                    </div>
                </div>
            `;

            element.innerHTML = cardHtml;

        } catch (error) {
            console.error('卡片渲染错误:', error);
            element.innerHTML = `
                <div class="madopic-card">
                    <div class="card-content">
                        <p style="color: #ef4444;">卡片渲染失败：${error.message}</p>
                    </div>
                </div>
            `;
        }
    }
}

// 创建全局卡片渲染器实例
const cardRenderer = new CardRenderer();

// ===== 导出相关常量 =====
// 控制导出清晰度的缩放倍数范围
const EXPORT_MIN_SCALE = 2;
const EXPORT_MAX_SCALE = 3;

function getPreferredExportScale() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlScale = parseFloat(urlParams.get('scale'));
        const storedScale = parseFloat(localStorage.getItem('madopic_export_scale'));
        const base = Number.isFinite(urlScale)
            ? urlScale
            : (Number.isFinite(storedScale)
                ? storedScale
                : Math.max(2, window.devicePixelRatio || 1));
        return Math.min(EXPORT_MAX_SCALE, Math.max(EXPORT_MIN_SCALE, base));
    } catch (_) {
        return Math.max(EXPORT_MIN_SCALE, Math.min(EXPORT_MAX_SCALE, 2));
    }
}

const EXPORT_SCALE = getPreferredExportScale();

// 预设背景渐变
const backgroundPresets = {
    gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    gradient6: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    gradient7: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    gradient8: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
};

// DOM 元素
const markdownInput = document.getElementById('markdownInput');
const lineNumbersEl = document.querySelector('.line-numbers');
const posterContent = document.getElementById('posterContent');
const markdownPoster = document.getElementById('markdownPoster');
const previewContent = document.getElementById('previewContent');
const overlay = document.getElementById('overlay');
const zoomLevel = document.querySelector('.zoom-level');

// 图片数据存储（使用 Map 提供更好的性能）
const imageDataStore = new Map();

// 图片缓存管理器
const ImageCache = {
    cache: new Map(),
    maxSize: 50, // 最多缓存 50 张图片

    set(url, data) {
        // 如果缓存已满，删除最早的项
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(url, {
            data,
            timestamp: Date.now()
        });
    },

    get(url) {
        const item = this.cache.get(url);
        return item ? item.data : null;
    },

    has(url) {
        return this.cache.has(url);
    },

    clear() {
        this.cache.clear();
    },

    // 清理超过指定时间的缓存（默认 30 分钟）
    cleanup(maxAge = 30 * 60 * 1000) {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }
    }
};

// 预览渲染状态
let hasInitialPreviewRendered = false;
let lastRenderedMarkdown = '';

// 初始化应用
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
    updatePreview();
});

// 初始化应用
function initializeApp() {
    // 配置 marked 选项
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
        highlight: function (code, lang) {
            return code;
        }
    });

    // 加载持久化配置
    loadConfig();

    // 同步配置到全局变量（兼容旧代码）
    currentFontSize = MadopicConfig.layout.fontSize;
    currentPadding = MadopicConfig.layout.padding;
    currentWidth = MadopicConfig.layout.width;

    // 应用所有配置到预览区
    applyAllConfig();

    // 初始化图表渲染器主题
    diagramRenderer.setTheme('default');

    // 更新缩放显示
    updateZoomDisplay();

    // 初始化行号
    updateLineNumbers();
}

// 设置事件监听器
function setupEventListeners() {
    // Markdown 输入监听（updatePreview 由 initOptimizations 中的 debouncedUpdatePreview 统一管理，此处只处理行号）
    markdownInput.addEventListener('input', updateLineNumbers);
    markdownInput.addEventListener('scroll', syncLineNumbersScroll);

    // 工具栏按钮
    setupToolbarButtons();

    // 缩放控制
    document.getElementById('zoomIn').addEventListener('click', zoomIn);
    document.getElementById('zoomOut').addEventListener('click', zoomOut);

    // 设置侧边栏
    setupSettingsSidebar();

    // 多图预览
    setupMultiPreview();

    // 遮罩层点击关闭
    overlay.addEventListener('click', () => {
        closeSettingsSidebar();
    });

    // 导出功能
    setupExportButtons();
    setupModeButtons();

    // 图片处理
    setupImageHandlers();

    // 键盘快捷键
    setupKeyboardShortcuts();
}

// 设置导出按钮事件
function setupExportButtons() {
    const exportPngBtn = document.getElementById('exportPngBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportHtmlBtn = document.getElementById('exportHtmlBtn');
    const exportMultiPngBtn = document.getElementById('exportMultiPngBtn');

    if (exportPngBtn) {
        exportPngBtn.addEventListener('click', exportToPNG);
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportToPDF);
    }

    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', exportToHTML);
    }

    if (exportMultiPngBtn) {
        exportMultiPngBtn.addEventListener('click', exportToMultiPNG);
    }
}

// 模式按钮绑定
function setupModeButtons() {
    const group = document.getElementById('modeGroup');
    if (!group) return;
    group.querySelectorAll('button[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            setMode(mode);
        });
    });
}

function setMode(mode) {
    if (!['free', 'xhs', 'pyq'].includes(mode)) return;
    currentMode = mode;
    // 切换按钮激活态
    const group = document.getElementById('modeGroup');
    if (group) {
        group.querySelectorAll('button[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });
    }
    // 预览区域视觉反馈（仅预览容器外层，不改导出逻辑）
    applyPreviewModeFrame();
}

function applyPreviewModeFrame() {
    // 预览时根据模式设置固定可视高度（以外层 markdownPoster 的 box 包含 padding 与内容）
    markdownPoster.dataset.mode = currentMode;
    if (currentMode === 'xhs') {
        // 3:4（宽:高） => 高度 = 宽度 / 3 * 4。由于 width 是含 padding 的可视宽度，这里与导出一致
        const rect = markdownPoster.getBoundingClientRect();
        const targetHeight = Math.round((rect.width / 3) * 4);
        markdownPoster.style.height = `${targetHeight}px`;
        markdownPoster.style.minHeight = `${targetHeight}px`;
        markdownPoster.style.overflow = 'hidden'; // 超出裁掉

        // 计算可用给白卡片（posterContent）的最大高度，保留上下紫色 padding
        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, targetHeight - paddingTop - paddingBottom);
        posterContent.style.maxHeight = `${innerMax}px`;
        posterContent.style.overflow = 'hidden';
    } else if (currentMode === 'pyq') {
        // 朋友圈固定比例：1290x2796 ≈ 宽:高 = 1290:2796。
        // 在保持当前外层宽度不变的前提下，按该比例计算高度。
        const rect = markdownPoster.getBoundingClientRect();
        const targetHeight = Math.round(rect.width * (2796 / 1290));
        markdownPoster.style.height = `${targetHeight}px`;
        markdownPoster.style.minHeight = `${targetHeight}px`;
        markdownPoster.style.overflow = 'hidden';

        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, targetHeight - paddingTop - paddingBottom);
        posterContent.style.maxHeight = `${innerMax}px`;
        posterContent.style.overflow = 'hidden';
    } else {
        markdownPoster.style.height = '';
        markdownPoster.style.minHeight = '600px';
        markdownPoster.style.overflow = 'hidden';
        posterContent.style.maxHeight = '';
        posterContent.style.overflow = '';
    }
}

// 设置工具栏按钮
function setupToolbarButtons() {
    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', function () {
            const action = this.getAttribute('data-action');
            handleToolbarAction(action);
        });
    });
}

// 处理工具栏动作
function handleToolbarAction(action) {
    const textarea = markdownInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let insertText = '';
    let cursorPos = start;

    switch (action) {
        case 'bold':
            insertText = `**${selectedText || '粗体文本'}**`;
            cursorPos = start + (selectedText ? insertText.length : 2);
            break;
        case 'italic':
            insertText = `*${selectedText || '斜体文本'}*`;
            cursorPos = start + (selectedText ? insertText.length : 1);
            break;
        case 'heading':
            insertText = `## ${selectedText || '标题'}`;
            cursorPos = start + (selectedText ? insertText.length : 3);
            break;
        case 'list':
            insertText = `\n- ${selectedText || '列表项'}`;
            cursorPos = start + (selectedText ? insertText.length : 3);
            break;
        case 'link':
            insertText = `[${selectedText || '链接文本'}](https://example.com)`;
            cursorPos = start + (selectedText ? insertText.length : 1);
            break;
        case 'image':
            insertImage();
            return;
        case 'flowchart':
            MarkdownHelper.insertFlowchart();
            return;
        case 'sequence':
            MarkdownHelper.insertSequenceDiagram();
            return;
        case 'gantt':
            MarkdownHelper.insertGanttChart();
            return;
        case 'pie':
            MarkdownHelper.insertPieChart();
            return;
        case 'math':
            MarkdownHelper.insertMathFormulas();
            return;
        case 'physics':
            MarkdownHelper.insertPhysicsFormulas();
            return;
        case 'chemistry':
            MarkdownHelper.insertChemistryFormulas();
            return;
        case 'echarts':
            MarkdownHelper.insertEChartsTemplate();
            return;
        case 'einstein':
            MarkdownHelper.insertEinsteinFormula();
            return;
        case 'card':
            MarkdownHelper.insertCard();
            return;
        case 'empty-line':
            // 插入可在预览中可见的"Markdown 空行"占位段落
            insertText = `\n\n<p class="md-empty-line">&nbsp;</p>\n\n`;
            cursorPos = start + insertText.length;
            break;
        case 'clear':
            textarea.value = '';
            updatePreview();
            textarea.focus();
            return;
    }

    textarea.value = beforeText + insertText + afterText;
    textarea.setSelectionRange(cursorPos, cursorPos);
    textarea.focus();
    updatePreview();
}

// 更新预览
async function updatePreview() {
    const markdownText = markdownInput.value.trim();
    // 同步行号（在去抖预览之外也保证立即更新）
    updateLineNumbers();

    // 自动保存草稿
    autoSave(markdownInput.value);

    // 检查是否为空内容
    if (!markdownText) {
        showEmptyPreview();
        return;
    }

    // 预处理数学公式
    let processedMarkdown = mathRenderer.preprocessMath(markdownText);

    // 预处理图表
    processedMarkdown = diagramRenderer.preprocessDiagram(processedMarkdown);

    // 预处理 ECharts 图表
    processedMarkdown = echartsRenderer.preprocessECharts(processedMarkdown);

    // 预处理卡片
    processedMarkdown = cardRenderer.preprocessCards(processedMarkdown);

    // 替换简化的base64为完整版本进行预览
    processedMarkdown = replaceImageDataForPreview(processedMarkdown);

    // 仅在已完成至少一次渲染后，且内容确实未变化时跳过
    if (hasInitialPreviewRendered && processedMarkdown === lastRenderedMarkdown) {
        return;
    }
    lastRenderedMarkdown = processedMarkdown;

    let htmlContent = '';
    try {
        htmlContent = marked.parse(processedMarkdown);
        // 安全性：清理潜在的 XSS 攻击代码
        htmlContent = sanitizeHTML(htmlContent);
    } catch (err) {
        console.error('Markdown 渲染失败: ', err);
        htmlContent = '<p style="color:#ef4444">渲染失败，请检查 Markdown 内容。</p>';
        if (typeof showNotification === 'function') {
            showNotification('Markdown 渲染失败，请检查内容格式', 'error');
        }
    }
    posterContent.innerHTML = htmlContent;

    // 渲染数学公式
    mathRenderer.renderMath(posterContent);

    // 渲染图表
    await diagramRenderer.renderDiagrams(posterContent);

    // 渲染 ECharts 图表
    await echartsRenderer.renderECharts(posterContent);

    // 渲染卡片
    await cardRenderer.renderCards(posterContent);

    // 代码高亮（Prism.js）
    if (typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(posterContent);
    }

    // 确保内容容器可见
    posterContent.style.display = 'block';

    // 重新应用当前的字体大小设置
    applyFontSize(MadopicConfig.layout.fontSize);

    // 仅首次渲染使用淡入动画，后续输入不再触发，避免屏闪
    if (!hasInitialPreviewRendered) {
        posterContent.style.animation = 'fadeIn 0.3s ease';
        hasInitialPreviewRendered = true;
    } else {
        posterContent.style.animation = '';
    }
}

// 防抖版本的 updatePreview
const debouncedUpdatePreview = debounce(updatePreview, 300);

// ===== 行号逻辑 =====
function updateLineNumbers() {
    if (!lineNumbersEl) return;
    const value = markdownInput.value || '';
    const lines = value.split('\n').length;
    // 构造包含行号的内容（使用换行分隔）
    let content = '';
    for (let i = 1; i <= lines; i++) {
        content += (i === 1 ? '' : '\n') + i;
    }
    lineNumbersEl.textContent = content || '1';
    // 高度同步
    lineNumbersEl.style.height = markdownInput.scrollHeight + 'px';
    syncLineNumbersScroll();
}

function syncLineNumbersScroll() {
    if (!lineNumbersEl) return;
    lineNumbersEl.scrollTop = markdownInput.scrollTop;
}

// 显示空内容提示
function showEmptyPreview() {
    posterContent.innerHTML = `
        <div class="empty-preview">
            <div class="empty-icon">
                <i class="fab fa-markdown"></i>
            </div>
            <h3>开始创作吧！</h3>
            <p>在左侧编辑器中输入 Markdown 内容</p>
            <div class="empty-tips">
                <div class="tip-item">
                    <i class="fas fa-lightbulb"></i>
                    <span>支持标题、列表、链接、图片等格式</span>
                </div>
                <div class="tip-item">
                    <i class="fas fa-keyboard"></i>
                    <span>使用工具栏快捷按钮快速插入格式</span>
                </div>
                <div class="tip-item">
                    <i class="fas fa-palette"></i>
                    <span>点击"自定义"按钮调整背景和样式</span>
                </div>
            </div>
        </div>
    `;
    hasInitialPreviewRendered = false;
}

// 为图片元素设置跨域与防盗链相关属性
function applyImageAttributes(root) {
    const imgs = root.querySelectorAll('img');
    imgs.forEach((img) => {
        try {
            if (!img.getAttribute('crossorigin')) {
                img.setAttribute('crossorigin', 'anonymous');
            }
            if (!img.getAttribute('referrerpolicy')) {
                img.setAttribute('referrerpolicy', 'no-referrer');
            }
            if (!img.getAttribute('decoding')) {
                img.setAttribute('decoding', 'sync');
            }
            if (!img.getAttribute('loading')) {
                img.setAttribute('loading', 'eager');
            }
        } catch (_) {
            // 忽略单个图片设置失败
        }
    });
}

// 缩放控制
function zoomIn() {
    if (currentZoom < 150) {
        currentZoom += 25;
        applyZoom();
    }
}

function zoomOut() {
    if (currentZoom > 50) {
        currentZoom -= 25;
        applyZoom();
    }
}

function applyZoom() {
    previewContent.className = 'preview-content';
    if (currentZoom !== 100) {
        previewContent.classList.add(`zoom-${currentZoom}`);
    }
    updateZoomDisplay();
}

function updateZoomDisplay() {
    zoomLevel.textContent = `${currentZoom}%`;
}

// ===== 底层样式应用函数（被新的配置系统调用） =====

function applyBackground(backgroundCSS) {
    markdownPoster.style.background = backgroundCSS;
}

function applyFontSize(fontSize) {
    posterContent.style.setProperty('--dynamic-font-size', `${fontSize}px`);
    posterContent.style.setProperty('--dynamic-h1-size', `${Math.round(fontSize * 1.75)}px`);
    posterContent.style.setProperty('--dynamic-h2-size', `${Math.round(fontSize * 1.375)}px`);
    posterContent.style.setProperty('--dynamic-h3-size', `${Math.round(fontSize * 1.125)}px`);
    posterContent.style.setProperty('--dynamic-h4-size', `${Math.round(fontSize * 1.05)}px`);
    posterContent.style.setProperty('--dynamic-h5-h6-size', `${Math.round(fontSize * 0.95)}px`);
    posterContent.style.setProperty('--dynamic-code-size', `${Math.round(fontSize * 0.875)}px`);
    posterContent.style.setProperty('--dynamic-quote-size', `${Math.round(fontSize * 0.95)}px`);
}

function applyPadding(padding) {
    markdownPoster.style.padding = `${padding}px`;
}

function applyWidth(width) {
    markdownPoster.style.width = `${width}px`;
}


// ===== 导出相关工具 =====
/**
 * 创建一个与预览完全一致的离屏克隆节点用于导出。
 * 关键点：同步计算样式与实际渲染宽度，并统一为 border-box，避免行宽与换行偏差。
 * 返回被追加到 body 的节点，调用方负责移除。
 */
async function createExactExportNode() {
    const clone = markdownPoster.cloneNode(true);
    clone.id = 'madopic-export-poster';
    const mpComputed = getComputedStyle(markdownPoster);
    Object.assign(clone.style, {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        margin: '0',
        width: `${markdownPoster.getBoundingClientRect().width}px`,
        padding: mpComputed.padding,
        boxSizing: 'border-box',
        background: markdownPoster.style.background || mpComputed.background,
        transform: 'none'
    });

    // 确保页眉中的头像使用绝对路径，避免导出时找不到图片
    const headerAvatar = clone.querySelector('.poster-header .header-avatar');
    if (headerAvatar) {
        headerAvatar.setAttribute('crossorigin', 'anonymous');
    }

    // 移除内部动画/滤镜但不改变布局
    const inner = clone.querySelector('.poster-content');
    if (inner) {
        const pcComputed = getComputedStyle(posterContent);
        inner.style.animation = 'none';
        inner.style.width = `${posterContent.getBoundingClientRect().width}px`;
        inner.style.padding = pcComputed.padding;
        inner.style.boxSizing = 'border-box';
        inner.style.backdropFilter = pcComputed.backdropFilter || 'none';
        inner.style.webkitBackdropFilter = pcComputed.webkitBackdropFilter || 'none';
    }
    // 固定高度模式：小红书 3:4。导出时必须与预览一致，且裁掉超出部分
    if (currentMode === 'xhs') {
        const rect = markdownPoster.getBoundingClientRect();
        const target = Math.round((rect.width / 3) * 4);
        clone.style.height = `${target}px`;
        clone.style.minHeight = `${target}px`;
        clone.style.overflow = 'hidden';

        // 同步内部白卡片最大高度，保留上下紫色 padding 作为边距
        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, target - paddingTop - paddingBottom);
        const inner = clone.querySelector('.poster-content');
        if (inner) {
            inner.style.maxHeight = `${innerMax}px`;
            inner.style.overflow = 'hidden';
        }
    } else if (currentMode === 'pyq') {
        const rect = markdownPoster.getBoundingClientRect();
        const target = Math.round(rect.width * (2796 / 1290));
        clone.style.height = `${target}px`;
        clone.style.minHeight = `${target}px`;
        clone.style.overflow = 'hidden';

        const mpComputed = getComputedStyle(markdownPoster);
        const paddingTop = parseFloat(mpComputed.paddingTop) || 0;
        const paddingBottom = parseFloat(mpComputed.paddingBottom) || 0;
        const innerMax = Math.max(0, target - paddingTop - paddingBottom);
        const inner = clone.querySelector('.poster-content');
        if (inner) {
            inner.style.maxHeight = `${innerMax}px`;
            inner.style.overflow = 'hidden';
        }
    }
    document.body.appendChild(clone);

    // 为导出节点重新渲染数学公式
    const cloneContent = clone.querySelector('.poster-content');
    if (cloneContent) {
        mathRenderer.renderMath(cloneContent);

        // 为导出节点的Mermaid图表生成新的唯一ID，避免与原始预览区冲突
        const mermaidContainers = cloneContent.querySelectorAll('.mermaid-container');
        mermaidContainers.forEach((container, index) => {
            const timestamp = Date.now();
            const newId = `export-mermaid-${timestamp}-${index}`;
            container.setAttribute('data-diagram-id', newId);
        });

        // 为导出节点重新渲染图表
        await diagramRenderer.renderDiagrams(cloneContent);

        // 为导出节点重新渲染ECharts图表
        await echartsRenderer.renderECharts(cloneContent);

        // 为导出节点重新渲染卡片
        await cardRenderer.renderCards(cloneContent);

        // 额外等待确保所有渲染完成
        await new Promise(resolve => setTimeout(resolve, 500));

        // 再等待一帧确保DOM更新完成
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    return clone;
}

/**
 * 确保导出节点中的所有图片都可被 html2canvas 捕获。
 * 做法：为每个 <img> 设置 crossorigin/referrerpolicy，并强制等待加载完毕。
 */
async function prepareImagesForExport(root) {
    const images = Array.from(root.querySelectorAll('img'));
    const loadPromises = images.map((img) => new Promise((resolve) => {
        try {
            // 仅导出阶段设置跨域与防盗链（避免影响预览）
            img.setAttribute('crossorigin', 'anonymous');
            img.setAttribute('referrerpolicy', 'no-referrer');
            // 若已完成加载则直接 resolve
            if (img.complete && img.naturalWidth > 0) return resolve();
            // 监听加载/失败
            const clean = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
            };
            const onLoad = () => { clean(); resolve(); };
            const onError = () => {
                clean();
                // 第一次失败，尝试代理加速/绕过 CORS 防盗链
                tryProxyImage(img).finally(resolve);
            };
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
            // 触发重新加载（给 src 加一个无副作用查询串）。
            // 对 data: 协议不处理；对 blob: 协议尝试转成 dataURL（html2canvas 不抓取跨上下文 blob）
            try {
                if (img.src.startsWith('data:')) {
                    // 已是 dataURL，无需处理
                } else if (img.src.startsWith('blob:')) {
                    // 尝试将 blob 读取为 dataURL
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', img.src, true);
                    xhr.responseType = 'blob';
                    xhr.onload = () => {
                        try {
                            const reader = new FileReader();
                            reader.onload = () => { img.src = reader.result; };
                            reader.onerror = () => { };
                            reader.readAsDataURL(xhr.response);
                        } catch (_) { }
                    };
                    xhr.onerror = () => { };
                    xhr.send();
                } else {
                    const url = new URL(img.src, window.location.href);
                    url.searchParams.set('madopic_cache_bust', Date.now().toString());
                    img.src = url.href;
                }
            } catch (_) {
                // 若 URL 构造失败则忽略
            }
        } catch (_) {
            resolve();
        }
    }));
    await Promise.race([
        Promise.allSettled(loadPromises),
        new Promise((resolve) => setTimeout(resolve, 3000)) // 最多等待 3s，避免卡死
    ]);
}

/**
 * 若图片加载失败，尝试通过公共图片代理服务加载，提升导出命中率。
 * 代理：images.weserv.nl（仅用于 http/https 且跨源情况）。
 */
function tryProxyImage(img) {
    return new Promise((resolve) => {
        try {
            if (img.dataset.madopicProxied === '1') return resolve();
            const original = new URL(img.src, window.location.href);
            // 同源或 data/blob 不代理
            if (original.origin === window.location.origin) return resolve();
            if (original.protocol !== 'http:' && original.protocol !== 'https:') return resolve();

            // 构造代理 URL（去掉协议）
            const hostless = original.href.replace(/^https?:\/\//i, '');
            // 代理默认会设置允许跨域，附带 no-referrer。若原图为 https，确保代理也为 https
            const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(hostless)}&n=-1&output=png`;

            const onLoad = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); resolve(); };
            const cleanup = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
            };

            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
            img.dataset.madopicProxied = '1';
            img.setAttribute('crossorigin', 'anonymous');
            img.setAttribute('referrerpolicy', 'no-referrer');
            img.src = proxied;
        } catch (_) {
            resolve();
        }
    });
}

/**
 * 导出为 PNG（通过克隆节点离屏渲染，保证与预览一致）。
 * 流程：等待字体 → 克隆节点 → 读取尺寸 → html2canvas 渲染 → 透明边缘裁剪 → 触发下载 → 清理。
 */
async function exportToPNG() {
    let exportNode = null;
    try {
        showNotification('正在生成图片...', 'info');

        // 懒加载导出所需的库
        await ensureExportLibsLoaded();

        exportNode = await createExactExportNode();

        // 预处理导出节点中的图片：设置跨域/防盗链属性并强制重新加载，尽量保证可被 html2canvas 捕获
        try {
            await prepareImagesForExport(exportNode);
        } catch (_) {
            // 忽略单个图片处理失败
        }

        // 等待字体与一帧渲染
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) { }
        }
        await new Promise(r => requestAnimationFrame(r));

        const rect = exportNode.getBoundingClientRect();
        const targetWidth = Math.ceil(rect.width);
        const targetHeight = Math.ceil(rect.height);

        // Canvas 尺寸预检查（浏览器限制通常为 32767px）
        const maxCanvasSize = 32767;
        const estimatedHeight = targetHeight * EXPORT_SCALE;
        if (estimatedHeight > maxCanvasSize) {
            showNotification(`内容过长（约${Math.round(estimatedHeight)}px），可能导致导出失败。建议缩短内容或降低导出比例。`, 'warning');
        }

        const tryScales = getExportScaleCandidates(EXPORT_SCALE);
        const canvas = await renderWithFallbackScales(exportNode, targetWidth, targetHeight, tryScales);

        // 尝试裁剪透明边缘，如果因跨域图片导致失败则跳过裁剪
        let trimmedCanvas = null;
        if (currentMode === 'free') {
            try {
                trimmedCanvas = trimTransparentEdges(canvas);
            } catch (error) {
                console.warn('无法裁剪透明边缘（可能包含跨域图片）:', error.message);
            }
        }
        const outputCanvas = trimmedCanvas || canvas;

        // 增强 toDataURL 错误处理
        let dataUrl;
        try {
            dataUrl = outputCanvas.toDataURL('image/png', 1.0);
        } catch (dataUrlError) {
            console.error('toDataURL 失败:', dataUrlError);
            if (dataUrlError.name === 'SecurityError') {
                showNotification('导出失败：图片包含跨域资源，无法导出。请移除外部图片后重试。', 'error');
            } else {
                showNotification('导出失败：无法生成图片数据。请尝试缩短内容。', 'error');
            }
            return;
        }

        const link = document.createElement('a');
        link.download = `mkd2pic-${getFormattedTimestamp()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('图片导出成功！', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        // 提供更具体的错误信息
        let errorMsg = '导出失败，请重试';
        if (error.message) {
            if (error.message.includes('缩放倍数')) {
                errorMsg = '导出失败：内容过大，请缩短内容后重试';
            } else if (error.message.includes('tainted') || error.message.includes('cross-origin')) {
                errorMsg = '导出失败：包含跨域图片，请移除外部图片后重试';
            } else if (error.message.includes('memory') || error.message.includes('heap')) {
                errorMsg = '导出失败：内存不足，请缩短内容或关闭其他页面后重试';
            }
        }
        showNotification(errorMsg, 'error');
    } finally {
        if (exportNode && exportNode.parentNode) {
            exportNode.parentNode.removeChild(exportNode);
        }
    }
}

async function exportToPDF() {
    let exportNode = null;
    try {
        showNotification('正在生成 PDF...', 'info');

        // 懒加载导出所需的库
        await ensureExportLibsLoaded();

        exportNode = await createExactExportNode();

        // 预处理导出节点中的图片
        try {
            await prepareImagesForExport(exportNode);
        } catch (_) {
            // 忽略单个图片处理失败
        }

        // 等待字体与一帧渲染
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (_) { }
        }
        await new Promise(r => requestAnimationFrame(r));

        const rect = exportNode.getBoundingClientRect();
        const targetWidth = Math.ceil(rect.width);
        const targetHeight = Math.ceil(rect.height);

        const tryScales = getExportScaleCandidates(EXPORT_SCALE);
        const canvas = await renderWithFallbackScales(exportNode, targetWidth, targetHeight, tryScales);

        // 尝试裁剪透明边缘，如果因跨域图片导致失败则跳过裁剪
        let trimmedCanvas = null;
        if (currentMode === 'free') {
            try {
                trimmedCanvas = trimTransparentEdges(canvas);
            } catch (error) {
                console.warn('无法裁剪透明边缘（可能包含跨域图片）:', error.message);
            }
        }
        const outputCanvas = trimmedCanvas || canvas;

        // 创建 PDF
        const { jsPDF } = window.jspdf;

        const canvasWidth = outputCanvas.width;
        const canvasHeight = outputCanvas.height;

        // 计算 PDF 页面尺寸（毫米）
        // 默认使用 A4 纸张，但根据内容比例调整
        const A4_WIDTH_MM = 210;
        const A4_HEIGHT_MM = 297;
        const aspectRatio = canvasWidth / canvasHeight;

        let pdfWidth, pdfHeight, orientation;

        if (aspectRatio > 1) {
            orientation = 'landscape';
            pdfWidth = A4_HEIGHT_MM;
            pdfHeight = A4_WIDTH_MM;

            if (aspectRatio > pdfWidth / pdfHeight) {
                pdfHeight = pdfWidth / aspectRatio;
            }
        } else {
            orientation = 'portrait';
            pdfWidth = A4_WIDTH_MM;
            pdfHeight = A4_HEIGHT_MM;

            if (aspectRatio < pdfWidth / pdfHeight) {
                pdfWidth = pdfHeight * aspectRatio;
            }
        }

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: [pdfWidth, pdfHeight],
            compress: false
        });

        // 增强 toDataURL 错误处理
        let imgData;
        try {
            imgData = outputCanvas.toDataURL('image/png', 1.0);
        } catch (dataUrlError) {
            console.error('toDataURL 失败:', dataUrlError);
            if (dataUrlError.name === 'SecurityError') {
                showNotification('PDF 导出失败：图片包含跨域资源。请移除外部图片后重试。', 'error');
            } else {
                showNotification('PDF 导出失败：无法生成图片数据。', 'error');
            }
            return;
        }

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

        pdf.save(`mkd2pic-${getFormattedTimestamp()}.pdf`);

        showNotification('PDF 导出成功！', 'success');
    } catch (error) {
        console.error('PDF 导出失败:', error);
        let errorMsg = 'PDF 导出失败，请重试';
        if (error.message) {
            if (error.message.includes('缩放倍数')) {
                errorMsg = 'PDF 导出失败：内容过大，请缩短内容后重试';
            } else if (error.message.includes('tainted') || error.message.includes('cross-origin')) {
                errorMsg = 'PDF 导出失败：包含跨域图片，请移除外部图片后重试';
            }
        }
        showNotification(errorMsg, 'error');
    } finally {
        if (exportNode && exportNode.parentNode) {
            exportNode.parentNode.removeChild(exportNode);
        }
    }
}

// 导出为独立可打开的 HTML 文件
async function exportToHTML() {
    let exportNode = null;
    try {
        showNotification('正在生成 HTML...', 'info');

        // 并行拉取需要内联的样式
        const cssFetchPromise = Promise.all([
            fetchCssBySelector('link[href*="style.css"]'),
            fetchCssBySelector('link[rel="stylesheet"][href*="katex"]')
        ]);

        // 克隆并渲染离屏节点
        exportNode = await createExactExportNode();

        // 将 ECharts 图表替换为静态图片，确保离线可见
        await replaceEChartsWithImages(exportNode);

        // 收集样式（尽量内联，失败时保留外链兜底）
        const [localCss, katexCss] = await cssFetchPromise;

        // 组装完整 HTML
        const html = buildStandaloneHTML(exportNode, { localCss, katexCss });

        // 触发下载
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mkd2pic-${getFormattedTimestamp()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('HTML 导出成功！', 'success');
    } catch (error) {
        console.error('HTML 导出失败:', error);
        showNotification('HTML 导出失败，请重试', 'error');
    } finally {
        if (exportNode && exportNode.parentNode) {
            exportNode.parentNode.removeChild(exportNode);
        }
    }
}

// 根据 <link> 选择器抓取 CSS 内容
async function fetchCssBySelector(selector) {
    try {
        const link = document.querySelector(selector);
        if (!link || !link.href) return { inline: '', href: '' };
        const href = link.href;
        const css = await fetchTextSafe(href);
        return { inline: css || '', href };
    } catch (_) {
        return { inline: '', href: '' };
    }
}

// 安全获取文本，失败返回空字符串
async function fetchTextSafe(url) {
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return '';
        return await res.text();
    } catch (_) {
        return '';
    }
}

// 将克隆节点中的 ECharts 图表替换为 <img>（使用实例导出的 dataURL）
async function replaceEChartsWithImages(root) {
    const containers = root.querySelectorAll('.echarts-container');
    for (const container of containers) {
        try {
            // chartContainer 是我们在渲染时创建的内部 div，实例挂在其属性上
            const chartContainer = container.querySelector('div[id^="echarts-"]');
            let dataUrl = '';
            if (chartContainer && chartContainer._echartsInstance && typeof chartContainer._echartsInstance.getDataURL === 'function') {
                dataUrl = chartContainer._echartsInstance.getDataURL({ type: 'png', pixelRatio: 1, backgroundColor: '#ffffff' });
            } else {
                // 兜底：合并所有 canvas 层
                const canvases = container.querySelectorAll('canvas');
                if (canvases.length > 0) {
                    const base = canvases[0];
                    const temp = document.createElement('canvas');
                    temp.width = base.width;
                    temp.height = base.height;
                    const tctx = temp.getContext('2d');
                    canvases.forEach(c => {
                        try { tctx.drawImage(c, 0, 0); } catch (_) { }
                    });
                    dataUrl = temp.toDataURL('image/png');
                }
            }

            if (dataUrl) {
                const img = new Image();
                img.src = dataUrl;
                img.style.width = '100%';
                img.style.height = 'auto';
                // 用静态图替换整个容器内容
                container.innerHTML = '';
                container.appendChild(img);
            }
        } catch (_) {
            // 忽略单个失败，继续处理其他图表
        }
    }
}

// 构建可独立打开的 HTML 文本
function buildStandaloneHTML(exportNode, parts) {
    const { localCss, katexCss } = parts || {};
    const title = document.title || 'Madopic Export';

    // 处理样式注入策略：优先内联，失败时保留外链
    const cssBlocks = [];
    if (localCss && localCss.inline) {
        cssBlocks.push(`<style>\n${localCss.inline}\n</style>`);
    } else if (localCss && localCss.href) {
        cssBlocks.push(`<link rel="stylesheet" href="${localCss.href}">`);
    }

    if (katexCss && katexCss.inline) {
        cssBlocks.push(`<style>\n${katexCss.inline}\n</style>`);
    } else if (katexCss && katexCss.href) {
        cssBlocks.push(`<link rel="stylesheet" href="${katexCss.href}">`);
    }

    // 为导出页添加极简 reset，并强制覆盖离屏/滚动样式，确保可见与可滚动
    cssBlocks.push(`<style>\nhtml,body{margin:0;padding:0;background:#f3f4f6;}\nbody{overflow-y:auto !important;overflow-x:hidden;}\n#madopic-export-poster{position:relative !important;top:auto !important;left:auto !important;margin:40px auto !important;display:block !important;transform:none !important;height:auto !important;min-height:0 !important;overflow:visible !important;}\n#madopic-export-poster .poster-content{max-height:none !important;overflow:visible !important;}\n</style>`);

    const head = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${escapeHtml(title)}</title>\n${cssBlocks.join('\n')}\n</head>`;

    // 克隆节点，清理离屏相关 inline 样式
    const node = exportNode.cloneNode(true);
    try {
        node.style.position = '';
        node.style.top = '';
        node.style.left = '';
        node.style.margin = '40px auto';
        node.style.display = 'block';
        node.style.transform = '';
        // 若为固定比例模式（xhs/pyq），取消导出 HTML 的裁剪，保留完整内容
        node.style.height = '';
        node.style.minHeight = '';
        node.style.overflow = 'visible';
        const innerForHtml = node.querySelector('.poster-content');
        if (innerForHtml) {
            innerForHtml.style.maxHeight = '';
            innerForHtml.style.overflow = 'visible';
        }
    } catch (_) { }

    // 仅导出卡片区域，无需运行任何脚本
    const body = `<body>\n${node.outerHTML}\n</body>\n</html>`;

    return `${head}\n${body}`;
}

function escapeHtml(str) {
    try {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    } catch (_) {
        return '' + str;
    }
}

/**
 * 生成按优先级降序的导出 scale 备选列表。
 * 例如：首选 s，然后尝试 2、1.5、1.25、1。
 */
function getExportScaleCandidates(preferred) {
    const candidates = [preferred, 2, 1.5, 1.25, 1];
    const unique = [];
    for (const s of candidates) {
        if (Number.isFinite(s) && s > 0 && !unique.includes(s)) unique.push(s);
    }
    return unique.sort((a, b) => b - a);
}

/**
 * 尝试按多个缩放倍数依次渲染，直到成功为止。
 */
async function renderWithFallbackScales(node, targetWidth, targetHeight, scales) {
    let lastError = null;
    for (const scale of scales) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const canvas = await html2canvas(node, {
                backgroundColor: null,
                scale,
                useCORS: true,
                allowTaint: false, // 改为 false，避免 canvas 被污染导致 toDataURL() 失败
                logging: false,
                width: targetWidth,
                height: targetHeight,
                windowWidth: targetWidth,
                windowHeight: targetHeight,
                scrollX: 0,
                scrollY: 0,
                imageTimeout: 5000,
                onclone: function (clonedDoc) {
                    // 兼容单图和多图导出的节点 ID
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
                    // 再次为克隆文档内的图片设置跨域/防盗链属性（双保险）
                    try {
                        clonedDoc.querySelectorAll('img').forEach((img) => {
                            if (!img.getAttribute('crossorigin')) img.setAttribute('crossorigin', 'anonymous');
                            if (!img.getAttribute('referrerpolicy')) img.setAttribute('referrerpolicy', 'no-referrer');
                            if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'sync');
                            if (!img.getAttribute('loading')) img.setAttribute('loading', 'eager');
                        });
                    } catch (_) { }

                    // 特殊处理KaTeX数学公式元素
                    try {
                        const katexElements = clonedDoc.querySelectorAll('.katex, .katex-display, .katex-mathml');
                        katexElements.forEach(el => {
                            // 确保KaTeX元素的样式被正确保留
                            el.style.setProperty('font-family', 'KaTeX_Main, "Times New Roman", serif', 'important');
                            if (el.classList.contains('katex-display')) {
                                el.style.setProperty('display', 'block', 'important');
                                el.style.setProperty('text-align', 'center', 'important');
                            }
                        });
                    } catch (_) { }

                    // 特殊处理Mermaid图表SVG
                    try {
                        const mermaidSvgs = clonedDoc.querySelectorAll('.mermaid svg');
                        mermaidSvgs.forEach(svg => {
                            // 确保SVG有明确的尺寸和样式
                            if (!svg.getAttribute('width') && svg.getBoundingClientRect) {
                                const rect = svg.getBoundingClientRect();
                                if (rect.width > 0) svg.setAttribute('width', rect.width);
                                if (rect.height > 0) svg.setAttribute('height', rect.height);
                            }
                            svg.style.setProperty('display', 'block', 'important');
                            svg.style.setProperty('max-width', '100%', 'important');
                        });
                    } catch (_) { }

                    clonedDoc.documentElement.style.setProperty('overflow', 'hidden', 'important');
                    clonedDoc.body.style.setProperty('margin', '0', 'important');
                    clonedDoc.body.style.setProperty('padding', '0', 'important');
                }
            });
            if (scale !== scales[0]) {
                showNotification(`显存不足，已自动降至 ${Math.round(scale * 100)}% 清晰度导出`, 'warning');
            }
            return canvas;
        } catch (err) {
            lastError = err;
            // 继续尝试下一个较低的 scale
        }
    }
    throw lastError || new Error('所有缩放倍数均导出失败');
}

// ===== 通知系统 =====
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    // 添加样式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        background: getNotificationColor(type),
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        fontSize: '14px',
        fontWeight: '500'
    });

    // 如果存在缩放工具栏，则将通知定位到百分比（缩放工具栏）下方
    try {
        const anchor = document.querySelector('.preview-tools') || document.querySelector('.zoom-level');
        if (anchor && typeof anchor.getBoundingClientRect === 'function') {
            const rect = anchor.getBoundingClientRect();
            // fixed 定位采用视口坐标，直接使用 rect.bottom 即可
            const computedTop = Math.max(rect.bottom + 10, 10);
            notification.style.top = `${Math.round(computedTop)}px`;
        } else {
            // 略微下移默认位置，避免遮挡顶部工具栏
            notification.style.top = '120px';
        }
    } catch (e) {
        // 发生异常时退回到略低的默认位置
        notification.style.top = '120px';
    }

    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    document.body.appendChild(notification);

    // 动画显示
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // 自动隐藏
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    return colors[type] || colors.info;
}

// ===== 键盘快捷键 =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    handleToolbarAction('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    handleToolbarAction('italic');
                    break;
                case 's':
                    e.preventDefault();
                    exportToPNG();
                    break;
                case '=':
                case '+':
                    e.preventDefault();
                    zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    zoomOut();
                    break;
            }
        }

        // ESC 键关闭面板
        if (e.key === 'Escape') {
            closeSettingsSidebar();
            closeMultiPreview();
        }
    });
}

// ===== 错误处理 =====
window.addEventListener('error', function (e) {
    console.error('应用错误:', e.error);
    showNotification('应用出现错误，请刷新页面重试', 'error');
});

// 页面可见性改变时优化性能
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        // 页面隐藏时暂停某些操作
    } else {
        // 页面可见时仅在内容确实变化时才重渲染（避免无条件全量渲染）
        const currentText = markdownInput?.value?.trim() || '';
        const processed = currentText ? mathRenderer.preprocessMath(currentText) : '';
        if (processed && processed !== lastRenderedMarkdown) {
            updatePreview();
        }
    }
});

// 添加一些实用的格式化快捷方法
const MarkdownHelper = {
    // 插入表格
    insertTable: function (rows = 3, cols = 3) {
        const textarea = markdownInput;
        let table = '\n| ';

        // 表头
        for (let i = 0; i < cols; i++) {
            table += `列${i + 1} | `;
        }
        table += '\n| ';

        // 分隔线
        for (let i = 0; i < cols; i++) {
            table += '--- | ';
        }
        table += '\n';

        // 数据行
        for (let row = 0; row < rows - 1; row++) {
            table += '| ';
            for (let col = 0; col < cols; col++) {
                table += '数据 | ';
            }
            table += '\n';
        }

        const cursorPos = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, cursorPos);
        const afterText = textarea.value.substring(cursorPos);

        textarea.value = beforeText + table + afterText;
        textarea.setSelectionRange(cursorPos + table.length, cursorPos + table.length);
        updatePreview();
    },

    // 插入代码块
    insertCodeBlock: function (language = '') {
        const textarea = markdownInput;
        const codeBlock = `\n\`\`\`${language}\n// 在这里输入代码\nconsole.log('Hello World!');\n\`\`\`\n`;

        const cursorPos = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, cursorPos);
        const afterText = textarea.value.substring(cursorPos);

        textarea.value = beforeText + codeBlock + afterText;
        textarea.setSelectionRange(cursorPos + 4 + language.length, cursorPos + 4 + language.length);
        updatePreview();
    },

    // 通用的插入方法
    insertAtCursor: function (text) {
        const textarea = markdownInput;
        const cursorPos = textarea.selectionStart;
        const beforeText = textarea.value.substring(0, cursorPos);
        const afterText = textarea.value.substring(cursorPos);

        textarea.value = beforeText + text + afterText;
        textarea.setSelectionRange(cursorPos + text.length, cursorPos + text.length);
        textarea.focus();
        updatePreview();
    },

    // 插入质能守恒公式
    insertEinsteinFormula: function () {
        const formula = `

## 质能守恒定律

$$E = mc^{2}$$

其中：
- $E$ 表示能量
- $m$ 表示质量  
- $c$ 表示光速

`;
        this.insertAtCursor(formula);
    },

    // 插入数学公式模板
    insertMathFormulas: function () {
        const formulas = `

## 常用数学公式

### 代数
**二次公式：** $x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}$

**因式分解：** $a^{2} - b^{2} = (a+b)(a-b)$

### 微积分
**导数定义：** $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$

**基本积分：** $\\int_a^b f(x)dx = F(b) - F(a)$

### 三角函数
**勾股定理：** $a^{2} + b^{2} = c^{2}$

**正弦定理：** $\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$

### 统计学
**均值：** $\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i$

**方差：** $\\sigma^{2} = \\frac{1}{n}\\sum_{i=1}^{n} (x_i - \\bar{x})^{2}$

`;
        this.insertAtCursor(formulas);
    },

    // 插入物理公式模板
    insertPhysicsFormulas: function () {
        const formulas = `

## 物理公式集合

### 经典力学
**牛顿第二定律：** $F = ma$

**万有引力定律：** $F = G\\frac{m_1 m_2}{r^{2}}$

**动能：** $E_k = \\frac{1}{2}mv^{2}$

**势能：** $E_p = mgh$

### 电磁学
**库仑定律：** $F = k\\frac{q_1 q_2}{r^{2}}$

**欧姆定律：** $V = IR$

**电功率：** $P = VI = I^{2}R = \\frac{V^{2}}{R}$

### 现代物理
**质能关系：** $E = mc^{2}$

**德布罗意波长：** $\\lambda = \\frac{h}{p}$

**海森堡不确定性原理：** $\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}$

`;
        this.insertAtCursor(formulas);
    },

    // 插入化学公式模板
    insertChemistryFormulas: function () {
        const formulas = `

## 化学公式集合

### 基本化学反应
**燃烧反应：** $\\ce{CH4 + 2O2 -> CO2 + 2H2O}$

**酸碱中和：** $\\ce{HCl + NaOH -> NaCl + H2O}$

**氧化还原：** $\\ce{2Na + Cl2 -> 2NaCl}$

### 有机化学
**甲烷：** $\\ce{CH4}$

**乙醇：** $\\ce{C2H5OH}$

**葡萄糖：** $\\ce{C6H12O6}$

### 化学平衡
**平衡常数：** $K_c = \\frac{[C]^c[D]^d}{[A]^a[B]^b}$

**pH定义：** $pH = -\\log[H^+]$

### 理想气体
**理想气体定律：** $PV = nRT$

`;
        this.insertAtCursor(formulas);
    },

    // 插入流程图
    insertFlowchart: function () {
        const flowchart = `
\`\`\`mermaid
flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作]
    B -->|否| D[其他操作]
    C --> E[结束]
    D --> E
\`\`\`
`;
        this.insertAtCursor(flowchart);
    },

    // 插入序列图
    insertSequenceDiagram: function () {
        const sequenceDiagram = `
\`\`\`mermaid
sequenceDiagram
    participant A as 用户
    participant B as 系统
    A->>B: 发送请求
    B-->>A: 返回响应
    A->>B: 确认收到
\`\`\`
`;
        this.insertAtCursor(sequenceDiagram);
    },

    // 插入甘特图
    insertGanttChart: function () {
        const ganttChart = `
\`\`\`mermaid
gantt
    title 项目进度计划
    dateFormat  YYYY-MM-DD
    section 阶段一
    任务1           :a1, 2024-01-01, 30d
    任务2           :after a1, 20d
    section 阶段二
    任务3           :2024-02-01, 25d
    任务4           :20d
\`\`\`
`;
        this.insertAtCursor(ganttChart);
    },

    // 插入饼图
    insertPieChart: function () {
        const pieChart = `
\`\`\`mermaid
pie title 数据分布
    "类别A" : 42.96
    "类别B" : 50.05
    "类别C" : 10.01
    "其他" : 5
\`\`\`
`;
        this.insertAtCursor(pieChart);
    },

    // 插入卡片
    insertCard: function () {
        const cardTemplate = `

:::card
**卡片标题**

这是一个精美的卡片内容区域。你可以在这里添加：

- 重要信息
- 产品特色
- 使用说明
- 任何想要突出显示的内容

支持 **粗体**、*斜体*、\`代码\` 和 [链接](https://example.com) 等格式。
:::

**不同类型的卡片示例：**

:::card info
**信息卡片**

这是一个信息类型的卡片，适合展示提示信息。
:::

:::card success
**成功卡片**

这是一个成功类型的卡片，适合展示成功状态。
:::

:::card warning
**警告卡片**

这是一个警告类型的卡片，适合展示注意事项。
:::

:::card error
**错误卡片**

这是一个错误类型的卡片，适合展示错误信息。
:::

`;
        this.insertAtCursor(cardTemplate);
    },

    // 插入ECharts图表模板
    insertEChartsTemplate: function () {
        const echartsTemplate = `

## ECharts 图表示例

### 饼图
\`\`\`echarts
{
  "title": {
    "text": "访问来源统计",
    "left": "center"
  },
  "tooltip": {
    "trigger": "item",
    "formatter": "{a} <br/>{b} : {c} ({d}%)"
  },
  "legend": {
    "orient": "vertical",
    "left": "left",
    "data": ["搜索引擎", "直接访问", "推荐", "其他", "社交平台"]
  },
  "series": [{
    "name": "访问来源",
    "type": "pie",
    "radius": "55%",
    "center": ["50%", "60%"],
    "data": [
      {"value": 10440, "name": "搜索引擎"},
      {"value": 4770, "name": "直接访问"},
      {"value": 2430, "name": "推荐"},
      {"value": 342, "name": "其他"},
      {"value": 18, "name": "社交平台"}
    ]
  }]
}
\`\`\`

### 柱状图
\`\`\`echarts
{
  "title": {
    "text": "月度销售数据",
    "left": "center"
  },
  "tooltip": {
    "trigger": "axis"
  },
  "xAxis": {
    "type": "category",
    "data": ["1月", "2月", "3月", "4月", "5月", "6月"]
  },
  "yAxis": {
    "type": "value"
  },
  "series": [{
    "name": "销售额",
    "type": "bar",
    "data": [120, 200, 150, 80, 70, 110],
    "itemStyle": {
      "color": "#5470c6"
    }
  }]
}
\`\`\`

`;
        this.insertAtCursor(echartsTemplate);
    }
};

// 图片处理相关函数
function insertImage() {
    const imageInput = document.getElementById('imageInput');
    imageInput.click();
}

function setupImageHandlers() {
    const imageInput = document.getElementById('imageInput');

    // 文件选择处理
    imageInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
        // 清空输入，允许选择同一文件
        e.target.value = '';
    });

    // 剪贴板粘贴图片处理
    markdownInput.addEventListener('paste', function (e) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    handleImageFile(file);
                }
                break;
            }
        }
    });
}

function handleImageFile(file) {
    showNotification('正在处理图片...', 'info');

    convertImageToBase64(file)
        .then(base64 => {
            insertImageIntoMarkdown(base64, file.name);
            showNotification('图片插入成功！', 'success');
        })
        .catch(error => {
            console.error('图片处理失败:', error);
            showNotification('图片处理失败，请重试', 'error');
        });
}

function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            resolve(e.target.result);
        };
        reader.onerror = function (error) {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

function insertImageIntoMarkdown(base64, filename) {
    const textarea = markdownInput;
    const cursorPos = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, cursorPos);
    const afterText = textarea.value.substring(cursorPos);

    // 创建简化的图片Markdown语法用于显示（截断base64）
    const base64Header = base64.split(',')[0] + ','; // 保留data:image/xxx;base64,部分
    const base64Data = base64.split(',')[1]; // 获取实际的base64数据
    const shortBase64 = base64Header + base64Data.substring(0, 50) + '...'; // 只显示前50个字符

    const imageMarkdown = `\n![${filename}](${shortBase64})\n`;

    // 存储完整的图片数据供预览和导出使用
    storeImageData(shortBase64, base64);

    // 插入到光标位置
    textarea.value = beforeText + imageMarkdown + afterText;
    textarea.setSelectionRange(cursorPos + imageMarkdown.length, cursorPos + imageMarkdown.length);
    textarea.focus();
    updatePreview();
}

// 存储图片数据映射
function storeImageData(shortBase64, fullBase64) {
    imageDataStore.set(shortBase64, fullBase64);
}

// 替换预览中的简化base64为完整base64
function replaceImageDataForPreview(content) {
    let result = content;
    imageDataStore.forEach((fullBase64, shortBase64) => {
        result = result.replace(new RegExp(escapeRegExp(shortBase64), 'g'), fullBase64);
    });
    return result;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 生成格式化的时间戳字符串 (YYYYMMDDHHMMSS)
function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// 获取当前配置（便于调试与外部接入）
function getCurrentMadopicConfig() {
    return {
        width: currentWidth,
        padding: currentPadding,
        fontSize: currentFontSize,
        background: markdownPoster.style.background,
        exportScale: EXPORT_SCALE
    };
}

// ===== 多图分割导出 =====

/**
 * 将 Markdown 文本按「内容块」分割，保证图片、mermaid、echarts、代码块、卡片的完整性。
 * 返回 Markdown 片段数组。
 *
 * 分割策略：
 * 1. 先将 Markdown 拆为「原子块」（不可再分的最小单元）
 *    - 围栏代码块（```...```）—— 包含 mermaid / echarts
 *    - 卡片块（:::card...:::）
 *    - 标题行（# / ## / ###...）
 *    - 图片行（![...](...) 独占一行时）
 *    - 普通段落（以空行为界）
 * 2. 逐块累加，当渲染高度将超过目标页高时，在上一个块结束处切割
 * 3. 每一页都是完整的 Markdown，独立渲染为图片
 */

/**
 * 将 Markdown 文本拆为原子块数组
 */
function splitMarkdownIntoAtomicBlocks(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];
    let current = [];
    let inFencedBlock = false;
    let fenceType = ''; // 'code' | 'card'

    function flushCurrent() {
        if (current.length > 0) {
            const text = current.join('\n').trim();
            if (text) {
                blocks.push(text);
            }
            current = [];
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 检测围栏代码块开始/结束（```mermaid, ```echarts, ```xxx）
        if (trimmed.startsWith('```') && !inFencedBlock) {
            flushCurrent();
            inFencedBlock = true;
            fenceType = 'code';
            current.push(line);
            continue;
        }

        if (trimmed === '```' && inFencedBlock && fenceType === 'code') {
            current.push(line);
            flushCurrent();
            inFencedBlock = false;
            fenceType = '';
            continue;
        }

        // 检测卡片块开始（:::card）
        if (trimmed.startsWith(':::card') && !inFencedBlock) {
            flushCurrent();
            inFencedBlock = true;
            fenceType = 'card';
            current.push(line);
            continue;
        }

        // 检测卡片块结束（:::）
        if (trimmed === ':::' && inFencedBlock && fenceType === 'card') {
            current.push(line);
            flushCurrent();
            inFencedBlock = false;
            fenceType = '';
            continue;
        }

        // 在围栏块内，所有行归入当前块
        if (inFencedBlock) {
            current.push(line);
            continue;
        }

        // 标题行：独立为一块（但和紧跟其后的内容合在一起）
        if (/^#{1,6}\s/.test(trimmed)) {
            flushCurrent();
            current.push(line);
            continue;
        }

        // 独占一行的图片：![...](...) 
        if (/^!\[.*\]\(.*\)\s*$/.test(trimmed)) {
            flushCurrent();
            blocks.push(line.trim());
            continue;
        }

        // 空行：段落分隔
        if (trimmed === '') {
            // 如果当前块不为空，结束当前块
            if (current.length > 0 && current.some(l => l.trim() !== '')) {
                flushCurrent();
            }
            continue;
        }

        // 普通行
        current.push(line);
    }

    // 处理末尾未闭合的块
    flushCurrent();

    return blocks;
}

/**
 * 测量一段 Markdown 渲染后的实际高度（像素）。
 * 【性能优化】使用缓存避免重复测量相同内容。
 */

// 测量高度缓存：key = markdown + containerWidth + padding + fontSize, value = height
const _measureHeightCache = new Map();
const _MEASURE_CACHE_MAX = 500;

async function measureMarkdownHeight(markdownText, containerWidth, padding, fontSize) {
    // 缓存查找
    const cacheKey = `${containerWidth}|${padding}|${fontSize}|${markdownText}`;
    if (_measureHeightCache.has(cacheKey)) {
        return _measureHeightCache.get(cacheKey);
    }

    // 创建测量容器
    // 【关键修复】测量单个 block 时不应包含 padding，否则每个 block 都会虚增 96px（上下各48px），
    // 导致分页严重过度（如 144 行文章被分成 20 页）。
    // padding 对高度的影响已在 splitMarkdownIntoPages 的 availableHeight 计算中通过
    // posterPaddingTop/posterPaddingBottom 扣除。
    const measure = document.createElement('div');
    measure.style.cssText = `
        position: fixed; top: -99999px; left: -99999px;
        width: ${containerWidth}px; box-sizing: border-box;
        padding: 0;
        font-size: ${fontSize}px;
        visibility: hidden;
    `;
    // 复用 poster-content 的 class 以获取一致样式（字体、行高、margin 等）
    measure.className = 'poster-content';
    measure.style.minHeight = '0';
    measure.style.animation = 'none';
    // 显式设置 padding 为 0，覆盖 CSS class 中的 padding: 48px
    // 因为我们只想测量纯内容高度，padding 在分页逻辑中单独处理
    measure.style.padding = '0';
    // 【关键修复】同步 CSS 变量到测量容器，否则 .poster-content p/h1/h2 等
    // 会 fallback 到 CSS 中的默认值（16px/28px/22px），导致测量字号偏小，分页后内容溢出。
    // 实际渲染时这些变量由 applyFontSize() 设置在 posterContent 上。
    measure.style.setProperty('--dynamic-font-size', `${fontSize}px`);
    measure.style.setProperty('--dynamic-h1-size', `${Math.round(fontSize * 1.75)}px`);
    measure.style.setProperty('--dynamic-h2-size', `${Math.round(fontSize * 1.375)}px`);
    measure.style.setProperty('--dynamic-h3-size', `${Math.round(fontSize * 1.125)}px`);
    measure.style.setProperty('--dynamic-h4-size', `${Math.round(fontSize * 1.05)}px`);
    measure.style.setProperty('--dynamic-h5-h6-size', `${Math.round(fontSize * 0.95)}px`);

    document.body.appendChild(measure);

    // 预处理 + 渲染
    let processed = mathRenderer.preprocessMath(markdownText);
    processed = diagramRenderer.preprocessDiagram(processed);
    processed = echartsRenderer.preprocessECharts(processed);
    processed = cardRenderer.preprocessCards(processed);
    processed = replaceImageDataForPreview(processed);

    let html = '';
    try {
        html = marked.parse(processed);
        html = sanitizeHTML(html);
    } catch (e) {
        html = `<p>${markdownText}</p>`;
    }
    measure.innerHTML = html;

    // 渲染特殊元素
    mathRenderer.renderMath(measure);
    await diagramRenderer.renderDiagrams(measure);
    await echartsRenderer.renderECharts(measure);
    await cardRenderer.renderCards(measure);

    if (typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(measure);
    }

    // 等待图片加载
    const imgs = measure.querySelectorAll('img');
    if (imgs.length > 0) {
        await Promise.race([
            Promise.allSettled(Array.from(imgs).map(img =>
                new Promise(resolve => {
                    if (img.complete) return resolve();
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            )),
            new Promise(r => setTimeout(r, 2000))
        ]);
    }

    // 等一帧确保布局完成
    await new Promise(r => requestAnimationFrame(r));

    const height = measure.scrollHeight;

    // 清理 ECharts 实例
    echartsRenderer.destroyAll(measure);
    document.body.removeChild(measure);

    // 存入缓存（LRU 简易版：超限清空）
    if (_measureHeightCache.size >= _MEASURE_CACHE_MAX) {
        _measureHeightCache.clear();
    }
    _measureHeightCache.set(cacheKey, height);

    return height;
}

/**
 * 智能分割 Markdown 为多页。
 * 每页的渲染高度不超过 maxPageHeight（像素）。
 * 页眉高度会额外预留。
 *
 * 【性能优化】使用增量高度估算 + 单 block 测量，而非累积内容重测量。
 * 旧算法：每添加一个 block → 测量 currentPage + newBlock 的累积高度 → O(N) 次全量测量
 * 新算法：每个 block 只测量一次自身高度 → 按高度累加分页 → 翻页时校准一次
 */

// 分页结果缓存，供导出复用（避免重复计算）
let _cachedPageSplitResult = null; // { key, pages }

async function splitMarkdownIntoPages(markdown, maxPageHeight, containerWidth, padding, fontSize) {
    // 检查缓存
    const cacheKey = `${markdown.length}|${maxPageHeight}|${containerWidth}|${padding}|${fontSize}|${markdown.slice(0, 100)}|${markdown.slice(-100)}`;
    if (_cachedPageSplitResult && _cachedPageSplitResult.key === cacheKey) {
        return _cachedPageSplitResult.pages;
    }

    const blocks = splitMarkdownIntoAtomicBlocks(markdown);
    if (blocks.length === 0) return [markdown];

    // 从配置计算页眉高度
    const hCfg = MadopicConfig.header;
    const headerHeight = hCfg.enabled ? (36 + hCfg.paddingTop + hCfg.paddingBottom) : 0;
    // 从配置计算页脚高度
    const fCfg = MadopicConfig.footer;
    const footerHeight = fCfg.enabled ? (fCfg.fontSize + 4 + fCfg.paddingTop + fCfg.paddingBottom) : 0;

    // 【关键修复】内容区 padding 从 .poster-content（posterContent）读取，
    // 而非 .markdown-poster（markdownPoster），因为 48px padding 定义在 poster-content 上。
    // 测量 block 高度时 padding=0（只测纯内容高度），所以这里必须从 availableHeight 中扣除内容区 padding。
    const pcComputed = getComputedStyle(posterContent);
    const contentPaddingTop = parseFloat(pcComputed.paddingTop) || 0;
    const contentPaddingBottom = parseFloat(pcComputed.paddingBottom) || 0;

    // 安全边距
    const safetyMargin = 8;
    const availableHeight = maxPageHeight - contentPaddingTop - contentPaddingBottom - headerHeight - footerHeight - safetyMargin;

    // 测量容器宽度：扣除内容区左右 padding，确保与实际渲染宽度一致
    const contentPaddingLeft = parseFloat(pcComputed.paddingLeft) || 0;
    const contentPaddingRight = parseFloat(pcComputed.paddingRight) || 0;
    const measureWidth = containerWidth - contentPaddingLeft - contentPaddingRight;

    // 段落间距估算值（两个 block 之间 margin 合并后的典型高度）
    const blockGap = 16;

    // 阶段一：测量每个 block 的独立高度（每个 block 只测一次）
    const blockHeights = [];
    for (let i = 0; i < blocks.length; i++) {
        const h = await measureMarkdownHeight(blocks[i], measureWidth, padding, fontSize);
        blockHeights.push(h);
    }

    // 阶段二：按高度累加分页
    const pages = [];
    let currentPageBlocks = [];
    let currentHeight = 0;

    for (let i = 0; i < blocks.length; i++) {
        const gap = currentPageBlocks.length > 0 ? blockGap : 0;
        const newHeight = currentHeight + gap + blockHeights[i];

        if (newHeight > availableHeight && currentPageBlocks.length > 0) {
            // 当前页已满，保存并开始新页
            pages.push(currentPageBlocks.join('\n\n'));
            currentPageBlocks = [blocks[i]];
            currentHeight = blockHeights[i];
        } else {
            currentPageBlocks.push(blocks[i]);
            currentHeight = newHeight;
        }
    }

    // 最后一页
    if (currentPageBlocks.length > 0) {
        pages.push(currentPageBlocks.join('\n\n'));
    }

    // 阶段三：校准 — 对每页实际整页测量，确保不溢出
    // 【改进】重切分时使用整页测量而非 blockGap 估算，彻底消除 margin 差异导致的溢出
    const finalPages = [];
    let carry = ''; // 上一页溢出的内容

    for (let i = 0; i < pages.length; i++) {
        const pageContent = carry ? carry + '\n\n' + pages[i] : pages[i];
        carry = '';

        const actualHeight = await measureMarkdownHeight(pageContent, measureWidth, padding, fontSize);

        if (actualHeight <= availableHeight + safetyMargin) {
            finalPages.push(pageContent);
        } else {
            // 页面溢出 — 逐 block 重新切分，每次添加 block 后整页测量验证
            const pageBlocks = splitMarkdownIntoAtomicBlocks(pageContent);
            let fitBlocks = [];

            for (let j = 0; j < pageBlocks.length; j++) {
                // 尝试将当前 block 加入
                const candidateBlocks = [...fitBlocks, pageBlocks[j]];
                const candidateContent = candidateBlocks.join('\n\n');
                const candidateHeight = await measureMarkdownHeight(candidateContent, measureWidth, padding, fontSize);

                if (candidateHeight > availableHeight && fitBlocks.length > 0) {
                    // 加入后溢出 — 保存当前页，当前 block 开始新的切分
                    finalPages.push(fitBlocks.join('\n\n'));
                    fitBlocks = [pageBlocks[j]];
                } else {
                    fitBlocks.push(pageBlocks[j]);
                }
            }

            if (fitBlocks.length > 0) {
                // 剩余的 block 进入下一页的 carry
                if (i < pages.length - 1) {
                    carry = fitBlocks.join('\n\n');
                } else {
                    finalPages.push(fitBlocks.join('\n\n'));
                }
            }
        }
    }

    // 处理最后的 carry
    if (carry) {
        finalPages.push(carry);
    }

    const result = finalPages.length > 0 ? finalPages : [markdown];

    // 缓存分页结果
    _cachedPageSplitResult = { key: cacheKey, pages: result };

    return result;
}

/**
 * 创建封面页的导出节点。
 * 封面页结构：poster（背景）> header（可选）> cover-content（标题+副标题）> footer（可选）
 * 设计决策：封面页不参与 Markdown 内容渲染，只显示用户配置的标题文案和视觉效果。
 */
async function createCoverExportNode(pageHeight) {
    const coverCfg = MadopicConfig.cover;
    const hCfg = MadopicConfig.header;
    const fCfg = MadopicConfig.footer;
    const bgCfg = MadopicConfig.background;

    // 外层容器
    const poster = document.createElement('div');
    poster.id = 'madopic-export-poster-cover';
    poster.className = 'markdown-poster';
    const mpComputed = getComputedStyle(markdownPoster);
    Object.assign(poster.style, {
        position: 'fixed',
        top: '-99999px',
        left: '-99999px',
        margin: '0',
        width: `${currentWidth}px`,
        height: `${pageHeight}px`,
        minHeight: `${pageHeight}px`,
        padding: mpComputed.padding,
        boxSizing: 'border-box',
        background: markdownPoster.style.background || mpComputed.background,
        transform: 'none',
        overflow: 'hidden',
        borderRadius: '0',
        display: 'flex',
        flexDirection: 'column'
    });

    // 背景图层
    if (bgCfg.type === 'image' && bgCfg.imageData) {
        const bgLayer = document.createElement('div');
        bgLayer.className = 'poster-bg-image';
        bgLayer.style.backgroundImage = `url(${bgCfg.imageData})`;
        bgLayer.style.filter = `blur(${bgCfg.imageBlur}px)`;
        bgLayer.style.opacity = bgCfg.imageOpacity;
        const expand = Math.max(bgCfg.imageBlur * 2, 20);
        bgLayer.style.top = `-${expand}px`;
        bgLayer.style.left = `-${expand}px`;
        bgLayer.style.right = `-${expand}px`;
        bgLayer.style.bottom = `-${expand}px`;
        poster.appendChild(bgLayer);
    }

    // 页眉（可选）
    if (coverCfg.showHeader && hCfg.enabled) {
        const header = document.createElement('div');
        header.className = 'poster-header';
        header.style.paddingTop = hCfg.paddingTop + 'px';
        header.style.paddingBottom = hCfg.paddingBottom + 'px';
        const avatarImg = document.createElement('img');
        avatarImg.src = hCfg.avatar || 'Portrait.png';
        avatarImg.className = 'header-avatar';
        avatarImg.setAttribute('crossorigin', 'anonymous');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'header-name';
        nameSpan.textContent = hCfg.name;
        nameSpan.style.color = hCfg.nameColor;
        header.appendChild(avatarImg);
        header.appendChild(nameSpan);
        poster.appendChild(header);
    }

    // 封面内容区
    const coverArea = document.createElement('div');
    coverArea.className = 'poster-cover';
    coverArea.setAttribute('data-layout', coverCfg.layout);
    coverArea.style.flex = '1';
    coverArea.style.gap = coverCfg.gap + 'px';

    // 字体族 class
    const fontClass = COVER_FONT_CLASS_MAP[coverCfg.fontFamily] || COVER_FONT_CLASS_MAP.system;

    // 主标题
    if (coverCfg.title) {
        const titleEl = document.createElement('div');
        titleEl.className = `cover-title ${fontClass}`;
        const effectClass = COVER_EFFECT_CLASS_MAP[coverCfg.textEffect] || '';
        if (effectClass) titleEl.classList.add(effectClass);
        titleEl.textContent = coverCfg.title;
        Object.assign(titleEl.style, {
            fontSize: coverCfg.titleFontSize + 'px',
            color: coverCfg.titleColor,
            fontWeight: coverCfg.titleWeight
        });
        coverArea.appendChild(titleEl);
    }

    // 副标题
    if (coverCfg.subtitle) {
        const subtitleEl = document.createElement('div');
        subtitleEl.className = `cover-subtitle ${fontClass}`;
        subtitleEl.textContent = coverCfg.subtitle;
        Object.assign(subtitleEl.style, {
            fontSize: coverCfg.subtitleFontSize + 'px',
            color: coverCfg.subtitleColor,
            fontWeight: coverCfg.subtitleWeight
        });
        coverArea.appendChild(subtitleEl);
    }

    poster.appendChild(coverArea);

    // 页脚（可选）
    if (coverCfg.showFooter && fCfg.enabled) {
        const footer = document.createElement('div');
        footer.className = 'poster-footer';
        footer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${fCfg.paddingTop}px 48px ${fCfg.paddingBottom}px 48px;
            flex-shrink: 0;
            gap: 8px;
        `;

        if (fCfg.showDivider) {
            const lineLeft = document.createElement('span');
            lineLeft.style.cssText = `flex: 1; height: 1px; background: linear-gradient(to left, ${hexToRgba(fCfg.dividerColor, 0.3)}, transparent);`;
            footer.appendChild(lineLeft);
        }

        const sloganText = document.createElement('span');
        sloganText.textContent = fCfg.text;
        sloganText.style.cssText = `
            font-size: ${fCfg.fontSize}px;
            color: ${fCfg.textColor};
            letter-spacing: ${fCfg.letterSpacing * 0.1}em;
            white-space: nowrap;
            font-weight: 400;
        `;
        footer.appendChild(sloganText);

        if (fCfg.showDivider) {
            const lineRight = document.createElement('span');
            lineRight.style.cssText = `flex: 1; height: 1px; background: linear-gradient(to right, ${hexToRgba(fCfg.dividerColor, 0.3)}, transparent);`;
            footer.appendChild(lineRight);
        }

        poster.appendChild(footer);
    }

    document.body.appendChild(poster);

    // 等待头像加载
    const imgs = poster.querySelectorAll('img');
    if (imgs.length > 0) {
        await Promise.race([
            Promise.allSettled(Array.from(imgs).map(img =>
                new Promise(resolve => {
                    if (img.complete) return resolve();
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            )),
            new Promise(r => setTimeout(r, 500))
        ]);
    }
    await new Promise(r => requestAnimationFrame(r));

    return poster;
}

/**
 * 为单页 Markdown 创建一个完整的导出节点（含页眉），返回 DOM 节点。
 * 调用方负责在使用后移除节点。
 */
async function createPageExportNode(markdownText, pageIndex, totalPages) {
    const hCfg = MadopicConfig.header;
    const fCfg = MadopicConfig.footer;
    const bgCfg = MadopicConfig.background;
    // 创建外层容器（对应 markdownPoster）
    const poster = document.createElement('div');
    poster.id = `madopic-export-poster-page-${pageIndex}`;
    poster.className = 'markdown-poster';
    const mpComputed = getComputedStyle(markdownPoster);
    Object.assign(poster.style, {
        position: 'fixed',
        top: '-99999px',
        left: '-99999px',
        margin: '0',
        width: `${currentWidth}px`,
        padding: mpComputed.padding,
        boxSizing: 'border-box',
        background: markdownPoster.style.background || mpComputed.background,
        transform: 'none',
        overflow: 'hidden',
        borderRadius: '0',
        display: 'flex',
        flexDirection: 'column'
    });

    // 背景图层（如果是背景图模式）
    if (bgCfg.type === 'image' && bgCfg.imageData) {
        const bgLayer = document.createElement('div');
        bgLayer.className = 'poster-bg-image';
        bgLayer.style.backgroundImage = `url(${bgCfg.imageData})`;
        bgLayer.style.filter = `blur(${bgCfg.imageBlur}px)`;
        bgLayer.style.opacity = bgCfg.imageOpacity;
        const expand = Math.max(bgCfg.imageBlur * 2, 20);
        bgLayer.style.top = `-${expand}px`;
        bgLayer.style.left = `-${expand}px`;
        bgLayer.style.right = `-${expand}px`;
        bgLayer.style.bottom = `-${expand}px`;
        poster.appendChild(bgLayer);
    }

    // 页眉
    if (hCfg.enabled) {
        const header = document.createElement('div');
        header.className = 'poster-header';
        header.style.paddingTop = hCfg.paddingTop + 'px';
        header.style.paddingBottom = hCfg.paddingBottom + 'px';
        const avatarImg = document.createElement('img');
        avatarImg.src = hCfg.avatar || 'Portrait.png';
        avatarImg.className = 'header-avatar';
        avatarImg.setAttribute('crossorigin', 'anonymous');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'header-name';
        nameSpan.textContent = hCfg.name;
        nameSpan.style.color = hCfg.nameColor;
        header.appendChild(avatarImg);
        header.appendChild(nameSpan);

        // 页码
        if (hCfg.showPageNumber && totalPages > 1) {
            const pageNum = document.createElement('span');
            pageNum.style.cssText = `margin-left: auto; font-size: 12px; color: ${hCfg.pageNumberColor}; font-weight: 400;`;
            pageNum.textContent = `${pageIndex + 1} / ${totalPages}`;
            header.appendChild(pageNum);
        }
        poster.appendChild(header);
    }

    // 内容区
    const content = document.createElement('div');
    content.className = 'poster-content';
    content.style.minHeight = '0';
    content.style.animation = 'none';
    // 内容区自动填充 header 和 footer 之间的空间
    content.style.flex = '1';
    content.style.overflow = 'hidden';

    // 同步字体大小 CSS 变量
    content.style.setProperty('--dynamic-font-size', `${currentFontSize}px`);
    content.style.setProperty('--dynamic-h1-size', `${Math.round(currentFontSize * 1.75)}px`);
    content.style.setProperty('--dynamic-h2-size', `${Math.round(currentFontSize * 1.375)}px`);
    content.style.setProperty('--dynamic-h3-size', `${Math.round(currentFontSize * 1.125)}px`);
    content.style.setProperty('--dynamic-h4-size', `${Math.round(currentFontSize * 1.05)}px`);
    content.style.setProperty('--dynamic-h5-h6-size', `${Math.round(currentFontSize * 0.95)}px`);
    content.style.setProperty('--dynamic-code-size', `${Math.round(currentFontSize * 0.875)}px`);
    content.style.setProperty('--dynamic-quote-size', `${Math.round(currentFontSize * 0.95)}px`);

    // 渲染 Markdown
    let processed = mathRenderer.preprocessMath(markdownText);
    processed = diagramRenderer.preprocessDiagram(processed);
    processed = echartsRenderer.preprocessECharts(processed);
    processed = cardRenderer.preprocessCards(processed);
    processed = replaceImageDataForPreview(processed);

    let html = '';
    try {
        html = marked.parse(processed);
        html = sanitizeHTML(html);
    } catch (e) {
        html = `<p>${markdownText}</p>`;
    }
    content.innerHTML = html;

    poster.appendChild(content);

    // 页脚
    if (fCfg.enabled) {
        const footer = document.createElement('div');
        footer.className = 'poster-footer';
        footer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${fCfg.paddingTop}px 48px ${fCfg.paddingBottom}px 48px;
            flex-shrink: 0;
            gap: 8px;
        `;

        if (fCfg.showDivider) {
            const lineLeft = document.createElement('span');
            lineLeft.style.cssText = `flex: 1; height: 1px; background: linear-gradient(to left, ${hexToRgba(fCfg.dividerColor, 0.3)}, transparent);`;
            footer.appendChild(lineLeft);
        }

        const sloganText = document.createElement('span');
        sloganText.textContent = fCfg.text;
        sloganText.style.cssText = `
            font-size: ${fCfg.fontSize}px;
            color: ${fCfg.textColor};
            letter-spacing: ${fCfg.letterSpacing * 0.1}em;
            white-space: nowrap;
            font-weight: 400;
        `;
        footer.appendChild(sloganText);

        if (fCfg.showDivider) {
            const lineRight = document.createElement('span');
            lineRight.style.cssText = `flex: 1; height: 1px; background: linear-gradient(to right, ${hexToRgba(fCfg.dividerColor, 0.3)}, transparent);`;
            footer.appendChild(lineRight);
        }

        poster.appendChild(footer);
    }

    document.body.appendChild(poster);

    // 渲染特殊元素
    mathRenderer.renderMath(content);

    // 为 Mermaid 生成不冲突的 ID
    const mermaidContainers = content.querySelectorAll('.mermaid-container');
    mermaidContainers.forEach((container, idx) => {
        container.setAttribute('data-diagram-id', `multi-mermaid-${pageIndex}-${idx}-${Date.now()}`);
    });

    await diagramRenderer.renderDiagrams(content);
    await echartsRenderer.renderECharts(content);
    await cardRenderer.renderCards(content);

    if (typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(content);
    }

    // 等待图片加载完成（代替固定 300ms 等待，大幅减少多页场景的累积等待时间）
    const imgs = content.querySelectorAll('img');
    if (imgs.length > 0) {
        await Promise.race([
            Promise.allSettled(Array.from(imgs).map(img =>
                new Promise(resolve => {
                    if (img.complete) return resolve();
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            )),
            new Promise(r => setTimeout(r, 500))
        ]);
    }
    await new Promise(r => requestAnimationFrame(r));

    return poster;
}

/**
 * 多图导出主函数。
 * 将 Markdown 智能分割为多页，每页独立导出为 PNG。
 * 【性能优化】
 * - 复用 splitMarkdownIntoPages 的缓存结果（如果预览已分过页）
 * - 批处理并发渲染（每批 2 页，导出 scale 更高所以比预览少）
 * - 逐批写入 ZIP，减少内存峰值
 */
async function exportToMultiPNG() {
    try {
        showNotification('正在分析内容并分割页面...', 'info');

        // 懒加载导出库
        await ensureExportLibsLoaded();

        const markdownText = markdownInput.value.trim();
        if (!markdownText) {
            showNotification('没有内容可导出', 'warning');
            return;
        }

        // 计算目标页面高度
        // 小红书 3:4 比例：高度 = 宽度 / 3 * 4
        const pageHeight = Math.round((currentWidth / 3) * 4);

        // 内容区实际可用宽度 = 容器宽度 - 2 * padding
        const contentWidth = currentWidth;

        // 分割（会自动命中缓存，如果配置未变化）
        const pages = await splitMarkdownIntoPages(
            markdownText,
            pageHeight,
            contentWidth,
            currentPadding,
            currentFontSize
        );

        const timestamp = getFormattedTimestamp();
        const zip = new JSZip();
        const imgFolder = zip.folder('madopic-' + timestamp);
        let successCount = 0;

        // === 封面页导出 ===
        const coverCfg = MadopicConfig.cover;
        const hasCover = coverCfg.enabled && coverCfg.title;
        // 文件序号偏移：有封面时内容页从 02 开始，否则从 01 开始
        const fileIndexOffset = hasCover ? 1 : 0;

        if (hasCover) {
            showNotification('正在生成封面页...', 'info');
            let coverNode = null;
            try {
                coverNode = await createCoverExportNode(pageHeight);
                try { await prepareImagesForExport(coverNode); } catch (_) { }
                if (document.fonts?.ready) try { await document.fonts.ready; } catch (_) { }
                await new Promise(r => requestAnimationFrame(r));

                const tryScales = getExportScaleCandidates(EXPORT_SCALE);
                const rect = coverNode.getBoundingClientRect();
                const canvas = await renderWithFallbackScales(coverNode, Math.ceil(rect.width), Math.ceil(rect.height), tryScales);
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob(b => {
                        if (b) resolve(b);
                        else reject(new Error('toBlob 返回 null'));
                    }, 'image/png', 1.0);
                });
                imgFolder.file('01.png', blob);
                successCount++;
            } catch (e) {
                console.error('封面页导出失败:', e);
                showNotification('封面页生成失败，继续导出内容页...', 'warning');
            } finally {
                if (coverNode?.parentNode) coverNode.parentNode.removeChild(coverNode);
            }
        }

        const totalDisplay = pages.length + (hasCover ? 1 : 0);
        showNotification(`共 ${totalDisplay} 页，正在生成图片...`, 'info');

        const BATCH_SIZE = 2; // 导出 scale 更高，每批并行 2 页以控制内存
        const tryScales = getExportScaleCandidates(EXPORT_SCALE);

        for (let batchStart = 0; batchStart < pages.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, pages.length);
            const batchPromises = [];

            for (let i = batchStart; i < batchEnd; i++) {
                batchPromises.push(
                    (async (pageIdx) => {
                        let exportNode = null;
                        try {
                            exportNode = await createPageExportNode(pages[pageIdx], pageIdx, pages.length);

                            // 图片预处理
                            try { await prepareImagesForExport(exportNode); } catch (_) { }

                            // 等待字体
                            if (document.fonts?.ready) try { await document.fonts.ready; } catch (_) { }
                            await new Promise(r => requestAnimationFrame(r));

                            // 设置固定的 3:4 高度
                            exportNode.style.height = `${pageHeight}px`;
                            exportNode.style.minHeight = `${pageHeight}px`;
                            exportNode.style.overflow = 'hidden';

                            const rect = exportNode.getBoundingClientRect();
                            const targetWidth = Math.ceil(rect.width);
                            const targetHeight = Math.ceil(rect.height);

                            const canvas = await renderWithFallbackScales(exportNode, targetWidth, targetHeight, tryScales);

                            // 将 canvas 转为 Blob
                            const blob = await new Promise((resolve, reject) => {
                                canvas.toBlob(b => {
                                    if (b) resolve(b);
                                    else reject(new Error('toBlob 返回 null'));
                                }, 'image/png', 1.0);
                            });

                            return { pageIdx, blob };
                        } catch (e) {
                            console.error(`第 ${pageIdx + 1} 页图片生成失败:`, e);
                            return { pageIdx, blob: null, error: e };
                        } finally {
                            if (exportNode?.parentNode) {
                                echartsRenderer.destroyAll(exportNode);
                                exportNode.parentNode.removeChild(exportNode);
                            }
                        }
                    })(i)
                );
            }

            const batchResults = await Promise.all(batchPromises);

            // 逐批写入 ZIP（封面页占用 01，内容页从 02 开始）
            for (const result of batchResults) {
                if (result.blob) {
                    const fileName = `${String(result.pageIdx + 1 + fileIndexOffset).padStart(2, '0')}.png`;
                    imgFolder.file(fileName, result.blob);
                    successCount++;
                } else if (result.error) {
                    showNotification(`第 ${result.pageIdx + 1} 页生成失败`, 'error');
                }
            }

            showNotification(`已生成 ${Math.min(batchEnd, pages.length) + fileIndexOffset} / ${totalDisplay} 页...`, 'info');
        }

        if (successCount === 0) {
            showNotification('所有页面生成失败，无法导出', 'error');
            return;
        }

        // 打包 zip 并触发下载
        showNotification('正在打包 zip...', 'info');
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const link = document.createElement('a');
        link.download = `mkd2pic-${timestamp}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        showNotification(`${successCount} 张图片已打包为 zip 下载！`, 'success');
    } catch (error) {
        console.error('多图导出失败:', error);
        showNotification('多图导出失败，请重试', 'error');
    }
}

// ──────────────────────────────────────────────────────────────
// 保存 MCP 配置（File System Access API）
// ──────────────────────────────────────────────────────────────

/**
 * 将当前 MadopicConfig 中的样式预设（不含封面标题/内容）序列化为
 * madopic_config.json 格式，通过文件保存对话框写入本地文件。
 *
 * 说明：
 * - 封面的 title/subtitle 是运行时参数，不写入预设
 * - 背景 imageData（Base64）体积过大，不写入预设
 */
async function saveMcpConfig() {
    if (!window.showSaveFilePicker) {
        showNotification('当前浏览器不支持文件写入（需 Chrome 86+），请升级浏览器', 'error');
        return;
    }

    const cfg = MadopicConfig;

    // 构造要写入的配置对象（过滤运行时内容字段）
    const output = {
        _comment: 'madopic MCP 服务配置文件 — 预设样式，运行时参数通过工具调用传入',
        _version: '1.0.0',

        output: {
            default_dir: '~/Downloads/madopic-exports',
            _comment: '导出目录，支持 ~ 展开。不同设备可修改此项后重启 MCP 生效。',
        },

        export: {
            default_format: 'xhs',
            _format_options: 'xhs（小红书 3:4）| pyq（朋友圈 9:16）| free（自由比例）',
            default_mode: 'multi',
            _mode_options: 'multi（多图导出，ZIP）| single（单图/长图，PNG）| pdf（PDF）',
        },

        cover: {
            enabled: cfg.cover.enabled,
            titleFontSize: cfg.cover.titleFontSize,
            subtitleFontSize: cfg.cover.subtitleFontSize,
            titleColor: cfg.cover.titleColor,
            subtitleColor: cfg.cover.subtitleColor,
            titleWeight: cfg.cover.titleWeight,
            subtitleWeight: cfg.cover.subtitleWeight,
            fontFamily: cfg.cover.fontFamily,
            _fontFamily_options: 'system | serif | mono | hei',
            textEffect: cfg.cover.textEffect,
            _textEffect_options: 'none | stroke | shadow | gradient | neon | emboss',
            layout: cfg.cover.layout,
            _layout_options: 'center | top | bottom',
            gap: cfg.cover.gap,
            showHeader: cfg.cover.showHeader,
            showFooter: cfg.cover.showFooter,
        },

        header: {
            enabled: cfg.header.enabled,
            name: cfg.header.name,
            nameColor: cfg.header.nameColor,
            paddingTop: cfg.header.paddingTop,
            paddingBottom: cfg.header.paddingBottom,
            showPageNumber: cfg.header.showPageNumber,
            pageNumberColor: cfg.header.pageNumberColor,
            // avatar 不写入（Base64 太大，MCP 侧自行处理）
        },

        footer: {
            enabled: cfg.footer.enabled,
            text: cfg.footer.text,
            textColor: cfg.footer.textColor,
            fontSize: cfg.footer.fontSize,
            letterSpacing: cfg.footer.letterSpacing,
            paddingTop: cfg.footer.paddingTop,
            paddingBottom: cfg.footer.paddingBottom,
            showDivider: cfg.footer.showDivider,
            dividerColor: cfg.footer.dividerColor,
        },

        background: {
            type: cfg.background.type,
            _type_options: 'gradient | solid | image',
            preset: cfg.background.preset,
            _preset_options: 'gradient1 ~ gradient8 | custom',
            customStartColor: cfg.background.customStartColor,
            customEndColor: cfg.background.customEndColor,
            gradientDirection: cfg.background.gradientDirection,
            solidColor: cfg.background.solidColor,
            // imageData 不写入（体积过大）
            imageBlur: cfg.background.imageBlur,
            imageOpacity: cfg.background.imageOpacity,
        },

        layout: {
            fontSize: cfg.layout.fontSize,
            _fontSize_range: '14~22',
            width: cfg.layout.width,
            _width_range: '480~800',
            padding: cfg.layout.padding,
            _padding_range: '20~60',
        },
    };

    const jsonStr = JSON.stringify(output, null, 2);

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'madopic_config.json',
            startIn: 'documents',
            types: [{
                description: 'JSON 配置文件',
                accept: { 'application/json': ['.json'] },
            }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();

        showNotification('✅ MCP 配置已保存！MCP 服务重启后生效', 'success');
    } catch (err) {
        if (err.name === 'AbortError') return; // 用户取消，不提示
        console.error('saveMcpConfig error:', err);
        showNotification(`保存失败: ${err.message}`, 'error');
    }
}

// 导出全局对象供调试使用
window.MadopicApp = {
    updatePreview,
    manualRender,
    exportToPNG,
    exportToPDF,
    exportToMultiPNG,
    applyBackground,
    MarkdownHelper,
    showNotification,
    insertImage,
    handleImageFile,
    getCurrentMadopicConfig,
    MadopicConfig,
    saveConfig,
    loadConfig,
    applyAllConfig,
    openSettingsSidebar,
    closeSettingsSidebar,
    openMultiPreview,
    closeMultiPreview,
    mathRenderer,
    diagramRenderer,
    echartsRenderer,
    cardRenderer
};

/**
 * 裁剪画布四周完全透明的像素，去除导出后可能出现的空白边缘。
 * 返回新的裁剪画布；若无需裁剪则返回 null。
 */
function trimTransparentEdges(sourceCanvas) {
    const ctx = sourceCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let top = 0;
    let bottom = height - 1;
    let left = 0;
    let right = width - 1;
    const isRowTransparent = (y) => {
        const base = y * width * 4;
        for (let x = 0; x < width; x++) {
            if (data[base + x * 4 + 3] !== 0) return false;
        }
        return true;
    };
    const isColTransparent = (x, t, b) => {
        for (let y = t; y <= b; y++) {
            const idx = (y * width + x) * 4 + 3;
            if (data[idx] !== 0) return false;
        }
        return true;
    };

    while (top <= bottom && isRowTransparent(top)) top++;
    while (bottom >= top && isRowTransparent(bottom)) bottom--;
    while (left <= right && isColTransparent(left, top, bottom)) left++;
    while (right >= left && isColTransparent(right, top, bottom)) right--;

    // 若全透明或无需要裁剪
    if (top === 0 && left === 0 && right === width - 1 && bottom === height - 1) return null;
    if (top > bottom || left > right) return null;

    const newWidth = right - left + 1;
    const newHeight = bottom - top + 1;
    const trimmed = document.createElement('canvas');
    trimmed.width = newWidth;
    trimmed.height = newHeight;
    const tctx = trimmed.getContext('2d');
    tctx.drawImage(sourceCanvas, left, top, newWidth, newHeight, 0, 0, newWidth, newHeight);
    return trimmed;
}

// ===== 撤销/重做快捷键 =====
document.addEventListener('keydown', (e) => {
    // Ctrl+Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const state = undoRedoManager.undo();
        if (state !== null && markdownInput) {
            undoRedoManager.isUndoRedo = true;
            markdownInput.value = state;
            undoRedoManager.isUndoRedo = false;
            updatePreview();
        }
    }
    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const state = undoRedoManager.redo();
        if (state !== null && markdownInput) {
            undoRedoManager.isUndoRedo = true;
            markdownInput.value = state;
            undoRedoManager.isUndoRedo = false;
            updatePreview();
        }
    }
});

// 保存输入状态到撤销栈（防抖）
const pushUndoState = debounce(() => {
    if (markdownInput) {
        undoRedoManager.push(markdownInput.value);
    }
}, 500);

// ===== 拖拽图片插入 =====
function setupDragDropImage() {
    if (!markdownInput) return;

    markdownInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markdownInput.classList.add('drag-over');
    });

    markdownInput.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        markdownInput.classList.remove('drag-over');
    });

    markdownInput.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        markdownInput.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                await handleImageFile(file);
            }
        }
    });
}

// ===== 触屏双指缩放 =====
function setupPinchZoom() {
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;

    let initialDistance = 0;
    let initialZoom = 100;

    previewContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialZoom = currentZoom;
        }
    }, { passive: true });

    previewContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const scale = currentDistance / initialDistance;
            let newZoom = Math.round(initialZoom * scale);
            newZoom = Math.max(25, Math.min(200, newZoom));
            if (newZoom !== currentZoom) {
                currentZoom = newZoom;
                const previewContent = document.querySelector('.preview-content');
                if (previewContent) {
                    previewContent.style.transform = `scale(${currentZoom / 100})`;
                }
                const zoomLevel = document.querySelector('.zoom-level');
                if (zoomLevel) {
                    zoomLevel.textContent = `${currentZoom}%`;
                }
            }
        }
    }, { passive: true });
}

// ===== 汉堡菜单（移动端响应式） =====
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const toolbarRight = document.getElementById('toolbarRight');
    if (!hamburgerBtn || !toolbarRight) return;

    hamburgerBtn.addEventListener('click', () => {
        toolbarRight.classList.toggle('mobile-open');
        hamburgerBtn.classList.toggle('active');
    });

    // 点击菜单项后自动关闭
    toolbarRight.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) {
            toolbarRight.classList.remove('mobile-open');
            hamburgerBtn.classList.remove('active');
        }
    });
}

// ===== 草稿恢复 =====
function restoreDraft() {
    const draft = loadDraft();
    const settings = loadSettings();

    if (draft && markdownInput) {
        // 只有当草稿内容与默认内容不同时才恢复
        const defaultContent = markdownInput.value;
        if (draft !== defaultContent && draft.trim().length > 0) {
            markdownInput.value = draft;
            undoRedoManager.push(draft);
        }
    }

    // 恢复设置
    if (settings) {
        if (settings.background) {
            currentBackground = settings.background;
        }
        if (settings.mode && typeof switchMode === 'function') {
            // 稍后在 DOM 准备好后切换模式
        }
    }
}

// ===== 初始化所有优化功能 =====
function initOptimizations() {
    // 恢复草稿
    restoreDraft();

    // 初始化撤销栈
    if (markdownInput) {
        undoRedoManager.push(markdownInput.value);

        // 监听输入事件，记录撤销状态
        markdownInput.addEventListener('input', () => {
            pushUndoState();
            debouncedUpdatePreview();
        });
    }

    // 设置拖拽图片
    setupDragDropImage();

    // 设置触屏缩放
    setupPinchZoom();

    // 设置汉堡菜单
    setupHamburgerMenu();

    console.log('Madopic 优化功能已初始化');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptimizations);
} else {
    initOptimizations();
}