/**
 * JSON Viewer - 原生 JavaScript 版本
 * 功能：将 JSON 数据以可交互、可折叠、高亮的 HTML 形式展示在网页中，非常适合调试和数据展示。
 * 特点：无依赖、轻量级、支持嵌套结构、支持字符串 URL 自动链接化、支持折叠/展开等。
 * @author LiuQi
 */

/**
 * isCollapsable 判断一个值是否是“可折叠的”（即可展开查看子内容的对象或非空数组）
 * 可折叠的条件：
 *   - 是一个对象（非 null），不是数组，且至少含有一个属性；或者
 *   - 是一个数组，且长度大于 0
 * @param {*} arg 任意值
 * @returns {boolean} 如果可折叠返回 true，否则 false
 * @author LiuQi
 */
function isCollapsable(arg) {
    return (
            // 是对象（非 null），不是数组，且有至少一个自有属性
            (typeof arg === "object" && arg !== null) &&
            !Array.isArray(arg) && Object.keys(arg).length > 0
        ) ||
        // 或者是数组，且长度大于 0
        (Array.isArray(arg) && arg.length > 0);
}

/**
 * isUrl 判断一个字符串是否看起来像一个 URL（根据协议前缀判断，比如 http:// 或 https://）
 * @param {string} string 要检测的字符串
 * @returns {boolean} 如果是 URL 返回 true，否则 false
 * @author LiuQi
 */
function isUrl(string) {
    const protocols = ["http", "https", "ftp", "ftps"]; // 支持的协议类型
    for (let i = 0; i < protocols.length; ++i) {
        if (string.startsWith(protocols[i] + "://")) {
            return true; // 匹配到协议开头，认为是 URL
        }
    }
    return false;
}

/**
 * htmlEscape 对字符串进行 HTML 转义，防止 XSS 攻击和显示错误
 * 转义字符包括：&、<、>、'、"
 * @param {string} s 输入的字符串
 * @returns {string} 转义后的安全字符串
 * @author LiuQi
 */
