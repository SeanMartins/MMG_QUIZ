// Heuristics so long clinical-case style questions/answers stay readable
// instead of overflowing or shrinking illegibly small.

export function questionFontSize(text = '') {
  const len = text.length;
  if (len > 400) return '1.15rem';
  if (len > 220) return '1.4rem';
  if (len > 120) return '1.7rem';
  return '2rem';
}

export function questionTextAlign(text = '') {
  return text.length > 140 ? 'left' : 'center';
}

export function optionFontSize(text = '') {
  const len = text.length;
  if (len > 220) return '0.8rem';
  if (len > 120) return '0.95rem';
  if (len > 60) return '1.1rem';
  return '1.3rem';
}

// Long answers read better stacked in one column than squeezed into a 2x2 grid.
export function useSingleColumnOptions(options = []) {
  return options.some((o) => (o || '').length > 70);
}
