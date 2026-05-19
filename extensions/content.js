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
// 2. 유틸리티 함수 (커스텀 UI 포함)
// ---------------------------------------------------------
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'ghost-toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function showConfirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'ghost-modal-overlay';
    overlay.innerHTML = `
        <div class="ghost-modal-content">
            <h3>⚠️ ${title}</h3>
            <p style="margin-bottom: 20px; font-size: 14px; opacity: 0.9;">${message}</p>
            <div class="ghost-modal-buttons">
                <button class="ghost-btn ghost-btn-secondary" id="modal-cancel">취소</button>
                <button class="ghost-btn ghost-btn-primary" id="modal-confirm" style="background: #ff5252;">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // [수정] 키보드 이벤트만 캡처링으로 차단 (부모 사이트 간섭 방지)
    ['keydown', 'keyup', 'keypress'].forEach(evt => {
        overlay.addEventListener(evt, (e) => e.stopPropagation(), true);
    });
    // [수정] 클릭은 버블링에서만 차단하여 버튼 작동 보장
    overlay.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('modal-cancel').onclick = () => overlay.remove();
    document.getElementById('modal-confirm').onclick = () => {
        onConfirm();
        overlay.remove();
    };
}

function showWriteModal(onSave) {
    const overlay = document.createElement('div');
    overlay.className = 'ghost-modal-overlay';
    overlay.innerHTML = `
        <div class="ghost-modal-content">
            <h3>👻 새로운 유령 흔적 남기기</h3>
            
            <label>유형 선택</label>
            <select id="modal-type">
                <option value="Normal">📝 일반 (Normal)</option>
                <option value="Tip">💡 꿀팁 (Tip)</option>
                <option value="Warning">⚠️ 주의 (Warning)</option>
                <option value="Spoiler">🎬 스포일러 (Spoiler)</option>
                <option value="Question">❓ 질문 (Question)</option>
            </select>

            <label>메시지 본문 (최대 100자)</label>
            <textarea id="modal-content" placeholder="이 링크에 대한 당신의 흔적을 자유롭게 남겨주세요..."></textarea>

            <div class="ghost-modal-buttons">
                <button class="ghost-btn ghost-btn-secondary" id="modal-cancel">취소</button>
                <button class="ghost-btn ghost-btn-primary" id="modal-save">기록하기</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // [수정] 키보드 이벤트만 캡처링으로 차단 (타이핑 보장)
    ['keydown', 'keyup', 'keypress'].forEach(evt => {
        overlay.addEventListener(evt, (e) => e.stopPropagation(), true);
    });
    // [수정] 클릭은 버블링에서만 차단하여 버튼 작동 보장
    overlay.addEventListener('click', (e) => e.stopPropagation());

    const contentInput = document.getElementById('modal-content');
    contentInput.focus();

    document.getElementById('modal-cancel').onclick = () => overlay.remove();
    document.getElementById('modal-save').onclick = () => {
        const content = contentInput.value.trim();
        const type = document.getElementById('modal-type').value;
        if (content.length > 0) {
            onSave(content, type);
            overlay.remove();
        } else {
            showToast("메시지를 입력해 주세요.", "error");
        }
    };
}

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

// 메시지 필터링 로직 통합 (중복 제거)
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

