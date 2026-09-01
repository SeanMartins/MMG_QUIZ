import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import db from './db.js';
import { buildResults } from './results.js';
import { buildExcelBuffer } from './export-excel.js';
import { streamPdf } from './export-pdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'uploads', 'music'),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.mp3';
      cb(null, `${nanoid(10)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Il file deve essere un audio'));
    }
    cb(null, true);
  },
});

function imageUploader(subfolder, maxSizeMb) {
  return multer({
    storage: multer.diskStorage({
      destination: path.join(__dirname, 'uploads', subfolder),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        cb(null, `${nanoid(10)}${ext}`);
      },
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Il file deve essere un\'immagine'));
      }
      cb(null, true);
    },
  });
}

const backgroundUpload = imageUploader('backgrounds', 10);
const logoUpload = imageUploader('logos', 4);

const router = Router();

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

// ---- Quizzes ----
router.get('/quizzes', (req, res) => {
  const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY updated_at DESC').all();
  res.json(quizzes);
});

router.post('/quizzes', (req, res) => {
  const { title, theme = 'neon' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Titolo obbligatorio' });
  const info = db
    .prepare('INSERT INTO quizzes (title, theme) VALUES (?, ?)')
    .run(title.trim(), theme);
  res.status(201).json(serializeQuiz(info.lastInsertRowid));
});

router.get('/quizzes/:id', (req, res) => {
  const quiz = serializeQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  res.json(quiz);
});

router.patch('/quizzes/:id', (req, res) => {
  const { title, theme, event_title, text_color, font_family, background_overlay } = req.body;
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  db.prepare(
    `UPDATE quizzes SET title = ?, theme = ?, event_title = ?, text_color = ?, font_family = ?,
     background_overlay = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    title ?? quiz.title,
    theme ?? quiz.theme,
    event_title ?? quiz.event_title,
    text_color ?? quiz.text_color,
    font_family ?? quiz.font_family,
    background_overlay ?? quiz.background_overlay,
    req.params.id
  );
  res.json(serializeQuiz(req.params.id));
});

router.post('/quizzes/:id/background', backgroundUpload.single('background'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' });
  const backgroundUrl = `/uploads/backgrounds/${req.file.filename}`;
  db.prepare('UPDATE quizzes SET background_url = ? WHERE id = ?').run(backgroundUrl, req.params.id);
  res.json(serializeQuiz(req.params.id));
});

router.delete('/quizzes/:id/background', (req, res) => {
  db.prepare('UPDATE quizzes SET background_url = NULL WHERE id = ?').run(req.params.id);
  res.json(serializeQuiz(req.params.id));
});

router.post('/quizzes/:id/logo', logoUpload.single('logo'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' });
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  db.prepare('UPDATE quizzes SET logo_url = ? WHERE id = ?').run(logoUrl, req.params.id);
  res.json(serializeQuiz(req.params.id));
});

router.delete('/quizzes/:id/logo', (req, res) => {
  db.prepare('UPDATE quizzes SET logo_url = NULL WHERE id = ?').run(req.params.id);
  res.json(serializeQuiz(req.params.id));
});

router.delete('/quizzes/:id', (req, res) => {
  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ---- Sessions ----
router.post('/quizzes/:id/sessions', (req, res) => {
  const { title = 'Nuova sessione' } = req.body;
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz non trovato' });
  const { count } = db
    .prepare('SELECT COUNT(*) as count FROM sessions WHERE quiz_id = ?')
    .get(req.params.id);
  db.prepare(
    'INSERT INTO sessions (quiz_id, title, order_index) VALUES (?, ?, ?)'
  ).run(req.params.id, title, count);
  res.status(201).json(serializeQuiz(req.params.id));
});

router.patch('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  const { title, music_url } = req.body;
  db.prepare('UPDATE sessions SET title = ?, music_url = ? WHERE id = ?').run(
    title ?? session.title,
    music_url === undefined ? session.music_url : music_url,
    req.params.id
  );
  res.json(serializeQuiz(session.quiz_id));
});

router.delete('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json(serializeQuiz(session.quiz_id));
});

router.post('/sessions/:id/music', upload.single('music'), (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessione non trovata' });
  if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' });
  const musicUrl = `/uploads/music/${req.file.filename}`;
  db.prepare('UPDATE sessions SET music_url = ? WHERE id = ?').run(musicUrl, req.params.id);
  res.json(serializeQuiz(session.quiz_id));
});

// ---- Questions ----
router.post('/sessions/:id/questions', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
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
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
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
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Domanda non trovata' });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(question.session_id);
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json(serializeQuiz(session.quiz_id));
});

// ---- Results / exports ----
router.get('/games/:code/results', (req, res) => {
  const results = buildResults(req.params.code);
  if (!results) return res.status(404).json({ error: 'Partita non trovata' });
  res.json(results);
});

router.get('/games/:code/export.xlsx', async (req, res) => {
  const results = buildResults(req.params.code);
  if (!results) return res.status(404).json({ error: 'Partita non trovata' });
  const buffer = await buildExcelBuffer(results);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="risultati-${req.params.code}.xlsx"`);
  res.send(Buffer.from(buffer));
});

router.get('/games/:code/export.pdf', (req, res) => {
  const results = buildResults(req.params.code);
  if (!results) return res.status(404).json({ error: 'Partita non trovata' });
  streamPdf(results, res);
});

export { serializeQuiz };
export default router;
