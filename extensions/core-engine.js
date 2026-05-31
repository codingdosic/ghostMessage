/**
 * 유령 메시지 핵심 엔진 및 전역 상태 관리
 */

// --- 전역 상태 ---
let currentTooltip = null;
let activeLink = null;
let messageMap = new Map(); // key: anchorKey, value: messageList
let isInitializing = false;
let observer = null;
let lastRightClickedElement = null;
let MY_ID = null;

// --- 하이라이트 엔진 ---

/**
 * 하이라이트 스타일 제거 공통 함수
 */
function clearHighlightStyle(link) {
    link.style.borderBottom = "";
    link.style.backgroundColor = "";
    link.style.boxShadow = "";
    link.style.borderRadius = "";
    link.style.padding = "";
    link.style.margin = "";
    link.style.boxDecorationBreak = "";
    link.style.webkitBoxDecorationBreak = "";
    delete link.dataset.ghostHighlighted;
}

/**
 * 페이지 내의 링크들에 하이라이트 적용
 */
function applyHighlights() {
    chrome.storage.sync.get({
        enableHighlight: true,
        highlightColor: '#6200ee',
        highlightOpacity: 0.15
    }, (settings) => {
        const links = document.querySelectorAll('a');

        if (!settings.enableHighlight) {
            links.forEach(link => {
                if (link.dataset.ghostHighlighted) clearHighlightStyle(link);
            });
            return;
        }

        const color = settings.highlightColor;
        const opacity = settings.highlightOpacity;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        links.forEach((link) => {
            const key = normalizeUrl(link.href);
            const messages = messageMap.get(key);

            if (messages && messages.length > 0) {
                const filtered = getFilteredMessages(link, messages);

                if (filtered.length > 0) {
                    link.style.backgroundColor = rgba;
                    link.style.borderRadius = "4px";
                    link.style.boxShadow = `0 0 0 2px ${rgba}, inset 0 -2px 0 ${color}, 0 2px 10px ${rgba}`;
                    link.style.boxDecorationBreak = "clone";
                    link.style.webkitBoxDecorationBreak = "clone";
                    link.dataset.ghostHighlighted = "true";
                    return; 
                }
            }

            if (link.dataset.ghostHighlighted) {
                clearHighlightStyle(link);
            }
        });
    });
}

// 디바운스된 하이라이트 적용 함수 (0.2초 대기)
const debouncedApplyHighlights = debounce(() => {
    applyHighlights();
}, 200);

/**
 * DOM 변화를 감지하여 동적으로 추가된 링크 처리
 */
function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
        // 직접 applyHighlights를 호출하는 대신 디바운스된 버전 호출
        debouncedApplyHighlights();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
