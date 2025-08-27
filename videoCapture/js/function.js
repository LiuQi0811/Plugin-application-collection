/**
 * isLockUrl 判断url是否在屏蔽网址中
 * @param url
 * @return
 * @author LiuQi
 */
function isLockUrl(url) {
    console.log(" // TODO isLockUrl 判断url是否在屏蔽网址中 ", G.blockUrl);
    for (let key in G.blockUrl) {
        console.log(" <> ", key);
    }
    return false;
}

/**
 * wildcardToRegEx 将用户输入的URL（可能包含通配符）转换为正则表达式
 * @param urlPattern  用户输入的URL，可能包含通配符
 * @return 转换后的正则表达式
 * @author LiuQi
 */
function wildcardToRegEx(urlPattern) {
    // TODO wildcardToRegEx 将用户输入的URL（可能包含通配符）转换为正则表达式
    console.log("// TODO wildcardToRegEx 将用户输入的URL（可能包含通配符）转换为正则表达式 ", urlPattern);
}

/**
 * isSpecialPage 用于判断传入的 URL 是否属于“特殊页面”
 * 该函数用于判断传入的 URL 是否为 非标准网页链接（比如空值、特殊协议、非 http(s)/blob 页面），如果是则返回 true（视为特殊页面），否则返回 false（视为正常网页）。
 * @param url
 * @author LiuQi
 */
