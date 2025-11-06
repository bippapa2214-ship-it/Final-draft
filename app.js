// Encryption utilities
class Encryption {
    static async encrypt(text, key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(key.padEnd(32, '0').slice(0, 32)),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            data
        );
        return btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(encrypted)));
    }

    static async decrypt(encryptedData, key) {
        try {
            const decoder = new TextDecoder();
            const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            const iv = data.slice(0, 12);
            const encrypted = data.slice(12);
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32)),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                cryptoKey,
                encrypted
            );
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
}

// App state
let currentUser = null;
let currentRoom = 'general';
let messages = {};
let rooms = new Set(['general', 'random']);
let onlineUsers = new Set();

// DOM elements
const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const currentUserSpan = document.getElementById('currentUser');
const currentRoomSpan = document.getElementById('currentRoom');
const roomList = document.getElementById('roomList');
const userList = document.getElementById('userList');
const authMessage = document.getElementById('authMessage');

// Initialize app
function init() {
    checkSavedLogin();
    loadRooms();
    setInterval(updateOnlineUsers, 5000);
}

// Check for saved login
function checkSavedLogin() {
    const savedUser = localStorage.getItem('bledchat_user');
    const savedToken = localStorage.getItem('bledchat_token');
    
    if (savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        showChatScreen();
        loadRoomMessages(currentRoom);
    }
}

// Auth functions
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAuthMessage('Please enter username and password', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = { username, password };
            // Save login with encryption key derived from password
            const userData = { username, loginTime: Date.now() };
            localStorage.setItem('bledchat_user', JSON.stringify(userData));
            localStorage.setItem('bledchat_token', btoa(username + ':' + Date.now()));
            
            showChatScreen();
            showAuthMessage('Login successful!', 'success');
            loadRoomMessages(currentRoom);
        } else {
            showAuthMessage(data.error, 'error');
        }
    } catch (error) {
        showAuthMessage('Login failed', 'error');
    }
}

async function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAuthMessage('Please enter username and password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'signup', username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAuthMessage('Account created! Please login.', 'success');
            document.getElementById('password').value = '';
        } else {
            showAuthMessage(data.error, 'error');
        }
    } catch (error) {
        showAuthMessage('Signup failed', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('bledchat_user');
    localStorage.removeItem('bledchat_token');
    showAuthScreen();
}

// UI functions
function showAuthScreen() {
    authScreen.style.display = 'block';
    chatScreen.style.display = 'none';
}

function showChatScreen() {
    authScreen.style.display = 'none';
    chatScreen.style.display = 'block';
    currentUserSpan.textContent = currentUser.username;
}

function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.style.color = type === 'error' ? '#ff0066' : '#00ff88';
    setTimeout(() => authMessage.textContent = '', 3000);
}

// Room functions
function switchRoom(roomName) {
    currentRoom = roomName;
    currentRoomSpan.textContent = `# ${roomName}`;
    
    // Update active room in sidebar
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadRoomMessages(roomName);
}

function createRoom() {
    const roomName = prompt('Enter room name:');
    if (roomName && !rooms.has(roomName)) {
        rooms.add(roomName);
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.textContent = `# ${roomName}`;
        roomItem.onclick = () => switchRoom(roomName);
        roomList.appendChild(roomItem);
        switchRoom(roomName);
    }
}

function loadRooms() {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = `room-item ${room === currentRoom ? 'active' : ''}`;
        roomItem.textContent = `# ${room}`;
        roomItem.onclick = () => switchRoom(room);
        roomList.appendChild(roomItem);
    });
}

// Message functions
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;
    
    const message = {
        id: Date.now(),
        sender: currentUser.username,
        text: text,
        room: currentRoom,
        timestamp: new Date().toISOString(),
        type: 'text'
    };
    
    // Encrypt message
    const encryptedMessage = await Encryption.encrypt(text, currentUser.password);
    message.encryptedText = encryptedMessage;
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
        
        if (response.ok) {
            messageInput.value = '';
            addMessageToUI(message);
            saveMessageToStorage(message);
        }
    } catch (error) {
        console.error('Failed to send message:', error);
    }
}

async function loadRoomMessages(roomName) {
    if (!messages[roomName]) {
        messages[roomName] = [];
    }
    
    // Load from API and storage
    try {
        const response = await fetch(`/api/messages?room=${roomName}`);
        if (response.ok) {
            const apiMessages = await response.json();
            messages[roomName] = apiMessages;
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
    
    displayMessages(roomName);
}

async function displayMessages(roomName) {
    messagesContainer.innerHTML = '';
    
    if (messages[roomName]) {
        for (const message of messages[roomName]) {
            // Decrypt message if it's encrypted
            if (message.encryptedText && currentUser) {
                const decryptedText = await Encryption.decrypt(message.encryptedText, currentUser.password);
                if (decryptedText) {
                    message.text = decryptedText;
                }
            }
            addMessageToUI(message);
        }
    }
}

function addMessageToUI(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender === currentUser?.username ? 'own' : 'other'}`;
    
    if (message.type === 'system') {
        messageDiv.className = 'message system';
        messageDiv.textContent = message.text;
    } else if (message.type === 'file') {
        messageDiv.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div>Shared a file: ${message.fileName}</div>
            <div class="file-message">
                <button class="download-btn" onclick="downloadFile('${message.fileId}')">Download</button>
            </div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div>${message.text}</div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function saveMessageToStorage(message) {
    if (!messages[message.room]) {
        messages[message.room] = [];
    }
    messages[message.room].push(message);
}

// File sharing
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file || !currentUser) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sender', currentUser.username);
    formData.append('room', currentRoom);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const fileMessage = await response.json();
            addMessageToUI(fileMessage);
            saveMessageToStorage(fileMessage);
        }
    } catch (error) {
        console.error('File upload failed:', error);
    }
    
    fileInput.value = '';
}

async function downloadFile(fileId) {
    try {
        const response = await fetch(`/api/files/${fileId}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileId;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Download failed:', error);
    }
}

// User management
function updateOnlineUsers() {
    if (!currentUser) return;
    
    // Simulate online users
    const sampleUsers = ['user1', 'user2', 'user3', currentUser.username];
    userList.innerHTML = '';
    
    sampleUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.textContent = user === currentUser.username ? `${user} (You)` : user;
        userList.appendChild(userItem);
    });
}

// Event listeners
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initialize app when loaded
document.addEventListener('DOMContentLoaded', init);
