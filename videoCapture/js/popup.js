// 解析参数
const params = new URL(location.href).searchParams;
const _tabId = parseInt(params.get("tabId"));
const _type = params.get("type");
// 复选框状态 点击返回或者全选后 影响新加入的资源 复选框勾选状态
let checkboxState = true;
// 当前页面
const $mediaList = document.getElementById("media-list");
const $current = document.createElement("div");
const $currentCount = document.querySelector("#current-tab #quantity");
let currentCount = 0;
// 其他页面
const $allMediaList = document.getElementById("all-media-list");
const $all = document.createElement("div");
const $allCount = document.querySelector("#all-tab #quantity");
let allCount = 0;
// 疑似密钥
const $maybeKey = document.createElement("div");
// 提示 操作按钮 DOM
const $tips = document.getElementById("tips");
const $down = document.getElementById("down");
const $mergeDown = document.getElementById("merge-down");
// 储存所有资源数据
// 使用 Map 结构，包含两个内部 Map：
// - true: 表示当前页面（activeTab）的资源数据
// - false: 表示其他页面的资源数据
const allData = new Map([
    [true, new Map()], // 当前页面的数据
    [false, new Map()], // 其他页面的数据
]);
// 筛选
const $filter_ext = document.querySelector("#filter #ext");
// 储存所有扩展名，保存是否筛选状态 来判断新加入的资源 立刻判断是否需要隐藏
const filterExt = new Map();
// 删除重复文件名
let duplicateFilenamesSet = null;
// 当前所在页面
let activeTab = true;
// 储存下载id
const downData = [];
// 图标地址
const favicon = new Map();
// 当前页面DOM
let pageDOM = undefined;
// HeartBeat
chrome.runtime.sendMessage(chrome.runtime.id, {Message: "HeartBeat"});
// 清理冗余数据
chrome.runtime.sendMessage(chrome.runtime.id, {Message: "clearRedundant"});
// 监听下载 出现服务器拒绝错误 调用下载器
chrome.downloads.onChanged.addListener(function (data) {
    console.error(" ....downloads .....  ", data);
});


// Click Event
// 获取页面中 ID 为 "all-tab" 的 DOM 元素，通常是一个 Tab 标签或按钮，用于展示“全部”资源
const allTab = document.getElementById("all-tab");
// 为这个 "all-tab" 元素添加点击事件监听器
allTab.addEventListener("click", function () {
    // 判断 allCount 是否为假值（比如 0 或 undefined）
    // 目的是避免重复请求，只有在 allCount 为 0（即还没有加载过数据）时才去获取所有数据
    // 向当前插件的 background 或其他 runtime context 发送一条消息
    // 消息内容为：{ Message: "getAllData" }，表示请求获取所有的资源数据
    !allCount && chrome.runtime.sendMessage(chrome.runtime.id, {Message: "getAllData"}, function (data) {
        // 如果没有收到有效数据，直接返回
        if (!data) return;
        // 遍历返回的数据对象（data 是一个 key-value 结构，key 可能是 tabId，value 是该 tab 下的资源数组）
        for (let key in data) {
            // 如果当前的 key（tabId）等于当前页面的 tabId（G.tabId），则跳过，不展示当前页的数据
            // 目的可能是为了避免重复展示当前标签页已经显示的内容，或者只展示“其他”标签页的数据
            if (key === G.tabId) continue;
            // 累加该 tab 下的资源数量到 allCount 计数器中
            allCount += data[key].length;
            // 遍历该 tabId 下的每一个资源项
            for (let i = 0; i < data[key].length; i++) {
                // 对每一个资源调用 addDynamicMedia 函数，生成对应的 DOM 结构
                // 第二个参数传入 false，可能代表不是当前活跃 tab
                // 然后将生成的 DOM 元素追加到某个变量或容器 $all 中
                $all.append(addDynamicMedia(data[key][i], false));
            }
        }
        // 如果 allCount > 0，说明有数据加载进来，则将 $all（包含所有资源的 DOM）追加到页面中的 $allMediaList 容器中
        allCount && $allMediaList.append($all);
    });
});

