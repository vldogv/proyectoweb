import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-cta-banner',
  standalone: true,
  templateUrl: './cta-banner.component.html',
  styleUrls: ['./cta-banner.component.css']
})
export class CtaBannerComponent {
  @Output() shopNow = new EventEmitter<void>();

  onShopNow() {
    this.shopNow.emit();
  }
}
