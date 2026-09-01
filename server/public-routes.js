import { Router } from 'express';
import db from './db.js';

// Reachable by game participants before they've joined (or ever authenticated),
// so this router is intentionally NOT behind requireAuth — it only exposes
// non-sensitive display branding for a given game code, nothing owner-specific.
const router = Router();

router.get('/games/:code/preview', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE code = ?').get(req.params.code);
  if (!game) return res.status(404).json({ error: 'Partita non trovata' });
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(game.quiz_id);
  res.json({
    quizTitle: quiz.title,
    theme: quiz.theme,
    backgroundUrl: quiz.background_url,
    logoUrl: quiz.logo_url,
    eventTitle: quiz.event_title,
    textColor: quiz.text_color,
    fontFamily: quiz.font_family,
    backgroundOverlay: quiz.background_overlay,
    rulesText: quiz.rules_text,
  });
});

export default router;