/**
 * addDynamicMedia 生成资源DOM
 * 该函数用于根据传入的数据生成一个包含媒体资源信息的可交互DOM结构，
 * 通常用于在插件或页面中展示资源的标题、图标、操作按钮等。
 * @param {Object} data -资源相关的数据对象，如标题、名称、URL、大小等
 * @param {boolean} currentTab -当前标签页标识，默认为 true
 * @author LiuQi
 */
function addDynamicMedia(data, currentTab = true) {
    // 保留原始标题，以备后用
    data._title = data.title;
    // 对标题进行字符串处理
    data.title = stringModify(data.title);
    // 文件名称处理：
    // 如果 data.name 为空，则使用标题 + 扩展名作为默认文件名
    // 否则对 data.name 进行解码和字符串处理
    data.name = isEmpty(data.name) ? data.title + "." + data.ext : decodeURIComponent(stringModify(data.name));
    // 截取文件名长度（如果太长则显示省略形式），仅当 data.name 长度超过50且不在特定标签页时
    let trimName = data.name;
    if (data.name && data.name.length >= 50 && !_tabId) {
        trimName = trimName.substring(0, 20) + "..." + trimName.substring(-30);
    }
    // 为 data 对象定义一个只读属性 pageDOM（通过 getter 获取）
    Object.defineProperty(data, "pageDOM", {
        get() {
            return pageDOM;
        }
    });
    // 下载文件名处理：
    // 如果配置中启用了 G.titleName，则使用模板生成下载文件名，否则直接使用 data.name
    // 然后对下载文件名进行过滤（比如去掉非法字符），如果过滤后为空则使用原始 name
    data.downFileName = G.titleName ? templates(G.downFileName, data) : data.name;
    data.downFileName = filterFileName(data.downFileName);
    if (isEmpty(data.downFileName)) {
        data.downFileName = data.name;
    }
    // 文件大小单位转换：将字节转换为更可读的单位（如 KB、MB）
    data._size = data.size;
    if (data.size) {
        data.size = byteToSize(data.size);
    }
    // 是否需要解析的标记，默认为 false
    data.parsing = false;
    // 判断当前数据是否为某些特殊格式（如 M3U8、MPD、JSON），目前只是打印日志
    if (isM3U8(data)) {
        console.log(" // TODO  popup.js addDynamicMedia  if(isM3U8(data)) .......");
    } else if (isMPD(data)) {
        console.log(" // TODO  popup.js addDynamicMedia  if(isMPD(data)) .......");
    } else if (isJSON(data)) {
        console.log(" // TODO  popup.js addDynamicMedia  if(isJSON(data)) .......");
    }
    // 网站图标处理：如果存在 favIconUrl 且该网站图标还未缓存，则存入 favicon Map
    if (data.favIconUrl && !favicon.has(data.webUrl)) {
        favicon.set(data.webUrl, data.favIconUrl);
    }
    // 判断该资源是否可播放
    data.isPlay = isPlay(data);
    // 如果当前 requestId 已存在，则追加时间戳避免重复
    if (allData.get(currentTab).has(data.requestId)) {
        data.requestId = data.requestId + "_" + Date.now().toString();
    }
    // 创建一个 DOM 解析器，用于将 HTML 模板字符串解析为 DOM 对象
    const domParser = new DOMParser();
    // 定义一个 HTML 模板字符串，用于展示媒体资源信息及操作按钮
    const htmlTemplate = `<div class="panel">
        <div class="panel-heading">
            <!-- 复选框，用于多选下载 -->
            <input type="checkbox" class="down-check"/>
            <!-- 网站图标，如果配置开启且存在图标则显示，否则添加一个标识类 -->
            ${G.showWebIco ? `<img class="favicon ${!data.favIconUrl ? "favicon-flag" : ""}"
                                requestId="${data.requestId}" 
                                src="${data.favIconUrl}"
                                />` : ""}
            <!-- 标识该资源是否使用了正则匹配，如果是则显示一个 regex 图标 -->
            <img class="favicon regex ${data.isRegex ? "" : "hide"}" 
             src="images/regex.png" 
             title="${i18n.regexTitle}"/>
             <!-- 文件名称，根据状态（解析中、正则、无效标签页）决定是否加粗 -->
             <span class="name ${data.parsing || data.isRegex || data.tabId == -1 ? "bold" : ""}">${trimName}</span>
             <!-- 文件大小，如果存在则显示，否则隐藏该元素 -->
             <span class="size ${data.size ? "" : "hide"}">${data.size}</span>
             <!-- 复制链接按钮 -->
             <img id="copy" class="icon copy" 
                title="${i18n.copy}" 
                src="/images/copy.png" />
             <!-- 解析中状态图标，动态显示 -->
             <img id="parsing" class="icon parsing ${data.parsing ? "" : "hide"}" 
                data-type="${data.parsing}"
                title="${i18n.parser}"
                src="/images/parsing.png" />
             <!-- 播放按钮，仅在可播放时显示 -->
             <img id="play" class="icon play ${data.isPlay ? "" : "hide"}" 
                title="${i18n.preview}" 
                src="/images/play.png"  />
             <!-- 下载按钮 -->
             <img id="download" class="icon download" 
                title="${i18n.download}"
                src="/images/download.png" />
             <!-- Aria2 下载按钮，仅在启用 Aria2 时显示 -->
             <img id="aria2" class="icon aria2 ${G.enableAria2Rpc ? "" : "hide"}"
                title="Aria2"
                src="/images/aria2.png" />
             <!-- 调用按钮，仅在启用 invoke 功能时显示 -->
             <img id="invoke" class="icon invoke ${G.invoke ? "" : "hide"}"
                title="${i18n.invoke}"
                src="/images/invoke.png" />
             <!-- 发送到本地按钮，根据全局配置决定是否显示 -->
             <img id="send2local" class="icon send ${G.send2localManual || G.send2local ? "" : "hide"}"
                title="${i18n.send2local}"
                src="/images/send.png" />
             <!-- 发送到 MQTT 按钮，仅在 MQTT 启用时显示 -->
             <img id="mqtt" class="icon mqtt ${G.mqttEnable ? "" : "hide"}"
                title="${i18n.send2MQTT}"
                src="/images/mqtt.png" />
        </div>
        <!-- URL 信息区域，默认隐藏，包含更多详细信息和操作 -->
        <div class="url hide">
            <!-- 基本信息展示，如标题和 MIME 类型 -->
            <div id="media-info" data-state="false">
                ${data.title ? `<b>${i18n.title}:</b> ${data.title}` : ""}
                ${data.type ? `<br/><b>MIME:</b>  ${data.type}` : ""}
            </div>
            <!-- 更多操作按钮区域 -->
            <div class="more-button">
                <!-- 二维码按钮 -->
                <div id="qrcode">
                    <img class="icon qrcode" title="QR Code" src="images/qrcode.png"/>
                </div>
                <!-- 使用请求头下载按钮 -->
                <div id="capture-down" >
                    <img class="icon capture-down" title="${i18n.downloadWithRequestHeader}" src="images/capture-down.png"/>
                </div>
                <!-- 调用按钮 -->
                <div>
                    <img class="icon invoke" title="${i18n.invoke}" src="images/invoke.png"/>
                </div>
            </div>
            <!-- 原始资源的链接，支持新窗口打开和直接下载 -->
            <a href="${data.url}" target="_blank" download="${data.downFileName}">${data.url}</a>
            <br/>
            <!-- 截图功能相关 默认隐藏 -->
             <img id="screenshots" class="hide"/>
             <!-- 视频预览功能相关 默认隐藏 -->
             <video id="preview" class="hide" controls></video>
        </div>
    </div>`;
    // 将 HTML 模板字符串解析为 DOM 对象
    const document = domParser.parseFromString(htmlTemplate, "text/html");
    // 获取生成的 DOM 结构的第一个子节点（即 panel div）
    data.html = document.body.firstChild;
    // 获取其中的 .url 部分 DOM 元素，并赋值给 data.urlPanel
    data.urlPanel = data.html.querySelector(".url");
    // 初始化一个状态：url 面板默认是否显示，false 表示默认隐藏
    data.urlPanelShow = false;
    // 获取面板头部元素（通常是一个可点击的标题栏，比如 <div class="panel-heading">）
    data.panelHeading = data.html.querySelector(".panel-heading");
    // 给 panelHeading 添加点击事件监听器
    data.panelHeading.addEventListener("click", function (event) {
        // 每次点击时，切换 urlPanel 的显示状态（显示/隐藏）
        data.urlPanelShow = !data.urlPanelShow;
        // 获取页面中用于显示媒体信息的部分，比如 <div id="media-info">
        const mediaInfo = data.html.querySelector("#media-info");
        // 获取预览元素，比如 <video id="preview"> 或 <img>，用于展示视频/图片内容
        const preview = data.html.querySelector("#preview");
        if (!data.urlPanelShow) {
            // 情况1：当前是 “隐藏 .url 面板” 的状态
            if (event.target.id === "play") {// 如果点击的目标元素的 id 是 "play"（比如一个播放按钮）
                // 则显示预览区域，并尝试播放
                preview.style.display = "block"; // 显示预览元素
                preview.play() // 播放视频
                    .catch(e => console.error("播放失败", e));// 如果播放失败，打印错误
                return false; // 阻止事件冒泡或默认行为（
            }
            // 如果不是播放按钮，则隐藏 urlPanel（比如点击的是面板头部，但不是播放按钮）
            data.urlPanel.style.display = "none"; // 隐藏 .url 面板
            // 如果预览视频正在播放，则暂停它
            !preview[0]?.paused && preview.pause();
            return false;
        }
        // 情况2：当前是 “显示 .url 面板” 的状态
        data.urlPanel.style.display = "block"; // 显示 .url 面板
        if (!Boolean(mediaInfo.dataset.state === "true")) { // 如果 mediaInfo 还没有标记为已初始化（通过 dataset.state 判断）
            // 设置状态为已初始化，避免重复处理
            mediaInfo.dataset.state = "true";
            // 判断当前数据类型，分别处理 M3U8、图片、或其他类型
            if (isM3U8(data)) {
                alert("isM3U8 ");  // 如果是 M3U8 流（比如直播或 HLS），弹出提示（可扩展为加载 M3U8 播放器）
            } else if (data.isPlay) { // 如果是可播放的视频类型（比如 MP4 等）
                // 设置网络请求头
                setRequestHeaders(data.requestHeaders, function () {
                    // 请求头设置完毕后，设置预览元素的 src 为当前数据中的 URL
                    preview.setAttribute("src", data.url);
                });
            } else if (isPicture(data)) { // 如果是图片类型，弹出提示（可扩展为显示图片预览逻辑）
                alert(" isPicture ");
            } else { // 其它类型，暂时只弹窗提示
                alert("Other ")
            }
            // 监听视频的元数据加载完成事件（比如视频宽高、时长等信息此时才可用）
            preview.addEventListener("loadedmetadata", function () {
                // 元数据加载完成后，显示预览区域（比如之前可能被隐藏）
                preview.style.display = "block"; // 显示
                // this.duration  视频总时间
                if (this.duration && this.duration !== Infinity) { // 如果当前视频元素的 duration 属性存在，且不为 Infinity（即不是无限大/无效值）
                    // 将视频总时长（秒）保存到 data.duration 中
                    data.duration = this.duration;
                    // 在 mediaInfo 区域中显示格式化后的时长信息，比如 "00:01:30"
                    mediaInfo.insertAdjacentHTML("beforeend", `<br><b>${i18n.duration}:</b> ` + seconds2Time(this.duration));
                }
                if (this.videoHeight && this.videoWidth) {  // 如果视频的宽高信息存在
                    // 在页面上显示分辨率信息，比如 "1920x1080"
                    mediaInfo.insertAdjacentHTML("beforeend", `<br><b>${i18n.resolution}:</b> ` + this.videoWidth + "x" + this.videoHeight);
                    // 同时把 视频宽高保存到 data 对象中
                    data.videoWidth = this.videoWidth;
                    data.videoHeight = this.videoHeight;
                }
            });
        }
        if (event.target.id === "play") {  // 如果点击的目标是 "play" 按钮（比如用户点击播放按钮触发播放）
            preview.style.display = "block"; // 确保预览区域可见
            preview.play();  // 执行播放
        }
        return false; // 阻止默认行为或冒泡
    });

    // 二维码
    data.html.querySelector("#qrcode")
        .addEventListener("click", function () {
            alert(" 二维码！！！！ ");
        });

    // 下载器
    data.html.querySelector("#capture-down")
        .addEventListener("click", function () {
            alert(" 下载器！！！ ");
        });

    // 拷贝 - 点击复制网址
    data.html.querySelector("#copy")
        .addEventListener("click", function () {
            alert(" 拷贝！！！");
        });

    // 发送到Aria2
    data.html.querySelector("#aria2")
        .addEventListener("click", function () {
            alert(" aria2！！！");
        });

    // 下载
    data.html.querySelector("#download")
        .addEventListener("click", function () {
            alert(" 下载！！！");
        });

    // 调用
    data.html.querySelector(".invoke")
        .addEventListener("click", function (event) {
            alert(" 调用！！！");
        });

    // 播放
    data.html.querySelector("#play")
        .addEventListener("click", function () {
            alert(" 播放！！！");
        });

    // 解析
    data.html.querySelector("#parsing")
        .addEventListener("click", function (event) {
            alert(" 解析！！！");
        });


    // TODO OTHER ......
    // 多选框 创建checked属性 值和checked状态绑定
    data._checked = checkboxState;
    data.html.querySelector(".down-check").checked = data._checked;
    // 复选框 点击处理事件
    data.html.querySelector("input").addEventListener("click", function () {
        alert(" checkbox .......");
    });
    // 使用 Object.defineProperty 为 data 对象定义一个名为 "checked" 的访问器属性（getter / setter）
    // 对外提供一个统一的属性 checked，用于获取或设置该数据项的选中状态，同时同步内部状态和 UI
    Object.defineProperty(data, "checked", {
        get() {
            // 当外部读取 data.checked 时，返回内部存储的状态 _checked
            return data._checked;
        },
        set(newValue) {
            // 当外部设置 data.checked = true/false 时：
            // 更新内部状态 _checked
            data._checked = newValue;
            // 同步更新页面上对应的复选框 DOM 元素的选中状态（input 元素）
            data.html.querySelector("input").checked = newValue;
        }
    });

    // 使用Map 储存数据
    allData.get(currentTab).set(data.requestId, data);
    console.log(" .......", allData)
    // 返回生成的 DOM 结构
    return data.html;
}