function htmlEscape(text) {
    if (typeof text !== "string") return s; // 如果不是字符串，原样返回
    return text
        .replace(/&/g, "&amp;")   // & 转义为 &amp;
        .replace(/</g, "&lt;")    // < 转义为 &lt;
        .replace(/>/g, "&gt;")    // > 转义为 &gt;
        .replace(/'/g, "&apos;")  // ' 转义为 &apos;
        .replace(/"/g, "&quot;"); // " 转义为 &quot;
}

/**
 * json2html 核心函数：将 JSON 数据（各种类型）转换为 HTML 字符串表示
 * 支持：字符串、数字、布尔值、null、数组、对象
 * 会根据数据类型生成不同的 HTML 标签，并支持嵌套和可折叠结构
 * @param {*} json 任意合法的 JSON 数据
 * @param {Object} options 配置选项，控制展示细节
 * @returns {string} 对应的 HTML 字符串
 * @author LiuQi
 */
function json2html(json, options) {
    let html = "";

    if (typeof json === "string") {
        // 处理字符串类型
        json = htmlEscape(json); // 先转义，避免 XSS 和语法错误

        if (options.withLinks && isUrl(json)) {
            // 如果启用了链接模式，且该字符串是 URL，则渲染为可点击的 <a> 标签
            html += `<a href="${json}" class="json-string" target="_blank">${json}</a>`;
        } else {
            // 普通字符串，用 <span class="json-string">包裹，并确保 &quot; 不被错误解析
            json = json.replace(/&quot;/g, "\\&quot;"); // 避免之前转义的 &quot; 影响显示
            html += `<span class="json-string">"${json}"</span>`;
        }
    } else if (typeof json === "number" || typeof json === "bigint") {
        // 数字或大整数，直接显示在 <span class="json-literal"> 中
        html += `<span class="json-literal">${json}</span>`;
    } else if (typeof json === "boolean") {
        // 布尔值，直接显示
        html += `<span class="json-literal">${json}</span>`;
    } else if (json === null) {
        // null 值特殊显示
        html += `<span class="json-literal">null</span>`;
    } else if (Array.isArray(json)) {
        if (json.length > 0) {
            // 非空数组：使用 <ol>（有序列表）展示每一项，每项用 <li> 包裹
            html += '[<ol class="json-array">';
            for (let i = 0; i < json.length; ++i) {
                html += '<li>';
                if (isCollapsable(json[i])) {
                    // 如果当前项可折叠，添加一个折叠按钮 <a class="json-toggle"></a>
                    html += '<a href class="json-toggle"></a>';
                }
                html += json2html(json[i], options); // 递归处理子元素
                if (i < json.length - 1) {
                    html += ","; // 非最后一项添加逗号分隔
                }
                html += "</li>";
            }
            html += '</ol>]';
        } else {
            // 空数组直接显示 []
            html += "[]";
        }
    } else if (typeof json === "object") {
        const keyCount = Object.keys(json).length;
        if (keyCount > 0) {
            // 非空对象：使用 <ul>（无序列表）展示每个键值对
            html += '{<ul class="json-dict">';
            let count = keyCount;
            for (let key in json) {
                if (Object.prototype.hasOwnProperty.call(json, key)) {
                    key = htmlEscape(key); // 键名也要转义
                    const keyRepresent = options.withQuotes
                        ? `<span class="json-string">"${key}"</span>` // 是否给键名加上引号样式
                        : key;

                    html += '<li>';
                    if (isCollapsable(json[key])) {
                        // 如果值可折叠，键名旁放一个折叠按钮，并显示键名
                        html += `<a href class="json-toggle">${keyRepresent}</a>`;
                    } else {
                        html += keyRepresent; // 否则直接显示键名
                    }
                    html += ": " + json2html(json[key], options); // 递归处理值
                    if (--count > 0) {
                        html += ","; // 非最后一个键值对加逗号
                    }
                    html += "</li>";
                }
            }
            html += "</ul>}";
        } else {
            // 空对象直接显示 {}
            html += "{}";
        }
    }
    return html;
}

/**
 * applyJsonViewer 将 JSON 数据渲染到指定的 DOM 元素中，生成可视化树状结构
 * @param {HTMLElement} element 目标 DOM 元素（比如一个 div）
 * @param {*} json 要展示的 JSON 数据
 * @param {Object} userOptions 用户传入的配置选项
 * @author LiuQi
 */
function applyJsonViewer(element, json, userOptions) {
    const options = Object.assign(
        {},
        {
            collapsed: false,         // 是否默认全部折叠
            rootCollapsable: true,    // 根节点是否可以折叠
            withQuotes: false,        // 键名是否显示为带引号的样式
            withLinks: true,          // 是否将字符串 URL 自动转为链接
            bigNumbers: false,        // （保留选项，未实际使用）
        },
        userOptions
    );

    let html = json2html(json, options); // 先将 JSON 转为 HTML 字符串

    if (options.rootCollapsable && isCollapsable(json)) {
        // 如果根节点可折叠，给最外层 JSON 包裹一个折叠按钮
        html = `<a href class="json-toggle"></a>` + html;
    }

    // 清空目标元素并插入生成的 HTML
    element.innerHTML = html;
    element.classList.add("json-document"); // 加个标识类，方便自定义样式

    // 绑定用户点击行为，主要处理折叠 / 展开
    bindToggleBehavior(element, options);
}

/**
 * bindToggleBehavior 绑定交互事件，目前主要是处理点击折叠按钮（.json-toggle）和占位符（.json-placeholder）
 * @param {HTMLElement} container 盛装 JSON HTML 的容器 DOM
 * @param {Object} options 配置项
 * @author LiuQi
 */
function bindToggleBehavior(container, options) {
    // 移除旧的事件监听（通过克隆节点的方式简单清除，生产环境建议用事件委托优化）
    container.querySelectorAll("a.json-toggle, a.json-placeholder").forEach(el => {
        el.replaceWith(el.cloneNode(true)); // 克隆节点会移除事件
    });

    // 监听容器内的点击事件
    container.addEventListener("click", (ev) => {
        const target = ev.target;

        if (target.matches("a.json-toggle")) {
            // 点击了一个折叠按钮
            const sibling = target.nextElementSibling;
            let targetList = null;

            if (sibling && (sibling.classList.contains("json-dict") || sibling.classList.contains("json-array"))) {
                targetList = sibling; // 找到紧邻的下一个列表元素（字典或数组）
            }

            if (targetList) {
                target.classList.toggle("collapsed"); // 切换折叠状态
                if (target.classList.contains("collapsed")) {
                    // 如果现在是折叠状态
                    targetList.style.display = "none"; // 隐藏内容区域
                    const count = targetList.children.length;
                    const text = count + (count > 1 ? " items" : " item"); // 生成提示文本
                    const placeholder = document.createElement("a");
                    placeholder.href = "#";
                    placeholder.className = "json-placeholder";
                    placeholder.textContent = text;
                    target.parentNode.insertBefore(placeholder, targetList.nextSibling); // 插入占位提示
                } else {
                    // 如果现在是展开状态
                    targetList.style.display = ""; // 恢复显示
                    const placeholder = targetList.nextElementSibling;
                    if (placeholder && placeholder.classList.contains("json-placeholder")) {
                        placeholder.remove(); // 移除占位提示
                    }
                }
            }
            ev.preventDefault(); // 阻止链接跳转
            return;
        }

        if (target.matches("a.json-placeholder")) {
            // 点击了占位提示，相当于再次点击它前面的折叠按钮
            const toggle = target.previousElementSibling;
            if (toggle && toggle.classList.contains("json-toggle")) {
                toggle.click();
            }
            ev.preventDefault();
            return;
        }
    });

    // 如果配置了默认全部折叠，则逐个触发折叠按钮的点击事件
    if (options.collapsed === true) {
        const toggles = container.querySelectorAll("a.json-toggle");
        toggles.forEach((toggle) => toggle.click());
    }
}


/* 对外统一接口：支持传入多个 DOM 元素 */
/**
 * jsonViewer 将 JSON 可视化应用到 1 个或多个 DOM 元素上
 * @param {NodeList|Array<HTMLElement>|HTMLElement} elements 目标元素，可以是单个、列表或 NodeList
 * @param {*} json 要展示的 JSON 数据
 * @param {Object} [options] 配置选项（可选）
 * @author LiuQi
 */
function jsonViewer(elements, json, options) {
    if (!elements || !json) return; // 参数校验

    // 支持传入单个元素、NodeList 或数组，统一转为数组处理
    const elems = elements instanceof NodeList || Array.isArray(elements)
        ? Array.from(elements)
        : [elements];

    elems.forEach((el) => {
        if (!(el instanceof HTMLElement)) return; // 只处理 HTMLElement
        applyJsonViewer(el, json, options);
    });
}

/* 浏览器环境全局导出（可选）*/

// 如果在浏览器中运行，将 jsonViewer 挂载到 window 上，全局调用
if (typeof window !== "undefined") {
    window.jsonViewer = jsonViewer;
}