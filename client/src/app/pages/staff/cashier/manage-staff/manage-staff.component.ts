import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-manage-staff.component',
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-staff.component.html',
  styleUrl: './manage-staff.component.scss'
})
export class ManageStaffComponent implements OnInit {
  staffList: any[] = [];
  filteredStaffList: any[] = [];
  paginatedStaffList: any[] = [];
  loading = false;
  error = '';
  successMessage = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 0;
  
  showDeleteModal = false;
  staffToDelete: any = null;

  searchTerm = '';
  selectedRole = '';
  showRoleDropdown = false;

  roleOptions = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'cashier', label: 'Thu ngân' },
    { value: 'barista', label: 'Pha chế' },
    { value: 'waiter', label: 'Phục vụ' },
    { value: 'user', label: 'Khách hàng' }
  ];

  constructor(
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadStaffList();
  }

  loadStaffList(): void {
    this.loading = true;
    this.error = '';
    
    this.authService.getAllUsers().subscribe({
      next: (response) => {
        this.staffList = response.dataUsers || [];
        this.sortStaffByRole();
        this.filterStaff();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Không thể tải danh sách nhân viên';
        this.loading = false;
        console.error('Error loading staff:', error);
      }
    });
  }

  sortStaffByRole(): void {
    const roleOrder = ['cashier', 'barista', 'waiter', 'user'];
    this.staffList.sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.role);
      const bIndex = roleOrder.indexOf(b.role);
      return aIndex - bIndex;
    });
  }

  filterStaff(): void {
    let filtered = [...this.staffList];

    // Filter by role
    if (this.selectedRole) {
      filtered = filtered.filter(staff => staff.role === this.selectedRole);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(staff => 
        staff.username?.toLowerCase().includes(term) ||
        staff.email?.toLowerCase().includes(term) ||
        staff.fullName?.toLowerCase().includes(term) ||
        staff.role?.toLowerCase().includes(term)
      );
    }

    this.filteredStaffList = filtered;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredStaffList.length / this.itemsPerPage);
    
    // Reset to page 1 if current page is beyond total pages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    // Calculate paginated list
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedStaffList = this.filteredStaffList.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageClick(page: number | string): void {
    if (typeof page === 'number' && page !== this.currentPage) {
      this.goToPage(page);
    }
  }

  getStartIndex(): number {
    if (this.filteredStaffList.length === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    const endIndex = this.currentPage * this.itemsPerPage;
    return Math.min(endIndex, this.filteredStaffList.length);
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with dots
      if (this.currentPage <= 3) {
        // Show first few pages
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        // Show last few pages
        pages.push(1);
        pages.push('...');
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show middle pages
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  onRoleSelect(role: string): void {
    this.selectedRole = role;
    this.showRoleDropdown = false;
    this.filterStaff();
  }

  toggleRoleDropdown(): void {
    this.showRoleDropdown = !this.showRoleDropdown;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.role-filter-dropdown')) {
      this.showRoleDropdown = false;
    }
  }



  openDeleteModal(staff: any): void {
    this.staffToDelete = staff;
    this.showDeleteModal = true;
    this.error = '';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.staffToDelete = null;
    this.error = '';
  }

  confirmDelete(): void {
    if (!this.staffToDelete) return;
    
    this.loading = true;
    this.error = '';
    
    this.authService.deleteUser(this.staffToDelete._id).subscribe({
      next: (response) => {
        this.successMessage = 'Xóa nhân viên thành công!';
        this.loadStaffList();
        this.closeDeleteModal();
        this.loading = false;
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.error = 'Có lỗi xảy ra khi xóa nhân viên';
        this.loading = false;
        console.error('Error deleting staff:', error);
      }
    });
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'waiter': 'Phục vụ',
      'barista': 'Pha chế',
      'cashier': 'Thu ngân',
      'user': 'Khách hàng'
    };
    return roleMap[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const classMap: { [key: string]: string } = {
      'waiter': 'badge-waiter',
      'barista': 'badge-barista', 
      'cashier': 'badge-cashier',
      'user': 'badge-user'
    };
    return classMap[role] || 'badge-default';
  }

  getRoleIcon(role: string): string {
    const iconMap: { [key: string]: string } = {
      'waiter': 'fa-concierge-bell',
      'barista': 'fa-coffee',
      'cashier': 'fa-cash-register',
      'user': 'fa-user-circle'
    };
    return iconMap[role] || 'fa-user';
  }

  trackByStaffId(index: number, staff: any): any {
    return staff._id || staff.id;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Chưa cập nhật';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
