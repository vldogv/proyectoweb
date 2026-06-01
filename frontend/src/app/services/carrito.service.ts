import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { Product, CartItem } from '../models/producto.model';
import { ProductService } from './producto.service';

/** Notificación al usuario sobre cambios de stock en su carrito */
export interface StockChange {
  productId: number;
  productName: string;
  /** 'removed' = se agotó y se quitó del carrito · 'reduced' = se ajustó a menos cantidad */
  type: 'removed' | 'reduced';
  oldQuantity: number;
  newQuantity?: number;
  maxStock?: number;
}

/**
 * carrito.service.ts
 *
 * Estrategia de almacenamiento por usuario:
 *   localStorage:
 *     "carrito_guest"        → carrito de visitante sin sesión
 *     "carrito_user_{id}"    → carrito persistente del usuario {id}
 *
 * Comportamiento:
 *   - Invitado: agrega al carrito sin sesión
 *   - Al iniciar sesión o registrarse: el carrito de invitado SE FUSIONA con
 *     el del usuario (suma cantidades respetando stock)
 *   - Al cerrar sesión: el carrito del usuario se conserva en localStorage
 *     y la app vuelve al carrito de invitado (vacío si es nuevo)
 *   - Expiración: cada carrito guarda un `updatedAt`; tras 30 días sin
 *     actividad, se descarta al cargar.
 */

const STORAGE_PREFIX = 'carrito';
const EXPIRATION_DAYS = 30;
const EXPIRATION_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

interface CartStorage {
  items: CartItem[];
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private platformId     = inject(PLATFORM_ID);
  private productService = inject(ProductService);

  // ─── Estado reactivo ──────────────────────────────────────────────────────
  private itemsSignal    = signal<CartItem[]>([]);
  private currentScope   = signal<number | null>(null); // null = invitado, número = userId
  private avisosSignal   = signal<StockChange[]>([]);   // alertas pendientes de mostrar

