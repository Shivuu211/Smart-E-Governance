const fs = require('fs');
const http = require('http');
const { MongoClient } = require('mongodb');

const BASE_URL = 'http://localhost:3000';
const MONGO_URI = 'mongodb://127.0.0.1:27017/namma_panchayath';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || (BASE_URL + options.path));
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (data) {
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(reqOptions, (res) => {
      let chunks = '';
      res.on('data', (d) => { chunks += d; });
      res.on('end', () => {
        let parsed = chunks;
        try {
          parsed = JSON.parse(chunks);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: chunks });
      });
    });

    req.on('error', (e) => reject(e));
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING NAMMA PANCHAYATH MONGODB E2E VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, msg) {
    if (condition) {
      console.log(`[PASS] ✓ ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ✗ ${name}: ${msg}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('1. Health Check Endpoint...');
  const healthRes = await request({ path: '/api/health' });
  assert('Health check returns 200', healthRes.status === 200, `Expected 200, got ${healthRes.status}`);
  assert('Health check confirms MongoDB database connected', healthRes.data?.database === 'mongodb' && healthRes.data?.status === 'ok', `Got: ${JSON.stringify(healthRes.data)}`);
  assert('Health check exposes Compass URI', healthRes.data?.compassInspection?.includes('namma_panchayath'), `Compass URI: ${healthRes.data?.compassInspection}`);

  // 2. Auth Logins & Strict Citizen Isolation
  console.log('\n2. Citizen Data Isolation...');
  const rameshLogin = await request({ path: '/api/auth/login', method: 'POST' }, { email: 'ramesh@gmail.com', password: 'Citizen@123' });
  assert('Ramesh Patel (South Citizen) login successful', rameshLogin.status === 200 && !!rameshLogin.data?.token, `Got status ${rameshLogin.status}`);
  const rameshToken = rameshLogin.data?.token;
  const rameshId = rameshLogin.data?.user?.id;

  const priyaLogin = await request({ path: '/api/auth/login', method: 'POST' }, { email: 'priya@gram.gov.in', password: 'Citizen@123' });
  assert('Priya Sharma (North Citizen) login successful', priyaLogin.status === 200 && !!priyaLogin.data?.token, `Got status ${priyaLogin.status}`);
  const priyaToken = priyaLogin.data?.token;
  const priyaId = priyaLogin.data?.user?.id;

  const rameshGrievances = await request({
    path: '/api/grievances',
    headers: { Authorization: `Bearer ${rameshToken}` }
  });
  assert('Ramesh fetch grievances returns 200', rameshGrievances.status === 200, `Got ${rameshGrievances.status}`);
  const rameshList = Array.isArray(rameshGrievances.data) ? rameshGrievances.data : [];
  const allRameshOwn = rameshList.every(g => g.citizenId === rameshId);
  assert('Ramesh receives ONLY his own grievances', allRameshOwn, `Found grievances with other citizenId`);

  const priyaGrievances = await request({
    path: '/api/grievances',
    headers: { Authorization: `Bearer ${priyaToken}` }
  });
  assert('Priya fetch grievances returns 200', priyaGrievances.status === 200, `Got ${priyaGrievances.status}`);
  const priyaList = Array.isArray(priyaGrievances.data) ? priyaGrievances.data : [];
  const allPriyaOwn = priyaList.every(g => g.citizenId === priyaId);
  assert('Priya receives ONLY her own grievances', allPriyaOwn, `Found grievances with other citizenId`);

  // Verify zero overlap
  const rameshIds = new Set(rameshList.map(g => g.id));
  const priyaIds = new Set(priyaList.map(g => g.id));
  const overlap = [...rameshIds].filter(id => priyaIds.has(id));
  assert('Zero grievance leakage between North & South citizens', overlap.length === 0, `Overlapping grievance IDs: ${overlap.join(', ')}`);

  // 3. Officer Directory & Sunita Sharma Deduplication
  console.log('\n3. Officer Management & Deduplication...');
  const employeesRes = await request({ path: '/api/employees' });
  assert('GET /api/employees returns 200', employeesRes.status === 200, `Got status ${employeesRes.status}`);
  const emps = Array.isArray(employeesRes.data) ? employeesRes.data : [];
  const sunitaOccurrences = emps.filter(e => e.email?.toLowerCase() === 'officer@gram.gov.in' || e.name?.toLowerCase().includes('sunita'));
  assert('Sunita Sharma appears EXACTLY ONCE in officer directory', sunitaOccurrences.length === 1, `Found ${sunitaOccurrences.length} occurrences of Sunita Sharma`);

  // Admin login and duplicate officer creation attempt
  const adminLogin = await request({ path: '/api/auth/login', method: 'POST' }, { email: 'admin@gram.gov.in', password: 'Admin@123' });
  assert('Admin login successful', adminLogin.status === 200, `Status ${adminLogin.status}`);
  const adminToken = adminLogin.data?.token;

  const dupOfficerRes = await request({
    path: '/api/employees',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }, {
    name: 'Sunita Sharma Duplicate',
    department: 'Administration',
    role: 'Zone Panchayath Officer',
    email: 'officer@gram.gov.in',
    phone: '9876543210'
  });
  assert('Duplicate officer creation with existing email is rejected with 400', dupOfficerRes.status === 400, `Expected 400, got ${dupOfficerRes.status}`);

  // 4. Runtime Database Verification: db.json is NOT modified during CRUD
  console.log('\n4. Runtime Database Verification (Direct MongoDB persistence & db.json untouched)...');
  const dbJsonPath = 'data/db.json';
  const initialMtime = fs.statSync(dbJsonPath).mtimeMs;

  const testTitle = `Test Water Supply Issue ${Date.now()}`;
  const newGrievanceRes = await request({
    path: '/api/grievances',
    method: 'POST',
    headers: { Authorization: `Bearer ${rameshToken}` }
  }, {
    title: testTitle,
    description: 'Pipe leakage near Community Center South Ward causing water shortage.',
    category: 'Water Supply',
    severity: 'High',
    location: 'Bengaluru South, Ward 01',
    latitude: 12.89,
    longitude: 77.58
  });
  assert('Citizen submits grievance successfully (201)', newGrievanceRes.status === 201, `Status: ${newGrievanceRes.status}, data: ${JSON.stringify(newGrievanceRes.data)}`);
  const createdGrievanceId = newGrievanceRes.data?.id;

  // Direct MongoDB check
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const mongoDb = mongoClient.db();

  const mongoGrievance = await mongoDb.collection('grievances').findOne({ id: createdGrievanceId });
  assert('New grievance is persisted in MongoDB namma_panchayath.grievances', !!mongoGrievance && mongoGrievance.title === testTitle, `MongoDB doc: ${JSON.stringify(mongoGrievance)}`);

  // Verify data/db.json was NOT modified
  const currentMtime = fs.statSync(dbJsonPath).mtimeMs;
  assert('data/db.json file was NOT modified by runtime write (remains archive-only)', initialMtime === currentMtime, `mtime changed from ${initialMtime} to ${currentMtime}`);

  // 5. Payment Idempotency & Duplicate Prevention
  console.log('\n5. Tax Payment & Idempotency...');
  const priyaTaxesRes = await request({
    path: '/api/taxes',
    headers: { Authorization: `Bearer ${priyaToken}` }
  });
  const priyaTaxList = Array.isArray(priyaTaxesRes.data) ? priyaTaxesRes.data : [];
  const unpaidTax = priyaTaxList.find(t => t.status === 'Unpaid' && t.citizenId === priyaId);
  if (unpaidTax) {
    const payRes1 = await request({
      path: '/api/payments',
      method: 'POST',
      headers: { Authorization: `Bearer ${priyaToken}` }
    }, {
      taxId: unpaidTax.id,
      amount: unpaidTax.amount,
      type: 'UPI / QR Code'
    });
    assert('Payment 1 succeeds (201)', payRes1.status === 201, `Status: ${payRes1.status}`);

    const payRes2 = await request({
      path: '/api/payments',
      method: 'POST',
      headers: { Authorization: `Bearer ${priyaToken}` }
    }, {
      taxId: unpaidTax.id,
      amount: unpaidTax.amount,
      type: 'UPI / QR Code'
    });
    assert('Duplicate payment for same tax bill rejected with 400', payRes2.status === 400, `Expected 400, got ${payRes2.status}`);

    // Verify in MongoDB
    const updatedMongoTax = await mongoDb.collection('taxes').findOne({ id: unpaidTax.id });
    assert('Tax record marked "Paid" in MongoDB', updatedMongoTax?.status === 'Paid', `Tax status: ${updatedMongoTax?.status}`);

    // Restore for repeatable tests
    await mongoDb.collection('taxes').updateOne({ id: unpaidTax.id }, { $set: { status: 'Unpaid' } });
    if (payRes1.data?.id) {
      await mongoDb.collection('payments').deleteOne({ id: payRes1.data.id });
    }
    console.log(`[CleanUp] Restored tax ${unpaidTax.id} to Unpaid and removed test payment.`);
  } else {
    console.log('[SKIP] No unpaid taxes found for testing');
  }

  // 6. Live MongoDB Backup Download
  console.log('\n6. Live Database Backup Export (/api/backup/download)...');
  const backupRes = await request({ path: '/api/backup/download' });
  assert('Backup download returns 200', backupRes.status === 200, `Got ${backupRes.status}`);
  assert('Backup contains users collection array', Array.isArray(backupRes.data?.users) && backupRes.data.users.length > 0, `Users count: ${backupRes.data?.users?.length}`);
  assert('Backup contains live test grievance from MongoDB', (backupRes.data?.grievances || []).some(g => g.id === createdGrievanceId), 'Grievance not in backup export');

  // Clean up test grievance from MongoDB
  if (createdGrievanceId) {
    await mongoDb.collection('grievances').deleteOne({ id: createdGrievanceId });
    console.log(`[CleanUp] Test grievance ${createdGrievanceId} deleted from MongoDB.`);
  }
  await mongoClient.close();

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
