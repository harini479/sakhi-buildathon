const chatArea = document.getElementById('chat-area');
const messageStream = document.getElementById('message-stream');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const sidebar = document.getElementById('sidebar');
const backBtn = document.getElementById('back-btn');
const activeChatName = document.getElementById('active-chat-name');
const activeChatDesc = document.getElementById('active-chat-desc');
const activeChatAvatar = document.getElementById('active-chat-avatar');
const searchInput = document.getElementById('chat-search-input');

// Initial session setup (matches active sidebar item: Venkatesh)
let sessionPhone = "+911111111111";
let chatHistories = {}; // Store chat histories per phone number

// Format timestamp
function getTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

// Simple WhatsApp text formatting (*bold*, _italic_, ```code```)
function formatWhatsAppText(text) {
    if (!text) return "";
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    
    html = html.replace(/\*(.*?)\*/g, '<strong style="font-weight: 600;">$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    html = html.replace(/```(.*?)```/g, '<code style="background:#f0f0f0; padding:2px 4px; border-radius:3px;">$1</code>');
    
    // Auto-link URLs
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #00a884; text-decoration: none;">$1</a>');
    
    return html;
}

// Scroll to bottom
function scrollToBottom() {
    messageStream.scrollTop = messageStream.scrollHeight;
}

// Sidebar search filter
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('.chat-list-item').forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = !q || text.includes(q) ? 'flex' : 'none';
        });
    });
}

// Switch Chat
window.switchChat = function(phone, name, avatarHtml, desc, element) {
    const targetEl = element || (typeof event !== 'undefined' ? event.currentTarget : null);

    // 1. Update UI Selection
    document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active'));
    if (targetEl) targetEl.classList.add('active');

    // 2. Update Header
    activeChatName.textContent = name;
    activeChatDesc.textContent = desc;
    
    // Render correct avatar HTML in header
    if (avatarHtml.includes('.png') || avatarHtml.includes('.jpg')) {
        activeChatAvatar.innerHTML = `<img src="${avatarHtml}" alt="${name}">`;
    } else {
        const bgClass = targetEl ? targetEl.querySelector('.avatar').className : 'avatar bg-blue';
        activeChatAvatar.innerHTML = `<div class="${bgClass}" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:white; font-size:18px; font-weight:bold;">${avatarHtml}</div>`;
    }

    // 3. Handle Group Settings Button
    const groupSettingsBtn = document.getElementById('group-settings-btn');
    if (phone === 'group_all') {
        groupSettingsBtn.style.display = 'flex';
    } else {
        groupSettingsBtn.style.display = 'none';
    }

    // 4. Update Session and Clear Chat
    sessionPhone = phone;
    
    // Clear chat area except for encryption banner
    const banner = messageStream.querySelector('.encryption-banner-container');
    messageStream.innerHTML = '';
    if (banner) messageStream.appendChild(banner.cloneNode(true));

    // Restore history if it exists
    if (chatHistories[sessionPhone]) {
        chatHistories[sessionPhone].forEach(msg => {
            messageStream.appendChild(msg.cloneNode(true));
        });
    } else {
        chatHistories[sessionPhone] = [];
    }
    
    scrollToBottom();

    // 5. Handle Mobile View
    if (window.innerWidth <= 768) {
        document.body.classList.add('chat-active');
    }
};

// Back Button for Mobile
backBtn.addEventListener('click', () => {
    document.body.classList.remove('chat-active');
});

// Group Modal Logic
const groupModal = document.getElementById('group-modal');
const groupSettingsBtn = document.getElementById('group-settings-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

if (groupSettingsBtn) {
    groupSettingsBtn.addEventListener('click', () => {
        groupModal.style.display = 'flex';
    });
}
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        groupModal.style.display = 'none';
    });
}
window.addEventListener('click', (e) => {
    if (e.target === groupModal) {
        groupModal.style.display = 'none';
    }
});

// Context Menu (Delete)
const contextMenu = document.getElementById('context-menu');
let messageToDelete = null;

document.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('.bubble');
    if (bubble) {
        e.preventDefault();
        messageToDelete = bubble;
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
    } else {
        contextMenu.style.display = 'none';
    }
});

document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

document.getElementById('btn-delete-for-me').addEventListener('click', () => {
    if (messageToDelete) {
        messageToDelete.closest('.message').remove();
    }
});

document.getElementById('btn-delete-for-everyone').addEventListener('click', () => {
    if (messageToDelete) {
        const msgContainer = messageToDelete.closest('.message');
        
        msgContainer.innerHTML = `
            <div class="bubble">
                <div class="deleted-message">
                    <i data-lucide="slash"></i> This message was deleted
                </div>
                <div class="timestamp">${getTime()}</div>
            </div>
        `;
        lucide.createIcons();
    }
});


