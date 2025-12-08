import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CompletedItem {
  uniqueId: string;
  productId: string;
  tableNumber: number;
  completedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BaristaStatusService {
  private completedItemsKey = 'baristaCompletedItems';
  private completedItemsSubject = new BehaviorSubject<{ [tableKey: string]: CompletedItem[] }>({});
  
  constructor() {
    // Load initial data from localStorage
    this.loadCompletedItems();
  }

  // Observable để components khác subscribe
  getCompletedItems(): Observable<{ [tableKey: string]: CompletedItem[] }> {
    return this.completedItemsSubject.asObservable();
  }

  // Lấy trạng thái hiện tại
  getCurrentCompletedItems(): { [tableKey: string]: CompletedItem[] } {
    return this.completedItemsSubject.value;
  }

  // Đánh dấu món đã hoàn thành
  markItemCompleted(tableNumber: number, uniqueId: string, productId: string): void {
    const tableKey = `table-${tableNumber}`;
    const currentItems = this.getCurrentCompletedItems();
    
    if (!currentItems[tableKey]) {
      currentItems[tableKey] = [];
    }
    
    // Kiểm tra xem món đã được đánh dấu chưa
    const existingItem = currentItems[tableKey].find(item => item.uniqueId === uniqueId);
    if (!existingItem) {
      const completedItem: CompletedItem = {
        uniqueId,
        productId,
        tableNumber,
        completedAt: new Date()
      };
      
      currentItems[tableKey].push(completedItem);
      this.saveAndNotify(currentItems);
    }
  }



  // Kiểm tra món đã hoàn thành chưa
  isItemCompleted(tableNumber: number, uniqueId: string): boolean {
    const tableKey = `table-${tableNumber}`;
    const currentItems = this.getCurrentCompletedItems();
    return currentItems[tableKey]?.some(item => item.uniqueId === uniqueId) || false;
  }

  // Lấy danh sách món đã hoàn thành của một bàn
  getCompletedItemsForTable(tableNumber: number): CompletedItem[] {
    const tableKey = `table-${tableNumber}`;
    return this.getCurrentCompletedItems()[tableKey] || [];
  }

  // Xóa tất cả món đã hoàn thành của một bàn (khi đơn hoàn tất)
  clearCompletedItemsForTable(tableNumber: number): void {
    const currentItems = this.getCurrentCompletedItems();
    const tableKey = `table-${tableNumber}`;
    delete currentItems[tableKey];
    this.saveAndNotify(currentItems);
  }

  // Đếm số món đã hoàn thành của một bàn
  getCompletedItemsCount(tableNumber: number): number {
    return this.getCompletedItemsForTable(tableNumber).length;
  }

  // Lưu và thông báo thay đổi
  private saveAndNotify(items: { [tableKey: string]: CompletedItem[] }): void {
    localStorage.setItem(this.completedItemsKey, JSON.stringify(items));
    this.completedItemsSubject.next(items);
  }

  // Load từ localStorage
  private loadCompletedItems(): void {
    const stored = localStorage.getItem(this.completedItemsKey);
    if (stored) {
      try {
        const items = JSON.parse(stored);
        this.completedItemsSubject.next(items);
      } catch (e) {
        console.error('Error loading completed items:', e);
        this.completedItemsSubject.next({});
      }
    }
  }

  // Đồng bộ với localStorage (để tương thích với code cũ)
  syncWithLocalStorage(): void {
    this.loadCompletedItems();
  }
}
