
/**
 * isLockUrl 判断url是否在屏蔽网址中
 * @param url
 * @return 
 * @author LiuQi
 */
function isLockUrl(url){
	console.log(" // TODO isLockUrl 判断url是否在屏蔽网址中 ", G.blockUrl);
	for(let key in G.blockUrl){
		console.log(" <> ",key);
	}
	return false;
}

/** 
 * wildcardToRegEx 将用户输入的URL（可能包含通配符）转换为正则表达式
 * @param urlPattern  用户输入的URL，可能包含通配符
 * @return 转换后的正则表达式
 * @author LiuQi
 */
function wildcardToRegEx(urlPattern){
	// TODO wildcardToRegEx 将用户输入的URL（可能包含通配符）转换为正则表达式 
	console.log("// TODO wildcardToRegEx 将用户输入的URL（可能包含通配符）转换为正则表达式 " ,urlPattern);
}
