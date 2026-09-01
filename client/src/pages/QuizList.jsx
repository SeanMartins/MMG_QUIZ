import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { socket } from '../socket.js';
import { THEMES, applyChrome } from '../themes.js';
import AnimatedBackground from '../components/AnimatedBackground.jsx';
import { useAuth } from '../AuthContext.jsx';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');
  const [launchingId, setLaunchingId] = useState(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    applyChrome();
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    api
      .listQuizzes()
      .then(setQuizzes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function createQuiz(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const quiz = await api.createQuiz({ title: newTitle.trim() });
      setNewTitle('');
      navigate(`/quiz/${quiz.id}`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeQuiz(id) {
    if (!confirm('Eliminare questo quiz e tutte le sue domande?')) return;
    await api.deleteQuiz(id);
    refresh();
  }

  async function launchGame(quizId) {
    setLaunchingId(quizId);
    const idToken = await user.getIdToken();
    socket.emit('host:create', { quizId, idToken }, (res) => {
      setLaunchingId(null);
      if (res?.error) return setError(res.error);
      navigate(`/host/${res.code}`);
    });
  }

  return (
    <>
      <AnimatedBackground />
      <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(1.2rem, 4vw, 2.5rem) 1.5rem 4rem' }}>
        <header
          className="responsive-row"
          style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}
        >
          <div>
            <h1 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span aria-hidden>🎯</span> Quiz Live
            </h1>
            <div className="glow-line" style={{ width: 72, marginBottom: '0.8rem' }} />
            <p style={{ color: 'var(--text-dim)', maxWidth: 560 }}>
              Crea un quiz, aggiungi sessioni e domande, poi avvia una partita per le tue squadre.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{user?.email}</span>
            <button className="btn btn-outline" onClick={signOut}>
              Esci
            </button>
          </div>
        </header>

        {error && (
          <div className="card" style={{ borderColor: '#ff4d4d', marginBottom: '1.5rem', color: '#ffb4c0' }}>
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={createQuiz}
          className="card responsive-row"
          style={{ display: 'flex', gap: '0.8rem', marginBottom: '2rem' }}
        >
          <input
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Titolo nuovo quiz (es. Quiz Aziendale 2026)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button className="btn" type="submit">
            + Crea quiz
          </button>
        </form>

        {loading ? (
          <p style={{ color: 'var(--text-dim)' }}>Caricamento...</p>
        ) : quizzes.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>Nessun quiz ancora. Creane uno per iniziare.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quizzes.map((q) => (
              <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: 10,
                      height: 42,
                      borderRadius: 999,
                      background: `linear-gradient(180deg, ${THEMES[q.theme]?.vars['--answer-1'] || '#888'}, ${
                        THEMES[q.theme]?.vars['--answer-2'] || '#555'
                      })`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</h3>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      {THEMES[q.theme]?.label || q.theme}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" onClick={() => navigate(`/quiz/${q.id}`)}>
                    Modifica
                  </button>
                  <button className="btn" onClick={() => launchGame(q.id)} disabled={launchingId === q.id}>
                    {launchingId === q.id ? 'Avvio...' : '▶ Avvia partita'}
                  </button>
                  <button className="btn btn-danger" onClick={() => removeQuiz(q.id)}>
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
