// Encryption utilities
class Encryption {
    static async encrypt(text, key) {
        try {
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
        } catch (error) {
            console.error('Encryption error:', error);
            return text; // Fallback to plain text
        }
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
            return encryptedData; // Fallback to encrypted text
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
    
    // Add event listeners
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Check for saved login
function checkSavedLogin() {
    const savedUser = localStorage.getItem('bledchat_user');
    
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showChatScreen();
            loadRoomMessages(currentRoom);
            showSystemMessage('Welcome back!');
        } catch (error) {
            console.error('Error loading saved user:', error);
            localStorage.removeItem('bledchat_user');
        }
    }
}

// Auth functions - FIXED
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAuthMessage('Please enter username and password', 'error');
        return;
    }
    
    showAuthMessage('Signing in...', 'info');
    
    try {
        const response = await fetch('/api/auth.js', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                action: 'login', 
                username, 
                password 
            })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
            currentUser = { username, password };
            
            // Save login info
            const userData = { 
                username, 
                loginTime: Date.now() 
            };
            localStorage.setItem('bledchat_user', JSON.stringify(userData));
            
            showChatScreen();
            showAuthMessage('Login successful!', 'success');
            loadRoomMessages(currentRoom);
            showSystemMessage(`Welcome to BledChat, ${username}!`);
        } else {
            showAuthMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage('Network error - please try again', 'error');
    }
}

async function signup() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAuthMessage('Please enter username and password', 'error');
        return;
    }
    
    if (username.length < 3) {
        showAuthMessage('Username must be at least 3 characters', 'error');
        return;
    }
    
    if (password.length < 4) {
        showAuthMessage('Password must be at least 4 characters', 'error');
        return;
    }
    
    showAuthMessage('Creating account...', 'info');
    
    try {
        const response = await fetch('/api/auth.js', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                action: 'signup', 
                username, 
                password 
            })
        });
        
        const data = await response.json();
        console.log('Signup response:', data);
        
        if (data.success) {
            showAuthMessage('Account created! Please sign in.', 'success');
            // Clear password field for login
            document.getElementById('password').value = '';
        } else {
            showAuthMessage(data.error || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAuthMessage('Network error - please try again', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('bledchat_user');
    showAuthScreen();
    showAuthMessage('Logged out successfully', 'success');
}

// UI functions
function showAuthScreen() {
    authScreen.style.display = 'block';
    chatScreen.style.display = 'none';
    // Clear form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showChatScreen() {
    authScreen.style.display = 'none';
    chatScreen.style.display = 'block';
    if (currentUser) {
        currentUserSpan.textContent = currentUser.username;
    }
}

function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = 'auth-message ' + type;
    setTimeout(() => {
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    }, 5000);
}

function showSystemMessage(message) {
    const systemMessage = {
        id: Date.now(),
        sender: 'System',
        text: message,
        room: currentRoom,
        timestamp: new Date().toISOString(),
        type: 'system'
    };
    addMessageToUI(systemMessage);
}

// Room functions
function switchRoom(roomName) {
    currentRoom = roomName;
    currentRoomSpan.textContent = `# ${roomName}`;
    
    // Update active room in sidebar
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the clicked room
    const roomItems = document.querySelectorAll('.room-item');
    for (let item of roomItems) {
        if (item.textContent === `# ${roomName}`) {
            item.classList.add('active');
            break;
        }
    }
    
    loadRoomMessages(roomName);
}

function createRoom() {
    const roomName = prompt('Enter room name:');
    if (roomName && roomName.trim() && !rooms.has(roomName)) {
        const cleanRoomName = roomName.trim();
        rooms.add(cleanRoomName);
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.textContent = `# ${cleanRoomName}`;
        roomItem.onclick = () => switchRoom(cleanRoomName);
        roomList.appendChild(roomItem);
        switchRoom(cleanRoomName);
        showSystemMessage(`Created room: ${cleanRoomName}`);
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
    try {
        const encryptedText = await Encryption.encrypt(text, currentUser.password);
        message.encryptedText = encryptedText;
    } catch (error) {
        console.error('Encryption failed, sending plain text');
    }
    
    // Add to UI immediately for better UX
    addMessageToUI(message);
    saveMessageToStorage(message);
    messageInput.value = '';
    
    // Try to save to server (optional)
    try {
        await fetch('/api/messages.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
    } catch (error) {
        console.error('Failed to send message to server:', error);
    }
}

async function loadRoomMessages(roomName) {
    if (!messages[roomName]) {
        messages[roomName] = [];
    }
    
    // Try to load from server
    try {
        const response = await fetch(`/api/messages.js?room=${encodeURIComponent(roomName)}`);
        if (response.ok) {
            const serverMessages = await response.json();
            if (Array.isArray(serverMessages)) {
                messages[roomName] = serverMessages;
            }
        }
    } catch (error) {
        console.error('Failed to load messages from server:', error);
    }
    
    displayMessages(roomName);
}

async function displayMessages(roomName) {
    messagesContainer.innerHTML = '';
    
    if (messages[roomName] && Array.isArray(messages[roomName])) {
        for (const message of messages[roomName]) {
            // Decrypt message if it's encrypted
            if (message.encryptedText && currentUser) {
                try {
                    const decryptedText = await Encryption.decrypt(message.encryptedText, currentUser.password);
                    if (decryptedText) {
                        message.text = decryptedText;
                    }
                } catch (error) {
                    console.error('Decryption failed for message:', message.id);
                }
            }
            addMessageToUI(message);
        }
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addMessageToUI(message) {
    const messageDiv = document.createElement('div');
    
    if (message.type === 'system') {
        messageDiv.className = 'message system';
        messageDiv.textContent = message.text;
    } else if (message.type === 'file') {
        messageDiv.className = `message ${message.sender === currentUser?.username ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div>Shared a file: ${message.fileName}</div>
            <div class="file-message">
                <button class="download-btn" onclick="downloadFile('${message.fileId}')">Download ${(message.fileSize / 1024).toFixed(1)}KB</button>
            </div>
            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        `;
    } else {
        messageDiv.className = `message ${message.sender === currentUser?.username ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="message-sender">${message.sender}</div>
            <div class="message-text">${message.text}</div>
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
    
    // Avoid duplicates
    if (!messages[message.room].some(msg => msg.id === message.id)) {
        messages[message.room].push(message);
    }
}

// File sharing (simplified for demo)
async function uploadFile() {
    if (!currentUser) return;
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Create a fake file message for demo
    const fileMessage = {
        id: Date.now(),
        sender: currentUser.username,
        type: 'file',
        fileName: file.name,
        fileId: 'demo_' + Date.now(),
        fileSize: file.size,
        room: currentRoom,
        timestamp: new Date().toISOString()
    };
    
    addMessageToUI(fileMessage);
    saveMessageToStorage(fileMessage);
    
    showSystemMessage(`File "${file.name}" uploaded (demo mode)`);
    fileInput.value = '';
}

async function downloadFile(fileId) {
    showSystemMessage(`Downloading file (demo mode)`);
    // In real implementation, this would download the actual file
}

// User management
function updateOnlineUsers() {
    if (!currentUser) return;
    
    // Demo users
    const demoUsers = ['Alice', 'Bob', 'Charlie', currentUser.username];
    userList.innerHTML = '';
    
    demoUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.textContent = user === currentUser.username ? `👑 ${user} (You)` : `💚 ${user}`;
        userList.appendChild(userItem);
    });
}

// Initialize app when loaded
document.addEventListener('DOMContentLoaded', init);