// 绑定事件
// 选项卡切换处理
// 获取所有在 .tabs 下的 .tab-button 元素
// 通常是页面中的多个标签页按钮，比如：“当前页”、“所有页”、“功能页”等
const tabButtons = document.querySelectorAll(".tabs .tab-button");
// 获取所有 class 为 "container" 的内容区域元素
// 通常是和每个标签页按钮对应的内容面板，比如：“当前页内容”、“所有页内容”等
const containers = document.querySelectorAll(".container");
// 为每一个标签按钮（tabButtons）添加点击事件监听
tabButtons.forEach(function (button, index) {
    // 当前按钮被点击时触发此函数
    button.addEventListener("click", function () {
        // 判断当前点击的按钮的 id 是否为 "current-tab"
        // 如果是，则将 activeTab 设为 true，否则为 false
        // activeTab 可用于后续逻辑判断当前是否为“当前页”标签，比如高亮、特殊处理等
        activeTab = this.id === "current-tab";
        // 遍历所有标签按钮，移除它们的 "active" 类
        // 目的是取消所有按钮的选中状态（比如高亮、背景色等）
        tabButtons.forEach(button_ => button_.classList.remove("active"));
        // 给当前被点击的按钮添加 "active" 类
        // 用于显示该按钮为“当前选中”的标签，通常配合 CSS 实现高亮样式
        this.classList.add("active");
        // 遍历所有内容容器（.container），移除它们的 "tab-show" 类
        // 目的是隐藏所有标签页对应的内容区域
        containers.forEach(container => container.classList.remove("tab-show"));
        // 判断当前索引对应的容器是否存在
        // 如果存在，则给该容器添加 "tab-show" 类
        // 用于显示与当前点击标签对应的页面内容（比如显示“当前页”的内容面板）
        if (containers[index]) containers[index].classList.add("tab-show");
        // 判断全局函数 toggleUI 是否存在并且是一个函数
        // 如果是，则调用它，通常用于处理额外的 UI 状态切换逻辑
        // 比如：切换菜单显示、更新图标、发送统计数据等
        if (typeof toggleUI === "function") toggleUI();
        // TODO: 其它需要操作的 DOM 元素，比如隐藏 filter、unfold、features 等
    });
});


