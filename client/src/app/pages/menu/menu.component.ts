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
  category: string;
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
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];
  cart: { product: Product; quantity: number }[] = [];
  loading = false;
  error = '';

  categories: string[] = ['Coffee', 'Tea', 'Juice', 'Food', 'Other'];
  selectedCategory: string = '';
  selectedPriceSort: string = '';
  searchKeyword: string = '';

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 4;
  totalPages: number = 0;
  isTransitioning: boolean = false;


  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getProducts();
  }

  getProducts() {
    this.loading = true;
    this.http.get<any>('http://localhost:8000/api/getProduct').subscribe({
      next: (res) => {
        this.products = res.dataProduct || [];
        this.filteredProducts = [...this.products];
        this.updatePagination();
        this.loading = false;
      },
      error: (err) => {
        console.error('Lỗi khi lấy dữ liệu:', err);
        this.error = 'Không thể tải danh sách sản phẩm.';
        this.loading = false;
      }
    });
  }

  filterProducts() {
    let temp = [...this.products];

    // Lọc theo category
    if (this.selectedCategory) {
      temp = temp.filter(p => p.category === this.selectedCategory);
    }

    // Sắp xếp theo giá
    if (this.selectedPriceSort === 'asc') {
      temp.sort((a, b) => a.price - b.price);
    } else if (this.selectedPriceSort === 'desc') {
      temp.sort((a, b) => b.price - a.price);
    }

    //tim kiem theo tu khoa
    if(this.searchKeyword.trim() !== ''){
      const keyword = this.searchKeyword.trim().toLowerCase();
      temp = temp.filter(p => p.nameProduct.toLowerCase().includes(keyword));
    }


    this.filteredProducts = temp;
    this.currentPage = 1; // Reset về trang đầu khi filter
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    
    this.isTransitioning = true;
    setTimeout(() => {
      this.currentPage = page;
      this.updatePagination();
      this.isTransitioning = false;
    }, 150);
  }

  getPaginationArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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

