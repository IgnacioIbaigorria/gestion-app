import { Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  name: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  profitMargin: number;
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