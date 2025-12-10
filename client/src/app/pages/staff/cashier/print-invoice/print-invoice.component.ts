import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { OrderService } from '../../../../services/order.service';
import { finalize, forkJoin } from 'rxjs';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { CalendarComponent } from '../../../../shared/calendar/calendar.component';
import { signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-print-invoice',
  imports: [CommonModule, CalendarComponent, CurrencyPipe, DatePipe],
  templateUrl: './print-invoice.component.html',
  styleUrl: './print-invoice.component.scss'
})
export class PrintInvoiceComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private http = inject(HttpClient);
  private refreshInterval: any;
  
  selectedOrder = signal<any | null>(null);

  toastMessage: string | null = null;
  private toastTimer?: any;

  statusFilter = signal<'all' | 'paid' | 'unpaid'>('all');
  filteredOrders: any[] = [];

  loading = false;
  error: string | null = null;
  orders: any[] = [];
  today = new Date();
  calendarOpen = signal(false);
  selectedDate = signal<Date | null>(null);

  ngOnInit(): void {
    const today = new Date();
    this.selectedDate.set(today);
    this.fetchByDate(today);

    // Auto-refresh data mỗi 5 giây
    this.refreshInterval = setInterval(() => this.refreshData(), 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  // Auto-refresh data để cập nhật danh sách orders
  private refreshData(): void {
    const currentDate = this.selectedDate();
    if (currentDate) {
      this.fetchByDate(currentDate, false); // silent refresh, không hiển thị loading
    }
  }

  toggleCalendar() {
    this.calendarOpen.set(!this.calendarOpen());
  }

  setStatusFilter(filter: 'all' | 'paid' | 'unpaid') {
    this.statusFilter.set(filter);
    this.applyFilters();
    this.selectedOrder.set(null);
  }

  private applyFilters() {
    const filter = this.statusFilter();
    const source = this.orders ?? [];

    if (filter === 'paid') {
      this.filteredOrders = source
      .filter(o => o.isPaid === true);
    } else if (filter === 'unpaid') {
      this.filteredOrders = source
      .filter(o => !(o.isPaid === true));
    } else {
      this.filteredOrders = source;
    }

  }

  onCalendarSelect(date: Date) {
    this.selectedDate.set(date);
    this.calendarOpen.set(false);
    this.fetchByDate(date);

    this.selectedOrder.set(null);
  }

  reset() {
    const today = new Date();
    this.selectedDate.set(today);
    this.fetchByDate(today);
    this.setStatusFilter('all');

    this.selectedOrder.set(null);
  }

  fetchByDate(date: Date, showLoading: boolean = true) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    console.log('[InvoiceHistory] fetchByDate -> range:', { start, end });
    this.loadByRange(start, end, showLoading);
  }


  // clearSelection() {
  //   const today = new Date();
  //   this.selectedDate.set(today);
  //   this.fetchByDate(today);
  // }

  private loadByRange(start: Date, end: Date, showLoading: boolean = true) {
    if (showLoading) {
      this.loading = true;
    }
    this.error = null;
    console.log('[InvoiceHistory] loadByRange call:', { start, end });
    this.orderService.getOrdersWithDetailsByDateRange(start, end)
      .pipe(finalize(() => {
        if (showLoading) {
          this.loading = false;
        }
      }))
      .subscribe({
        next: (data) => {
          console.log('[InvoiceHistory] getOrdersWithDetailsByDateRange =>', data);
          this.orders = data ?? [];
          console.log('[InvoiceHistory] filtered orders count:', this.orders.length);
          this.applyFilters();
          
          // Chỉ clear selected order nếu đây không phải silent refresh
          if (showLoading) {
            this.selectedOrder.set(null);
          }
        },
        error: (err) => {
          this.error = 'Failed to filter orders';
        }
      });
  }

  // tiện xem order đang chọn:
  selectOrder(o: any) {
    this.selectedOrder.set(o);
  }

  calcTotal(o: any): number {
    return this.getItems(o).reduce((sum: number, it: any) => sum + this.itemTotal(it), 0);
  }
  getItems(o: any) {
    return o?.items ?? o?.orderDetails?.[0]?.items ?? [];
  }
  itemTotal(it: any): number {
    const price = +(it?.unitPrice ?? it?.price ?? 0);
    const qty = +(it?.quantity ?? 0);
    return price * qty;
  }

  checkout(): void {
    const current = this.selectedOrder();
    if (!current) return;

    if(current.isPaid) {
      this.showToast('Đơn hàng đã được thanh toán', 5000);
      return;
    }

    // Lấy tất cả orderIds cần update (có thể là merged orders)
    const orderIds = current.allOrderIds || [current.orderId];
    
    // Tạo array các API requests - SỬ DỤNG CASHIER ENDPOINT
    const updateRequests = orderIds.map((orderId: string) => 
      this.updatePaymentStatus(orderId, { isPayment: true })
    );

    // Gọi tất cả API requests đồng thời
    forkJoin(updateRequests).subscribe({
      next: () => {
        this.refreshData();
        
        this.selectedOrder.set(null);
        
        this.showToast('Đã thanh toán thành công! Bàn sẽ trống ngay lập tức.', 5000);
      },
      error: (err) => {
        console.error('Checkout error:', err);
        this.showToast('Thanh toán thất bại! Vui lòng thử lại.', 5000);
      }
    });
  }

  private updatePaymentStatus(orderId: string, body: any) {
    return this.orderService.updatePaymentStatus(orderId, body);
  }

  showToast(message: string, duration = 5000) {
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
