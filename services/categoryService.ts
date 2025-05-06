import { supabase } from './supabase';
import { Category } from '../models/types';

const TABLE_NAME = 'categories';

export const categoryService = {
  // Función existente para agregar categoría
  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(category)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return data as Category;
    } catch (error) {
      console.error("Error al agregar categoría:", error);
      throw error;
    }
  },
  
  // Añadir alias createCategory que apunta a addCategory para mantener consistencia
  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    return this.addCategory(category);
  },
  
  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as Category;
    } catch (error) {
      console.error("Error al obtener categoría:", error);
      throw error;
    }
  },
  
  async getAllCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data as Category[];
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      throw error;
    }
  },
  
  async updateCategory(id: string, category: Partial<Category>): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(category)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al actualizar categoría:", error);
      throw error;
    }
  },
  
  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      throw error;
    }
  }
};