// TODO 其他页面

// TODO 下载选中文件

// TODO 合并下载

// TODO 复制选中文件

// 全选 反选 实现点击【全选】和【反选】按钮的交互

document.getElementById("all-select")
    // 全选 【全选】按钮点击事件：点击后调用 updateSelection(true) 尝试全选所有数据项
    .addEventListener("click", () => updateSelection(true));
// 反选
document.getElementById("invert-selection")
    //【反选】按钮点击事件：点击后调用 updateSelection(false) 尝试反向选择所有数据项
    .addEventListener("click", () => updateSelection(false));

/**
 * updateSelection  根据参数 isSelectAll 来执行【全选】或【反选】操作
 * @param {boolean} isSelectAll - 是否为“全选”操作；true 表示全选，false 表示反选
 * @author LiuQi
 */
function updateSelection(isSelectAll) {
    // 定义一个 checked 变量
    let checked = false;
    if (isSelectAll) { // 如果是全选操作，强制设置 checked 为 true
        checked = true;
    }
    // 遍历当前页面的所有数据项
    getData().forEach(function (data) {
        // 如果是全选，则将所有项设为 checked（true）
        // 如果是反选，则将每个项的选中状态取反（data.checked = !data.checked）
        data.checked = checked ? checked : !data.checked;
    });
    // 更新合并下载按钮状态
    mergeDownButton();
}

