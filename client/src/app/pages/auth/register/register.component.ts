import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  role = '';
  currentRole = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.currentRole = localStorage.getItem('role') || '';

    if (this.currentRole !== 'cashier') {
      this.role = 'user';
    }
  }

  onSubmit() {
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    // Validate riêng cho Cashier: Bắt buộc phải chọn role
    if (this.currentRole === 'cashier' && !this.role) {
      alert('Vui lòng chọn chức vụ (Role) cho nhân viên mới');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }

    const data = {
      username: this.username,
      email: this.email,
      password: this.password,
      role: this.role, // Giá trị này đã được xử lý ở ngOnInit hoặc dropdown
    };

    this.authService.register(data).subscribe({
      next: (res) => {
        alert('Đăng ký thành công!');

        if (this.currentRole !== 'cashier') {
          this.router.navigate(['/login']);
        } else {
          this.resetForm();
        }
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || 'Đăng ký thất bại');
      }
    });
  }

  resetForm(){
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.role = this.currentRole === 'cashier' ? '' : 'user';

  }
}
