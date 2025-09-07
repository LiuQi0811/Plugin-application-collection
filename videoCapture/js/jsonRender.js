/**
 * renderJSONViewer  JSON 可视化渲染器
 * JSON 可视化渲染器：将 JSON 数据（对象/数组）以可交互、可折叠的 HTML 形式渲染到指定的 DOM 元素中
 * @param {HTMLElement} element - 要插入 JSON 视图的 DOM 元素，比如 document.getElementById('json-renderer')
 * @param {Object|Array} json - 要展示的 JSON 对象或数组
 * @param {Object} options - 配置选项，用于控制渲染和交互行为
 * @author LiuQi
 */
function renderJSONViewer(element, json, options = {}) {
    if (!element || !(element instanceof HTMLElement)) { // 校验传入的 element 是否是一个有效的 DOM 元素
        console.error(" renderJSONViewer: 第一个参数必须是一个有效的 DOM 元素 ");
        return;
    }
    // 定义默认配置项
    const defaultOptions = {
        collapsed: false,           // 是否默认全部折叠
        rootCollapsable: true,      // 根对象是否可折叠
        withQuotes: false,          // 键名是否用引号包裹（样式上）
        withLinks: true,            // 是否将看起来像 URL 的字符串渲染为链接
        bigNumbers: false,          // 是否特殊处理大数字
    };
    // 合并用户传入的 options 和默认配置
    const option = {...defaultOptions, ...options};
    // 渲染DOM 调用 json2HTML 函数，将 JSON 数据转换为带有 HTML 结构和样式的字符串
    let html = json2HTML(json, option);
    if (option.rootCollapsable && isCollapsable(json)) { // 如果启用根级别可折叠，并且根数据本身是可折叠的（非空对象/数组），则在最外层包裹一个折叠按钮
        html = `<a href="#" class="json-toggle root-toggle"></a>` + html;
    }
    // 清空目标容器的内容
    element.innerHTML = "";
    // 为容器添加一个json-document 标识类
    element.classList.add("json-document");
    // 将生成的 JSON HTML 插入到目标 DOM 元素中
    element.innerHTML = html;
    // 为整个容器绑定点击事件，用于处理折叠 / 展开操作
    element.addEventListener("click", function (event) {
        // 查找被点击的元素是否是 .json-toggle 类（即折叠按钮）
        const toggle = event.target.closest(".json-toggle");
        // 如果不是折叠按钮，直接返回，不做处理
        if (!toggle) return;
        alert(" // TODO Json Toggle !!!!");
        // 阻止 a 标签的默认跳转行为
        event.preventDefault();
        // isCollapsed 判断当前 toggle 是否已经处于“折叠”状态
        const isCollapsed = toggle.classList.contains("collapsed");
        if (isCollapsed) { // 如果已折叠，则移除 collapsed 类，表示展开
            toggle.classList.remove("collapsed");
        } else { // 如果未折叠，则添加 collapsed 类，表示折叠
            toggle.classList.add("collapsed");
        }
        // 找到紧邻 toggle 之后的下一个兄弟元素，期望它是一个 <ul> 或 <ol>（即 json 数组/对象的列表容器）
        const nextElementSibling = toggle.nextElementSibling;
        if (nextElementSibling && (nextElementSibling.tagName === "UL" || nextElementSibling.tagName === "OL")) {
            // 根据当前是否隐藏，切换其 display 样式，实现展开/折叠效果
            const isHidden = nextElementSibling.style.display === "none";
            nextElementSibling.style.display = isHidden ? "block" : "none";
        }
    });
}

/**
 * htmlEscape 对字符串中的特殊字符进行 HTML 转义，防止 XSS 攻击或显示问题
 * @param {string} text - 需要转义的原始文本
 * @returns {string} - 转义后的安全文本
 * @author LiuQi
 */