// [Step 22-3] 메시지 리스트 HTML 생성 함수 분리
function generateMessagesHtml(messageList) {
    return messageList.map(msg => `
        <div class="message-item" style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding: 4px 0;">   
            <div style="margin-bottom: 2px;">
                <span style="display:inline-block; font-size: 10px; font-weight: bold; opacity: 0.7;">
                    ${msg.type || 'Normal'}
                </span>
            </div>
            <div style="margin: 2px 0; font-size: 13px;">${msg.content}</div>
            <div style="font-size: 11px; display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                <div style="display: flex; gap: 6px;">
                    <button class="vote-up-btn" data-id="${msg.id}" style="background:none; border:none; color:inherit; cursor:pointer; padding:0; font-size: 11px;">
                        👍 ${msg.upVoteScore}
                    </button>
                    <button class="vote-down-btn" data-id="${msg.id}" style="background:none; border:none; color:inherit; cursor:pointer; padding:0; font-size: 11px;">
                        👎 ${msg.downVoteScore}
                    </button>
                </div>
                <div style="margin-left: auto;">
                    ${msg.authorId === MY_ID ? `<button class="delete-btn" data-id="${msg.id}" style="background:none; border:none; color: #ff5252; cursor:pointer; font-size: 10px; font-weight: bold;">삭제</button>` : ''}   
                </div>
            </div>
        </div>
    `).join('');
}

// [Step 22-3] 툴팁 내부 이벤트 바인딩 함수 분리
function bindTooltipEvents(container, messageList) {
    container.querySelectorAll('.vote-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); castVote(btn.dataset.id, 'UP'); });
    });
    container.querySelectorAll('.vote-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); castVote(btn.dataset.id, 'DOWN'); });       
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); confirmDelete(btn.dataset.id); });
    });
}

// 하이라이트 스타일 제거 공통 함수
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

// ---------------------------------------------------------
// 3. 핵심 기능 함수 (하이라이트, 툴팁 및 HUD)
// ---------------------------------------------------------
function applyHighlights() {
    // 사용자 설정 가져오기
    chrome.storage.sync.get({
        enableHighlight: true,
        highlightColor: '#6200ee',
        highlightOpacity: 0.15
    }, (settings) => {
        const links = document.querySelectorAll('a');

        if (!settings.enableHighlight) {
            // 하이라이트가 꺼져있으면 기존 스타일 초기화 후 종료
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
                    // [최종 수정] 텍스트 밀림 완전 차단: padding/margin/display를 절대 건드리지 않음
                    link.style.backgroundColor = rgba;
                    link.style.borderRadius = "4px"; // 라운딩 효과 복구
                    
                    // [핵심] boxShadow의 spread(4번째 값)를 사용하여 물리적 크기 변화 없이 시각적 여백(가짜 패딩) 구현
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

// HUD 생성 함수
function createHUD() {
    if (document.getElementById('ghost-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'ghost-hud';
    hud.innerHTML = `
        <div class="hud-item" title="현재 페이지 흔적">📍 <span id="hud-total-msg">0</span></div>
        <div class="hud-divider"></div>
        <div class="hud-item" title="오늘 남은 작성">✍️ <span id="hud-remain-msg">10</span></div>
        <div class="hud-divider"></div>
        <div class="hud-item" title="오늘 남은 투표">👍 <span id="hud-remain-vote">20</span></div>
        <div class="hud-divider"></div>
        <div class="hud-item" title="초기화까지 남은 시각">⏳ <span id="hud-timer">00:00</span></div>
    `;
    document.body.appendChild(hud);
    updateHUD();
}

// HUD 데이터 업데이트 함수
function updateHUD() {
    const hud = document.getElementById('ghost-hud');
    if (!hud) return;

    let total = 0;
    messageMap.forEach(msgs => total += msgs.length);
    const totalEl = document.getElementById('hud-total-msg');
    if (totalEl) totalEl.innerText = total;

    if (MY_ID) {
        chrome.runtime.sendMessage({ action: "fetchUserInfo", userId: MY_ID }, (response) => {
            if (response && response.success && response.data) {
                const user = response.data;
                const msgEl = document.getElementById('hud-remain-msg');
                const voteEl = document.getElementById('hud-remain-vote');
                if (msgEl) msgEl.innerText = Math.max(0, 10 - user.dailyMessageCount);
                if (voteEl) voteEl.innerText = Math.max(0, 20 - user.dailyVoteCount);
            }
        });
    }

    const updateTimer = () => {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diffMs = tomorrow - now;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
        const seconds = Math.floor((diffMs / 1000) % 60);
        
        const timerEl = document.getElementById('hud-timer');
        if (timerEl) {
            timerEl.innerText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    };
    
    updateTimer();
    if (!window.ghostHudInterval) {
        window.ghostHudInterval = setInterval(updateTimer, 1000);
    }
}

// 동적 변화 감시를 위한 옵저버 설정
function startObserving() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
        applyHighlights();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function showTooltip(event, messageList, link) {
    chrome.storage.sync.get({
        tooltipBgColor: '#1e1e2e',
        tooltipTextColor: '#cdd6f4',
        tooltipOpacity: 0.9
    }, (settings) => {
        if (currentTooltip) hideTooltip();

        activeLink = link; 
        currentTooltip = document.createElement('div');
        currentTooltip.className = 'ghost-tooltip';
        
        const color = settings.tooltipBgColor;
        const opacity = settings.tooltipOpacity;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        currentTooltip.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        currentTooltip.style.color = settings.tooltipTextColor;
        
        const messagesHtml = generateMessagesHtml(messageList);
        currentTooltip.innerHTML = `<div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">${messagesHtml}</div>`;

        bindTooltipEvents(currentTooltip, messageList);

        document.body.appendChild(currentTooltip);
        currentTooltip.style.left = event.pageX + 10 + 'px';
        currentTooltip.style.top = event.pageY + 10 + 'px';
        currentTooltip.style.pointerEvents = 'auto';

        currentTooltip.addEventListener('mouseleave', () => { hideTooltip(); });
    });
}

// ---------------------------------------------------------
// 4. 통신 및 액션 함수
// ---------------------------------------------------------
function confirmDelete(messageId) {
    // [중요] 모달을 띄우기 전, 현재 활성 링크 정보를 미리 확보해둡니다.
    const targetLink = activeLink;
    if (!targetLink) return;
    const anchorKey = normalizeUrl(targetLink.href);

    showConfirmModal("흔적 삭제", "정말로 이 흔적을 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.", () => {
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
                    showToast("흔적이 사라졌습니다.", "success");
                }
            } else {
                showToast("삭제 실패: " + response.error, "error");
            }
        });
    });
}

function castVote(messageId, type) {
    // [중요] 비동기 응답 전 정보 백업
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
                    showToast("투표가 반영되었습니다.", "success");
                }
            }
        } else {
            showToast(response.error, "error");
        }
    });
}

