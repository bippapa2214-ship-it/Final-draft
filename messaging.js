const messages = [];

export function messageHandler(ctx, res) {
  if (ctx.method === 'GET') {
    return res.json({
      success: true,
      messages: messages.slice(-50) // Last 50 messages
    });
  }
  
  if (ctx.method === 'POST') {
    const { sessionId, message, username } = ctx.body;
    
    if (!message || !username) {
      return res.status(400).json({ error: 'Missing message or username' });
    }
    
    const newMessage = {
      id: messages.length + 1,
      username,
      message,
      timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    // Keep only last 100 messages
    if (messages.length > 100) {
      messages.shift();
    }
    
    return res.json({
      success: true,
      message: newMessage
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}