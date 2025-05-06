
// Reemplazamos Timestamp de Firebase con Date para Supabase
export interface Product {
  id?: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  profit_margin: number;
  low_stock_threshold?: number;
  category_id?: string | null;
  tags?: string[]; // This is defined as string[] (array of tag IDs)
}

export interface Tag {
  id?: string;
  name: string;
  color?: string;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  user_id?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id?: string;
  date: Date;
  items: SaleItem[];
  total_amount: number;
  payment_method: string;
  notes?: string;
}

export interface CashTransaction {
  id?: string;
  date: Date;
  type: 'sale' | 'expense' | 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference?: string;
}

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'converted';

export interface QuoteItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Quote {
  id?: string;
  customer_name: string;
  items: QuoteItem[];
  total: number;
  date: Date;
  status: QuoteStatus;
  notes?: string;
  valid_until?: Date;
}