// Simple in-memory storage (reset on server restart)
let users = new Map();

// Add some demo users for testing
users.set('demo', { password: 'demo123', createdAt: new Date().toISOString() });
users.set('test', { password: 'test123', createdAt: new Date().toISOString() });

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST requests
  if (req.method === 'POST') {
    try {
      // Parse JSON body
      const { action, username, password } = await req.body;
      
      console.log('Auth request:', { action, username });
      
      if (action === 'signup') {
        if (users.has(username)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Username already exists' 
          });
        }
        
        users.set(username, { 
          password: password,
          createdAt: new Date().toISOString()
        });
        
        console.log('User signed up:', username);
        return res.json({ 
          success: true, 
          message: 'Account created successfully!' 
        });
      }
      
      if (action === 'login') {
        const user = users.get(username);
        
        if (!user) {
          return res.status(400).json({ 
            success: false, 
            error: 'User not found' 
          });
        }
        
        if (user.password !== password) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid password' 
          });
        }
        
        console.log('User logged in:', username);
        return res.json({ 
          success: true, 
          message: 'Login successful!',
          user: { username }
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action' 
      });
      
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error: ' + error.message 
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed' 
  });
}
