const users = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { action, username, password } = req.body;
    
    if (action === 'signup') {
      if (users.has(username)) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      users.set(username, { 
        password: password, // In production, hash this
        createdAt: new Date(),
        lastLogin: new Date()
      });
      
      return res.json({ success: true, message: 'Account created successfully' });
    }
    
    if (action === 'login') {
      const user = users.get(username);
      if (!user || user.password !== password) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      user.lastLogin = new Date();
      users.set(username, user);
      
      return res.json({ 
        success: true, 
        message: 'Login successful',
        user: { username }
      });
    }
  }

  res.status(404).json({ error: 'Not found' });
}
