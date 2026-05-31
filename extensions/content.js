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

    // HUD 즉시 생성 (연결 중 상태로 시작)
    createHUD();
    updateHUD('connecting');

    chrome.storage.local.get(['userId'], (result) => {
        MY_ID = result.userId;
        
        // ID가 없으면 등록될 때까지 잠시 대기 후 재시도 (서버 기동 초기 단계 고려)
        if (!MY_ID) {
            console.log("[GhostMessage] User ID not found, retrying in 3s...");
            setTimeout(() => {
                isInitializing = false;
                init();
            }, 3000);
            return;
        }

        syncWithServer();
        startHeartbeat(); // 실시간 상태 감시 시작
    });
}

/**
 * 주기적으로 서버 상태를 체크하는 Heartbeat (30초 주기)
 */
function startHeartbeat() {
    if (window.ghostHeartbeatInterval) clearInterval(window.ghostHeartbeatInterval);
    
    window.ghostHeartbeatInterval = setInterval(() => {
        // 이미 연결 중(재시도 중)인 상태면 중복 체크 방지
        const statusEl = document.getElementById('hud-status');
        if (statusEl && statusEl.classList.contains('connecting')) return;

        const pageUrl = normalizeUrl(window.location.href);
        fetchAllMessages(pageUrl, (response) => {
            if (!response || !response.success) {
                console.log("[GhostMessage] Heartbeat failed, switching to connecting status...");
                updateHUD('connecting');
                syncWithServer(); // 재연결 프로세스 시작
            }
        });
    }, 30000); // 30초마다 체크
}

/**
 * 서버와 데이터를 동기화하고 실패 시 재시도합니다.
 */
function syncWithServer() {
    const pageUrl = normalizeUrl(window.location.href);
    console.log("[GhostMessage] Syncing with server...");
    
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
            updateHUD('online');
            startHeartbeat(); // 연결 성공 시 하트비트 확실히 재시작
            isInitializing = false;
            console.log("[GhostMessage] Sync complete.");
        } else {
            console.log("[GhostMessage] Sync failed, retrying in 10s...");
            updateHUD('connecting');
            setTimeout(syncWithServer, 10000); // 10초 후 재시도
        }
    });
}

// ---------------------------------------------------------
// 0. 가치 있는 링크 판별 로직
// ---------------------------------------------------------
function isValuableLink(link) {
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
                    updateHUD('online'); 
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
