import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Tag } from '../models/types';

const COLLECTION = 'tags';

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
  }
};