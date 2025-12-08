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
  allOrderIds?: string[]; // Danh sách tất cả orderIds của bàn (khi merge nhiều orders)
}

export interface OrderDetailModel {
  orderDetailId: string;
  orderId: string;
  items: OrderItemModel[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItemModel {
  productId: string | Product; // Có thể là string hoặc populated object
  productName: string;
  quantity: number;
  subtotal: number;
  unitPrice: number;
  someoneId: string; // Unique ID cho item này (từ server)
  
  // Thêm các field để tracking
  originalProductId?: string; // ID gốc của product (luôn là string)
  isFromMerge?: boolean; // Đánh dấu item được merge từ nhiều orders
}