// Render User Message
function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `
        <div class="bubble">
            ${formatWhatsAppText(text)}
            <div class="timestamp">${getTime()} <i data-lucide="check-check"></i></div>
        </div>
    `;
    messageStream.appendChild(div);
    lucide.createIcons();
    
    // Save to history
    if (!chatHistories[sessionPhone]) chatHistories[sessionPhone] = [];
    chatHistories[sessionPhone].push(div.cloneNode(true));
    
    scrollToBottom();
}

// Render Bot Message
function appendBotMessage(payload) {
    const div = document.createElement('div');
    div.className = 'message bot';
    
    let bubbleContent = '';

    // Handle Text
    if (payload.type === 'text') {
        bubbleContent = formatWhatsAppText(payload.text.body);
    } 
    // Handle Image
    else if (payload.type === 'image') {
        const url = payload.image.link;
        bubbleContent = `<img src="${url}" class="media-img" alt="Attachment">`;
        if (payload.image.caption) {
            bubbleContent += `<br>${formatWhatsAppText(payload.image.caption)}`;
        }
    }
    // Handle Interactive (List / Buttons)
    else if (payload.type === 'interactive') {
        const interactive = payload.interactive;
        
        if (interactive.header?.text) {
            bubbleContent += `<strong>${formatWhatsAppText(interactive.header.text)}</strong><br><br>`;
        }
        
        if (interactive.body?.text) {
            bubbleContent += `${formatWhatsAppText(interactive.body.text)}<br><br>`;
        }
        
        // Interactive buttons
        if (interactive.type === 'button') {
            bubbleContent += `<div style="display:flex; flex-direction:column; gap:5px; margin-top:10px;">`;
            interactive.action.buttons.forEach(btn => {
                const safeTitle = (btn.reply.title || '').replace(/'/g, "\\'");
                const safeId = (btn.reply.id || '').replace(/'/g, "\\'");
                bubbleContent += `<button style="background:var(--wa-gray); color:var(--wa-teal-light); border:none; padding:8px; border-radius:5px; cursor:pointer; font-weight:600;" onclick="sendMessage('${safeTitle}', { id: '${safeId}', title: '${safeTitle}' })">${btn.reply.title}</button>`;
            });
            bubbleContent += `</div>`;
        }
        // Interactive List (renders clickable rows for hospitals)
        else if (interactive.type === 'list') {
            const sections = interactive.action?.sections || [];
            bubbleContent += `<div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">`;
            sections.forEach(section => {
                (section.rows || []).forEach(row => {
                    const safeTitle = (row.title || '').replace(/'/g, "\\'");
                    const safeId = (row.id || '').replace(/'/g, "\\'");
                    bubbleContent += `
                        <button style="background:var(--wa-gray); color:var(--text-dark); border:1px solid var(--wa-border); padding:8px 10px; border-radius:6px; cursor:pointer; text-align:left;" onclick="sendMessage('${safeTitle}', { id: '${safeId}', title: '${safeTitle}' })">
                            <div style="font-weight:600; color:var(--wa-teal-dark); font-size:13.5px;">${row.title}</div>
                            <div style="font-size:12px; color:var(--text-light); margin-top:2px;">${row.description || ''}</div>
                        </button>
                    `;
                });
            });
            bubbleContent += `</div>`;
        }
    }
    // Unknown type fallback
    else {
        bubbleContent = `<em>[Unsupported message type: ${payload.type}]</em>`;
    }

    div.innerHTML = `
        <div class="bubble">
            ${bubbleContent}
            <div class="timestamp">${getTime()}</div>
        </div>
    `;
    messageStream.appendChild(div);
    
    // Save to history
    if (!chatHistories[sessionPhone]) chatHistories[sessionPhone] = [];
    chatHistories[sessionPhone].push(div.cloneNode(true));
    
    scrollToBottom();
}


// Send Message Handler
window.sendMessage = async function sendMessage(textParam, interactiveReply = null) {
    const text = textParam || messageInput.value.trim();
    if (!text && !interactiveReply) return;
    
    appendUserMessage(text);
    messageInput.value = '';
    messageInput.focus();
    
    // Show typing instantly
    if (typingIndicator.parentNode) typingIndicator.parentNode.removeChild(typingIndicator);
    typingIndicator.style.display = 'flex';
    messageStream.appendChild(typingIndicator);
    scrollToBottom();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                sessionPhone: sessionPhone,
                interactiveReply: interactiveReply
            })
        });
        
        const data = await response.json();
        
        // Hide typing when response arrives
        typingIndicator.style.display = 'none';
        
        if (data.responses && data.responses.length > 0) {
            data.responses.forEach(payload => {
                appendBotMessage(payload);
            });
        }
    } catch (err) {
        console.error("Chat API error:", err);
        typingIndicator.style.display = 'none';
        appendBotMessage({ type: "text", text: { body: "_Connection to server failed. Please try again._" } });
    }
};

// Event Listeners
sendBtn.addEventListener('click', () => window.sendMessage());
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        window.sendMessage();
    }
});
