import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class RegisterComponent implements OnInit, OnDestroy {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  role = '';
  currentRole = '';

  // OTP State (chỉ dùng cho user thường)
  otpSent = false;
  otpVerified = false;
  otpCode = '';
  otpLoading = false;
  otpError = '';
  otpSuccess = '';
  
  // Countdown cho resend OTP
  canResend = true;
  resendCountdown = 0;
  private resendTimer?: any;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.currentRole = localStorage.getItem('role') || '';
    if (this.currentRole !== 'cashier') {
      this.role = 'user';
    } else {
      this.role = '';
    }
  }

  sendOTP() {
    this.otpError = '';
    this.otpSuccess = '';

    if (!this.email) {
      this.otpError = 'Vui lòng nhập email';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.otpError = 'Email không hợp lệ';
      return;
    }

    this.otpLoading = true;
    this.authService.sendOTP(this.email).subscribe({
      next: (res) => {
        this.otpLoading = false;
        this.otpSent = true;
        this.otpSuccess = res.message || 'Mã OTP đã được gửi đến email của bạn';
        this.startResendCountdown();
      },
      error: (err) => {
        this.otpLoading = false;
        this.otpError = err.error?.message || 'Gửi OTP thất bại';
      }
    });
  }

  // Xác thực mã OTP
  verifyOTP() {
    this.otpError = '';
    this.otpSuccess = '';

    if (!this.otpCode || this.otpCode.length !== 4) {
      this.otpError = 'Vui lòng nhập mã OTP 4 ký tự';
      return;
    }

    this.otpLoading = true;
    this.authService.verifyOTP(this.email, this.otpCode).subscribe({
      next: (res) => {
        this.otpLoading = false;
        this.otpVerified = true;
        this.otpSuccess = res.message || 'Xác thực email thành công!';
      },
      error: (err) => {
        this.otpLoading = false;
        this.otpError = err.error?.message || 'Mã OTP không chính xác';
      }
    });
  }

  // Resend OTP
  resendOTP() {
    if (!this.canResend) return;
    
    this.otpCode = '';
    this.otpError = '';
    this.otpSuccess = '';
    this.sendOTP();
  }

  // Start countdown timer for resend
  startResendCountdown() {
    this.canResend = false;
    this.resendCountdown = 60; // 60 seconds

    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResend = true;
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  onSubmit() {
    console.log('Submit with role:', this.role);
    console.log('Current role:', this.currentRole);
    
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    // Validate riêng cho Cashier: Bắt buộc phải chọn role
    if (this.currentRole === 'cashier' && !this.role) {
      alert('Vui lòng chọn chức vụ (Role) cho nhân viên mới');
      return;
    }

    // Validate OTP cho user thường
    if (this.currentRole !== 'cashier' && !this.otpVerified) {
      alert('Vui lòng xác thực email trước khi đăng ký');
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
      role: this.role, // User thường = 'user', Cashier tạo nhân viên = role được chọn
    };

    console.log('Register data:', data);

    // Phân biệt API call dựa trên currentRole
    const registerObservable = this.currentRole === 'cashier' 
      ? this.authService.cashierRegister(data)  // Cashier tạo nhân viên (có auth)
      : this.authService.register(data);        // User thường đăng ký (không auth)

    registerObservable.subscribe({
      next: (res) => {
        const successMsg = this.currentRole === 'cashier' 
          ? 'Tạo tài khoản nhân viên thành công!' 
          : 'Đăng ký thành công!';
        alert(successMsg);

        if (this.currentRole !== 'cashier') {
          // User thường: chuyển đến trang login
          this.router.navigate(['/login']);
        } else {
          // Cashier: reset form để tiếp tục tạo nhân viên mới
          this.resetForm();
        }
      },
      error: (err) => {
        console.error('Register error:', err);
        const errorMsg = err.error?.message || err.message || 'Đăng ký thất bại';
        alert(errorMsg);
      }
    });
  }

  resetForm(){
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.role = this.currentRole === 'cashier' ? '' : 'user';

    // Reset OTP state
    this.otpSent = false;
    this.otpVerified = false;
    this.otpCode = '';
    this.otpError = '';
    this.otpSuccess = '';
    this.canResend = true;
    this.resendCountdown = 0;
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  ngOnDestroy() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }
}
