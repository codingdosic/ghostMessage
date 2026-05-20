/**
 * 백엔드(Background Script)와의 통신을 담당하는 API 클라이언트 모음
 */

/**
 * 메시지 삭제 요청 및 후처리
 */
function confirmDelete(messageId) {
    const targetLink = activeLink;
    if (!targetLink) return;
    const anchorKey = normalizeUrl(targetLink.href);

    showConfirmModal("Delete Message", "Are you sure you want to delete this message? This action cannot be undone.", () => {
        chrome.runtime.sendMessage({ action: "deleteMessage", messageId, authorId: MY_ID }, (response) => {     
            if (response.success) { 
                let messages = messageMap.get(anchorKey);
                if (messages) {
                    messages = messages.filter(m => m.id != messageId);
                    messageMap.set(anchorKey, messages);
                    const filtered = getFilteredMessages(targetLink, messages);

                    if (filtered.length === 0) {
                        hideTooltip();
                        applyHighlights(); 
                    } else if (currentTooltip) {
                        const container = currentTooltip.querySelector('div');
                        container.innerHTML = generateMessagesHtml(filtered);
                        bindTooltipEvents(container, filtered);
                    }
                    updateHUD(); 
                    showToast("Message deleted.", "success");
                }
            } else {
                showToast("Delete failed: " + response.error, "error");
            }
        });
    });
}

/**
 * 메시지 추천/비추천 투표 요청 및 후처리
 */
function castVote(messageId, type) {
    const targetLink = activeLink;
    if (!targetLink) return;
    const anchorKey = normalizeUrl(targetLink.href);

    chrome.runtime.sendMessage({ action: "voteMessage", messageId, type, userId: MY_ID }, (response) => {      
        if (response.success) {
            const updatedMsg = response.data;
            const messages = messageMap.get(anchorKey);
            
            if (messages && updatedMsg) {
                const index = messages.findIndex(m => m.id == updatedMsg.id);
                if (index !== -1) {
                    messages[index] = updatedMsg; 
                    const filtered = getFilteredMessages(targetLink, messages);
                    if (currentTooltip) {
                        const container = currentTooltip.querySelector('div');
                        container.innerHTML = generateMessagesHtml(filtered);
                        bindTooltipEvents(container, filtered);
                    }
                    updateHUD(); 
                    showToast("Vote recorded.", "success");
                }
            }
        } else {
            showToast(response.error, "error");
        }
    });
}

/**
 * 메시지 저장 요청
 */
function saveMessage(data, callback) {
    chrome.runtime.sendMessage({
        action: "saveMessage",
        data: data
    }, callback);
}

/**
 * 페이지의 모든 메시지 가져오기
 */
function fetchAllMessages(pageUrl, callback) {
    chrome.runtime.sendMessage({ 
        action: "fetchAllMessages", 
        pageUrl: pageUrl 
    }, callback);
}

/**
 * 사용자 정보 가져오기 (HUD 업데이트용)
 */
function fetchUserInfo(userId, callback) {
    chrome.runtime.sendMessage({ 
        action: "fetchUserInfo", 
        userId: userId 
    }, callback);
}
