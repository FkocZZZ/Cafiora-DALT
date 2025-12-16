import { Component, computed, inject, signal } from '@angular/core';
import { CalendarComponent } from '../../../../shared/calendar/calendar.component';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderModel } from '../../../../model/order.model';
import { RevenueChartComponent } from './revenue-chart/revenue-chart.component';
import { OrderService } from '../../../../services/order.service';

@Component({
  selector: 'app-view-revenue',
  imports: [CalendarComponent, DatePipe, CurrencyPipe, RevenueChartComponent],
  templateUrl: './view-revenue.component.html',
  styleUrl: './view-revenue.component.scss'
})
export class ViewRevenueComponent {
  private orderService = inject(OrderService);
  readonly selectedDate = signal<Date | null>(null);
  readonly calendarOpen = signal<boolean>(false);
  readonly today = new Date();

  readonly orders = signal<OrderModel[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly baseDate = computed(() => this.selectedDate() ?? this.today);

  private readonly mappedOrders = computed(() => 
    this.orders().map(o => {
      const items = o.orderDetails?.flatMap(od => od.items) ?? [];
      const amount = items.reduce((s, it) => s + (it.subtotal ?? (it.quantity ?? 0) * (it.unitPrice ?? 0)), 0);
      const created = o.createdAt ? new Date(o.createdAt) : new Date();
      return { id: o.orderId, date: created, amount };
    })
  );

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private startOfWeek(date: Date) {
    const d = this.startOfDay(date);
    const diff = (d.getDay() + 6) % 7; // Monday as start
    d.setDate(d.getDate() - diff);
    return d;
  }

  private endOfWeek(date: Date) {
    const d = this.startOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private totalInRange(start: Date, end: Date) {
    const s = start.getTime();
    const e = end.getTime();
    return this.mappedOrders()
      .filter(r => {
        const t = r.date.getTime();
        return t >= s && t <= e;
      })
      .reduce((sum, r) => sum + r.amount, 0);
  }

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

  readonly monthlyRevenue = computed(() => {
    const base = this.baseDate();
    return this.mappedOrders()
      .filter(r => r.date.getMonth() === base.getMonth() && r.date.getFullYear() === base.getFullYear())
      .reduce((s, r) => s + r.amount, 0);
  });

  readonly dayRevenue = computed(() => {
    const base = this.baseDate();
    return this.totalInRange(this.startOfDay(base), this.endOfDay(base));
  });

  readonly weekRevenue = computed(() => {
    const base = this.baseDate();
    return this.totalInRange(this.startOfWeek(base), this.endOfWeek(base));
  });

  readonly yearRevenue = computed(() => {
    const base = this.baseDate();
    return this.mappedOrders()
      .filter(r => r.date.getFullYear() === base.getFullYear())
      .reduce((s, r) => s + r.amount, 0);
  });

  constructor() {
    this.fetchOrders();
  }

  private fetchOrders(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService.getAllOrdersWithDetailsForCashier().subscribe({
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

  }

  reset(): void {
    this.selectedDate.set(null);
    this.calendarOpen.set(false);
  }

  setOrders(data: OrderModel[]) {
    this.orders.set(data ?? []);
  }

}
