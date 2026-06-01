import { Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, NgClass } from '@angular/common';
import { EnvioService } from '../../../services/envio.service';
import { ShippingOption } from '../../../models/user.model';

@Component({
  selector: 'app-resumen-envio',
  standalone: true,
  imports: [CurrencyPipe, NgClass],
  templateUrl: './resumen-envio.component.html',
  styleUrls: ['./resumen-envio.component.css'],
})
export class ResumenEnvioComponent implements OnInit {
  envioService = inject(EnvioService);

  ngOnInit(): void {
    // Auto-seleccionar Estándar si el usuario aún no eligió nada
    if (!this.envioService.opcionSeleccionada()) {
      const primera = this.envioService.opciones()[0];
      if (primera) this.envioService.seleccionar(primera);
    }
  }

  get opciones(): ShippingOption[] {
    return this.envioService.opciones();
  }

  isSeleccionada(opcion: ShippingOption): boolean {
    return this.envioService.opcionSeleccionada()?.id === opcion.id;
  }

  seleccionar(opcion: ShippingOption): void {
    this.envioService.seleccionar(opcion);
  }
}
