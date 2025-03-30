import { Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  profitMargin: number;
  tags?: string[];
  lowStockThreshold?: number; // New field
}

export interface Tag {
  id?: string;
  name: string;
  color?: string;
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
  date: Timestamp;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
}

export interface CashTransaction {
  id?: string;
  date: Timestamp;
  type: 'sale' | 'expense' | 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference?: string;
}