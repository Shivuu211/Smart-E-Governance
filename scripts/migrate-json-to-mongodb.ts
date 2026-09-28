import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/namma_panchayath';
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

interface DbSchema {
  users?: any[];
  employees?: any[];
  grievances?: any[];
  certificates?: any[];
  schemes?: any[];
  applications?: any[];
  taxes?: any[];
  payments?: any[];
  assets?: any[];
  notices?: any[];
  notifications?: any[];
  auditLogs?: any[];
  landingVideos?: any[];
  [key: string]: any[] | undefined;
}

const COLLECTIONS: (keyof DbSchema)[] = [
  'users',
  'employees',
  'grievances',
  'certificates',
  'schemes',
  'applications',
  'taxes',
  'payments',
  'assets',
  'notices',
  'notifications',
  'auditLogs',
  'landingVideos',
];

function sanitizeValue<T>(val: T): T {
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

function parseJsonSafe(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  let cleanRaw = raw;
  if (cleanRaw.charCodeAt(0) === 0xfeff) {
    cleanRaw = cleanRaw.slice(1);
  }
  try {
    return JSON.parse(cleanRaw);
  } catch (initialErr) {
    let inString = false;
    let escaped = false;
    let output = '';
    for (let i = 0; i < cleanRaw.length; i++) {
      const char = cleanRaw[i];
      const code = char.charCodeAt(0);
      if (inString) {
        if (escaped) {
          escaped = false;
          output += char;
        } else if (char === '\\') {
          escaped = true;
          output += char;
        } else if (char === '"') {
          inString = false;
          output += char;
        } else if (code < 32) {
          if (char === '\n') output += '\\n';
          else if (char === '\r') output += '\\r';
          else if (char === '\t') output += '\\t';
          else if (char === '\b') output += '\\b';
          else if (char === '\f') output += '\\f';
        } else {
          output += char;
        }
      } else {
        if (char === '"') inString = true;
        output += char;
      }
    }
    return JSON.parse(output);
  }
}

async function createIndexes(db: any) {
  console.log('Creating database indexes...');
  
  // users
  await db.collection('users').createIndex({ id: 1 }, { unique: true, name: 'uniq_user_id' });
  await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true, name: 'uniq_user_email' });
  await db.collection('users').createIndex({ role: 1 }, { name: 'idx_user_role' });

  // employees
  await db.collection('employees').createIndex({ id: 1 }, { unique: true, name: 'uniq_emp_id' });
  await db.collection('employees').createIndex({ email: 1 }, { unique: true, sparse: true, name: 'uniq_emp_email' });
  await db.collection('employees').createIndex({ assignedZone: 1 }, { name: 'idx_emp_zone' });

  // grievances
  await db.collection('grievances').createIndex({ id: 1 }, { unique: true, name: 'uniq_grievance_id' });
  await db.collection('grievances').createIndex({ citizenId: 1 }, { name: 'idx_grievance_citizen' });
  await db.collection('grievances').createIndex({ zone: 1 }, { name: 'idx_grievance_zone' });
  await db.collection('grievances').createIndex({ assignedOfficerId: 1 }, { name: 'idx_grievance_officer' });
  await db.collection('grievances').createIndex({ status: 1 }, { name: 'idx_grievance_status' });

  // certificates
  await db.collection('certificates').createIndex({ id: 1 }, { unique: true, name: 'uniq_cert_id' });
  await db.collection('certificates').createIndex({ citizenId: 1 }, { name: 'idx_cert_citizen' });
  await db.collection('certificates').createIndex({ zone: 1 }, { name: 'idx_cert_zone' });
  await db.collection('certificates').createIndex({ status: 1 }, { name: 'idx_cert_status' });

  // schemes
  await db.collection('schemes').createIndex({ id: 1 }, { unique: true, name: 'uniq_scheme_id' });

  // applications
  await db.collection('applications').createIndex({ id: 1 }, { unique: true, name: 'uniq_app_id' });
  await db.collection('applications').createIndex({ citizenId: 1 }, { name: 'idx_app_citizen' });
  await db.collection('applications').createIndex({ schemeId: 1 }, { name: 'idx_app_scheme' });
  await db.collection('applications').createIndex({ zone: 1 }, { name: 'idx_app_zone' });

  // taxes
  await db.collection('taxes').createIndex({ id: 1 }, { unique: true, name: 'uniq_tax_id' });
  await db.collection('taxes').createIndex({ citizenId: 1 }, { name: 'idx_tax_citizen' });
  await db.collection('taxes').createIndex({ zone: 1 }, { name: 'idx_tax_zone' });

  // payments
  await db.collection('payments').createIndex({ id: 1 }, { unique: true, name: 'uniq_payment_id' });
  await db.collection('payments').createIndex({ transactionId: 1 }, { unique: true, sparse: true, name: 'uniq_payment_tx' });
  await db.collection('payments').createIndex({ citizenId: 1 }, { name: 'idx_payment_citizen' });

  // assets
  await db.collection('assets').createIndex({ id: 1 }, { unique: true, name: 'uniq_asset_id' });
  await db.collection('assets').createIndex({ zone: 1 }, { name: 'idx_asset_zone' });

  // notices
  await db.collection('notices').createIndex({ id: 1 }, { unique: true, name: 'uniq_notice_id' });
  await db.collection('notices').createIndex({ targetZone: 1 }, { name: 'idx_notice_zone' });

  // notifications
  await db.collection('notifications').createIndex({ id: 1 }, { unique: true, name: 'uniq_notif_id' });
  await db.collection('notifications').createIndex({ userId: 1 }, { name: 'idx_notif_user' });

  // auditLogs
  await db.collection('auditLogs').createIndex({ id: 1 }, { unique: true, name: 'uniq_audit_id' });
  await db.collection('auditLogs').createIndex({ timestamp: -1 }, { name: 'idx_audit_ts' });

  // landingVideos
  await db.collection('landingVideos').createIndex({ id: 1 }, { unique: true, name: 'uniq_video_id' });
  await db.collection('landingVideos').createIndex({ isActive: 1 }, { name: 'idx_video_active' });
  
  console.log('✓ All collection indexes created successfully.');
}

