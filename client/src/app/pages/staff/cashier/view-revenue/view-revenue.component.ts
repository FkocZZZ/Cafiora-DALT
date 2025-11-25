import { Component, computed, signal } from '@angular/core';
import { CalendarComponent } from '../../../../shared/calendar/calendar.component';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderModel } from '../../../../model/order.model';
import { RevenueChartComponent } from './revenue-chart/revenue-chart.component';
import { RevenueDetailComponent } from './revenue-detail/revenue-detail.component';
import { OrderService } from '../../../../services/order.service';

@Component({
  selector: 'app-view-revenue',
  imports: [CalendarComponent, DatePipe, CurrencyPipe, RevenueChartComponent, RevenueDetailComponent],
  templateUrl: './view-revenue.component.html',
  styleUrl: './view-revenue.component.scss'
})
export class ViewRevenueComponent {
  readonly selectedDate = signal<Date | null>(null);
  readonly calendarOpen = signal<boolean>(false);
  readonly today = new Date();

  readonly orders = signal<OrderModel[]>([]);
  readonly pageIndex = signal(0);
  readonly pageSize = 5;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly mappedOrders = computed(() => 
    this.orders().map(o => {
      const items = (o.orderDetails?.flatMap(od => od.items) ?? []);
      const totalQuantity = items.reduce((s, it) => s + (it.quantity ?? 0), 0);
      const amount = items.reduce((s, it) => s + (it.subtotal ?? ((it.quantity ?? 0) * (it.unitPrice ?? 0))), 0);
      const created = o.createdAt ? new Date(o.createdAt) : new Date();
      return {
        id: o.orderId,
        code: o.orderId,
        date: created,
        table: o.tableNumber,
        customer: o.customerName || 'Khách lẻ',
        items,
        totalQuantity,
        amount,
        isPaid: !!o.isPaid
      };
    })
  );

  readonly filteredOrders = computed(() => {
    const selected = this.selectedDate();
    let data = this.mappedOrders();
    if (selected) {
      data = data.filter(r => 
        r.date.getDate() === selected.getDate() &&
        r.date.getMonth() === selected.getMonth() &&
        r.date.getFullYear() === selected.getFullYear()
      )
    }
    return data;
  });

  readonly pagedOrders = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => {
    const total = this.filteredOrders().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly monthlyRevenue = computed(() => {
    const base = this.selectedDate() ?? new Date();
    return this.mappedOrders()
      .filter(r => r.date.getMonth() === base.getMonth() && r.date.getFullYear() === base.getFullYear())
      .reduce((s, r) => s + r.amount, 0);
  });

  constructor(private orderService: OrderService) {
    this.fetchOrders();
  }

  private fetchOrders(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getAllOrdersWithDetails().subscribe({
      next: (orders) => {
        this.setOrders(orders);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Lỗi tải dữ liệu đơn hàng');
        this.loading.set(false);
      }
    });
  }

  toggleCalendar(): void {
    this.calendarOpen.update(v => !v);
  }

  onCalendarSelect(date: Date): void {
    this.selectedDate.set(date);
    //Cho Calendar tự đóng sau khi select ngày
    // this.calendarOpen.set(false);
  }

  apply(): void {
    // TODO: gọi API/filter theo selectedDate()
    // ví dụ: this.loadRevenue({ date: this.selectedDate() })
    this.pageIndex.set(0);
  }

  reset(): void {
    this.selectedDate.set(null);
    this.calendarOpen.set(false);
    this.pageIndex.set(0);
    // TODO: reset dữ liệu hiển thị
  }

  setOrders(data: OrderModel[]) {
    this.orders.set(data ?? []);
    this.pageIndex.set(0);
  }

  nextPage() {
    if (this.pageIndex() + 1 < this.totalPages()) this.pageIndex.update(v => v + 1);
  }

  prevPage() {
    if (this.pageIndex() > 0) this.pageIndex.update(v => v - 1);
  }

}
