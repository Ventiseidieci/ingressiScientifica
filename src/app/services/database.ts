import { Injectable, inject } from '@angular/core';
import { lastValueFrom, Observable } from 'rxjs';
import { ActiveEmployeeResult, ActiveThirdPartyEmployeeResult, AppConfig, Employee, Guest, Reason, Startup, Supplier, ThirdParty } from 'src/app/models/database.models';
import { FirestoreDataService } from './firestore-data.service';
import { GoogleSheetsService } from './google-sheets.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private dataService = inject(FirestoreDataService);
  private sheetsService = inject(GoogleSheetsService);
  private storageService = inject(StorageService);

  // ==========================================
  // STORAGE
  // ==========================================
  uploadFile(base64OrUrl: string, folder: string): Promise<string> {
    return this.storageService.uploadFile(base64OrUrl, folder);
  }

  base64ToBlob(base64: string): Blob {
    return this.storageService.base64ToBlob(base64);
  }

  // ==========================================
  // GESTIONE OSPITI
  // ==========================================
  async checkInGuest(guest: Guest) {
    try {
      await this.dataService.addGuest(guest);
      console.log('Salvato su Firebase!');
      await lastValueFrom(this.sheetsService.logGuestActionToSheet(guest, 'INGRESSO'));
      console.log('Logsheet INGRESSO inviato con successo');
      return true;
    } catch (error) {
      console.log('Errore logsheet, contattare amministratore', error);
      return false;
    }
  }

  async checkOutGuest(guest: Guest) {
    if (!guest.id) return false;

    try {
      await this.dataService.updateGuestExit(guest.id);
      await lastValueFrom(this.sheetsService.logGuestActionToSheet(guest, 'USCITA'));
      console.log('Logsheet USCITA inviato con successo');

      await this.dataService.deleteGuest(guest.id);
      console.log('Ospite rimosso da Firestore');

      return true;
    } catch (error) {
      console.error('Errore durante il Check-Out (Log fallito?):', error);
      return false;
    }
  }

  getActiveGuests(): Observable<Guest[]> {
    return this.dataService.getActiveGuests();
  }

  getAllGuestsHistory(): Observable<Guest[]> {
    return this.dataService.getAllGuestsHistory();
  }

  deleteGuest(id: string) {
    return this.dataService.deleteGuest(id);
  }

  // ==========================================
  // GESTIONE STARTUP & DIPENDENTI
  // ==========================================
  addStartup(startup: Startup) {
    return this.dataService.addStartup(startup);
  }

  addEmployeeToStartup(startupId: string, employee: Employee) {
    return this.dataService.addEmployeeToStartup(startupId, employee);
  }

  getAllActiveEmployees(): Observable<ActiveEmployeeResult[]> {
    return this.dataService.getAllActiveEmployees();
  }

  async updateEmployeeStatus(startupId: string, employeeName: string, newStatus: 'IN' | 'OUT') {
    const result = await this.dataService.updateEmployeeStatus(startupId, employeeName, newStatus);
    this.sheetsService.logEmployeeActionToSheet(
      result.employee,
      result.startupName,
      newStatus === 'IN' ? 'INGRESSO' : 'USCITA'
    );
    return result;
  }

  removeEmployeeFromStartup(startupId: string, employeeName: string) {
    return this.dataService.removeEmployeeFromStartup(startupId, employeeName);
  }

  getStartups(): Observable<Startup[]> {
    return this.dataService.getStartups();
  }

  deleteStartup(id: string) {
    return this.dataService.deleteStartup(id);
  }

  updateStartup(startupId: string, data: Partial<Startup>) {
    return this.dataService.updateStartup(startupId, data);
  }

  updateEmployeeDetails(startupId: string, oldEmp: Employee, newEmp: Employee) {
    return this.dataService.updateEmployeeDetails(startupId, oldEmp, newEmp);
  }

  // ==========================================
  // GESTIONE MOTIVAZIONI (Per Ospiti)
  // ==========================================
  getReasons(): Observable<Reason[]> {
    return this.dataService.getReasons();
  }

  addReason(text: string) {
    return this.dataService.addReason(text);
  }

  updateReason(id: string, text: string) {
    return this.dataService.updateReason(id, text);
  }

  deleteReason(id: string) {
    return this.dataService.deleteReason(id);
  }

  // ==========================================
  // GESTIONE FORNITORI
  // ==========================================
  getSuppliers(): Observable<Supplier[]> {
    return this.dataService.getSuppliers();
  }

  getActiveSuppliers(): Observable<Supplier[]> {
    return this.dataService.getActiveSuppliers();
  }

  addSupplier(supplier: Supplier) {
    return this.dataService.addSupplier(supplier);
  }

  deleteSupplier(id: string) {
    return this.dataService.deleteSupplier(id);
  }

  async updateSupplierStatus(supplier: Supplier, newStatus?: 'IN' | 'OUT') {
    const result = await this.dataService.updateSupplierStatus(supplier, newStatus);
    void this.sheetsService.logSupplierActionToSheet(result.supplier, result.action);
  }

  updateSupplier(supplierId: string, data: Partial<Supplier>) {
    return this.dataService.updateSupplier(supplierId, data);
  }

  // ==========================================
  // UTENTI TERZI
  // ==========================================
  getThirdParties(): Observable<ThirdParty[]> {
    return this.dataService.getThirdParties();
  }

  addThirdParty(tp: ThirdParty) {
    return this.dataService.addThirdParty(tp);
  }

  deleteThirdParty(id: string) {
    return this.dataService.deleteThirdParty(id);
  }

  updateThirdParty(id: string, data: Partial<ThirdParty>) {
    return this.dataService.updateThirdParty(id, data);
  }

  addEmployeeToThirdParty(tpId: string, employee: Employee) {
    return this.dataService.addEmployeeToThirdParty(tpId, employee);
  }

  removeEmployeeFromThirdParty(tpId: string, employeeName: string) {
    return this.dataService.removeEmployeeFromThirdParty(tpId, employeeName);
  }

  async updateTpEmployeeStatus(thirdPartyID: string, employeeName: string, newStatus: 'IN' | 'OUT') {
    const result = await this.dataService.updateTpEmployeeStatus(thirdPartyID, employeeName, newStatus);
    this.sheetsService.logThirdPartyActionToSheet(result.employee, result.thirdParty, result.action);
    return result;
  }

  getAllActiveThirdPartyEmployees(): Observable<ActiveThirdPartyEmployeeResult[]> {
    return this.dataService.getAllActiveThirdPartyEmployees();
  }

  updateTpEmployeeDetails(thirdPartyId: string, oldEmp: Employee, newEmp: Employee) {
    return this.dataService.updateTpEmployeeDetails(thirdPartyId, oldEmp, newEmp);
  }

  // ==========================================
  // CONFIGURAZIONE GLOBALE (Privacy, ecc.)
  // ==========================================
  getAppConfig(): Observable<AppConfig> {
    return this.dataService.getAppConfig();
  }

  savePrivacyPdf(pdfFile: File) {
    return this.dataService.savePrivacyPdf(pdfFile);
  }

  get privacyPdfUrl$(): Observable<string> {
    return this.dataService.privacyPdfUrl$;
  }
}
