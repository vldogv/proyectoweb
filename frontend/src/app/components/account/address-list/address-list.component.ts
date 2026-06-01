import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddressService } from '../../../services/address.service';
import { Address }        from '../../../models/user.model';

@Component({
  selector: 'app-address-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './address-list.component.html',
  styleUrls: ['./address-list.component.css'],
})
export class AddressListComponent {
  addressService = inject(AddressService);

  showForm   = signal(false);
  editingId  = signal<number | null>(null);

  // Campos del formulario
  label      = signal('');
  fullName   = signal('');
  street     = signal('');
  city       = signal('');
  postalCode = signal('');
  phone      = signal('');
  isDefault  = signal(false);

  get addresses() { return this.addressService.userAddresses; }

  get isFormValid(): boolean {
    return (
      this.label().trim()      !== '' &&
      this.fullName().trim()   !== '' &&
      this.street().trim()     !== '' &&
      this.city().trim()       !== '' &&
      this.postalCode().trim() !== '' &&
      this.phone().trim()      !== ''
    );
  }

  openAddForm() {
    this.resetForm();
    this.showForm.set(true);
  }

  openEditForm(a: Address) {
    this.label.set(a.label);
    this.fullName.set(a.fullName);
    this.street.set(a.street);
    this.city.set(a.city);
    this.postalCode.set(a.postalCode);
    this.phone.set(a.phone);
    this.isDefault.set(a.isDefault);
    this.editingId.set(a.id);
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.resetForm(); }

  resetForm() {
    this.label.set(''); this.fullName.set(''); this.street.set('');
    this.city.set(''); this.postalCode.set(''); this.phone.set('');
    this.isDefault.set(false); this.editingId.set(null);
  }

  async saveAddress() {
    if (!this.isFormValid) return;
    const data = {
      label: this.label(), fullName: this.fullName(), street: this.street(),
      city: this.city(), postalCode: this.postalCode(), phone: this.phone(),
      isDefault: this.isDefault(),
    };
    if (this.editingId()) {
      await this.addressService.updateAddress(this.editingId()!, data);
    } else {
      await this.addressService.addAddress(data);
    }
    this.closeForm();
  }

  async deleteAddress(id: number) {
    if (confirm('¿Estás seguro de eliminar esta dirección?')) {
      await this.addressService.deleteAddress(id);
    }
  }

  async setAsDefault(id: number) { await this.addressService.setAsDefault(id); }
}
