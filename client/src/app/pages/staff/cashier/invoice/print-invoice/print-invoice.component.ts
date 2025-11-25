import { Component, inject, OnInit } from '@angular/core';
import { OrderDetailModel, OrderModel } from '../../../../../model/order.model';
import { OrderService } from '../../../../../services/order.service';
import { AsyncPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { distinctUntilChanged, map, Observable, ReplaySubject, switchMap, tap } from 'rxjs';

interface FlattenDetailItem {
  orderDetailId?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  rawItem: any;
  product?: any;
}

@Component({
  selector: 'app-print-invoice',
  imports: [DatePipe, AsyncPipe, DecimalPipe, NgClass],
  templateUrl: './print-invoice.component.html',
  styleUrl: './print-invoice.component.scss'
})
export class PrintInvoiceComponent implements OnInit {
  private orderService = inject(OrderService);

  toastMessage: string | null = null;
  private toastTimer?: any;

  orders$: Observable<OrderModel[]> = this.orderService.getAllOrders()
  .pipe(
    tap(o => console.log('orders$ emitted', o))
  );

  private selectedDetailId$ = new ReplaySubject<string>(1);
  // orderDetail$: Observable<OrderDetailModel[]> = this.selectedDetailId$.pipe(
  //   tap(id => console.log('selectedDetailId emitted', id)),
  //   distinctUntilChanged(),
  //   switchMap(id => this.orderService.getOrderDetail(id)),
  //   tap(d => console.log('orderDetail$', d))
  // )

 orderDetail$: Observable<FlattenDetailItem[]> = this.selectedDetailId$.pipe(
    tap(id => console.log('selectedDetailId emitted', id)),
    distinctUntilChanged(),
    switchMap(id => this.orderService.getOrderDetail(id)),
    tap(d => console.log('orderDetail raw', d)),
    map(details =>
      (details ?? []).flatMap(d => {
        const odId = (d as any).orderDetailId ?? (d as any).id ?? '';
        const items: any[] = (d as any).items ?? [];
        return items.map((item: any, idx: number) => {

          // Tìm object product nếu có
            const productObj =
              item.product ??
              item.productInfo ??
              item.productDTO ??
              (typeof item.productId === 'object' && item.productId !== null ? item.productId : null);

          const quantity = item.quantity ?? item.qty ?? 1;
          const unitPrice =
            item.unitPrice ??
            item.price ??
            productObj?.unitPrice ??
            productObj?.price ??
            0;

          // Lấy productId (ưu tiên string; nếu object thì lấy id/_id)
          const resolvedProductId =
            (typeof item.productId === 'string' ? item.productId : null) ??
            productObj?.id ??
            productObj?._id ??
            item.id ??
            `auto_${idx}`;

          const productName =
            item.productName ??
            item.name ??
            item.title ??
            productObj?.nameProduct ??
            productObj?.name ??
            productObj?.productName ??
            productObj?.title ??
            `Product ${resolvedProductId}`;

          return {
            orderDetailId: odId,
            productId: String(resolvedProductId),
            productName,
            quantity,
            unitPrice,
            amount: quantity * unitPrice,
            rawItem: item,
            product: productObj
          } as FlattenDetailItem;
        });
      })
    ),
    tap(flat => console.log('orderDetail flattened', flat))
  );

  totalAmount$: Observable<number> = this.orderDetail$.pipe(
    map(item => item.reduce((sum, i) => sum + i.amount, 0)),
    tap(total => console.log('totalAmount$', total))
  )
  
  selectedOrder: OrderModel | null = null;

  ngOnInit(): void {
  }

  selectOrder(order: OrderModel) {
    this.selectedOrder = order;
    if (order.orderDetailId) {
      this.selectedDetailId$.next(order.orderDetailId);
    }
  }

  checkout(): void {
    if (!this.selectedOrder) {
      return;
    }

    if(this.selectedOrder.isPaid) {
      this.showToast('Đơn hàng đã được thanh toán', 30000);
      return;
    }

    //Cap nhat server
    // this.orderService.markPaid(this.selectedOrder.orderId).subscribe({
    //   next: () => this.showToast('Đã thanh toán thành công', 3000),
    //   error: () => this.showToast('Thanh toán thất bại', 3000)

    this.selectedOrder.isPaid = true;

    
    this.showToast('Đã thanh toán thành công', 30000);
  }

  showToast(message: string, duration = 30000) {
    this.toastMessage = message;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.toastMessage = null;
      this.toastTimer = undefined;
    }, duration)
  }

  closeToast() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = undefined;
    }
    this.toastMessage = null
  }

}
