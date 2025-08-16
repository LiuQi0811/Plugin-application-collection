// This is background.js
console.log("🔥 Background Service Worker 已启动！");

/**
 * onInstalled 监听安装事件（用于调试）
 * @author LiuQi
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ 扩展已安装或更新");
});

// Service Worker 5分钟后会强制终止扩展
// https://bugs.chromium.org/p/chromium/issues/detail?id=1271154
// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/70003493#70003493

/**
 * onBeforeNavigate 监听 webNavigation 的 onBeforeNavigate 事件（即用户即将导航到新页面前触发）
 * 直接返回 目的是为了保持 Service Worker 活跃
 * @author LiuQi
 */
chrome.webNavigation.onBeforeNavigate.addListener(function() {
	return;
});

/**
 * onHistoryStateUpdated 监听 webNavigation 的 onHistoryStateUpdated 事件（即通过 History API 更新页面状态时触发，比如 SPA 页面路由变化）
 * 直接返回 目的是为了保持 Service Worker 活跃
 * @author LiuQi
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(function(){
	return;
});

/**
 * onConnect 监听来自其他部分（如 content script）尝试与当前脚本建立连接的请求
 * @author LiuQi
 */
chrome.runtime.onConnect.addListener(function(Port){
	// 如果有错误，或者连接的端口名称不是 "HeartBeat"，则直接返回，不处理该连接
	if(chrome.runtime.lastError || Port.name !== "HeartBeat")return;
	// 向连接的端口发送一条 "HeartBeat" 消息，用于测试或保活
	Port.postMessage("HeartBeat");
	// 为该端口添加消息监听器，收到消息时执行回调
	Port.onMessage.addListener(function (message, Port) { return; });
	// 设置一个定时器，250000 毫秒（即 4 分钟 10 秒）后断开该连接
	const interval = setInterval(function(){
		clearInterval(interval); // 清除定时器自身，防止重复执行
		Port.disconnect(); // 主动断开与该端口的连接
	},250000);
	// 监听该端口的断开事件，当端口断开时，清除可能存在的定时器
	Port.onDisconnect.addListener(function(){
		interval && clearInterval(interval); // 如果定时器存在，则清除它
		if(chrome.runtime.lastError)return; // 如果有错误，直接返回
	});
});