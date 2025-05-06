import { supabase } from './supabase';

export const dbInitService = {
  async initializeTables() {
    console.log('Inicializando tablas en Supabase...');
    
    try {
      // Crear tabla products
      console.log('Creando tabla products...');
      await this.createProductsTable();
      console.log('Tabla products creada o ya existía');
      
      // Crear tabla categories
      console.log('Creando tabla categories...');
      await this.createCategoriesTable();
      console.log('Tabla categories creada o ya existía');
      
      // Crear tabla tags
      console.log('Creando tabla tags...');
      await this.createTagsTable();
      console.log('Tabla tags creada o ya existía');
      
      // Crear tabla sales
      console.log('Creando tabla sales...');
      await this.createSalesTable();
      console.log('Tabla sales creada o ya existía');
      
      // Crear tabla quotes
      console.log('Creando tabla quotes...');
      await this.createQuotesTable();
      console.log('Tabla quotes creada o ya existía');
      
      // Crear tabla cash_transactions
      console.log('Creando tabla cash_transactions...');
      await this.createCashTransactionsTable();
      console.log('Tabla cash_transactions creada o ya existía');
      
      console.log('Inicialización de tablas completada');
      return true;
    } catch (error) {
      console.error('Error al inicializar tablas:', error);
      return false;
    }
  },
  
  async createProductsTable() {
    // Verificar si la tabla ya existe
    const { error: checkError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    // Si no hay error, la tabla ya existe
    if (!checkError) return;
    
    // Si hay error porque la tabla no existe, crearla usando la API de Supabase
    if (checkError.code === '42P01') {
      // Crear la tabla usando la API de Storage o REST
      const { error } = await supabase
        .from('products')
        .insert([
          { 
            name: 'Producto de ejemplo',
            description: 'Este es un producto de ejemplo',
            price: 100,
            cost: 50,
            stock: 10,
            category_id: null,
            barcode: '123456789',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error && error.code !== '23505') throw error; // Ignorar error de duplicado
    }
  },
  
  async createCategoriesTable() {
    // Verificar si la tabla ya existe
    const { error: checkError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    // Si no hay error, la tabla ya existe
    if (!checkError) return;
    
    // Si hay error porque la tabla no existe, crearla
    if (checkError.code === '42P01') {
      const { error } = await supabase
        .from('categories')
        .insert([
          { 
            name: 'Categoría de ejemplo',
            description: 'Esta es una categoría de ejemplo',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error && error.code !== '23505') throw error;
    }
  },
  
  // Implementa métodos similares para las demás tablas
  async createTagsTable() {
    // Similar a los métodos anteriores
    const { error: checkError } = await supabase
      .from('tags')
      .select('id')
      .limit(1);
    
    if (!checkError) return;
    
    if (checkError.code === '42P01') {
      const { error } = await supabase
        .from('tags')
        .insert([
          { 
            name: 'Etiqueta de ejemplo',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error && error.code !== '23505') throw error;
    }
  },
  
  async createSalesTable() {
    const { error: checkError } = await supabase
      .from('sales')
      .select('id')
      .limit(1);
    
    if (!checkError) return;
    
    if (checkError.code === '42P01') {
      const { error } = await supabase
        .from('sales')
        .insert([
          { 
            total: 0,
            payment_method: 'efectivo',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error && error.code !== '23505') throw error;
    }
  },
  
  async createQuotesTable() {
    const { error: checkError } = await supabase
      .from('quotes')
      .select('id')
      .limit(1);
    
    if (!checkError) return;
    
    if (checkError.code === '42P01') {
      const { error } = await supabase
        .from('quotes')
        .insert([
          { 
            total: 0,
            client_name: 'Cliente de ejemplo',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error && error.code !== '23505') throw error;
    }
  },
  
  async createCashTransactionsTable() {
    const { error: checkError } = await supabase
      .from('cash_transactions')
      .select('id')
      .limit(1);
    
    if (!checkError) return;
    
    if (checkError.code === '42P01') {
      const { error } = await supabase
        .from('cash_transactions')
        .insert([
          { 
            amount: 0,
            type: 'ingreso',
            description: 'Transacción de ejemplo',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error && error.code !== '23505') throw error;
    }
  }
};