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
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  products: Product[] = [];
  cart: { product: Product; quantity: number }[] = [];
  loading = false;
  error = '';
  tables = [1, 2, 3, 4, 5, 6, 7, 8];
  selectedTable: number | null = null;
  note = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
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


}
