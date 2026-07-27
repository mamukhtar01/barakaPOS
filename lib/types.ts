export type Role = "admin" | "cashier";
// SSHL = Somaliland Shilling (legacy records may still contain "SOS")
export type Currency = "USD" | "SSHL";
export type PaymentMethod = "cash" | "mobile" | "card";
export type ProductStatus = "active" | "inactive";
export type SalePaymentStatus = "paid" | "unpaid";

export interface User {
  id: number;
  username: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number | null;
  category_name?: string;
  img?: string | null;
  image_url: string | null;
  thumbnail_url?: string | null;
  sale_price_usd: number;
  cost_price_usd: number;
  status: ProductStatus;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Sale {
  id: number;
  customer_id: number | null;
  customer_name?: string | null;
  cashier_id: number;
  cashier_name?: string;
  currency: Currency | "SOS";
  exchange_rate: number;
  payment_method: PaymentMethod;
  payment_status: SalePaymentStatus;
  total_usd: number;
  total_sos: number;
  discount: number;
  notes: string | null;
  remarks: string | null;
  is_done: boolean;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price_usd: number;
  unit_price_sos: number;
  subtotal_usd: number;
  subtotal_sos: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface CartItem {
  product_id: number;
  product_name: string;
  unit_price_usd: number;
  quantity: number;
  image_url: string | null;
}

export interface DailySalesReport {
  date: string;
  total_usd: number;
  total_sos: number;
  transaction_count: number;
}

export interface PaymentMethodReport {
  payment_method: PaymentMethod;
  total_usd: number;
  total_sos: number;
  transaction_count: number;
}

export interface ProductSalesReport {
  product_name: string;
  quantity_sold: number;
  revenue_usd: number;
  cost_usd: number;
  profit_usd: number;
}

export interface CustomerCreditGroup {
  customer_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  order_count: number;
  total_usd: number;
  total_sos: number;
  oldest_created_at: string;
}
