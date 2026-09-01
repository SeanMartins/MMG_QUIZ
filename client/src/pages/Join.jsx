import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../socket.js';

export default function Join() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam || '');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (codeParam) setCode(codeParam.toUpperCase());
  }, [codeParam]);

  function submit(e) {
    e.preventDefault();
    if (!code.trim() || !teamName.trim()) return;
    setJoining(true);
    setError('');
    const upperCode = code.trim().toUpperCase();
    socket.emit('player:join', { code: upperCode, teamName: teamName.trim() }, (res) => {
      setJoining(false);
      if (res?.error) return setError(res.error);
      localStorage.setItem(
        `quiz-team-${upperCode}`,
        JSON.stringify({ teamId: res.teamId, teamName: res.teamName })
      );
      navigate(`/play/${upperCode}`);
    });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>🎉 Unisciti al Quiz</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
          Inserisci il codice partita e scegli il nome della tua squadra
        </p>

        {error && (
          <div style={{ color: '#ff4d4d', marginBottom: '1rem', fontWeight: 600 }}>⚠️ {error}</div>
        )}

        <input
          style={{
            width: '100%',
            fontSize: '1.6rem',
            letterSpacing: '0.3rem',
            textAlign: 'center',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
          maxLength={5}
          placeholder="CODICE"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          style={{ width: '100%', fontSize: '1.1rem', textAlign: 'center', marginBottom: '1.2rem' }}
          placeholder="Nome squadra"
          maxLength={40}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
        <button className="btn" type="submit" style={{ width: '100%' }} disabled={joining}>
          {joining ? 'Entrando...' : 'Entra in partita →'}
        </button>
      </form>
    </div>
  );
}
