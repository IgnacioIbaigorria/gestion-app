const colors = {
  primary: '#4CAF50',       // Verde medio
  secondary: '#66BB6A',     // Verde más claro
  primaryLight: '#81C784',  // Verde claro
  primaryDark: '#388E3C',   // Verde oscuro
  accent: '#8BC34A',        // Verde lima claro
  background: '#F1F8E9',    // Fondo verde muy claro
  surface: '#FFFFFF',       // Superficie blanca
  text: '#212121',          // Texto oscuro
  textLight: '#757575',     // Texto claro
  error: '#D32F2F',         // Rojo error
  success: '#388E3C',       // Verde éxito
  warning: '#FF9800',       // Ámbar advertencia
  warningLight: '#FFF3E0',
  info: '#1976D2',          // Azul información
  successLight: '#C8E6C9',  // Verde claro para éxito
  border: '#E0E0E0',         // Borde gris claro
};
// Definición de temas claro y oscuro
const lightTheme = {
  primary: '#4CAF50',       // Verde medio
  secondary: '#66BB6A',     // Verde más claro
  primaryLight: '#81C784',  // Verde claro
  primaryDark: '#388E3C',   // Verde oscuro
  accent: '#8BC34A',        // Verde lima claro
  background: '#F1F8E9',    // Fondo verde muy claro
  surface: '#FFFFFF',       // Superficie blanca
  text: '#212121',          // Texto oscuro
  textLight: '#757575',     // Texto claro
  error: '#D32F2F',         // Rojo error
  success: '#388E3C',       // Verde éxito
  warning: '#FF9800',       // Ámbar advertencia
  warningLight: '#FFF3E0',
  info: '#1976D2',          // Azul información
  successLight: '#C8E6C9',  // Verde claro para éxito
  border: '#E0E0E0',        // Borde gris claro
};

const darkTheme = {
  primary: '#66BB6A',       // Verde más claro para contraste
  secondary: '#4CAF50',     // Verde medio
  primaryLight: '#388E3C',  // Verde oscuro (invertido para tema oscuro)
  primaryDark: '#81C784',   // Verde claro (invertido para tema oscuro)
  accent: '#8BC34A',        // Verde lima claro
  background: '#121212',    // Fondo oscuro estándar
  surface: '#1E1E1E',       // Superficie oscura
  text: '#FFFFFF',          // Texto blanco
  textLight: '#B0B0B0',     // Texto gris claro
  error: '#EF5350',         // Rojo error más claro
  success: '#66BB6A',       // Verde éxito más claro
  warning: '#FFA726',       // Ámbar advertencia más claro
  warningLight: '#3E2723',  // Versión oscura del warningLight
  info: '#42A5F5',          // Azul información más claro
  successLight: '#1B5E20',  // Verde oscuro para éxito
  border: '#333333',        // Borde gris oscuro
};

// Exportamos ambos temas y un tema por defecto (el claro)
export { colors, lightTheme, darkTheme };
export default lightTheme;
