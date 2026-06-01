import { Component, OnInit, OnDestroy, Output, EventEmitter, signal } from '@angular/core';

@Component({
  selector: 'app-urgency',
  standalone: true,
  templateUrl: './urgency.component.html',
  styleUrls: ['./urgency.component.css']
})
export class UrgencyComponent implements OnInit, OnDestroy {
  @Output() shopNow = new EventEmitter<void>();

  hours = signal(5);
  minutes = signal(42);
  seconds = signal(18);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private tick() {
    let s = this.seconds();
    let m = this.minutes();
    let h = this.hours();

    s--;
    if (s < 0) {
      s = 59;
      m--;
      if (m < 0) {
        m = 59;
        h--;
        if (h < 0) {
          h = 23;
        }
      }
    }

    this.seconds.set(s);
    this.minutes.set(m);
    this.hours.set(h);
  }

  pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  onShopNow() {
    this.shopNow.emit();
  }
}
