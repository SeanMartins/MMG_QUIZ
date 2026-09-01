export const THEMES = {
  neon: {
    label: 'Neon Night',
    vars: {
      '--bg': '#0b0620',
      '--bg-gradient': 'radial-gradient(circle at 20% 20%, #2d0b5a 0%, #0b0620 60%)',
      '--surface': 'rgba(255,255,255,0.06)',
      '--surface-strong': 'rgba(255,255,255,0.12)',
      '--text': '#f4f0ff',
      '--text-dim': '#c9bce8',
      '--primary': '#ff2fd1',
      '--secondary': '#2fe0ff',
      '--accent': '#ffe94a',
      '--border': 'rgba(255,255,255,0.15)',
      '--font-heading': "'Poppins', 'Segoe UI', sans-serif",
      '--font-body': "'Segoe UI', sans-serif",
      '--answer-1': '#ff2fd1',
      '--answer-2': '#2fe0ff',
      '--answer-3': '#ffe94a',
      '--answer-4': '#37ff8b',
    },
  },
  arcade: {
    label: 'Retro Arcade',
    vars: {
      '--bg': '#101820',
      '--bg-gradient': 'linear-gradient(135deg, #101820 0%, #1d2b3a 100%)',
      '--surface': 'rgba(255,255,255,0.05)',
      '--surface-strong': 'rgba(255,255,255,0.1)',
      '--text': '#f4f7fb',
      '--text-dim': '#9fb3c8',
      '--primary': '#ff6b35',
      '--secondary': '#f7c948',
      '--accent': '#4cc9f0',
      '--border': 'rgba(255,255,255,0.15)',
      '--font-heading': "'Courier New', monospace",
      '--font-body': "'Segoe UI', sans-serif",
      '--answer-1': '#ff6b35',
      '--answer-2': '#4cc9f0',
      '--answer-3': '#f7c948',
      '--answer-4': '#8ac926',
    },
  },
  pastel: {
    label: 'Pastel Sogno',
    vars: {
      '--bg': '#fff5f8',
      '--bg-gradient': 'linear-gradient(135deg, #ffe3ef 0%, #e3f0ff 100%)',
      '--surface': 'rgba(255,255,255,0.7)',
      '--surface-strong': 'rgba(255,255,255,0.95)',
      '--text': '#4a3b52',
      '--text-dim': '#8a7690',
      '--primary': '#ff8fb1',
      '--secondary': '#8ecae6',
      '--accent': '#ffd166',
      '--border': 'rgba(74,59,82,0.12)',
      '--font-heading': "'Segoe UI', sans-serif",
      '--font-body': "'Segoe UI', sans-serif",
      '--answer-1': '#ff8fb1',
      '--answer-2': '#8ecae6',
      '--answer-3': '#ffd166',
      '--answer-4': '#b8e0a8',
    },
  },
  elegant: {
    label: 'Notte Elegante',
    vars: {
      '--bg': '#12121a',
      '--bg-gradient': 'linear-gradient(160deg, #12121a 0%, #23233a 100%)',
      '--surface': 'rgba(255,255,255,0.04)',
      '--surface-strong': 'rgba(255,255,255,0.09)',
      '--text': '#efeaf7',
      '--text-dim': '#a9a2c0',
      '--primary': '#c9a44c',
      '--secondary': '#7c83fd',
      '--accent': '#e0b0ff',
      '--border': 'rgba(201,164,76,0.25)',
      '--font-heading': "'Georgia', serif",
      '--font-body': "'Segoe UI', sans-serif",
      '--answer-1': '#c9a44c',
      '--answer-2': '#7c83fd',
      '--answer-3': '#e0b0ff',
      '--answer-4': '#5fd0a8',
    },
  },
  classic: {
    label: 'TV Classico',
    vars: {
      '--bg': '#0d2b4e',
      '--bg-gradient': 'linear-gradient(135deg, #0d2b4e 0%, #1a4a7c 100%)',
      '--surface': 'rgba(255,255,255,0.07)',
      '--surface-strong': 'rgba(255,255,255,0.14)',
      '--text': '#ffffff',
      '--text-dim': '#bcd4ec',
      '--primary': '#ffcc00',
      '--secondary': '#e63946',
      '--accent': '#2ec4b6',
      '--border': 'rgba(255,255,255,0.2)',
      '--font-heading': "'Impact', 'Arial Black', sans-serif",
      '--font-body': "'Segoe UI', sans-serif",
      '--answer-1': '#e63946',
      '--answer-2': '#1d7fd4',
      '--answer-3': '#ffcc00',
      '--answer-4': '#2ec4b6',
    },
  },
};

export const FONT_OPTIONS = [
  { value: '', label: 'Predefinito del tema' },
  { value: "'Arial', 'Helvetica', sans-serif", label: 'Arial' },
  { value: "'Georgia', serif", label: 'Georgia (serif)' },
  { value: "'Verdana', sans-serif", label: 'Verdana (alta leggibilità)' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];

export function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.neon;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  return theme;
}

export function applyCustomBackground(url, overlay = 0.5) {
  if (url) {
    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})), url("${url}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
  }
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Only overrides --text/--font-* when a value is given; otherwise leaves whatever
// applyTheme() just set, so the chosen theme's own palette/fonts still apply.
export function applyTextOverrides(color, fontFamily) {
  const root = document.documentElement;
  if (color) {
    root.style.setProperty('--text', color);
    root.style.setProperty('--text-dim', hexToRgba(color, 0.75));
  }
  if (fontFamily) {
    root.style.setProperty('--font-body', fontFamily);
    root.style.setProperty('--font-heading', fontFamily);
  }
}

// Convenience: apply theme colors + custom background + text overrides from a quiz
// or branding payload (accepts either snake_case DB fields or camelCase socket fields).
// Always applies the theme first so switching themes/games resets any prior override.
export function applyBranding(source) {
  if (!source) return;
  applyTheme(source.theme);
  const overlay = source.background_overlay ?? source.backgroundOverlay;
  applyCustomBackground(
    source.background_url ?? source.backgroundUrl ?? null,
    overlay === undefined || overlay === null ? 0.5 : overlay
  );
  applyTextOverrides(
    source.text_color ?? source.textColor ?? null,
    source.font_family ?? source.fontFamily ?? null
  );
}
