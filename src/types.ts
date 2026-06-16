export interface User {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: Date;
}

export interface Assessment {
  id: number;
  patientName: string;
  patientEmail: string;
  phqAnswers: number[]; // 9 elements
  gadAnswers: number[]; // 7 elements
  phqScore: number;
  gadScore: number;
  phqSeverity: string;
  gadSeverity: string;
  hasQ9Alert: boolean;
  clinicianNotes: string;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  createdAt: Date;
  reviewer?: User | null;
}

export interface DashboardStats {
  totalSubmissions: number;
  avgPhq9: number;
  avgGad7: number;
  highRiskFlags: number;
}
