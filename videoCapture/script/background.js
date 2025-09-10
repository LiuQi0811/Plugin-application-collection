// This is background.js
console.log("🔥 Background Service Worker 已启动！");

/**
 * onInstalled 监听安装事件（用于调试）
 * @author LiuQi
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ 扩展已安装或更新");
});

importScripts("../js/initialize.js", "../js/function.js");
// Service Worker 5分钟后会强制终止扩展
// https://bugs.chromium.org/p/chromium/issues/detail?id=1271154
// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/70003493#70003493

/**
 * onBeforeNavigate 监听 webNavigation 的 onBeforeNavigate 事件（即用户即将导航到新页面前触发）
 * 直接返回 目的是为了保持 Service Worker 活跃
 * @author LiuQi
 */
chrome.webNavigation.onBeforeNavigate.addListener(function () {
    return;
});

/**
 * onHistoryStateUpdated 监听 webNavigation 的 onHistoryStateUpdated 事件（即通过 History API 更新页面状态时触发，比如 SPA 页面路由变化）
 * 直接返回 目的是为了保持 Service Worker 活跃
 * @author LiuQi
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(function () {
    return;
});

/**
 * onConnect 监听来自其他部分（如 content script）尝试与当前脚本建立连接的请求
 * @author LiuQi
 */
chrome.runtime.onConnect.addListener(function (Port) {
    // 如果有错误，或者连接的端口名称不是 "HeartBeat"，则直接返回，不处理该连接
    if (chrome.runtime.lastError || Port.name !== "HeartBeat") return;
    // 向连接的端口发送一条 "HeartBeat" 消息，用于测试或保活
    Port.postMessage("HeartBeat");
    // 为该端口添加消息监听器，收到消息时执行回调
    Port.onMessage.addListener(function (message, Port) {
        return;
    });
    // 设置一个定时器，250000 毫秒（即 4 分钟 10 秒）后断开该连接
    const interval = setInterval(function () {
        clearInterval(interval); // 清除定时器自身，防止重复执行
        Port.disconnect(); // 主动断开与该端口的连接
    }, 250000);
    // 监听该端口的断开事件，当端口断开时，清除可能存在的定时器
    Port.onDisconnect.addListener(function () {
        interval && clearInterval(interval); // 如果定时器存在，则清除它
        if (chrome.runtime.lastError) return; // 如果有错误，直接返回
    });
});

/**
 * onAlarm 监听定时器触发事件
 * @author LiuQi
 */
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "nowClear" || alarm.name === "clear") {
        // 清理冗余数据
        clearRedundant();
    }
    if (alarm.name === "save") {
        console.log(" // TODO background.js if (alarm.name === 'save') ");
    }

});

/**
 * onSendHeaders 监听所有网站发出的网络请求的「请求头发送阶段」
 * 注册一个 webRequest 监听器，监听浏览器即将发送请求头时的事件 用途：在请求即将发出前，获取请求头信息，并可能进行媒体资源检测等操作
 * @author LiuQi
 */
chrome.webRequest.onSendHeaders.addListener(
    function (details) { // 监听器的回调函数，当有请求即将发送请求头时触发
        // 如果全局对象 G 不存在，或者同步配置未初始化完成（G.initializeSyncComplete 为 false），或者扩展处于禁用状态（G.enable 为 false）
        // 则直接 return，不做任何处理，避免在扩展未就绪时操作
        if (G && G.initializeSyncComplete && !G.enable) return;

        // 如果当前请求的 details 中包含 requestHeaders（即请求头信息）
        if (details.requestHeaders) {
            // 将该请求的 requestId 作为键，对应的请求头数组 details.requestHeaders 保存到全局 Map G.requestHeaders 中
            // 作用：后续可能根据 requestId 查找该请求的请求头信息
            G.requestHeaders.set(details.requestId, details.requestHeaders);
            // 同时，将请求头信息也附加到 details 对象本身的 allRequestHeaders
            details.allRequestHeaders = details.requestHeaders;
        }
        try {
            // 调用searchForMedia
            // 推测是检测该请求是否与媒体资源（如视频、音频、m3u8、mp4等）相关，可能会根据请求头、URL、资源类型等做筛选或记录
            searchForMedia(details, true);
        } catch (e) {
            console.log(e);
        }
    },
    {urls: ["<all_urls>"]}, // 过滤器：监听所有 URL
    ["requestHeaders", chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean) // 额外信息：需要请求头数据
);

