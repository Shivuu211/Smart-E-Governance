export interface User {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
  phone: string;
  completedProfile: boolean;
  address: string;
  state?: string;
  district?: string;
  taluk?: string;
  gramPanchayat?: string;
  ward?: string;
  zone?: string; // e.g. 'Bengaluru South', 'Bengaluru North', 'Bengaluru East', 'Bengaluru West'
  assignedZone?: string; // For officers: assigned jurisdiction area
  gender?: string;
  age?: number;
  dob?: string;
  dateOfBirth?: string;
  occupation?: string;
  income?: number;
  familyIncome?: number;
  themePreference?: 'light' | 'dark';
}

export interface Employee {
  id: string;
  name: string;
  department: 'Revenue' | 'Health' | 'Water' | 'Engineering' | 'Administration' | string;
  role: string;
  phone: string;
  email: string;
  joinDate: string;
  assignedZone?: string;
  status?: 'Active' | 'On Leave' | 'Inactive' | string;
}

export interface Grievance {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenEmail?: string;
  title: string;
  description: string;
  category: 'Water Supply' | 'Road Damage' | 'Electricity' | 'Garbage' | 'Street Light' | 'Drainage' | 'Others';
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected';
  zone?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  image?: string;
  images?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  urgency: 'Low' | 'Medium' | 'High';
  severity?: 'Critical' | 'High' | 'Medium' | 'Low';
  aiSuggestedPlan?: string;
  remarks?: string;
  resolutionPhotos?: string[];
  resolutionRemarks?: string;
  resolvedAt?: string;
  completedDate?: string;
  rating?: number;
  ratingFeedback?: 'Satisfied' | 'Not Satisfied' | string;
  citizenFeedbackNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  citizenId: string;
  citizenName: string;
  type: 'Birth' | 'Death' | 'Income' | 'Residence' | 'Marriage';
  status: 'Pending' | 'Documents Verified' | 'Approved' | 'Rejected' | string;
  zone?: string;
  assignedOfficerId?: string;
  details: any;
  qrCode: string;
  approvedBy?: string;
  approvedAt?: string;
  issuedDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scheme {
  id: string;
  name: string;
  description: string;
  benefits: string;
  eligibilityCriteria: string;
  department: string;
  category?: 'Housing' | 'Agriculture' | 'Education' | 'Women' | 'Senior Citizens' | 'Health' | string;
  status: 'Active' | 'Inactive';
  requiredDocuments?: string[];
  createdAt: string;
}

export interface SchemeApplicationDoc {
  docName: string;
  fileName: string;
  fileData?: string;
  fileSize?: string;
  uploadedAt: string;
  verified?: boolean;
}

export interface SchemeApplication {
  id: string;
  citizenId: string;
  citizenName: string;
  schemeId: string;
  schemeName: string;
  status: 'Pending' | 'Under Verification' | 'Documents Verified' | 'Approved' | 'Benefits Released' | 'Rejected' | string;
  zone?: string;
  assignedOfficerId?: string;
  approvedBy?: string;
  documents?: SchemeApplicationDoc[];
  appliedAt: string;
  remarks?: string;
}

export interface Tax {
  id: string;
  citizenId: string;
  citizenName: string;
  type: 'Property Tax' | 'Water Tax' | 'House Tax' | 'Trade License Fee' | 'Sanitation Cess' | string;
  amount: number;
  billingPeriod: string;
  status: 'Unpaid' | 'Paid';
  dueDate: string;
  zone?: string;
}

export interface Payment {
  id: string;
  taxId: string;
  citizenId: string;
  citizenName: string;
  amount: number;
  type: string;
  taxType?: string;
  billingPeriod?: string;
  paymentDate: string;
  transactionId: string;
  receiptUrl?: string;
  zone?: string;
  status?: string;
  refundedAt?: string;
  refundedBy?: string;
}

export interface Asset {
  id: string;
  assetIdCode?: string; // Auto-generated ID e.g. AST-2026-000145
  name: string;
  title?: string;
  type?: string;
  category?: string;
  description?: string;
  location: string;
  ward?: string;
  latitude?: number | null;
  longitude?: number | null;
  installationDate?: string;
  cost: number;
  expectedLifespan?: string;
  department?: string;
  responsibleOfficer?: string;
  status: 'Active' | 'Operational' | 'Maintenance' | 'Maintenance Required' | 'Under Repair' | 'Decommissioned' | string;
  condition?: 'Excellent' | 'Good' | 'Needs Repair' | 'Damaged' | string;
  photoData?: string;
  invoiceData?: string;
  invoiceName?: string;
  remarks?: string;
  lastMaintenanceDate?: string;
  zone?: string;
  createdAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  expiryDate: string;
  category: string;
  fileUrl?: string;
  targetZone?: string; // 'All' | 'Bengaluru North' | 'Bengaluru South' | 'Bengaluru East' | 'Bengaluru West'
  authorName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  isCleared?: boolean;
  clearedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  userRole: string;
  details: string;
  timestamp: string;
}

export interface AnalyticsData {
  metrics: {
    totalCitizens: number;
    totalStaff: number;
    activeSchemes: number;
    totalRevenue: number;
    totalCertificates?: number;
    totalGrievances?: number;
    totalAssets?: number;
    activeAssets?: number;
    maintenanceAssets?: number;
    issueAssets?: number;
    pendingGrievances: number;
    resolvedGrievances: number;
    pendingCertificates: number;
    approvedCertificates: number;
    assignedZone?: string;
  };
  grievancesByCategory: { name: string; value: number }[];
  revenueChart: { name: string; revenue: number }[];
  recentActivities: AuditLog[];
}

export interface OfficerPerformance {
  id: string;
  name: string;
  role: string;
  assignedZone: string;
  department?: string;
  email?: string;
  phone?: string;
  complaintsResolved: number;
  certificatesApproved: number;
  schemesApproved: number;
  avgResolutionTime: string;
  resolvedGrievancesList?: Grievance[];
  approvedCertificatesList?: Certificate[];
  approvedSchemesList?: SchemeApplication[];
}

export interface SchemeCheckerResult {
  schemeId: string;
  schemeName: string;
  status: 'Eligible' | 'Not Eligible' | 'More Information Required';
  explanation: string;
  unmetRequirement?: string;
  missingInformation?: string;
  benefits: string;
  requiredDocuments: string[];
  category?: string;
  department?: string;
}

export interface SchemeCheckerResponse {
  type: 'question' | 'evaluation';
  message: string;
  options?: string[];
  collectedDetails: Record<string, any>;
  results?: SchemeCheckerResult[];
}


