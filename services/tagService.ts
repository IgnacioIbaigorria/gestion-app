import { supabase } from './supabase';
import { Tag } from '../models/types';

const TABLE_NAME = 'tags';

export const tagService = {
  async addTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(tag)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return data as Tag;
    } catch (error) {
      console.error("Error al agregar etiqueta:", error);
      throw error;
    }
  },
  async createTag (tag: Tag): Promise<Tag> {
    return this.addTag(tag);
  },
  
  async getTagById(id: string): Promise<Tag | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as Tag;
    } catch (error) {
      console.error("Error al obtener etiqueta:", error);
      throw error;
    }
  },
  
  async getAllTags(): Promise<Tag[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data as Tag[];
    } catch (error) {
      console.error("Error al obtener etiquetas:", error);
      throw error;
    }
  },
  
  async updateTag(id: string, tag: Partial<Tag>): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(tag)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al actualizar etiqueta:", error);
      throw error;
    }
  },
  
  async deleteTag(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error al eliminar etiqueta:", error);
      throw error;
    }
  },
    // Añade esta nueva función
    async getTagsForProduct(productId: string): Promise<Tag[]> {
      try {
        // Primero obtenemos el producto para ver sus IDs de etiquetas
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('tags')
          .eq('id', productId)
          .single();
        
        if (productError) throw productError;
        
        // Si el producto no tiene etiquetas, devolvemos un array vacío
        if (!product.tags || product.tags.length === 0) {
          return [];
        }
        
        // Obtenemos las etiquetas que coinciden con los IDs
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .in('id', product.tags);
        
        if (error) throw error;
        
        return data as Tag[];
      } catch (error) {
        console.error("Error al obtener etiquetas del producto:", error);
        return [];
      }
    },
};