/**
 * onResponseStarted 监听所有网站网络请求的「响应开始阶段」（服务器开始返回数据）浏览器接收到第一个字节触发，保证有更多信息判断资源类型
 * 注册一个 webRequest 监听器，用于监听浏览器接收到网络响应的起始阶段（即响应头刚到达时） 用途：尝试获取该请求之前保存的请求头信息，并对响应内容进行媒体资源检测等操作
 * @author LiuQi
 */
chrome.webRequest.onResponseStarted.addListener(function (details) {// 回调函数：当某个网络请求收到了服务器的响应（响应头已到达）时触发
        try {
            // 尝试从全局对象 G 的 requestHeaders（一个 Map）中，根据当前请求的 requestId 获取之前保存的请求头信息
            // 这个请求头信息是在 onSendHeaders 阶段由 G.requestHeaders.set(details.requestId, details.requestHeaders) 保存的
            details.allRequestHeaders = G.requestHeaders.get(details.requestId);
            if (details.allRequestHeaders) {  // 如果成功获取到了请求头信息（即 allRequestHeaders 非空）
                // 从 G.requestHeaders 这个 Map 中删除该 requestId 对应的请求头缓存
                // 目的是避免内存泄漏，因为请求已经响应了，不再需要保留它的请求头
                G.requestHeaders.delete(details.requestId);
            }
            // Search for media 查找/搜索媒体 检测该响应是否与媒体资源（如 mp4、m3u8、直播流等）相关
            searchForMedia(details);
        } catch (e) {
            console.log(e, details);
        }
    }, {urls: ["<all_urls>"]}, // 过滤器：监听所有 URL
    ["responseHeaders"] // 额外信息：需要请求头数据
);

/**
 * onErrorOccurred 注册一个 webRequest 监听器，用于监听所有网络请求发生错误时的事件 用途：当请求失败时，清理与该请求相关的缓存数据（如请求头和黑名单标记），防止内存泄漏或状态混乱
 * @author LiuQi
 */
chrome.webRequest.onErrorOccurred.addListener(function (details) { // 回调函数：当某个请求发生错误时触发
        // 从全局 Map 对象 G.requestHeaders 中，根据当前请求的 requestId 删除之前保存的请求头信息
        // 目的：请求已经失败，不再需要保留它的请求头，清理以节省内存，避免残留无效数据
        G.requestHeaders.delete(details.requestId);
        // 从全局 Set 对象 G.blackList 中，根据当前请求的 requestId 删除该请求的黑名单标记
        // 目的：如果之前因为某些原因（比如误判、临时屏蔽）将此请求标记为黑名单，现在请求失败了，也清除该标记
        G.blackList.delete(details.requestId);
    },
// 过滤器：指定要监听哪些请求的“错误发生”事件
// { urls: ["<all_urls>"] } 表示监听所有 URL 的请求错误，没有任何域名或协议的限制
    {urls: ["<all_urls>"]});

