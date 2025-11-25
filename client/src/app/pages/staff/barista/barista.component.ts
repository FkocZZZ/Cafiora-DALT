import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HeaderComponent } from '../../header/header.component';
import { OrderService } from '../../../services/order.service';
import { OrderModel } from '../../../model/order.model';
import { interval, Subject, switchMap, takeUntil, startWith } from 'rxjs';

@Component({
  selector: 'app-barista',
  standalone: true,
  imports: [DatePipe, CommonModule],
  templateUrl: './barista.component.html',
  styleUrl: './barista.component.scss'
})
export class BaristaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private orderService = inject(OrderService);

  orders: any[] = [];
  status = signal<'new' | 'completed'>('new');

  activeOrderId: string | null = null;
  showNewOrderMessage: boolean = false;

  private destroy$ = new Subject<void>();

  private previousOrderIds: Set<string> = new Set();
  private isFirstLoad = true;

  constructor() {
    this.route.paramMap.subscribe(params => {
      const param = (params.get('status') as 'new' | 'completed') || 'new';
      this.status.set(param);
      this.activeOrderId = null;
    });
  }

  ngOnInit(): void {
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.orderService.getAllOrdersWithDetails()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (orders: any[]) => {
          this.handleIncomingData(orders);
        },
        error: (err) => console.error('Lỗi auto-refresh:', err)
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleIncomingData(newOrders: any[]) {
    if (!this.isFirstLoad && this.status() === 'new') {
      const currentIds = newOrders.filter(o => !o.status).map(o => o.orderId);
      const hasNew = currentIds.some(id => !this.previousOrderIds.has(id));

      if (hasNew) {
        this.triggerNotification();
      }
      this.previousOrderIds = new Set(currentIds);
    } else {
      const currentIds = newOrders.filter(o => !o.status).map(o => o.orderId);
      this.previousOrderIds = new Set(currentIds);
      this.isFirstLoad = false;
    }
    this.orders = newOrders;
  }

  triggerNotification() {
    this.showNewOrderMessage = true;
    // Tự tắt sau 3 giây
    setTimeout(() => {
      this.showNewOrderMessage = false;
    }, 3000);
  }

  get filteredOrdersForGrid() {
    const isCompleted = this.status() === 'completed';
    return this.orders.filter(o => o.status === isCompleted);
  }

  toggleOrder(id: string) {
    if (this.activeOrderId === id) {
      this.activeOrderId = null;
    } else {
      this.activeOrderId = id;
    }
  }

  markDone(orderData: any, event?: Event) {
    if(event) event.stopPropagation(); // Ngăn click lan ra ngoài

    const orderId = orderData?.orderId;
    if (!orderId) return;

    this.orderService.updateOrderStatus(orderId, { status: true }).subscribe({
      next: () => {
        // --- XỬ LÝ UI NGAY LẬP TỨC ---

        // 1. Tìm và cập nhật status trong mảng local (để Grid tự filter mất đi)
        const index = this.orders.findIndex(o => o.orderId === orderId);
        if (index !== -1) {
          // Cách 1: Xóa hẳn khỏi mảng (nếu muốn biến mất hoàn toàn)
          this.orders[index].status = true;

          // Cách 2 (Optional): Nếu muốn xóa khỏi mảng luôn thì dùng splice:
          // this.orders.splice(index, 1);
        }

        // 2. Nếu đang mở bàn đó thì đóng lại
        if (this.activeOrderId === orderId) {
          this.activeOrderId = null;
        }

        // 3. Cập nhật lại set ID để polling lần sau không báo "đơn mới" nhầm
        if (this.previousOrderIds.has(orderId)) {
          this.previousOrderIds.delete(orderId);
        }

        // console.log("Đã hoàn tất đơn:", orderId);
      },
      error: (err) => console.error("Lỗi update:", err)
    });
  }

  // Helper lấy tên món
  getProductName(item: any): string {
    const prod = item?.productId ?? item?.product_id;
    if (!prod) return 'Unknown';
    if (typeof prod === 'string') return 'Unknown';
    return prod.nameProduct ?? prod.productName ?? prod.name ?? '';
  }
}
