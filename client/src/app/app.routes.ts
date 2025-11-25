import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { HeaderComponent } from './pages/header/header.component';
import { AboutComponent } from './pages/about/about.component';
import { MenuComponent } from './pages/menu/menu.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { FooterComponent } from "./pages/footer/footer.component";
import { RegisterComponent } from './pages/auth/register/register.component';
import { BaristaComponent } from './pages/staff/barista/barista.component';
import { CashierComponent } from './pages/staff/cashier/cashier.component';
import { WaiterComponent } from './pages/staff/waiter/waiter.component';
import { CreateAccountComponent } from './pages/staff/cashier/create-account/create-account.component';
import { ViewRevenueComponent } from './pages/staff/cashier/view-revenue/view-revenue.component';
import { PrintInvoiceComponent } from './pages/staff/cashier/invoice/print-invoice/print-invoice.component';
import {EditDrinkComponent} from './pages/staff/cashier/edit-drink/edit-drink.component';
export const routes: Routes = [
  {
    path: '',
    component: HeaderComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'menu', component: MenuComponent },
      { path: 'about', component: AboutComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'footer', component: FooterComponent}
    ],
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path :'waiter', component: WaiterComponent},

  { path :'barista/:status',
    loadComponent: () => import('./pages/staff/barista/barista.component').then(m => m.BaristaComponent),
  },
  { path: 'barista', redirectTo: 'barista/new', pathMatch: 'full' },

  { path: 'cashier',
    loadComponent: () => import('./pages/staff/cashier/cashier.component').then(m => m.CashierComponent),
    children: [
      { path: '', redirectTo: 'view-revenue', pathMatch: 'full'},
      { path: 'create-account', component: CreateAccountComponent },
      { path: 'view-revenue', component: ViewRevenueComponent },
      { path: 'print-invoice', component: PrintInvoiceComponent },
      { path: 'edit-drink', component: EditDrinkComponent }
    ]
   },
  { path: '**', redirectTo: 'home' },
];

