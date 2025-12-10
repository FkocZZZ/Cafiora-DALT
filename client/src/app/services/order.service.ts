import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, forkJoin, map, Observable, of, switchMap, timeout } from "rxjs";
import { OrderDetailModel, OrderModel, OrderItemModel } from "../model/order.model";

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  // TODO: Move this to environment.ts for production readiness
  private baseUrl = 'http://localhost:8000/api/barista';
  private http = inject(HttpClient);

  getAllOrders(): Observable<OrderModel[]> {
    return this.http.get<{ data: any }>(`${this.baseUrl}/getAllOrders`).pipe(
      map(res =>
        res.data.map((order: any): OrderModel => ({
          orderId: order.order_id,
          tableNumber: order.table_number,
          customerName: order.customer_name || 'Customer Name',
          employee: {
            employeeId: order.employee?._id, // Added safe navigation ?.
            username: order.employee?.username,
            email: order.employee?.email,
          },
          status: order.status,
          isPaid: order.isPayment,
          note: order.note || 'No',
          orderDetailId: order.orderDetail_id,
          createdAt: order.createdAt,
        }))
      )
    );
  }

  getOrderDetail(orderDetailId: string): Observable<OrderDetailModel[]> {
    return this.http.get<{ data: any }>(`${this.baseUrl}/getOrderDetail/${orderDetailId}`).pipe(
      timeout(10000),
      map(res => {
        if (!res.data) return [];
        
        const orderDetail = res.data;
        return [{
          orderDetailId: orderDetail._id,
          orderId: orderDetail.order_id,
          items: orderDetail.items.map((item: any) => {
            // Xác định productId string ổn định
            const originalProductId = typeof item.product_id === 'object' && item.product_id !== null
              ? item.product_id._id
              : item.product_id;
              
            return {
              productId: item.product_id, 
              productName: item.product_id?.nameProduct ?? 'Unknown',
              quantity: item.quantity,
              subtotal: item.subtotal,
              unitPrice: item.unit_price,
              someoneId: item._id,
              originalProductId: originalProductId, // Luôn là string
              isFromMerge: false
            };
          }),
          createdAt: orderDetail.createdAt,
          updatedAt: orderDetail.updatedAt,
        }];
      }),
      catchError((err) => {
        return of([]);
      })
    );
  }

  getOrdersWithDetails(onlyUnpaid: boolean = true, onlyIncomplete: boolean = false): Observable<OrderModel[]> {
    return this.getAllOrders().pipe(
      switchMap(orders => {
        // 1. Filter based on role requirement
        let targetOrders = onlyUnpaid 
          ? orders.filter(o => !o.isPaid) 
          : orders;

        // 2. CHỈ LẤY ORDERS CHƯA HOÀN TẤT (dành cho Barista)
        if (onlyIncomplete) {
          targetOrders = targetOrders.filter(o => !o.status);
        }

        if (!targetOrders.length) return of([]);

        // 3. Map orders to API requests (Note: This causes N+1 requests)
        const requests = targetOrders.map(order =>
          this.getOrderDetail(order.orderDetailId)
        );

        // 4. Execute all requests and merge results
        return forkJoin(requests).pipe(
          map(details =>
            targetOrders.map((order, index) => ({
              ...order,
              orderDetails: details[index]
            }))
          ),
          // 5. Merge by Table Number
          map(ordersWithDetails => this.mergeOrdersByTable(ordersWithDetails))
        );
      })
    );
  }
  getAllOrdersWithDetails(): Observable<OrderModel[]> {
    return this.getOrdersWithDetails(true, true); // onlyUnpaid = true, onlyIncomplete = true
  }
  getAllOrdersWithDetailsForCashier(): Observable<OrderModel[]> {
    return this.getOrdersWithDetails(false, false); // onlyUnpaid = false, onlyIncomplete = false
  }

  private mergeOrdersByTable(orders: OrderModel[]): OrderModel[] {
    const tableMap = new Map<number, OrderModel>();

    for (const order of orders) {
      const existing = tableMap.get(order.tableNumber);

      if (!existing) {
        const newOrder = {
          ...order,
          allOrderIds: [order.orderId]
        };
        tableMap.set(order.tableNumber, newOrder);
      } else {
        // MERGE LOGIC - CHỈ MERGE CÁC ORDER CHƯA HOÀN TẤT
        const allOrderIds = [...(existing.allOrderIds || [existing.orderId]), order.orderId];
        
        // Danh sách tất cả items từ cả existing và order mới (TẤT CẢ ĐỀU CHƯA HOÀN TẤT)
        const allItems: any[] = [];
        
        // 1. Thêm tất cả items từ existing order
        if (existing.orderDetails?.[0]?.items) {
          for (const item of existing.orderDetails[0].items) {
            allItems.push({
              ...item,
              isFromMerge: item.isFromMerge || false
            });
          }
        }
        
        // 2. Thêm tất cả items từ order mới
        if (order.orderDetails?.[0]?.items) {
          for (const item of order.orderDetails[0].items) {
            allItems.push({
              ...item,
              isFromMerge: true // Đánh dấu đây là item từ order được merge
            });
          }
        }

        const mergedOrder: OrderModel = {
          ...existing,
          allOrderIds: allOrderIds,
          orderDetails: [{
            ...existing.orderDetails![0],
            items: allItems
          }]
        };

        tableMap.set(order.tableNumber, mergedOrder);
      }
    }

    const result = Array.from(tableMap.values());
    return result;
  }

  getOrdersWithDetailsByDateRange(start: Date, end: Date): Observable<OrderModel[]> {
    const startMs = new Date(start).setHours(0, 0, 0, 0);
    const endMs = new Date(end).setHours(23, 59, 59, 999);

    // Reuse the generic method (assuming we want all orders, paid or unpaid?)
    // Usually reports need ALL orders, so we use false (Cashier mode)
    return this.getOrdersWithDetails(false).pipe(
      map(orders =>
        orders.filter(o => {
          const time = o.createdAt ? new Date(o.createdAt).getTime() : 0;
          return time >= startMs && time <= endMs;
        })
      )
    );
  }

  updateOrderStatus(orderId: string, body: any) {
    return this.http.put(`${this.baseUrl}/updateOrderStatus/${orderId}`, body);
  }

  // Cashier payment update endpoint
  updatePaymentStatus(orderId: string, body: any) {
    return this.http.put(`http://localhost:8000/api/cashier/payment/${orderId}`, body);
  }
}