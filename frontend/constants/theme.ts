// Theme colors configuration
export const themes = {
  dark: {
    background: '#000000',
    card: '#111111',
    cardAlt: '#1a1a1a',
    border: '#222222',
    text: '#ffffff',
    textSecondary: '#888888',
    textMuted: '#666666',
    accent: '#8B0000',
    accentLight: '#2a1a1a',
  },
  light: {
    background: '#f5f5f5',
    card: '#ffffff',
    cardAlt: '#f0f0f0',
    border: '#e0e0e0',
    text: '#000000',
    textSecondary: '#555555',
    textMuted: '#888888',
    accent: '#8B0000',
    accentLight: '#ffe5e5',
  },
};

export type ThemeColors = typeof themes.dark;