  items      = this.itemsSignal.asReadonly();
  avisoStock = this.avisosSignal.asReadonly();
  itemCount  = computed(() =>
    this.itemsSignal().reduce((acc, item) => acc + item.quantity, 0)
  );
  total = computed(() =>
    this.itemsSignal().reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Migración: si existe la key vieja "carrito", la convertimos a carrito de invitado
      this._migrateOldStorage();

      // Cargar carrito de invitado por defecto (antes de que AuthService restaure sesión)
      this.loadCartForUser(null);

      // Auto-guardar cada vez que cambien los items
      effect(() => {
        const items = this.itemsSignal();
        const scope = this.currentScope();
        this._save(scope, items);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  API pública — invocada por AuthService
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Carga el carrito correspondiente al usuario (o el de invitado si userId es null).
   * Si el carrito expiró (30 días sin uso) se descarta.
   */
  loadCartForUser(userId: number | null): void {
    this.currentScope.set(userId);
    if (!isPlatformBrowser(this.platformId)) {
      this.itemsSignal.set([]);
      return;
    }

    const key = this._keyFor(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.itemsSignal.set([]);
      return;
    }

    try {
      const data: CartStorage = JSON.parse(raw);
      // Verificar expiración
      const age = Date.now() - (data.updatedAt ?? 0);
      if (age > EXPIRATION_MS) {
        localStorage.removeItem(key);
        this.itemsSignal.set([]);
        return;
      }
      this.itemsSignal.set(Array.isArray(data.items) ? data.items : []);
    } catch {
      this.itemsSignal.set([]);
    }
  }

  /**
   * Tras login/registro: fusiona el carrito de invitado con el del usuario.
   * Si un producto aparece en ambos, suma cantidades respetando el stock.
   * El carrito de invitado se elimina después del merge.
   */
  mergeGuestCartInto(userId: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadCartForUser(userId);
      return;
    }

    // Leer carrito invitado
    const guestItems = this._readItemsFromKey(this._keyFor(null));
    // Leer carrito del usuario (descartando si expiró)
    const userItems  = this._readItemsFromKey(this._keyFor(userId));

    // Hacer merge
    const merged: CartItem[] = userItems.map(i => ({ ...i }));
    for (const g of guestItems) {
      const exist = merged.find(m => m.product.id === g.product.id);
      if (exist) {
        const maxStock = exist.product.stock ?? 999;
        exist.quantity = Math.min(exist.quantity + g.quantity, maxStock);
      } else {
        merged.push({ ...g });
      }
    }

    // Eliminar carrito invitado y activar el del usuario con el resultado
    localStorage.removeItem(this._keyFor(null));
    this.currentScope.set(userId);
    this.itemsSignal.set(merged); // el effect hará el save automático
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Operaciones del carrito (sin cambios en su comportamiento externo)
  // ═══════════════════════════════════════════════════════════════════════

  /** Agrega producto al carrito respetando el stock disponible. */
  agregar(producto: Product, cantidad: number = 1): boolean {
    if (!producto.inStock || producto.stock <= 0) return false;
    const maxStock = producto.stock;

    let agregado = false;
    this.itemsSignal.update(lista => {
      const existente = lista.find(item => item.product.id === producto.id);
      if (existente) {
        if (existente.quantity >= maxStock) {
          agregado = false;
          return lista;
        }
        agregado = true;
        const nuevaCantidad = Math.min(existente.quantity + cantidad, maxStock);
        return lista.map(item =>
          item.product.id === producto.id
            ? { ...item, quantity: nuevaCantidad }
            : item
        );
      }
      agregado = true;
      return [...lista, { product: producto, quantity: Math.min(cantidad, maxStock) }];
    });
    return agregado;
  }

  actualizarCantidad(productId: number, cantidad: number) {
    if (cantidad <= 0) { this.quitar(productId); return; }
    this.itemsSignal.update(lista =>
      lista.map(item => {
        if (item.product.id !== productId) return item;
        const maxStock = item.product.stock ?? 999;
        return { ...item, quantity: Math.min(cantidad, maxStock) };
      })
    );
  }

  enLimiteStock(productId: number): boolean {
    const item = this.itemsSignal().find(i => i.product.id === productId);
    if (!item) return false;
    const max = item.product.stock ?? 999;
    return item.quantity >= max;
  }

  quitar(id: number) {
    this.itemsSignal.update(lista => lista.filter(item => item.product.id !== id));
  }

  vaciar() {
    this.itemsSignal.set([]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Validación de stock en tiempo real (contra la BD)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Refresca info de productos desde el backend y compara con el carrito local.
   * - Si un producto se agotó → lo quita del carrito y genera un aviso 'removed'
   * - Si tiene menos stock que la cantidad en el carrito → ajusta y avisa 'reduced'
   * - También actualiza el precio si cambió.
   *
   * @returns lista de cambios detectados (vacía si todo está OK)
   */
  async verificarStock(): Promise<StockChange[]> {
    const items = this.itemsSignal();
    if (items.length === 0) {
      this.avisosSignal.set([]);
      return [];
    }

    let productos: Product[];
    try {
      productos = await firstValueFrom(this.productService.getAll());
    } catch {
      // Si la API no responde, no tocamos nada y reportamos sin cambios
      return [];
    }

    const cambios: StockChange[] = [];

    const carritoActualizado = items
      .map((item): CartItem | null => {
        const actual = productos.find(p => p.id === item.product.id);

        // Producto borrado o agotado
        if (!actual || !actual.inStock || actual.stock <= 0) {
          cambios.push({
            productId:   item.product.id,
            productName: item.product.name,
            type:        'removed',
            oldQuantity: item.quantity,
          });
          return null;
        }

        // Cantidad superior al stock disponible
        if (item.quantity > actual.stock) {
          cambios.push({
            productId:   item.product.id,
            productName: actual.name,
            type:        'reduced',
            oldQuantity: item.quantity,
            newQuantity: actual.stock,
            maxStock:    actual.stock,
          });
          return { product: actual, quantity: actual.stock };
        }

        // Todo OK — solo refrescamos info (por si cambió precio/imagen)
        return { product: actual, quantity: item.quantity };
      })
      .filter((i): i is CartItem => i !== null);

    if (cambios.length > 0) {
      this.itemsSignal.set(carritoActualizado);
    }
    this.avisosSignal.set(cambios);
    return cambios;
  }

  /** Descarta las alertas tras mostrarlas al usuario */
  descartarAvisos(): void {
    this.avisosSignal.set([]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Internos
  // ═══════════════════════════════════════════════════════════════════════

  private _keyFor(userId: number | null): string {
    return userId ? `${STORAGE_PREFIX}_user_${userId}` : `${STORAGE_PREFIX}_guest`;
  }

  private _save(scope: number | null, items: CartItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const key = this._keyFor(scope);
    const data: CartStorage = { items, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(data));
  }

  /** Lee un carrito de localStorage. Si expiró o está corrupto, retorna []. */
  private _readItemsFromKey(key: string): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const data: CartStorage = JSON.parse(raw);
      const age = Date.now() - (data.updatedAt ?? 0);
      if (age > EXPIRATION_MS) return [];
      return Array.isArray(data.items) ? data.items : [];
    } catch { return []; }
  }

  /** Migra el carrito viejo (key "carrito") al nuevo formato de invitado. */
  private _migrateOldStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const oldRaw = localStorage.getItem('carrito');
    if (!oldRaw) return;
    try {
      const items = JSON.parse(oldRaw);
      if (Array.isArray(items) && items.length > 0) {
        const data: CartStorage = { items, updatedAt: Date.now() };
        localStorage.setItem(this._keyFor(null), JSON.stringify(data));
      }
    } catch {}
    localStorage.removeItem('carrito');
  }
}
