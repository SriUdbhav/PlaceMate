import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark' | 'cappuccino';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('placemate_theme') as AppTheme;
      if (saved && ['light', 'dark', 'cappuccino'].includes(saved)) {
        return saved;
      }
    }
    return 'light';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('placemate_theme', newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('cappuccino');
    else setTheme('light');
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'cappuccino');
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
