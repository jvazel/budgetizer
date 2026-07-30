import { describe, it, expect } from 'vitest';
import { ACCENT_THEMES, applyAccentColor, getSavedAccentColor } from '../accentThemeHelper';

describe('accentThemeHelper Utility', () => {
  it('defines 4 standard brand accent options', () => {
    expect(ACCENT_THEMES).toHaveLength(4);
    expect(ACCENT_THEMES.map(t => t.key)).toEqual(['copper', 'emerald', 'indigo', 'rose']);
  });

  it('applies accent color and saves to localStorage', () => {
    applyAccentColor('emerald');
    expect(getSavedAccentColor()).toBe('emerald');
  });
});
