import db from './db.js';

export function buildResults(code) {
  const game = db.prepare('SELECT * FROM games WHERE code = ?').get(code);
  if (!game) return null;
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(game.quiz_id);

  const teams = db
    .prepare('SELECT * FROM teams WHERE game_id = ? ORDER BY score DESC, name ASC')
    .all(game.id);

  const questions = db
    .prepare(
      `SELECT q.* FROM questions q
       JOIN sessions s ON s.id = q.session_id
       WHERE s.quiz_id = ?
       ORDER BY s.order_index, q.order_index`
    )
    .all(game.quiz_id);

  const answers = db.prepare('SELECT * FROM answers WHERE game_id = ?').all(game.id);
  const answerMap = new Map(answers.map((a) => [`${a.team_id}-${a.question_id}`, a]));

  const detail = [];
  const summary = teams.map((team) => {
    let correctCount = 0;
    let wrongCount = 0;
    let noAnswerCount = 0;
    let totalTimeMs = 0;
    let answeredCount = 0;

    questions.forEach((q, idx) => {
      const a = answerMap.get(`${team.id}-${q.id}`);
      const options = JSON.parse(q.options);
      const isScored = q.type === 'multiple_choice' || q.type === 'poll';
      let status = 'Nessuna risposta';
      let answerText = '-';
      let timeSec = null;
      let points = 0;

      if (a) {
        answeredCount++;
        totalTimeMs += a.time_taken_ms;
        timeSec = Math.round((a.time_taken_ms / 100)) / 10;
        points = a.points_awarded;

        if (q.type === 'word_cloud' || q.type === 'open_ended') {
          answerText = a.answer_text ?? '-';
          status = 'Registrata';
        } else if (q.type === 'rating_scale') {
          answerText = a.answer_value != null ? String(a.answer_value) : '-';
          status = 'Registrata';
        } else {
          answerText = a.answer_index != null ? options[a.answer_index] : '-';
          if (isScored && q.correct_index !== -1) {
            status = a.correct ? 'Corretta' : 'Sbagliata';
            if (a.correct) correctCount++;
            else wrongCount++;
          } else {
            status = 'Registrata';
          }
        }
      } else {
        noAnswerCount++;
      }

      detail.push({
        teamName: team.name,
        questionIndex: idx + 1,
        questionText: q.text,
        answerText,
        status,
        timeSec,
        points,
      });
    });

    return {
      teamName: team.name,
      totalScore: team.score,
      correctCount,
      wrongCount,
      noAnswerCount,
      avgTimeSec: answeredCount ? Math.round((totalTimeMs / answeredCount / 100)) / 10 : null,
    };
  });

  return {
    code,
    quizTitle: quiz.title,
    eventTitle: quiz.event_title,
    generatedAt: new Date(),
    summary,
    detail,
  };
}
