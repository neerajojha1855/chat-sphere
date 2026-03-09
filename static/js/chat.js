document.addEventListener('DOMContentLoaded', () => {
    let activeRoomId = null;
    let chatSocket = null;
    let notificationSocket = null;
    let currentRoomMessages = [];
    let typingTimeout = null;

    const noChatSelectedOverlay = document.getElementById('noChatSelectedOverlay');
    const activeChatName = document.getElementById('activeChatName');
    const activeChatAvatar = document.getElementById('activeChatAvatar');
    const messagesList = document.getElementById('messagesList');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const roomList = document.getElementById('roomList');
    const newChatInput = document.getElementById('newChatInput');
    const startChatBtn = document.getElementById('startChatBtn');
    const noRoomsMsg = document.getElementById('noRoomsMsg');
    const pinnedMessagesContainer = document.getElementById('pinnedMessagesContainer');

    // Mobile responsive elements
    const sidebar = document.getElementById('sidebar');
    const chatArea = document.getElementById('chatArea');
    const backToChatsBtn = document.getElementById('backToChatsBtn');

    if (backToChatsBtn) {
        backToChatsBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('flex');
            chatArea.classList.add('hidden');
            chatArea.classList.remove('flex');
            activeRoomId = null;
            noChatSelectedOverlay.classList.remove('hidden');
        });
    }

    connectNotificationSocket();
    fetchRooms();

    function connectNotificationSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        notificationSocket = new WebSocket(`${protocol}//${window.location.host}/ws/notifications/`);

        notificationSocket.onmessage = function (e) {
            const data = JSON.parse(e.data);
            if (data.type === 'new_message_notification') {
                if (activeRoomId !== data.room_id) {
                    // Update unread count if we don't have this room active
                    updateOrAddRoomInList(data);
                }
            }
        };

        notificationSocket.onclose = function (e) {
            console.error('Notification socket closed, reconnecting in 5s...');
            setTimeout(connectNotificationSocket, 5000);
        };
    }

    function updateOrAddRoomInList(data) {
        let roomEl = document.querySelector(`.room-item[data-room-id="${data.room_id}"]`);

        if (roomEl) {
            // Update existing room
            // Move to top
            roomList.insertBefore(roomEl, roomList.firstChild);

            // Increment badge
            let badgeContainer = roomEl.querySelector('.unread-badge-container');
            if (!badgeContainer) {
                const infoDiv = roomEl.querySelector('.flex-1.overflow-hidden');
                badgeContainer = document.createElement('div');
                badgeContainer.className = 'unread-badge-container ml-2';
                infoDiv.parentNode.insertBefore(badgeContainer, infoDiv.nextSibling);
            }

            let badge = badgeContainer.querySelector('.unread-badge');
            if (badge) {
                badge.textContent = parseInt(badge.textContent) + 1;
            } else {
                badgeContainer.innerHTML = `<span class="unread-badge bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">1</span>`;
            }
        } else {
            // Room not in list (first message)
            fetchRooms(); // Just refetch all rooms to ensure consistency
        }
    }

    async function fetchRooms() {
        try {
            const res = await fetch('/chat/api/rooms/');
            const rooms = await res.json();
            renderRooms(rooms);
        } catch (e) {
            console.error('Error fetching rooms:', e);
        }
    }

    function renderRooms(rooms) {
        if (rooms.length === 0) {
            noRoomsMsg.classList.remove('hidden');
            noRoomsMsg.textContent = 'No chats yet. Start one above!';
            return;
        }

        noRoomsMsg.classList.add('hidden');
        roomList.innerHTML = '';

        rooms.forEach(room => {
            const el = document.createElement('div');
            let roomTitle = room.name;
            let avatarChar = '?';
            let avatarUrl = null;

            if (!room.is_group) {
                const otherParticipant = room.participants.find(p => String(p.id) !== String(CONFIG.userId));
                roomTitle = otherParticipant ? otherParticipant.username : 'Unknown User';
                if (otherParticipant && otherParticipant.avatar) {
                    avatarUrl = otherParticipant.avatar;
                }
            }

            avatarChar = roomTitle ? roomTitle.charAt(0).toUpperCase() : '?';

            el.className = `p-4 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/50 transition-colors flex items-center room-item ${activeRoomId === room.id ? 'bg-gray-800/80 border-l-4 border-l-blue-500' : ''}`;
            el.dataset.roomId = room.id;

            let avatarHTML = '';
            if (avatarUrl) {
                avatarHTML = `<img src="${avatarUrl}" alt="${roomTitle}" class="w-10 h-10 rounded-full object-cover mr-3 border border-gray-600">`;
            } else {
                avatarHTML = `
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                    ${avatarChar}
                </div>`;
            }

            let unreadBadgeHTML = '';
            if (room.unread_count > 0) {
                unreadBadgeHTML = `<div class="unread-badge-container ml-2">
                    <span class="unread-badge bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${room.unread_count}</span>
                </div>`;
            } else {
                unreadBadgeHTML = `<div class="unread-badge-container ml-2"></div>`;
            }

            el.innerHTML = `
                ${avatarHTML}
                <div class="flex-1 overflow-hidden">
                    <h3 class="font-medium text-gray-200 truncate">${roomTitle}</h3>
                    <p class="text-xs text-gray-500 truncate mt-0.5">Click to view messages</p>
                </div>
                ${unreadBadgeHTML}
            `;

            el.addEventListener('click', () => {
                selectRoom(room.id, roomTitle, avatarChar, avatarUrl);
            });

            roomList.appendChild(el);
        });
    }

    async function selectRoom(roomId, roomTitle, avatarChar, avatarUrl = null) {
        if (activeRoomId === roomId) return;

        activeRoomId = roomId;
        noChatSelectedOverlay.classList.add('hidden');
        activeChatName.textContent = roomTitle;

        if (avatarUrl) {
            activeChatAvatar.innerHTML = `<img src="${avatarUrl}" alt="${roomTitle}" class="w-full h-full rounded-full object-cover">`;
            activeChatAvatar.classList.remove('bg-gradient-to-br', 'from-blue-500', 'to-purple-600', 'text-white', 'font-bold', 'text-lg');
            activeChatAvatar.classList.add('border', 'border-gray-600');
        } else {
            activeChatAvatar.innerHTML = avatarChar;
            activeChatAvatar.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-purple-600', 'text-white', 'font-bold', 'text-lg');
            activeChatAvatar.classList.remove('border', 'border-gray-600');
        }

        // Mobile responsive switch
        if (window.innerWidth < 768) {
            sidebar.classList.remove('flex');
            sidebar.classList.add('hidden');
            chatArea.classList.remove('hidden');
            chatArea.classList.add('flex');
        }

        document.querySelectorAll('.room-item').forEach(el => {
            if (parseInt(el.dataset.roomId) === roomId) {
                el.classList.add('bg-gray-800/80', 'border-l-4', 'border-l-blue-500');
            } else {
                el.classList.remove('bg-gray-800/80', 'border-l-4', 'border-l-blue-500');
            }
        });

        if (chatSocket) {
            chatSocket.close();
        }

        currentRoomMessages = [];
        updatePinnedMessagesUI();

        // Remove unread badge when selecting
        const selectedRoomEl = document.querySelector(`.room-item[data-room-id="${roomId}"]`);
        if (selectedRoomEl) {
            const badgeContainer = selectedRoomEl.querySelector('.unread-badge-container');
            if (badgeContainer) badgeContainer.innerHTML = '';
        }

        await fetchMessages(roomId);

        // Reset typing indicator
        document.getElementById('typingIndicator').classList.add('hidden');

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        chatSocket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${roomId}/`);

        chatSocket.onmessage = function (e) {
            const data = JSON.parse(e.data);
            if (data.type === 'chat_message') {
                // If it's your own freshly sent message via websocket, try to look up your avatar dynamically
                if (data.sender === CONFIG.username) {
                    data.sender_avatar = CONFIG.avatarUrl;
                }
                currentRoomMessages.push(data);
                appendMessage(data);
                updatePinnedMessagesUI();
            } else if (data.type === 'message_deleted') {
                const msg = currentRoomMessages.find(m => m.id === data.message_id);
                if (msg) msg.is_deleted = true;
                handleMessageDeleted(data.message_id);
                updatePinnedMessagesUI();
            } else if (data.type === 'message_pinned') {
                const msg = currentRoomMessages.find(m => m.id === data.message_id);
                if (msg) msg.is_pinned = data.is_pinned;
                handleMessagePinned(data.message_id, data.is_pinned);
                updatePinnedMessagesUI();
            } else if (data.type === 'typing') {
                if (data.username !== CONFIG.username) {
                    const typingInd = document.getElementById('typingIndicator');
                    if (data.is_typing) {
                        typingInd.textContent = `${data.username} is typing...`;
                        typingInd.classList.remove('hidden');
                    } else {
                        typingInd.classList.add('hidden');
                    }
                }
            } else if (data.message) {
                // Fallback for older format if necessary
                currentRoomMessages.push(data);
                appendMessage(data);
                updatePinnedMessagesUI();
            }
        };

        chatSocket.onclose = function (e) {
            console.error('Chat socket closed unexpectedly');
        };
    }

    function handleMessageDeleted(messageId) {
        const msgEl = document.querySelector(`.message-container[data-message-id="${messageId}"]`);
        if (msgEl) {
            const contentEl = msgEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.textContent = 'This message was deleted';
                contentEl.classList.add('italic', 'text-gray-500');
            }
        }
    }

    function handleMessagePinned(messageId, isPinned) {
        const msgEl = document.querySelector(`.message-container[data-message-id="${messageId}"]`);
        if (msgEl) {
            const pinBtn = msgEl.querySelector('.pin-btn');
            if (isPinned) {
                msgEl.querySelector('.message-bubble').classList.add('border-yellow-500');
                if (pinBtn) {
                    pinBtn.innerHTML = `<svg class="w-4 h-4 pointer-events-none" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 3H8v2h2v7l-2 3v2h3v4h2v-4h3v-2l-2-3V5h2z"></path></svg>`;
                    pinBtn.title = 'Unpin';
                }
            } else {
                msgEl.querySelector('.message-bubble').classList.remove('border-yellow-500');
                if (pinBtn) {
                    pinBtn.innerHTML = `<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3H8v2h2v7l-2 3v2h3v4h2v-4h3v-2l-2-3V5h2z"></path></svg>`;
                    pinBtn.title = 'Pin';
                }
            }
        }
    }

    function updatePinnedMessagesUI() {
        const pinned = currentRoomMessages.filter(m => m.is_pinned && !m.is_deleted);

        if (pinned.length === 0) {
            pinnedMessagesContainer.classList.add('hidden');
            pinnedMessagesContainer.innerHTML = '';
            return;
        }

        pinnedMessagesContainer.classList.remove('hidden');
        pinnedMessagesContainer.innerHTML = '';

        pinned.forEach(msg => {
            const el = document.createElement('div');
            el.className = 'inline-block bg-yellow-800/60 rounded p-2 text-xs text-yellow-100 max-w-xs truncate mr-2 cursor-pointer hover:bg-yellow-700/60 border border-yellow-700/50 transition-colors';
            el.innerHTML = `<span class="font-bold">${msg.sender}:</span> ${msg.message}`;
            el.addEventListener('click', () => {
                const msgEl = document.querySelector(`.message-container[data-message-id="${msg.id}"]`);
                if (msgEl) {
                    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const bubble = msgEl.querySelector('.message-bubble');
                    if (bubble) {
                        bubble.classList.add('ring', 'ring-yellow-400');
                        setTimeout(() => bubble.classList.remove('ring', 'ring-yellow-400'), 2000);
                    }
                }
            });
            pinnedMessagesContainer.appendChild(el);
        });
    }

    async function fetchMessages(roomId) {
        messagesList.innerHTML = '<div class="text-center text-gray-500 my-4 text-sm">Loading messages...</div>';
        try {
            const res = await fetch(`/chat/api/${roomId}/messages/`);
            const messages = await res.json();
            messagesList.innerHTML = '';

            const mappedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.content,
                sender: msg.sender.username,
                sender_avatar: msg.sender.avatar,
                is_pinned: msg.is_pinned,
                is_deleted: msg.is_deleted,
                created_at: msg.created_at
            }));

            currentRoomMessages = mappedMessages;
            mappedMessages.forEach(msg => appendMessage(msg));
            updatePinnedMessagesUI();

            scrollToBottom();
        } catch (e) {
            console.error('Error fetching messages:', e);
            messagesList.innerHTML = '<div class="text-center text-red-500 my-4 text-sm">Failed to load messages.</div>';
        }
    }

    function appendMessage(data) {
        const isMe = data.sender === CONFIG.username;
        const msgEl = document.createElement('div');
        msgEl.className = `flex message-container mb-4 ${isMe ? 'justify-end' : 'justify-start'}`;
        // if message already has an id from the db, use it for pinning/deleting
        if (data.id) msgEl.dataset.messageId = data.id;

        const timeStr = new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const isDeleted = data.message === 'This message was deleted' || data.is_deleted;
        const isPinnedClass = data.is_pinned ? 'border-yellow-500 border-2' : 'border border-gray-700';

        let deleteBtnHTML = '';
        if (isMe && !isDeleted) {
            deleteBtnHTML = `<button class="delete-btn text-red-400 hover:text-red-300 ml-2" data-message-id="${data.id}" title="Delete"><svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>`;
        }

        let pinBtnHTML = '';
        if (!isDeleted && data.id) {
            const pinIcon = data.is_pinned
                ? `<svg class="w-4 h-4 pointer-events-none" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 3H8v2h2v7l-2 3v2h3v4h2v-4h3v-2l-2-3V5h2z"></path></svg>`
                : `<svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3H8v2h2v7l-2 3v2h3v4h2v-4h3v-2l-2-3V5h2z"></path></svg>`;
            pinBtnHTML = `<button class="pin-btn text-yellow-400 hover:text-yellow-300 ml-2" data-message-id="${data.id}" title="${data.is_pinned ? 'Unpin' : 'Pin'}">${pinIcon}</button>`;
        }

        let avatarHTML = '';
        if (!isMe) {
            if (data.sender_avatar) {
                avatarHTML = `<img src="${data.sender_avatar}" class="w-6 h-6 rounded-full object-cover mr-2 mb-1 self-end border border-gray-600" title="${data.sender}">`;
            } else {
                avatarHTML = `<div class="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px] font-bold mr-2 mb-1 self-end" title="${data.sender}">${data.sender.charAt(0).toUpperCase()}</div>`;
            }
        }

        msgEl.innerHTML = `
            ${avatarHTML}
            <div class="max-w-[70%] message-bubble flex flex-col ${isPinnedClass} ${isMe ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-gray-800 text-gray-100 rounded-r-2xl rounded-tl-2xl'} p-3 shadow-md">
                ${!isMe ? `<div class="text-[10px] font-bold text-gray-400 mb-1 leading-tight">${data.sender}</div>` : ''}
                <div class="text-sm break-words message-content ${isDeleted ? 'italic text-gray-500' : ''}">${data.message}</div>
                <div class="flex justify-between items-center mt-1">
                    <div class="flex">
                        ${pinBtnHTML}
                        ${deleteBtnHTML}
                    </div>
                    <div class="text-[10px] text-right opacity-70 ${isMe ? 'text-blue-100' : 'text-gray-400'}">${timeStr}</div>
                </div>
            </div>
        `;

        messagesList.appendChild(msgEl);
        scrollToBottom();
    }

    // Handle pin and delete clicks
    messagesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const messageId = e.target.dataset.messageId;
            if (confirm('Are you sure you want to delete this message?')) {
                try {
                    await fetch(`/chat/api/messages/${messageId}/delete/`, {
                        method: 'DELETE',
                        headers: {
                            'X-CSRFToken': CONFIG.csrfToken
                        }
                    });
                } catch (err) {
                    console.error('Failed to delete message', err);
                }
            }
        }
        if (e.target.classList.contains('pin-btn')) {
            const messageId = e.target.dataset.messageId;
            try {
                await fetch(`/chat/api/messages/${messageId}/pin/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': CONFIG.csrfToken
                    }
                });
            } catch (err) {
                console.error('Failed to pin message', err);
            }
        }
    });

    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    // Typing Indicator Logic
    messageInput.addEventListener('input', () => {
        if (!chatSocket || !activeRoomId) return;

        chatSocket.send(JSON.stringify({
            'type': 'typing',
            'is_typing': true
        }));

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
                chatSocket.send(JSON.stringify({
                    'type': 'typing',
                    'is_typing': false
                }));
            }
        }, 1500);
    });

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        if (msg && chatSocket && activeRoomId) {
            chatSocket.send(JSON.stringify({
                'message': msg
            }));

            // Clear typing state immediately
            chatSocket.send(JSON.stringify({
                'type': 'typing',
                'is_typing': false
            }));
            clearTimeout(typingTimeout);

            messageInput.value = '';
        }
    });

    startChatBtn.addEventListener('click', startNewChat);
    newChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startNewChat();
    });

    async function startNewChat() {
        const username = newChatInput.value.trim();
        if (!username) return;

        try {
            const res = await fetch('/chat/api/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': CONFIG.csrfToken
                },
                body: JSON.stringify({
                    username: username,
                    is_group: false
                })
            });
            const data = await res.json();

            if (res.ok) {
                newChatInput.value = '';
                await fetchRooms();

                let roomTitle = data.name;
                let avatarChar = '?';
                let avatarUrl = null;
                if (!data.is_group) {
                    const otherParticipant = data.participants.find(p => String(p.id) !== String(CONFIG.userId));
                    roomTitle = otherParticipant ? otherParticipant.username : 'Unknown User';
                    if (otherParticipant && otherParticipant.avatar) {
                        avatarUrl = otherParticipant.avatar;
                    }
                }
                avatarChar = roomTitle ? roomTitle.charAt(0).toUpperCase() : '?';

                selectRoom(data.id, roomTitle, avatarChar, avatarUrl);
            } else {
                alert(data.error || 'Failed to create chat');
            }
        } catch (e) {
            console.error('Error creating chat:', e);
            alert('Failed to start chat. Check console.');
        }
    }
});
