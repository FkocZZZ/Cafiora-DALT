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

  // Slide titles and descriptions
  getSlideTitles(): string[] {
    return [
      'Welcome to Cafiora',
      'Premium Coffee Experience',
      'Cozy Atmosphere',
      'Fresh & Quality'
    ];
  }

  getSlideDescriptions(): string[] {
    return [
      'Discover the perfect blend of taste and comfort in our coffee sanctuary',
      'Crafted with the finest beans, roasted to perfection for your enjoyment',
      'A peaceful corner to relax, work, and connect with friends',
      'Only the freshest ingredients and highest quality coffee for our guests'
    ];
  }

  currentIndex = 0;
  intervalMs = 2000;
  private timerId: any = null;
  loading:boolean = false;
  currentMenuIndex = 0;
  itemsPerPage = 4;
  isMobile = false;
  private resizeTimeout: any;

  //menu
  products: Product[] = [];
  error = '';
  private _cachedMobileGroups: Product[][] = [];
  private _lastProductsLength = 0;

  get trackTransform(): string {
    return `translateX(-${this.currentIndex * 100}%)`;
  }
  ngOnInit(): void {
    this.play();
    this.getProduct();
    this.checkScreenSize();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  ngOnDestroy(): void {
    this.clearTimer();
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      this.checkScreenSize();
    }, 100);
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

  checkScreenSize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    
    // Reset menu index when screen size changes to prevent flicker
    if (wasMobile !== this.isMobile) {
      this.currentMenuIndex = 0;
    } else if (this.currentMenuIndex > this.maxMenuIndex) {
      this.currentMenuIndex = Math.max(0, this.maxMenuIndex);
    }
  }

  // Group products for mobile 2x2 layout (returns Product[][]) - cached to prevent re-rendering
  get mobileGroupedProducts(): Product[][] {
    // Only recalculate if products length changed
    if (this._lastProductsLength !== this.products.length) {
      this._cachedMobileGroups = [];
      for (let i = 0; i < this.products.length; i += 4) {
        this._cachedMobileGroups.push(this.products.slice(i, i + 4));
      }
      this._lastProductsLength = this.products.length;
    }
    return this._cachedMobileGroups;
  }

  // Products for desktop layout (returns Product[])
  get desktopProducts(): Product[] {
    return this.products;
  }

  //render menu items
  get menuTransform() {
    // If we can't navigate (<=4 items), don't transform
    if (!this.canNavigateMenu) {
      return 'translateX(0%)';
    }
    
    if (this.isMobile) {
      // For mobile, move by 100% per group (4 items)
      const safeIndex = Math.min(this.currentMenuIndex, this.maxMenuIndex);
      return `translateX(-${safeIndex * 100}%)`;
    } else {
      // For desktop/tablet, move by item width percentage
      const itemsPerView = window.innerWidth <= 1024 ? 3 : 4;
      const movePercentage = 100 / itemsPerView;
      const safeIndex = Math.min(this.currentMenuIndex, this.maxMenuIndex);
      return `translateX(-${safeIndex * movePercentage}%)`;
    }
  }


  getProduct(){
    this.loading = true;
    this.http.get<any>('http://localhost:8000/api/getProduct').subscribe({
      next:(res) =>{
        this.products = res.dataProduct || [];
        this.loading = false;
        // Reset cache when products change
        this._cachedMobileGroups = [];
        this._lastProductsLength = 0;
      },
      error:(err)=>{
        console.log('Lỗi khi lấy dữ liệu:', err);
        this.error = 'Không thể tải danh sách sản phẩm.';
        this.loading = false;
      }
    })
  }



  nextMenu() {
    if (!this.canNavigateMenu) return;
    
    // Use requestAnimationFrame to ensure smooth animation
    requestAnimationFrame(() => {
      if (this.currentMenuIndex < this.maxMenuIndex) {
        this.currentMenuIndex++;
      } else {
        this.currentMenuIndex = 0; // loop back to start
      }
    });
  }

  prevMenu() {
    if (!this.canNavigateMenu) return;
    
    // Use requestAnimationFrame to ensure smooth animation
    requestAnimationFrame(() => {
      if (this.currentMenuIndex > 0) {
        this.currentMenuIndex--;
      } else {
        this.currentMenuIndex = this.maxMenuIndex; // loop back to end
      }
    });
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

  get canNavigateMenu(): boolean {
    if (this.isMobile) {
      return this.products.length > 4;
    } else {
      const itemsPerView = window.innerWidth <= 1024 ? 3 : 4;
      return this.products.length > itemsPerView;
    }
  }

  get maxMenuIndex(): number {
    if (this.isMobile) {
      return Math.max(0, Math.ceil(this.products.length / 4) - 1);
    } else {
      const itemsPerView = window.innerWidth <= 1024 ? 3 : 4;
      return Math.max(0, this.products.length - itemsPerView);
    }
  }

  // TrackBy functions to prevent unnecessary re-rendering
  trackByProductId(index: number, product: Product): string {
    return product._id;
  }

  trackByGroupIndex(index: number, group: Product[]): string {
    return `group-${index}-${group.map(p => p._id).join('-')}`;
  }

}
