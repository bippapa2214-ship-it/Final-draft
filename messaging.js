// In-memory message storage
let messages = [];

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests
  if (req.method === 'GET') {
    const { room } = req.query;
    
    if (room) {
      const roomMessages = messages.filter(msg => msg.room === room);
      return res.json(roomMessages);
    }
    
    return res.json(messages);
  }

  // Handle POST requests
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        
        // Validate required fields
        if (!message.id || !message.sender || !message.text || !message.room) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Add timestamp if not provided
        if (!message.timestamp) {
          message.timestamp = new Date().toISOString();
        }
        
        messages.push(message);
        
        // Keep only last 200 messages total
        if (messages.length > 200) {
          messages = messages.slice(-200);
        }
        
        console.log('Message stored:', { id: message.id, sender: message.sender, room: message.room });
        
        return res.json({ success: true, message });
        
      } catch (error) {
        console.error('Message storage error:', error);
        return res.status(500).json({ error: 'Failed to store message' });
      }
    });
    
    return;
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
