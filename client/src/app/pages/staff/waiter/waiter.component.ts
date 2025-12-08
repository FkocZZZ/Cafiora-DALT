import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from "@angular/forms";
import { BaristaStatusService, CompletedItem } from '../../../services/barista-status.service';
import { Subscription } from 'rxjs';

interface Product {
  _id: string;
  nameProduct: string;
  price: number;
  status: boolean;
  urlImage: string;
}

interface TableCart {
  cart: { product: Product; quantity: number }[];
  note: string;
  customerName: string;
}

@Component({
  selector: 'app-waiter',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './waiter.component.html',
  styleUrls: ['./waiter.component.scss']
})
export class WaiterComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  loading = false;
  error = '';
  tables = [1, 2, 3, 4, 5, 6, 7, 8];
  tableStatus: { [key: number]: boolean } = {};
  completedTables: { [key: number]: boolean } = {};
  selectedTable: number | null = null;
  tableOrderIds: { [key: number]: string } = {};
  ignoredOrders: string[] = [];
  cartByTable: { [table: number]: TableCart } = {};
  
  private lastAllOrdersData: any[] = [];
  private previousServerStatus: { [key: number]: boolean | undefined } = {};
  private messageTimeout: any;
  private refreshInterval: any;
  private baristaStatusSubscription?: Subscription;
  
  // Barista status data
  completedItemsByTable: { [tableKey: string]: CompletedItem[] } = {};
  
  // Theo dõi số lượng sản phẩm đã order của bàn
  existingQuantityMap = new Map<string, number>();

  showMessage = false;
  messageText = '';
  showConfirmPopup = false;
  popupTableNumber: number | null = null;
  popupMessage = '';
  popupResolve: ((action: boolean) => void) | null = null;

  constructor(
    private http: HttpClient,
    private baristaStatusService: BaristaStatusService
  ) {}

  ngOnInit(): void {
    this.loadFromLocalStorage();
    this.getProducts();
    this.checkRealtimeStatus();
    this.refreshInterval = setInterval(() => this.checkRealtimeStatus(), 5000);
    
    // Subscribe to barista status changes
    this.baristaStatusSubscription = this.baristaStatusService.getCompletedItems()
      .subscribe(completedItems => {
        this.completedItemsByTable = completedItems;
      });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.baristaStatusSubscription) this.baristaStatusSubscription.unsubscribe();
  }

  private loadFromLocalStorage() {
    this.tableStatus = JSON.parse(localStorage.getItem('tableStatus') || '{}');
    this.completedTables = JSON.parse(localStorage.getItem('completedTables') || '{}');
    this.cartByTable = JSON.parse(localStorage.getItem('cartByTable') || '{}');
    this.ignoredOrders = JSON.parse(localStorage.getItem('ignoredOrders') || '[]');
    
    this.tables.forEach(t => {
      if (!(t in this.tableStatus)) this.tableStatus[t] = false;
      if (!(t in this.completedTables)) this.completedTables[t] = false;
    });
  }

  saveLocal() {
    localStorage.setItem('cartByTable', JSON.stringify(this.cartByTable));
    localStorage.setItem('tableStatus', JSON.stringify(this.tableStatus));
    localStorage.setItem('completedTables', JSON.stringify(this.completedTables));
    localStorage.setItem('ignoredOrders', JSON.stringify(this.ignoredOrders));
  }

  getProducts() {
    this.loading = true;
    this.http.get<any>('http://localhost:8000/api/getProduct').subscribe({
      next: (res) => {
        this.products = res.dataProduct || [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Không thể tải sản phẩm';
        this.loading = false;
      }
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/no-image.png';
  }

  // --- GETTERS / SETTERS ---
  get cart() {
    return this.selectedTable ? (this.cartByTable[this.selectedTable]?.cart ?? []) : [];
  }

  set cart(val: { product: Product; quantity: number }[]) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable].cart = val;
    this.saveLocal();
  }

  get note() {
    return this.selectedTable ? (this.cartByTable[this.selectedTable]?.note ?? '') : '';
  }

  set note(val: string) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable].note = val;
    this.saveLocal();
  }

  get customerName() {
    return this.selectedTable ? (this.cartByTable[this.selectedTable]?.customerName ?? '') : '';
  }

  set customerName(val: string) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable].customerName = val;
    this.saveLocal();
  }

  get totalItems() {
    return this.cart.reduce((sum, i) => sum + i.quantity, 0);
  }

  get totalPrice() {
    return this.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }

  private ensureTableData(table: number) {
    if (!this.cartByTable[table]) {
      this.cartByTable[table] = { cart: [], note: '', customerName: '' };
    }
  }

  selectProduct(product: Product) {
    const existing = this.cart.find(i => i.product._id === product._id);
    if (existing) existing.quantity++;
    else this.cart = [...this.cart, { product, quantity: 1 }];
  }

  increaseQuantity(item: any) {
    item.quantity++;
    this.cart = [...this.cart];
  }

  decreaseQuantity(item: any) {
    if (item.quantity > 1) item.quantity--;
    else this.cart = this.cart.filter(i => i.product._id !== item.product._id);
  }

  getLatestValidOrder(allOrders: any[], tableNumber: number) {
    const ordersForTable = allOrders.filter((item: any) =>
      item.order.table_number === tableNumber &&
      item.order.isPayment === false &&
      !this.ignoredOrders.includes(item.order._id)
    );

    if (ordersForTable.length === 0) return null;

    ordersForTable.sort((a: any, b: any) => {
      const dateA = new Date(a.order.createdAt).getTime();
      const dateB = new Date(b.order.createdAt).getTime();
      return dateB - dateA;
    });

    return ordersForTable[0];
  }

  async selectTable(t: number) {
    if (this.tableStatus[t]) {
      const action = await this.confirmPopup(
        `Bàn ${t} đang phục vụ. Nhấn xanh lá để XÓA BÀN hoặc Đỏ để xem đơn cũ.`,
        t
      );

      if (action) {
        this.resetSpecificTable(t);
      } else {
        this.selectedTable = t;
        this.loadExistingOrder(t);
      }
    } else {
      if (this.selectedTable && this.selectedTable !== t) {
        alert(`Bạn đang thao tác bàn ${this.selectedTable}. Hãy hoàn tất hoặc hủy trước.`);
        return;
      }

      this.selectedTable = t;
      this.ensureTableData(t);
      this.tableStatus[t] = true;
      this.loadExistingOrder(t);
      this.saveLocal();
    }
  }

  loadExistingOrder(tableNumber: number) {
    const token = localStorage.getItem('accessToken') || '';

    this.http.get<any>('http://localhost:8000/api/waiter/getAllOrders', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const allOrders = res.data || [];
        this.lastAllOrdersData = allOrders;

        const ordersForTable = allOrders.filter((item: any) =>
          item.order.table_number === tableNumber &&
          item.order.isPayment === false &&
          !this.ignoredOrders.includes(item.order._id)
        );

        this.ensureTableData(tableNumber);

        if (ordersForTable.length > 0) {
          this.mergeOrdersIntoCart(ordersForTable, tableNumber);
          this.setTableStatusFromOrders(ordersForTable, tableNumber);
        } else {
          this.completedTables[tableNumber] = this.completedTables[tableNumber] ?? false;
          this.previousServerStatus[tableNumber] = false;
        }

        this.saveLocal();
      },
      error: (err) => console.error('Lỗi tải order:', err)
    });
  }

  private mergeOrdersIntoCart(ordersForTable: any[], tableNumber: number) {
    const allItems: any[] = [];
    const seenProductIds = new Set<string>();

    for (const orderData of ordersForTable) {
      const detailItems = orderData.orderDetail?.items || [];
      
      for (const item of detailItems) {
        if (!seenProductIds.has(item.product_id)) {
          seenProductIds.add(item.product_id);
          const originalProduct = this.products.find(p => p._id === item.product_id);
          
          allItems.push({
            product: {
              _id: item.product_id,
              nameProduct: originalProduct?.nameProduct || 'Món không xác định',
              price: item.unit_price,
              urlImage: originalProduct?.urlImage || 'assets/no-image.png',
              status: true
            },
            quantity: item.quantity
          });
        }
      }
    }

    this.cartByTable[tableNumber].cart = allItems;
  }

  private setTableStatusFromOrders(ordersForTable: any[], tableNumber: number) {
    const latestOrder = ordersForTable.sort((a: any, b: any) => 
      new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
    )[0];

    this.cartByTable[tableNumber].note = latestOrder.order.note || '';
    this.cartByTable[tableNumber].customerName = latestOrder.order.customer_name || '';
    
    const isDone = latestOrder.order.status === true;
    this.completedTables[tableNumber] = isDone;
    this.previousServerStatus[tableNumber] = isDone;
    this.tableOrderIds[tableNumber] = latestOrder.order._id;
    this.tableStatus[tableNumber] = true;
  }

  submitOrder() {
    if (!this.cart.length || !this.selectedTable) {
      alert('Chọn bàn và thêm sản phẩm!');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('Bạn cần đăng nhập!');
      return;
    }

    // ✅ FIX: CHỈ GỬI MÓN MỚI HOẶC SỐ LƯỢNG TĂNG THÊM
    const existingProductIds = this.getExistingProductIds(this.selectedTable);
    const itemsToSubmit: any[] = [];

    for (const cartItem of this.cart) {
      const productId = cartItem.product._id;
      const cartQuantity = cartItem.quantity;
      const existingQuantity = this.existingQuantityMap.get(productId) || 0;
      
      // Chỉ gửi số lượng TĂNG THÊM so với đã order
      if (cartQuantity > existingQuantity) {
        const additionalQuantity = cartQuantity - existingQuantity;
        itemsToSubmit.push({
          ...cartItem,
          quantity: additionalQuantity
        });
        
        console.log(`📝 [submitOrder] ${cartItem.product.nameProduct}: cart=${cartQuantity}, existing=${existingQuantity}, additional=${additionalQuantity}`);
      }
    }

    if (itemsToSubmit.length === 0) {
      alert('Không có món mới để thêm!');
      return;
    }

    const payload = {
      table_number: this.selectedTable,
      note: this.note || '',
      customer_name: this.customerName || '',
      items: itemsToSubmit.map(i => ({
        product_id: i.product._id,
        quantity: i.quantity,
        unit_price: i.product.price
      }))
    };

    console.log('🔍 Submit Order:', { payload, existingIds: Array.from(existingProductIds), newItems: itemsToSubmit.map(i => i.product.nameProduct) });

    this.http.post('http://localhost:8000/api/waiter/createOrder', payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        console.log('✅ Order created:', res);
        alert(res.message || 'Đặt đơn thành công!');

        this.completedTables[this.selectedTable!] = false;
        this.tableStatus[this.selectedTable!] = true;
        this.previousServerStatus[this.selectedTable!] = false;
        if (res.order?._id) this.tableOrderIds[this.selectedTable!] = res.order._id;

        // Thông báo cho Barista về đơn mới (nếu bàn đã có món hoàn thành trước đó)
        const hadPreviousItems = this.getCompletedItemsCountForTable(this.selectedTable!) > 0;
        if (hadPreviousItems) {
          console.log(`🆕 Table ${this.selectedTable} added new items to existing order with completed items`);
          console.log(`   - Previously completed items: ${hadPreviousItems}`);
          console.log(`   - New items added: ${itemsToSubmit.length}`);
        }

        this.saveLocal();
        this.selectedTable = null;
        this.checkRealtimeStatus();
      },
      error: (err) => {
        console.error('❌ Submit Order Error:', err);
        alert('Lỗi tạo đơn: ' + (err.error?.message || err.statusText || 'Unknown error'));
      }
    });
  }

  private getExistingProductIds(tableNumber: number): Set<string> {
    // ✅ FIX: TẠO MAP ĐỂ THEO DÕI SỐ LƯỢNG ĐÃ ORDER
    const productQuantityMap = new Map<string, number>();
    
    const ordersForTable = this.lastAllOrdersData.filter((item: any) => 
      item.order.table_number === tableNumber && 
      item.order.isPayment === false &&
      !this.ignoredOrders.includes(item.order._id)
    );
    
    // Đếm tổng số lượng đã order của từng sản phẩm
    for (const orderData of ordersForTable) {
      const items = orderData.orderDetail?.items || [];
      for (const item of items) {
        const productId = item.product_id;
        const quantity = item.quantity || 1;
        
        const currentQty = productQuantityMap.get(productId) || 0;
        productQuantityMap.set(productId, currentQty + quantity);
      }
    }
    
    console.log(`🔍 [getExistingProductIds] Table ${tableNumber} existing products:`, 
      Array.from(productQuantityMap.entries()));
    
    // Lưu map để sử dụng trong submitOrder()
    this.existingQuantityMap = productQuantityMap;
    
    // Trả về Set rỗng để cho phép order bất kỳ món nào
    return new Set<string>();
  }

  checkRealtimeStatus() {
    const token = localStorage.getItem('accessToken') || '';

    this.http.get<any>('http://localhost:8000/api/waiter/getAllOrders', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const allOrders = res.data || [];
        this.lastAllOrdersData = allOrders;
        let hasChanges = false;

        this.tables.forEach(t => {
          const orderFound = this.getLatestValidOrder(allOrders, t);

          if (orderFound) {
            if (orderFound.order.isPayment === true) {
              console.log(`[WAITER] Bàn ${t} đã thanh toán`);
              this.resetSpecificTable(t);
              return;
            }

            this.tableOrderIds[t] = orderFound.order._id;
            if (!this.tableStatus[t]) {
              this.tableStatus[t] = true;
              hasChanges = true;
            }

            const serverIsDone = orderFound.order.status === true;
            const prevStatus = this.previousServerStatus[t];

            if (prevStatus === false && serverIsDone === true) {
              this.showTemporaryMessage(`🔔 Bàn ${t} đã có nước! Mang ra ngay!`, 5000);
            }

            if (this.completedTables[t] !== serverIsDone) {
              this.completedTables[t] = serverIsDone;
              hasChanges = true;
            }

            this.previousServerStatus[t] = serverIsDone;
          } else {
            if (this.tableStatus[t]) {
              this.tableStatus[t] = false;
              this.completedTables[t] = false;
              delete this.previousServerStatus[t];
              delete this.tableOrderIds[t];
              hasChanges = true;
            }
          }
        });

        if (hasChanges) this.saveLocal();
      },
      error: (err) => {}
    });
  }

  // Method này đã được bỏ, chỉ dùng exitTable()

  resetSpecificTable(t: number) {
    // Tìm TẤT CẢ orders của bàn này và thêm vào ignored list
    if (this.lastAllOrdersData.length > 0) {
      this.lastAllOrdersData
        .filter((item: any) => item.order.table_number === t && item.order.isPayment === false)
        .forEach((item: any) => {
          if (!this.ignoredOrders.includes(item.order._id)) {
            this.ignoredOrders.push(item.order._id);
          }
        });
    } else {
      const currentOrderId = this.tableOrderIds[t];
      if (currentOrderId && !this.ignoredOrders.includes(currentOrderId)) {
        this.ignoredOrders.push(currentOrderId);
      }
    }

    // Clear table data
    delete this.cartByTable[t];
    delete this.tableOrderIds[t];
    delete this.previousServerStatus[t];
    this.tableStatus[t] = false;
    this.completedTables[t] = false;
    
    // Clear Barista completed items through service
    this.baristaStatusService.clearCompletedItemsForTable(t);

    this.saveLocal();
    if (this.selectedTable === t) this.selectedTable = null;
    this.showTemporaryMessage(`Đã hoàn tất bàn ${t}.`);
    setTimeout(() => this.checkRealtimeStatus(), 200);
  }

  // Thoát khỏi bàn hiện tại (không xóa dữ liệu)
  exitTable() {
    this.selectedTable = null;
    this.showTemporaryMessage(`Đã thoát khỏi bàn.`);
  }

  private clearBaristaCompletedItems(tableNumber: number) {
    // This method is now handled by BaristaStatusService
    // Keeping for backward compatibility but delegating to service
    this.baristaStatusService.clearCompletedItemsForTable(tableNumber);
  }

  showTemporaryMessage(msg: string, duration = 3000) {
    this.messageText = msg;
    this.showMessage = true;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.showMessage = false;
      this.messageText = '';
    }, duration);
  }

  confirmPopup(message: string, tableNumber: number): Promise<boolean> {
    this.popupMessage = message;
    this.popupTableNumber = tableNumber;
    this.showConfirmPopup = true;
    return new Promise(resolve => { this.popupResolve = resolve; });
  }

  onPopupOk() {
    if (this.popupTableNumber) this.clearBaristaCompletedItems(this.popupTableNumber);
    if (this.popupResolve) this.popupResolve(true);
    this.closePopup();
  }

  onPopupCancel() {
    if (this.popupResolve) this.popupResolve(false);
    this.closePopup();
  }

  closePopup() {
    this.showConfirmPopup = false;
    this.popupMessage = '';
    this.popupResolve = null;
    this.popupTableNumber = null;
  }

  // ===== BARISTA STATUS INTEGRATION =====
  
  // Kiểm tra bàn có món đang được làm không
  isTableBeingPrepared(tableNumber: number): boolean {
    const completedItems = this.baristaStatusService.getCompletedItemsForTable(tableNumber);
    return completedItems.length > 0;
  }
  
  // Đếm số món đã hoàn thành của bàn
  getCompletedItemsCountForTable(tableNumber: number): number {
    return this.baristaStatusService.getCompletedItemsCount(tableNumber);
  }
  
  // Kiểm tra bàn có đơn hàng chưa hoàn tất không (có trong pending orders của Barista)
  hasActiveBaristaOrder(tableNumber: number): boolean {
    return this.isTableBeingPrepared(tableNumber) || this.tableStatus[tableNumber];
  }
  
  // Lấy trạng thái chi tiết của bàn để hiển thị
  getTableStatusDetail(tableNumber: number): { 
    hasOrder: boolean, 
    isCompleted: boolean, 
    completedItemsCount: number,
    isBeingPrepared: boolean 
  } {
    return {
      hasOrder: this.tableStatus[tableNumber],
      isCompleted: this.completedTables[tableNumber],
      completedItemsCount: this.getCompletedItemsCountForTable(tableNumber),
      isBeingPrepared: this.isTableBeingPrepared(tableNumber)
    };
  }
}