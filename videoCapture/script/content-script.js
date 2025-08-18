(function () {
    /**
     * onMessage 监听来自其他部分（如 content script、popup 或其他扩展组件）发送的消息
     * @param  Message       消息对象
     * @param  sender
     * @param sendResponse
     * @author LiuQi
     */
    chrome.runtime.onMessage.addListener(function (Message, sender, sendResponse) {
        window.alert("message?: DOMString");
    });

    /**
     * message  监听来自当前页面（即网页脚本，比如通过 window.postMessage 发送的消息）发送的消息
     * @param event
     * @author LiuQi
     */
    window.addEventListener("message", (event) => {
        if (!event.data || !event.data.action) return;
        console.log(" Action ", event.data.action);
        console.error("Event -- ", event.data, " =======   ", event.data.action);
    });

    // 声明一个变量 Port，用于保存与 background script 或其他部分建立的通信端口
    let Port;

    /**
     * connect 定义一个函数 connect，用于建立与 Chrome 扩展后台（通常是 service worker 或 background script）的连接
     * @author LiuQi
     */
    function connect() {
        // 使用 chrome.runtime.connect 建立一个命名连接，连接名为 "HeartBeat"
        Port = chrome.runtime.connect(chrome.runtime.id, {name: "HeartBeat"});
        // 向连接的端口发送一条消息 "HeartBeat"，用于保活或通信测试
        Port.postMessage("HeartBeat");
        // 为端口添加一个消息监听器，当接收到消息时执行回调
        Port.onMessage.addListener(function (message, Port) {
            return true;
        });
        // 监听端口断开事件，一旦断开，则重新调用 connect 函数尝试重连，实现心跳保活机制
        Port.onDisconnect.addListener(connect);
    };
    // 页面加载后调用 connect 函数，启动连接
    connect();
})();