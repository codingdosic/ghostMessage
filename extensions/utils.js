/**
 * 유령 메시지 유틸리티 함수 모음
 */

/**
 * URL 정규화 (소문자화, 쿼리/해시 제거, 끝 슬래시 제거)
 */
function normalizeUrl(url) {
    if (!url) return "";
    try {
        const urlObj = new URL(url, window.location.origin);
        let pureUrl = urlObj.origin + urlObj.pathname;
        return pureUrl.toLowerCase().replace(/\/$/, "");
    } catch (e) {
        return url.trim().toLowerCase().split(/[?#]/)[0].replace(/\/$/, "");
    }
}

/**
 * 특정 링크에 적용될 메시지만 필터링 (Selector, 텍스트, 이미지 일치 여부 확인)
 */
function getFilteredMessages(link, messages) {
    if (!messages) return [];
    return messages.filter(msg => {
        const selectorMatch = !msg.selector || link.matches(msg.selector);
        const textMatch = !msg.linkText || link.innerText.trim() === msg.linkText.trim();
        const img = link.querySelector('img');
        const imgMatch = !msg.imgSrc || (img && img.src === msg.imgSrc);
        return selectorMatch && textMatch && imgMatch;
    });
}

/**
 * 요소의 고유 CSS Selector 추출
 */
function getUniqueSelector(el) {
    if (el.id) return '#' + el.id;
    let path = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
        path += '.' + el.className.trim().split(/\s+/).join('.');
    }
    return path;
}
