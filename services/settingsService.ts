import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'appSettings';
const SETTINGS_DOC_ID = 'generalSettings';

export interface AppSettings {
  businessName: string;
}

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    try {
      const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
      } else {
        // If settings don't exist yet, create default settings
        const defaultSettings: AppSettings = {
          businessName: 'Punto Eco'
        };
        
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error("Error getting settings:", error);
      // Return default settings if there's an error
      return { businessName: 'Punto Eco' };
    }
  },
  
  async updateSettings(updatedSettings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const docRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
      await updateDoc(docRef, updatedSettings);
      
      const updatedDoc = await getDoc(docRef);
      return updatedDoc.data() as AppSettings;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  }
};