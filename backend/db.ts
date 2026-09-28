import { MongoClient, Db, Collection as MongoCollection } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export function sanitizeValue<T>(val: T): T {
  if (typeof val === 'string') {
    return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeValue(item)) as unknown as T;
  }
  if (val !== null && typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      cleaned[key] = sanitizeValue((val as Record<string, any>)[key]);
    }
    return cleaned as T;
  }
  return val;
}

// Interface structures
export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'citizen' | 'officer' | 'admin';
  phone: string;
  completedProfile: boolean;
  address: string;
  state?: string;
  district?: string;
  taluk?: string;
  gramPanchayath?: string;
  ward?: string;
  zone?: string;
  assignedZone?: string;
  gender?: string;
  age?: number;
  occupation?: string;
  income?: number;
  status?: string;
  isDeactivated?: boolean;
  isDeleted?: boolean;
  themePreference?: string;
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
  status?: string;
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
  resolutionRemarks?: string;
  resolutionPhotos?: string[];
  completedDate?: string;
  resolvedAt?: string;
  rating?: number;
  ratingFeedback?: 'Satisfied' | 'Not Satisfied';
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
  category?: string;
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
  assetIdCode?: string;
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
  status: string;
  condition?: string;
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
  targetZone?: string;
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

export interface LandingVideo {
  id: string;
  originalName: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
  isActive: boolean;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface DbSchema {
  users: User[];
  employees: Employee[];
  grievances: Grievance[];
  certificates: Certificate[];
  schemes: Scheme[];
  applications: SchemeApplication[];
  taxes: Tax[];
  payments: Payment[];
  assets: Asset[];
  notices: Notice[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  landingVideos: LandingVideo[];
}

let mongoClient: MongoClient | null = null;
let activeDatabase: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/namma_panchayath';
  try {
    console.log(`[Database] Connecting to MongoDB at: ${uri}`);
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();

    // Verify connection with a ping
    const adminDb = mongoClient.db().admin();
    await adminDb.ping();

    const urlObj = new URL(uri.replace('mongodb://', 'http://'));
    const dbName = urlObj.pathname ? urlObj.pathname.replace(/^\//, '') : 'namma_panchayath';
    activeDatabase = mongoClient.db(dbName || 'namma_panchayath');
    console.log(`[Database] ✓ Successfully connected to MongoDB database: "${activeDatabase.databaseName}"`);
    return activeDatabase;
  } catch (err: any) {
    console.error('[Database] ❌ FATAL: Could not connect to MongoDB server:', err?.message || err);
    console.error('[Database] Please verify that MongoDB is running and MONGODB_URI is correct in .env');
    throw err;
  }
}

export function getDatabase(): Db {
  if (!activeDatabase) {
    throw new Error('Database not initialized. Ensure connectToMongoDB() succeeded before querying.');
  }
  return activeDatabase;
}

function cleanMongoDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest as T;
}

class MongoDBWrapper {
  public collection<T extends keyof DbSchema>(name: T) {
    const getCol = (): MongoCollection => {
      const database = getDatabase();
      return database.collection(name as string);
    };

    return {
      find: async (filter?: any): Promise<DbSchema[T]> => {
        const col = getCol();
        const query = filter ? { ...filter } : {};
        const docs = await col.find(query).toArray();
        return docs.map(d => cleanMongoDoc<any>(d)) as DbSchema[T];
      },

      findOne: async (filter: any): Promise<DbSchema[T][number] | null> => {
        const col = getCol();
        const doc = await col.findOne(filter);
        return doc ? cleanMongoDoc<DbSchema[T][number]>(doc) : null;
      },

      findById: async (id: string): Promise<DbSchema[T][number] | null> => {
        const col = getCol();
        const doc = await col.findOne({ id });
        return doc ? cleanMongoDoc<DbSchema[T][number]>(doc) : null;
      },

      insertOne: async (item: any): Promise<DbSchema[T][number]> => {
        const col = getCol();
        const toInsert = { ...item };
        if (!toInsert.id) {
          toInsert.id = `${(name as string).slice(0, 3)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }
        delete toInsert._id;
        const cleaned = sanitizeValue(toInsert);
        await col.insertOne(cleaned);
        return cleanMongoDoc<DbSchema[T][number]>(cleaned);
      },

      findByIdAndUpdate: async (id: string, updates: any): Promise<DbSchema[T][number] | null> => {
        const col = getCol();
        const cleanUpdates = sanitizeValue({ ...updates });
        delete cleanUpdates._id;
        delete cleanUpdates.id; // Do not overwrite stable business ID

        const result = await col.findOneAndUpdate(
          { id },
          { $set: cleanUpdates },
          { returnDocument: 'after' }
        );
        return result ? cleanMongoDoc<DbSchema[T][number]>(result) : null;
      },

      deleteOne: async (id: string): Promise<boolean> => {
        const col = getCol();
        const res = await col.deleteOne({ id });
        return (res.deletedCount || 0) > 0;
      },

      count: async (filter?: any): Promise<number> => {
        const col = getCol();
        return col.countDocuments(filter || {});
      },

      raw: (): MongoCollection => {
        return getCol();
      },
    };
  }

  public async save(): Promise<void> {
    // No-op in MongoDB runtime: MongoDB persists operations immediately.
  }
}

export const db = new MongoDBWrapper();
