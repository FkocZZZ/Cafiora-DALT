import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, forkJoin, map, Observable, of, switchMap } from "rxjs";
import { OrderDetailModel, OrderModel } from "../model/order.model";

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = 'http://localhost:8000/api/barista';
  private http = inject(HttpClient);

  getAllOrders(): Observable<any[]> {
    return this.http.get<{ data: any }>(`${this.baseUrl}/getAllOrders`)
      .pipe(
        map(res =>
          res.data.map((order: any): OrderModel => ({
            orderId: order.order_id,
            tableNumber: order.table_number,
            customerName: order.customer_name || 'Customer Name',
            employee: {
              employeeId: order.employee._id,
              username: order.employee.username,
              email: order.employee.email,
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
    return this.http
      .get<{ data: any }>(`${this.baseUrl}/getOrderDetail/${orderDetailId}`)
      .pipe(
        map(res => {
          if (res.data) {
            const orderDetail = res.data;

            return [{
              orderDetailId: orderDetail._id,
              orderId: orderDetail.order_id,
              items: orderDetail.items.map((item: any) => ({
                productId: item.product_id,
                productName: item.product_id.nameProduct ?? 'Unknown',
                quantity: item.quantity,
                subtotal: item.subtotal,
                unitPrice: item.unit_price,
                someoneId: item._id,
                header: []
              })),
              createdAt: orderDetail.createdAt,
              updatedAt: orderDetail.updatedAt,
            }];
          } else {
            return [];
          }
        }),
        catchError(() => of([]))
      );
  }

  getAllOrdersWithDetails(): Observable<OrderModel[]> {
    return this.getAllOrders().pipe(
      switchMap(orders => {
        if (!orders.length) return of([]);

        const requests = orders.map(order =>
          this.getOrderDetail(order.orderDetailId)
        );

        return forkJoin(requests).pipe(
          map(details =>
            orders.map((order, index) => ({
              ...order,
              orderDetails: details[index]
            }))
          )
        );
      })
    );
  }

  getOrdersWithDetailsByDateRange(start: Date, end: Date): Observable<OrderModel[]> {
    const startMs = new Date(start).setHours(0, 0, 0, 0);
    const endMs = new Date(end).setHours(23, 59, 59, 999);

    return this.getAllOrdersWithDetails().pipe(
      map(orders =>
        orders.filter(o => {
          const time = o.createdAt ? new Date(o.createdAt).getTime() : 0;
          return time >= startMs && time <= endMs;
        })
      )
    );
  }

  updateOrderStatus(orderId: string, body: any) {
    return this.http.put(
      `${this.baseUrl}/updateOrderStatus/${orderId}`,
      body
    );
  }
}
