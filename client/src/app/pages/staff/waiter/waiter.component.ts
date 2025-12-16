import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from "@angular/forms";
import { BaristaStatusService } from '../../../services/barista-status.service';

interface Product {
  _id: string;
  nameProduct: string;
  price: number;
  status: boolean;
  urlImage: string;
}

interface TableCart {
  cart: { product: Product; quantity: number }[];
  note:string;
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

  
  // Theo dõi số lượng sản phẩm đã order của bàn
  private existingQuantityMap = new Map<string, number>();

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
    
    // Note: Waiter không cần subscribe barista status changes
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
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

        this.error = 'Không thể tải sản phẩm';
        this.loading = false;
      }
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/no-image.png';
  }

  // --- GETTERS / SETTERS ---
  get cart() { return this.selectedTable ? (this.cartByTable[this.selectedTable]?.cart ?? []) : []; }
  get note() { return this.selectedTable ? (this.cartByTable[this.selectedTable]?.note ?? '') : ''; }  
  get customerName() { return this.selectedTable ? (this.cartByTable[this.selectedTable]?.customerName ?? '') : ''; }
  get totalItems() { return this.cart.reduce((sum, i) => sum + i.quantity, 0); }
  get totalPrice() { return this.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0); }

  set cart(val: { product: Product; quantity: number }[]) { 
    this.updateTableData('cart', val); 
  }
  set note(val: string) { 
    this.updateTableData('note', val); 
  }
  set customerName(val: string) { 
    this.updateTableData('customerName', val); 
  }

  private updateTableData(field: keyof TableCart, val: any) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable][field] = val;
    this.saveLocal();
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

  increaseQuantity(item: any) { item.quantity++; this.cart = [...this.cart]; }
  decreaseQuantity(item: any) { 
    item.quantity > 1 ? item.quantity-- : this.cart = this.cart.filter(i => i.product._id !== item.product._id); 
  }

  getLatestValidOrder(allOrders: any[], tableNumber: number) {
    const ordersForTable = allOrders
      .filter(item => item.order.table_number === tableNumber && !item.order.isPayment && !this.ignoredOrders.includes(item.order._id))
      .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime());
    return ordersForTable[0] || null;
  }

  async selectTable(t: number) {
    if (this.tableStatus[t]) {
      const action = await this.confirmPopup(`Bàn ${t} đang phục vụ. Nhấn xanh lá để XÓA BÀN hoặc Đỏ để xem đơn cũ.`, t);
      action ? this.resetSpecificTable(t) : (this.selectedTable = t, this.loadExistingOrder(t));
    } else {
      if (this.selectedTable && this.selectedTable !== t) return alert(`Bạn đang thao tác bàn ${this.selectedTable}. Hãy hoàn tất hoặc hủy trước.`);
      this.selectedTable = t;
      this.ensureTableData(t);
      this.existingQuantityMap.clear();
      this.tableStatus[t] = true;
      this.loadExistingOrder(t);
      this.saveLocal();
    }
  }

  loadExistingOrder(tableNumber: number) {
    this.http.get<any>('http://localhost:8000/api/waiter/getAllOrders', {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` }
    }).subscribe({
      next: (res) => {
        this.lastAllOrdersData = res.data || [];
        const ordersForTable = this.lastAllOrdersData.filter(item =>
          item.order.table_number === tableNumber && !item.order.isPayment && !this.ignoredOrders.includes(item.order._id)
        );
        this.ensureTableData(tableNumber);
        ordersForTable.length > 0 ? this.mergeOrdersIntoCart(ordersForTable, tableNumber) : 
          (this.completedTables[tableNumber] = false, this.previousServerStatus[tableNumber] = false);
        this.saveLocal();
      },
      error: () => {}
    });
  }

  private mergeOrdersIntoCart(ordersForTable: any[], tableNumber: number) {
    const allItems: any[] = [];
    const seenProductIds = new Set<string>();
    const latestOrder = ordersForTable.sort((a, b) => 
      new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
    )[0];

    // Merge items và set table status trong 1 loop
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

    // Update table data
    this.cartByTable[tableNumber] = {
      cart: allItems,
      note: latestOrder.order.note || '',
      customerName: latestOrder.order.customer_name || ''
    };
    
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

    this.getExistingProductIds(this.selectedTable);
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



    this.http.post('http://localhost:8000/api/waiter/createOrder', payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        alert(res.message || 'Đặt đơn thành công!');

        this.completedTables[this.selectedTable!] = false;
        this.tableStatus[this.selectedTable!] = true;
        this.previousServerStatus[this.selectedTable!] = false;
        if (res.order?._id) this.tableOrderIds[this.selectedTable!] = res.order._id;



        this.saveLocal();
        this.selectedTable = null;
        this.checkRealtimeStatus();
      },
      error: (err) => {

        alert('Lỗi tạo đơn: ' + (err.error?.message || err.statusText || 'Unknown error'));
      }
    });
  }

  private getExistingProductIds(tableNumber: number): void {
    const productQuantityMap = new Map<string, number>();
    
    const ordersForTable = this.lastAllOrdersData.filter((item: any) => 
      item.order.table_number === tableNumber && 
      item.order.isPayment === false &&
      !this.ignoredOrders.includes(item.order._id)
    );
    
    for (const orderData of ordersForTable) {
      const items = orderData.orderDetail?.items || [];
      for (const item of items) {
        const productId = item.product_id;
        const quantity = item.quantity || 1;
        
        const currentQty = productQuantityMap.get(productId) || 0;
        productQuantityMap.set(productId, currentQty + quantity);
      }
    }
    this.existingQuantityMap = productQuantityMap;
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
          // KIỂM TRA XEM CÓ ORDER NÀO VỪA ĐƯỢC THANH TOÁN KHÔNG (bỏ qua filter isPayment)
          const allOrdersForTable = allOrders.filter((item: any) => 
            item.order.table_number === t && 
            !this.ignoredOrders.includes(item.order._id)
          );
          
          // Tìm order vừa được thanh toán
          const paidOrder = allOrdersForTable.find((item: any) => 
            item.order.isPayment === true && 
            this.tableStatus[t] === true // Bàn đang phục vụ nhưng vừa được thanh toán
          );
          
          if (paidOrder) {

            
            // Hiển thị thông báo thanh toán 3 giây
            this.showTemporaryMessage(`🎉 Bàn ${t} đã thanh toán thành công! Đang reset bàn về trạng thái mới...`, 3000);
            
            // Reset hoàn toàn thông tin bàn
            this.resetSpecificTable(t);
            return;
          }
          
          // Logic cũ cho các bàn chưa thanh toán
          const orderFound = this.getLatestValidOrder(allOrders, t);

          if (orderFound) {

            this.tableOrderIds[t] = orderFound.order._id;
            if (!this.tableStatus[t]) {
              this.tableStatus[t] = true;
              hasChanges = true;
            }

            const serverIsDone = orderFound.order.status === true;
            const prevStatus = this.previousServerStatus[t];

            if (prevStatus === false && serverIsDone === true) {
              this.showTemporaryMessage(`Bàn ${t} đã có nước! Mang ra ngay!`, 5000);
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

  resetSpecificTable(t: number) {

    
    // THÊM TẤT CẢ ORDERS (bao gồm cả đã thanh toán) vào ignored list để không load lại
    if (this.lastAllOrdersData.length > 0) {
      this.lastAllOrdersData
        .filter((item: any) => item.order.table_number === t) // Bỏ filter isPayment để ignore tất cả orders
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

    delete this.cartByTable[t];           // Xóa giỏ hàng
    delete this.tableOrderIds[t];         // Xóa order IDs
    delete this.previousServerStatus[t];  // Xóa server status cũ
    this.tableStatus[t] = false;          // Đặt bàn về trống
    this.completedTables[t] = false;      // Reset completed status
    
    // Clear existing quantity map để không nhớ món cũ
    this.existingQuantityMap.clear();
    
    // Clear Barista completed items through service
    this.baristaStatusService.clearCompletedItemsForTable(t);

    // FORCE RESET - Tạo lại table data hoàn toàn mới
    this.ensureTableData(t);
    this.cartByTable[t] = { cart: [], note: '', customerName: '' };

    this.saveLocal();
    
    // Nếu đang chọn bàn này thì bỏ chọn
    if (this.selectedTable === t) {
      this.selectedTable = null;
    }
    
    console.log(`[RESET] Bàn ${t} đã được reset hoàn toàn - trạng thái mới tinh!`);
    
    // Hiển thị thông báo xác nhận reset
    setTimeout(() => {
      this.showTemporaryMessage(`Bàn ${t} đã sẵn sàng cho khách hàng mới!`, 2000);
    }, 500);
    
    // Refresh data sau khi reset
    setTimeout(() => this.checkRealtimeStatus(), 1000);
  }

  // Thoát khỏi bàn hiện tại (không xóa dữ liệu)
  exitTable() {
    this.selectedTable = null;
    this.showTemporaryMessage(`Đã thoát khỏi bàn.`);
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
    this.popupTableNumber && this.baristaStatusService.clearCompletedItemsForTable(this.popupTableNumber);
    this.popupResolve?.(true);
    this.closePopup();
  }
  onPopupCancel() { this.popupResolve?.(false); this.closePopup(); }
  closePopup() { Object.assign(this, { showConfirmPopup: false, popupMessage: '', popupResolve: null, popupTableNumber: null }); }
  
  isTableBeingPrepared = (n: number) => this.baristaStatusService.getCompletedItemsForTable(n).length > 0;
  getCompletedItemsCountForTable = (n: number) => this.baristaStatusService.getCompletedItemsCount(n);
  hasActiveBaristaOrder = (n: number) => this.isTableBeingPrepared(n) || this.tableStatus[n];
  getTableStatusDetail = (n: number) => ({
    hasOrder: this.tableStatus[n],
    isCompleted: this.completedTables[n],
    completedItemsCount: this.getCompletedItemsCountForTable(n),
    isBeingPrepared: this.isTableBeingPrepared(n)
  });
}