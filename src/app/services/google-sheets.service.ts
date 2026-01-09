import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, Guest, Supplier, ThirdParty } from 'src/app/models/database.models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class GoogleSheetsService {
  private http = inject(HttpClient);
  private storageService = inject(StorageService);

  private googleStartupScriptUrl = 'https://script.google.com/macros/s/AKfycby6IM_hyL-AjcfUkXAsjRW5DONEr6cDDC2zXKr0FcuuEJ6zx_TmgZuJtvJk4Ciyhooa/exec';
  private googleGuestScriptUrl = 'https://script.google.com/macros/s/AKfycbxFpx0-jaKYcHvuFzouPDsSAwvGzKB6JlS5LmHJ7f4YdNrn3cYR7tiVCI5otI4ncoma/exec';
  private googleThirdPartyScriptUrl = 'https://script.google.com/macros/s/AKfycbzMsYM9JIPtaz-bjdJActFAl_qJIMiI1HDw2frAuwBUSEhoc2r4_52tc_I2YsOGeac/exec';

  logGuestActionToSheet(guest: Guest, action: 'INGRESSO' | 'USCITA'): Observable<any> {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    const sheetPayload = {
      targetSheet: sheetName,
      action: action,
      data: {
        Data: dateStr,
        Dipendente: guest.name,
        Motivazione: guest.reason,
        Firma: guest.signatureUrl || 'N/A',
        Ora: timeStr,
      },
    };

    return this.http.post(this.googleGuestScriptUrl, JSON.stringify(sheetPayload), {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  logEmployeeActionToSheet(employee: Employee, startupName: string, action: 'INGRESSO' | 'USCITA') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    const sheetPayload = {
      targetSheet: sheetName,
      action: action,
      data: {
        Data: dateStr,
        Dipendente: employee.name,
        Ruolo: employee.role,
        Azienda: startupName,
        Ora: timeStr,
      },
    };

    this.http.post(this.googleStartupScriptUrl, JSON.stringify(sheetPayload), {
      headers: { 'Content-Type': 'text/plain' },
    }).subscribe({
      next: () => console.log(`Log ${action} inviato`),
      error: (e) => console.error('Errore log sheet', e),
    });
  }

  async logSupplierActionToSheet(supplier: Supplier, action: 'INGRESSO' | 'USCITA'): Promise<void> {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    const defaultPlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAD0lEQVR4AQEEAPv/AFSrhALaAYQsuW/kAAAAAElFTkSuQmCC';
    let firmaBase64 = defaultPlaceholder;

    if (supplier.logoUrl) {
      const converted = await this.storageService.imageUrlToBase64(supplier.logoUrl);
      if (converted) {
        firmaBase64 = converted;
      }
    }

    const sheetPayload = {
      targetSheet: sheetName,
      action: action,
      data: {
        Data: dateStr,
        Dipendente: supplier.name,
        Firma: firmaBase64,
        Motivazione: 'Fornitore',
        Ora: timeStr,
      },
    };

    this.http.post(this.googleGuestScriptUrl, JSON.stringify(sheetPayload), {
      headers: { 'Content-Type': 'text/plain' },
    }).subscribe({
      next: () => console.log(`Log ${action} fornitore inviato`),
      error: (e) => console.error('Errore log sheet fornitore', e),
    });
  }

  logThirdPartyActionToSheet(employee: Employee, thirdParty: ThirdParty, action: 'INGRESSO' | 'USCITA') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let sheetName = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    sheetName = sheetName.charAt(0).toUpperCase() + sheetName.slice(1);

    const sheetPayload = {
      targetSheet: sheetName,
      action: action,
      data: {
        Data: dateStr,
        Dipendente: employee.name,
        UtenteTerzo: thirdParty.name,
        Ora: timeStr,
      },
    };

    this.http.post(this.googleThirdPartyScriptUrl, JSON.stringify(sheetPayload), {
      headers: { 'Content-Type': 'text/plain' },
    }).subscribe({
      next: () => console.log(`Log ${action} fornitore inviato`),
      error: (e) => console.error('Errore log sheet fornitore', e),
    });
  }
}
