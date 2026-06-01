import { Routes } from '@angular/router';
import { HomeComponent }                  from './components/home/home.component';
import { CatalogoComponent }              from './components/catalogo/catalogo.component';
import { CarritoPageComponent }           from './components/carrito-page/carrito-page.component';
import { ProductoDetalleComponent }       from './components/producto-detalle/producto-detalle.component';
import { PagoComponent }                  from './components/pago/pago.component';
import { LoginComponent }                 from './components/auth/login/login.component';
import { RegisterComponent }              from './components/auth/register/register.component';
import { ForgotPasswordComponent }        from './components/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent }         from './components/auth/reset-password/reset-password.component';
import { AccountComponent }               from './components/account/account.component';
import { SeguimientoPedidoComponent }     from './components/seguimiento-pedido/seguimiento-pedido.component';
import { AdminComponent }                 from './components/admin/admin.component';
import { TicketsComponent }               from './components/tickets/tickets.component';
import { authGuard, guestGuard, adminGuard } from './guards/auth.guard';
import { cartGuard }                      from './guards/cart.guard';

export const routes: Routes = [
  { path: '',                     component: HomeComponent },
  { path: 'catalogo',             component: CatalogoComponent },
  { path: 'producto/:id',         component: ProductoDetalleComponent },
  { path: 'carrito',              component: CarritoPageComponent },
  { path: 'checkout',             redirectTo: 'pago' },
  { path: 'pago',                 component: PagoComponent,              canActivate: [cartGuard] },
  { path: 'login',                component: LoginComponent,             canActivate: [guestGuard] },
  { path: 'registro',             component: RegisterComponent,          canActivate: [guestGuard] },
  { path: 'recuperar-contrasena', component: ForgotPasswordComponent },
  { path: 'reset-password',       component: ResetPasswordComponent },
  { path: 'cuenta',               component: AccountComponent,           canActivate: [authGuard] },
  { path: 'pedido/:id',           component: SeguimientoPedidoComponent, canActivate: [authGuard] },
  { path: 'soporte',              component: TicketsComponent,           canActivate: [authGuard] },
  { path: 'admin',                component: AdminComponent,             canActivate: [adminGuard] },
  { path: '**',                   redirectTo: '' },
];
