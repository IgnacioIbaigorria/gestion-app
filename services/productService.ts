import { supabase } from './supabase';
import { Product, Category, Tag } from '../models/types';

const TABLE_NAME = 'products';

// Local cache for products
let productsCache: Record<string, Product> = {};
let categoriesCache: Category[] | null = null;
let tagsCache: Tag[] | null = null;
let totalCount = 0;


// Añade estas funciones de mapeo
function mapProductToDb(product: Omit<Product, 'id'>) {
  return {
    name: product.name,
    description: product.description,
    cost_price: product.cost_price,
    selling_price: product.selling_price,
    unit_price: product.unit_price,
    units: product.units,
    quantity: product.quantity,
    profit_margin: product.profit_margin,
    low_stock_threshold: product.low_stock_threshold,
    category_id: product.category_id,
    tags: Array.isArray(product.tags) ? product.tags : [], // Ensure tags is always an array
    cantidad_por_caja: product.cantidad_por_caja,
  };
}

function mapDbToProduct(dbProduct: any): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description,
    cost_price: dbProduct.cost_price,
    unit_price: dbProduct.unit_price,
    units: dbProduct.units,
    selling_price: dbProduct.selling_price,
    quantity: dbProduct.quantity,
    profit_margin: dbProduct.profit_margin,
    low_stock_threshold: dbProduct.low_stock_threshold,
    category_id: dbProduct.category_id,
    tags: Array.isArray(dbProduct.tags) ? dbProduct.tags : [],
    cantidad_por_caja: dbProduct.cantidad_por_caja,
  };
}

