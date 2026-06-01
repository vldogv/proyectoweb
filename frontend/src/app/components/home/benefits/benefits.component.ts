import { Component } from '@angular/core';

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-benefits',
  standalone: true,
  templateUrl: './benefits.component.html',
  styleUrls: ['./benefits.component.css']
})
export class BenefitsComponent {
  benefits: Benefit[] = [
    {
      icon: 'truck',
      title: 'Envío Gratis',
      description: 'En pedidos mayores a $500 MXN a toda la República'
    },
    {
      icon: 'cash',
      title: 'Pago Contra Entrega',
      description: 'Paga cuando recibas tu pedido en la puerta de tu casa'
    },
    {
      icon: 'leaf',
      title: '100% Natural',
      description: 'Ingredientes orgánicos certificados sin químicos'
    },
    {
      icon: 'shield',
      title: 'Garantía de Calidad',
      description: '30 días de garantía o te devolvemos tu dinero'
    }
  ];
}
