import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, updateDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Tag } from '../models/types';

const COLLECTION = 'tags';
const PRODUCT_TAGS_COLLECTION = 'productTags'; // Collection for product-tag relationships

export const tagService = {
  async getAllTags(): Promise<Tag[]> {
    const q = query(collection(db, COLLECTION), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tag));
  },

  async createTag(tag: Omit<Tag, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION), tag);
    return docRef.id;
  },

  async deleteTag(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  // Actualizar una etiqueta
  async updateTag(id: string, updatedData: Partial<Tag>): Promise<Tag> {
    try {
      await updateDoc(doc(db, COLLECTION, id), updatedData);
      return { id, ...updatedData } as Tag;
    } catch (error) {
      console.error("Error al actualizar etiqueta: ", error);
      throw error;
    }
  },

  // Get tags for a specific product
  async getTagsForProduct(productId: string): Promise<Tag[]> {
    try {
      // Assuming you have a productTags collection that links products to tags
      // If you have a different structure, adjust this query accordingly
      const q = query(
        collection(db, PRODUCT_TAGS_COLLECTION), 
        where('productId', '==', productId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      // Get all tag IDs for this product
      const tagIds = querySnapshot.docs.map(doc => doc.data().tagId);
      
      // If no tags, return empty array
      if (tagIds.length === 0) {
        return [];
      }
      
      // Get all tags
      const allTags = await this.getAllTags();
      
      // Filter tags that belong to this product
      return allTags.filter(tag => tagIds.includes(tag.id));
    } catch (error) {
      console.error("Error getting tags for product:", error);
      return [];
    }
  }
};