// ---------------------------------------------------------
// 1. 전역 변수 및 설정
// ---------------------------------------------------------
let currentTooltip = null;
let activeLink = null; // [추가] 현재 툴팁과 연결된 링크 요소 추적
let messageMap = new Map(); // key: anchorKey, value: messageList
let isInitializing = false;
let observer = null;
let lastRightClickedElement = null; // [추가] 마지막으로 우클릭한 요소 저장
let MY_ID = null; 

// [추가] 우클릭 시점의 요소 기억
document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target.closest('a');
}, true);

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
    // [추가] 툴팁이 닫힐 때 연결된 링크의 상태값도 확실히 제거
    if (activeLink) {
        delete activeLink.dataset.ghostTooltipActive;
        activeLink = null;
    }
}

// ---------------------------------------------------------
// 3. 핵심 기능 함수 (하이라이트 및 툴팁)
// ---------------------------------------------------------
function applyHighlights() {
    // 사용자 설정 가져오기
    chrome.storage.sync.get({
        enableHighlight: true,
        highlightColor: '#6200ee',
        highlightOpacity: 0.15
    }, (settings) => {
        if (!settings.enableHighlight) {
            // 하이라이트가 꺼져있으면 기존 스타일 초기화 후 종료
            document.querySelectorAll('a[data-ghost-highlighted]').forEach(link => {
                link.style.borderBottom = "";
                link.style.backgroundColor = "";
                delete link.dataset.ghostHighlighted;
            });
            return;
        }

        const links = document.querySelectorAll('a');
        const color = settings.highlightColor;
        const opacity = settings.highlightOpacity;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        links.forEach((link) => {
            const key = normalizeUrl(link.href);
            const messages = messageMap.get(key);

            if (messages) {
                const hasMatch = messages.some(msg => {
                    return (!msg.selector || link.matches(msg.selector)) &&
                           (!msg.linkText || link.innerText.trim() === msg.linkText.trim());
                });

                if (hasMatch) {
                    link.style.borderBottom = `3px solid ${color}`;
                    link.style.backgroundColor = rgba;
                    link.dataset.ghostHighlighted = "true"; // 처리된 링크임을 표시
                }
            }
        });
    });
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

function showTooltip(event, messageList, link) {
    if (currentTooltip) hideTooltip();

    activeLink = link; // [추가] 현재 활성화된 링크 저장
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
    chrome.runtime.sendMessage({ action: "voteMessage", messageId, type, userId: MY_ID }, (response) => {
        if (response.success) {
            alert("투표가 반영되었습니다!");
            location.reload();
        } else {
            alert("투표 실패: " + response.error);
        }
    });
}

function init() {
    if (isInitializing) return;
    isInitializing = true;

    chrome.storage.local.get(['userId'], (result) => {
        MY_ID = result.userId;
        if (!MY_ID) {
            console.warn("사용자 ID가 없습니다. 익스텐션을 재설치하거나 서버를 확인하세요.");
            return;
        }

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
    });


}

function getUniqueSelector(el) {
    if (el.id) return '#' + el.id;
    let path = el.tagName.toLowerCase();
    if (el.className) {
        path += '.' + el.className.trim().split(/\s+/).join('.');
    }
    return path;
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
        // [수정] 현재 링크와 모든 정보(selector, 텍스트, 이미지)가 일치하는 메시지만 필터링
        const filteredMessages = messages.filter(msg => {
            const selectorMatch = !msg.selector || link.matches(msg.selector);
            const textMatch = !msg.linkText || link.innerText.trim() === msg.linkText.trim();
            const img = link.querySelector('img');
            const imgMatch = !msg.imgSrc || (img && img.src === msg.imgSrc);

            return selectorMatch && textMatch && imgMatch; // AND로 변경
        });

        if (filteredMessages.length === 0) return;
        if (link.dataset.ghostTooltipActive) return;

        // 1. 즉시 상태 설정하여 중복 진입 방지
        link.dataset.ghostTooltipActive = "true";

        chrome.storage.sync.get({ sortOrder: 'DESC' }, (items) => {
            // 2. 비동기 콜백 시점에 마우스가 아직 링크 위에 있는지 재확인
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
            showTooltip(e, sorted, link); // [수정] link 인자 추가
        });

        link.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (currentTooltip && currentTooltip.matches(':hover')) return;
                hideTooltip(); // [수정] hideTooltip 내부에서 상태 제거를 통합 처리
            }, 150);
        }, { once: true });
    }
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWriteModal") {
        const targetLink = lastRightClickedElement; // [수정] 마지막 우클릭 요소 사용
        if (!targetLink) return;

        const messageContent = window.prompt("이 링크에 남길 유령 메시지를 입력하세요 (최대 100자):");
        if (messageContent && messageContent.trim().length > 0) {
            chrome.runtime.sendMessage({
                action: "saveMessage",
                data: {
                    authorId: MY_ID,
                    pageUrl: normalizeUrl(request.pageUrl),
                    anchorKey: normalizeUrl(request.anchorKey),
                    selector: getUniqueSelector(targetLink),
                    linkText: targetLink.innerText.trim(), // [추가] 텍스트 추출
                    imgSrc: targetLink.querySelector('img')?.src || null, // [추가] 이미지 주소 추출
                    type: "Tip",
                    content: messageContent
                }
            }, (response) => {
                if (response.success) { 
                    alert("성공적으로 흔적을 남겼습니다!");
                    location.reload();
                } else {
                    alert("기록 실패: " + response.error);
                }
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
