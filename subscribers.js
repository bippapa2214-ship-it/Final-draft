const subscribers = new Set();

export function getSubscribers(ctx, res) {
  if (ctx.method === 'GET') {
    return res.json({
      success: true,
      count: subscribers.size,
      subscribers: Array.from(subscribers)
    });
  }
  
  if (ctx.method === 'POST') {
    const { username, action } = ctx.body;
    
    if (action === 'subscribe') {
      subscribers.add(username);
    } else if (action === 'unsubscribe') {
      subscribers.delete(username);
    }
    
    return res.json({
      success: true,
      count: subscribers.size
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}