// 等待 G 全局变量加载完整的操作
// 使用 setInterval 轮询检查
const interval = setInterval(function () {
    // 如果 G 的同步初始化、本地初始化未完成，或者当前 tabId 还未获取到，则跳过本轮，继续等待
    if (!G.initializeSyncComplete || !G.initializeLocalComplete || !G.tabId) return;
    // 一旦条件满足，清除轮询定时器，不再继续检查
    clearInterval(interval);
    // 如果 G.popup 存在，且 _tabId 不存在（未定义或为假值）
    if (G.popup && !_tabId) {
        alert(" G.popup && !_tabId ");// TODO：调试用，后续可删除或替换为日志
    }
    // 如果存在 _tabId，表示当前处于侧边面板模式，可以设置 body 宽度为 100% 等样式操作（调试用）
    if (_tabId) {
        alert(" 侧边面板模式 body 宽度100% ");  // TODO：调试用，可后续改为样式控制或日志
    }
    // 获取页面DOM
    // 向当前活动 Tab（G.tabId）发送消息，请求获取页面 DOM 结构
    // 消息内容为 {Message: "getPage"}，目标 frame 为 frameId: 0（通常是主框架）
    chrome.tabs.sendMessage(G.tabId, {Message: "getPage"}, {frameId: 0}, function (data) {
        if (chrome.runtime.lastError) return; // 如果发送消息出错（比如 tab 已关闭），直接退出
        alert("  获取页面DOM "); // TODO：调试用，表示已尝试获取页面 DOM
    });
    // 填充数据
    // 向 Chrome 扩展自身（通过 chrome.runtime.id）发送消息，请求获取当前 tabId 关联的数据
    // 消息内容为 {Message: "getData", tabId: G.tabId}
    chrome.runtime.sendMessage(chrome.runtime.id, {Message: "getData", tabId: G.tabId}, function (data) {
        // 如果返回的数据不存在，或者仅仅是字符串 "OK"，则表示当前 tab 没有数据
        if (!data || data === "OK") {
            // 设置提示元素 $tips 的文本内容为 i18n.noData（比如 "暂无数据"）
            $tips.textContent = i18n.noData;
            // 同时设置一个自定义属性，用于国际化绑定
            $tips.setAttribute("data-i18n", "noData");
            return // 直接返回
        }
        // 如果有数据，记录当前数据条数
        currentCount = data.length;
        // 如果数据条数超过或等于 500
        if (currentCount >= 500) {
            alert(" currentCount >= 500 ！！！！"); // TODO：调试用，数据量大时提醒
        }
        // 遍历数据，为每一项数据生成动态 DOM 元素，并追加到某个容器中
        for (let index = 0; index < currentCount; index++) {
            // 根据数据项生成一段 DOM 结构
            $current.append(addDynamicMedia(data[index])); // 构建当前项的 DOM
        }
        // 最后将这一批动态生成的 DOM 元素（$current div）追加到页面中某个父容器（$mediaList #media-list） 中
        $mediaList.append($current);
        // toggleUI
        toggleUI();
    });
    console.log(" 等待 G 全局变量加载完整的操作 ");
}, 0); // 每隔 0ms 检查一次（实际是尽快执行，但由浏览器调度，不保证真正 0ms 间隔）

