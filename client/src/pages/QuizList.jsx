import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { socket } from '../socket.js';
import { THEMES } from '../themes.js';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');
  const [launchingId, setLaunchingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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

  function launchGame(quizId) {
    setLaunchingId(quizId);
    socket.emit('host:create', { quizId }, (res) => {
      setLaunchingId(null);
      if (res?.error) return setError(res.error);
      navigate(`/host/${res.code}`);
    });
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '0.3rem' }}>🎯 Quiz Live</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
        Crea un quiz, aggiungi sessioni e domande, poi avvia una partita per le tue squadre.
      </p>

      {error && (
        <div className="card" style={{ borderColor: '#ff4d4d', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={createQuiz} className="card" style={{ display: 'flex', gap: '0.8rem', marginBottom: '2rem' }}>
        <input
          style={{ flex: 1 }}
          placeholder="Titolo nuovo quiz (es. Quiz Aziendale 2026)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button className="btn" type="submit">
          + Crea quiz
        </button>
      </form>

      {loading ? (
        <p>Caricamento...</p>
      ) : quizzes.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>Nessun quiz ancora. Creane uno per iniziare.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {quizzes.map((q) => (
            <div key={q.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: 14,
                  height: 48,
                  borderRadius: 8,
                  background: THEMES[q.theme]?.vars['--primary'] || '#888',
                }}
              />
              <div style={{ flex: 1 }}>
                <h3>{q.title}</h3>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  Tema: {THEMES[q.theme]?.label || q.theme}
                </span>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
