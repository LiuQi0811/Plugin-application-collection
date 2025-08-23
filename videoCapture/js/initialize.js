// 检测 chrome.i18n.getMessage 是否存在
// 低版本的 Chrome 或 manifest v3 某些实现可能有 bug，i18n 可能未定义
if (chrome.i18n.getMessage === undefined) {
    // TODO 低版本chrome manifest v3协议 会有 getMessage 函数不存在的BUG 处理 .......
    console.log(" MESSAGE __ ", "chrome.i18n.getMessage  ", "低版本chrome manifest v3协议 会有 getMessage 函数不存在的BUG");
}

// 检测 chrome.downloads API 是否存在
// 某些魔改版 Chrome（如夸克浏览器）可能移除了 downloads API
if (!chrome.downloads) {
    // TODO 部分修改版chrome 不存在 chrome.downloads API
    // 例如 夸克浏览器
    // 使用传统下载方式下载 但无法监听 无法另存为 无法判断下载是否失败
    chrome.downloads = {
        download: function (options, callback) {
            let a = document.createElement("a"); // 创建一个 <a> 标签用于模拟点击下载
            console.log(" DOM ", a); // 打印创建的 DOM 元素（调试用）
        }
    };
}

// 检测 chrome.sidePanel API 是否存在
// chrome.sidePanel 是较新的 API，在 Chrome 114 之前的版本中不存在
if (!chrome.sidePanel) {
    // TODO 兼容 114版本以下没有chrome.sidePanel
    console.log(" MESSAGE __", " 兼容 114版本以下没有chrome.sidePanel");
}

// 使用 Proxy 包装 chrome.i18n.getMessage，提供更安全的调用方式
// 即使 chrome.i18n.getMessage 存在，也通过 get 拦截器调用，便于后期扩展统一处理
const i18n = new Proxy(chrome.i18n.getMessage, {
    get: function (target, key) {
        // 当通过 i18n('key') 方式调用时，实际上调用的是 chrome.i18n.getMessage(key)
        return chrome.i18n.getMessage(key);
    }
});


// G：全局配置和状态管理对象，用于存储扩展运行时的各种数据和状态
let G = {};
// 标记同步配置和本地配置是否初始化完成
G.initializeSyncComplete = false; // 是否已完成从 chrome.storage.sync 加载配置
G.initializeLocalComplete = false; // 是否已完成从 chrome.storage.local/session 加载配置

// 缓存数据对象（例如媒体资源信息等）
let cacheData = {initialize: true}; // 默认值，防止未加载时出错
G.blackList = new Set(); // 正则屏蔽资源列表
G.blockUrlSet = new Set(); // 屏蔽网址列表
G.requestHeaders = new Map(); // 临时储存请求头
G.urlMap = new Map(); // url查重Map
G.deepSearchTemporarilyClose = null; // 深度搜索临时变量/深度搜索功能的临时关闭标记

// 加载当前tabId 获取当前用户正在浏览的标签页 ID，存入 G.tabId
chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    if (tabs[0] && tabs[0].id) {
        G.tabId = tabs[0].id; // 当前标签页 ID
    } else {
        G.tabId = -1; // 未找到激活标签页，设为 -1 表示无效
    }
});

// 通过 User-Agent 判断当前是否是移动设备环境/是否是手机浏览器
G.isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

