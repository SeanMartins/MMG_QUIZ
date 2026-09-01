import { customAlphabet } from 'nanoid';
import db from './db.js';
import { serializeQuiz } from './quiz-routes.js';
import { computePoints } from './scoring.js';
import { verifyIdToken } from './auth.js';

const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

const ANSWER_GRACE_MS = 1500;

// code -> { timeout } (in-memory only, not critical to persist across restarts)
const gameRuntime = new Map();

function getGameByCode(code) {
  return db.prepare('SELECT * FROM games WHERE code = ?').get(code);
}

function brandingOf(quiz) {
  return {
    theme: quiz.theme,
    backgroundUrl: quiz.background_url,
    logoUrl: quiz.logo_url,
    eventTitle: quiz.event_title,
    textColor: quiz.text_color,
    fontFamily: quiz.font_family,
    backgroundOverlay: quiz.background_overlay,
    rulesText: quiz.rules_text,
    participantMode: quiz.participant_mode,
  };
}

function buildLeaderboard(gameId) {
  return db
    .prepare('SELECT id as teamId, name, score FROM teams WHERE game_id = ? ORDER BY score DESC, name ASC')
    .all(gameId);
}

function currentQuestion(game, quiz) {
  const session = quiz.sessions[game.current_session_index];
  if (!session) return { session: null, question: null };
  const question = session.questions[game.current_question_index];
  return { session, question: question ?? null };
}

function sanitizeQuestion(question, session, quiz, game) {
  return {
    id: question.id,
    text: question.text,
    options: question.options,
    type: question.type,
    revealMode: question.reveal_mode,
    timeLimitSeconds: question.time_limit_seconds,
    points: question.points,
    index: game.current_question_index,
    total: session.questions.length,
    sessionTitle: session.title,
    sessionIndex: game.current_session_index,
    totalSessions: quiz.sessions.length,
  };
}

