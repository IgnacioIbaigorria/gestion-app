import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Category } from '../models/types';

const COLLECTION_NAME = 'categories';

export const categoryService = {
  async createCategory(category: Partial<Category>): Promise<void> {
    await addDoc(collection(db, COLLECTION_NAME), category);
  },

  async getAllCategories(): Promise<Category[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Category));
  },

  async deleteCategory(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  // Actualizar una categoría
  async updateCategory(id: string, updatedData: Partial<Category>): Promise<Category> {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), updatedData);
      return { id, ...updatedData } as Category;
    } catch (error) {
      console.error("Error al actualizar categoría: ", error);
      throw error;
    }
  },
};