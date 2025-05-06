import { dbInitService } from './dbInitService';

export const initializeApp = async () => {
  try {
    console.log('Inicializando la aplicación...');
    
    // Inicializar tablas en Supabase
    await dbInitService.initializeTables();
    
    console.log('Aplicación inicializada correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    return false;
  }
};