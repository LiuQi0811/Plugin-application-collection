// url 参数解析（解析当前页面 URL 中的查询参数）
const params = new URL(location.href).searchParams;
// 获取url
let _url = params.get("url");
// 获取 requestHeaders
const _requestHeaders = params.get("requestHeaders");
// 尝试将 requestHeaders 字符串解析为对象
let requestHeaders = JSONParse(_requestHeaders);
// 设置请求头并初始化页面（初始化函数会在请求头设置回调中触发）
setRequestHeaders(requestHeaders, () => {
    // 等待全局变量 G
    awaitVariableG(initialize);
});

/**
 * initialize 初始化主流程 （负责加载样式、判断数据来源（URL参数或用户输入）、绑定事件等）
 * @author LiuQi
 */
function initialize() {
    // 加载页面所需的 CSS 样式（包括移动端适配和内联样式）
    loadedCSS();
    // 定义 JSONViewer 的展示选项：默认折叠、根节点不可折叠、键名不带引号样式、支持 URL 自动链接
    const options = {
        collapsed: true,
        rootCollapsable: false,
        withQuotes: false,
        withLinks: true
    };
    // 用于存放最终解析的 JSON 内容
    let jsonContent = "";
    if (isEmpty(_url)) { // 如果 URL 参数中没有传入 "url"，则显示自定义输入区域，隐藏主展示区
        document.getElementById("json-custom").style.display = "block";
        document.getElementById("main").style.display = "none";
        // 绑定“格式化/加载”按钮点击事件
        document.getElementById("format").addEventListener("click", function () {
            // 用户手动输入新的 JSON 数据地址
            _url = document.getElementById("json-url").value.trim();
            if (isEmpty(_url)) { // 如果用户未输入地址，则尝试使用文本框中的 JSON 内容进行解析
                let jsonText = document.getElementById("json-text").value;
                // 直接解析用户输入的 JSON 文本
                jsonContent = JSON.parse(jsonText);
                // 渲染 JSON 到页面
                renderJSON(jsonContent, options);
            } else {
                // 如果用户输入了地址，则通过网络请求加载该地址的 JSON 数据
                getJSON(_url, options);
            }
        });
    } else {
        // 如果 URL 中已传入 "url" 参数，则直接加载该地址的 JSON 数据
        getJSON(_url, options);
    }
    // collapsed 展开节点事件 绑定“折叠/展开全部节点”按钮的点击事件
    const _collapsed = document.getElementById("collapsed");
    _collapsed.addEventListener("click", function () {
        // 切换折叠状态
        options.collapsed = !options.collapsed
        if (options.collapsed) { // 折叠节点 - 开启
            _collapsed.textContent = i18n.expandAllNodes;
        } else { // 折叠节点 - 关闭
            _collapsed.textContent = i18n.collapseAllNodes;
        }

    });
}


/**
 * getJSON 从指定 URL 获取 JSON 数据（支持自动清理与容错解析）
 * @param {string} url - 目标 JSON 数据地址
 * @param {Object} options - JSONViewer 展示配置选项
 * @returns {Promise<void>}
 * @author LiuQi
 */
async function getJSON(url, options) {
    try {
        // 隐藏自定义输入区，显示主 JSON 展示区域
        document.getElementById("json-custom").style.display = "none";
        document.getElementById("main").style.display = "block";
        // 发起网络请求，获取目标地址的文本内容
        const result = await fetchData(url, "text");
        // 尝试清理常见的 JSONP 或自执行脚本包裹（如 try{}catch{} 或 ={}() 等格式）
        let cleanedResult = result
            .replace(/^try{/, "")
            .replace(/}catch\(e\){.*}$/gi, "");
        try {
            // 直接尝试解析清理后的文本为 JSON
            jsonContent = JSON.parse(cleanedResult);
            // 渲染 JSON 到页面
            renderJSON(jsonContent, options);
        } catch (error) {// 如果直接解析失败，尝试通过常见正则模式提取 JSON 字符串
            console.error("直接解析 JSON 失败，尝试提取：", error);
            const regexPatterns = [
                /^.*=({.*}).*$/,
                /^.*\(({.*})\).*/
            ];
            let extractedJsonStr = null;
            for (let regex of regexPatterns) { // 遍历正则，尝试匹配并提取有效的 JSON 字符串
                const match = regex.exec(cleanedResult);
                if (match && match[1]) {
                    extractedJsonStr = match[1];
                    console.log("提取到的 JSON 字符串:", extractedJsonStr);
                    break;
                }
            }
            if (extractedJsonStr) { // 如果成功提取到 JSON 字符串，则使用该字符串进行解析
                cleanedResult = extractedJsonStr;
                jsonContent = JSON.parse(cleanedResult);
            } else { // 如果所有提取方式都失败，抛出错误
                throw new Error("无法从返回的文本中提取有效的 JSON 数据");
            }
            console.log("最终解析的 JSON 内容: ", jsonContent);
            // 渲染最终解析得到的 JSON
            renderJSON(jsonContent, options);
        }
    } catch (error_) { // 如果加载或解析失败，向页面展示错误提示，并隐藏折叠按钮
        console.error("加载或解析 JSON 失败: ", error_);
        const renderer = document.getElementById("json-renderer");
        const collapsed = document.getElementById("collapsed");
        if (renderer) {
            renderer.insertAdjacentHTML("beforeend", i18n.fileRetrievalFailed);
        }
        if (collapsed) {
            collapsed.style.display = "none";
        }
    }
}

/**
 * renderJSON 将 JSON 数据渲染到页面指定容器中
 * @param {Object} jsonContent - 要展示的 JSON 数据
 * @param {Object} options - JSONViewer 配置选项
 * @author LiuQi
 */
function renderJSON(jsonContent, options) {
    // 调用 JSONViewer 函数，将 JSON 渲染到 id 为 json-renderer 的 DOM 元素中
    jsonViewer(document.getElementById("json-renderer"), jsonContent, options);
}
