import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/Colors';

// Clave para almacenar el tema en AsyncStorage
const THEME_STORAGE_KEY = 'punto-eco-theme';

// Tipo para el tema
type ThemeType = 'light' | 'dark';

// Interfaz para el contexto
interface ThemeContextType {
  theme: typeof lightTheme;
  themeType: ThemeType;
  toggleTheme: () => void;
  isDarkTheme: boolean;
}

// Crear el contexto
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Proveedor del contexto
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>('light');
  
  // Cargar el tema guardado al iniciar
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeType(savedTheme);
        }
      } catch (error) {
        console.error('Error al cargar el tema:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Guardar el tema cuando cambie
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, themeType);
      } catch (error) {
        console.error('Error al guardar el tema:', error);
      }
    };
    
    saveTheme();
  }, [themeType]);
  
  // Función para alternar entre temas
  const toggleTheme = () => {
    setThemeType(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  // Determinar el tema actual
  const theme = themeType === 'light' ? lightTheme : darkTheme;
  const isDarkTheme = themeType === 'dark';
  
  return (
    <ThemeContext.Provider value={{ theme, themeType, toggleTheme, isDarkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar el tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};