/**
 * onMessage 监听 扩展 message 事件
 * @author LiuQi
 */
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (chrome.runtime.lastError) return;
    if (!G.initializeLocalComplete || !G.initializeSyncComplete) {
        console.log("TODO background.js chrome.runtime.onMessage if(!G.initializeLocalComplete || !G.initializeSyncComplete) .....")
    }
    // 以下检查是否有 tabId 不存在使用当前标签
    message.tabId = message.tabId ?? G.tabId;
    // 从缓存中保存数据到本地
    if (message.Message === "pushData") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'pushData') ... ");
    }
    // 获取所有数据
    if (message.Message === "getAllData") {
        sendResponse(cacheData);
        return true;
    }
    /**
     * 设置扩展图标数字
     * 提供 type 删除标签为 tabId 的数字
     * 不提供type 删除所有标签的数字
     */
    if (message.Message === "clearIcon") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'clearIcon')  ... ");
    }
    // 启用/禁用扩展
    if (message.Message === "enable") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'enable')  ... ");
    }
    // 提供requestId数组 获取指定的数据
    if (message.Message === "getData" && message.requestId) {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'getData' && message.requestId)  ... ", message.requestId);
    }
    // 提供 tabId 获取该标签数据
    if (message.Message === "getData") {
        sendResponse(cacheData[message.tabId]);
        return true;
    }
    // 获取各按钮状态
    // 模拟手机 自动下载 启用 以及各种脚本状态
    if (message.Message === "getButtonState") {
        let state = {
            // 移动端用户代理
            MobileUserAgent: G.featMobileTabId.has(message.tabId),
            // 自动下载
            AutoDown: G.featAutoDownTabId.has(message.tabId),
            // 启用
            enable: G.enable,
        };
        // 遍历全局的脚本列表
        G.scriptList.forEach((item) => {
            // 脚本列表中的每一项，检查其对应的 tabId 集合中是否包含当前 message.tabId
            // 将结果以 item.key 为属性名，存储到 state 对象中
            state[item.key] = item.tabId.has(message.tabId);
        });
        // 将构建好的状态对象通过 sendResponse 方法返回给调用方
        sendResponse(state);
        return true;
    }
    // 对tabId的标签 进行模拟手机操作
    if (message.Message === "mobileUserAgent") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'mobileUserAgent') ... ");
    }
    // 对tabId的标签 开启 关闭 自动下载
    if (message.Message === "autoDown") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'autoDown') ... ");
    }
    // 对tabId的标签 脚本注入或删除
    if (message.Message === "script") {
        // 检查当前请求的脚本（message.script）是否存在于全局的脚本列表 G.scriptList 中
        if (!G.scriptList.has(message.script)) {
            // 如果不存在，向发送方返回错误信息，并终止处理
            sendResponse("Error no exists");
            return false;
        }
        // 获取当前请求的脚本对象
        const script = G.scriptList.get(message.script);
        // 获取该脚本所关联的标签页ID集合
        const scriptTabId = script.tabId;
        // 获取该脚本的刷新配置，如果消息中没有传递 refresh 参数，则使用脚本默认的 refresh 值
        const refresh = message.refresh ?? script.refresh;
        if (scriptTabId.has(message.tabId)) { // 当前标签页（message.tabId）是否已经在该脚本的 tabId 集合中（即是否已启用该脚本）
            //如果已启用，则从集合中移除
            scriptTabId.delete(message.tabId);
            if (message.script === "search.js") { // 当前操作针对的脚本是 "search.js"，则记录当前标签页被临时关闭了深度搜索功能
                G.deepSearchTemporarilyClose = message.tabId;
            }
            // 如果配置了刷新（refresh 为 true），则重新加载当前标签页，并跳过缓存
            refresh && chrome.tabs.reload(message.tabId, {bypassCache: true});
            // 向发送方返回操作成功的信息
            sendResponse("OK");
            return true;
        }
        // message.tabId 添加到脚本的 tabId 集合中
        scriptTabId.add(message.tabId);
        if (refresh) { // 如果配置了刷新（refresh 为 true），则重新加载当前标签页，并跳过缓存
            chrome.tabs.reload(message.tabId, {bypassCache: true});
        } else {
            console.warn(" //TODO else refresh ..........")
        }
        // 向发送方返回操作成功的信息
        sendResponse("OK");
        return true;
    }
    // 脚本注入 脚本申请多语言文件
    if (message.Message === "scriptI18n") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'scriptI18n') ... ");
    }
    // Heart Beat
    if (message.Message === "HeartBeat") {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                G.tabId = tabs[0].id;
            }
        });
        sendResponse("HeartBeat OK");
        return true;
    }
    // 清理数据
    if (message.Message === "clearData") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'clearData') ... ");
    }
    // 清理冗余数据
    if (message.Message === "clearRedundant") {
        clearRedundant();
        sendResponse("OK");
        return true;
    }
    // 从 content-script 或 capture-script 传来的媒体url
    if (message.Message === "addMedia") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'addMedia') ... ");
    }
    // ffmpeg网页通信
    if (message.Message === "captureFFmpeg") {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'captureFFmpeg') ... ");
    }
    // 发送数据到本地
    if (message.Message === "send2local" && G.send2local) {
        console.log(" // TODO background.js chrome.runtime.onMessage if(message.Message == 'send2local'&& G.send2local) ... ");
    }
});