function isSpecialPage(url) {
    // URL 为空、未定义、或者为字符串 "null"（可能是未正确获取到地址，或占位数据）直接返回 true
    if (!url || url == "null") return true;
    // 正常的网页链接 返回 false
    return !(url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:"));
}


/**
 * fileNameParse  解析文件路径，提取文件名和文件扩展名
 * @param {string} pathname - 文件的完整路径
 * @returns {Array} 返回一个数组，包含两个元素：[文件名, 扩展名]。如果文件没有扩展名，则扩展名为 undefined
 * @author LiuQi
 */
function fileNameParse(pathname) {
    // 从路径中提取文件名部分
    //   - pathname.split("/")：将路径按照 "/" 分割成数组，例如 "/a/b/c.txt" → ["", "a", "b", "c.txt"]
    //   - .pop()：取出数组的最后一个元素，即文件名，例如 "c.txt" 或 "文件"
    //   - decodeURI(...)：对文件名进行 URI 解码，确保中文、空格等特殊字符能正确显示
    let fileName = decodeURI(pathname.split("/").pop());
    // 尝试提取扩展名
    //   - fileName.split(".")：将文件名按照 "." 分割成数组，例如 "file.txt" → ["file", "txt"]
    //      如果没有 ".", 则返回 ["filename"]
    let extParts = fileName.split(".");
    // 判断是否有扩展名
    //   - 如果分割后数组长度为 1，说明没有 "." 或者文件名就是单独一个部分，没有扩展名，ext 设为 undefined
    //   - 如果长度大于 1，说明有 "."，假定最后一个 "." 后面的是扩展名，使用 extParts.pop() 取出，并转成小写
    let ext = extParts.length == 1 ? undefined : extParts.pop().toLowerCase();
    // 返回结果：[文件名, 扩展名]
    //   - 如果 ext 存在（即有扩展名），则返回 ext，否则返回 undefined
    return [fileName, ext ? ext : undefined];
}

/**
 * getRequestHeaders 从请求头数据中提取特定的常用请求头字段
 * @param {Object} data - 包含请求头信息的对象，期望其中有一个字段 allRequestHeaders，值为请求头数组
 * @returns {Object|boolean}
 * - 如果成功提取到至少一个目标请求头（如 referer、origin、cookie、authorization），则返回一个对象，包含这些请求头的键值对；
 * - 如果 data.allRequestHeaders 未定义、为空，或者没有匹配到任何目标请求头，则返回 false。
 * @author LiuQi
 */
function getRequestHeaders(data) {
    // 检查传入的数据中是否存在 allRequestHeaders 字段，并且它是一个非空数组
    if (data.allRequestHeaders == undefined || data.allRequestHeaders.length == 0) return false;
    // 定义一个空对象，用于存储请求头的字段
    const header = {};
    // 遍历所有的请求头项
    for (let item of data.allRequestHeaders) {
        // 统一将请求头名称转为小写，便于后续匹配
        item.name = item.name.toLowerCase();
        // 根据请求头名称，将特定字段的值存入 header 对象中
        if (item.name == "referer") {
            header.referer = item.value;
        } else if (item.name == "origin") {
            header.origin = item.value;
        } else if (item.name == "cookie") {
            header.cookie = item.value;
        } else if (item.name == "authorization") {
            header.authorization = item.value;
        }
    }
    // 如果 header 对象中有内容（即至少提取到一个目标请求头），则返回该对象
    if (Object.keys(header).length) return header;
    // 如果没有提取到任何目标请求头，返回 false
    return false;
}

/**
 * getResponseHeadersValue  从响应头数据中提取特定的常用响应头字段，并解析成更易用的格式
 * @param {Object} data - 包含响应头信息的对象，期望其中有一个字段 responseHeaders，值为响应头数组
 * @returns {Object} 返回一个对象，包含从响应头中提取的以下字段（如果存在）：
 *  - size: 响应内容的大小（单位：字节），优先从 Content-Length 获取，其次从 Content-Range 的 total 部分获取（如果不是 '*'）
 *  - type: 响应内容的 MIME 类型，从 Content-Type 中提取（去掉参数部分，如 charset，并转小写）
 *  - attachment: Content-Disposition 头的原始值，通常用于判断是否为附件下载
 * @author LiuQi
 */
function getResponseHeadersValue(data) {
    // 定义一个空对象，用于存储解析后的响应头信息
    const header = {};
    // 如果 responseHeaders 未定义 或 是空数组，直接返回空对象
    if (data.responseHeaders == undefined || data.responseHeaders.length == 0) return header;
    // 遍历每一个响应头项
    for (let item of data.responseHeaders) {
        // 统一将响应头名称转为小写，方便后续匹配
        item.name = item.name.toLowerCase();
        // 根据不同的响应头名称，提取并处理对应的信息
        if (item.name == "content-length") {
            // Content-Length：内容长度（字节），优先使用此值，但可能被 Content-Range 覆盖
            header.size ??= parseInt(item.value); // 只有当 header.size 未定义时才赋值
        } else if (item.name == "content-type") {
            // Content-Type：提取主 MIME 类型（如 text/html），去掉参数（如 charset=utf-8），并转小写
            header.type = item.value.split(";")[0].toLowerCase();
        } else if (item.name == "content-disposition") {
            // Content-Disposition：一般用于标识是否为附件，保留原始值
            header.attachment = item.value;
        } else if (item.name == "content-range") {
            // Content-Range：例如 "bytes 0-999/2000"，其中 2000 是总大小
            // 从 value 中提取总大小部分（索引 1），如果总大小不是 '*'，则解析为数字并作为最终 size
            let size = item.value.split('/')[1];
            if (size !== '*') {
                header.size = parseInt(size);// 覆盖之前的 size
            }
        }
    }
    // 返回解析后的响应头信息对象，可能包含 size / type / attachment 等字段
    return header;
}

/**
 * checkExtension 检查文件扩展名是否合法，并根据配置判断是否允许继续处理（如下载、上传等操作）
 * @param {string} ext - 文件的扩展名，例如 "pdf"、"jpg"，通常为小写
 * @param {number|undefined} size - 文件的大小（单位：字节），可选参数，可能为 undefined
 * @returns {boolean|string}
 * - 返回 true：表示扩展名合法，且文件大小符合要求（如果检查了大小），允许继续执行后续操作。
 * - 返回 "break"：表示虽然扩展名合法，但根据配置不允许继续操作（比如被禁用，或文件大小超出限制），应该中断/停止当前流程。
 * - 返回 false：表示传入的扩展名未在配置中定义，或扩展名不合法，不允许继续操作。
 * @author LiuQi
 */
function checkExtension(ext, size) {
    // 从全局配置 G.Ext 中获取该扩展名对应的配置信息
    const result = G.Ext.get(ext);
    // 如果扩展名未配置（result 为 false，比如 undefined 或 null），返回 false 表示不允许
    if (!result) return false;
    // 如果扩展名已配置但被禁用（state 为假值，比如 false），返回 "break" 表示应中断操作
    if (!result.state) return "break";
    // 如果配置中指定了文件大小限制（result.size != 0），并且传入了 size 参数，且当前文件大小小于等于限制
    // 注意：result.size 单位是 KB，所以要乘以 1024 转为字节再比较
    if (result.size != 0 && size != undefined && size <= result.size * 1024) return "break";
    // 所有检查通过，返回 true 表示扩展名合法，且未触发限制，允许继续操作
    return true;
}

/**
 * checkType 检查文件的 MIME 类型（MIME Type）是否合法，并根据配置判断是否允许继续处理（如下载、上传等操作）
 * @param {string} type - 文件的 MIME 类型，例如 "image/jpeg"、"application/pdf"，表示文件的媒体类型
 * @param {number|undefined} size - 文件的大小（单位：字节），可选参数，可能为 undefined
 * @returns {boolean|string}
 * - 返回 true：表示该 MIME 类型合法，且文件大小符合要求（如果检查了大小），允许继续执行后续操作。
 * - 返回 "break"：表示虽然 MIME 类型合法，但根据配置不允许继续操作（比如被禁用，或文件大小超出限制），应该中断/停止当前流程。
 * - 返回 false：表示传入的 MIME 类型未在配置中定义，或类型不合法，不允许继续操作。
 * @author LiuQi
 */
function checkType(type, size) {
    // 优先尝试获取该 MIME 类型的通用类别配置（如 "image/*"），如果找不到，再尝试精确匹配该类型（如 "image/jpeg"）
    let result = G.Type.get(type.split("/")[0] + "/*") || G.Type.get(type);
    // 如果没有找到对应的 MIME 类型配置，返回 false 表示不允许
    if (!result) return false;
    // 如果该 MIME 类型已配置但被禁用（state 为假值，如 false），返回 "break" 表示应中断操作
    if (!result.state) return "break";
    // 如果配置中指定了文件大小限制（result.size != 0），且传入了 size，且当前文件大小小于等于限制
    // 注意：result.size 单位是 KB，所以要乘以 1024 转为字节再比较
    if (result.size != 0 && size != undefined && size <= result.size * 1024) return "break";
    // 所有检查通过，返回 true 表示允许继续操作
    return true;
}

/**
 * dataStorage 将当前缓存的媒体数据（cacheData）存储到 Chrome 扩展的存储系统中，并根据指定 tabId 更新扩展图标上的数字提示
 * @param {number} tabId - 当前标签页的 ID，用于更新对应标签页的扩展图标徽章（显示缓存数据条目数）
 * @author LiuQi
 */
function dataStorage(tabId) {
    // 清除之前可能设置的防抖定时器，防止重复执行或冲突
    clearTimeout(debounce);
    // 重置防抖相关的时间戳和计数器（用于防抖/节流）
    debounceTime = Date.now();
    debounceCount = 0;
    // 将当前的全局缓存数据 cacheData 存储到 Chrome 扩展的存储系统中
    // 优先使用 session 存储（会话级，标签页关闭后清除），如果不支持则使用 local 存储（持久化）
    (chrome.storage.session ?? chrome.storage.local).set({MediaData: cacheData}, function () {
        // 如果存储过程中发生错误，chrome.runtime.lastError 会存在，打印错误信息到控制台
        chrome.runtime.lastError && console.log(chrome.runtime.lastError);
    });
    // 如果当前 tabId 在 cacheData 中有数据，则调用 setExtensionIcon 方法，在扩展图标上显示对应数量的徽章
    cacheData[tabId] && setExtensionIcon({number: cacheData[tabId].length, tabId});
}

/**
 * setExtensionIcon 设置 Chrome 扩展的图标徽章（Badge），用于显示指定标签页的数字提示（如缓存条目数、待处理任务数等）
 * @param {Object} data - 包含两个关键属性的对象：
 *  - number {number|string|undefined}：要显示在扩展图标徽章上的数字，通常代表某 tabId 对应的数据条目数量，如缓存媒体数量、待处理任务数等
 *  - tabId {number}：目标浏览器标签页的唯一标识符，用于指定要在哪个标签页的扩展图标上显示徽章
 * @author LiuQi
 */
function setExtensionIcon(data) {
    // 如果 number 为 0 或 undefined，表示没有需要显示的内容
    if (data?.number == 0 || data?.number == undefined) {
        console.log("  // TODO  setExtensionIcon Method  if(data?.number == 0 || data?.number == undefined) ");
    }
    // 如果全局配置 G.badgeNumber 为真，表示启用徽章功能
    else if (G.badgeNumber) {
        // 如果数字超过 999，则显示为 "999+"，避免徽章文本过长
        data.number = data.number > 999 ? "999+" : data.number.toString();
        // 调用 Chrome 扩展 API，设置指定 tabId 的扩展图标徽章文本
        chrome.action.setBadgeText({text: data.number, tabId: data.tabId}, function () {
            // 如果设置过程中出现错误（通过 chrome.runtime.lastError 判断），当前仅静默处理
            if (chrome.runtime.lastError) return;
        });
    }
}