/**
 * toggleUI 根据当前数据状态动态更新用户界面（UI），包括提示信息、计数、按钮状态等
 * @author LiuQi
 */
function toggleUI() {
    // 获取当前页面的数据条数
    const size = getData().size;
    // 根据数据量决定“暂无数据”提示的显示与内容
    size > 0
        ? $tips.style.display = "none" // 有数据，隐藏提示
        : ($tips.style.display = "block", $tips.textContent = i18n.noData); // 无数据，显示提示文本
    // 更新当前数量显示
    $currentCount.textContent = currentCount ? `[${currentCount}]` : "";
    // 更新总数量显示
    $allCount.textContent = allCount ? `[${allCount}]` : "";
    // 检查当前显示的是哪个标签页
    const id = document.querySelector(".tab-show")?.id;
    if (id !== "media-list" && id !== "all-media-list") { // 如果当前不是媒体列表相关标签页，则隐藏提示和下载按钮，并弹出当前标签页信息
        $tips.style.display = "none";
        $down.style.display = "none";
        alert("当前选项卡：" + id);
    } else if (window.getComputedStyle($down).display === "none") {  // 如果下载按钮当前是隐藏状态，则显示它
        alert(" :hidden ")
        $down.style.display = "block";
    }
    // 更新图标
    // 获取所有 class="faviconFlag" 的 DOM 元素（NodeList）
    const faviconFlags = document.querySelectorAll('.favicon-flag');
    // 遍历每一个元素
    faviconFlags.forEach(function () {
        alert(" faviconFlags.forEach ")
    });
    // 弹出当前检测到的视频数量以及是否支持合并的提示
    alert("  当前嗅到视频数量 是否可以支持合并：" + (size >= 2));
    // 如果数据条数大于等于 2，说明可以尝试合并，启用合并下载按钮；否则禁用
    size >= 2 ? mergeDownButton() : $mergeDown.setAttribute("disabled", true);
}

