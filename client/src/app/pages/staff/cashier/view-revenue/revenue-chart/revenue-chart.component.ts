import { Component, computed, signal, input, inject, DestroyRef } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { OrderDetailModel, OrderModel } from '../../../../../model/order.model';
import { OrderService } from '../../../../../services/order.service';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './revenue-chart.component.html',
  styleUrl: './revenue-chart.component.scss'
})
export class RevenueChartComponent {
  // input signal: ngày căn cứ
  readonly baseDate = input<Date>(new Date());

  // state
  private readonly rawOrders = signal<OrderModel[]>([]);
  private readonly last7Labels = signal<string[]>([]);
  private readonly last7Values = signal<number[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // services
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject<DestroyRef>(DestroyRef);

  readonly chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    elements: { line: { tension: 0.3 } },
    scales: {
      y: {
        ticks: {
          callback: (v: any) => Intl.NumberFormat('vi').format(Number(v))
        }
      }
    }
  };

  private readonly mappedOrders = computed(() =>
    this.rawOrders().map(o => {
      const details: OrderDetailModel[] = o.orderDetails ?? [];
      type OrderItem = OrderDetailModel['items'][number];
      const items: OrderItem[] = details.flatMap((od: OrderDetailModel) => od.items);
      const amount = items.reduce((s: number, it: OrderItem) => s + (it.subtotal ?? (it.quantity * it.unitPrice)), 0);
      const created = o.createdAt ? new Date(o.createdAt) : new Date();
      return { date: created, amount };
    })
  );

  readonly chartData = computed(() => ({
    labels: this.last7Labels(),
    datasets: [{
      label: 'Doanh thu (VND)',
      data: this.last7Values(),
      borderColor: '#1890ff',
      backgroundColor: 'rgba(24,144,255,0.18)',
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  }));

  constructor() {
    // gọi API mỗi khi baseDate đổi
    toObservable(this.baseDate)
      .pipe(
        map(base => {
          const start = this.shiftDays(base, -6);
          const end = this.shiftDays(base, 0);
          this.buildLast7Days(base);
          this.loading.set(true);
          this.error.set(null);
          return { start, end };
        }),
        switchMap(({ start, end }) =>
          this.orderService.getOrdersWithDetailsByDateRange(start, end).pipe(
            catchError(err => {
              console.error(err);
              this.error.set('Không tải được dữ liệu');
              return of([] as OrderModel[]);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(orders => {
        this.rawOrders.set(orders);
        this.recalcValues();
        this.loading.set(false);
      });
  }

  private buildLast7Days(base: Date) {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = this.shiftDays(base, -i);
      labels.push(d.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' }));
    }
    this.last7Labels.set(labels);
  }

  private recalcValues() {
    const base = this.baseDate();
    const amounts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = this.shiftDays(base, -i);
      const daySum = this.mappedOrders()
        .filter(r =>
          r.date.getDate() === d.getDate() &&
          r.date.getMonth() === d.getMonth() &&
          r.date.getFullYear() === d.getFullYear()
        )
        .reduce((s, r) => s + r.amount, 0);
      amounts.push(daySum);
    }
    this.last7Values.set(amounts);
  }

  private shiftDays(base: Date, delta: number): Date {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + delta);
    return d;
  }
}