export const productService = {
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    try {
      const dbProduct = mapProductToDb(product);
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(dbProduct)
        .select('*')
        .single();

      if (error) throw error;

      return mapDbToProduct(data);
    } catch (error) {
      console.error("Error al agregar producto:", error);
      throw error;
    }
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as Product;
    } catch (error) {
      console.error("Error al obtener producto:", error);
      throw error;
    }
  },

  // services/productService.ts
  async getProducts(
    page: number,
    limit: number,
    categoryId?: string | null,
    search?: string
  ): Promise<Product[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('is_deleted', false)
      .range((page - 1) * limit, page * limit - 1);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search && search.trim().length > 0) {
      const searchTerm = search.trim().toLowerCase();
      // Buscar productos donde alguna palabra del nombre empiece con el término de búsqueda
      // Usando una expresión regular que busca el término al inicio de cualquier palabra
      query = query.or(`name.ilike.${searchTerm}%,name.ilike.% ${searchTerm}%`);
    }

    // Ordenar alfabéticamente por nombre
    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getProductsByName(name: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .ilike('name', `%${name}%`);

      if (error) throw error;

      return data as Product[];
    } catch (error) {
      console.error("Error al obtener productos por nombre:", error);
      throw error;
    }
  },

  async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;

      return data as Product[];
    } catch (error) {
      console.error("Error al obtener productos:", error);
      throw error;
    }
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      // Destructure tagObjects to exclude it from the payload sent to Supabase
      const { tagObjects, ...cleanPayload } = product as any;

      const { error } = await supabase
        .from(TABLE_NAME)
        .update(cleanPayload) // Use cleanPayload here
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      throw error;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      throw error;
    }
  },

  async getLowStockProducts(
    page: number,
    limit: number,
    categoryId?: string | null,
    search?: string | null
  ): Promise<Product[]> {
    const offset = (page - 1) * limit;

    try {
      // Llamada RPC a la función SQL
      const { data, error } = await supabase.rpc('get_low_stock_products', {
        p_limit: limit,
        p_page: page,
        p_category_id: categoryId ?? null,
        p_search: (search && search.trim().length > 0) ? search.trim() : null
      });

      if (error) throw error;

      // data debería ser un array de productos (o null)
      return (data ?? []) as Product[];
    } catch (err) {
      console.error('getLowStockProducts rpc error', err);
      throw err;
    }
  },

  // Update this function to properly handle tag arrays
  updateProductInCache(productOrId: Product | string, productData?: Partial<Product>): void {
    if (typeof productOrId === 'string') {
      // Case when called with ID and product data
      if (productData && productOrId) {
        const id = productOrId;

        // Handle tags specifically to ensure they're always arrays
        if (productData.tags) {
          productData.tags = Array.isArray(productData.tags) ? productData.tags : [productData.tags];
        }

        // If the product already exists in cache, merge with existing data
        if (productsCache[id]) {
          // Special handling for tags to avoid duplicates
          if (productData.tags && productsCache[id].tags) {
            // Create a new array with unique tag IDs
            const existingTags = Array.isArray(productsCache[id].tags) ? productsCache[id].tags : [];
            const newTags = Array.isArray(productData.tags) ? productData.tags : [];
            const combinedTags = [...new Set([...existingTags, ...newTags])];

            // Update the product data with the combined tags
            productData.tags = combinedTags;
          }

          productsCache[id] = { ...productsCache[id], ...productData };
        } else {
          // Otherwise create a new entry with the ID
          productsCache[id] = { id, ...productData } as Product;
        }
      }
    } else {
      // Case when called with just a product object
      const product = productOrId;
      if (product.id) {
        // Ensure tags is always an array
        if (product.tags) {
          product.tags = Array.isArray(product.tags) ? product.tags : [product.tags];
        } else {
          product.tags = [];
        }

        productsCache[product.id] = product;
      }
    }
  },

  // Add this function to get product with details
  async getProductWithDetails(id: string): Promise<Product & { tagObjects?: any[] }> {
    try {
      // Check cache first
      if (productsCache[id]) {
        return productsCache[id] as Product & { tagObjects?: any[] };
      }

      // If not in cache, get from database
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const product = mapDbToProduct(data);

      // Cache the product
      if (product.id) {
        productsCache[product.id] = product;
      }

      return product as Product & { tagObjects?: any[] };
    } catch (error) {
      console.error("Error al obtener producto con detalles:", error);
      throw error;
    }
  },
  // Fix the clearProductCache function to be synchronous
  clearProductCache(id?: string): void {
    if (id) {
      // Clear specific product from cache
      if (productsCache[id]) {
        delete productsCache[id];
      }
    } else {
      // Clear entire cache
      productsCache = {};
    }
  },
  async updateProductsByCategory(categoryId: string, updates: {
    costPricePercentage?: number;
    sellingPricePercentage?: number;
    profitMarginPercentage?: number;
  }): Promise<number> {
    try {
      // Get all products for this category
      const allProducts = await this.getAllProducts();
      const categoryProducts = allProducts.filter(product => product.category_id === categoryId);

      if (categoryProducts.length === 0) {
        return 0;
      }

      // Process each product
      const updatePromises = categoryProducts.map(async (product) => {
        const updatedProduct: Partial<Product> = {};

        // Calculate new cost price if requested
        if (updates.costPricePercentage && product.cost_price) {
          const percentageMultiplier = 1 + (updates.costPricePercentage / 100);
          updatedProduct.cost_price = Math.round((product.cost_price * percentageMultiplier) * 100) / 100;
        }

        // Calculate new profit margin if explicitly requested
        if (updates.profitMarginPercentage && product.profit_margin) {
          const newProfitMargin = product.profit_margin + updates.profitMarginPercentage;
          updatedProduct.profit_margin = Math.round(newProfitMargin * 100) / 100;
        }

        // Calculate new selling price if requested directly
        if (updates.sellingPricePercentage && product.selling_price) {
          const percentageMultiplier = 1 + (updates.sellingPricePercentage / 100);
          updatedProduct.selling_price = Math.round((product.selling_price * percentageMultiplier) * 100) / 100;
        }
        // If profit margin was updated and we have cost price, recalculate selling price
        else if (updatedProduct.profit_margin !== undefined && (product.cost_price || updatedProduct.cost_price)) {
          const costPrice = updatedProduct.cost_price || product.cost_price || 0;
          updatedProduct.selling_price = Math.round((costPrice * (1 + (updatedProduct.profit_margin / 100))) * 100) / 100;
        }

        // If selling price was not explicitly updated but cost price was, and we have a profit margin,
        // recalculate selling price based on new cost and existing profit margin
        if (!updates.sellingPricePercentage && updatedProduct.cost_price && !updatedProduct.profit_margin && product.profit_margin) {
          updatedProduct.selling_price = Math.round((updatedProduct.cost_price * (1 + (product.profit_margin / 100))) * 100) / 100;
        }

        // Always recalculate profit margin if selling price was updated (either directly or indirectly)
        // and we didn't explicitly update the profit margin
        if (updatedProduct.profit_margin === undefined &&
          (updatedProduct.selling_price || updatedProduct.cost_price)) {
          const newCostPrice = updatedProduct.cost_price || product.cost_price || 0;
          const newSellingPrice = updatedProduct.selling_price || product.selling_price || 0;

          if (newCostPrice > 0) {
            updatedProduct.profit_margin = Math.round(((newSellingPrice - newCostPrice) / newCostPrice * 100) * 100) / 100;
          }
        }

        // Update the product using Supabase
        if (product.id && (updatedProduct.cost_price || updatedProduct.selling_price || updatedProduct.profit_margin)) {
          const { error } = await supabase
            .from('products')
            .update(updatedProduct)
            .eq('id', product.id);

          if (error) throw error;
        }
      });

      await Promise.all(updatePromises);
      return categoryProducts.length;
    } catch (error) {
      console.error("Error updating products by category:", error);
      throw error;
    }
  },

  async updateProductsByIds(
    productIds: string[],
    updates: {
      costPricePercentage?: number;
      sellingPricePercentage?: number;
      profitMarginPercentage?: number;
    }
  ): Promise<number> {
    try {
      const allProducts = await this.getAllProducts();
      const selectedProducts = allProducts.filter(product => productIds.includes(product.id!));
      if (selectedProducts.length === 0) return 0;

      const updatePromises = selectedProducts.map(async (product) => {
        const updatedProduct: Partial<Product> = {};
        if (updates.costPricePercentage && product.cost_price) {
          const percentageMultiplier = 1 + (updates.costPricePercentage / 100);
          updatedProduct.cost_price = Math.round((product.cost_price * percentageMultiplier) * 100) / 100;
        }
        if (updates.profitMarginPercentage && product.profit_margin) {
          const newProfitMargin = product.profit_margin + updates.profitMarginPercentage;
          updatedProduct.profit_margin = Math.round(newProfitMargin * 100) / 100;
        }
        if (updates.sellingPricePercentage && product.selling_price) {
          const percentageMultiplier = 1 + (updates.sellingPricePercentage / 100);
          updatedProduct.selling_price = Math.round((product.selling_price * percentageMultiplier) * 100) / 100;
        }
        await this.updateProduct(product.id!, updatedProduct);
      });

      await Promise.all(updatePromises);
      return selectedProducts.length;
    } catch (error) {
      console.error("Error updating selected products:", error);
      throw error;
    }
  },
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    // Si tienes un caché local, úsalo primero
    if (Array.isArray(ids) && ids.length === 0) return [];
    const allProducts = await this.getAllProducts();
    return allProducts.filter(product => product.id && ids.includes(product.id));
  }
};
