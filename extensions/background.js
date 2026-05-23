const SERVER_URL = "http://168.107.12.18:8080"; // 운영 서버
// const SERVER_URL = "http://localhost:8080"; // 로컬 서버
const API_BASE_URL = `${SERVER_URL}/api/messages`;

// 1. 익스텐션 설치 시 우클릭 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "leaveGhostMessage",
        title: "Leave a Ghost Message...",
        contexts: ["link"] // 링크 위에서 우클릭했을 때만 나타남
    });

    // 고유 ID 확인 및 등록
    chrome.storage.local.get(['userId'], (result) => {
        if (!result.userId) {
            fetch(`${SERVER_URL}/api/users/register`, { method: "POST" })
                .then(res => res.json())
                .then(user => {
                    chrome.storage.local.set({ userId: user.uuid }, () => {
                        console.log("새 사용자 등록 완료:", user.uuid);
                    });
                })
                .catch(err => console.error("사용자 등록 실패:", err));
        }
    });
});

// 2. 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "leaveGhostMessage") {
        // Content Script에 메시지 작성창을 띄우라고 신호를 보냄
        chrome.tabs.sendMessage(tab.id, {
            action: "openWriteModal",
            pageUrl: tab.url,
            anchorKey: info.linkUrl
        });
    }
});

// 3. 메시지 조회 및 저장 처리 (기존 fetchMessages 로직 포함)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchMessages") {
        fetch(`${API_BASE_URL}?pageUrl=${encodeURIComponent(request.pageUrl)}&anchorKey=${encodeURIComponent(request.anchorKey)}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "saveMessage") {
        fetch(API_BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request.data)
        })
        .then(async res => {
            const data = await res.json();
            if (res.ok) return { success: true, data };
            return { success: false, error: data.message || "기록에 실패했습니다." };
        })
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "voteMessage") {
        fetch(`${API_BASE_URL}/${request.messageId}/vote?type=${request.type}&userId=${request.userId}`, {
            method: "POST"
        })
        .then(async res => {
            const data = await res.json();
            if (res.ok) return { success: true, data };
            return { success: false, error: data.message || "투표에 실패했습니다." };
        })
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "deleteMessage") {
        fetch(`${API_BASE_URL}/${request.messageId}?authorId=${request.authorId}`, {
            method: "DELETE"
        })
        .then(res => {
            if (res.ok) sendResponse({ success: true });
            else sendResponse({ success: false, error: "No permission to delete or server error." });
        })
        .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "fetchAllMessages") {
        const fetchUrl = `${API_BASE_URL}/all?pageUrl=${encodeURIComponent(request.pageUrl)}`;
        console.log("[GhostMessage] Background receiving fetchAllMessages for:", fetchUrl);

        fetch(fetchUrl)
            .then(res => {
                console.log("[GhostMessage] Background fetch status:", res.status, res.statusText);
                return res.json();
            })
            .then(data => {
                console.log("[GhostMessage] Background received data count:", data ? data.length : 0);
                sendResponse({ success: true, data });
            })
            .catch(err => {
                console.error("[GhostMessage] Background fetch error:", err);
                sendResponse({ success: false, error: err.message });
            });
        return true;
    }

    if (request.action === "fetchUserInfo") {
        fetch(`${SERVER_URL}/api/users/${request.userId}`)
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "updateMenuVisibility") {
        chrome.contextMenus.update("leaveGhostMessage", { visible: request.visible }, () => {
            if (chrome.runtime.lastError) {
                // 메뉴가 아직 생성되지 않았거나 에러가 있는 경우 무시
            }
        });
        return false;
    }
    });