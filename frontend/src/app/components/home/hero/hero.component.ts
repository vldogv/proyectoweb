import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css']
})
export class HeroComponent {
  @Output() shopNow = new EventEmitter<void>();

  onShopNow() {
    this.shopNow.emit();
  }
}