async function runMigration() {
  console.log('====================================================');
  console.log('NAMMA PANCHAYATH - JSON TO MONGODB MIGRATION');
  console.log('====================================================');

  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Source database file does not exist: ${DB_FILE}`);
  }

  // 1. Create Timestamped Backup
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `db-backup-${timestamp}.json`);
  fs.copyFileSync(DB_FILE, backupFile);
  console.log(`✓ Pre-migration backup created: ${backupFile}`);

  // 2. Read and parse source JSON
  console.log(`Reading source database from: ${DB_FILE}`);
  const rawData = fs.readFileSync(DB_FILE, 'utf8');
  const jsonData: DbSchema = parseJsonSafe(rawData);
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Failed to parse data/db.json as valid JSON.');
  }

  // 3. Connect to MongoDB
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✓ Connected to MongoDB server successfully.');

  // Extract database name from URI or default to 'namma_panchayath'
  const urlObj = new URL(MONGODB_URI.replace('mongodb://', 'http://'));
  const dbName = urlObj.pathname ? urlObj.pathname.replace(/^\//, '') : 'namma_panchayath';
  const db = client.db(dbName || 'namma_panchayath');
  console.log(`Using database: "${db.databaseName}"`);

  // 4. Create Indexes
  await createIndexes(db);

  // 5. Migrate collections
  console.log('\nStarting collection migrations...');
  const report: Record<string, { jsonCount: number; mongoCount: number; status: string; skipped: number; duplicatesRemoved: number }> = {};

  for (const colName of COLLECTIONS) {
    const records = Array.isArray(jsonData[colName]) ? jsonData[colName]! : [];
    const collection = db.collection(colName);
    let skipped = 0;
    let duplicatesRemoved = 0;

    // Specific handling for employees deduplication
    let cleanRecords = records;
    if (colName === 'employees') {
      const seenEmails = new Set<string>();
      const seenIds = new Set<string>();
      cleanRecords = [];
      for (const emp of records) {
        const email = (emp.email || '').trim().toLowerCase();
        const id = (emp.id || '').trim();
        if (seenEmails.has(email) || seenIds.has(id)) {
          console.log(`  -> Removing duplicate officer entry: ${emp.name} (${emp.email || emp.id})`);
          duplicatesRemoved++;
          continue;
        }
        if (email) seenEmails.add(email);
        if (id) seenIds.add(id);
        cleanRecords.push(emp);
      }
    }

    for (let i = 0; i < cleanRecords.length; i++) {
      const item = cleanRecords[i];
      if (!item) {
        skipped++;
        continue;
      }

      // Ensure stable id
      if (!item.id) {
        item.id = `${colName.slice(0, 3)}_${Date.now()}_${i}`;
      }

      const sanitized = sanitizeValue(item);

      // Remove MongoDB internal _id if mistakenly present in source JSON to prevent immutable field errors
      delete sanitized._id;

      // Ensure valid demo password for users
      if (colName === 'users') {
        if (!sanitized.password || sanitized.password.startsWith('$2b$10$WC.18bT')) {
          sanitized.password = '$2b$10$dqclVd.eYNajgES86lsc/Ot40N9zPxnBM3UIZqiaOqQtNlFZVxxsu'; // 'password123'
        }
      }

      // Idempotent upsert by stable id
      await collection.updateOne(
        { id: sanitized.id },
        { $set: sanitized },
        { upsert: true }
      );
    }

    const mongoCount = await collection.countDocuments();
    const isOk = mongoCount >= (cleanRecords.length - skipped);
    report[colName] = {
      jsonCount: records.length,
      mongoCount,
      status: isOk ? 'OK' : 'MISMATCH',
      skipped,
      duplicatesRemoved,
    };
  }

  const removedPlaceholder = await db.collection('users').deleteMany({
    $or: [
      { id: 'use_1788949522503_270' },
      { email: 'north_officer_test@gram.gov.in' },
      { name: 'North Zone Officer' },
    ],
  });
  if (removedPlaceholder.deletedCount > 0) {
    console.log(`Removed ${removedPlaceholder.deletedCount} invalid placeholder officer account(s).`);
  }

  // 6. Validation Summary Report
  console.log('\n====================================================');
  console.log('MIGRATION VALIDATION REPORT');
  console.log('====================================================');
  console.log(
    'Collection'.padEnd(16) +
    'JSON Count'.padEnd(12) +
    'MongoDB Count'.padEnd(16) +
    'Duplicates'.padEnd(14) +
    'Status'
  );
  console.log('-'.repeat(68));

  let allSuccess = true;
  for (const [col, info] of Object.entries(report)) {
    console.log(
      col.padEnd(16) +
      String(info.jsonCount).padEnd(12) +
      String(info.mongoCount).padEnd(16) +
      String(info.duplicatesRemoved).padEnd(14) +
      info.status
    );
    if (info.status !== 'OK') {
      allSuccess = false;
    }
  }
  console.log('-'.repeat(68));

  await client.close();

  if (!allSuccess) {
    throw new Error('Migration completed with count mismatches! Inspect report above.');
  }

  console.log('\n✓ Migration verified successfully! MongoDB is now the canonical source of truth.');
}

runMigration().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