/**
 * onActivated 监听浏览器标签页激活事件，更新全局标签页ID并同步扩展图标状态
 * @param {Object} activeInfo - Chrome API提供的标签页激活信息对象，包含：
 * - tabId {number} 当前被激活标签页的唯一标识符
 * - windowId {number} 标签页所属窗口的唯一标识符
 * @author LiuQi
 */
chrome.tabs.onActivated.addListener(function (activeInfo) {
    // 更新全局当前标签页ID
    G.tabId = activeInfo.tabId;
    // 检查当前标签页是否有缓存数据
    if (cacheData[G.tabId] !== undefined) {
        // 存在缓存数据：更新图标徽章，显示数据条数
        setExtensionIcon({number: cacheData[G.tabId].length, tabId: G.tabId});
        return;
    }
    // 无缓存数据：清除图标徽章
    setExtensionIcon({tabId: G.tabId});
});

/**
 * onRemoved 监听 标签关闭清理数据
 * @author LiuQi
 */
chrome.tabs.onRemoved.addListener(function (tabId) {
    // 清理缓存数据
    chrome.alarms.get("nowClear", function (alarm) {
        !alarm && chrome.alarms.create("nowClear", {when: Date.now() + 1000});
        if (G.initializeSyncComplete) {
            G.blockUrlSet.has(tabId) && G.blockUrlSet.delete(tabId);
        }
    });
});

/**
 * onUpdated
 * @author LiuQi
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (isSpecialPage(tab.url) || tabId <= 0 || !G.initializeSyncComplete) return;
    if (changeInfo.status && changeInfo.status === "loading" && G.autoClearMode === 2) {
        console.log(" // TODO background.js if (changeInfo.status && changeInfo.status == 'loading' && G.autoClearMode == 2) ... ");
    }
    if (changeInfo.url && tabId > 0 && G.blockUrl.length) {
        console / log(" // TODO if(changeInfo.url && tabId > 0 && G.blockUrl.length) ....");
    }
    chrome.sidePanel.setOptions({
        tabId,
        path: "popup.html?tabId=" + tabId
    });
});

/**
 * onCommitted 监听 frame 正在载入
 * 检查 是否在屏蔽列表中 (frameId == 0 为主框架)
 * 检查 自动清理 (frameId == 0 为主框架)
 * 检查 注入脚本
 * @author LiuQi
 */
