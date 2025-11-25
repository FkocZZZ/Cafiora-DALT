import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginResponse {
  accessToken: string;
  role: string;
  username: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/users';
  private apiUrlCashier = 'http://localhost:8000/api/cashier';

  constructor(private http: HttpClient) {}

  // ------------------ TOKEN HELPER ------------------
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // ------------------ AUTH ------------------
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { email, password },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      }
    );
  }

  // Khi đăng nhập thành công, bạn cần gọi hàm này
  saveToken(token: string) {
    localStorage.setItem('accessToken', token);
  }

  // ------------------ REGISTER ------------------
  register(data: any): Observable<any> {
    const headers = this.getAuthHeaders().set('Content-Type', 'application/json');

    return this.http.post(
      `${this.apiUrlCashier}/cashierRegister`,
      data,
      { headers, withCredentials: true }
    );
  }

  // ------------------ PRODUCT ------------------
  getAllProducts(): Observable<any> {
    return this.http.get(
      `${this.apiUrlCashier.replace('/cashier', '')}/getProduct`,
      { headers: this.getAuthHeaders() }
    );
  }

  uploadProduct(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrlCashier}/uploadProduct`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  updateProduct(id: string, formData: FormData): Observable<any> {
    return this.http.put(
      `${this.apiUrlCashier}/updateProduct/${id}`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrlCashier}/deleteProduct/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
