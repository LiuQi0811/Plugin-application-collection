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
    if (!url || url === "null") return true;
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
    if (data.allRequestHeaders === undefined || data.allRequestHeaders.length === 0) return false;
    // 定义一个空对象，用于存储请求头的字段
    const header = {};
    // 遍历所有的请求头项
    for (let item of data.allRequestHeaders) {
        // 统一将请求头名称转为小写，便于后续匹配
        item.name = item.name.toLowerCase();
        // 根据请求头名称，将特定字段的值存入 header 对象中
        if (item.name === "referer") {
            header.referer = item.value;
        } else if (item.name === "origin") {
            header.origin = item.value;
        } else if (item.name === "cookie") {
            header.cookie = item.value;
        } else if (item.name === "authorization") {
            header.authorization = item.value;
        }
    }
    // 如果 header 对象中有内容（即至少提取到一个目标请求头），则返回该对象
    if (Object.keys(header).length) return header;
    // 如果没有提取到任何目标请求头，返回 false
    return false;
}

/**
 * setRequestHeaders 设置网络请求头（通过 Chrome 的 declarativeNetRequest API 动态添加请求头修改规则）
 * 主要用于给 XMLHttpRequest、图片、媒体等类型的请求动态添加/修改 HTTP 请求头
 * @param {Object} data - 需要设置的请求头对象，格式如：{ 'X-My-Header': 'value' }
 * @param {Function} [callback] - 可选的回调函数，在规则更新完成后被调用
 * @author LiuQi
 */
