import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { THEMES, FONT_OPTIONS } from '../themes.js';

export default function QuizEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [titleDraft, setTitleDraft] = useState('');

  const load = useCallback(() => {
    api
      .getQuiz(id)
      .then((q) => {
        setQuiz(q);
        setTitleDraft(q.title);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  if (error) return <div style={{ padding: '2rem' }}>⚠️ {error}</div>;
  if (!quiz) return <div style={{ padding: '2rem' }}>Caricamento...</div>;

  async function saveTitle() {
    if (titleDraft.trim() && titleDraft !== quiz.title) {
      const updated = await api.updateQuiz(id, { title: titleDraft.trim() });
      setQuiz(updated);
    }
  }

  async function setTheme(themeKey) {
    const updated = await api.updateQuiz(id, { theme: themeKey });
    setQuiz(updated);
  }

  async function addSession() {
    const updated = await api.addSession(id, { title: `Sessione ${quiz.sessions.length + 1}` });
    setQuiz(updated);
  }

  const theme = THEMES[quiz.theme] || THEMES.neon;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      <Link to="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
        ← Torna ai quiz
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0 2rem' }}>
        <input
          style={{ fontSize: '1.6rem', fontWeight: 700, flex: 1 }}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
        />
      </div>

      <section className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>🎨 Grafica</h3>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className="btn-outline"
              style={{
                borderRadius: 12,
                padding: '0.8rem 1rem',
                border: key === quiz.theme ? `2px solid ${theme.vars['--secondary']}` : '2px solid var(--border)',
                background: t.vars['--bg'],
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                alignItems: 'flex-start',
                minWidth: 140,
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: t.vars[`--answer-${n}`],
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>
              <span style={{ color: t.vars['--text'], fontSize: '0.85rem', fontFamily: t.vars['--font-heading'] }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <BrandingCard quiz={quiz} onChange={setQuiz} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>📚 Sessioni</h3>
        <button className="btn" onClick={addSession}>
          + Aggiungi sessione
        </button>
      </div>

      {quiz.sessions.length === 0 && (
        <p style={{ color: 'var(--text-dim)' }}>
          Nessuna sessione. Le sessioni ti permettono di dividere il quiz in round (es. "Storia", "Sport"...),
          ognuna con la propria musica di sottofondo.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {quiz.sessions.map((session, i) => (
          <SessionCard key={session.id} session={session} index={i} onChange={setQuiz} />
        ))}
      </div>
    </div>
  );
}

function BrandingCard({ quiz, onChange }) {
  const [eventTitleDraft, setEventTitleDraft] = useState(quiz.event_title || '');
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandingError, setBrandingError] = useState('');

  useEffect(() => setEventTitleDraft(quiz.event_title || ''), [quiz.event_title]);

  async function saveEventTitle() {
    if (eventTitleDraft !== (quiz.event_title || '')) {
      onChange(await api.updateQuiz(quiz.id, { event_title: eventTitleDraft }));
    }
  }

  async function onBackgroundChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true);
    setBrandingError('');
    try {
      onChange(await api.uploadBackground(quiz.id, file));
    } catch (err) {
      setBrandingError(err.message);
    } finally {
      setUploadingBg(false);
    }
  }

  async function removeBackground() {
    onChange(await api.deleteBackground(quiz.id));
  }

  async function onLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    setBrandingError('');
    try {
      onChange(await api.uploadLogo(quiz.id, file));
    } catch (err) {
      setBrandingError(err.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    onChange(await api.deleteLogo(quiz.id));
  }

  const [overlayDraft, setOverlayDraft] = useState(quiz.background_overlay ?? 0.5);
  useEffect(() => setOverlayDraft(quiz.background_overlay ?? 0.5), [quiz.background_overlay]);

  async function saveOverlay() {
    onChange(await api.updateQuiz(quiz.id, { background_overlay: overlayDraft }));
  }

  async function setTextColor(color) {
    onChange(await api.updateQuiz(quiz.id, { text_color: color }));
  }

  async function resetTextColor() {
    onChange(await api.updateQuiz(quiz.id, { text_color: '' }));
  }

  async function setFontFamily(fontFamily) {
    onChange(await api.updateQuiz(quiz.id, { font_family: fontFamily }));
  }

  const currentThemeTextColor = THEMES[quiz.theme]?.vars['--text'] || '#f4f0ff';

  return (
    <section className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>🎪 Personalizzazione evento</h3>

      {brandingError && (
        <div style={{ color: '#ff4d4d', marginBottom: '1rem' }}>⚠️ {brandingError}</div>
      )}

      <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
        Titolo evento (mostrato in lobby, es. "Team Building 2026")
      </label>
      <input
        style={{ width: '100%', marginBottom: '1.5rem' }}
        placeholder="Es. Quiz Aziendale - Team Building 2026"
        value={eventTitleDraft}
        onChange={(e) => setEventTitleDraft(e.target.value)}
        onBlur={saveEventTitle}
      />

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            🖼 Sfondo personalizzato
          </label>
          {quiz.background_url ? (
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <img
                src={quiz.background_url}
                alt="Sfondo"
                style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <button className="btn btn-danger" onClick={removeBackground}>
                Rimuovi
              </button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={onBackgroundChange} disabled={uploadingBg} />
          )}
          {uploadingBg && <p style={{ color: 'var(--text-dim)' }}>Caricamento...</p>}
          {!quiz.background_url && (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', maxWidth: 260 }}>
              Se non impostato, viene usato lo sfondo del tema scelto sopra.
            </p>
          )}
          {quiz.background_url && (
            <div style={{ marginTop: '0.8rem', maxWidth: 260 }}>
              <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                Scurimento sfondo (per leggibilità): {Math.round(overlayDraft * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={0.85}
                step={0.05}
                value={overlayDraft}
                style={{ width: '100%' }}
                onChange={(e) => setOverlayDraft(Number(e.target.value))}
                onMouseUp={saveOverlay}
                onTouchEnd={saveOverlay}
              />
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            🏷 Logo evento
          </label>
          {quiz.logo_url ? (
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <img
                src={quiz.logo_url}
                alt="Logo"
                style={{ width: 68, height: 68, objectFit: 'contain', borderRadius: 8, background: 'white', padding: 4 }}
              />
              <button className="btn btn-danger" onClick={removeLogo}>
                Rimuovi
              </button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={onLogoChange} disabled={uploadingLogo} />
          )}
          {uploadingLogo && <p style={{ color: 'var(--text-dim)' }}>Caricamento...</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            🎨 Colore testo (per contrasto su sfondi personalizzati)
          </label>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <input
              type="color"
              value={quiz.text_color || currentThemeTextColor}
              onChange={(e) => setTextColor(e.target.value)}
              style={{ width: 48, height: 40, padding: 2, cursor: 'pointer' }}
            />
            {quiz.text_color && (
              <button className="btn btn-outline" onClick={resetTextColor}>
                Ripristina tema
              </button>
            )}
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', maxWidth: 260, marginTop: '0.4rem' }}>
            Se lo sfondo rende il testo poco leggibile, scegli qui un colore con più contrasto.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            🔤 Font testo
          </label>
          <select value={quiz.font_family || ''} onChange={(e) => setFontFamily(e.target.value)}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value || undefined }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

function SessionCard({ session, index, onChange }) {
  const [titleDraft, setTitleDraft] = useState(session.title);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setTitleDraft(session.title), [session.title]);

  async function saveTitle() {
    if (titleDraft.trim() && titleDraft !== session.title) {
      onChange(await api.updateSession(session.id, { title: titleDraft.trim() }));
    }
  }

  async function removeSession() {
    if (!confirm(`Eliminare la sessione "${session.title}" e tutte le sue domande?`)) return;
    onChange(await api.deleteSession(session.id));
  }

  async function onMusicChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      onChange(await api.uploadMusic(session.id, file));
    } finally {
      setUploading(false);
    }
  }

  async function addQuestion() {
    onChange(await api.addQuestion(session.id, {}));
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
        <span
          style={{
            background: 'var(--surface-strong)',
            borderRadius: 8,
            padding: '0.3rem 0.7rem',
            fontSize: '0.85rem',
          }}
        >
          Sessione {index + 1}
        </span>
        <input
          style={{ flex: 1, fontWeight: 600 }}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
        />
        <button className="btn btn-danger" onClick={removeSession}>
          Elimina sessione
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
        <label style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>🎵 Musica di sottofondo:</label>
        <input type="file" accept="audio/*" onChange={onMusicChange} disabled={uploading} />
        {session.music_url && (
          <audio controls src={session.music_url} style={{ height: 32 }} />
        )}
        {uploading && <span>Caricamento...</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {session.questions.map((question, qi) => (
          <QuestionCard key={question.id} question={question} index={qi} onChange={onChange} />
        ))}
      </div>

      <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={addQuestion}>
        + Aggiungi domanda
      </button>
    </div>
  );
}

function QuestionCard({ question, index, onChange }) {
  const [local, setLocal] = useState(question);
  const localRef = useRef(question);

  useEffect(() => {
    setLocal(question);
    localRef.current = question;
  }, [question]);

  function updateLocal(patch) {
    setLocal((l) => {
      const merged = { ...l, ...patch };
      localRef.current = merged;
      return merged;
    });
  }

  async function save(patch) {
    const merged = { ...localRef.current, ...patch };
    localRef.current = merged;
    setLocal(merged);
    onChange(
      await api.updateQuestion(question.id, {
        text: merged.text,
        options: merged.options,
        correct_index: merged.correct_index,
        time_limit_seconds: merged.time_limit_seconds,
        points: merged.points,
      })
    );
  }

  async function removeQuestion() {
    if (!confirm('Eliminare questa domanda?')) return;
    onChange(await api.deleteQuestion(question.id));
  }

  function updateOption(idx, value) {
    const options = [...local.options];
    options[idx] = value;
    updateLocal({ options });
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '1rem',
        background: 'var(--surface-strong)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
        <span style={{ color: 'var(--text-dim)', paddingTop: '0.6rem' }}>Q{index + 1}</span>
        <textarea
          rows={3}
          style={{ flex: 1, resize: 'vertical' }}
          value={local.text}
          onChange={(e) => updateLocal({ text: e.target.value })}
          onBlur={() => save({})}
          placeholder="Testo della domanda (può essere lungo quanto serve, es. descrizione di un caso clinico)"
        />
        <button className="btn btn-danger" onClick={removeQuestion}>
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
        {local.options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <input
              type="radio"
              checked={local.correct_index === i}
              onChange={() => save({ correct_index: i })}
              title="Segna come risposta corretta"
              style={{ marginTop: '0.8rem' }}
            />
            <textarea
              rows={2}
              style={{ flex: 1, resize: 'vertical' }}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              onBlur={() => save({})}
              placeholder={`Opzione ${i + 1} (testo libero, anche lungo)`}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-dim)' }}>
          ⏱ Tempo (sec)
          <input
            type="number"
            min={5}
            max={120}
            style={{ width: 70 }}
            value={local.time_limit_seconds}
            onChange={(e) => updateLocal({ time_limit_seconds: Number(e.target.value) })}
            onBlur={() => save({})}
          />
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-dim)' }}>
          🏆 Punti max
          <input
            type="number"
            min={100}
            step={100}
            style={{ width: 90 }}
            value={local.points}
            onChange={(e) => updateLocal({ points: Number(e.target.value) })}
            onBlur={() => save({})}
          />
        </label>
      </div>
    </div>
  );
}
