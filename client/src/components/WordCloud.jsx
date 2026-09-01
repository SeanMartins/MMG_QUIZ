// Simple frequency-sized word cloud. No physics/packing engine — words just
// flow in a centered flex-wrap, sized and colored by relative frequency.
// Good enough visually for a live event screen without extra dependencies.
export default function WordCloud({ words, style }) {
  if (!words.length) {
    return (
      <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
        In attesa delle prime parole...
      </p>
    );
  }

  const max = Math.max(...words.map((w) => w.count));
  const min = Math.min(...words.map((w) => w.count));
  const colors = ['--answer-1', '--answer-2', '--answer-3', '--answer-4'];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.6rem 1rem',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        ...style,
      }}
    >
      {words.map((w, i) => {
        const ratio = max === min ? 1 : (w.count - min) / (max - min);
        const size = 1 + ratio * 2.6; // 1rem .. 3.6rem
        return (
          <span
            key={w.text}
            title={`${w.count}×`}
            style={{
              fontSize: `${size}rem`,
              fontWeight: 700,
              color: `var(${colors[i % colors.length]})`,
              lineHeight: 1,
              transition: 'font-size 0.3s ease',
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}
