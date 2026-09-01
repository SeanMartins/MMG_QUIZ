import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../socket.js';
import { api } from '../api.js';
import { applyBranding } from '../themes.js';
import { playDrumRoll } from '../sound.js';
import { questionFontSize, questionTextAlign, optionFontSize, useSingleColumnOptions } from '../textFit.js';

const SHAPES = ['▲', '◆', '●', '■'];

export default function HostGame() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('connecting');
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [teams, setTeams] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answeredTeamIds, setAnsweredTeamIds] = useState([]);
  const [reveal, setReveal] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [showingLeaderboard, setShowingLeaderboard] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    api.networkInfo().then(({ localIp }) => {
      const port = window.location.port ? `:${window.location.port}` : '';
      setJoinUrl(`${window.location.protocol}//${localIp}${port}/join/${code}`);
    });
  }, [code]);

  useEffect(() => {
    function doRejoin() {
      socket.emit('host:rejoin', { code }, (res) => {
        if (res?.error) {
          setError(res.error);
          setPhase('error');
          return;
        }
        setQuiz(res.quiz);
        setTeams(res.teams);
        applyBranding(res.quiz);
        if (res.game.status === 'lobby') setPhase('lobby');
        else if (res.game.status === 'finished') setPhase('ended');
        else setPhase((p) => (p === 'connecting' ? 'lobby' : p));
      });
    }
    doRejoin();
    socket.on('connect', doRejoin);

    socket.on('state:team-joined', (team) => {
      setTeams((prev) => (prev.some((t) => t.id === team.id) ? prev : [...prev, team]));
    });

    socket.on('state:session-intro', (payload) => {
      applyBranding(payload);
      setSessionInfo(payload);
      setReveal(null);
      setPhase('session-intro');
    });

    socket.on('state:question-host', (payload) => {
      setQuestion(payload);
      setAnsweredTeamIds([]);
      setShowingLeaderboard(false);
      setPhase('question');
    });

    socket.on('state:answer-received', ({ teamId }) => {
      setAnsweredTeamIds((prev) => (prev.includes(teamId) ? prev : [...prev, teamId]));
    });

    socket.on('state:reveal', (payload) => {
      setReveal(payload);
      setShowingLeaderboard(false);
      setPhase('reveal');
    });

    socket.on('state:leaderboard', (payload) => {
      setLeaderboard(payload);
      setShowingLeaderboard(true);
    });

    socket.on('state:game-ended', (payload) => {
      setLeaderboard(payload);
      setPhase('ended');
    });

    return () => {
      socket.off('connect', doRejoin);
      socket.off('state:team-joined');
      socket.off('state:session-intro');
      socket.off('state:question-host');
      socket.off('state:answer-received');
      socket.off('state:reveal');
      socket.off('state:leaderboard');
      socket.off('state:game-ended');
    };
  }, [code]);

  useEffect(() => {
    if (phase !== 'question' || !question) return;
    const update = () => {
      const elapsed = Date.now() - question.startedAt;
      const remaining = Math.max(0, question.timeLimitSeconds * 1000 - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [phase, question]);

  useEffect(() => {
    const musicUrl =
      phase === 'session-intro' || phase === 'question' ? sessionInfo?.musicUrl : null;
    if (audioRef.current) {
      if (musicUrl) {
        if (!audioRef.current.src.endsWith(musicUrl)) {
          audioRef.current.src = musicUrl;
        }
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [phase, sessionInfo]);

  function startGame() {
    socket.emit('host:start', { code }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  function showQuestion() {
    socket.emit('host:show-question', { code }, (res) => {
      if (res?.error) return setError(res.error);
      if (res.sessionComplete) setPhase('session-complete');
    });
  }

  function revealAnswer() {
    audioRef.current?.pause();
    setPhase('drumroll');
    let durationMs = 1800;
    try {
      durationMs = playDrumRoll(1.8);
    } catch {
      // Web Audio unavailable (e.g. no user-gesture yet) — skip straight to reveal.
      durationMs = 0;
    }
    setTimeout(() => {
      socket.emit('host:reveal', { code }, (res) => {
        if (res?.error) setError(res.error);
      });
    }, durationMs);
  }

  function showLeaderboard(isFinal = false) {
    socket.emit('host:show-leaderboard', { code, isFinal }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  function toggleLeaderboard() {
    if (showingLeaderboard) setShowingLeaderboard(false);
    else showLeaderboard(false);
  }

  function nextSession() {
    socket.emit('host:next-session', { code }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  function endGame() {
    if (!confirm('Terminare la partita adesso?')) return;
    socket.emit('host:end', { code }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  const isLastQuestion =
    question && sessionInfo ? question.index === question.total - 1 : false;
  const isLastSession = quiz && sessionInfo ? sessionInfo.index === sessionInfo.total - 1 : false;
  const allAnswered = teams.length > 0 && answeredTeamIds.length >= teams.length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <audio ref={audioRef} loop />
      {quiz?.logo_url && (
        <img
          src={quiz.logo_url}
          alt="Logo evento"
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            height: 56,
            background: 'white',
            borderRadius: 8,
            padding: 4,
            zIndex: 10,
          }}
        />
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        {phase === 'connecting' && <p>Connessione...</p>}
        {phase === 'error' && <div className="card">⚠️ {error}</div>}

        {phase === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            {quiz?.event_title && (
              <h1 style={{ fontSize: '2.2rem', textAlign: 'center' }}>{quiz.event_title}</h1>
            )}
            <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <h2 style={{ marginBottom: '1rem' }}>Scansiona per entrare</h2>
              {joinUrl && (
                <div style={{ background: 'white', padding: 16, borderRadius: 12, display: 'inline-block' }}>
                  <QRCodeSVG value={joinUrl} size={220} />
                </div>
              )}
              <p style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '0.3rem', margin: '1rem 0 0' }}>
                {code}
              </p>
              <p style={{ color: 'var(--text-dim)', wordBreak: 'break-all' }}>{joinUrl}</p>
            </div>
            <div className="card" style={{ minWidth: 260 }}>
              <h2 style={{ marginBottom: '1rem' }}>Squadre ({teams.length})</h2>
              {teams.length === 0 ? (
                <p style={{ color: 'var(--text-dim)' }}>In attesa di squadre...</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {teams.map((t) => (
                    <li key={t.id} style={{ background: 'var(--surface-strong)', borderRadius: 8, padding: '0.5rem 0.8rem' }}>
                      {t.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </div>
          </div>
        )}

        {phase === 'drumroll' && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', animation: 'drumroll-shake 0.15s infinite' }}>🥁</div>
            <h2 style={{ marginTop: '1rem' }}>E la risposta corretta è...</h2>
          </div>
        )}

        {phase === 'session-intro' && sessionInfo && (
          <div className="card" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--text-dim)' }}>
              Sessione {sessionInfo.index + 1} di {sessionInfo.total}
            </span>
            <h1 style={{ fontSize: '3rem', margin: '0.6rem 0' }}>{sessionInfo.title}</h1>
          </div>
        )}

        {phase === 'question' && question && (
          <div style={{ width: '100%', maxWidth: 900, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: timeLeft <= 5 ? '#ff4d4d' : 'var(--text)' }}>
              {timeLeft}s
            </div>
            <h1
              style={{
                fontSize: questionFontSize(question.text),
                textAlign: questionTextAlign(question.text),
                lineHeight: 1.35,
                margin: '1rem auto',
                maxWidth: questionTextAlign(question.text) === 'left' ? 760 : undefined,
              }}
            >
              {question.text}
            </h1>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: useSingleColumnOptions(question.options) ? '1fr' : '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  style={{
                    background: `var(--answer-${i + 1})`,
                    borderRadius: 12,
                    padding: '1.2rem',
                    fontSize: optionFontSize(opt),
                    lineHeight: 1.35,
                    fontWeight: 700,
                    color: '#12081f',
                    textAlign: opt.length > 60 ? 'left' : 'center',
                    wordBreak: 'break-word',
                  }}
                >
                  {SHAPES[i]} {opt}
                </div>
              ))}
            </div>

            <div
              className="card"
              style={{
                display: 'inline-block',
                padding: '1rem 1.5rem',
                border: allAnswered ? '2px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: allAnswered ? 'var(--accent)' : 'var(--text)',
                  marginBottom: '0.6rem',
                }}
              >
                {allAnswered ? '✅ Tutte le squadre hanno risposto!' : `Risposte ricevute: ${answeredTeamIds.length} / ${teams.length}`}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {teams.map((t) => {
                  const answered = answeredTeamIds.includes(t.id);
                  return (
                    <span
                      key={t.id}
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: 999,
                        fontSize: '0.85rem',
                        background: answered ? 'var(--accent)' : 'var(--surface-strong)',
                        color: answered ? '#12081f' : 'var(--text-dim)',
                        fontWeight: answered ? 700 : 400,
                      }}
                    >
                      {answered ? '✓' : '…'} {t.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {phase === 'reveal' && reveal && !showingLeaderboard && (
          <div style={{ width: '100%', maxWidth: 700, textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: optionFontSize(question?.options[reveal.correctIndex] || ''), lineHeight: 1.35 }}>
              Risposta corretta: {SHAPES[reveal.correctIndex]} {question?.options[reveal.correctIndex]}
            </h2>
            <div className="card">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {reveal.results
                    .sort((a, b) => b.pointsAwarded - a.pointsAwarded)
                    .map((r) => (
                      <tr key={r.teamId} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', textAlign: 'left' }}>
                          {r.correct ? '✅' : r.answered ? '❌' : '⌛'} {r.teamName}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
                          +{r.pointsAwarded}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-dim)' }}>
                          {r.totalScore}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {phase === 'session-complete' && !showingLeaderboard && (
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>Sessione completata!</h2>
            <p style={{ color: 'var(--text-dim)' }}>Mostra la classifica o passa alla prossima sessione.</p>
          </div>
        )}

        {((showingLeaderboard && leaderboard) || (phase === 'ended' && leaderboard)) && (
          <div className="card" style={{ width: '100%', maxWidth: 600 }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
              {phase === 'ended' ? '🏆 Classifica finale' : '📊 Classifica'}
            </h2>
            <ol style={{ paddingLeft: '1.5rem' }}>
              {leaderboard.leaderboard.map((t, i) => (
                <li key={t.teamId} style={{ padding: '0.4rem 0', fontSize: i === 0 ? '1.3rem' : '1rem', fontWeight: i === 0 ? 800 : 500 }}>
                  {t.name} — {t.score} pt
                </li>
              ))}
            </ol>

            {phase === 'ended' && (
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                <a
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none' }}
                  href={`/api/games/${code}/export.xlsx`}
                >
                  📊 Esporta Excel
                </a>
                <a
                  className="btn btn-secondary"
                  style={{ textDecoration: 'none' }}
                  href={`/api/games/${code}/export.pdf`}
                >
                  📄 Esporta PDF
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '1rem 1.5rem',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {phase === 'lobby' && (
          <button className="btn" onClick={startGame} disabled={teams.length === 0}>
            ▶ Avvia gioco {teams.length === 0 && '(serve almeno 1 squadra)'}
          </button>
        )}
        {phase === 'session-intro' && (
          <button className="btn" onClick={showQuestion}>
            Mostra prima domanda →
          </button>
        )}
        {phase === 'question' && (
          <button
            className="btn"
            onClick={revealAnswer}
            style={allAnswered ? { background: 'var(--accent)', animation: 'pulse-glow 1s infinite' } : undefined}
          >
            Rivela risposta {allAnswered && '✅'}
          </button>
        )}
        {phase === 'reveal' && (
          <>
            <button className="btn btn-secondary" onClick={toggleLeaderboard}>
              {showingLeaderboard ? 'Nascondi classifica' : 'Mostra classifica'}
            </button>
            {!isLastQuestion && (
              <button className="btn" onClick={showQuestion}>
                Prossima domanda →
              </button>
            )}
            {isLastQuestion && !isLastSession && (
              <button className="btn" onClick={nextSession}>
                Prossima sessione →
              </button>
            )}
            {isLastQuestion && isLastSession && (
              <button className="btn" onClick={endGame}>
                Termina partita 🏆
              </button>
            )}
          </>
        )}
        {phase === 'session-complete' && (
          <>
            <button className="btn btn-secondary" onClick={toggleLeaderboard}>
              {showingLeaderboard ? 'Nascondi classifica' : 'Mostra classifica'}
            </button>
            {isLastSession ? (
              <button className="btn" onClick={endGame}>
                Termina partita 🏆
              </button>
            ) : (
              <button className="btn" onClick={nextSession}>
                Prossima sessione →
              </button>
            )}
          </>
        )}
        {phase === 'ended' && (
          <button className="btn" onClick={() => navigate('/')}>
            ← Torna ai quiz
          </button>
        )}
      </div>
    </div>
  );
}
