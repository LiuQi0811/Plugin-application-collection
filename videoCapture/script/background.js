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
    console.log(" // TODO chrome.alarms.onAlarm ", alarm);
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
 * searchForMedia 查找/搜索媒体
 * @param data 通常是 chrome.webRequest API 提供的请求或响应详情对象，比如包含 tabId、url、requestHeaders、responseHeaders 等
 * @param isRegex 是否启用正则匹配模式（默认为 false，未使用）
 * @param filter 是否启用某种过滤逻辑（默认为 false，未使用）
 * @param timer 标记是否为定时器调用，如果是则直接返回，避免递归/循环（默认为 false）
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

    console.error(" // TODO T ", data.tabId);
}
