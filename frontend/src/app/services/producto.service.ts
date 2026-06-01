import { Injectable } from '@angular/core';
import { Product } from '../models/producto.model';
import { HttpClient } from '@angular/common/http';
import { map, Observable, catchError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = 'http://localhost:4000/api/productos';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      catchError(() => {
        console.warn('API no disponible, usando XML fallback');
        return this.getFromXml();
      })
    );
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  private getFromXml(): Observable<Product[]> {
    return this.http.get('products.xml', { responseType: 'text' }).pipe(
      map((xmlText) => this.parseProductsXml(xmlText))
    );
  }

  private parseProductsXml(xmlText: string): Product[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    if (doc.getElementsByTagName('parsererror').length > 0) {
      return [];
    }

    const nodes = Array.from(doc.getElementsByTagName('product'));

    return nodes.map((node) => ({
      id: this.getNumber(node, 'id'),
      name: this.getText(node, 'name'),
      price: this.getNumber(node, 'price'),
      imageUrl: this.getText(node, 'imageUrl'),
      category: this.getText(node, 'category'),
      description: this.getText(node, 'description'),
      inStock: this.getBoolean(node, 'inStock'),
      stock: 999,
    }));
  }

  private getText(parent: Element, tag: string): string {
    return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
  }

  private getNumber(parent: Element, tag: string): number {
    const value = this.getText(parent, tag);
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private getBoolean(parent: Element, tag: string): boolean {
    const value = this.getText(parent, tag).toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }
}
