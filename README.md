# Namma Panchayath / Smart Gram Panchayath Management System

A full-stack, AI-powered e-governance portal for rural Gram Panchayaths, featuring jurisdiction-based citizen administration, grievance lifecycle tracking, welfare scheme application triaging, property tax billing with UPI payments, certificate generation with QR verification, asset management, and conversational AI assistance.

---

## 🏛 Database Architecture: MongoDB

The system uses **MongoDB** as its **PRIMARY and ONLY runtime database**.

- **Target Database Engine**: MongoDB Community / Enterprise Server
- **Database Name**: `namma_panchayath`
- **Default Connection URI**: `mongodb://127.0.0.1:27017/namma_panchayath`
- **Driver**: Official native `mongodb` Node.js driver (v6+)
- **Runtime Persistence Note**: `data/db.json` is **no longer used at runtime**. All live reads, writes, updates, and deletes persist immediately to MongoDB collections. `data/db.json` and timestamped files in `data/backups/` serve strictly as historical archive backups.

### Collections Overview

| Collection Name | Purpose & Model Description | Key Unique / Sparse Indexes |
| :--- | :--- | :--- |
| `users` | Citizen, Officer, and Admin account credentials & profiles | `id` (unique), `email` (unique, sparse), `role` |
| `employees` | Gram Panchayath administrative officers and staff directory | `id` (unique), `email` (unique, sparse), `assignedZone` |
| `grievances` | Resident complaints, geolocation coordinates, SLA tracking, AI triage | `id` (unique), `citizenId`, `zone`, `status` |
| `certificates` | Applications for Caste, Income, Residence, Birth certificates | `id` (unique), `citizenId`, `zone`, `status` |
| `schemes` | State and Central government welfare schemes catalog | `id` (unique), `status` |
| `applications` | Resident welfare scheme applications and approval history | `id` (unique), `citizenId`, `schemeId`, `zone` |
| `taxes` | Property, water, and trade tax assessments & demand notices | `id` (unique), `citizenId`, `status`, `zone` |
| `payments` | Recorded tax payments, transaction receipts, idempotency records | `id` (unique), `transactionId` (unique), `taxId`, `citizenId` |
| `assets` | Panchayath public infrastructure inventory and maintenance logs | `id` (unique), `assetIdCode` (unique, sparse), `zone` |
| `notices` | Public announcements, tender alerts, and gram sabha circulars | `id` (unique), `targetZone`, `publishedAt` |
| `notifications` | In-app user notifications and resolution dispatches | `id` (unique), `userId`, `isRead`, `isCleared` |
| `auditLogs` | Tamper-evident administrative action log trail | `id` (unique), `timestamp`, `userId` |
| `landingVideos` | Background video management for public portal | `id` (unique), `isActive` |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18+ or v20+
- **MongoDB Server**: MongoDB 6+ or 7+ running locally on port 27017
  - On Windows: Check service status via PowerShell:
    ```powershell
    Get-Service MongoDB
    # If not running, start it:
    Start-Service MongoDB
    ```
  - On macOS: `brew services start mongodb-community`
  - On Linux: `sudo systemctl start mongod`

### 2. Configure Environment Variables

Create or update `.env` in the project root:

```env
PORT=5000
MONGODB_URI="mongodb://127.0.0.1:27017/namma_panchayath"
JWT_SECRET="gram_panchayath_secret_key_2025"
GEMINI_API_KEY="your_gemini_api_key_here"
```

> **Fail-Fast Connection**: If MongoDB is unreachable at startup, the backend server halts immediately with an explanatory error message. It will never fall back silently to any local JSON file.

### 3. Run Data Migration (JSON to MongoDB)

The migration script (`scripts/migrate-json-to-mongodb.ts`) safely ingests historical data from `data/db.json` into MongoDB `namma_panchayath`. It is completely **idempotent** (can be executed multiple times safely without creating duplicates):

```bash
npm run migrate
```

Each run:
1. Automatically creates a timestamped safety backup in `data/backups/db-backup-<timestamp>.json`.
2. Creates all required collections with performance and uniqueness indexes.
3. Upserts records using unique business `id` keys.
4. Outputs a verification report validating that record counts in MongoDB match the source.

### 4. Start the Application

Run both Express backend and Vite frontend concurrently:

```bash
npm run dev
```

- **Frontend Portal**: `http://localhost:5000` (or `http://localhost:5173`)
- **Backend API Health Check**: `http://localhost:5000/api/health`

---

## 🔍 Inspecting Data in MongoDB Compass

You can inspect, query, and manage the live database in real-time using **MongoDB Compass**:

1. Open **MongoDB Compass**.
2. Paste the connection string into the URI bar:
   ```
   mongodb://127.0.0.1:27017/namma_panchayath
   ```
3. Click **Connect**.
4. Select the `namma_panchayath` database from the left sidebar navigation.
5. Explore the collections:
   - `users`: View citizens, officers, and admins.
   - `grievances`: View resident complaints with geo-coordinates and zone routing.
   - `employees`: View officer directory (Sunita Sharma, Vijay Deshmukh, etc.).
   - `taxes` and `payments`: Track municipal billing and transaction audit receipts.
   - `auditLogs`: View timestamped operations.

---

## 🔐 Demo Credentials

| Role | Email | Password | Assigned Zone |
| :--- | :--- | :--- | :--- |
| **Citizen (South)** | `ramesh@gmail.com` | `Citizen@123` | Bengaluru South |
| **Citizen (North)** | `priya@gram.gov.in` | `Citizen@123` | Bengaluru North |
| **Officer (South)** | `officer@gram.gov.in` | `Officer@2026` | Bengaluru South |
| **Officer (North)** | `vijay.officer@gram.gov.in` | `Officer@2026` | Bengaluru North |
| **Admin (Sarpanch)**| `admin@gram.gov.in` | `Admin@123` | All Zones |

---

## 🛠 Available Scripts

- `npm run dev`: Start backend server and frontend development server.
- `npm run migrate`: Run idempotent migration from `data/db.json` into MongoDB `namma_panchayath`.
- `npm run build`: Build production Vite frontend and compile backend bundle via `esbuild`.
- `npm run start`: Run production compiled server.
- `npm run lint`: Run TypeScript compiler type-check (`tsc --noEmit`).
