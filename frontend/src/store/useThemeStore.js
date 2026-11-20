import { create } from 'zustand';

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem('bakwas_theme') || 'dark',

  setTheme: (newTheme) => {
    localStorage.setItem('bakwas_theme', newTheme);
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System default
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    set({ theme: newTheme });
  },

  initTheme: () => {
    const currentTheme = get().theme;
    get().setTheme(currentTheme);
  }
}));
