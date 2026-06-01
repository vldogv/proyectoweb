export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description: string;
  inStock: boolean;
  /** Unidades disponibles en almacén (0 = sin stock) */
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
