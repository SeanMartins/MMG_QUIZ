import { Router } from 'express';
import db from './db.js';
import { buildResults } from './results.js';
import { buildExcelBuffer } from './export-excel.js';
import { streamPdf } from './export-pdf.js';
import { requireAuth } from './auth.js';

const router = Router();

// Every route below manages a specific user's private quizzes, sessions,
// questions or game results — none of it is reachable by game participants
// (they only ever talk to the Socket.io layer in game.js), so it's safe to
// require a valid Firebase session for the whole router.
router.use(requireAuth);

function serializeQuiz(quizId) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return null;
  const sessions = db
    .prepare('SELECT * FROM sessions WHERE quiz_id = ? ORDER BY order_index')
    .all(quizId)
    .map((session) => {
      const questions = db
        .prepare('SELECT * FROM questions WHERE session_id = ? ORDER BY order_index')
        .all(session.id)
        .map((q) => ({ ...q, options: JSON.parse(q.options) }));
      return { ...session, questions };
    });
  return { ...quiz, sessions };
}

function ownedQuiz(quizId, uid) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  return quiz && quiz.owner_uid === uid ? quiz : null;
}

function ownedSession(sessionId, uid) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return null;
  return ownedQuiz(session.quiz_id, uid) ? session : null;
}

function ownedQuestion(questionId, uid) {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!question) return null;
  return ownedSession(question.session_id, uid) ? question : null;
}

function ownedGame(code, uid) {
  const game = db.prepare('SELECT * FROM games WHERE code = ?').get(code);
  if (!game) return null;
  return ownedQuiz(game.quiz_id, uid) ? game : null;
}

// ---- Quizzes ----
router.get('/quizzes', (req, res) => {
  // One-time bootstrap: quizzes created before auth existed (owner_uid IS NULL)
  // are claimed by whichever authenticated user asks for their list first.
  const { count: ownedCount } = db
    .prepare('SELECT COUNT(*) as count FROM quizzes WHERE owner_uid = ?')
    .get(req.uid);
  if (ownedCount === 0) {
    db.prepare('UPDATE quizzes SET owner_uid = ? WHERE owner_uid IS NULL').run(req.uid);
  }

  const quizzes = db
    .prepare('SELECT * FROM quizzes WHERE owner_uid = ? ORDER BY updated_at DESC')
    .all(req.uid);
  res.json(quizzes);
});

router.post('/quizzes', (req, res) => {
  const { title, theme = 'neon' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titolo obbligatorio' });
  const info = db
    .prepare('INSERT INTO quizzes (title, theme, owner_uid) VALUES (?, ?, ?)')
    .run(title.trim(), theme, req.uid);
  res.status(201).json(serializeQuiz(info.lastInsertRowid));
});

router.get('/quizzes/:id', (req, res) => {
  if (!ownedQuiz(req.params.id, req.uid)) return res.status(404).json({ error: 'Quiz non trovato' });
  res.json(serializeQuiz(req.params.id));
});

router.patch('/quizzes/:id', (req, res) => {
  const quiz = ownedQuiz(req.params.id, req.uid);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  const { title, theme, event_title, text_color, font_family, background_overlay, background_url, logo_url } =
    req.body;
  db.prepare(
    `UPDATE quizzes SET title = ?, theme = ?, event_title = ?, text_color = ?, font_family = ?,
     background_overlay = ?, background_url = ?, logo_url = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    title ?? quiz.title,
    theme ?? quiz.theme,
    event_title ?? quiz.event_title,
    text_color ?? quiz.text_color,
    font_family ?? quiz.font_family,
    background_overlay ?? quiz.background_overlay,
    background_url ?? quiz.background_url,
    logo_url ?? quiz.logo_url,
    req.params.id
  );
  res.json(serializeQuiz(req.params.id));
});

router.delete('/quizzes/:id', (req, res) => {
  if (!ownedQuiz(req.params.id, req.uid)) return res.status(404).json({ error: 'Quiz non trovato' });
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---- Sessions ----
router.post('/quizzes/:id/sessions', (req, res) => {
  const quiz = ownedQuiz(req.params.id, req.uid);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  const { title = 'Nuova sessione' } = req.body;
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM sessions WHERE quiz_id = ?')
    .get(req.params.id);
  db.prepare(
    'INSERT INTO sessions (quiz_id, title, order_index) VALUES (?, ?, ?)'
  ).run(req.params.id, title, count);
  res.status(201).json(serializeQuiz(req.params.id));
});

router.patch('/sessions/:id', (req, res) => {
  const session = ownedSession(req.params.id, req.uid);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  const { title, music_url } = req.body;
  db.prepare('UPDATE sessions SET title = ?, music_url = ? WHERE id = ?').run(
    title ?? session.title,
    music_url ?? session.music_url,
    req.params.id
  );
  res.json(serializeQuiz(session.quiz_id));
});

router.delete('/sessions/:id', (req, res) => {
  const session = ownedSession(req.params.id, req.uid);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json(serializeQuiz(session.quiz_id));
});

// ---- Questions ----
router.post('/sessions/:id/questions', (req, res) => {
  const session = ownedSession(req.params.id, req.uid);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  const {
    text = 'Nuova domanda',
    options = ['Risposta A', 'Risposta B', 'Risposta C', 'Risposta D'],
    correct_index = 0,
    time_limit_seconds = 20,
    points = 1000,
  } = req.body;
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM questions WHERE session_id = ?')
    .get(req.params.id);
  db.prepare(
    `INSERT INTO questions (session_id, order_index, text, options, correct_index, time_limit_seconds, points)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(req.params.id, count, text, JSON.stringify(options), correct_index, time_limit_seconds, points);
  res.status(201).json(serializeQuiz(session.quiz_id));
});

router.patch('/questions/:id', (req, res) => {
  const question = ownedQuestion(req.params.id, req.uid);
  if (!question) return res.status(404).json({ error: 'Domanda non trovata' });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(question.session_id);
  const {
    text = question.text,
    options = JSON.parse(question.options),
    correct_index = question.correct_index,
    time_limit_seconds = question.time_limit_seconds,
    points = question.points,
  } = req.body;
  db.prepare(
    `UPDATE questions SET text = ?, options = ?, correct_index = ?, time_limit_seconds = ?, points = ?
     WHERE id = ?`
  ).run(text, JSON.stringify(options), correct_index, time_limit_seconds, points, req.params.id);
  res.json(serializeQuiz(session.quiz_id));
});

router.delete('/questions/:id', (req, res) => {
  const question = ownedQuestion(req.params.id, req.uid);
  if (!question) return res.status(404).json({ error: 'Domanda non trovata' });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(question.session_id);
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json(serializeQuiz(session.quiz_id));
});

// ---- Results / exports ----
router.get('/games/:code/results', (req, res) => {
  if (!ownedGame(req.params.code, req.uid)) return res.status(404).json({ error: 'Partita non trovata' });
  res.json(buildResults(req.params.code));
});

router.get('/games/:code/export.xlsx', async (req, res) => {
  if (!ownedGame(req.params.code, req.uid)) return res.status(404).json({ error: 'Partita non trovata' });
  const results = buildResults(req.params.code);
  const buffer = await buildExcelBuffer(results);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="risultati-${req.params.code}.xlsx"`);
  res.send(Buffer.from(buffer));
});

router.get('/games/:code/export.pdf', (req, res) => {
  if (!ownedGame(req.params.code, req.uid)) return res.status(404).json({ error: 'Partita non trovata' });
  streamPdf(buildResults(req.params.code), res);
});

export { serializeQuiz };
export default router;
