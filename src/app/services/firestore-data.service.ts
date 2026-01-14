import { Injectable, inject } from '@angular/core';
import { collection, addDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, arrayUnion, getDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActiveEmployeeResult, ActiveThirdPartyEmployeeResult, AppConfig, Employee, Guest, Reason, Startup, Supplier, ThirdParty } from 'src/app/models/database.models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class FirestoreDataService {
  private firestore = inject(Firestore);
  private storageService = inject(StorageService);

  private getCollectionData<T>(queryRef: any): Observable<T[]> {
    return new Observable((observer) => {
      const unsubscribe = onSnapshot(
        queryRef,
        (snapshot: any) => {
          const data = snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          observer.next(data);
        },
        (error: any) => observer.error(error)
      );
      return () => unsubscribe();
    });
  }

  // ==========================================
  // GESTIONE OSPITI
  // ==========================================
  async addGuest(guest: Guest) {
    const guestsRef = collection(this.firestore, 'guests');
    return addDoc(guestsRef, {
      ...guest,
      entryTime: new Date().toISOString(),
      status: 'IN',
    });
  }

  async updateGuestExit(guestId: string) {
    const guestRef = doc(this.firestore, 'guests', guestId);
    return updateDoc(guestRef, {
      exitTime: new Date().toISOString(),
      status: 'OUT',
    });
  }

  getActiveGuests(): Observable<Guest[]> {
    const guestsRef = collection(this.firestore, 'guests');
    const q = query(guestsRef, where('status', '==', 'IN'), orderBy('entryTime', 'desc'));
    return this.getCollectionData<Guest>(q);
  }

  getAllGuestsHistory(): Observable<Guest[]> {
    const guestsRef = collection(this.firestore, 'guests');
    const q = query(guestsRef, orderBy('entryTime', 'desc'));
    return this.getCollectionData<Guest>(q);
  }

  deleteGuest(id: string) {
    const docRef = doc(this.firestore, 'guests', id);
    return deleteDoc(docRef);
  }

  // ==========================================
  // GESTIONE STARTUP & DIPENDENTI
  // ==========================================
  async addStartup(startup: Startup) {
    const startupsRef = collection(this.firestore, 'startups');
    if (!startup.employees) {
      startup.employees = [];
    }
    return addDoc(startupsRef, startup);
  }

  async addEmployeeToStartup(startupId: string, employee: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    const newEmp = { ...employee, status: 'OUT' };
    return updateDoc(startupRef, { employees: arrayUnion(newEmp) });
  }

  async removeEmployeeFromStartup(startupId: string, employeeName: string) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    const snapshot = await getDoc(startupRef);
    if (!snapshot.exists()) return;
    const employees = (snapshot.data() as Startup).employees || [];
    const updatedEmployees = employees.filter((e) => e.name !== employeeName);
    return updateDoc(startupRef, { employees: updatedEmployees });
  }

  getStartups(): Observable<Startup[]> {
    const startupsRef = collection(this.firestore, 'startups');
    const q = query(startupsRef, orderBy('name', 'asc'));
    return this.getCollectionData<Startup>(q);
  }

  deleteStartup(id: string) {
    const docRef = doc(this.firestore, 'startups', id);
    return deleteDoc(docRef);
  }

  async updateStartup(startupId: string, data: Partial<Startup>) {
    const ref = doc(this.firestore, 'startups', startupId);
    return updateDoc(ref, data);
  }

  async updateEmployeeDetails(startupId: string, oldEmp: Employee, newEmp: Employee) {
    const startupRef = doc(this.firestore, 'startups', startupId);
    const snapshot = await getDoc(startupRef);
    if (!snapshot.exists()) throw new Error('Startup non trovata');
    const employees = (snapshot.data() as Startup).employees || [];

    const updatedEmployees = employees.map((e) => {
      if (e.name === oldEmp.name && e.role === oldEmp.role) {
        return { ...newEmp, status: e.status || 'OUT', lastEntryTime: e.lastEntryTime || null };
      }
      return e;
    });

    return updateDoc(startupRef, { employees: updatedEmployees });
  }

  async updateEmployeeStatus(startupId: string, employeeName: string, newStatus: 'IN' | 'OUT') {
    const startupRef = doc(this.firestore, 'startups', startupId);
    const snapshot = await getDoc(startupRef);
    if (!snapshot.exists()) throw new Error('Startup non trovata');

    const startupData = snapshot.data() as Startup;
    const employees = startupData.employees || [];
    const updatedEmployees = employees.map((emp) => {
      if (emp.name === employeeName) {
        return {
          ...emp,
          status: newStatus,
          lastEntryTime: new Date().toISOString(),
        };
      }
      return emp;
    });

    await updateDoc(startupRef, { employees: updatedEmployees });
    const updatedEmployee = updatedEmployees.find((e) => e.name === employeeName);
    if (!updatedEmployee) throw new Error('Dipendente non trovato');
    return { employee: updatedEmployee, startupName: startupData.name };
  }

  getAllActiveEmployees(): Observable<ActiveEmployeeResult[]> {
    return this.getStartups().pipe(
      map((startups) => {
        const activeList: ActiveEmployeeResult[] = [];
        for (const startup of startups) {
          if (startup.employees) {
            for (const emp of startup.employees) {
              if (emp.status === 'IN') {
                activeList.push({
                  employee: emp,
                  startup: startup,
                });
              }
            }
          }
        }

        return activeList.sort((a, b) => {
          const timeA = a.employee.lastEntryTime || '';
          const timeB = b.employee.lastEntryTime || '';
          return timeB.localeCompare(timeA);
        });
      })
    );
  }

  // ==========================================
  // GESTIONE MOTIVAZIONI (Per Ospiti)
  // ==========================================
  getReasons(): Observable<Reason[]> {
    const q = query(collection(this.firestore, 'reasons'), orderBy('text'));
    return this.getCollectionData<Reason>(q);
  }

  async addReason(text: string) {
    return addDoc(collection(this.firestore, 'reasons'), { text });
  }

  async updateReason(id: string, text: string) {
    return updateDoc(doc(this.firestore, 'reasons', id), { text });
  }

  async deleteReason(id: string) {
    return deleteDoc(doc(this.firestore, 'reasons', id));
  }

  // ==========================================
  // GESTIONE FORNITORI
  // ==========================================
  getSuppliers(): Observable<Supplier[]> {
    const q = query(collection(this.firestore, 'suppliers'), orderBy('name'));
    return this.getCollectionData<Supplier>(q);
  }

  getActiveSuppliers(): Observable<Supplier[]> {
    const ref = collection(this.firestore, 'suppliers');
    const q = query(ref, where('status', '==', 'IN'), orderBy('name'));
    return this.getCollectionData<Supplier>(q);
  }

  async addSupplier(supplier: Supplier) {
    const suppliersRef = collection(this.firestore, 'suppliers');
    return addDoc(suppliersRef, supplier);
  }

  async deleteSupplier(id: string) {
    return deleteDoc(doc(this.firestore, 'suppliers', id));
  }

  async updateSupplierStatus(supplier: Supplier, newStatus?: 'IN' | 'OUT'): Promise<{ supplier: Supplier; action: 'INGRESSO' | 'USCITA' }> {
    if (!supplier.id) {
      throw new Error('Supplier ID mancante');
    }

    if (!newStatus) {
      newStatus = supplier.status === 'IN' ? 'OUT' : 'IN';
    }

    const now = new Date().toISOString();
    const supplierRef = doc(this.firestore, 'suppliers', supplier.id);
    await updateDoc(supplierRef, {
      status: newStatus,
      lastEntryTime: now,
    });

    const supplierPerLog = { ...supplier, status: newStatus };
    const action: 'INGRESSO' | 'USCITA' = newStatus === 'IN' ? 'INGRESSO' : 'USCITA';
    return { supplier: supplierPerLog, action };
  }

  async updateSupplier(supplierId: string, data: Partial<Supplier>) {
    const ref = doc(this.firestore, 'suppliers', supplierId);
    return updateDoc(ref, data);
  }

  // ==========================================
  // UTENTI TERZI
  // ==========================================
  getThirdParties(): Observable<ThirdParty[]> {
    const q = query(collection(this.firestore, 'third_parties'), orderBy('name'));
    return this.getCollectionData<ThirdParty>(q);
  }

  async addThirdParty(tp: ThirdParty) {
    const thirdPartyRef = collection(this.firestore, 'third_parties');
    if (!tp.employees) {
      tp.employees = [];
    }
    return addDoc(thirdPartyRef, tp);
  }

  async deleteThirdParty(id: string) {
    return deleteDoc(doc(this.firestore, 'third_parties', id));
  }

  async updateThirdParty(id: string, data: Partial<ThirdParty>) {
    return updateDoc(doc(this.firestore, 'third_parties', id), data);
  }

  async addEmployeeToThirdParty(tpId: string, employee: Employee) {
    const ref = doc(this.firestore, 'third_parties', tpId);
    const newEmp = { ...employee, status: 'OUT' };
    return updateDoc(ref, { employees: arrayUnion(newEmp) });
  }

  async removeEmployeeFromThirdParty(tpId: string, employeeName: string) {
    const ref = doc(this.firestore, 'third_parties', tpId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const employees = (snapshot.data() as ThirdParty).employees || [];
    const updatedEmployees = employees.filter((e) => e.name !== employeeName);
    return updateDoc(ref, { employees: updatedEmployees });
  }

  async updateTpEmployeeStatus(thirdPartyID: string, employeeName: string, newStatus: 'IN' | 'OUT'): Promise<{ employee: Employee; thirdParty: ThirdParty; action: 'INGRESSO' | 'USCITA' }> {
    const ref = doc(this.firestore, 'third_parties', thirdPartyID);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error('Third party not found');
    const thirdParty = snapshot.data() as ThirdParty;
    const employees = thirdParty.employees || [];
    const updatedEmployees = employees.map((emp) => {
      if (emp.name === employeeName) {
        return {
          ...emp,
          status: newStatus,
          lastEntryTime: new Date().toISOString(),
        };
      }
      return emp;
    });

    await updateDoc(ref, { employees: updatedEmployees });
    const updatedEmployee = updatedEmployees.find((e) => e.name === employeeName);
    if (!updatedEmployee) throw new Error('Dipendente non trovato');
    const action: 'INGRESSO' | 'USCITA' = newStatus === 'IN' ? 'INGRESSO' : 'USCITA';
    return { employee: updatedEmployee, thirdParty, action };
  }

  getAllActiveThirdPartyEmployees(): Observable<ActiveThirdPartyEmployeeResult[]> {
    return this.getThirdParties().pipe(
      map((thirdParties) => {
        const activeList: ActiveThirdPartyEmployeeResult[] = [];
        for (const thirdParty of thirdParties) {
          if (thirdParty.employees) {
            for (const emp of thirdParty.employees) {
              if (emp.status === 'IN') {
                activeList.push({
                  employee: emp,
                  thirdParty: thirdParty,
                });
              }
            }
          }
        }

        return activeList.sort((a, b) => {
          const timeA = a.employee.lastEntryTime || '';
          const timeB = b.employee.lastEntryTime || '';
          return timeB.localeCompare(timeA);
        });
      })
    );
  }

  async updateTpEmployeeDetails(thirdPartyId: string, oldEmp: Employee, newEmp: Employee) {
    const thirdPartyRef = doc(this.firestore, 'third_parties', thirdPartyId);
    const snapshot = await getDoc(thirdPartyRef);
    if (!snapshot.exists()) throw new Error('Utente Terzo non trovato');
    const employees = (snapshot.data() as ThirdParty).employees || [];

    const updatedEmployees = employees.map((e) => {
      if (e.name === oldEmp.name && e.role === oldEmp.role) {
        return { ...newEmp, status: e.status, lastEntryTime: e.lastEntryTime };
      }
      return e;
    });

    return updateDoc(thirdPartyRef, { employees: updatedEmployees });
  }

  // ==========================================
  // CONFIGURAZIONE GLOBALE (Privacy, ecc.)
  // ==========================================
  getAppConfig(): Observable<AppConfig> {
    const docRef = doc(this.firestore, 'config', 'main');
    return new Observable((observer) => {
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data() as AppConfig;
        observer.next(data || {});
      });
      return () => unsubscribe();
    });
  }

  async savePrivacyPdf(pdfFile: File) {
    const downloadUrl = await this.storageService.uploadPrivacyPdf(pdfFile);
    const docRef = doc(this.firestore, 'config', 'main');
    return setDoc(docRef, { privacyPdfUrl: downloadUrl }, { merge: true });
  }

  get privacyPdfUrl$(): Observable<string> {
    return new Observable((observer) => {
      const configRef = doc(this.firestore, 'config', 'main');
      const unsubscribe = onSnapshot(configRef, (snap) => {
        const data = snap.data() as AppConfig;
        observer.next(data?.privacyPdfUrl || '');
      });
      return () => unsubscribe();
    });
  }
}
