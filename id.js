const files = new Map();

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const fileInfo = files.get(id);
    
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // In production, serve from cloud storage
    res.setHeader('Content-Type', fileInfo.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
    
    // For demo purposes, we'll just send a dummy response
    res.send(`This would be the file: ${fileInfo.originalName}`);
    
    return;
  }

  res.status(404).json({ error: 'Not found' });
}
