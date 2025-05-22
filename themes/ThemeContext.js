import React, { createContext, useState, useContext } from 'react';

// Tema renkleri
const themes = {
  dark: {
    name: 'dark',
    backgroundColor: '#1a1a2e',
    secondaryBackground: '#232342',
    cardBackground: 'rgba(255, 255, 255, 0.05)',
    borderColor: '#4a4e69',
    textColor: '#e6e6e6',
    secondaryTextColor: '#9a9a9a',
    primaryColor: '#0099ff',
    primaryDarkColor: '#0077cc',
    accentColor: '#f44336',
    successColor: '#4caf50',
  },
  light: {
    name: 'light',
    backgroundColor: '#f5f5f5',
    secondaryBackground: '#e1e1e1',
    cardBackground: 'rgba(0, 0, 0, 0.03)',
    borderColor: '#cccccc',
    textColor: '#333333',
    secondaryTextColor: '#666666',
    primaryColor: '#0099ff',
    primaryDarkColor: '#0077cc',
    accentColor: '#f44336',
    successColor: '#4caf50',
  }
};

// Context oluştur
const ThemeContext = createContext();

// Provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(themes.dark);

  // Tema değiştirme fonksiyonu
  const toggleTheme = () => {
    setTheme(theme.name === 'dark' ? themes.light : themes.dark);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Tema objelerini dışarı aktar
export { themes };