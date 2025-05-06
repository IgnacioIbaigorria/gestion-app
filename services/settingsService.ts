import { supabase } from './supabase';

const TABLE_NAME = 'settings';

// Default settings
const DEFAULT_SETTINGS = {
  businessName: 'Punto Eco',
  language: 'es',
  theme: 'light',
};

export const settingsService = {
  async getSettings() {
    try {
      // Try to get settings from the database
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .single();
      
      if (error) {
        console.log('No settings found, creating default settings');
        // If no settings exist, create default settings
        await this.createDefaultSettings();
        return DEFAULT_SETTINGS;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  },
  
  async createDefaultSettings() {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .insert(DEFAULT_SETTINGS);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  },
  
  async updateSettings(settings: { businessName: string; }) {
    try {
      // Get all settings
      const { data, error: getError } = await supabase
        .from(TABLE_NAME)
        .select('*');
      
      if (getError) throw getError;
      
      if (data && data.length > 0) {
        // Update the first settings record
        const { error } = await supabase
          .from(TABLE_NAME)
          .update(settings)
          .eq('id', data[0].id);
        
        if (error) throw error;
      } else {
        // Create settings if they don't exist
        await this.createDefaultSettings();
        // Then update with the new values
        const { data: newData } = await supabase
          .from(TABLE_NAME)
          .select('*');
        
        if (newData && newData.length > 0) {
          await supabase
            .from(TABLE_NAME)
            .update(settings)
            .eq('id', newData[0].id);
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
};