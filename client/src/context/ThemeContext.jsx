import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }) {
  // Default to 'light' for users who prefer light mode
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    
    // Default to light mode (not system preference)
    return 'light';
  });

  useEffect(() => {
    // Update document attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update Tailwind dark class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('dark');
  
  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setLightTheme, 
      setDarkTheme,
      isDark,
      isLight
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
