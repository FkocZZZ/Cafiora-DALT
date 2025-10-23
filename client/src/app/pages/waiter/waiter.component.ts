import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DecimalPipe } from '@angular/common';
import {FormsModule } from "@angular/forms";


interface Product {
  _id: string;
  nameProduct: string;
  price: number;
  status: boolean;
  urlImage: string;
}
@Component({
  selector: 'app-waiter',
  imports: [CommonModule, DecimalPipe, FormsModule ],
  templateUrl: './waiter.component.html',
  styleUrl: './waiter.component.scss'
})

export class WaiterComponent implements OnInit {
  products: Product[] = [];
  cart: { product: Product; quantity: number }[] = [];
  loading = false;
  error = '';
  tables = [1, 2, 3, 4, 5, 6, 7, 8];
  tableStatus: { [key: number]: boolean } = {};
  selectedTable: number | null = null;
  note = '';


  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('tableStatus');
    if(saved) {
      this.tableStatus = JSON.parse(saved);
    } else {
      this.tables.forEach(t => this.tableStatus[t] = false);
    }

    this.getProducts();
  }

  getProducts() {
    this.loading = true;
    this.http.get<any>('http://localhost:8000/api/getProduct').subscribe({
      next: (res) => {
        this.products = res.dataProduct || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Lỗi khi lấy dữ liệu:', err);
        this.error = 'Không thể tải danh sách sản phẩm.';
        this.loading = false;
      }
    });
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/no-image.png';
  }

  selectProduct(product: Product) {
    const existing = this.cart.find(i => i.product._id === product._id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ product, quantity: 1 });
    }
  }

  increaseQuantity(item: any) {
    item.quantity++;
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

  submitOrder() {
    if (!this.cart.length) {
      alert('Giỏ hàng trống!');
      return;
    }
    if (!this.selectedTable) {
      alert('Vui lòng chọn bàn!');
      return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
      alert('Bạn cần đăng nhập trước!');
      return;
    }

    const payload = {
      table_number: this.selectedTable,
      note: this.note,
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
        this.cart = [];
        this.selectedTable = null;
        this.note = '';
      },
      error: (err) => {
        console.error('Lỗi tạo đơn:', err);
        if (err.status === 401) {
          alert('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập!');
        } else {
          alert('Lỗi khi gửi đơn hàng!');
        }
      }
    });
  }

  selectTable(t: number) {
    if (this.tableStatus[t]) {
      const confirmLeave = confirm(`Khách ở bàn ${t} đã rời đi?`);
      if (confirmLeave) {
        this.tableStatus[t] = false;
        localStorage.setItem('tableStatus', JSON.stringify(this.tableStatus));
      }
    } else {
      this.tableStatus[t] = true;
      this.selectedTable = t;
      localStorage.setItem('tableStatus', JSON.stringify(this.tableStatus));
    }
  }

}
