import express from 'express';
import { interpretTranscript } from '../voice/intent.js';

const router = express.Router();

// POST /api/voice/interpret { transcript: string }
router.post('/interpret', (req, res) => {
  const transcript = String(req.body?.transcript || '').trim();
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });

  const intent = interpretTranscript(transcript);
  return res.json({ intent });
});

export default router;
