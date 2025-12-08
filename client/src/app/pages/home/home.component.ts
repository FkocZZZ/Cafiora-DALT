import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {FooterComponent} from '../footer/footer.component';
import { HttpClient } from '@angular/common/http';



interface Product{
  _id: string;
  nameProduct: string;
  price: number;
  status: boolean;
  urlImage: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})

export class HomeComponent implements OnInit, OnDestroy {

  constructor(private http: HttpClient,
              private router: Router)
  {}

  images: string[] = [
    'assets/Carousel1.png',
    'assets/Carousel2.png',
    'assets/Carousel3.png',
    'assets/Carousel4.png',
  ];

  currentIndex = 0;
  intervalMs = 2000;
  private timerId: any = null;
  loading:boolean = false;
  currentMenuIndex = 0;
  itemsPerPage = 3;

  //menu
  products: Product[] = [];
  error = '';

  get trackTransform(): string {
    return `translateX(-${this.currentIndex * 100}%)`;
  }
  ngOnInit(): void {
    this.play();
    this.getProduct()
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  play(): void {
    this.clearTimer();
    this.timerId = setInterval(() => this.next(), this.intervalMs);
  }

  pause(): void {
    this.clearTimer();
  }

  clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prev(): void {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  goTo(i: number): void {
    this.currentIndex = i;
    this.play();
  }

  //render menu items
  get menuTransform() {
    return `translateX(-${(this.currentMenuIndex * 100) / this.itemsPerPage}%)`;
  }


  getProduct(){
    this.loading = true;
    this.http.get<any>('http://localhost:8000/api/getProduct').subscribe({
      next:(res) =>{
        this.products = res.dataProduct || [];
        this.loading = false;
      },
      error:(err)=>{
        console.log('Lỗi khi lấy dữ liệu:', err);
        this.error = 'Không thể tải danh sách sản phẩm.';
        this.loading = false;
      }
    })
  }



  nextMenu() {
    const maxIndex = this.products.length - this.itemsPerPage;
    if (this.currentMenuIndex < maxIndex) {
      this.currentMenuIndex++;
    } else {
      this.currentMenuIndex = 0; // nếu muốn loop
    }
    this.updateMenuTrack();
  }

  prevMenu() {
    const maxIndex = this.products.length - this.itemsPerPage;
    if (this.currentMenuIndex > 0) {
      this.currentMenuIndex--;
    } else {
      this.currentMenuIndex = maxIndex; // nếu muốn loop
    }
    this.updateMenuTrack();
  }

  updateMenuTrack() {
    const track = document.querySelector('.menu-track') as HTMLElement;
    const item = document.querySelector('.menu-item') as HTMLElement;
    const gap = 60;
    const itemWidth = item.offsetWidth + gap;

    track.style.transform = `translateX(-${this.currentMenuIndex * itemWidth}px)`;
  }


  selectProduct(product: Product){
    this.router.navigate(['/menu']);
  }

}
