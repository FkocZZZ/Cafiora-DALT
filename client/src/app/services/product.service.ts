import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product, GetProductsResponse } from '../../app/model/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private base = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // trả về mảng Product, map từ { dataProduct: [...] }
  getProducts(): Observable<Product[]> {
    return this.http.get<GetProductsResponse>(`${this.base}/getProduct`)
      .pipe(
        map(res => res.dataProduct || [])
      );
  }

  // nếu cần, get riêng 1 product
  getProductById(id: string): Observable<Product | null> {
    return this.getProducts().pipe(
      map(list => list.find(p => p._id === id) ?? null)
    );
  }
}
