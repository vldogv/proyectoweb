import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { CarritoService } from '../services/carrito.service';

/**
 * Protege rutas que requieren un carrito no vacío (ej. /pago).
 * Si el carrito está vacío redirige a /carrito.
 */
export const cartGuard: CanActivateFn = () => {
  const carrito = inject(CarritoService);
  const router  = inject(Router);

  if (carrito.items().length > 0) return true;

  router.navigate(['/carrito']);
  return false;
};
