import { Component, computed, signal, input } from '@angular/core';
import { DatePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { OrderModel, OrderDetailModel } from '../../../../../model/order.model';

@Component({
  selector: 'app-revenue-detail',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './revenue-detail.component.html',
  styleUrl: './revenue-detail.component.scss'
})
export class RevenueDetailComponent {
  // Inputs
  readonly orders = input<OrderModel[]>([]);
  readonly selectedDate = input<Date | null>(null);

  // Pagination
  readonly pageIndex = signal(0);
  readonly pageSize = 5;

  // Map dữ liệu hiển thị
  private readonly mappedRows = computed(() =>
  this.orders().map(o => {
    const details = o.orderDetails ?? [];
    const items = details.flatMap(d => d.items);
    // console.log('[RevenueDetail] items for order', o.orderId, items);
    const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);
    const amount = items.reduce((s, it) => s + (it.subtotal ?? (it.quantity * it.unitPrice)), 0);
    const created = o.createdAt ? new Date(o.createdAt) : new Date();
    return {
      id: o.orderId,
      code: o.orderId,
      date: created,
      table: o.tableNumber,
      customer: o.customerName || 'Khách lẻ',
      items,
      totalQty,
      amount,
      isPaid: !!o.isPaid
    };
  })
);

  // Lọc theo selectedDate
  readonly filteredRows = computed(() => {
    const sel = this.selectedDate();
    let data = this.mappedRows();
    if (sel) {
      data = data.filter(r =>
        r.date.getDate() === sel.getDate() &&
        r.date.getMonth() === sel.getMonth() &&
        r.date.getFullYear() === sel.getFullYear()
      );
    }
    return data;
  });

  // Phân trang
  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => {
    const total = this.filteredRows().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  // Reset page khi dữ liệu/ bộ lọc thay đổi
  constructor() {
    // Reset về trang 1 khi orders hoặc selectedDate đổi
    computed(() => [this.orders(), this.selectedDate()]); // track
    this.pageIndex.set(0);
  }

  nextPage() {
    if (this.pageIndex() + 1 < this.totalPages()) this.pageIndex.update(v => v + 1);
  }
  prevPage() {
    if (this.pageIndex() > 0) this.pageIndex.update(v => v - 1);
  }
}
