import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, OnDestroy, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { BaristaStatusService } from '../../../services/barista-status.service';
import { interval, Subject, switchMap, takeUntil, startWith } from 'rxjs';

@Component({
  selector: 'app-barista',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule],
  templateUrl: './barista.component.html',
  styleUrl: './barista.component.scss'
})
export class BaristaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private orderService = inject(OrderService);
  private baristaStatusService = inject(BaristaStatusService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  orders: any[] = [];
  filteredOrders: any[] = [];
  status = signal<'new' | 'completed'>('new');
  activeOrderId: string | null = null;
  showNewOrderMessage = false;
  showCompletedItems = false; // Toggle để hiển thị món đã làm

  private destroy$ = new Subject<void>();
  private previousOrderIds = new Set<string>();

  constructor() {
    this.route.paramMap.subscribe(params => {
      const newStatus = (params.get('status') as 'new' | 'completed') || 'new';
      if (this.status() !== newStatus) {
        this.status.set(newStatus);
        this.activeOrderId = null;
        this.updateFilteredOrders();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to barista status changes
    this.baristaStatusService.getCompletedItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Clear cache khi có thay đổi trạng thái
        this.clearCache();
        this.cdr.detectChanges();
      });

    interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.orderService.getAllOrdersWithDetails()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (orders) => this.handleIncomingData(orders),
        error: (err) => console.error('Lỗi auto-refresh:', err)
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleIncomingData(newOrders: any[]) {
    if (this.status() === 'new') {
      const currentIds = newOrders.filter(o => !o.status).map(o => o.orderId);
      const hasNew = currentIds.some(id => !this.previousOrderIds.has(id));
      if (hasNew && this.previousOrderIds.size > 0) this.triggerNotification();
      this.previousOrderIds = new Set(currentIds);
    }
    
    this.ngZone.run(() => {
      // Clear cache khi có data mới
      this.clearCache();
      this.orders = newOrders;
      this.updateFilteredOrders();
      this.cdr.detectChanges();
    });
  }

  // Clear cache method
  private clearCache(): void {
    this.itemsCache.clear();
    this.cacheTimestamp.clear();
  }

  private updateFilteredOrders() {
    const isCompleted = this.status() === 'completed';
    this.filteredOrders = this.orders
      .filter(o => o.status === isCompleted)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  private triggerNotification() {
    this.showNewOrderMessage = true;
    setTimeout(() => this.showNewOrderMessage = false, 3000);
  }

  // Cache để tránh tính toán lại liên tục
  private itemsCache = new Map<string, any[]>();
  private cacheTimestamp = new Map<string, number>();

  // --- LOGIC CỐT LÕI: HIỂN THỊ MÓN THEO TÙY CHỌN (SỬA LẠI ĐÚNG) ---
  getSortedItems(order: any): any[] {
    if (!order.orderDetails) return [];

    // ✅ CACHE: Tránh tính toán lại liên tục nếu data không đổi
    const cacheKey = `${order.tableNumber}_${this.showCompletedItems}`;
    const now = Date.now();
    const lastCache = this.cacheTimestamp.get(cacheKey) || 0;
    
    // Cache trong 1 giây để tránh spam
    if (now - lastCache < 1000 && this.itemsCache.has(cacheKey)) {
      return this.itemsCache.get(cacheKey)!;
    }

    const productItems: any[] = [];
    const seenProductIds = new Set<string>();

    console.log(`🔍 [getSortedItems] Processing table ${order.tableNumber}`);

    // Duyệt qua TẤT CẢ món trong orderDetails (đã được merge từ service)
    for (const detail of order.orderDetails) {
      if (!detail.items) continue;

      for (const item of detail.items) {
        const totalQuantity = item.quantity || 1;
        // Lấy productId ổn định - ưu tiên originalProductId từ OrderService
        const productId = item.originalProductId || this.getProductIdFromItem(item);
        
        // ✅ FIX: Sử dụng productId làm base để tạo uniqueId ổn định
        // Thay vì dùng someoneId có thể thay đổi, dùng productId + tableNumber
        const itemId = `${productId}_table${order.tableNumber}`;
        
        if (!itemId || !productId) {
          console.warn(`❌ Missing itemId(${itemId}) or productId(${productId}) for:`, item);
          continue;
        }

        // Tránh duplicate cùng sản phẩm
        if (seenProductIds.has(productId)) {
          console.log(`⚠️ Duplicate product ${this.getProductName(item)}, skipping...`);
          continue;
        }
        seenProductIds.add(productId);

        console.log(`📝 Processing ${this.getProductName(item)} (qty: ${totalQuantity}, itemId: ${itemId})`);

        // DEBUG: Kiểm tra completed items trong storage
        const allCompleted = this.baristaStatusService.getCompletedItemsForTable(order.tableNumber);
        console.log(`🔍 [DEBUG] Table ${order.tableNumber} completed items:`, allCompleted);

        // ✅ GIỮ NGUYÊN QUANTITY, KHÔNG TÁCH THÀNH NHIỀU DÒNG
        // Chỉ kiểm tra có bao nhiêu đơn vị đã hoàn thành
        let completedCount = 0;
        for (let i = 0; i < totalQuantity; i++) {
          const uniqueId = `${itemId}_${i}`;
          const isCompleted = this.baristaStatusService.isItemCompleted(order.tableNumber, uniqueId);
          console.log(`   🔍 Checking uniqueId: ${uniqueId} → ${isCompleted}`);
          if (isCompleted) {
            completedCount++;
          }
        }

        const pendingCount = totalQuantity - completedCount;
        const isFullyCompleted = completedCount === totalQuantity;

        console.log(`   - ${this.getProductName(item)}: total=${totalQuantity}, completed=${completedCount}, pending=${pendingCount}`);

        if (this.showCompletedItems) {
          // CHẾ ĐỘ 2: Hiển thị TẤT CẢ món (với thông tin hoàn thành)
          productItems.push({ 
            ...item, 
            quantity: totalQuantity,
            completedCount,
            pendingCount,
            uniqueId: itemId, 
            _isCompleted: isFullyCompleted 
          });
        } else {
          // CHẾ ĐỘ 1: CHỈ hiển thị món CÒN PENDING (chưa hoàn thành hết)
          if (pendingCount > 0) {
            console.log(`   ✅ Adding ${this.getProductName(item)} to display (pending: ${pendingCount})`);
            productItems.push({ 
              ...item, 
              quantity: pendingCount, // Chỉ hiển thị số lượng còn lại
              originalQuantity: totalQuantity,
              completedCount,
              pendingCount,
              uniqueId: itemId, 
              _isCompleted: false 
            });
          } else {
            console.log(`   🚫 Skipping ${this.getProductName(item)} - fully completed (${completedCount}/${totalQuantity})`);
          }
        }
      }
    }

    console.log(`📊 [getSortedItems] Table ${order.tableNumber} final items:`, productItems.length);
    
    // ✅ Lưu cache
    this.itemsCache.set(cacheKey, productItems);
    this.cacheTimestamp.set(cacheKey, now);
    
    return productItems;
  }

  // Wrapper method để tránh gọi getSortedItems() quá nhiều từ template
  getCachedSortedItems(order: any): any[] {
    // Chỉ gọi getSortedItems() khi cần thiết
    return this.getSortedItems(order);
  }

  isItemCompleted(order: any, item: any): boolean {
    return item._isCompleted === true;
  }

  // Khi Barista bấm nút CHECK (✓) - đánh dấu 1 đơn vị hoàn thành
  markItemCompleted(order: any, item: any, event: Event) {
    event.stopPropagation();
    
    const itemId = item.uniqueId;
    const productId = this.getProductIdFromItem(item) || '';
    const totalQuantity = item.originalQuantity || item.quantity || 1;
    
    console.log(`🔄 [markItemCompleted] Table ${order.tableNumber}, itemId: ${itemId}, productId: ${productId}, qty: ${totalQuantity}`);
    
    if (!itemId) {
      console.error(`❌ No itemId for item:`, item);
      return;
    }

    // Tìm đơn vị chưa hoàn thành đầu tiên và đánh dấu
    for (let i = 0; i < totalQuantity; i++) {
      const uniqueId = `${itemId}_${i}`;
      const isAlreadyCompleted = this.baristaStatusService.isItemCompleted(order.tableNumber, uniqueId);
      console.log(`   🔍 Checking uniqueId: ${uniqueId} → already completed: ${isAlreadyCompleted}`);
      
      if (!isAlreadyCompleted) {
        this.baristaStatusService.markItemCompleted(order.tableNumber, uniqueId, productId);
        console.log(`✅ Marked completed: ${this.getProductName(item)} unit ${i} (uniqueId: ${uniqueId})`);
        break;
      }
    }
    
    // ✅ Clear cache khi có thay đổi
    this.clearItemsCache(order.tableNumber);
    
    this.cdr.detectChanges();
  }
  
  // Clear cache cho bàn cụ thể
  private clearItemsCache(tableNumber: number) {
    const keysToDelete = Array.from(this.itemsCache.keys()).filter(key => 
      key.startsWith(`${tableNumber}_`)
    );
    keysToDelete.forEach(key => {
      this.itemsCache.delete(key);
      this.cacheTimestamp.delete(key);
    });
  }

  // Khi Barista bấm Hoàn Tất Đơn
  markDone(order: any, event: Event) {
    event.stopPropagation();
    
    if (!this.areAllItemsCompleted(order)) {
      alert("Vui lòng làm xong hết các món!");
      return;
    }

    const orderIds = order.allOrderIds || [order.orderId];
    console.log(`🎯 Updating status for table ${order.tableNumber}:`, orderIds);

    const updateRequests = orderIds.map((id: string) => 
      this.orderService.updateOrderStatus(id, { status: true })
    );

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(updateRequests).subscribe({
        next: () => {
          console.log(`✅ All orders for table ${order.tableNumber} marked as done`);
          
          // Xóa completed items của bàn này
          this.baristaStatusService.clearCompletedItemsForTable(order.tableNumber);

          // XÓA HOÀN TOÀN KHỎI DANH SÁCH (thay vì chỉ update status)
          this.orders = this.orders.filter(o => o.orderId !== order.orderId);
          this.updateFilteredOrders(); // Update filtered list
          this.activeOrderId = null;
          this.clearCache(); // Clear cache để tránh hiển thị cũ
          
          console.log(`🗑️ Removed table ${order.tableNumber} from UI immediately`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error updating order status:', err);
          alert('Lỗi cập nhật trạng thái đơn hàng!');
        }
      });
    });
  }
  // --- Helpers ---
  areAllItemsCompleted(order: any): boolean {
    // Nếu không còn món nào hiển thị (tất cả đã làm xong) thì return true
    const pendingItems = this.getSortedItems(order);
    return pendingItems.length === 0;
  }

  getProductIdFromItem(item: any): string {
    const p = item.product_id || item.productId;
    return typeof p === 'string' ? p : (p?._id || '');
  }

  getProductName(item: any): string {
    const p = item.product_id || item.productId;
    return p?.nameProduct || p?.name || 'Unknown';
  }

  getItemId(item: any): string {
    return item.uniqueId || item.someoneId || item._id;
  }

  toggleOrder(id: string) {
    this.activeOrderId = this.activeOrderId === id ? null : id;
  }

  // Các method này giờ được xử lý bởi BaristaStatusService
  // Giữ lại để tương thích backward, nhưng delegate to service
  saveCompletedItemIds() {
    // Không cần thiết nữa, service tự động save
  }

  loadCompletedItemIds() {
    // Không cần thiết nữa, service tự động load
    this.baristaStatusService.syncWithLocalStorage();
  }

  // Kiểm tra xem có món mới được thêm vào bàn không 
  // Hiển thị badge "MỚI" khi bàn có cả món đã hoàn thành và món chưa hoàn thành
  hasNewItems(order: any): boolean {
    const completedCount = this.baristaStatusService.getCompletedItemsCount(order.tableNumber);
    const pendingItems = this.getSortedItems(order);
    
    // Có badge "MỚI" nếu: có món đã hoàn thành trước đó + có món chưa hoàn thành hiện tại
    // Điều này cho thấy Waiter vừa thêm món mới vào bàn đã có order trước đó
    return completedCount > 0 && pendingItems.length > 0;
  }

  // Đếm số món còn lại chưa hoàn thành (đếm theo sản phẩm thật, không phải uniqueId)
  getPendingItemsCount(order: any): number {
    if (!order.orderDetails) return 0;
    
    let totalPendingCount = 0;
    const processedProducts = new Set<string>();
    
    // Duyệt qua TẤT CẢ món trong orderDetails để đếm thật
    for (const detail of order.orderDetails) {
      if (!detail.items) continue;
      
      for (const item of detail.items) {
        const productId = this.getProductIdFromItem(item);
        const quantity = item.quantity || 1;
        
        // Tránh đếm trùng cùng sản phẩm
        if (processedProducts.has(productId)) continue;
        processedProducts.add(productId);
        
        // Đếm số lượng thực tế chưa hoàn thành của sản phẩm này
        let pendingQty = 0;
        const baseItemId = `${productId}_table${order.tableNumber}`;
        for (let i = 0; i < quantity; i++) {
          const uniqueId = `${baseItemId}_${i}`;
          const isDone = this.baristaStatusService.isItemCompleted(order.tableNumber, uniqueId);
          if (!isDone) pendingQty++;
        }
        
        totalPendingCount += pendingQty;
      }
    }
    
    return totalPendingCount;
  }

  // Đếm số món đã hoàn thành (đếm theo số lượng thật, không phải số record trong service)
  getCompletedItemsCount(order: any): number {
    if (!order.orderDetails) return 0;
    
    let totalCompletedCount = 0;
    const processedProducts = new Set<string>();
    
    // Duyệt qua TẤT CẢ món trong orderDetails để đếm thật
    for (const detail of order.orderDetails) {
      if (!detail.items) continue;
      
      for (const item of detail.items) {
        const productId = this.getProductIdFromItem(item);
        const quantity = item.quantity || 1;
        
        // Tránh đếm trùng cùng sản phẩm  
        if (processedProducts.has(productId)) continue;
        processedProducts.add(productId);
        
        // Đếm số lượng thực tế đã hoàn thành của sản phẩm này
        let completedQty = 0;
        const baseItemId = `${productId}_table${order.tableNumber}`;
        for (let i = 0; i < quantity; i++) {
          const uniqueId = `${baseItemId}_${i}`;
          const isDone = this.baristaStatusService.isItemCompleted(order.tableNumber, uniqueId);
          if (isDone) completedQty++;
        }
        
        totalCompletedCount += completedQty;
      }
    }
    
    return totalCompletedCount;
  }
}