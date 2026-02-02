// Shared data models for Firestore entities and UI views.
export interface Guest {
  id?: string;
  name: string;
  reason: string;
  entryTime: string;
  exitTime?: string;
  status: 'IN' | 'OUT';
  signatureUrl?: string;
}

export interface Startup {
  id?: string;
  name: string;
  logoUrl?: string;
  employees: Employee[];
}

export interface Employee {
  name: string;
  role?: string;
  imageUrl?: string;
  status?: 'IN' | 'OUT';
  lastEntryTime?: string;
}

export interface ActiveEmployeeResult {
  employee: Employee;
  startup: Startup;
}

export interface Reason {
  id?: string;
  text: string;
  order?: number;
}

export interface Supplier {
  id?: string;
  name: string;
  status?: 'IN' | 'OUT';
  lastEntryTime?: string;
  logoUrl?: string;
}

export interface ThirdParty {
  id?: string;
  name: string;
  logoUrl?: string;
  employees: Employee[];
}

export interface ActiveThirdPartyEmployeeResult {
  employee: Employee;
  thirdParty: ThirdParty;
}

export interface AppConfig {
  privacyPdfUrl?: string;
}
