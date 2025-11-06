import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

let fileIdCounter = 1;
const files = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const form = new IncomingForm();
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'File upload failed' });
      }

      const file = files.file[0];
      const sender = fields.sender[0];
      const room = fields.room[0];
      
      const fileId = `file_${fileIdCounter++}_${Date.now()}`;
      
      // Store file info (in production, save to cloud storage)
      files.set(fileId, {
        originalName: file.originalFilename,
        filepath: file.filepath,
        size: file.size,
        mimetype: file.mimetype
      });

      const fileMessage = {
        id: Date.now(),
        sender,
        room,
        type: 'file',
        fileName: file.originalFilename,
        fileId: fileId,
        fileSize: file.size,
        timestamp: new Date().toISOString()
      };

      return res.json(fileMessage);
    });
    
    return;
  }

  res.status(404).json({ error: 'Not found' });
}
