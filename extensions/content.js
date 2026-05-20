/**
 * Web Ghost Messages - Main Entry Point
 * 초기화 및 이벤트 리스너 관리를 담당합니다.
 */

// ---------------------------------------------------------
// 1. 초기화 로직
// ---------------------------------------------------------
function init() {
    if (isInitializing) return;
    isInitializing = true;

    chrome.storage.local.get(['userId'], (result) => {
        MY_ID = result.userId;
        if (!MY_ID) return;

        const pageUrl = normalizeUrl(window.location.href);
        fetchAllMessages(pageUrl, (response) => {
            if (response && response.success && response.data) {
                messageMap.clear();
                response.data.forEach(msg => {
                    const key = normalizeUrl(msg.anchorKey);
                    if (!messageMap.has(key)) messageMap.set(key, []);
                    messageMap.get(key).push(msg);
                });
                
                applyHighlights();
                startObserving();
                createHUD();
            }
            isInitializing = false;
        });
    });
}

// ---------------------------------------------------------
// 2. 이벤트 리스너 등록
// ---------------------------------------------------------

// 우클릭 시점의 요소 기억 (메시지 작성용)
document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target.closest('a');
}, true);

// 링크 호버 시 툴팁 표시
document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const anchorKey = normalizeUrl(link.href);
    const messages = messageMap.get(anchorKey);

    if (messages && messages.length > 0) {
        const filteredMessages = getFilteredMessages(link, messages);
        if (filteredMessages.length === 0) return;
        if (link.dataset.ghostTooltipActive) return;

        link.dataset.ghostTooltipActive = "true";
        chrome.storage.sync.get({ sortOrder: 'DESC' }, (items) => {
            if (!link.matches(':hover')) {
                delete link.dataset.ghostTooltipActive;
                return;
            }

            const sorted = [...filteredMessages].sort((a, b) => {
                if (items.sortOrder === 'SCORE') {
                    return (b.upVoteScore - b.downVoteScore) - (a.upVoteScore - a.downVoteScore);
                }
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return items.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
            });
            showTooltip(e, sorted, link);
        });

        link.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (currentTooltip && currentTooltip.matches(':hover')) return;
                hideTooltip(); 
            }, 150);
        }, { once: true });
    }
}, true);

// 백엔드(Context Menu)로부터의 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWriteModal") {
        const targetLink = lastRightClickedElement; 
        if (!targetLink) return;

        showWriteModal((content, type) => {
            const anchorKey = normalizeUrl(targetLink.href);
            saveMessage({
                authorId: MY_ID,
                pageUrl: normalizeUrl(request.pageUrl),
                anchorKey: anchorKey,
                selector: getUniqueSelector(targetLink),
                linkText: targetLink.innerText.trim(),
                imgSrc: targetLink.querySelector('img')?.src || null,
                type: type,
                content: content
            }, (response) => {
                if (response.success) { 
                    if (!messageMap.has(anchorKey)) messageMap.set(anchorKey, []);
                    messageMap.get(anchorKey).push(response.data);
                    applyHighlights(); 
                    updateHUD(); 
                    showToast("Message posted successfully!", "success");
                } else {
                    showToast("Failed to post: " + response.error, "error");
                }
            });
        });
    }
});

// 실행 지점
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
