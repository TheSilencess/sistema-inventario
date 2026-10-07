export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  active: boolean;
  createdAt: string;
};
export type Category = {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};
export type Variant = {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  stock: number;
  minimumStock: number;
  status: "ACTIVE" | "INACTIVE";
  product?: Product;
};
export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  category: Category;
  purchasePrice: string;
  salePrice: string;
  status: "ACTIVE" | "INACTIVE";
  hasVariants: boolean;
  variants: Variant[];
};
export type Movement = {
  id: string;
  variant: Variant & { product: Product };
  user: { id: string; name: string };
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  notes: string;
  createdAt: string;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
export type Dashboard = {
  summary: {
    products: number;
    units: number;
    low: number;
    out: number;
    value: string;
    entriesToday: number;
    exitsToday: number;
  };
  chart: { day: string; entry: number; exit: number }[];
  categories: { name: string; units: number }[];
  recent: Movement[];
  lowStock: Variant[];
};
