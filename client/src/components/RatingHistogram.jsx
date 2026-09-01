export default function RatingHistogram({ min, max, minLabel, maxLabel, counts, average, count }) {
  const values = [];
  for (let v = min; v <= max; v++) values.push(v);
  const maxCount = Math.max(1, ...values.map((v) => counts[v] || 0));

  return (
    <div style={{ width: '100%' }}>
      {average != null && (
        <p style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.3rem' }}>
          {average.toFixed(1)}
          <span style={{ fontSize: '1rem', color: 'var(--text-dim)', fontWeight: 500 }}> / {max}</span>
        </p>
      )}
      {count != null && (
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {count} {count === 1 ? 'risposta' : 'risposte'}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 140, justifyContent: 'center' }}>
        {values.map((v) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1, maxWidth: 60 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{counts[v] || 0}</span>
            <div
              style={{
                width: '100%',
                height: `${Math.max(4, ((counts[v] || 0) / maxCount) * 100)}px`,
                background: 'var(--primary)',
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.3s ease',
              }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
