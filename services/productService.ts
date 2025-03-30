import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  getDoc
} from 'firebase/firestore';
import { Product } from '../models/types';

const COLLECTION_NAME = 'products';

export const productService = {
  // Agregar un nuevo producto
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      // Calcular margen de ganancia si no se proporciona
      if (!product.profitMargin && product.costPrice && product.sellingPrice) {
        product.profitMargin = ((product.sellingPrice - product.costPrice) / product.costPrice) * 100;
      }
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), product);
      return { id: docRef.id, ...product };
    } catch (error) {
      console.error("Error al agregar producto: ", error);
      throw error;
    }
  },

  // Obtener todos los productos
  async getAllProducts(): Promise<Product[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
    } catch (error) {
      console.error("Error al obtener productos: ", error);
      throw error;
    }
  },

  // Obtener un producto por ID
  async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error al obtener producto: ", error);
      throw error;
    }
  },

  // Actualizar un producto
  async updateProduct(id: string, updatedData: Partial<Product>): Promise<Product> {
    try {
      // Calcular margen de ganancia si cambiaron los precios
      if ((updatedData.costPrice || updatedData.sellingPrice) && !updatedData.profitMargin) {
        const product = await this.getProductById(id);
        
        if (product) {
          const costPrice = updatedData.costPrice || product.costPrice;
          const sellingPrice = updatedData.sellingPrice || product.sellingPrice;
          
          updatedData.profitMargin = ((sellingPrice - costPrice) / costPrice) * 100;
        }
      }
      
      await updateDoc(doc(db, COLLECTION_NAME, id), updatedData);
      return { id, ...updatedData } as Product;
    } catch (error) {
      console.error("Error al actualizar producto: ", error);
      throw error;
    }
  },

  // Eliminar un producto
  async deleteProduct(id: string): Promise<string> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      return id;
    } catch (error) {
      console.error("Error al eliminar producto: ", error);
      throw error;
    }
  },

  // Buscar productos por nombre (para autocompletar)
  async searchProductsByName(query: string): Promise<Product[]> {
    try {
      // Esta es una búsqueda simple. Para una búsqueda más avanzada,
      // considera usar Firebase Extensions como Algolia o implementar
      // una solución de búsqueda más sofisticada.
      const products = await this.getAllProducts();
      return products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error("Error al buscar productos: ", error);
      throw error;
    }
  }
};