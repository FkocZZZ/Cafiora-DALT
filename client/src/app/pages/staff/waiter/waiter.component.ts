import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from "@angular/forms";

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

  showMessage = false;
  messageText = '';
  private messageTimeout: any;
  private refreshInterval: any;

  private previousServerStatus: { [key: number]: boolean | undefined } = {};

  cartByTable: { [table: number]: TableCart } = {};

  showConfirmPopup = false;
  popupTableNumber: number | null = null;
  popupMessage = '';
  popupResolve: ((action: boolean) => void) | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const savedTableStatus = localStorage.getItem('tableStatus');
    this.tableStatus = savedTableStatus ? JSON.parse(savedTableStatus) : {};

    const savedCompleted = localStorage.getItem('completedTables');
    this.completedTables = savedCompleted ? JSON.parse(savedCompleted) : {};

    const savedCartByTable = localStorage.getItem('cartByTable');
    this.cartByTable = savedCartByTable ? JSON.parse(savedCartByTable) : {};

    const savedIgnored = localStorage.getItem('ignoredOrders');
    this.ignoredOrders = savedIgnored ? JSON.parse(savedIgnored) : [];

    this.tables.forEach(t => {
      if (!(t in this.tableStatus)) this.tableStatus[t] = false;
      if (!(t in this.completedTables)) this.completedTables[t] = false;
    });

    this.getProducts();

    this.checkRealtimeStatus();

    this.refreshInterval = setInterval(() => {
      this.checkRealtimeStatus();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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
    if (!this.selectedTable) return [];
    return this.cartByTable[this.selectedTable]?.cart ?? [];
  }

  set cart(val: { product: Product; quantity: number }[]) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable].cart = val;
    this.saveLocal();
  }

  get note() {
    if (!this.selectedTable) return '';
    return this.cartByTable[this.selectedTable]?.note ?? '';
  }

  set note(val: string) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable].note = val;
    this.saveLocal();
  }

  get customerName() {
    if (!this.selectedTable) return '';
    return this.cartByTable[this.selectedTable]?.customerName ?? '';
  }

  set customerName(val: string) {
    if (!this.selectedTable) return;
    this.ensureTableData(this.selectedTable);
    this.cartByTable[this.selectedTable].customerName = val;
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

  increaseQuantity(item: any) {
    item.quantity++;
    this.cart = [...this.cart];
  }

  decreaseQuantity(item: any) {
    if (item.quantity > 1) item.quantity--;
    else this.cart = this.cart.filter(i => i.product._id !== item.product._id);
  }

  get totalItems() {
    return this.cart.reduce((sum, i) => sum + i.quantity, 0);
  }

  get totalPrice() {
    return this.cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }

  // --- HÀM MỚI: TÌM ĐƠN HÀNG MỚI NHẤT ---
  // Giúp lọc bỏ các đơn cũ, đơn ảo, chỉ lấy 1 cái mới nhất
  getLatestValidOrder(allOrders: any[], tableNumber: number) {
    // 1. Lọc tất cả các đơn thuộc bàn này VÀ chưa thanh toán VÀ chưa bị chặn
    const ordersForTable = allOrders.filter((item: any) =>
      item.order.table_number === tableNumber &&
      item.order.isPayment === false &&
      !this.ignoredOrders.includes(item.order._id)
    );

    if (ordersForTable.length === 0) return null;

    // 2. Sắp xếp giảm dần theo ngày tạo (Mới nhất lên đầu)
    // Dùng createdAt để so sánh
    ordersForTable.sort((a: any, b: any) => {
      const dateA = new Date(a.order.createdAt).getTime();
      const dateB = new Date(b.order.createdAt).getTime();
      return dateB - dateA; // Giảm dần
    });

    // 3. Trả về cái đầu tiên (Mới nhất)
    return ordersForTable[0];
  }

  // --- LOGIC CHỌN BÀN ---
  async selectTable(t: number) {
    if (this.tableStatus[t]) {
      const action = await this.confirmPopup(
        `Bàn ${t} đang phục vụ. Nhấn OK để XÓA BÀN (Hoàn tất) hoặc Hủy để xem đơn.`,
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

        // DÙNG HÀM LỌC MỚI
        const targetOrder = this.getLatestValidOrder(allOrders, tableNumber);

        this.ensureTableData(tableNumber);

        if (targetOrder) {
          // Map đúng món từ đơn hàng tìm được
          const detailItems = targetOrder.orderDetail?.items || [];

          this.cartByTable[tableNumber].cart = detailItems.map((i: any) => {
            const originalProduct = this.products.find(p => p._id === i.product_id);
            return {
              product: {
                _id: i.product_id,
                nameProduct: originalProduct ? originalProduct.nameProduct : 'Món không xác định',
                price: i.unit_price,
                urlImage: originalProduct ? originalProduct.urlImage : 'assets/no-image.png',
                status: true
              },
              quantity: i.quantity
            };
          });

          this.cartByTable[tableNumber].note = targetOrder.order.note || '';
          this.cartByTable[tableNumber].customerName = targetOrder.order.customer_name || '';

          const isDone = targetOrder.order.status === true;
          this.completedTables[tableNumber] = isDone;
          this.previousServerStatus[tableNumber] = isDone;

          this.tableOrderIds[tableNumber] = targetOrder.order._id;
          this.tableStatus[tableNumber] = true;
        } else {
          // Nếu không tìm thấy đơn nào hợp lệ -> Coi như bàn trống
          // Reset nhẹ các trạng thái UI
          if (this.completedTables[tableNumber] === undefined) {
            this.completedTables[tableNumber] = false;
          }
          this.previousServerStatus[tableNumber] = false;
        }

        this.saveLocal();
      },
      error: (err) => console.error('Lỗi tải order:', err)
    });
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

    const payload = {
      table_number: this.selectedTable,
      note: this.note,
      customer_name: this.customerName,
      items: this.cart.map(i => ({
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

        if (res.order && res.order._id) {
          this.tableOrderIds[this.selectedTable!] = res.order._id;
        }

        this.saveLocal();
        this.selectedTable = null;

        this.checkRealtimeStatus();
      },
      error: (err) => {
        console.error(err);
        alert('Lỗi tạo đơn: ' + (err.error?.message || err.statusText));
      }
    });
  }

  // --- POLLING ---
  checkRealtimeStatus() {
    const token = localStorage.getItem('accessToken') || '';

    this.http.get<any>('http://localhost:8000/api/waiter/getAllOrders', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const allOrders = res.data || [];
        let hasChanges = false;

        this.tables.forEach(t => {
          if (t === this.selectedTable) return;

          // DÙNG HÀM LỌC MỚI -> Đảm bảo logic giống hệt lúc load
          const orderFound = this.getLatestValidOrder(allOrders, t);

          if (orderFound) {
            // === CÓ ĐƠN MỚI NHẤT ===
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
            // === KHÔNG CÓ ĐƠN NÀO HỢP LỆ (Đã chặn hết hoặc đã thanh toán hết) ===
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

  resetCurrentTable() {
    if (!this.selectedTable) return;
    this.resetSpecificTable(this.selectedTable);
  }

  resetSpecificTable(t: number) {
    const orderIdToIgnore = this.tableOrderIds[t];

    if (orderIdToIgnore) {
      if (!this.ignoredOrders.includes(orderIdToIgnore)) {
        this.ignoredOrders.push(orderIdToIgnore);
      }
    }

    delete this.cartByTable[t];
    delete this.tableOrderIds[t];
    this.tableStatus[t] = false;
    this.completedTables[t] = false;
    delete this.previousServerStatus[t];

    this.saveLocal();

    if (this.selectedTable === t) {
      this.selectedTable = null;
    }
    this.showTemporaryMessage(`Đã hoàn tất bàn ${t}.`);

    setTimeout(() => this.checkRealtimeStatus(), 500);
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
    return new Promise(resolve => {
      this.popupResolve = resolve;
    });
  }

  onPopupOk() {
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
}