export function attachGameHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.role = null;
    socket.data.code = null;
    socket.data.teamId = null;

    // ---------- HOST ----------
    socket.on('host:create', async ({ quizId, idToken }, ack) => {
      let uid;
      try {
        uid = (await verifyIdToken(idToken)).sub;
      } catch {
        return ack?.({ error: 'Sessione scaduta, effettua di nuovo il login' });
      }
      const quiz = serializeQuiz(quizId);
      if (!quiz || quiz.owner_uid !== uid) return ack?.({ error: 'Quiz non trovato' });
      if (!quiz.sessions.length || quiz.sessions.every((s) => s.questions.length === 0)) {
        return ack?.({ error: 'Aggiungi almeno una domanda prima di avviare il gioco' });
      }
      let code;
      do {
        code = genCode();
      } while (getGameByCode(code));
      const info = db
        .prepare('INSERT INTO games (quiz_id, code, status) VALUES (?, ?, ?)')
        .run(quizId, code, 'lobby');
      socket.join(`game:${code}`);
      socket.join(`host:${code}`);
      socket.data.role = 'host';
      socket.data.code = code;
      ack?.({ code, gameId: info.lastInsertRowid, quiz });
    });

    socket.on('host:rejoin', ({ code }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      socket.join(`game:${code}`);
      socket.join(`host:${code}`);
      socket.data.role = 'host';
      socket.data.code = code;
      const quiz = serializeQuiz(game.quiz_id);
      ack?.({
        game,
        quiz,
        teams: db.prepare('SELECT id, name, score FROM teams WHERE game_id = ?').all(game.id),
      });
    });

    socket.on('host:start', ({ code }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      const quiz = serializeQuiz(game.quiz_id);
      db.prepare(
        "UPDATE games SET status = 'active', current_session_index = 0, current_question_index = -1 WHERE id = ?"
      ).run(game.id);
      const session = quiz.sessions[0];
      io.to(`game:${code}`).emit('state:session-intro', {
        title: session.title,
        musicUrl: session.music_url,
        index: 0,
        total: quiz.sessions.length,
        ...brandingOf(quiz),
      });
      ack?.({ ok: true });
    });

    socket.on('host:show-question', ({ code }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      const quiz = serializeQuiz(game.quiz_id);
      const session = quiz.sessions[game.current_session_index];
      if (!session) return ack?.({ error: 'Sessione non trovata' });
      const nextIndex = game.current_question_index + 1;
      if (nextIndex >= session.questions.length) {
        return ack?.({ ok: true, sessionComplete: true });
      }
      const startedAt = Date.now();
      db.prepare(
        'UPDATE games SET current_question_index = ?, question_started_at = ? WHERE id = ?'
      ).run(nextIndex, startedAt, game.id);
      const updatedGame = { ...game, current_question_index: nextIndex };
      const question = session.questions[nextIndex];
      const sanitized = sanitizeQuestion(question, session, quiz, updatedGame);

      io.to(`players:${code}`).emit('state:question', { ...sanitized, startedAt });
      io.to(`host:${code}`).emit('state:question-host', {
        ...sanitized,
        startedAt,
        correctIndex: question.correct_index,
        answeredTeamIds: [],
      });

      clearTimeout(gameRuntime.get(code)?.timeout);
      const timeout = setTimeout(() => {
        io.to(`game:${code}`).emit('state:time-up', { questionId: question.id });
      }, question.time_limit_seconds * 1000);
      gameRuntime.set(code, { timeout });

      ack?.({ ok: true, sessionComplete: false });
    });

    socket.on('host:reveal', ({ code }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      const quiz = serializeQuiz(game.quiz_id);
      const { question } = currentQuestion(game, quiz);
      if (!question) return ack?.({ error: 'Nessuna domanda attiva' });

      const teams = db.prepare('SELECT * FROM teams WHERE game_id = ?').all(game.id);
      const answers = db
        .prepare('SELECT * FROM answers WHERE game_id = ? AND question_id = ?')
        .all(game.id, question.id);
      const answersByTeam = new Map(answers.map((a) => [a.team_id, a]));

      const results = teams.map((team) => {
        const answer = answersByTeam.get(team.id);
        return {
          teamId: team.id,
          teamName: team.name,
          answered: !!answer,
          correct: !!answer?.correct,
          pointsAwarded: answer?.points_awarded ?? 0,
          timeTakenMs: answer?.time_taken_ms ?? null,
          totalScore: team.score,
          answerIndex: answer?.answer_index ?? null,
          answerText: answer?.answer_text ?? null,
          answerValue: answer?.answer_value ?? null,
        };
      });

      io.to(`game:${code}`).emit('state:reveal', {
        questionId: question.id,
        type: question.type,
        correctIndex: question.correct_index,
        results,
        leaderboard: buildLeaderboard(game.id),
      });
      ack?.({ ok: true });
    });

    socket.on('host:show-leaderboard', ({ code, isFinal = false }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      io.to(`game:${code}`).emit('state:leaderboard', {
        leaderboard: buildLeaderboard(game.id),
        isFinal,
      });
      ack?.({ ok: true });
    });

    socket.on('host:next-session', ({ code }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      const quiz = serializeQuiz(game.quiz_id);
      const nextIndex = game.current_session_index + 1;
      if (nextIndex >= quiz.sessions.length) {
        db.prepare("UPDATE games SET status = 'finished' WHERE id = ?").run(game.id);
        io.to(`game:${code}`).emit('state:game-ended', {
          leaderboard: buildLeaderboard(game.id),
        });
        return ack?.({ ok: true, gameComplete: true });
      }
      db.prepare(
        'UPDATE games SET current_session_index = ?, current_question_index = -1 WHERE id = ?'
      ).run(nextIndex, game.id);
      const session = quiz.sessions[nextIndex];
      io.to(`game:${code}`).emit('state:session-intro', {
        title: session.title,
        musicUrl: session.music_url,
        index: nextIndex,
        total: quiz.sessions.length,
        ...brandingOf(quiz),
      });
      ack?.({ ok: true, gameComplete: false });
    });

    socket.on('host:end', ({ code }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      db.prepare("UPDATE games SET status = 'finished' WHERE id = ?").run(game.id);
      io.to(`game:${code}`).emit('state:game-ended', {
        leaderboard: buildLeaderboard(game.id),
      });
      ack?.({ ok: true });
    });

    // ---------- PLAYERS ----------
    socket.on('player:join', ({ code, teamName, email }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Codice partita non valido' });
      if (game.status === 'finished') return ack?.({ error: 'La partita è già terminata' });

      const quiz = serializeQuiz(game.quiz_id);
      const mode = quiz.participant_mode || 'team';

      let name = (teamName || '').trim().slice(0, 60);
      if (mode === 'anonymous') {
        if (!name) {
          let attempt = 0;
          do {
            name = `Partecipante ${Math.floor(1000 + Math.random() * 90000)}`;
            attempt++;
          } while (
            attempt < 5 &&
            db.prepare('SELECT 1 FROM teams WHERE game_id = ? AND name = ?').get(game.id, name)
          );
        }
      } else if (!name) {
        return ack?.({ error: mode === 'named' ? 'Inserisci nome e cognome' : 'Inserisci un nome' });
      }

      let emailValue = null;
      if (mode === 'named') {
        emailValue = (email || '').trim().slice(0, 120);
        if (!emailValue) return ack?.({ error: 'Inserisci la tua email' });
      }

      let team;
      try {
        const info = db
          .prepare('INSERT INTO teams (game_id, name, socket_id, email) VALUES (?, ?, ?, ?)')
          .run(game.id, name, socket.id, emailValue);
        team = { id: info.lastInsertRowid, name, score: 0 };
      } catch (err) {
        return ack?.({ error: 'Nome già in uso in questa partita, scegline un altro' });
      }

      socket.join(`game:${code}`);
      socket.join(`players:${code}`);
      socket.data.role = 'player';
      socket.data.code = code;
      socket.data.teamId = team.id;

      io.to(`host:${code}`).emit('state:team-joined', team);
      ack?.({
        ok: true,
        teamId: team.id,
        teamName: name,
        gameStatus: game.status,
        ...brandingOf(quiz),
      });
    });

    socket.on('player:rejoin', ({ code, teamId }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      const team = db.prepare('SELECT * FROM teams WHERE id = ? AND game_id = ?').get(teamId, game.id);
      if (!team) return ack?.({ error: 'Squadra non trovata' });
      db.prepare('UPDATE teams SET socket_id = ? WHERE id = ?').run(socket.id, team.id);
      socket.join(`game:${code}`);
      socket.join(`players:${code}`);
      socket.data.role = 'player';
      socket.data.code = code;
      socket.data.teamId = team.id;
      const quiz = serializeQuiz(game.quiz_id);
      ack?.({
        ok: true,
        teamId: team.id,
        teamName: team.name,
        gameStatus: game.status,
        ...brandingOf(quiz),
      });
    });

    socket.on('player:answer', ({ code, questionId, answerIndex, answerText, answerValue }, ack) => {
      const game = getGameByCode(code);
      if (!game) return ack?.({ error: 'Partita non trovata' });
      const teamId = socket.data.teamId;
      if (!teamId) return ack?.({ error: 'Squadra non identificata' });

      const quiz = serializeQuiz(game.quiz_id);
      const { question } = currentQuestion(game, quiz);
      if (!question || question.id !== questionId) {
        return ack?.({ error: 'Questa domanda non è più attiva' });
      }

      const now = Date.now();
      const timeTakenMs = now - (game.question_started_at ?? now);
      if (timeTakenMs > question.time_limit_seconds * 1000 + ANSWER_GRACE_MS) {
        return ack?.({ error: 'Tempo scaduto' });
      }

      const type = question.type;
      let correct = false;
      let pointsAwarded = 0;
      let storeIndex = null;
      let storeText = null;
      let storeValue = null;

      if (type === 'multiple_choice' || type === 'poll') {
        storeIndex = answerIndex;
        correct = question.correct_index !== -1 && answerIndex === question.correct_index;
        pointsAwarded = computePoints({
          correct,
          points: question.points,
          timeTakenMs,
          timeLimitSeconds: question.time_limit_seconds,
        });
      } else if (type === 'rating_scale') {
        storeValue = answerValue;
      } else {
        // word_cloud / open_ended
        storeText = (answerText || '').trim().slice(0, 300);
        if (!storeText) return ack?.({ error: 'Scrivi una risposta prima di inviare' });
      }

      try {
        db.prepare(
          `INSERT INTO answers (game_id, question_id, team_id, answer_index, answer_text, answer_value, time_taken_ms, correct, points_awarded)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          game.id,
          questionId,
          teamId,
          storeIndex,
          storeText,
          storeValue,
          timeTakenMs,
          correct ? 1 : 0,
          pointsAwarded
        );
      } catch (err) {
        return ack?.({ error: 'Hai già risposto a questa domanda' });
      }

      if (pointsAwarded > 0) {
        db.prepare('UPDATE teams SET score = score + ? WHERE id = ?').run(pointsAwarded, teamId);
      }

      io.to(`host:${code}`).emit('state:answer-received', { teamId });

      const isLive = type === 'word_cloud' || type === 'open_ended' || question.reveal_mode === 'live';
      if (isLive) {
        const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(teamId);
        io.to(`host:${code}`).emit('state:live-answer', {
          questionId,
          type,
          teamId,
          teamName: team?.name,
          answerIndex: storeIndex,
          answerText: storeText,
          answerValue: storeValue,
        });
      }

      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      // Teams are matched by id on rejoin, so a dropped socket doesn't need cleanup here.
    });
  });
}
