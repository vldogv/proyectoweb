import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege rutas que requieren sesión iniciada */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/** Protege rutas que requieren rol de administrador */
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()?.isAdmin) return true;

  router.navigate(['/']);
  return false;
};

/** Redirige a /cuenta si el usuario ya está autenticado */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;

  router.navigate(['/cuenta']);
  return false;
};
