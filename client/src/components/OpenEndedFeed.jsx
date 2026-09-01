export default function OpenEndedFeed({ items, maxHeight = 420 }) {
  if (!items.length) {
    return (
      <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
        In attesa delle prime risposte...
      </p>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        maxHeight,
        overflowY: 'auto',
        width: '100%',
      }}
    >
      {items
        .slice()
        .reverse()
        .map((item, i) => (
          <div
            key={i}
            className="card"
            style={{ padding: '0.8rem 1rem', textAlign: 'left' }}
          >
            <p style={{ fontSize: '1.05rem' }}>{item.text}</p>
            {item.teamName && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                — {item.teamName}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}
