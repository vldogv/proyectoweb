import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem } from '../models/producto.model';

export interface CFDIData {
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscalReceptor: string;
    regimenFiscalReceptor: string;
    usoCFDI: string;
  };
  conceptos: CartItem[];
  formaPago: string;
  metodoPago: string;
  moneda: string;
  tipoDeComprobante: string;
  exportacion: string;
  lugarExpedicion: string;
}

@Injectable({
  providedIn: 'root'
})
export class CfdiService {
  private platformId = inject(PLATFORM_ID);


  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 19);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

  private formatNumber(num: number | string, decimals: number = 2): string {
    return Number(num).toFixed(decimals);
  }

  generateCFDI40(data: CFDIData): string {
    const fecha = this.formatDate(new Date());
    const folio = Math.floor(Math.random() * 100000).toString();
    const serie = 'A';
    
    // Calculate totals
    const subtotal = data.conceptos.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Generate concepts XML
    const conceptosXml = data.conceptos.map(item => {
      const importe = item.product.price * item.quantity;
      const ivaConcepto = importe * 0.16;
      
      return `
      <cfdi:Concepto 
        ClaveProdServ="50181900" 
        NoIdentificacion="${item.product.id}"
        Cantidad="${item.quantity}" 
        ClaveUnidad="H87" 
        Unidad="Pieza"
        Descripcion="${this.escapeXml(item.product.name)}"
        ValorUnitario="${this.formatNumber(item.product.price)}"
        Importe="${this.formatNumber(importe)}"
        ObjetoImp="02">
        <cfdi:Impuestos>
          <cfdi:Traslados>
            <cfdi:Traslado 
              Base="${this.formatNumber(importe)}"
              Impuesto="002"
              TipoFactor="Tasa"
              TasaOCuota="0.160000"
              Importe="${this.formatNumber(ivaConcepto)}"/>
          </cfdi:Traslados>
        </cfdi:Impuestos>
      </cfdi:Concepto>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="${serie}"
  Folio="${folio}"
  Fecha="${fecha}"
  FormaPago="${data.formaPago}"
  NoCertificado="00001000000000000000"
  CondicionesDePago="Contado"
  SubTotal="${this.formatNumber(subtotal)}"
  Moneda="${data.moneda}"
  Total="${this.formatNumber(total)}"
  TipoDeComprobante="${data.tipoDeComprobante}"
  Exportacion="${data.exportacion}"
  MetodoPago="${data.metodoPago}"
  LugarExpedicion="${data.lugarExpedicion}"
  Sello=""
  Certificado="">

  <cfdi:Emisor 
    Rfc="${data.emisor.rfc}"
    Nombre="${this.escapeXml(data.emisor.nombre)}"
    RegimenFiscal="${data.emisor.regimenFiscal}"/>

  <cfdi:Receptor 
    Rfc="${data.receptor.rfc}"
    Nombre="${this.escapeXml(data.receptor.nombre)}"
    DomicilioFiscalReceptor="${data.receptor.domicilioFiscalReceptor}"
    RegimenFiscalReceptor="${data.receptor.regimenFiscalReceptor}"
    UsoCFDI="${data.receptor.usoCFDI}"/>

  <cfdi:Conceptos>${conceptosXml}
  </cfdi:Conceptos>

  <cfdi:Impuestos TotalImpuestosTrasladados="${this.formatNumber(iva)}">
    <cfdi:Traslados>
      <cfdi:Traslado 
        Base="${this.formatNumber(subtotal)}"
        Impuesto="002"
        TipoFactor="Tasa"
        TasaOCuota="0.160000"
        Importe="${this.formatNumber(iva)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>

  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital 
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
      Version="1.1"
      UUID="${this.generateUUID()}"
      FechaTimbrado="${fecha}"
      RfcProvCertif="SAT970701NN3"
      SelloCFD=""
      NoCertificadoSAT="00001000000000000001"
      SelloSAT=""/>
  </cfdi:Complemento>

</cfdi:Comprobante>`;

    return xml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  downloadCFDI(xml: string, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      console.error('Error descargando CFDI:', e);
    }
  }
}