// 所有设置变量 默认值
G.OptionLists = {
    Ext: [ // 支持下载的文件扩展名列表，以及是否启用
        {"ext": "flv", "size": 0, "state": true},
        {"ext": "hlv", "size": 0, "state": true},
        {"ext": "f4v", "size": 0, "state": true},
        {"ext": "mp4", "size": 0, "state": true},
        {"ext": "mp3", "size": 0, "state": true},
        {"ext": "wma", "size": 0, "state": true},
        {"ext": "wav", "size": 0, "state": true},
        {"ext": "m4a", "size": 0, "state": true},
        {"ext": "ts", "size": 0, "state": false},
        {"ext": "webm", "size": 0, "state": true},
        {"ext": "ogg", "size": 0, "state": true},
        {"ext": "ogv", "size": 0, "state": true},
        {"ext": "acc", "size": 0, "state": true},
        {"ext": "mov", "size": 0, "state": true},
        {"ext": "mkv", "size": 0, "state": true},
        {"ext": "m4s", "size": 0, "state": true},
        {"ext": "m3u8", "size": 0, "state": true},
        {"ext": "m3u", "size": 0, "state": true},
        {"ext": "mpeg", "size": 0, "state": true},
        {"ext": "avi", "size": 0, "state": true},
        {"ext": "wmv", "size": 0, "state": true},
        {"ext": "asf", "size": 0, "state": true},
        {"ext": "movie", "size": 0, "state": true},
        {"ext": "divx", "size": 0, "state": true},
        {"ext": "mpeg4", "size": 0, "state": true},
        {"ext": "vid", "size": 0, "state": true},
        {"ext": "aac", "size": 0, "state": true},
        {"ext": "mpd", "size": 0, "state": true},
        {"ext": "weba", "size": 0, "state": true},
        {"ext": "opus", "size": 0, "state": true},
        {"ext": "srt", "size": 0, "state": false},
        {"ext": "vtt", "size": 0, "state": false},
    ],
    Type: [ // 支持的 MIME 类型，以及是否启用
        {"type": "audio/*", "size": 0, "state": true},
        {"type": "video/*", "size": 0, "state": true},
        {"type": "application/ogg", "size": 0, "state": true},
        {"type": "application/vnd.apple.mpegurl", "size": 0, "state": true},
        {"type": "application/x-mpegurl", "size": 0, "state": true},
        {"type": "application/mpegurl", "size": 0, "state": true},
        {"type": "application/octet-stream-m3u8", "size": 0, "state": true},
        {"type": "application/dash+xml", "size": 0, "state": true},
        {"type": "application/m4s", "size": 0, "state": true},
    ],
    RegEx: [ // 屏蔽规则（正则表达式），支持黑名单、是否启用
        {"type": "ig", "regex": "https://cache\\.video\\.[a-z]*\\.com/dash\\?tvid=.*", "ext": "json", "state": false},
        {
            "type": "ig",
            "regex": ".*\\.bilivideo\\.(com|cn).*\\/live-bvc\\/.*m4s",
            "ext": "",
            "blackList": true,
            "state": false
        }
    ],
    blockUrl: [], // 屏蔽的网址列表
    // 拷贝链接时的模板字符串
    copyM3U8: "${url}",
    copyMPD: "${url}",
    copyOther: "${url}",
    m3u8dl: 0, // m3u8 下载相关配置
    sidePanel: false, // 是否启用侧边栏功能
    enable: true, // 整体插件是否启用
};

// LocalVar 本地储存的配置（存储于 chrome.storage.local/session）
G.LocalVar = {
    // 移动端或自动下载相关的标签页 ID 集合
    featMobileTabId: [],
    featAutoDownTabId: [],
    mediaControl: {tabid: 0, index: -1}, // 媒体控制相关状态，如当前播放的 tabId 和索引
    // 预览界面相关配置
    previewShowTitle: false, // 是否显示标题
    previewDeleteDuplicateFilenames: false // 是否删除重复文件名
};

/**
 *  chrome.storage.onChanged 监听 chrome.storage.onChanged 事件（配置发生变化时触发）
 *  @author LiuQi
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    console.log(" // TODO chrome.storage.onChanged Method", changes, namespace);
});

/**
 * InitializeOptions 在插件启动或重新连接时，从 Chrome 的 storage（同步/本地）中加载配置，初始化全局变量 G 和缓存 cacheData。
 * @constructor
 * @author LiuQi
 */
