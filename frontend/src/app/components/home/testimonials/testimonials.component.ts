import { Component } from '@angular/core';

interface Testimonial {
  name: string;
  location: string;
  comment: string;
  rating: number;
  avatar: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.css']
})
export class TestimonialsComponent {
  testimonials: Testimonial[] = [
    {
      name: 'María García',
      location: 'Ciudad de México',
      comment: 'La crema de lavanda es increíble. Mi piel nunca se había sentido tan suave e hidratada. Definitivamente volveré a comprar.',
      rating: 5,
      avatar: 'M'
    },
    {
      name: 'Carlos Rodríguez',
      location: 'Guadalajara, JAL',
      comment: 'Excelente calidad y envío rapidísimo. La miel de manuka tiene un sabor espectacular y la uso para todo.',
      rating: 5,
      avatar: 'C'
    },
    {
      name: 'Ana Martínez',
      location: 'Monterrey, NL',
      comment: 'Los aceites esenciales son de muy buena calidad. El de eucalipto me ayuda mucho con la congestión. Muy recomendados.',
      rating: 5,
      avatar: 'A'
    },
    {
      name: 'Roberto López',
      location: 'Puebla, PUE',
      comment: 'Primera vez que compro productos naturales online y quedé encantado. El empaque es hermoso y los productos de primera.',
      rating: 4,
      avatar: 'R'
    }
  ];

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - rating).fill(0);
  }
}
