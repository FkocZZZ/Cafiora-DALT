import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {NgClass} from '@angular/common';
import {FooterComponent} from '../footer/footer.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterOutlet, RouterLinkActive, NgClass, FooterComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {

  isMenuOpen: boolean = false;


  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }


  closeMenu(): boolean {
    return this.isMenuOpen;
  }
}
