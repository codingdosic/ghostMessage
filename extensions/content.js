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
// 0. 가치 있는 링크 판별 로직
// ---------------------------------------------------------
function isValuableLink(link) {
    if (!link || !link.href) return false;

    const href = link.getAttribute('href').trim();
    const text = link.innerText.trim();
    const hasImg = link.querySelector('img') !== null;
    const className = (link.className || "").toString().toLowerCase();
    const id = (link.id || "").toLowerCase();

    // 1. 기술적 무의미한 링크 (해시, 자바스크립트, 빈 값)
    if (!href || href === "#" || href.startsWith("javascript:")) return false;
    if (!link.href.startsWith("http")) return false;

    // 2. 유튜브 노이즈 필터링 (썸네일, 진행바 등)
    if (window.location.hostname.includes("youtube.com")) {
        // 썸네일 관련 태그나 ID, 클래스 정밀 체크
        const isThumbnail = link.closest('ytd-thumbnail') || 
                            id === "thumbnail" || 
                            className.includes("ytd-thumbnail") ||
                            link.closest('#thumbnail');
        
        if (isThumbnail) return false;

        // 기타 유튜브 제어 요소들
        if (id === "endpoint" || className.includes("ytd-guide-entry-renderer")) {
            if (text.length < 2) return false;
        }
    }

    // 3. 광고 관련 키워드 필터링 (부모 요소까지 확장)
    const adKeywords = ["ad-", "ads-", "sponsored", "banner", "promotion", "ytp-ad"];
    const isAd = adKeywords.some(kw => 
        className.includes(kw) || 
        id.includes(kw) || 
        link.closest(`[class*="${kw}"], [id*="${kw}"]`)
    );
    if (isAd) return false;

    // 4. 구조적 빈 링크 (텍스트도 없고 이미지도 없음)
    if (text.length === 0 && !hasImg) return false;

    return true;
}

// ---------------------------------------------------------
// 2. 이벤트 리스너 등록
// ---------------------------------------------------------

// 마우스 다운 시점에 미리 메뉴 가시성 판단 (contextmenu보다 빠름)
document.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // 우클릭
        const link = e.target.closest('a');
        lastRightClickedElement = link;
        const visible = isValuableLink(link);
        chrome.runtime.sendMessage({ action: "updateMenuVisibility", visible: visible });
    }
}, true);

// 우클릭 시점의 요소 기억 (보조)
document.addEventListener('contextmenu', (e) => {
    const link = e.target.closest('a');
    if (link) {
        lastRightClickedElement = link;
        const visible = isValuableLink(link);
        chrome.runtime.sendMessage({ action: "updateMenuVisibility", visible: visible });
    }
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
        
        // [최종 방어] 링크가 없거나 가치가 없는 링크라면 모달을 띄우지 않음
        if (!targetLink || !isValuableLink(targetLink)) {
            console.log("[GhostMessage] Invalid link for messaging. Action cancelled.");
            return;
        }

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
