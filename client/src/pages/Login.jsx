import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Target, AlertTriangle } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { applyChrome } from '../themes.js';
import AnimatedBackground from '../components/AnimatedBackground.jsx';

const ERROR_MESSAGES = {
  'auth/invalid-email': 'Email non valida.',
  'auth/user-not-found': 'Nessun account con questa email.',
  'auth/wrong-password': 'Password errata.',
  'auth/invalid-credential': 'Email o password errati.',
  'auth/email-already-in-use': 'Esiste già un account con questa email.',
  'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
};

export default function Login() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => applyChrome(), []);

  useEffect(() => {
    if (user) navigate(location.state?.from || '/', { replace: true });
  }, [user, navigate, location.state]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Si è verificato un errore. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AnimatedBackground />
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <form onSubmit={submit} className="card" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Target size={26} strokeWidth={2.2} color="var(--primary)" aria-hidden /> Quiz Live
            </h1>
            <div className="glow-line" style={{ width: 60, margin: '0 auto' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              className={mode === 'signin' ? 'btn' : 'btn btn-outline'}
              style={{ flex: 1 }}
              onClick={() => setMode('signin')}
            >
              Accedi
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'btn' : 'btn btn-outline'}
              style={{ flex: 1 }}
              onClick={() => setMode('signup')}
            >
              Registrati
            </button>
          </div>

          {error && (
            <div
              style={{
                color: '#ffb4c0',
                marginBottom: '1rem',
                fontSize: '0.9rem',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            style={{ width: '100%', marginBottom: '1rem' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            style={{ width: '100%', marginBottom: '1.5rem' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn" type="submit" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Attendere...' : mode === 'signin' ? 'Accedi →' : 'Crea account →'}
          </button>
        </form>
      </div>
    </>
  );
}
