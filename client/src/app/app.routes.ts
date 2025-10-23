import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { HeaderComponent } from './pages/header/header.component';
import { AboutComponent } from './pages/about/about.component';
import { MenuComponent } from './pages/menu/menu.component';
import { LoginComponent } from './pages/login/login.component';
import {FooterComponent} from "./pages/footer/footer.component";
import {RegisterComponent} from './pages/register/register.component';
import {BaristaComponent} from './pages/barista/barista.component';
import {CashierComponent} from './pages/cashier/cashier.component';
import {WaiterComponent} from './pages/waiter/waiter.component';
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
  { path :'barista', component: BaristaComponent},
  { path: 'cashier', component: CashierComponent },
  { path: '**', redirectTo: 'home' },
];