function setRequestHeaders(data = {}, callback = undefined) {
    // 移除之前可能已经添加的 session rule，ruleId 为 1，避免重复或冲突
    chrome.declarativeNetRequest.updateSessionRules({removeRuleIds: [1]});
    // 尝试获取当前正在显示的标签页（通常是用户正在浏览的那个页面）
    chrome.tabs.getCurrent(function (tabs) {
        // 初始化规则配置对象，准备先移除一些规则
        // 如果获取到了当前标签页（tabs），则移除该标签页 ID 对应的规则；否则移除 ruleId 为 1 的规则
        const rules = {removeRuleIds: [tabs ? tabs.id : 1]};
        // 如果传入的 data 对象中有数据（即用户设置了需要修改的请求头）
        if (Object.keys(data).length) {
            // 构造要添加的新规则，作用是修改特定类型请求的请求头
            rules.addRules = [{
                "id": tabs ? tabs.id : 1, // 规则的唯一标识 ID，优先使用标签页 ID，否则用 1
                "priority": tabs ? tabs.id : 1, // 规则的优先级，同样优先使用标签页 ID
                "action": {
                    "type": "modifyHeaders",  // 动作类型：修改请求头
                    "requestHeaders": Object.keys(data) // 遍历 data 的所有键（即请求头字段名）
                        .map(key => ({
                            header: key, // 请求头字段，如 'X-Custom-Header'
                            operation: "set",  // 操作：设置为某个值
                            value: data[key] // 值，如 'my-value'
                        }))
                },
                "condition": {
                    "resourceTypes": ["xmlhttprequest", "media", "image"] // 仅对这几种资源类型的请求生效
                }
            }];
            if (tabs) { // 如果是在某个具体的标签页上下文中（比如插件按钮点击时在某个网页内触发）
                rules.addRules[0].condition.tabIds = [tabs.id];
            } else {
                // 如果不是在具体标签页中（比如在后台脚本、弹窗、options 页等调用）
                // 检查当前浏览器是否支持 initiatorDomains 字段
                // initiatorDomains 只支持 chrome 101+ firefox 113+  Chrome 101 之前 和 Firefox 113 之前 不支持该字段
                if (G.version < 101 || (G.isFirefox && G.version < 113)) {
                    // 如果浏览器版本太低，不支持 initiatorDomains，则直接调用回调，不添加新规则
                    callback && callback();
                }
                // 确定该规则适用于哪些“发起者”（即哪个扩展或网页发起的请求）
                // 如果是 Firefox，使用扩展的 hostname；如果是 Chrome，使用扩展的 ID
                const domain = G.isFirefox
                    ? new URL(chrome.runtime.getURL("")).hostname // Firefox 下获取扩展的域名
                    : chrome.runtime.id; // Chrome 下使用扩展 ID
                // 将该 domain 添加到规则的匹配条件中，表示只有从这个 domain 发起的请求才会应用此规则
                rules.addRules[0].condition.initiatorDomains = [domain];
            }
        }
        // 应用规则：先移除旧规则，再添加新规则
        chrome.declarativeNetRequest.updateSessionRules(rules, function () {
            // 规则更新完成后，如果用户传入了回调函数，则调用它
            callback && callback();
        });
    });
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
    if (data.responseHeaders === undefined || data.responseHeaders.length === 0) return header;
    // 遍历每一个响应头项
    for (let item of data.responseHeaders) {
        // 统一将响应头名称转为小写，方便后续匹配
        item.name = item.name.toLowerCase();
        // 根据不同的响应头名称，提取并处理对应的信息
        if (item.name === "content-length") {
            // Content-Length：内容长度（字节），优先使用此值，但可能被 Content-Range 覆盖
            header.size ??= parseInt(item.value); // 只有当 header.size 未定义时才赋值
        } else if (item.name === "content-type") {
            // Content-Type：提取主 MIME 类型（如 text/html），去掉参数（如 charset=utf-8），并转小写
            header.type = item.value.split(";")[0].toLowerCase();
        } else if (item.name === "content-disposition") {
            // Content-Disposition：一般用于标识是否为附件，保留原始值
            header.attachment = item.value;
        } else if (item.name === "content-range") {
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
    if (result.size !== 0 && size !== undefined && size <= result.size * 1024) return "break";
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
    if (result.size !== 0 && size !== undefined && size <= result.size * 1024) return "break";
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
    if (data?.number === 0 || data?.number === undefined) {
        chrome.action.setBadgeText({text: "", tabId: data?.tabId ?? G.tabId}, function () {
            // 如果设置过程中出现错误（通过 chrome.runtime.lastError 判断），当前仅静默处理
            if (chrome.runtime.lastError) return;
        });
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

/**
 * clearRedundant 清理冗余数据
 * 根据当前存在的标签页ID，清理缓存、URL映射、脚本列表、网络规则等无效数据
 * @author LiuQi
 */
function clearRedundant() {
    // 查询所有标签页，获取当前存在的标签页ID集合
    chrome.tabs.query({}, function (tabs) {
        // 当前所有标签页ID的Set集合
        const allTabId = new Set(tabs.map(tab => tab.id));
        // 清理缓存数据（若未初始化）
        if (!cacheData.initialize) {
            // 标记是否需要更新缓存
            let cacheDataFlag = false;
            for (let key in cacheData) {
                // 删除不存在标签页对应的缓存数据
                if (!allTabId.has(Number(key))) {
                    cacheDataFlag = true;
                    delete cacheData[key];
                }
            }
            // 若缓存有变动，更新存储（优先使用session存储，否则用local）
            cacheDataFlag && (chrome.storage.session ?? chrome.storage.local).set({MediaData: cacheData});
        }
        // 清理URL映射表（G.urlMap）
        G.urlMap.forEach((_, key) => {
            // 删除不存在的标签页ID对应的URL记录
            !allTabId.has(key) && G.urlMap.delete(key);
        });
        // 清理脚本列表（G.scriptList）
        G.scriptList.forEach(function (scriptList) {
            scriptList.tabId.forEach(function (tabId) {
                if (!allTabId.has(tabId)) {
                    // 删除无效标签页关联的脚本ID
                    scriptList.tabId.delete(tabId);
                }
            });
        });
        // 若本地初始化未完成，直接返回
        if (!G.initializeLocalComplete) return;
        // 清理declarativeNetRequest规则（模拟手机请求头等）
        chrome.declarativeNetRequest.getSessionRules(function (rules) {
            // 标记是否需要更新移动端规则
            let mobileFlag = false;
            for (let rule of rules) {
                if (rule.condition.tabIds) {
                    // 若规则关联的标签页已全部关闭，则删除该规则
                    if (!rule.condition.tabIds.some(id => allTabId.has(id))) {
                        mobileFlag = true;
                        // 同步删除内存中的标签页ID
                        rule.condition.tabIds.forEach(id => G.featMobileTabId.delete(id));
                        chrome.declarativeNetRequest.updateSessionRules({
                            // 移除无效规则
                            removeRuleIds: [rule.id]
                        });
                    }
                } else if (rule.id === 1) {
                    // 特殊处理：清理预览视频时添加的请求头规则
                    chrome.declarativeNetRequest.updateSessionRules({removeRuleIds: [1]});
                }
            }
            // 更新移动端规则相关的存储
            mobileFlag && (chrome.storage.session ?? chrome.storage.local).set({featMobileTabId: Array.from(G.featMobileTabId)});
        });

        // 清理自动下载任务（G.featAutoDownTabId）
        let autoDownFlag = false;
        G.featAutoDownTabId.forEach(function (tabId) {
            if (!allTabId.has(tabId)) {
                autoDownFlag = true;
                // 删除无效的自动下载标签页ID
                G.featAutoDownTabId.delete(tabId);
            }
        });
        autoDownFlag && (chrome.storage.session ?? chrome.storage.local).set({featAutoDownTabId: Array.from(G.featAutoDownTabId)});
        // 清理其他冗余数据
        G.blockUrlSet = new Set([...G.blockUrlSet]
            // 过滤无效的屏蔽URL记录
            .filter(R => allTabId.has(R)));
        if (G.requestHeaders.size >= 10240) {
            // 请求头数据过大时清空（防止内存溢出）
            G.requestHeaders.clear();
        }
    });
}

/**
 * stringModify 替换文件名（含路径）中的特殊字符，确保文件路径的合规性和安全性
 * @param {string} str - 待处理的原始字符串（可能包含路径和文件名）
 * @param {string} text - 可选参数，用于自定义过滤逻辑（当前未直接使用）
 * @returns {string} - 处理后的字符串，特殊字符被替换为HTML实体或移除
 * @author LiuQi
 */
function stringModify(str, text) {
    // 若输入为空，直接返回原字符串
    if (!str) return str;
    // 调用filterFileName函数过滤文件名中的非法字符
    str = filterFileName(str, text);
    // 替换路径分隔符为HTML实体，避免路径解析冲突或安全风险
    return str
        .replaceAll("\\", "&bsol;") // 将反斜杠（\）替换为HTML实体 &bsol;
        .replaceAll("/", "&sol;");  // 将正斜杠（/）替换为HTML实体 &sol;
}

/**
 * filterFileName 过滤文件名中的非法字符和特殊Unicode字符，确保文件名符合系统规范
 * @param {string} str - 待处理的原始文件名（可能包含路径或特殊字符）
 * @param {string} text - 预留参数，当前未直接使用（可用于扩展过滤规则）
 * @returns {string} - 处理后的安全文件名，移除非法字符并修复末尾点号问题
 * @author LiuQi
 */
function filterFileName(str, text) {
    // 若输入为空，直接返回原字符串
    if (!str) return str;
    // 重置正则表达式的匹配索引，避免上次匹配影响本次结果
    reFilterFileName.lastIndex = 0;
    // 移除Unicode控制字符（零宽空格、零宽非连接符等）
    str = str.replaceAll(/\u200B/g, "") // 移除零宽空格（U+200B）
        .replaceAll(/\u200C/g, "") // 移除零宽非连接符（U+200C）
        .replaceAll(/\u200D/g, ""); // 移除零宽连接符（U+200D）
    // 使用预定义的正则表达式（reFilterFileName）匹配非法字符，并记录匹配项
    str.replace(reFilterFileName, function (match) {
        // 输出非法字符匹配项
        // 定义一个对象，用于映射非法字符到其对应的转义或替代字符：
        // 将一些在文件名中通常不允许的特殊字符替换为 HTML 实体或安全的替代字符
        return text || {
            "<": "&lt;", // 小于号替换为 HTML 实体 &lt;
            ">": "&gt;", // 大于号替换为 HTML 实体 &gt;
            ":": "&colon;", // 冒号替换为自定义实体 &colon;（或可替换为其他安全字符）
            '"': "&quot;", // 双引号替换为 HTML 实体 &quot;
            "|": "&vert;", // 竖线符号替换为自定义实体 &vert;（或可用其他替代如 _）
            "?": "&quest;", // 问号替换为 HTML 实体 &quest;
            "*": "&ast;", // 星号替换为 HTML 实体 &ast;
            "~": "_" // 波浪号直接替换为下划线 _
        }[match];// 根据匹配到的字符 match，返回对应的替换值
    });
    // 如果最后一位是"." chrome.download 无法下载/处理文件名以点号结尾的情况（Chrome下载限制）
    if (str.endsWith(".")) {
        // 追加字符串避免下载失败（如将"file."改为"file.videoCapture"）
        str = str + "videoCapture";
    }
    return str;
}

/**
 * isEmpty 判断给定值是否为空（支持检测 undefined、null、空字符串及纯空格字符串）
 * @param {Object} data - 待检测的值，可以是任意类型（如字符串、对象、数组等）
 * @returns {boolean} - 若值为空（满足任一条件）则返回 true，否则返回 false
 * @author LiuQi
 */
function isEmpty(data) {
    return (typeof data == "undefined" || // 检测未定义的变量
        data == null || // 检测 null 或 undefined（双等号匹配两者）
        data === "" ||  // 检测空字符串
        data === " "); // 检测仅含一个空格的字符串
}

/**
 * templates 模板替换函数：根据数据对象动态替换文本中的占位符（支持URL解析生成文件名）
 * @param {string} text - 包含占位符的模板字符串（如"文件名：{{fullFileName}}"）
 * @param {Object} data - 包含替换数据的对象，需至少包含 `url` 属性（用于解析文件名）
 * @returns {string} - 替换后的字符串
 * @author LiuQi
 */
function templates(text, data) {
    // 若输入文本为空，直接返回空字符串
    if (isEmpty(text)) return "";
    try {
        // 从URL路径中提取文件名并存入data对象
        data.fullFileName = new URL(data.url)
            .pathname // 获取路径部分（如"/path/to/file.txt"）
            .split("/")  // 按斜杠分割路径
            .pop();  // 取最后一段作为文件名（如"file.txt"）
    } catch (e) {
        // URL解析失败时设置默认值
        data.fullFileName = "NULL";
    }
    // 调试日志：输出待替换的数据对象
    console.log(" // TODO templates 模板替换 ", data);
}

/**
 * byteToSize 字节转换成大小 将字节数转换为易读的大小单位（KB/MB/GB），自动根据数值范围选择合适的单位
 * @param {number} byte - 待转换的字节数（必须为非负数）
 * @returns {string|number} - 格式化后的字符串（如 "1.5MB"）或 0（输入无效时）
 * @author LiuQi
 */
function byteToSize(byte) {
    // 输入校验：若输入无效（空值、非数字或小于1024字节），直接返回0
    if (!byte || byte < 1024) return 0;
    // 分级转换逻辑
    if (byte < 1024 * 1024) { // 转换为KB（范围：1024B ~ 1MB）
        // 保留1位小数（如 "256.0KB"）
        return (byte / 1024).toFixed(1) + "KB";
    } else if (byte < 1024 * 1024 * 1024) { // 转换为MB（范围：1MB ~ 1GB）
        // 保留1位小数（如 "3.5MB"）
        return (byte / 1024 / 1024).toFixed(1) + "MB";
    } else { // 转换为GB（范围：≥1GB）
        // 保留1位小数（如 "1.2GB"）
        return (byte / 1024 / 1024 / 1024).toFixed(1) + "GB";
    }
}

/**
 * isM3U8 判断输入数据是否为 M3U8 格式的播放列表（支持文件扩展名和 MIME 类型检测）
 * @param {Object} data - 待检测的数据对象，需包含 `ext`（扩展名）或 `type`（MIME 类型）属性
 * @returns {boolean} - 若数据符合 M3U8 格式特征则返回 true，否则返回 false
 * @author LiuQi
 */
function isM3U8(data) {
    return (
        data.ext === "m3u8" ||  // 检测扩展名是否为 m3u8（HLS 标准格式）
        data.ext === "m3u" || // 检测扩展名是否为 m3u（旧版格式）
        data.type?.endsWith("/vnd.apple.mpegurl") || // 检测 MIME 类型是否为苹果 HLS 标准类型
        data.type?.endsWith("/x-mpegurl") || // 检测旧版 MIME 类型（部分服务使用）
        data.type?.endsWith("/mpegurl") ||  // 检测通用 MIME 类型
        data.type?.endsWith("/octet-stream-m3u8")); // 检测自定义 MIME 类型（部分加密场景使用）
}

/**
 * isMPD 判断输入数据是否为 MPEG-DASH 格式的媒体描述文件（MPD）
 * @param {Object} data - 待检测的数据对象，需包含 `ext`（文件扩展名）或 `type`（MIME 类型）属性
 * @returns {boolean} - 若数据符合 MPD 文件特征（扩展名为 `.mpd` 或 MIME 类型为 `application/dash+xml`）则返回 true，否则返回 false
 * @author LiuQi
 */
function isMPD(data) {
    return (data.ext === "mpd" ||  // 检测文件扩展名是否为 .mpd（标准MPD文件后缀）
        data.type === "application/dash+xml" // 检测 MIME 类型是否为 DASH 协议标准类型
    )
}

/**
 * isJSON 判断输入数据是否为 JSON 格式（通过文件扩展名或 MIME 类型检测）
 * @param {Object} data - 待检测的数据对象，需包含 `ext`（文件扩展名）或 `type`（MIME 类型）属性
 * @returns {boolean} - 若数据符合 JSON 格式特征（扩展名为 `.json` 或 MIME 类型为 `application/json`/`text/json`）则返回 true，否则返回 false
 * @author LiuQi
 */
function isJSON(data) {
    return (data.ext === "json" || // 检测文件扩展名是否为 .json（标准JSON文件后缀）
        data.type === "application/json" || // 检测 MIME 类型是否为标准 JSON 类型（RFC 4627）
        data.type === "text/json"  // 检测旧版或非标准 MIME 类型（部分服务使用）
    )
}

/**
 * isPlay 判断输入数据是否为可播放的媒体资源（支持扩展名、MIME类型及HLS流检测）
 * @param {Object} data - 待检测的数据对象，需包含 `ext`（文件扩展名）或 `type`（MIME类型）属性
 * @returns {boolean} - 若数据符合可播放的媒体特征则返回 true，否则返回 false
 * @author LiuQi
 */
function isPlay(data) {
    // 优先检查全局播放器实例（G.player）是否存在，且数据非JSON/图片
    if (G.player && !isJSON(data) && !isPicture(data)) return true;
    // 定义支持的音视频MIME类型列表（覆盖常见格式）
    const typeArray = [
        "video/ogg", "video/mp4", "video/webm",  // 视频格式
        "audio/ogg", "audio/mp3", "audio/wav", // 音频格式
        "audio/m4a", "video/3gp", "video/mpeg", // 移动端兼容格式
        "video/mov" // QuickTime格式
    ];
    // 综合判断条件
    // - 扩展名通过媒体格式检测（isMediaExt）
    // - MIME类型在支持列表中（typeArray.includes）
    // - 数据为M3U8流媒体格式（isM3U8）
    return isMediaExt(data.ext)
        || typeArray.includes(data.type)
        || isM3U8(data);
}

/**
 * isPicture  判断当前数据是否为图片类型（通过MIME类型或文件扩展名检测）
 * @param {Object} data - 待检测的数据对象，需包含 `type`（MIME类型）或 `ext`（文件扩展名）属性
 * @returns {boolean} - 若数据符合图片类型则返回 `true`，否则返回 `false`
 * @author LiuQi
 */
function isPicture(data) {
    // 检测逻辑优先级：先检查MIME类型（如 "image/jpeg"），再匹配扩展名（如 "jpg"）
    return (data.type?.startsWith("image/") || // 匹配所有MIME类型以 "image/" 开头的数据
        data.ext === "jpg" ||  // JPEG格式
        data.ext === "png" ||  // PNG格式
        data.ext === "jpeg" || // 另一种JPEG扩展名
        data.ext === "bmp" ||  // 位图格式
        data.ext === "gif" ||  // GIF动图或静态图
        data.ext === "webp" || // WebP格式
        data.ext === "svg" // 矢量图格式
    )
}

/**
 * isMediaExt 判断文件扩展名是否属于常见的媒体格式
 * @param {string} ext - 文件扩展名（不包含点，如 "mp4"）
 * @returns {boolean} - 如果扩展名是支持的媒体格式则返回 true，否则返回 false
 * @author LiuQi
 */
function isMediaExt(ext) {
    // 支持的媒体格式列表，涵盖主流音视频容器和编码格式
    return ["ogg", "ogv", "mp4", "webm", "mp3", "wav", "m4a", "3gp", "mpeg", "mov", "m4s", "aac"]
        .includes(ext);
}

/**
 * seconds2Time 将秒数转换为时分秒格式的字符串，例如：
 * - 3665 秒 → "1:01:05"（1小时1分5秒）
 * - 125 秒  → "2:05"  （2分5秒，小时部分不显示）
 *
 * @param {number} seconds - 需要转换的秒数（例如：90、3600、3665等）
 * @returns {string} 格式化后的时间字符串，格式为 "H:MM:SS" 或 "MM:SS"（小时部分可选）
 * @author LiuQi
 */
function seconds2Time(seconds) {
    // 计算小时数：总秒数除以 3600（1小时=3600秒），然后用位运算 | 0 取整（等同于 Math.floor）
    let hour = (seconds / 3600) | 0;
    // 计算剩余秒数后，求分钟数：先取余 3600 得到不足1小时的秒数，再除以 60，取整
    let min = ((seconds % 3600) / 60) | 0;
    // 计算剩余的秒数：总秒数 % 60，即除去小时和分钟后剩下的秒数，再取整
    seconds = (seconds % 60) | 0;
    // 拼接时间字符串：如果小时数大于 0，显示小时部分，格式如 "1:"；否则小时部分不显示
    let time = hour > 0 ? hour + ":" : "";
    // 拼接分钟部分：使用 padStart(2, '0') 保证分钟始终是两位数，如 "02"，然后加 ":"
    time += min.toString().padStart(2, "0") + ":";
    // 拼接秒数部分：同样保证是两位数，如 "05"
    time += seconds.toString().padStart(2, "0");
    // 返回最终格式的时间字符串，例如 "1:02:05" 或 "02:05"
    return time;
}

/**
 * openParser 打开解析器
 * 根据传入的数据和选项，构造一个 URL 并在新的浏览器标签页中打开解析页面
 * @param {Object} data - 包含解析所需的核心数据，如 URL、标题、文件名等
 * @param {Object} [options={}] - 可选参数，用于控制标签页行为或其他附加配置
 * @author LiuQi
 */
function openParser(data, options = {}) {
    // 根据标签ID 获取当前活跃的标签页信息
    chrome.tabs.get(G.tabId, function (tab) {
        // 构造目标解析页面的路径和查询参数
        const url = `/${data.parsing ? data.parsing : "m3u8"}.html?${new URLSearchParams({
            url: data.url, // 要解析的原始媒体资源 URL
            title: data.title, // 媒体资源的标题
            filename: data.downFileName, // 下载的文件名
            tabid: data.tabId === -1 ? G.tabId : data.tabId, // 当前操作的标签页 ID，如果为 -1 则使用全局 G.tabId
            initiator: data.initiator, // 发起请求的源头
            requestHeaders: data.requestHeaders ? JSON.stringify(data.requestHeaders) : undefined, // 请求头信息，以 JSON 字符串传递
            // 遍历 options 对象，将布尔值转换为 1 其他类型保持原类型
            ...Object.fromEntries(Object.entries(options).map(([key, value]) => [key, typeof value === 'boolean' ? 1 : value])),
        })}`;
        // 在浏览器中创建（打开）一个新的标签页
        chrome.tabs.create({
            url, // 资源地址
            index: tab.index + 1, // 新标签页位置在当前标签页之后
            active: G.isMobile || !options.autoDown // 是否激活（聚焦）新标签页：如果是移动端（G.isMobile 为 true）或者未设置自动下载（autoDown 为 false/undefined）激活，否则不激活
        });
    });
}


/**
 * JSONParse 尝试解析 JSON 字符串，如果第一次解析失败，会尝试对字符串进行简单修复后再次解析
 * @param {string} str - 待解析的 JSON 格式字符串
 * @param {Object} error - 解析失败时返回的默认错误对象（默认为空对象 {}）
 * @param {number} attempt - 当前尝试解析的次数（内部递归使用，默认为 0）
 * @author LiuQi
 */
function JSONParse(str, error = {}, attempt = 0) {
    if (!str) return error; // 如果传入字符串为空，直接返回错误对象
    try {
        // 尝试直接解析 JSON
        return JSON.parse(str);
    } catch (e) {
        if (attempt === 0) {
            // 第一次解析失败，修正字符串后递归调用
            reJSONParse.lastIndex = 0;
            // 重置正则匹配位置
            const fixedStr = str.replace(reJSONparse, '$1"$2"$3');
            // 递归调用，尝试修复后再次解析，attempt 计数加一
            return JSONParse(fixedStr, error, ++attempt);
        } else {
            // 第二次解析仍然失败，返回 error 对象
            return error;
        }
    }
}

/**
 * awaitVariableG
 * 等待全局变量 G 中的 initializeSyncComplete 和 initializeLocalComplete 同时为 true 后执行回调
 * @param {Function} callback - 条件满足后要执行的回调函数
 * @param {number} seconds - 检查间隔时间，默认为 0 毫秒（即不延迟，立即开始检查）
 */
function awaitVariableG(callback, seconds = 0) {
    const timer = setInterval(function () {
        // 当 G 中的两个初始化标志都为 true 时，认为初始化完成
        if (G.initializeSyncComplete && G.initializeLocalComplete) {
            // 停止定时器
            clearInterval(timer);
            // 执行传入的回调函数
            callback();
        }
    }, seconds);// 每隔指定的秒数检查一次
}

/**
 * loadedCSS
 * 动态加载 CSS 样式：根据是否移动端加载不同的样式文件，并注入一段内联样式
 * @author LiuQi
 */
function loadedCSS() {
    if (G.isMobile) { // 移动端
        const mobileCssLink = document.createElement("link");
        mobileCssLink.rel = "stylesheet";
        mobileCssLink.type = "text/css";
        mobileCssLink.href = "css/mobile.css";
        document.head.appendChild(mobileCssLink);
    }
    // 创建一个 <style> 标签，将 G.css 中的内联 CSS 注入到页面
    const styleElement = document.createElement("style");
    styleElement.textContent = G.css;
    document.head.appendChild(styleElement);
}


/**
 * fetchData 通用的 fetch 数据请求方法
 * @param {string} url - 请求地址
 * @param {'text' | 'json'} responseType - 期望的响应类型，'text' 或 'json'
 * @returns {Promise<string | any>} 返回文本或 JSON 数据
 * @throws {Error} - 当 HTTP 请求失败或响应类型不支持时抛出错误
 */
async function fetchData(url, responseType = "json") {
    const response = await fetch(url); // 发起 fetch 请求
    if (!response.ok) {
        // 抛出 HTTP 错误
        throw new Error(`HTTP 错误！状态码: ${response.status} ${response.statusText}`);
    }

    if (responseType === "text") {
        return await response.text(); // 返回文本
    } else if (responseType === "json") {
        return await response.json(); // 返回 JSON
    } else {
        // 异常错误
        throw new Error(`不支持的 responseType: ${responseType}，请使用 'text' 或 'json'`);
    }
}
