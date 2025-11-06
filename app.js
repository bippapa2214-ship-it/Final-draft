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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                action: 'login', 
                username, 
                password 
            })
        });
        
        // Check if response is OK first
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse the JSON response
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
        showAuthMessage('Login failed: ' + error.message, 'error');
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                action: 'signup', 
                username, 
                password 
            })
        });
        
        // Check if response is OK first
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse the JSON response
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
        showAuthMessage('Signup failed: ' + error.message, 'error');
    }
}