function InitializeOptions() {
    console.log("Initialize Options  ");
    // 断开重新连接后 立刻把local里MediaData数据交给cacheData
    (chrome.storage.session ?? chrome.storage.local).get({MediaData: {}}, function (details) {
        if (details.MediaData.initialize) { // 加载 MediaData，初始化 cacheData
            cacheData = {};
            return;
        }
        cacheData = details.MediaData;
    });
    // 读取sync配置数据 交给全局变量G (读取同步配置项（比如支持的文件类型、下载规则等）)
    chrome.storage.sync.get(G.OptionLists, function (details) {
        if (chrome.runtime.lastError) { // 出错时使用默认配置
            details = G.OptionLists;
        }
        // 确保每个配置项都有默认值
        for (let key in G.OptionLists) {
            if (details[key] === undefined || details[key] === null) {
                details[key] = G.OptionLists[key];
            }
        }
        // Ext的Array转为Map类型
        details.Ext = new Map(details.Ext.map(item => [item.ext, item]));
        // Type的Array转为Map类型
        details.Type = new Map(details.Type.map(item => [item.type, {size: item.size, state: item.state}]));
        // RegEx 预编译正则匹配
        // 遍历 details.RegEx 数组中的每一个正则规则配置项 item
        details.RegEx = details.RegEx.map(item => {
            // 声明一个变量 Reg，初始值为 undefined，用于存放编译后的正则表达式对象
            let Reg = undefined;
            try {
                // 尝试使用 new RegExp() 方法，根据 item.regex（正则表达式字符串）和 item.type（正则标志，如 "i", "g", "ig"）创建正则对象
                Reg = new RegExp(item.regex, item.type);

                // 如果正则表达式编译成功，返回一个新的对象，包含：
                // - regex: 编译后的正则对象（RegExp），用于后续的匹配操作
                // - ext: 该规则关联的扩展名/类型（比如 "json"、"m3u8" 等，可能是用于标识规则用途）
                // - blackList: 是否是黑名单规则（布尔值，true 表示该规则用于屏蔽匹配项）
                // - state: 规则是否启用（true 表示启用，false 表示禁用）
                return {regex: Reg, ext: item.ext, blackList: item.blackList, state: item.state};
            } catch (e) {
                // 将当前规则的 state 设为 false，表示该规则被禁用（不参与后续匹配逻辑）
                item.state = false;
            }
        });

        // blockUrl 预编译屏蔽通配符
        details.blockUrl = details.blockUrl.map(item => {
            // 对每一个屏蔽规则对象 item，调用 wildcardToRegEx(item.url)，
            // 将其中的通配符字符串（如 *、? 等）转换为真正的正则表达式 RegExp 对象
            // 最终返回一个新的对象，包含：
            // - url: 转换后得到的正则表达式对象（用于后续的 url.test() 匹配）
            // - state: 该规则是否启用（true 表示启用屏蔽，false 表示不启用）
            return {url: wildcardToRegEx(item.url), state: item.state};
        });

        // 兼容旧配置
        if (details.copyM3U8.includes("$url$")) {
            console.log("// TODO 兼容旧配置 details.copyM3U8");
        }
        if (details.copyMPD.includes("$url$")) {
            console.log("// TODO 兼容旧配置 details.copyMPD");
        }
        if (details.copyOther.includes("$url$")) {
            console.log("// TODO 兼容旧配置 details.copyOther");
        }
        if (typeof details.m3u8dl == "boolean") {
            console.log("// TODO 兼容旧配置 typeof details.m3u8dl");
        }

        // setPanelBehavior 侧边栏
        chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: details.sidePanel});

        // 将从 chrome.storage.sync 读取的配置项 details，合并到全局变量 G 中
        // 这样，后续代码中使用的 G 就包含了最新的用户配置、功能开关、类型过滤等信息
        // 注意：如果 G 和 details 有同名属性，details 的值会覆盖 G 的（因为 ...details 在后面）
        G = {...details, ...G};

        // 初始化 G.blockUrlSet
        // 初始化 G.blockUrlSet：一个 Set，用于存放需要屏蔽的网页标签页的 ID（tab.id）
        // 目的是：标记某些标签页，后续可能根据这些 ID 做特殊处理（比如屏蔽下载、拦截资源等）
        // 这里通过调用 isLockUrl(tab.url) 函数，判断某个标签页的 URL 是否需要被“锁定/屏蔽”
        // 如果 isLockUrl 函数存在（typeof 检查），则遍历所有标签页，将符合条件的 tab.id 加入 G.blockUrlSet
        // (typeof isLockUrl == "function")：确保 isLockUrl 是一个函数，避免未定义时出错
        // chrome.tabs.query({}, ...)：查询当前浏览器中打开的所有标签页
        // 遍历每个 tab，如果它有 URL 且 isLockUrl(tab.url) 返回 true，则将该 tab.id 加入屏蔽集合
        (typeof isLockUrl == "function") && chrome.tabs.query({}, function (tabs) { // tabs 网页标签
            for (const tab of tabs) {
                if (tab.url && isLockUrl(tab.url)) { // 如果该标签页有 URL，且命中屏蔽规则
                    G.blockUrlSet.add(tab.id); // 将该标签页的 ID 加入屏蔽集合中
                }
            }
        });

        // chrome.action.setIcon 设置插件图标
        chrome.action.setIcon({path: G.enable ? "/images/icon.png" : "/images/icon-disable"});
        // 标记：同步配置初始化完成
        G.initializeSyncComplete = true;
    });

    // 读取local配置数据， 并将其合并到全局变量 G 中
    // 优先使用 chrome.storage.session（Chrome 102+ 引入的临时会话存储，关闭浏览器后数据会被清除）
    // 如果不支持（比如低版本 Chrome），则降级使用 chrome.storage.local（永久本地存储）
    (chrome.storage.session ?? chrome.storage.local).get(G.LocalVar, function (details) {
        // 将读取到的字段 featMobileTabId（原本可能是数组或 undefined）转换为 Set 类型
        details.featMobileTabId = new Set(details.featMobileTabId);
        // 将读取到的字段 featAutoDownTabId（原本可能是数组或 undefined）转换为 Set 类型
        details.featAutoDownTabId = new Set(details.featAutoDownTabId);
        // 将从本地存储中读取的所有配置项（details），与已有的全局配置 G 进行合并
        G = {...details, ...G};
        // 标记：本地配置初始化完成
        G.initializeLocalComplete = true;
    });
}

/**
 * chrome.runtime.onInstalled 监听 Chrome 扩展的安装和更新事件（扩展升级，清空本地储存）
 * 当用户首次安装扩展、或者升级扩展版本时，都会触发此监听器
 * @author LiuQi
 */
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "update") { // 用户升级了扩展到新版本
        // 清空 chrome.storage.local 中的所有数据
        // 目的是：在扩展升级时，清除旧的本地存储，避免旧配置对新版本造成干扰
        chrome.storage.local.clear(function () {
            // 清空本地存储后，再尝试清空 chrome.storage.session
            if (chrome.storage.session) {
                chrome.storage.session.clear(InitializeOptions);
            } else {
                InitializeOptions();
            }
        });
        // 创建一个名为 "nowClear" 的 alarm，3 秒后触发
        // chrome.alarms.create()是 Chrome 提供的定时器 API，用于在指定的时间后触发一个 alarm 事件。
        // chrome.alarms.onAlarm 监听器触发
        chrome.alarms.create("nowClear", {when: Date.now() + 3000});
    }
    if (details.reason == "install") { // 用户首次安装该扩展
        console.log(" // TODO details.reason install");
    }
});

// Initialize Options
InitializeOptions();