/**
 * mergeDownButton 合并下载按钮处理
 * @author LiuQi
 */
function mergeDownButton() {
    // getCheckedData 获取当前标签 所有选择的文件
    getCheckedData();
    // mergeDownButtonCheck 进行合并下载前的校验
    mergeDownButtonCheck();
}

/**
 * mergeDownButtonCheck 合并下载校验
 * @author LiuQi
 */
function mergeDownButtonCheck() {
    console.warn("  mergeDownButtonCheck 合并下载按钮 校验处理 ");
}

/**
 * getCheckedData 获取当前标签 所有选择的文件
 * 获取当前标签页中所有被选中（checked=true）的文件数据，同时计算这些文件中的最大文件大小
 * @author LiuQi
 */
function getCheckedData() {
    // 用于存放所有被选中的数据
    const checkedData = [];
    // 用于记录最大的文件大小
    let maxSize = 0;
    // 遍历当前页面的所有数据
    getData().forEach(function (data) {
        if (data.checked) { // 数据项被选中
            // 获取文件大小，如果不存在则默认为 0
            const size = data._size ?? 0;
            // 更新最大文件大小
            maxSize = size > maxSize ? size : maxSize;
            // 将选中的数据加入数组
            checkedData.push(data);
        }
    });
    // 返回选中的数据数组和最大文件大小
    return [checkedData, maxSize];
}


/**
 * getData 根据 requestId 获取对应的数据对象
 * @param {boolean|string} requestId - 可选，资源的唯一标识符
 * @author LiuQi
 */
function getData(requestId = false) {
    if (requestId) { // 如果指定了 requestId，返回当前活跃标签页中该 requestId 对应的数据
        return allData.get(activeTab).get(requestId);
    }
    // 如果未指定 requestId，返回当前活跃标签页的全部数据
    return allData.get(activeTab);
}

/**
 * getAllData 获取所有页面的全部数据
 * @author LiuQi
 */
function getAllData() {
    // TODO 获取所有页面的全部数据（待实现）
}