function htmlEscape(text) {
    return text
        .replace(/&/g, "&amp;") // 将 & 转义为 &amp;
        .replace(/</g, "&lt;") // 将 < 转义为 &lt;
        .replace(/>/g, "&gt;") // 将 > 转义为 &gt;
        .replace(/'/g, "&apos;") // 将单引号 ' 转义为 &apos; （注意：HTML5 中通常使用 &#39;，但 &apos; 在 XHTML 中有效）
        .replace(/"/g, "&quot;"); // 将双引号 " 转义为 &quot;
}

/**
 * isUrl 判断给定的文本是否为一个 URL（以常见的协议开头）
 * @param {*} text - 待检测的文本，可以是任意类型，但只有字符串会被判断
 * @returns {boolean} - 如果是 URL 返回 true，否则返回 false
 * @author LiuQi
 */
function isUrl(text) {
    // 常见的 URL 协议类型
    const protocols = ["http", "https", "ftp", "ftps"];
    for (let i = 0; i < protocols.length; ++i) {
        // 检查 text 是否为字符串，并且是否以某个协议 + "://" 开头
        if (typeof text === "string" && text.startsWith(protocols[i] + "://")) {
            return true;
        }
    }
    return false;
}

/**
 * isCollapsable 判断一个值是否是可折叠的对象或数组（即非空对象或非空数组 用于 UI 展示时判断是否可以折叠显示）
 * @param {*} args - 任意类型的值
 * @returns {boolean} - 如果是对象或数组且不为空，则返回 true，否则返回 false
 * @author LiuQi
 */
function isCollapsable(args) {
    // 判断 args 是对象（Object）或数组（Array），并且其键的数量（即属性/元素数量）大于 0
    return (args instanceof Object || args instanceof Array) && Object.keys(args).length > 0;
}

/**
 * json2HTML 将 JSON 数据（包括各种基本类型、对象、数组）转换为带有样式类和交互功能的 HTML 字符串
 * 支持字符串自动转义、URL 自动加链接、对象/数组可折叠等特性
 * @param {any} data - 需要转换的 JSON 数据，可以是字符串、数字、布尔值、对象、数组、null 等
 * @param {Object} options - 可选的配置参数，控制输出格式
 * @author LiuQi
 */
function json2HTML(data, options) {
    if (typeof data === "string") {  // 处理字符串类型
        // 先对字符串中的特殊字符进行 HTML 转义，避免 XSS 和显示错误
        data = htmlEscape(data);
        if (options.withLinks && isUrl(data)) { // 如果启用了 withLinks 选项，并且该字符串是一个 URL，则渲染为超链接
            return `<a href="${data}" class="json-string" target="_blank">${data}</a>`;
        } else { // 如果不是 URL，将原本转义的双引号 \" 还原回 \\"，以便在 HTML 中正确显示
            data = data.replace(/&quot;/g, "\\&quot;");
            // 返回html字符串 span标签 .json-string
            return `<span class="json-string">${data}</span>`;
        }
    } else if (typeof data === "number" || typeof data === "bigint") { // 处理数字或 BigInt 类型
        // 返回html字符串 span标签 .json-literal
        return `<span class="json-literal">${data}</span>`;
    } else if (typeof data === "boolean") { // 处理布尔类型
        // 返回html字符串 span标签 .json-literal
        return `<span class="json-literal">${data}</span>`;
    } else if (data === null) { // 处理 null 值
        // 返回html字符串 span标签 .json-literal
        return `<span class="json-literal">null</span>`;
    } else if (Array.isArray(data)) { // 处理数组类型
        if (data.length === 0) return "[]"; // // 空数组直接返回 []
        // html字符串 使用 ol（有序列表）包裹数组元素
        let html = "[<ol class='json-array'>";
        for (let i = 0; i < data.length; ++i) {
            html += "<li>"; // 每个数组元素用 li 包裹
            if (isCollapsable(data[i])) { // 如果当前元素是“可折叠的”（非空对象或数组），则添加一个折叠/展开的链接按钮
                html += "<a href='#' class='json-toggle'></a>";
            }
            // 递归调用 json2HTML，将当前元素转为 HTML
            html += json2HTML(data[i], options);
            // 如果不是最后一个元素，添加逗号分隔
            if (i < data.length - 1) html += ",";
            html += "</li>";
        }
        // 结束 ol 和数组包裹
        html += "</ol>]";
        // 返回html字符串
        return html;
    } else if (typeof data === "object") { // 处理对象类型
        // 获取对象的所有 key
        const keys = Object.keys(data);
        // 空对象直接返回 {}
        if (keys.length === 0) return "{}";
        // html字符串 使用 ul（无序列表）包裹对象的键值对
        let html = "{<ul class='json-dict'>";
        for (let key of keys) { // 键遍历
            const value = data[key]; // 当前 key 对应的值
            // 根据配置决定是否给 key 加上双引号，一般 JSON 规范中 key 是需要双引号的
            const keyRep = options.withQuotes
                ? `<span class="json-string">"${htmlEscape(key)}"</span>` // 带引号并转义的 key
                : htmlEscape(key);  // 不带引号的 key
            // 每个键值对用 li 包裹
            html += "<li>";
            if (isCollapsable(value)) { // 如果 value 是可折叠的（比如对象或非空数组），则添加一个可点击的折叠按钮
                html += `<a href="#" class="json-toggle">${keyRep}</a>`;
            } else { // 否则直接显示 key
                html += keyRep;
            }
            // 添加冒号和对应的 value（递归处理）
            html += ": " + json2HTML(value, options);
            // 如果不是最后一个键值对，添加逗号分隔
            if (--keys.length > 0) html += ",";
            html += "</li>";
        }
        // 结束 ul 和对象包裹
        html += "</ul>}";
        // 返回html字符串
        return html;
    }
}
