import { Product } from "./product.model";

export interface OrderModel {
  orderId: string;
  tableNumber: number;
  customerName: string;
  employee: {
    employeeId: string;
    username: string;
    email: string;
  };
  status: boolean;
  isPaid: boolean;
  note: string;
  orderDetailId: string;
  createdAt?: string;
  updatedAt?: string;
  orderDetails?: OrderDetailModel[];
}

export interface OrderDetailModel {
  orderDetailId: string;
  orderId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    subtotal: number;
    unitPrice: number;
    someoneId: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  
}