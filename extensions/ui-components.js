/**
 * 유령 메시지 UI 컴포넌트 모음 (Toasts, Modals, Tooltips, HUD)
 */

// --- Toasts ---
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

// --- Modals ---
function showConfirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'ghost-modal-overlay';
    overlay.innerHTML = `
        <div class="ghost-modal-content">
            <h3>⚠️ ${title}</h3>
            <p style="margin-bottom: 20px; font-size: 14px; opacity: 0.9;">${message}</p>
            <div class="ghost-modal-buttons">
                <button class="ghost-btn ghost-btn-secondary" id="modal-cancel">Cancel</button>
                <button class="ghost-btn ghost-btn-primary" id="modal-confirm" style="background: #ff5252;">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    ['keydown', 'keyup', 'keypress'].forEach(evt => {
        overlay.addEventListener(evt, (e) => e.stopPropagation(), true);
    });
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
            <h3>👻 Leave a Ghost Message</h3>
            
            <label>Select Type</label>
            <select id="modal-type">
                <option value="Normal">📝 Normal</option>
                <option value="Tip">💡 Tip</option>
                <option value="Warning">⚠️ Warning</option>
                <option value="Spoiler">🎬 Spoiler</option>
                <option value="Question">❓ Question</option>
            </select>

            <label>Content (Max 100 chars)</label>
            <textarea id="modal-content" placeholder="Leave your mark on this link..."></textarea>

            <div class="ghost-modal-buttons">
                <button class="ghost-btn ghost-btn-secondary" id="modal-cancel">Cancel</button>
                <button class="ghost-btn ghost-btn-primary" id="modal-save">Post</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    ['keydown', 'keyup', 'keypress'].forEach(evt => {
        overlay.addEventListener(evt, (e) => e.stopPropagation(), true);
    });
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

// --- Tooltips ---
function generateMessagesHtml(messageList) {
    return messageList.map(msg => {
        const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
        const year = String(date.getFullYear()).slice(-2);
        const dateStr = `${year}.${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        return `
            <div class="message-item" style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding: 2px 0; position: relative;">   
                <div style="position: absolute; top: 2px; right: 0; font-size: 9px; opacity: 0.6;">
                    ${dateStr}
                </div>
                <div style="margin-bottom: 5px;">
                    <span style="display:inline-block; font-size: 10px; font-weight: bold; opacity: 0.7;">
                        ${msg.type || 'Normal'}
                    </span>
                </div>
                <div style="margin: 5px 0; font-size: 13px; padding-right: 65px; word-break: break-all;">${msg.content}</div>
                <div style="font-size: 11px; display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                    <div style="display: flex; gap: 6px;">
                        <button class="vote-up-btn" data-id="${msg.id}" style="background:none; border:none; color:inherit; cursor:pointer; padding:0; font-size: 11px;">
                            👍 ${msg.upVoteScore}
                        </button>
                        <button class="vote-down-btn" data-id="${msg.id}" style="background:none; border:none; color:inherit; cursor:pointer; padding:0; font-size: 11px;">
                            👎 ${msg.downVoteScore}
                        </button>
                    </div>
                    <div style="margin-left: auto;">
                        ${msg.authorId === MY_ID ? `<button class="delete-btn" data-id="${msg.id}" style="background:none; border:none; color: #ff5252; cursor:pointer; font-size: 10px; font-weight: bold;">Delete</button>` : ''}   
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

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

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
    if (activeLink) {
        delete activeLink.dataset.ghostTooltipActive;
        activeLink = null;
    }
}

let lastUpdateDay = new Date().getUTCDate();

// --- HUD ---
function createHUD() {
    if (document.getElementById('ghost-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'ghost-hud';
    hud.innerHTML = `
        <div class="hud-item" title="Page Messages">📍 <span id="hud-total-msg">0</span></div>
        <div class="hud-divider"></div>
        <div class="hud-item" title="Messages Left Today">✍️ <span id="hud-remain-msg">10</span></div>
        <div class="hud-divider"></div>
        <div class="hud-item" title="Votes Left Today">👍 <span id="hud-remain-vote">20</span></div>
        <div class="hud-divider"></div>
        <div class="hud-item" title="Time until Reset (UTC 00:00)">⏳ <span id="hud-timer">00:00</span></div>
    `;
    document.body.appendChild(hud);
    updateHUD();
}

function updateHUD() {
    const hud = document.getElementById('ghost-hud');
    if (!hud) return;

    let total = 0;
    messageMap.forEach(msgs => total += msgs.length);
    const totalEl = document.getElementById('hud-total-msg');
    if (totalEl) totalEl.innerText = total;

    if (MY_ID) {
        fetchUserInfo(MY_ID, (response) => {
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
        
        // UTC 기준 날짜가 바뀌었는지 체크
        const currentUtcDay = now.getUTCDate();
        if (currentUtcDay !== lastUpdateDay) {
            lastUpdateDay = currentUtcDay;
            updateHUD(); // 정보 갱신
            return;
        }

        // 다음 날 UTC 00:00:00 계산
        const nextUtcReset = Date.UTC(
            now.getUTCFullYear(), 
            now.getUTCMonth(), 
            now.getUTCDate() + 1, 
            0, 0, 0
        );

        const diffMs = nextUtcReset - now.getTime();
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