chrome.webNavigation.onCommitted.addListener(function (details) {
    if (isSpecialPage(details.url) || details.tabId <= 0 || !G.initializeSyncComplete) return;
    // 刷新页面 检查是否在屏蔽列表中
    if (details.frameId === 0 && details.transitionType === "reload") {
        G.blockUrlSet.delete(details.tabId);
        if (isLockUrl(details.url)) {
            console.log(" // TODO background,js onCommitted 监听 frame 正在载入  if(isLockUrl(details.url)) ..... ");
        }
    }
    // 刷新清理角标数
    if (details.frameId === 0 && (!["auto_subframe", "manual_subframe", "form_submit"].includes(details.transitionType)) && G.autoClearMode == 1) {
        delete cacheData[details.tabId];
        G.urlMap.delete(details.tabId);
        (chrome.storage.session ?? chrome.storage.local).set({MediaData: cacheData});
        setExtensionIcon({tabId: details.tabId});
    }
    if (G.version < 102) return;
    if (G.deepSearch && G.deepSearchTemporarilyClose !== details.tabId) {
        console.log(" // TODO if (G.deepSearch && G.deepSearchTemporarilyClose != details.tabId) ...... ");
    }
    // capture-script 脚本
    G.scriptList.forEach(function (item, script) { // 遍历全局的脚本列表 G.scriptList，对每一个注册的脚本项进行处理
        // 如果当前标签页（details.tabId）不在该脚本的启用标签页集合中（item.tabId），或者该脚本不支持所有框架（item.allFrames 为 false），则跳过此次处理
        if (!item.tabId.has(details.tabId) || !item.allFrames) return true;
        // 构建要注入的脚本文件路径数组，默认只注入当前脚本文件：`capture-script/${script}`
        const files = [`capture-script/${script}`];
        // 如果该脚本项配置了 i18n（国际化支持），则优先注入国际化脚本 `capture-script/i18n.js`
        item.i18n && files.unshift("capture-script/i18n.js");
        // 使用 Chrome 的 scripting API 注入脚本到指定的标签页和框架中
        chrome.scripting.executeScript({
            // 指定注入目标：标签页 ID 和框架 ID
            target: {tabId: details.tabId, frameIds: [details.frameId]},
            // 指定要注入的脚本文件路径数组
            files,
            // 设置为 true 表示尽可能立即注入（而不是等待页面加载完成等时机）
            injectImmediately: true,
            // 指定脚本运行的世界：可以是 'MAIN'（主世界，与页面JS同环境）或 'ISOLATED'（隔离世界，默认）
            world: item.world
        });
    });
});

/**
 * onCompleted 监听 页面完全加载完成 判断是否在线ffmpeg页面
 * @author LiuQi
 */
chrome.webNavigation.onCompleted.addListener(function (details) {
    if (G.ffmpegConfig.tab && details.tabId === G.ffmpegConfig.tab) {
        console.log(" // TODO background.js chrome.webNavigation.onCompleted ... ", details);
    }
});

/**
 * onCommand
 * @author LiuQi
 */
chrome.commands.onCommand.addListener(function () {
    console.log(" // TODO background.js chrome.commands.onCommand ... ");
});

/**
 * searchForMedia 查找/搜索媒体
 * @param {Object} - data 通常是 chrome.webRequest API 提供的请求或响应详情对象，比如包含 tabId、url、requestHeaders、responseHeaders 等
 * @param {boolean} [isRegex=false] - 是否启用正则匹配模式（默认为 false，未使用）
 * @param {boolean} [filter=false] - 是否启用某种过滤逻辑（默认为 false，未使用）
 * @param {boolean} [timer=false] - 标记是否为定时器调用，如果是则直接返回，避免递归/循环（默认为 false）
 * @author LiuQi
 */
