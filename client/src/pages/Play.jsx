import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Hand,
  Hourglass,
  PartyPopper,
  XCircle,
  Trophy,
  BarChart3,
  Triangle,
  Diamond,
  Circle,
  Square,
} from 'lucide-react';
import { socket } from '../socket.js';
import { applyBranding } from '../themes.js';
import { questionFontSize, questionTextAlign, optionFontSize, isLongOptionSet } from '../textFit.js';

const SHAPES = [Triangle, Diamond, Circle, Square];

export default function Play() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState('connecting');
  const [error, setError] = useState('');
  const [teamId, setTeamId] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answerError, setAnswerError] = useState('');
  const [reveal, setReveal] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [logoUrl, setLogoUrl] = useState(null);
  const teamIdRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem(`quiz-team-${code}`);
    if (!stored) {
      navigate(`/join/${code}`);
      return;
    }
    const { teamId: storedTeamId, teamName: storedTeamName } = JSON.parse(stored);
    teamIdRef.current = storedTeamId;
    setTeamId(storedTeamId);
    setTeamName(storedTeamName);

    function doRejoin() {
      socket.emit('player:rejoin', { code, teamId: storedTeamId }, (res) => {
        if (res?.error) {
          setError(res.error);
          setScreen('error');
          return;
        }
        applyBranding(res);
        setLogoUrl(res.logoUrl || null);
        setScreen(res.gameStatus === 'lobby' ? 'lobby' : 'waiting');
      });
    }
    doRejoin();
    socket.on('connect', doRejoin);

    socket.on('state:session-intro', (payload) => {
      applyBranding(payload);
      if (payload.logoUrl !== undefined) setLogoUrl(payload.logoUrl || null);
      setSessionInfo(payload);
      setScreen('session-intro');
    });

    socket.on('state:question', (payload) => {
      setQuestion(payload);
      setSelected(null);
      setAnswerError('');
      setScreen('question');
    });

    socket.on('state:time-up', () => {
      setScreen((s) => (s === 'question' ? 'answered' : s));
    });

    socket.on('state:reveal', (payload) => {
      setReveal(payload);
      setScreen('reveal');
    });

    socket.on('state:leaderboard', (payload) => {
      setLeaderboard(payload);
      setScreen('leaderboard');
    });

    socket.on('state:game-ended', (payload) => {
      setLeaderboard(payload);
      setScreen('ended');
    });

    return () => {
      socket.off('connect', doRejoin);
      socket.off('state:session-intro');
      socket.off('state:question');
      socket.off('state:time-up');
      socket.off('state:reveal');
      socket.off('state:leaderboard');
      socket.off('state:game-ended');
    };
  }, [code, navigate]);

  useEffect(() => {
    if (screen !== 'question' || !question) return;
    const update = () => {
      const elapsed = Date.now() - question.startedAt;
      const remaining = Math.max(0, question.timeLimitSeconds * 1000 - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [screen, question]);

  function answer(idx) {
    if (selected !== null) return;
    setSelected(idx);
    socket.emit('player:answer', { code, questionId: question.id, answerIndex: idx }, (res) => {
      if (res?.error) {
        setAnswerError(res.error);
      } else {
        setScreen('answered');
      }
    });
  }

  const myResult = reveal?.results.find((r) => r.teamId === teamId);
  const myBoardEntry = leaderboard?.leaderboard.find((r) => r.teamId === teamId);
  const myRank = leaderboard?.leaderboard.findIndex((r) => r.teamId === teamId);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.2rem',
        textAlign: 'center',
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo evento"
          style={{ position: 'fixed', top: 10, left: 12, height: 36, background: 'white', borderRadius: 6, padding: 3 }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 16,
          color: 'var(--text-dim)',
          fontSize: '0.85rem',
        }}
      >
        {teamName}
      </div>

      {screen === 'connecting' && <p>Connessione in corso...</p>}

      {screen === 'error' && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {screen === 'lobby' && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={24} /> Sei dentro, {teamName}!
          </h2>
          <p style={{ color: 'var(--text-dim)' }}>In attesa che l'host avvii il quiz...</p>
        </div>
      )}

      {screen === 'waiting' && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Hand size={22} /> Bentornato, {teamName}
          </h2>
          <p style={{ color: 'var(--text-dim)' }}>In attesa del prossimo evento...</p>
        </div>
      )}

      {screen === 'session-intro' && sessionInfo && (
        <div className="card" style={{ maxWidth: 420 }}>
          <span style={{ color: 'var(--text-dim)' }}>
            Sessione {sessionInfo.index + 1} di {sessionInfo.total}
          </span>
          <h1 style={{ margin: '0.5rem 0' }}>{sessionInfo.title}</h1>
          <p style={{ color: 'var(--text-dim)' }}>Preparati!</p>
        </div>
      )}

      {screen === 'question' && question && (
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '2.2rem',
                fontWeight: 700,
                color: timeLeft <= 5 ? '#ff4d4d' : 'var(--text)',
              }}
            >
              {timeLeft}s
            </div>
            <p
              style={{
                fontSize: questionFontSize(question.text),
                fontWeight: 600,
                textAlign: questionTextAlign(question.text),
                lineHeight: 1.35,
              }}
            >
              {question.text}
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isLongOptionSet(question.options) ? '1fr' : '1fr 1fr',
              gap: '0.8rem',
            }}
          >
            {question.options.map((opt, i) => {
              const Shape = SHAPES[i];
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={selected !== null}
                  className="btn"
                  style={{
                    background: `var(--answer-${i + 1})`,
                    minHeight: 90,
                    fontSize: optionFontSize(opt),
                    lineHeight: 1.3,
                    textAlign: opt.length > 60 ? 'left' : 'center',
                    opacity: selected !== null && selected !== i ? 0.4 : 1,
                    border: selected === i ? '3px solid white' : 'none',
                    wordBreak: 'break-word',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Shape size={18} style={{ flexShrink: 0 }} /> {opt}
                </button>
              );
            })}
          </div>
          {answerError && <p style={{ color: '#ff4d4d', marginTop: '0.8rem' }}>{answerError}</p>}
        </div>
      )}

      {screen === 'answered' && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {selected !== null ? (
              <>
                <CheckCircle2 size={22} /> Risposta inviata!
              </>
            ) : (
              <>
                <Hourglass size={22} /> Tempo scaduto
              </>
            )}
          </h2>
          <p style={{ color: 'var(--text-dim)' }}>In attesa degli altri team...</p>
        </div>
      )}

      {screen === 'reveal' && myResult && (
        <div className="card" style={{ maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: myResult.correct ? '#37ff8b' : myResult.answered ? '#ff4d6d' : 'var(--text-dim)' }}>
            {myResult.correct ? <PartyPopper size={48} /> : myResult.answered ? <XCircle size={48} /> : <Hourglass size={48} />}
          </div>
          <h2>{myResult.correct ? 'Corretto!' : myResult.answered ? 'Sbagliato' : 'Nessuna risposta'}</h2>
          <p style={{ fontSize: '1.4rem', color: 'var(--accent)', fontWeight: 700 }}>
            +{myResult.pointsAwarded} punti
          </p>
          <p style={{ color: 'var(--text-dim)' }}>Punteggio totale: {myResult.totalScore}</p>
        </div>
      )}

      {(screen === 'leaderboard' || screen === 'ended') && leaderboard && (
        <div className="card" style={{ maxWidth: 420, width: '100%' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {screen === 'ended' ? (
              <>
                <Trophy size={22} /> Classifica finale
              </>
            ) : (
              <>
                <BarChart3 size={22} /> Classifica
              </>
            )}
          </h2>
          {myBoardEntry && (
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: '1rem' }}>
              Sei al {myRank + 1}° posto con {myBoardEntry.score} punti
            </p>
          )}
          <ol style={{ textAlign: 'left', paddingLeft: '1.5rem' }}>
            {leaderboard.leaderboard.slice(0, 10).map((t) => (
              <li
                key={t.teamId}
                style={{
                  fontWeight: t.teamId === teamId ? 700 : 400,
                  color: t.teamId === teamId ? 'var(--accent)' : 'var(--text)',
                  padding: '0.2rem 0',
                }}
              >
                {t.name} — {t.score}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
