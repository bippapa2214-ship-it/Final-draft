const users = new Map();
const sessions = new Map();

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
      
      users.set(username, { password, createdAt: new Date() });
      return res.json({ success: true, message: 'Signed up successfully' });
    }
    
    if (action === 'signin') {
      const user = users.get(username);
      if (!user || user.password !== password) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const sessionId = Math.random().toString(36).substring(2);
      sessions.set(sessionId, { username });
      return res.json({ success: true, sessionId, message: 'Signed in successfully' });
    }
  }

  res.status(404).json({ error: 'Not found' });
}