function searchForMedia(data, isRegex = false, filter = false, timer = false) {
    // 如果 timer 为 true，说明当前是定时器触发的调用，直接 return，避免重复处理或死循环
    if (timer) return;
    // Service Worker被强行杀死之后重新自我唤醒，等待全局变量初始化完成。
    // 以下为一整套「保护逻辑」，用于确保当前扩展环境已经准备就绪，再执行核心的媒体检测逻辑
    // 如果以下任一条件不满足，说明扩展尚未初始化完成，或运行环境异常，此时不执行检测，而是延迟重试
    if (!G // 全局对象 G 未定义
        || !G.initializeSyncComplete // 同步配置（如支持的媒体类型、规则等）还未从 chrome.storage.sync 加载完成
        || !G.initializeLocalComplete // 本地配置（如标签页集合、媒体控制状态等）还未从 chrome.storage.local/session 加载完成
        || G.tabId === undefined // 当前活跃标签页 ID 未获取到
        || cacheData.initialize // 缓存对象 cacheData 仍处在初始化状态（cacheData.initialize === true 表示未初始化完成）
    ) {
        setTimeout(() => { // 定时器延迟重试 递归
            // 自身函数调用 开启定时器
            searchForMedia(data, isRegex, filter, true);
        }, 233)
        return;
    }
    // 检查当前标签页是否在阻止访问的 URL 列表中
    const blockUrlFlag = data.tabId && data.tabId > 0 && G.blockUrlSet.has(data.tabId);
    if (!G.enable // 扩展未启用
        || (G.blockUrlWhite ? !blockUrlFlag : blockUrlFlag)) return; // 根据白名单/黑名单逻辑判断是否允许访问
    // 记录请求时间戳
    data.getTime = Date.now();
    // 如果未启用正则匹配且请求 ID 在黑名单中，则删除该请求 ID 并返回
    if (!isRegex && G.blackList.has(data.requestId)) {
        G.blackList.delete(data.requestId);
        return;
    }
    // 排除特殊页面的请求
    if (data.initiator !== "null" && data.initiator !== undefined && isSpecialPage(data.initiator)) return;
    // 对 Firefox 特殊处理，排除特定来源的请求
    if (G.isFirefox && data.originUrl && isSpecialPage(data.originUrl)) return;
    // 屏蔽特殊页面的资源
    if (isSpecialPage(data.url)) return;
    // 解析 URL 路径，提取文件名和扩展名
    const urlParsing = new URL(data.url);
    let [name, ext] = fileNameParse(urlParsing.pathname);
    // 如果启用正则匹配模式且未启用过滤逻辑，则遍历正则表达式进行匹配
    if (isRegex && !filter) {
        console.log(" background.js 正则 ........");
        for (let key in G.Regex) {
            if (!G.Regex[key].state) continue;
            console.log(" // TODO background.js if(isRegex && !filter) ......... ");
        }
        return;
    }
    // 如果未启用正则匹配模式，则执行以下过滤和检查逻辑
    if (!isRegex) {
        console.log(" background.js 非正则 ........");
        // 获取响应头信息
        data.header = getResponseHeadersValue(data);
        // 检查文件扩展名，若存在且未启用过滤，则进行扩展名过滤
        if (!filter && ext !== undefined) {
            filter = checkExtension(ext, data.header?.size);
            if (filter === "break") return;
        }
        // 检查 MIME 类型，若存在且未启用过滤，则进行类型过滤
        if (!filter && data.header?.type !== undefined) {
            filter = checkType(data.header.type, data.header?.size);
            if (filter === "break") return;
        }
        // // 查找附件信息，若存在则记录
        if (!filter && data.header?.attachment !== undefined) {
            console.log(" // TODO background.js 查找附件..........  ", reFilename);
        }
        // 类型为media的资源放行
        if (data.type === "media") {
            filter = true;
        }
    }
    // 如果未通过过滤，则直接返回
    if (!filter) return;

    // 获取得资源 tabId可能为 -1 firefox中则正常，检查是 -1 使用当前激活标签得tabID
    data.tabId = data.tabId === -1 ? G.tabId : data.tabId;
    // 初始化 cacheData 对应 tabId 的缓存数组，若不存在则创建
    cacheData[data.tabId] ??= [];
    cacheData[G.tabId] ??= [];
    // 缓存数据大于9999条 清空缓存 避免内存占用过多
    if (cacheData[data.tabId].length > G.maxLength) {
        console.log(" // TODO background.js 缓存数据大于9999条 清空缓存 避免内存占用过多 ");
    }
    // 如果启用去重检查，并且当前标签页的缓存数量未达到上限（500），则执行去重逻辑
    if (G.checkDuplicates && cacheData[data.tabId].length <= 500) {
        const tabFingerprints = G.urlMap.get(data.tabId) || new Set();
        if (tabFingerprints.has(data.url)) return; // 找到重复，直接返回
        tabFingerprints.add(data.url);
        G.urlMap.set(data.tabId, tabFingerprints);
        // 当某个标签页的 URL 集合达到 500 条时，清空该集合以释放内存
        if (tabFingerprints.size >= 500) tabFingerprints.clear();
    }
    // 获取当前标签页的详细信息
    chrome.tabs.get(data.tabId, async function (webInfo) {
        // 如果获取标签页信息失败（如标签页已关闭），则直接返回
        if (chrome.runtime.lastError) return;
        // 获取请求头信息
        data.requestHeaders = getRequestHeaders(data);
        // 如果请求头中包含 Cookie，则提取并存储到 data.cookie 中，同时从 requestHeaders 中移除 Cookie 字段
        if (data.requestHeaders?.cookie) {
            data.cookie = data.requestHeaders.cookie;
            data.requestHeaders.cookie = undefined;
        }
        // 构建包含媒体资源详细信息的对象 info
        const info = {
            name,
            url: data.url,
            size: data.header?.size,
            ext,
            type: data.mime ?? data.header?.type,
            tabId: data.tabId,
            isRegex,
            requestId: data.requestId ?? Date.now().toString(),
            initiator: data.initiator,
            requestHeaders: data.requestHeaders,
            cookie: data.cookie,
            getTime: data.getTime
        };
        // 不存在扩展使用类型 如果 info.ext 未定义但 info.type 存在，则提取 MIME 类型的子类型作为扩展名
        if (info.ext === undefined && info.type !== undefined) {
            info.ext = info.type.split("/")[1];
        }
        // 正则匹配的备注扩展 如果存在额外的扩展名信息，则使用其作为扩展名
        if (data.extraExt) {
            info.ext = data.extraExt;
        }
        // 不存在 initiator 和 referer 使用web url代替initiator
        if (info.initiator === undefined || info.initiator === "null") {
            info.initiator = info.requestHeaders?.referer ?? webInfo?.url;
        }
        // 装载页面信息 设置页面标题、收藏图标 URL 和网页 URL
        info.title = webInfo?.title ?? "NULL";
        info.favIconUrl = webInfo?.favIconUrl;
        info.webUrl = webInfo?.url;
        // 屏蔽资源 再次检查黑名单，若请求 ID 在黑名单中，则屏蔽资源
        if (!isRegex && G.blackList.has(data.requestId)) {
            console.log(" // TODO background.js if(!isRegex && G.blackList.has(data.requestId))  屏蔽资源 ");
        }
        // 发送 info 对象到 popup 页面，并检查是否需要自动下载
        chrome.runtime.sendMessage({Message: "popupAddData", data: info}, function () {
            // 如果配置了自动下载的标签页 ID 集合，并且当前标签页在集合中，且 downloads API 可用
            if (G.featAutoDownTabId.size > 0 && G.featAutoDownTabId.has(info.tabId) && chrome.downloads?.State) {
                console.log(" // TODO background.js  发送到popup 并检查自动下载 ..... ", G.featAutoDownTabId.size, chrome.downloads?.State);
            }
            // 如果发送消息过程中发生错误，则直接返回
            if (chrome.runtime.lastError) return;
        });
        // 数据发送 如果配置了 G.send2local，则执行相应的数据发送逻辑
        if (G.send2local) {
            console.log(" // TODO background.js  数据发送 .....");
        }
        // 储存数据 将 info 对象存储到 cacheData 中对应的 tabId 数组里
        cacheData[info.tabId] ??= [];
        cacheData[info.tabId].push(info);

        // 当前标签媒体数量大于100 开启防抖 等待5秒储存 或 积累10个资源储存一次。
        if (cacheData[info.tabId].length >= 100 && debounceCount <= 10) {
            console.log(" // TODO background.js 当前标签媒体数量大于100 开启防抖 等待5秒储存 或 积累10个资源储存一次 ...... ");
        }
        // 时间间隔小于500毫秒 等待2秒储存
        if (Date.now() - debounceTime <= 500) {
            clearTimeout(debounce);
            debounceTime = Date.now();
            debounce = setTimeout(function () {
                dataStorage(info.tabId);
            }, 2000);
            return;
        }
        // 缓存数据存储
        dataStorage(info.tabId);
    });
}