function init() {
    if (isInitializing) return;
    isInitializing = true;

    chrome.storage.local.get(['userId'], (result) => {
        MY_ID = result.userId;
        if (!MY_ID) return;

        const pageUrl = normalizeUrl(window.location.href);
        chrome.runtime.sendMessage({ action: "fetchAllMessages", pageUrl: pageUrl }, (response) => {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openWriteModal") {
        const targetLink = lastRightClickedElement; 
        if (!targetLink) return;

        showWriteModal((content, type) => {
            const anchorKey = normalizeUrl(targetLink.href);
            chrome.runtime.sendMessage({
                action: "saveMessage",
                data: {
                    authorId: MY_ID,
                    pageUrl: normalizeUrl(request.pageUrl),
                    anchorKey: anchorKey,
                    selector: getUniqueSelector(targetLink),
                    linkText: targetLink.innerText.trim(),
                    imgSrc: targetLink.querySelector('img')?.src || null,
                    type: type,
                    content: content
                }
            }, (response) => {
                if (response.success) { 
                    if (!messageMap.has(anchorKey)) messageMap.set(anchorKey, []);
                    messageMap.get(anchorKey).push(response.data);
                    applyHighlights(); 
                    updateHUD(); 
                    showToast("성공적으로 흔적을 남겼습니다!", "success");
                } else {
                    showToast("기록 실패: " + response.error, "error");
                }
            });
        });
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
