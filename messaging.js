let messages = [];
let files = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { room } = req.query;
    const roomMessages = messages.filter(msg => msg.room === room);
    return res.json(roomMessages);
  }

  if (req.method === 'POST') {
    const message = req.body;
    message.id = Date.now();
    message.timestamp = new Date().toISOString();
    
    messages.push(message);
    
    // Keep only last 1000 messages per room
    const roomMessages = messages.filter(msg => msg.room === message.room);
    if (roomMessages.length > 1000) {
      messages = messages.filter(msg => msg.room !== message.room)
        .concat(roomMessages.slice(-1000));
    }
    
    return res.json({ success: true, message });
  }

  res.status(404).json({ error: 'Not found' });
}
