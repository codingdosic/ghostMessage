// ---------------------------------------------------------
// 1. 전역 변수 및 설정
// ---------------------------------------------------------
let currentTooltip = null;
let messageMap = new Map(); // key: anchorKey, value: messageList
let isInitializing = false;
let observer = null;
const MY_ID = "550e8400-e29b-41d4-a716-446655440000"; 

// ---------------------------------------------------------
// 2. 유틸리티 함수
// ---------------------------------------------------------
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

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

// ---------------------------------------------------------
// 3. 핵심 기능 함수 (하이라이트 및 툴팁)
// ---------------------------------------------------------
function applyHighlights() {
    const links = document.querySelectorAll('a');
    let count = 0;
    links.forEach((link) => {
        const key = normalizeUrl(link.href);
        if (messageMap.has(key)) {
            // 이미 적용된 스타일이 아닐 경우에만 적용
            if (link.style.borderBottom !== "3px solid rgb(98, 0, 238)") {
                link.style.borderBottom = "3px solid #6200ee";
                link.style.backgroundColor = "rgba(98, 0, 238, 0.15)";
                link.title = "유령 메시지가 있는 링크입니다 👻";
            }
            count++;
        }
    });
    // console.log("[GhostMessage] Highlighted", count, "links");
}

// 동적 변화 감시를 위한 옵저버 설정
function startObserving() {
    if (observer) observer.disconnect();
    
    observer = new MutationObserver((mutations) => {
        // 변화가 감지되면 하이라이트 재적용 (Debounce 처리 없이 즉시 실행)
        applyHighlights();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function showTooltip(event, messageList) {
    if (currentTooltip) hideTooltip();
    
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'ghost-tooltip';
    
    const messagesHtml = messageList.map(msg => `
        <div class="message-item" style="border-bottom: 1px solid #eee; padding: 8px 0; margin-bottom: 5px;">
            <div style="font-weight: bold; font-size: 11px; color: #6200ee;">👻 ${msg.nickname || '익명'}</div>
            <div style="margin: 3px 0; font-size: 13px; color: #e0e0ff;">${msg.content}</div>
            <div style="font-size: 12px; display: flex; align-items: center; gap: 12px;">
                <div style="display: flex; gap: 8px;">
                    <button class="vote-up-btn" data-id="${msg.id}" style="background:none; border:none; color:#e0e0ff; cursor:pointer; padding:0; font-size: 12px;">
                        👍 ${msg.upVoteScore}
                    </button>
                    <button class="vote-down-btn" data-id="${msg.id}" style="background:none; border:none; color:#e0e0ff; cursor:pointer; padding:0; font-size: 12px;">
                        👎 ${msg.downVoteScore}
                    </button>
                </div>
                <div style="margin-left: auto;">
                    ${msg.authorId === MY_ID ? `<button class="delete-btn" data-id="${msg.id}" style="background:none; border:none; color: #ff5252; cursor:pointer; font-size: 11px; font-weight: bold;">삭제</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');

    currentTooltip.innerHTML = `<div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">${messagesHtml}</div>`;

    currentTooltip.querySelectorAll('.vote-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); castVote(btn.dataset.id, 'UP'); });
    });
    currentTooltip.querySelectorAll('.vote-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); castVote(btn.dataset.id, 'DOWN'); });
    });
    currentTooltip.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); confirmDelete(btn.dataset.id); });
    });

    document.body.appendChild(currentTooltip);
    currentTooltip.style.left = event.pageX + 10 + 'px';
    currentTooltip.style.top = event.pageY + 10 + 'px';
    currentTooltip.style.pointerEvents = 'auto'; 

    currentTooltip.addEventListener('mouseleave', () => { hideTooltip(); });
}

// ---------------------------------------------------------
// 4. 통신 및 액션 함수
// ---------------------------------------------------------
function confirmDelete(messageId) {
    if (confirm("정말로 이 흔적을 지우시겠습니까?")) {
        chrome.runtime.sendMessage({ action: "deleteMessage", messageId, authorId: MY_ID }, (response) => {
            if (response.success) { alert("흔적이 사라졌습니다."); location.reload(); }
        });
    }
}

function castVote(messageId, type) {
    chrome.runtime.sendMessage({ action: "voteMessage", messageId, type }, (response) => {
        if (response.success) { alert("투표가 반영되었습니다!"); location.reload(); }
    });
}

function init() {
    if (isInitializing) return;
    isInitializing = true;

    const pageUrl = normalizeUrl(window.location.href);

    chrome.runtime.sendMessage({ action: "fetchAllMessages", pageUrl: pageUrl }, (response) => {
        if (response && response.success && response.data) {
            messageMap.clear();
            response.data.forEach(msg => {
                const key = normalizeUrl(msg.anchorKey);
                if (!messageMap.has(key)) messageMap.set(key, []);
                messageMap.get(key).push(msg);
            });
            
            // 데이터 로드 후 최초 하이라이트 및 변화 감시 시작
            applyHighlights();
            startObserving();
        }
        isInitializing = false;
    });
}

// ---------------------------------------------------------
// 5. 이벤트 리스너 등록
// ---------------------------------------------------------

document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const anchorKey = normalizeUrl(link.href);
    const messages = messageMap.get(anchorKey); 

    if (messages && messages.length > 0) {
        if (link.dataset.ghostTooltipActive) return;

        chrome.storage.sync.get({ sortOrder: 'DESC' }, (items) => {
            const sorted = [...messages].sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return items.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
            });
            showTooltip(e, sorted);
            link.dataset.ghostTooltipActive = "true";
        });

        link.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (currentTooltip && currentTooltip.matches(':hover')) return; 
                hideTooltip();
                delete link.dataset.ghostTooltipActive;
            }, 150);
        }, { once: true });
    }
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWriteModal") {
        const messageContent = window.prompt("이 링크에 남길 유령 메시지를 입력하세요 (최대 100자):");
        if (messageContent && messageContent.trim().length > 0) {
            chrome.runtime.sendMessage({
                action: "saveMessage",
                data: {
                    authorId: MY_ID,
                    pageUrl: normalizeUrl(request.pageUrl),
                    anchorKey: normalizeUrl(request.anchorKey),
                    type: "Tip",
                    content: messageContent
                }
            }, (response) => {
                if (response.success) { alert("성공적으로 흔적을 남겼습니다!"); location.reload(); }
            });
        }
    }
});

// 초기화 시작
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
