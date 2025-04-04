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
import { Product, Tag } from '../models/types';
import { tagService } from './tagService';

const COLLECTION_NAME = 'products';

// Create a cache for products with their tags
const productCache: Record<string, Product & { tagObjects?: Tag[] }> = {};

export const productService = {
  // Agregar un nuevo producto
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      // Calcular margen de ganancia si no se proporciona
      if (!product.profitMargin && product.costPrice && product.sellingPrice) {
        product.profitMargin = ((product.sellingPrice - product.costPrice) / product.costPrice) * 100;
      }
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), product);
      
      // Clear the cache to ensure fresh data on next fetch
      Object.keys(productCache).forEach(key => delete productCache[key]);
      
      return { id: docRef.id, ...product };
    } catch (error) {
      console.error("Error al agregar producto: ", error);
      throw error;
    }
  },

  // Obtener todos los productos
  async getAllProducts(): Promise<Product[]> {
    try {
      // Clear the cache when fetching all products to ensure fresh data
      Object.keys(productCache).forEach(key => delete productCache[key]);
      
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const products = querySnapshot.docs.map(doc => {
        const product = { id: doc.id, ...doc.data() } as Product;
        // Add to cache
        productCache[doc.id] = product;
        return product;
      });
      
      return products;
    } catch (error) {
      console.error("Error al obtener productos: ", error);
      throw error;
    }
  },

  // Obtener un producto por su ID
  async getProductById(id: string, forceRefresh: boolean = false): Promise<Product | null> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && productCache[id]) {
        return productCache[id];
      }
      
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const productData = { id: docSnap.id, ...docSnap.data() } as Product;
        // Update cache
        productCache[id] = productData;
        return productData;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error al obtener producto por ID: ", error);
      throw error;
    }
  },

  // Add a method to clear the cache for a specific product
  clearProductCache(id: string): void {
    if (productCache[id]) {
      delete productCache[id];
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
      
      // Update cache if product exists in cache
      if (productCache[id]) {
        productCache[id] = { ...productCache[id], ...updatedData };
      }
      
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
      
      // Remove from cache
      if (productCache[id]) {
        delete productCache[id];
      }
      
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
  },

  // Update the cache with product data
  updateProductInCache(productId: string, productData: Product & { tagObjects?: Tag[] }): void {
    productCache[productId] = productData;
    // Make sure to return the updated product with its ID
    if (!productData.id) {
      productCache[productId].id = productId;
    }
  },

  // Get product from cache or fetch it with tags
  async getProductWithDetails(productId: string): Promise<Product & { tagObjects?: Tag[] }> {
    // If product is in cache with tag objects, return it
    if (productCache[productId] && productCache[productId].tagObjects) {
      return productCache[productId];
    }
    
    // Otherwise fetch the product and its tags
    const product = await this.getProductById(productId);
    if (product && product.id) {
      const tagObjects = await tagService.getTagsForProduct(product.id);
      const productWithTags = { ...product, tagObjects };
      this.updateProductInCache(product.id, productWithTags);
      return productWithTags;
    }
    
    return product as Product;
  }
};
