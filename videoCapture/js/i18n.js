/**
 * i18n.js
 * @author LiuQi
 */
(function () {
    // // 找出页面中所有带有 data-i18n-outer 属性的 DOM 元素
    document
        .querySelectorAll("[data-i18n-outer]") // 选择所有含该属性的元素
        .forEach(function (element) { // 遍历每一个元素
            // 获取该元素上 data-i18n-outer 属性的值，通常是多语言的 key，如 "i18n.title"
            const i18nKey = element.dataset.i18nOuter;
            // 调用全局函数 i18n(key)，传入 key，期望返回对应语言的翻译文本
            const translatedText = i18n(i18nKey);
            // 将该元素的整个 outerHTML（即元素本身和其内容）替换为翻译后的文本；
            // 如果翻译函数返回 undefined（找不到翻译），则使用原始的 data-i18n-outer 值作为兜底
            element.outerHTML = translatedText ?? element.dataset.i18nOuter;
        });
})();