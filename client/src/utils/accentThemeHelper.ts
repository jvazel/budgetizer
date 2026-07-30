/**
 * Helper utility to manage and apply custom brand accent themes dynamically
 */

export interface AccentThemeOption {
  key: string;
  name: string;
  color: string;
  hover: string;
  dim: string;
}

export const ACCENT_THEMES: AccentThemeOption[] = [
  { key: 'copper', name: 'Banky Copper', color: '#d97706', hover: '#b45309', dim: 'rgba(217, 119, 6, 0.10)' },
  { key: 'emerald', name: 'Emerald Forest', color: '#10b981', hover: '#059669', dim: 'rgba(16, 185, 129, 0.10)' },
  { key: 'indigo', name: 'Electric Indigo', color: '#6366f1', hover: '#4f46e5', dim: 'rgba(99, 102, 241, 0.10)' },
  { key: 'rose', name: 'Rose Gold', color: '#f43f5e', hover: '#e11d48', dim: 'rgba(244, 63, 94, 0.10)' },
];

export const applyAccentColor = (accentKey: string): void => {
  if (typeof window === 'undefined') return;
  const theme = ACCENT_THEMES.find(t => t.key === accentKey) || ACCENT_THEMES[0];
  
  document.documentElement.style.setProperty('--copper', theme.color);
  document.documentElement.style.setProperty('--copper-hover', theme.hover);
  document.documentElement.style.setProperty('--copper-dim', theme.dim);
  
  localStorage.setItem('budgetizer_accent_theme', theme.key);
};

export const getSavedAccentColor = (): string => {
  if (typeof window === 'undefined') return 'copper';
  return localStorage.getItem('budgetizer_accent_theme') || 'copper';
};
