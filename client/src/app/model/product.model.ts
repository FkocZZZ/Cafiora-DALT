export interface Product {
  _id: string;
  nameProduct: string;
  price: number;
  status: boolean;
  urlImage: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface GetProductsResponse {
  dataProduct: Product[];
}
