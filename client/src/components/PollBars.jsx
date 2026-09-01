import { Check } from 'lucide-react';

export default function PollBars({ options, counts, correctIndex, shapes: Shapes }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', width: '100%' }}>
      {options.map((opt, i) => {
        const pct = Math.round((counts[i] / total) * 100);
        const Shape = Shapes?.[i];
        const isCorrect = correctIndex != null && correctIndex >= 0 && i === correctIndex;
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.95rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: isCorrect ? 800 : 500 }}>
                {Shape && <Shape size={15} />} {opt} {isCorrect && <Check size={15} color="var(--secondary)" />}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>
                {counts[i]} · {pct}%
              </span>
            </div>
            <div style={{ background: 'var(--surface-strong)', borderRadius: 999, height: 14, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: `var(--answer-${i + 1})`,
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
