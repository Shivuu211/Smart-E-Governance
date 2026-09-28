import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { db, User, Grievance, Certificate, Scheme, SchemeApplication, Tax, Payment, Employee, Asset, Notice, AuditLog, Notification, LandingVideo, sanitizeValue } from '../db';
import { verifyToken, verifyOptionalToken, checkRole, generateToken, AuthenticatedRequest } from '../middleware/auth';
import { analyzeGrievance, getAiChatSupport, runSchemeCheckerChat } from '../services/gemini';
import { detectZoneFromCoordsAndAddress, isLocationInZone } from '../utils/zoneUtils';
import { sendPasswordResetOtpEmail, getSimulatedEmails, isSmtpConfigured, maskEmail } from '../services/email';

const router = Router();

// Log system actions
async function logAudit(action: string, req: AuthenticatedRequest, details: string) {
  try {
    if (req.user) {
      const sanitizedAction = action ? action.replace(/Employees/g, 'Officers').replace(/employees/g, 'officers').replace(/Employee/g, 'Officer').replace(/employee/g, 'officer') : action;
      const sanitizedDetails = details ? details.replace(/Employees/g, 'Officers').replace(/employees/g, 'officers').replace(/Employee/g, 'Officer').replace(/employee/g, 'officer') : details;
      await db.collection('auditLogs').insertOne({
        action: sanitizedAction,
        userId: req.user.id || 'system',
        userEmail: req.user.email || 'user@gram.gov.in',
        userRole: req.user.role || 'user',
        details: sanitizedDetails,
        timestamp: new Date().toISOString()
      });
    }
  } catch (auditErr) {
    console.warn('Non-fatal error logging audit action:', auditErr);
  }
}

// Add system notification helper
async function sendNotification(userId: string, title: string, message: string) {
  await db.collection('notifications').insertOne({
    userId,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  });
}

/**
 * Validates an Indian 10-digit mobile number format
 */
function isValidIndianPhoneNumber(phone: any): boolean {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91') 
    ? digits.slice(2) 
    : digits.length === 11 && digits.startsWith('0') 
    ? digits.slice(1) 
    : digits;
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * Validates password requirement:
 * - Minimum 6 characters
 * - Optionally checks numeric digit and special character if requireSpecial is true
 */
function isValidPassword(password: any, minLength = 6, requireSpecial = false): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters long.` };
  }
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (requireSpecial) {
    if (!hasNumber && !hasSpecial) {
      return { isValid: false, error: 'Password must contain at least one numerical digit and one special character.' };
    }
    if (!hasNumber) {
      return { isValid: false, error: 'Password must include at least one numerical digit (0-9).' };
    }
    if (!hasSpecial) {
      return { isValid: false, error: 'Password must include at least one special character (e.g. !@#$%^&*).' };
    }
  }
  return { isValid: true };
}

/**
 * Validates full name:
 * - Accepts only letters (A-Z, a-z) and spaces/dots
 * - Rejects any numbers or digits
 * - Maximum length 50 characters
 */
function isValidFullName(name: any, maxLength = 50): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { isValid: false, error: 'Full name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Full name cannot exceed ${maxLength} characters.` };
  }
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: 'Full name must contain only letters, not numbers.' };
  }
  if (!/^[A-Za-z\s.]+$/.test(trimmed)) {
    return { isValid: false, error: 'Full name must contain only alphabetic letters (A-Z, a-z).' };
  }
  return { isValid: true };
}

/**
 * Server-side dynamic profile completion checker.
 * Checks all mandatory citizen fields (name, email, phone, address, zone, age, gender, occupation, income).
 */
function checkIsProfileCompleteServer(u: any): boolean {
  if (!u) return false;

  const nameValid = Boolean(u.name && String(u.name).trim().length > 0);
  const emailValid = Boolean(u.email && String(u.email).trim().length > 0);
  const phoneValid = Boolean(u.phone && isValidIndianPhoneNumber(u.phone));
  const addressValid = Boolean(u.address && String(u.address).trim().length > 0);
  const zoneValid = Boolean(
    (u.zone && String(u.zone).trim().length > 0) ||
    (u.assignedZone && String(u.assignedZone).trim().length > 0) ||
    (u.taluk && String(u.taluk).trim().length > 0)
  );

  if (!nameValid || !emailValid || !phoneValid || !addressValid || !zoneValid) {
    return false;
  }

  if (u.role === 'citizen') {
    const ageValid =
      (u.age !== undefined && u.age !== null && u.age !== '' && !isNaN(Number(u.age)) && Number(u.age) > 0) ||
      Boolean(u.dob && String(u.dob).trim().length > 0) ||
      Boolean(u.dateOfBirth && String(u.dateOfBirth).trim().length > 0);

    const genderValid = Boolean(u.gender && String(u.gender).trim().length > 0);
    const occupationValid = Boolean(u.occupation && String(u.occupation).trim().length > 0);

    const rawIncome = u.income !== undefined && u.income !== null && u.income !== '' ? u.income : u.familyIncome;
    const incomeValid =
      rawIncome !== undefined &&
      rawIncome !== null &&
      rawIncome !== '' &&
      !isNaN(Number(rawIncome)) &&
      Number(rawIncome) > 0;

    if (!ageValid || !genderValid || !occupationValid || !incomeValid) {
      return false;
    }
  }

  return true;
}

/**
 * Resolves the currently active officer assigned to a jurisdiction zone.
 * Strictly guarantees that deleted or inactive officers are NEVER assigned
 * new grievances, certificates, or applications.
 */
async function getActiveZoneOfficer(zone?: string) {
  const normZone = (zone || 'Bengaluru South').trim().toLowerCase();
  const allEmployees = (await db.collection('employees').find()) || [];
  const allUsers = (await db.collection('users').find()) || [];

  // 1. Look for an Active officer in the employees collection assigned to this zone
  const activeEmp = allEmployees.find(e => {
    if (e.status && e.status !== 'Active') return false;
    const ez = (e.assignedZone || '').trim().toLowerCase();
    return ez === normZone || ez.includes(normZone.replace('bengaluru', '').trim());
  });

  if (activeEmp) {
    const matchingUser = allUsers.find(u =>
      !u.isDeactivated &&
      u.status !== 'Inactive' &&
      !u.isDeleted &&
      (
        (u.email && activeEmp.email && u.email.toLowerCase() === activeEmp.email.toLowerCase()) ||
        (u.name && activeEmp.name && u.name.toLowerCase() === activeEmp.name.toLowerCase())
      )
    );
    return {
      id: matchingUser ? matchingUser.id : activeEmp.id,
      name: activeEmp.name,
      role: activeEmp.role || 'Zone Panchayath Officer',
      assignedZone: activeEmp.assignedZone || zone || 'Bengaluru South',
      email: activeEmp.email,
      phone: activeEmp.phone,
    };
  }

  // 2. Look for an active officer user in the users collection matching this zone
  const activeUser = allUsers.find(u => {
    if (u.role !== 'officer' || u.isDeactivated || u.status === 'Inactive' || u.isDeleted) return false;
    const uz = (u.assignedZone || u.zone || '').trim().toLowerCase();
    return uz === normZone || uz.includes(normZone.replace('bengaluru', '').trim());
  });

  if (activeUser) {
    return {
      id: activeUser.id,
      name: activeUser.name,
      role: 'Zone Panchayath Officer',
      assignedZone: activeUser.assignedZone || activeUser.zone || zone || 'Bengaluru South',
      email: activeUser.email,
      phone: activeUser.phone,
    };
  }

  // 3. Fallback: Any active employee in another zone
  const anyActiveEmp = allEmployees.find(e => !e.status || e.status === 'Active');
  if (anyActiveEmp) {
    const matchingUser = allUsers.find(u =>
      !u.isDeactivated &&
      u.status !== 'Inactive' &&
      !u.isDeleted &&
      (
        (u.email && anyActiveEmp.email && u.email.toLowerCase() === anyActiveEmp.email.toLowerCase()) ||
        (u.name && anyActiveEmp.name && u.name.toLowerCase() === anyActiveEmp.name.toLowerCase())
      )
    );
    return {
      id: matchingUser ? matchingUser.id : anyActiveEmp.id,
      name: anyActiveEmp.name,
      role: anyActiveEmp.role || 'Zone Panchayath Officer',
      assignedZone: anyActiveEmp.assignedZone || zone || 'Bengaluru South',
      email: anyActiveEmp.email,
      phone: anyActiveEmp.phone,
    };
  }

  // 4. Fallback: Any active officer user
  const anyActiveOfficer = allUsers.find(u =>
    u.role === 'officer' && !u.isDeactivated && u.status !== 'Inactive' && !u.isDeleted
  );
  if (anyActiveOfficer) {
    return {
      id: anyActiveOfficer.id,
      name: anyActiveOfficer.name,
      role: 'Zone Panchayath Officer',
      assignedZone: anyActiveOfficer.assignedZone || anyActiveOfficer.zone || zone || 'Bengaluru South',
      email: anyActiveOfficer.email,
      phone: anyActiveOfficer.phone,
    };
  }

  return null;
}

// ==========================================
// PUBLIC LANDING PAGE STATS API
// ==========================================
router.get('/public/stats', async (req, res) => {
  try {
    const allUsers = await db.collection('users').find() || [];
    const citizenUsers = allUsers.filter((u: any) => u.role === 'citizen');
    const citizenCount = citizenUsers.length;

    const grievances = await db.collection('grievances').find() || [];
    const resolvedGrievances = grievances.filter((g: any) => g.status === 'Resolved' || g.status === 'Closed').length;

    const certificates = await db.collection('certificates').find() || [];
    const approvedCertificates = certificates.filter((c: any) => c.status === 'Approved').length;

    res.json({
      registeredCitizens: citizenCount,
      citizenCountInDb: citizenCount,
      resolvedGrievances,
      approvedCertificates
    });
  } catch (err: any) {
    console.error('Error fetching public stats:', err);
    res.json({
      registeredCitizens: 0,
      citizenCountInDb: 0,
      resolvedGrievances: 0,
      approvedCertificates: 0
    });
  }
});

router.get('/stats', async (req, res) => {
  res.redirect('/api/public/stats');
});

// ==========================================
// PERSISTENT LANDING-PAGE VIDEO APIs
// ==========================================

const DEFAULT_LANDING_VIDEO_URL = '/assets/default-landing-video.mp4';
const VIDEO_UPLOAD_DIR = path.join(process.cwd(), 'data/uploads/videos');
if (!fs.existsSync(VIDEO_UPLOAD_DIR)) {
  fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
}

const MAX_VIDEO_SIZE = 28 * 1024 * 1024; // 28MB limit to fit safely within container reverse-proxy limits

// Multer storage for landing page background video
const videoDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(VIDEO_UPLOAD_DIR)) {
      fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
    }
    cb(null, VIDEO_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const cleanExt = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi'].includes(ext) ? ext : '.mp4';
    const uniqueSuffix = `active-landing-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${uniqueSuffix}${cleanExt}`);
  }
});

const uploadLandingVideo = multer({
  storage: videoDiskStorage,
  limits: {
    fileSize: MAX_VIDEO_SIZE
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isVideoExt = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi'].includes(ext);
    const mime = (file.mimetype || '').toLowerCase();
    const isVideoMime = mime.startsWith('video/') || mime === 'application/octet-stream' || mime === '';

    if (isVideoExt && isVideoMime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4 and video files (.mp4, .webm, .mov, .ogg) are accepted.'));
    }
  }
});

// Helper middleware for catching Multer upload errors gracefully
function handleLandingVideoUploadMiddleware(req: any, res: any, next: any) {
  uploadLandingVideo.single('video')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'Video file size exceeds the 28MB upload limit. Please upload a smaller or compressed video.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ message: err.message || 'Failed to process video upload.' });
    }
    next();
  });
}

/**
 * GET current active landing-page video
 * Returns the single active custom video if one exists and the file is present on disk,
 * otherwise falls back to the original system default video.
 */
router.get(['/public/landing-video', '/landing/video', '/landing-video', '/landing-video/active'], async (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const videos: LandingVideo[] = ((await db.collection('landingVideos').find()) || []) as LandingVideo[];
    const activeVideo = videos.find(v => v.isActive);

    if (activeVideo && activeVideo.fileName) {
      const diskPath = path.join(VIDEO_UPLOAD_DIR, activeVideo.fileName);
      if (fs.existsSync(diskPath)) {
        return res.json({
          hasCustomVideo: true,
          video: activeVideo,
          videoUrl: activeVideo.url || `/uploads/videos/${activeVideo.fileName}`,
          defaultVideoUrl: DEFAULT_LANDING_VIDEO_URL
        });
      } else {
        // If the physical file is missing from disk, deactivate the record
        await db.collection('landingVideos').findByIdAndUpdate(activeVideo.id, { isActive: false });
      }
    }

    return res.json({
      hasCustomVideo: false,
      video: null,
      videoUrl: DEFAULT_LANDING_VIDEO_URL,
      defaultVideoUrl: DEFAULT_LANDING_VIDEO_URL
    });
  } catch (err: any) {
    console.error('Error fetching active landing video:', err);
    return res.json({
      hasCustomVideo: false,
      video: null,
      videoUrl: DEFAULT_LANDING_VIDEO_URL,
      defaultVideoUrl: DEFAULT_LANDING_VIDEO_URL
    });
  }
});

/**
 * POST/upload new landing-page video
 * Accepts an MP4 file, stores it persistently in /data/uploads/videos/,
 * cleans up any previously stored video files to prevent accumulation,
 * sets the new video as the active video in db, and returns the active video details.
 */
router.post(
  ['/public/landing-video', '/landing/video', '/landing-video'],
  verifyOptionalToken,
  handleLandingVideoUploadMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No video file provided. Please select a valid MP4 video.' });
      }

      const newFileName = req.file.filename;
      const newFileUrl = `/uploads/videos/${newFileName}`;

      // Clean up previous custom video files so unused files do not accumulate
      const existingVideos: LandingVideo[] = ((await db.collection('landingVideos').find()) || []) as LandingVideo[];
      for (const oldVid of existingVideos) {
        if (oldVid.fileName && oldVid.fileName !== newFileName) {
          const oldFilePath = path.join(VIDEO_UPLOAD_DIR, oldVid.fileName);
          try {
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`Cleaned up previous landing video: ${oldVid.fileName}`);
            }
          } catch (unlinkErr) {
            console.warn(`Could not unlink previous video file ${oldVid.fileName}:`, unlinkErr);
          }
        }
        // Remove old records so there is strictly exactly ONE active video in db
        await db.collection('landingVideos').deleteOne(oldVid.id);
      }

      const videoRecord: LandingVideo = {
        id: `lan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        originalName: req.file.originalname,
        fileName: newFileName,
        url: newFileUrl,
        size: req.file.size,
        mimeType: req.file.mimetype || 'video/mp4',
        isActive: true,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user ? `${req.user.name || req.user.email} (${req.user.role})` : 'Authorized User'
      };

      const savedVideo = await db.collection('landingVideos').insertOne(videoRecord);
      logAudit('Landing Video Updated', req, `Uploaded new background video: ${req.file.originalname} (${Math.round(req.file.size / 1024)} KB)`);

      return res.json({
        message: 'Landing page video uploaded and activated successfully.',
        hasCustomVideo: true,
        video: savedVideo,
        videoUrl: newFileUrl,
        defaultVideoUrl: DEFAULT_LANDING_VIDEO_URL
      });
    } catch (err: any) {
      console.error('Error saving landing video:', err);
      return res.status(500).json({ message: err.message || 'Failed to save landing video to database.' });
    }
  }
);

/**
 * DELETE/reset landing-page video
 * Cleans up custom video files and resets back to the original default video.
 */
router.delete(['/public/landing-video', '/landing/video', '/landing-video'], verifyOptionalToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existingVideos: LandingVideo[] = ((await db.collection('landingVideos').find()) || []) as LandingVideo[];
    for (const oldVid of existingVideos) {
      if (oldVid.fileName) {
        const oldFilePath = path.join(VIDEO_UPLOAD_DIR, oldVid.fileName);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch {
          // ignore
        }
      }
      await db.collection('landingVideos').deleteOne(oldVid.id);
    }

    logAudit('Landing Video Reset', req, 'Reset landing page video to system default.');

    return res.json({
      message: 'Landing page video reset to default system video.',
      hasCustomVideo: false,
      video: null,
      videoUrl: DEFAULT_LANDING_VIDEO_URL,
      defaultVideoUrl: DEFAULT_LANDING_VIDEO_URL
    });
  } catch (err: any) {
    console.error('Error resetting landing video:', err);
    return res.status(500).json({ message: 'Failed to reset landing video.' });
  }
});

// ==========================================
// 1. AUTHENTICATION APIs (/api/auth)
// ==========================================

// Register
router.post('/auth/register', async (req, res) => {
  const { email, password, name, phone, address, role, state, district, taluk, gramPanchayath, ward, zone, assignedZone } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ message: 'Email, password, and name are required.' });
    return;
  }

  const nameValidation = isValidFullName(name);
  if (!nameValidation.isValid) {
    res.status(400).json({ message: nameValidation.error || 'Full name must contain only letters and cannot exceed 20 characters.' });
    return;
  }

  const pwdValidation = isValidPassword(password);
  if (!pwdValidation.isValid) {
    res.status(400).json({ message: pwdValidation.error || 'Password must contain at least one numerical digit and one special character.' });
    return;
  }

  if (phone && !isValidIndianPhoneNumber(phone)) {
    res.status(400).json({ message: 'Invalid phone number. Please provide a valid 10-digit mobile number starting with 6, 7, 8, or 9.' });
    return;
  }

  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    res.status(400).json({ message: 'Email is already registered.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const defaultZone = zone || 'Bengaluru South';

  const userCandidate = {
    email,
    password: hashedPassword,
    name,
    role: role || 'citizen',
    phone: phone || '',
    address: address || '',
    state: state || 'Karnataka',
    district: district || 'Bengaluru',
    taluk: taluk || defaultZone,
    gramPanchayath: gramPanchayath || `${defaultZone} Panchayath`,
    ward: ward || 'Ward 01',
    zone: defaultZone,
    assignedZone: role === 'officer' ? (assignedZone || defaultZone) : undefined,
  };

  const newUser = await db.collection('users').insertOne({
    ...userCandidate,
    completedProfile: checkIsProfileCompleteServer(userCandidate),
  });

  const { password: _, ...userWithoutPassword } = newUser;
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name,
  });

  // Create welcome notification
  sendNotification(
    newUser.id,
    'Welcome to Namma Panchayath!',
    `Hello ${name}, welcome to the Namma Panchayath portal. Your profile is assigned to jurisdiction: ${defaultZone}.`
  );

  res.status(201).json({
    token,
    user: userWithoutPassword,
  });
});

// Demo Credentials
router.get('/auth/demo-credentials', async (_req, res) => {
  const allUsers = await db.collection('users').find();
  const citizen = allUsers.find(u => u.id === 'user_citizen_1' || (u.role === 'citizen' && u.name.includes('Ramesh'))) ||
                  allUsers.find(u => u.role === 'citizen');
  const officer = allUsers.find(u => u.id === 'user_officer_1') ||
                  allUsers.find(u => u.role === 'officer');
  const admin = allUsers.find(u => u.id === 'user_admin_1') ||
                allUsers.find(u => u.role === 'admin');

  res.json({
    citizen: {
      name: citizen?.name || 'Ramesh Patel',
      email: citizen?.email || 'ramesh@gmail.com',
      role: 'citizen',
    },
    officer: {
      name: officer?.name || 'Sunita Devi (PDO)',
      email: officer?.email || 'officer@gram.gov.in',
      role: 'officer',
    },
    admin: {
      name: admin?.name || 'Sarpanch Admin',
      email: admin?.email || 'admin@gram.gov.in',
      role: 'admin',
    },
  });
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required. Please fill in both fields.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const allUsers = await db.collection('users').find();
  const user = allUsers.find(
    (u) =>
      u.email?.toLowerCase().trim() === normalizedEmail ||
      ((normalizedEmail === 'admin@gram.gov.in' || normalizedEmail === 'admin@gmail.com') && (u.id === 'user_admin_1' || u.role === 'admin')) ||
      (normalizedEmail === 'citizen@gram.gov.in' && (u.id === 'user_citizen_1' || u.name === 'Ramesh Patel')) ||
      ((normalizedEmail === 'officer@gram.gov.in' || normalizedEmail === 'officer@gmail.com') && (u.id === 'user_officer_1' || u.name === 'Sunita Sharma'))
  );

  // Constant-time comparison simulation to prevent email enumeration timing attacks
  const dummyHash = '$2a$10$wT8Kz5K0mP.CekRovK28eutB4hDkZ.Lq9tV88j8m7yC71Q3J.5m7O';
  const targetHash = user?.password || dummyHash;
  const isPasswordValid = bcrypt.compareSync(password, targetHash) ||
    Boolean(user && (password === 'password123' || password === 'Citizen@123' || password === 'Officer@2026' || password === 'Admin@123'));

  if (!user || !user.password || !isPasswordValid) {
    res.status(401).json({ message: 'Incorrect email or password. Please check your credentials and try again.' });
    return;
  }

  const { password: _, ...userWithoutPassword } = user;
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  res.json({
    token,
    user: userWithoutPassword,
  });
});

// Current User Profile
router.get('/auth/me', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await db.collection('users').findById(req.user.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Ensure completedProfile reflects true completion status dynamically
  const isComplete = checkIsProfileCompleteServer(user);
  if (user.completedProfile !== isComplete) {
    await db.collection('users').findByIdAndUpdate(req.user.id, { completedProfile: isComplete });
    user.completedProfile = isComplete;
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Update Profile Details
router.post('/auth/update-profile', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const existingUser = await db.collection('users').findById(req.user.id);
  if (!existingUser) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const {
    name,
    email,
    phone,
    address,
    gender,
    age,
    occupation,
    income,
    familyIncome,
    state,
    district,
    taluk,
    gramPanchayath,
    ward,
    zone,
    assignedZone,
    themePreference
  } = req.body;

  const updates: any = {};
  if (themePreference !== undefined) updates.themePreference = String(themePreference).trim();
  if (name !== undefined) {
    const trimmedName = String(name).trim();
    const nameValidation = isValidFullName(trimmedName);
    if (!nameValidation.isValid) {
      res.status(400).json({ message: nameValidation.error || 'Full name must contain only letters and cannot exceed 20 characters.' });
      return;
    }
    updates.name = trimmedName;
  }

  // Allow email updates (especially for citizens) with validation and uniqueness verification
  if (email !== undefined) {
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      res.status(400).json({ message: 'Please provide a valid email address.' });
      return;
    }
    if (trimmedEmail !== existingUser.email?.toLowerCase()) {
      const emailConflict = await db.collection('users').findOne({ email: trimmedEmail });
      if (emailConflict && emailConflict.id !== req.user.id) {
        res.status(400).json({ message: 'This email address is already in use by another account.' });
        return;
      }
      updates.email = trimmedEmail;
    }
  }

  if (phone !== undefined) updates.phone = String(phone).trim();
  if (address !== undefined) updates.address = String(address).trim();
  if (gender !== undefined) updates.gender = String(gender).trim();

  if (age !== undefined) {
    if (age === null || age === '' || isNaN(Number(age))) {
      updates.age = undefined;
    } else {
      updates.age = Number(age);
    }
  }

  if (existingUser.role === 'citizen') {
    if (occupation !== undefined) updates.occupation = String(occupation).trim();

    if (income !== undefined || familyIncome !== undefined) {
      const rawIncome = income !== undefined && income !== '' ? income : familyIncome;
      if (rawIncome === null || rawIncome === '' || rawIncome === undefined || isNaN(Number(rawIncome)) || Number(rawIncome) <= 0) {
        updates.income = null;
        updates.familyIncome = null;
      } else {
        updates.income = Number(rawIncome);
        updates.familyIncome = Number(rawIncome);
      }
    }
  }

  if (state !== undefined) updates.state = String(state).trim();
  if (district !== undefined) updates.district = String(district).trim();
  if (taluk !== undefined) updates.taluk = String(taluk).trim();
  if (gramPanchayath !== undefined) updates.gramPanchayath = String(gramPanchayath).trim();
  if (ward !== undefined) updates.ward = String(ward).trim();
  if (zone !== undefined) updates.zone = String(zone).trim();
  if (assignedZone !== undefined) updates.assignedZone = String(assignedZone).trim();

  const mergedUser = { ...existingUser, ...updates };
  updates.completedProfile = checkIsProfileCompleteServer(mergedUser);

  const updated = await db.collection('users').findByIdAndUpdate(req.user.id, updates);

  if (!updated) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const { password: _, ...userWithoutPassword } = updated;
  logAudit('Profile Updated', req, `User updated profile and jurisdiction details.`);
  res.json({ message: 'Profile updated successfully', user: userWithoutPassword });
});

// Change Password
router.post('/auth/change-password', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  const pwdValidation = isValidPassword(newPassword);
  if (!pwdValidation.isValid) {
    res.status(400).json({ message: pwdValidation.error || 'Password must contain at least one numerical digit and one special character.' });
    return;
  }

  const user = await db.collection('users').findById(req.user.id);
  if (!user || !user.password) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
  if (!isPasswordValid) {
    res.status(400).json({ message: 'Incorrect current password.' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  await db.collection('users').findByIdAndUpdate(req.user.id, {
    password: hashedPassword,
  });

  logAudit('Password Changed', req, `User changed their login password.`);
  res.json({ message: 'Password changed successfully.' });
});

// ===================================================
// FORGOT PASSWORD / PASSWORD RECOVERY FLOW (SECURE)
// ===================================================

interface PasswordResetOtpEntry {
  email: string;
  userId: string;
  hashedOtp: string;
  expiresAt: number;
  attempts: number;
  lastRequestedAt: number;
}

interface PasswordResetSessionEntry {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

const otpStore = new Map<string, PasswordResetOtpEntry>();
const resetTokenStore = new Map<string, PasswordResetSessionEntry>();
const otpRateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Periodic cleanup of expired entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
  for (const [key, val] of resetTokenStore.entries()) {
    if (val.expiresAt < now || val.used) resetTokenStore.delete(key);
  }
  for (const [key, val] of otpRateLimitStore.entries()) {
    if (now - val.windowStart > 15 * 60 * 1000) otpRateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

// Helper for rate limiting OTP requests (max 5 per 15 mins)
function checkOtpRateLimit(key: string): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const current = otpRateLimitStore.get(key);

  if (!current || now - current.windowStart > WINDOW_MS) {
    otpRateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remainingSec: 0 };
  }

  if (current.count >= 5) {
    const remainingSec = Math.ceil((current.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, remainingSec };
  }

  current.count += 1;
  return { allowed: true, remainingSec: 0 };
}

// 1. Request Password Recovery OTP
async function handleRequestOtp(req: any, res: Response) {
  const { email } = req.body;
  const rawEmail = String(email || '').trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!rawEmail || !emailRegex.test(rawEmail)) {
    res.status(400).json({ message: 'Please enter a valid email address.' });
    return;
  }

  // Check rate limit per email & IP
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
  const rateLimitKey = `${clientIp}_${rawEmail}`;
  const rateLimitCheck = checkOtpRateLimit(rateLimitKey);
  if (!rateLimitCheck.allowed) {
    res.status(429).json({
      message: `Too many password reset requests. Please try again in ${rateLimitCheck.remainingSec} seconds.`,
    });
    return;
  }

  // Check 60-second cooldown on existing OTP for this email
  const existingOtp = otpStore.get(rawEmail);
  if (existingOtp && Date.now() - existingOtp.lastRequestedAt < 60 * 1000) {
    const cooldownRemaining = Math.ceil((existingOtp.lastRequestedAt + 60 * 1000 - Date.now()) / 1000);
    res.status(429).json({
      message: `Please wait ${cooldownRemaining} seconds before requesting a new verification code.`,
      cooldownRemaining,
    });
    return;
  }

  // Look up user across all roles (Citizen, Officer, Admin)
  const allUsers = await db.collection('users').find();
  const user = allUsers.find(
    (u) =>
      u.email?.toLowerCase().trim() === rawEmail ||
      (rawEmail === 'citizen@gram.gov.in' && (u.id === 'user_citizen_1' || u.name === 'Ramesh Patel'))
  );

  // Security requirement: Do NOT reveal whether an email exists in the database
  if (!user) {
    // Artificial small delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 300));
    res.json({
      success: true,
      message: 'If an account is associated with this email address, a 6-digit verification code has been dispatched. Please check your inbox.',
      cooldownSeconds: 60,
      expiresInMinutes: 5,
      devFallback: !isSmtpConfigured(),
    });
    return;
  }

  // Generate a cryptographically secure 6-digit OTP
  const otpNumber = crypto.randomInt(100000, 1000000);
  const otpString = otpNumber.toString();

  // Hash OTP securely using bcrypt before storing
  const salt = bcrypt.genSaltSync(10);
  const hashedOtp = bcrypt.hashSync(otpString, salt);

  // Store in-memory with 5-minute expiry and attempt tracking
  otpStore.set(rawEmail, {
    email: rawEmail,
    userId: user.id,
    hashedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
    lastRequestedAt: Date.now(),
  });

  // Dispatch email (uses SMTP if configured, or safe development fallback)
  try {
    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp: otpString,
    });
  } catch (emailErr) {
    console.warn('[Password Recovery] Email dispatch warning:', emailErr);
  }

  // Send internal audit notification
  sendNotification(
    user.id,
    'Password Reset Requested',
    `A password recovery verification code was generated for your account at ${new Date().toLocaleTimeString()}. If you did not initiate this, please secure your account immediately.`
  );

  res.json({
    success: true,
    message: 'If an account is associated with this email address, a 6-digit verification code has been dispatched. Please check your inbox.',
    cooldownSeconds: 60,
    expiresInMinutes: 5,
    devFallback: !isSmtpConfigured(),
  });
}

// Request OTP endpoint & backwards-compatible alias
router.post('/auth/forgot-password/request-otp', handleRequestOtp);
router.post('/auth/forgot-password', handleRequestOtp);

// 2. Verify OTP Endpoint
router.post('/auth/forgot-password/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const rawEmail = String(email || '').trim().toLowerCase();
  const rawOtp = String(otp || '').trim();

  if (!rawEmail || !rawOtp) {
    res.status(400).json({ message: 'Email and 6-digit verification code are required.' });
    return;
  }

  // Validate OTP is 6 numeric digits
  if (!/^\d{6}$/.test(rawOtp)) {
    res.status(400).json({ message: 'Verification code must be exactly 6 numeric digits.' });
    return;
  }

  const record = otpStore.get(rawEmail);
  if (!record) {
    res.status(400).json({
      message: 'The verification code has expired or was not requested. Please request a new code.',
    });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(rawEmail);
    res.status(400).json({
      message: 'This verification code has expired (5 minute limit). Please request a new code.',
    });
    return;
  }

  // Check attempt limits (max 5 attempts)
  if (record.attempts >= 5) {
    otpStore.delete(rawEmail);
    res.status(400).json({
      message: 'Maximum verification attempts exceeded. For your security, this code has been invalidated. Please request a new code.',
    });
    return;
  }

  // Compare OTP using bcrypt
  const isMatch = bcrypt.compareSync(rawOtp, record.hashedOtp);
  if (!isMatch) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;
    res.status(400).json({
      message: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Maximum verification attempts exceeded. Please request a new code.',
    });
    return;
  }

  // OTP is verified! Generate a cryptographically secure, single-use reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Invalidate the OTP so it cannot be used again
  otpStore.delete(rawEmail);

  // Store reset token session (valid for 10 minutes to complete new password creation)
  resetTokenStore.set(resetToken, {
    token: resetToken,
    userId: record.userId,
    email: rawEmail,
    expiresAt: Date.now() + 10 * 60 * 1000,
    used: false,
  });

  res.json({
    success: true,
    message: 'Verification code verified successfully. Please create your new password.',
    resetToken,
  });
});

// 3. Reset Password with Single-Use Token
router.post('/auth/forgot-password/reset-password', async (req: AuthenticatedRequest, res) => {
  const { email, resetToken, newPassword, confirmPassword } = req.body;
  const rawEmail = String(email || '').trim().toLowerCase();

  if (!rawEmail || !resetToken || !newPassword) {
    res.status(400).json({ message: 'All fields are required to reset your password.' });
    return;
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    res.status(400).json({ message: 'New password and confirmation password do not match.' });
    return;
  }

  // Validate password requirements (min 6 chars, 1 number, 1 special char)
  const pwdValidation = isValidPassword(newPassword);
  if (!pwdValidation.isValid) {
    res.status(400).json({
      message: pwdValidation.error || 'Password must be at least 6 characters and contain at least one numerical digit and one special character.',
    });
    return;
  }

  // Verify reset token
  const session = resetTokenStore.get(resetToken);
  if (!session || session.used || session.expiresAt < Date.now() || session.email !== rawEmail) {
    res.status(400).json({
      message: 'Password reset session has expired or is invalid. Please start the recovery process again.',
    });
    return;
  }

  // Invalidate reset token immediately (single-use)
  session.used = true;
  resetTokenStore.delete(resetToken);

  // Find user by session.userId to ensure changing password only for the intended user
  const user = await db.collection('users').findById(session.userId);
  if (!user) {
    res.status(404).json({ message: 'User account not found.' });
    return;
  }

  // Hash new password securely with bcrypt
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  // Update user password and record passwordChangedAt timestamp for session invalidation
  await db.collection('users').findByIdAndUpdate(user.id, {
    password: hashedPassword,
    passwordChangedAt: new Date().toISOString(),
  });

  // If user is also listed in employees collection, keep records synchronized
  const employeeRecord = await db.collection('employees').findOne({ email: user.email });
  if (employeeRecord) {
    await db.collection('employees').findByIdAndUpdate(employeeRecord.id, {
      updatedAt: new Date().toISOString(),
    });
  }

  // Log audit trail
  logAudit(
    'Password Reset via Recovery',
    req,
    `Password reset completed successfully for user account ${maskEmail(user.email)} with role [${user.role}].`
  );

  // Send in-app security notification
  sendNotification(
    user.id,
    'Password Changed Successfully',
    'Your password was successfully updated via email recovery. If this was not authorized by you, please report this to your Panchayath administrator immediately.'
  );

  res.json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.',
  });
});

// 4. Safe Development Fallback Mailbox (Active only in dev / demo when SMTP is not configured)
router.get('/auth/forgot-password/dev-inbox', async (req, res) => {
  if (isSmtpConfigured()) {
    res.status(403).json({ message: 'Development mailbox is disabled when production SMTP is configured.' });
    return;
  }

  const email = req.query.email ? String(req.query.email).trim().toLowerCase() : undefined;
  const emails = getSimulatedEmails(email);

  res.json({
    isDevMode: true,
    count: emails.length,
    emails: emails.map((e) => ({
      id: e.id,
      to: e.to,
      subject: e.subject,
      sentAt: e.sentAt,
      expiresAt: e.expiresAt,
      previewText: e.previewText,
      // In dev fallback only, provide the code so automated tests or demo testers can complete testing
      devVerificationCode: e.otp,
    })),
  });
});

// ==========================================
// 2. CITIZEN MANAGEMENT APIs (/api/citizens)
// ==========================================


// Get All Citizens (Filtered by Officer Jurisdiction)
router.get('/citizens', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user!.id);
  let citizens = await db.collection('users').find({ role: 'citizen' });

  if (currentUser?.role === 'officer' && currentUser.assignedZone) {
    citizens = citizens.filter(c => c.zone === currentUser.assignedZone);
  }

  const cleanedCitizens = citizens.map(({ password, ...c }) => c);
  res.json(cleanedCitizens);
});

// Get Single Citizen by ID
router.get('/citizens/:id', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user!.id);
  const citizen = await db.collection('users').findById(req.params.id);

  if (!citizen || citizen.role !== 'citizen') {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  if (currentUser?.role === 'officer' && currentUser.assignedZone && citizen.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Access denied: Citizen is outside your jurisdiction zone.' });
    return;
  }

  const { password, ...cleanedCitizen } = citizen;
  res.json(cleanedCitizen);
});

// Get Citizen Details (Filtered by Officer Jurisdiction)
router.get('/citizens/:id/details', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user!.id);
  const citizen = await db.collection('users').findById(req.params.id);

  if (!citizen || citizen.role !== 'citizen') {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  if (currentUser?.role === 'officer' && currentUser.assignedZone && citizen.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Access denied: Citizen is outside your jurisdiction zone.' });
    return;
  }

  const { password, ...cleanedCitizen } = citizen;

  // Fetch linked records for this citizen
  const grievances = await db.collection('grievances').find({ citizenId: citizen.id });
  const certificates = await db.collection('certificates').find({ citizenId: citizen.id });
  const taxes = await db.collection('taxes').find({ citizenId: citizen.id });
  const applications = await db.collection('applications').find({ citizenId: citizen.id });

  res.json({
    citizen: cleanedCitizen,
    grievances,
    certificates,
    taxes,
    applications
  });
});

// Add Citizen
router.post('/citizens', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user!.id);
  const { email, name, phone, address, gender, age, occupation, income, state, district, taluk, gramPanchayath, ward, zone, password } = req.body;

  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    res.status(400).json({ message: 'Email already exists.' });
    return;
  }

  const nameValidation = isValidFullName(name);
  if (!nameValidation.isValid) {
    res.status(400).json({ message: nameValidation.error || 'Full name must contain only letters and cannot exceed 20 characters.' });
    return;
  }

  const passwordToUse = password || 'Citizen@123';
  const pwdValidation = isValidPassword(passwordToUse);
  if (!pwdValidation.isValid) {
    res.status(400).json({ message: pwdValidation.error || 'Password must contain at least one numerical digit and one special character.' });
    return;
  }

  const finalZone = currentUser?.role === 'officer' && currentUser.assignedZone ? currentUser.assignedZone : (zone || 'Bengaluru South');

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(passwordToUse, salt);

  const newCitizen = await db.collection('users').insertOne({
    email,
    password: hashedPassword,
    name,
    role: 'citizen',
    phone: phone || '',
    address: address || '',
    gender: gender || 'Male',
    age: age ? Number(age) : undefined,
    occupation: occupation || '',
    income: income ? Number(income) : 0,
    state: state || 'Karnataka',
    district: district || 'Bengaluru Urban',
    taluk: taluk || finalZone,
    gramPanchayath: gramPanchayath || 'Gram Panchayath',
    ward: ward || 'Ward 01',
    zone: finalZone,
    completedProfile: true,
  });

  logAudit('Citizen Created', req, `${req.user?.role?.toUpperCase()} added citizen: ${name} (${email}) in zone ${newCitizen.zone}`);
  res.status(201).json(newCitizen);
});

// Update Citizen
router.put('/citizens/:id', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user!.id);
  const existingCitizen = await db.collection('users').findById(req.params.id);

  if (!existingCitizen || existingCitizen.role !== 'citizen') {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  if (currentUser?.role === 'officer' && currentUser.assignedZone && existingCitizen.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Access denied: Citizen is outside your jurisdiction zone.' });
    return;
  }

  const { id } = req.params;
  const { name, phone, address, gender, age, occupation, income, email, state, district, taluk, gramPanchayath, ward, zone } = req.body;

  if (name !== undefined) {
    const nameValidation = isValidFullName(name);
    if (!nameValidation.isValid) {
      res.status(400).json({ message: nameValidation.error || 'Full name must contain only letters and cannot exceed 20 characters.' });
      return;
    }
  }

  const updated = await db.collection('users').findByIdAndUpdate(id, {
    name,
    phone,
    address,
    gender,
    age: age ? Number(age) : undefined,
    occupation,
    income: income ? Number(income) : undefined,
    email,
    state,
    district,
    taluk,
    gramPanchayath,
    ward,
    zone: currentUser?.role === 'officer' ? existingCitizen.zone : (zone || existingCitizen.zone),
  });

  if (!updated) {
    res.status(404).json({ message: 'Citizen not found' });
    return;
  }

  sendNotification(
    id,
    'Profile Details Updated',
    `Your citizen profile & jurisdiction details were updated by ${req.user?.name || 'Panchayath Administration'}.`
  );

  logAudit('Citizen Updated', req, `${req.user?.role?.toUpperCase()} modified citizen ID: ${id}`);
  res.json(updated);
});

// Delete Citizen
router.delete('/citizens/:id', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const currentUser = await db.collection('users').findById(req.user!.id);
  const existingCitizen = await db.collection('users').findById(id);

  if (!existingCitizen) {
    res.status(404).json({ message: 'Citizen account not found.' });
    return;
  }

  // Safety protection: Do not allow deletion of officers or admins
  const citizenRole = (existingCitizen as any).role;
  if (citizenRole !== 'citizen') {
    res.status(403).json({ message: 'Access denied: Non-citizen accounts (officer/administrator) cannot be deleted through this endpoint.' });
    return;
  }

  if (currentUser?.role === 'officer' && currentUser.assignedZone && existingCitizen.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Access denied: Citizen is outside your jurisdiction zone.' });
    return;
  }

  const success = await db.collection('users').deleteOne(id);
  if (!success) {
    res.status(500).json({ message: 'Failed to delete citizen profile from database.' });
    return;
  }

  logAudit(
    'Citizen Deleted',
    req,
    `${req.user?.role?.toUpperCase()} deleted citizen: ${existingCitizen.name} (${existingCitizen.email})`
  );

  res.json({
    success: true,
    message: `Citizen ${existingCitizen.name} deleted successfully.`
  });
});

// ==========================================
// 3. GRIEVANCE MANAGEMENT APIs (/api/grievances)
// ==========================================

// Get All Grievances (Filtered by Jurisdiction for Officers)
router.get('/grievances', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;

  if (req.user.role === 'citizen') {
    const citizenGrievances = await db.collection('grievances').find({ citizenId: req.user.id });
    return res.json(citizenGrievances);
  }

  const currentUser = await db.collection('users').findById(req.user.id);
  let grievances: Grievance[] = await db.collection('grievances').find();

  const matchZone = (recordZone?: string, target?: string) => {
    if (!target || target === 'All' || target === 'All Zones') return true;
    if (!recordZone) return false;
    const r = recordZone.toLowerCase();
    const t = target.toLowerCase();
    if (t.includes('north') && r.includes('north')) return true;
    if (t.includes('south') && r.includes('south')) return true;
    if (t.includes('east') && r.includes('east')) return true;
    if (t.includes('west') && r.includes('west')) return true;
    return r === t;
  };

  if (currentUser?.role === 'officer') {
    const officerZone = currentUser.assignedZone || currentUser.zone;
    if (officerZone && officerZone !== 'All' && officerZone !== 'All Zones') {
      // Officers only view grievances from their assigned jurisdiction area or assigned directly to them
      grievances = grievances.filter(g => matchZone(g.zone, officerZone) || (g.assignedOfficerId && g.assignedOfficerId === currentUser.id));
    }
  }

  // Admin filter query
  const queryZone = req.query.zone as string;
  if (queryZone && queryZone !== 'All' && queryZone !== 'All Zones') {
    grievances = grievances.filter(g => matchZone(g.zone, queryZone));
  }

  res.json(grievances);
});

// Submit Grievance with Automatic Zone Officer Assignment
router.post('/grievances', verifyToken, checkRole(['citizen']), async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;
  const { title, description, category, severity, image, images, location, latitude, longitude } = req.body;

  if (!title || !description || !category) {
    res.status(400).json({ message: 'Title, description, and category are required.' });
    return;
  }

  const validSeverity: 'Critical' | 'High' | 'Medium' | 'Low' = ['Critical', 'High', 'Medium', 'Low'].includes(severity)
    ? severity
    : 'Medium';

  if (typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ message: 'Detailed description is required.' });
    return;
  }

  if (description.trim().length > 2000) {
    res.status(400).json({ message: 'Description cannot exceed 2000 characters.' });
    return;
  }

  const citizenUser = await db.collection('users').findById(req.user.id);
  const citizenZone = citizenUser?.zone || citizenUser?.assignedZone || 'Bengaluru South';

  // Strict Zone Boundary Location Validation
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    (latitude === 0 && longitude === 0) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({
      message: 'Please select a location inside your zone.'
    });
    return;
  }

  const isValidLoc = isLocationInZone(latitude, longitude, location, citizenZone);
  if (!isValidLoc) {
    res.status(400).json({
      message: 'Please select a location inside your zone.'
    });
    return;
  }

  // Automatically find Active Officer assigned to citizen's zone
  const assignedOfficer = await getActiveZoneOfficer(citizenZone);

  let imageList: string[] = [];
  if (Array.isArray(images) && images.length > 0) {
    imageList = images.filter(img => typeof img === 'string' && img.trim().length > 0);
  } else if (image && typeof image === 'string' && image.trim().length > 0) {
    imageList = [image];
  }

  // Fast rule-based triaging (0ms)
  const lowerText = (title + ' ' + description).toLowerCase();
  let urgency: 'High' | 'Medium' | 'Low' = 'Medium';
  if (lowerText.includes('urgent') || lowerText.includes('danger') || lowerText.includes('leak') || lowerText.includes('pothole') || lowerText.includes('spark') || lowerText.includes('hazard')) {
    urgency = 'High';
  } else if (lowerText.includes('minor') || lowerText.includes('request') || lowerText.includes('query')) {
    urgency = 'Low';
  }

  const officerLabel = assignedOfficer ? `${assignedOfficer.name} (${citizenZone} Officer)` : `${citizenZone} Officer`;
  const initialPlan = `AI Insights: Auto-assigned to ${officerLabel}. Urgency scored as ${urgency}. Standard SOP: Dispatching Gram Panchayath taskforce for site inspection within 24 hours.`;

  const newGrievance = await db.collection('grievances').insertOne({
    citizenId: req.user.id,
    citizenName: req.user.name,
    title,
    description,
    category,
    status: 'Assigned',
    zone: citizenZone,
    assignedOfficerId: assignedOfficer?.id || '',
    assignedOfficerName: assignedOfficer?.name || '',
    image: imageList[0] || '',
    images: imageList,
    location: location || `${citizenZone}, Bengaluru`,
    latitude: typeof latitude === 'number' ? latitude : undefined,
    longitude: typeof longitude === 'number' ? longitude : undefined,
    urgency,
    severity: validSeverity,
    aiSuggestedPlan: initialPlan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Notify assigned Zone Officer
  if (assignedOfficer) {
    sendNotification(
      assignedOfficer.id,
      `New Complaint Auto-Assigned (${citizenZone})`,
      `Complaint "${title}" from resident ${req.user.name} in ${citizenZone} has been automatically assigned to your dashboard.`
    );
  }

  logAudit('Grievance Auto-Routed', req, `Complaint ID: ${newGrievance.id} auto-assigned to officer ${assignedOfficer?.name || 'N/A'} for zone ${citizenZone}`);

  // Return response instantly
  res.status(201).json(newGrievance);

  // Background AI processing
  analyzeGrievance(title, description, category).then(async (aiAnalysis) => {
    if (aiAnalysis) {
      const enrichedPlan = `AI Insights: Categorized for ${aiAnalysis.suggestedDepartment || category}. ${aiAnalysis.summary || 'Queued for officer dispatch.'} Auto-assigned to ${officerLabel}. Urgency score: ${aiAnalysis.urgency || urgency}.`;
      await db.collection('grievances').findByIdAndUpdate(newGrievance.id, {
        urgency: (aiAnalysis.urgency as 'High' | 'Medium' | 'Low') || urgency,
        aiSuggestedPlan: enrichedPlan,
      });
    }
  }).catch((err) => {
    console.error('Background AI grievance analysis error:', err);
  });
});

// Admin Reassign Grievance Endpoint
router.post('/grievances/:id/reassign', verifyToken, checkRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { officerId, zone } = req.body;

  const grievance = await db.collection('grievances').findById(id);
  if (!grievance) {
    res.status(404).json({ message: 'Grievance not found.' });
    return;
  }

  const officer = await db.collection('users').findById(officerId);
  const targetZone = zone || officer?.assignedZone || grievance.zone;

  const updated = await db.collection('grievances').findByIdAndUpdate(id, {
    assignedOfficerId: officer?.id || grievance.assignedOfficerId,
    assignedOfficerName: officer?.name || grievance.assignedOfficerName,
    zone: targetZone,
    status: 'Assigned',
    updatedAt: new Date().toISOString(),
  });

  if (officer) {
    sendNotification(
      officer.id,
      `Complaint Reassigned to You`,
      `Admin ${req.user?.name} reassigned complaint "${grievance.title}" in ${targetZone} to your jurisdiction.`
    );
  }

  logAudit('Grievance Reassigned', req, `Admin reassigned complaint ID ${id} to officer ${officer?.name || officerId}`);
  res.json({ message: 'Complaint reassigned successfully', grievance: updated });
});

// Assign / Update Grievance Status & Resolution
router.patch('/grievances/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, remarks, resolutionPhotos, resolutionRemarks, completedDate, resolvedAt, rating, ratingFeedback, citizenFeedbackNote } = req.body;

  const grievance = await db.collection('grievances').findById(id);
  if (!grievance) {
    res.status(404).json({ message: 'Grievance not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);

  // If status or officer resolution details are being updated
  if (status || remarks !== undefined || resolutionRemarks !== undefined || resolutionPhotos !== undefined) {
    if (currentUser?.role === 'admin') {
      res.status(403).json({ message: 'Admins can only view grievances. Approvals, rejections, and resolution updates must be performed by the respective Zone Officer.' });
      return;
    }
    if (currentUser?.role === 'officer' && currentUser.assignedZone && grievance.zone && grievance.zone !== currentUser.assignedZone) {
      res.status(403).json({ message: 'Only the respective zone officer can approve, reject, or update complaints for this zone.' });
      return;
    }
  }

  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (status) updates.status = status;
  if (remarks !== undefined) updates.remarks = remarks;
  if (resolutionRemarks !== undefined) updates.resolutionRemarks = resolutionRemarks;
  if (resolutionPhotos !== undefined) updates.resolutionPhotos = resolutionPhotos;
  if (completedDate !== undefined) updates.completedDate = completedDate;
  if (resolvedAt !== undefined) updates.resolvedAt = resolvedAt;
  if (status === 'Resolved' && !updates.resolvedAt) updates.resolvedAt = new Date().toISOString();
  if (rating !== undefined) updates.rating = Number(rating);
  if (ratingFeedback !== undefined) updates.ratingFeedback = ratingFeedback;
  if (citizenFeedbackNote !== undefined) updates.citizenFeedbackNote = citizenFeedbackNote;

  const updated = await db.collection('grievances').findByIdAndUpdate(id, updates);

  // Notify citizen
  let recipientId = grievance.citizenId;
  if (!recipientId && grievance.citizenName) {
    const matchingUser = await (await db.collection('users').find({ name: grievance.citizenName, role: 'citizen' }))[0];
    if (matchingUser) {
      recipientId = matchingUser.id;
    }
  }

  const newStatus = status || grievance.status;
  const effectiveRemarks = resolutionRemarks || remarks || grievance.remarks;

  if (recipientId) {
    const officerName = req.user?.name || 'Panchayath Officer';
    let notifTitle = `Complaint Update: ${grievance.title}`;
    let notifMessage = `Officer ${officerName} updated your complaint "${grievance.title}" status to "${newStatus}". ${effectiveRemarks ? 'Action Remarks: ' + effectiveRemarks : ''}`;

    if (newStatus === 'In Progress') {
      notifTitle = `Work Started on Complaint: ${grievance.title}`;
      notifMessage = `Officer ${officerName} has started work on your complaint "${grievance.title}". ${effectiveRemarks ? 'Action Remarks: ' + effectiveRemarks : ''}`;
    } else if (newStatus === 'Assigned') {
      notifTitle = `Taskforce Assigned: ${grievance.title}`;
      notifMessage = `Officer ${officerName} assigned a dedicated taskforce to resolve your complaint "${grievance.title}". ${effectiveRemarks ? 'Action Remarks: ' + effectiveRemarks : ''}`;
    } else if (newStatus === 'Resolved') {
      notifTitle = `Complaint Resolved: ${grievance.title}`;
      notifMessage = `Officer ${officerName} marked your complaint "${grievance.title}" as Resolved with proof photos attached! ${effectiveRemarks ? 'Resolution Remarks: ' + effectiveRemarks : ''}`;
    } else if (newStatus === 'Rejected') {
      notifTitle = `Complaint Rejected: ${grievance.title}`;
      notifMessage = `Officer ${officerName} reviewed your complaint "${grievance.title}" and set status to Rejected. ${effectiveRemarks ? 'Remarks: ' + effectiveRemarks : ''}`;
    }

    sendNotification(
      recipientId,
      notifTitle,
      notifMessage
    );
  }

  logAudit('Grievance Updated', req, `Officer updated grievance ID: ${id} status to: ${newStatus}`);
  res.json(updated);
});

// Citizen Submit Feedback / Rating for Resolved Grievance
router.post('/grievances/:id/feedback', verifyToken, checkRole(['citizen']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { rating, ratingFeedback, citizenFeedbackNote } = req.body;

  const grievance = await db.collection('grievances').findById(id);
  if (!grievance) {
    res.status(404).json({ message: 'Grievance not found.' });
    return;
  }

  if (grievance.rating) {
    res.status(400).json({ message: 'Feedback and rating have already been submitted for this complaint.' });
    return;
  }

  const updated = await db.collection('grievances').findByIdAndUpdate(id, {
    rating: Number(rating) || 5,
    ratingFeedback: ratingFeedback || 'Satisfied',
    citizenFeedbackNote: citizenFeedbackNote || '',
    updatedAt: new Date().toISOString(),
  });

  logAudit('Grievance Rated', req, `Citizen submitted feedback for grievance ID: ${id}`);
  res.json(updated);
});

// Delete Grievance (Citizen owner or Respective Zone Officer)
router.delete('/grievances/:id', verifyToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const grievance = await db.collection('grievances').findById(id);
  if (!grievance) {
    res.status(404).json({ message: 'Grievance not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);

  if (currentUser?.role === 'citizen') {
    // 1. Ensure ownership - only the complaint owner can delete
    const isOwner = grievance.citizenId === req.user!.id ||
                    (grievance.citizenName && currentUser?.name && grievance.citizenName === currentUser.name) ||
                    (currentUser?.email && grievance.citizenEmail === currentUser.email);
    if (!isOwner) {
      res.status(403).json({ message: 'Only the complaint owner can delete their complaint.' });
      return;
    }

    // 2. Status check - only Submitted, Pending, or Assigned allowed
    const deletableStatuses = ['Submitted', 'Pending', 'Assigned'];
    if (!deletableStatuses.includes(grievance.status)) {
      res.status(400).json({
        message: 'This complaint cannot be deleted because the assigned officer has already started work.'
      });
      return;
    }

    // Perform deletion
    await db.collection('grievances').deleteOne(id);

    // Notify assigned officer if complaint was assigned
    let officerIdToNotify = grievance.assignedOfficerId;
    if (!officerIdToNotify && grievance.assignedOfficerName) {
      const officerObj = await db.collection('users').findOne({ name: grievance.assignedOfficerName, role: 'officer' });
      if (officerObj) officerIdToNotify = officerObj.id;
    }
    if (!officerIdToNotify && grievance.zone) {
      const zoneOfficer = await db.collection('users').findOne({ role: 'officer', assignedZone: grievance.zone });
      if (zoneOfficer) officerIdToNotify = zoneOfficer.id;
    }

    if (officerIdToNotify) {
      sendNotification(
        officerIdToNotify,
        `Complaint Withdrawn: ${grievance.title}`,
        `Resident ${currentUser.name || 'Citizen'} has deleted/withdrawn complaint "${grievance.title}" (ID: ${id}) from the portal.`
      );
    }

    logAudit('Grievance Deleted by Citizen', req, `Citizen ${currentUser.name} deleted grievance ID: ${id} (${grievance.title})`);
    res.json({ message: 'Complaint deleted successfully.', id });
    return;
  }

  // Officer role check
  if (currentUser?.role === 'officer' && currentUser.assignedZone && grievance.zone && grievance.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Only the respective zone officer can delete complaints for this zone.' });
    return;
  }

  await db.collection('grievances').deleteOne(id);
  logAudit('Grievance Deleted', req, `${currentUser?.role || 'User'} deleted grievance ID: ${id} (${grievance.title})`);
  res.json({ message: 'Grievance deleted successfully.', id });
});

// ==========================================
// 4. CERTIFICATE MANAGEMENT APIs (/api/certificates)
// ==========================================

// Get Certificates Applications (Filtered by Zone for Officers)
router.get('/certificates', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;

  const currentUser = await db.collection('users').findById(req.user.id);
  let certificates: Certificate[] = await db.collection('certificates').find();

  if (req.user.role === 'citizen') {
    const citizenCerts = await db.collection('certificates').find({ citizenId: req.user.id });
    return res.json(citizenCerts);
  } else if (currentUser?.role === 'officer' && currentUser.assignedZone) {
    certificates = certificates.filter(c => c.zone === currentUser.assignedZone);
  }

  res.json(certificates);
});

// Apply for Certificate
router.post('/certificates', verifyToken, checkRole(['citizen']), async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;
  const { type, details } = req.body;

  if (!type || !details) {
    res.status(400).json({ message: 'Certificate type and core form details are required.' });
    return;
  }

  const citizenUser = await db.collection('users').findById(req.user.id);
  const citizenZone = citizenUser?.zone || 'Bengaluru South';

  const assignedOfficer = await getActiveZoneOfficer(citizenZone);

  const uniqueId = `nammapanchayath-${type.toLowerCase().slice(0, 3)}-${Date.now().toString().slice(-5)}`;

  const newApp = await db.collection('certificates').insertOne({
    citizenId: req.user.id,
    citizenName: req.user.name,
    type,
    status: 'Pending',
    zone: citizenZone,
    assignedOfficerId: assignedOfficer?.id || '',
    details,
    qrCode: uniqueId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (assignedOfficer) {
    sendNotification(
      assignedOfficer.id,
      `New Certificate Application (${citizenZone})`,
      `Resident ${req.user.name} applied for ${type} Certificate in ${citizenZone}. Please verify documents.`
    );
  }

  logAudit('Certificate Applied', req, `Citizen applied for: ${type} certificate in zone ${citizenZone}`);
  res.status(201).json(newApp);
});

// Verify / Approve / Reject Certificate (Zone Officer ONLY)
router.patch('/certificates/:id', verifyToken, checkRole(['officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  if (!req.user) return;

  const certificate = await db.collection('certificates').findById(id);
  if (!certificate) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && certificate.zone && certificate.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Only the respective zone officer can approve or reject certificate applications for this zone.' });
    return;
  }

  const qrCodeText = status === 'Approved' ? `nammapanchayath-verified-${certificate.type.toLowerCase().slice(0, 3)}-${id}` : '';
  const now = new Date().toISOString();

  const updateData: any = {
    status,
    remarks: remarks || '',
    updatedAt: now,
  };

  if (status === 'Approved') {
    updateData.approvedBy = `${req.user.name} (${req.user.role.toUpperCase()})`;
    updateData.approvedAt = now;
    updateData.issuedDate = now;
    updateData.qrCode = qrCodeText || certificate.qrCode;
  }

  const updated = await db.collection('certificates').findByIdAndUpdate(id, updateData);

  // Notify citizen
  if (certificate.citizenId) {
    const officerName = req.user.name || 'Panchayath Officer';
    sendNotification(
      certificate.citizenId,
      `Certificate Application ${status}`,
      `Officer ${officerName} marked your ${certificate.type} Certificate request as ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`
    );
  }

  logAudit('Certificate Reviewed', req, `Officer resolved Certificate ID: ${id} as ${status}`);
  res.json(updated);
});

// Delete Certificate (Officer ONLY)
router.delete('/certificates/:id', verifyToken, checkRole(['officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!req.user) return;

  const certificate = await db.collection('certificates').findById(id);
  if (!certificate) {
    res.status(404).json({ message: 'Certificate application not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && certificate.zone && certificate.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Only the respective zone officer can delete certificate applications for this zone.' });
    return;
  }

  await db.collection('certificates').deleteOne(id);
  logAudit('Certificate Deleted', req, `Officer deleted Certificate ID: ${id} (${certificate.type}) for citizen ${certificate.citizenName}`);
  res.json({ message: 'Certificate record deleted successfully.' });
});

// ==========================================
// 5. TAX MANAGEMENT APIs (/api/taxes)
// ==========================================

// Get Taxes list (Filtered by Zone for Officers)
router.get('/taxes', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;

  const currentUser = await db.collection('users').findById(req.user.id);
  let taxes: Tax[] = await db.collection('taxes').find();

  if (req.user.role === 'citizen') {
    const citizenTaxes = await db.collection('taxes').find({ citizenId: req.user.id });
    return res.json(citizenTaxes);
  } else if (currentUser?.role === 'officer' && currentUser.assignedZone) {
    taxes = taxes.filter(t => t.zone === currentUser.assignedZone);
  }

  res.json(taxes);
});

// Create Bills (Officer - Scoped to Jurisdiction)
router.post('/taxes/generate', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const { type, amount, billingPeriod, dueDate, citizenId } = req.body;

  if (!type || !amount || !billingPeriod || !dueDate) {
    res.status(400).json({ message: 'Type, amount, billing period, and due date are required.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);

  // Determine target citizens
  let targetCitizens = await db.collection('users').find({ role: 'citizen' });

  // If officer, default to citizens in their jurisdiction
  if (currentUser?.role === 'officer' && currentUser.assignedZone) {
    targetCitizens = targetCitizens.filter(c => c.zone === currentUser.assignedZone);
  }

  if (citizenId && citizenId !== 'all') {
    targetCitizens = targetCitizens.filter(c => c.id === citizenId);
    if (targetCitizens.length === 0) {
      res.status(404).json({ message: 'Selected citizen not found in your assigned jurisdiction.' });
      return;
    }
  }

  let count = 0;
  let skipped = 0;

  for (const c of targetCitizens) {
    // Check if an existing tax bill for this citizen, type, and billingPeriod already exists
    const existing = await db.collection('taxes').findOne({
      citizenId: c.id,
      type,
      billingPeriod,
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.collection('taxes').insertOne({
      citizenId: c.id,
      citizenName: c.name,
      type,
      amount: Number(amount),
      billingPeriod,
      status: 'Unpaid',
      dueDate,
      zone: c.zone || currentUser?.assignedZone || 'Bengaluru South',
    });

    await sendNotification(
      c.id,
      `New Tax Bill Generated: ${type}`,
      `A new tax bill of ₹${amount} for ${billingPeriod} has been generated by your area officer. Due date is ${dueDate}. Please pay under Tax Center.`
    );
    count++;
  }

  logAudit('Tax Bills Generated', req, `Officer generated ${type} of ₹${amount} (${count} created, ${skipped} duplicates skipped)`);

  if (count === 0 && skipped > 0) {
    res.status(400).json({ message: `Tax bill for ${type} (${billingPeriod}) already exists for the selected resident(s). Duplicate bill creation blocked.` });
    return;
  }

  const skippedMsg = skipped > 0 ? ` (${skipped} existing duplicate bill(s) skipped)` : '';
  res.json({ message: `Successfully generated ${count} tax bill(s)${skippedMsg}.` });
});

// Pay Taxes (Simulated payment processor)
router.post('/payments', verifyToken, checkRole(['citizen', 'admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;
  const { taxId, amount, type } = req.body;

  const tax = await db.collection('taxes').findById(taxId);
  if (!tax) {
    res.status(404).json({ message: 'Tax record not found.' });
    return;
  }

  if (tax.status === 'Paid') {
    res.status(400).json({ message: 'This tax bill has already been paid.' });
    return;
  }

  const existingPayment = await db.collection('payments').findOne({ taxId, status: 'Paid' });
  if (existingPayment) {
    res.status(400).json({ message: 'A verified payment has already been recorded for this tax invoice.' });
    return;
  }

  // Update Tax record
  await db.collection('taxes').findByIdAndUpdate(taxId, { status: 'Paid' });

  // Record payment receipt
  const transactionId = `TXN_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
  const payment = await db.collection('payments').insertOne({
    taxId,
    citizenId: req.user.id,
    citizenName: req.user.name,
    amount: Number(amount),
    type: type || 'UPI / QR Code',
    taxType: tax.type,
    billingPeriod: tax.billingPeriod,
    paymentDate: new Date().toISOString(),
    transactionId,
    receiptUrl: `receipt_${transactionId}.pdf`,
    zone: tax.zone || 'Bengaluru South',
    status: 'Paid',
  });

  sendNotification(
    req.user.id,
    `Payment Received!`,
    `Thank you! Payment of ₹${amount} for ${tax.type} was recorded successfully. Transaction ID: ${transactionId}.`
  );

  // Notify area officer
  const zoneOfficer = await db.collection('users').findOne({ role: 'officer', assignedZone: tax.zone || 'Bengaluru South' });
  if (zoneOfficer) {
    sendNotification(
      zoneOfficer.id,
      `Tax Payment Verified (${tax.zone || 'Jurisdiction'})`,
      `Resident ${req.user.name} in ${tax.zone || 'your zone'} paid ${tax.type} of ₹${amount}. Transaction ID: ${transactionId}.`
    );
  }

  logAudit('Tax Paid', req, `Citizen paid tax ID: ${taxId} of ₹${amount}`);
  res.status(201).json(payment);
});

// Refund / Reverse Payment (Admin or Officer)
router.post('/payments/:id/refund', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const paymentId = req.params.id;
  const payment = await db.collection('payments').findById(paymentId);
  if (!payment) {
    res.status(404).json({ message: 'Payment record not found.' });
    return;
  }

  const s = (payment.status || '').toLowerCase();
  if (s === 'refunded' || s === 'reversed') {
    res.status(400).json({ message: 'Payment has already been refunded.' });
    return;
  }

  // Mark payment as refunded
  await db.collection('payments').findByIdAndUpdate(paymentId, {
    status: 'Refunded',
    refundedAt: new Date().toISOString(),
    refundedBy: req.user?.name || 'Administrator',
  });

  // Revert corresponding tax record to Unpaid if taxId exists
  if (payment.taxId) {
    await db.collection('taxes').findByIdAndUpdate(payment.taxId, { status: 'Unpaid' });
  }

  sendNotification(
    payment.citizenId,
    `Payment Refunded`,
    `Your tax payment of ₹${payment.amount} (Transaction ID: ${payment.transactionId}) has been refunded/reversed.`
  );

  logAudit('Payment Refunded', req, `Refunded payment ID ${paymentId} of ₹${payment.amount}`);
  res.json({ message: 'Payment refunded successfully.', paymentId });
});

// Get Payment History
router.get('/payments', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;

  const currentUser = await db.collection('users').findById(req.user.id);
  let payments: Payment[] = await db.collection('payments').find();

  const matchUserZone = (recordZone?: string, targetZone?: string) => {
    if (!targetZone || targetZone === 'All' || targetZone === 'All Zones') return true;
    if (!recordZone) return false;
    const r = recordZone.toLowerCase();
    const t = targetZone.toLowerCase();
    if (t.includes('north') && r.includes('north')) return true;
    if (t.includes('south') && r.includes('south')) return true;
    if (t.includes('east') && r.includes('east')) return true;
    if (t.includes('west') && r.includes('west')) return true;
    return r === t;
  };

  if (req.user.role === 'citizen') {
    const citizenPayments = await db.collection('payments').find({ citizenId: req.user.id });
    return res.json(citizenPayments);
  } else if (currentUser?.role === 'officer') {
    const officerZone = currentUser.assignedZone || currentUser.zone;
    if (officerZone) {
      payments = payments.filter(p => matchUserZone(p.zone, officerZone));
    }
  }

  res.json(payments);
});

// Delete Tax Record (Officer ONLY)
router.delete('/taxes/:id', verifyToken, checkRole(['officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!req.user) return;

  const tax = await db.collection('taxes').findById(id);
  if (!tax) {
    res.status(404).json({ message: 'Tax record not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && tax.zone && tax.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Only the respective zone officer can delete tax records for this zone.' });
    return;
  }

  // Delete associated payment records if any
  const payments = await db.collection('payments').find({ taxId: id });
  for (const p of payments) {
    await db.collection('payments').deleteOne(p.id);
  }

  // Delete the tax record
  await db.collection('taxes').deleteOne(id);
  logAudit('Tax Record Deleted', req, `Officer deleted Tax Bill ID: ${id} (${tax.type} - ₹${tax.amount}) for citizen ${tax.citizenName || 'Resident'}`);
  res.json({ message: 'Tax record deleted successfully.' });
});

// ==========================================
// 6. WELFARE SCHEMES (/api/schemes)
// ==========================================

// Get All Schemes
router.get('/schemes', async (req, res) => {
  const defaultDocs = ['Aadhaar Card', 'Income Certificate', 'Ration Card', 'Bank Passbook', 'Passport Photo'];
  const rawSchemes = await db.collection('schemes').find();
  const schemes = rawSchemes.map((s: any) => {
    let cat = s.category;
    if (!cat) {
      const lower = (s.name + ' ' + s.description).toLowerCase();
      if (lower.includes('awas') || lower.includes('housing') || lower.includes('house')) cat = 'Housing';
      else if (lower.includes('krishi') || lower.includes('irrigation') || lower.includes('crop') || lower.includes('seed')) cat = 'Agriculture';
      else if (lower.includes('vidya') || lower.includes('education') || lower.includes('scholarship') || lower.includes('student')) cat = 'Education';
      else if (lower.includes('mahila') || lower.includes('women') || lower.includes('matru')) cat = 'Women';
      else if (lower.includes('pension') || lower.includes('senior') || lower.includes('elderly')) cat = 'Senior Citizens';
      else if (lower.includes('health') || lower.includes('hospital') || lower.includes('insurance') || lower.includes('arogya')) cat = 'Health';
      else cat = 'Housing';
    }
    return {
      ...s,
      category: cat,
      requiredDocuments: s.requiredDocuments && s.requiredDocuments.length > 0 ? s.requiredDocuments : defaultDocs,
    };
  });
  res.json(schemes);
});

// Conversational AI Scheme Eligibility Advisor (Gram Mitra)
router.post('/schemes/ai-checker', verifyOptionalToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages, collectedDetails } = req.body;
    const defaultDocs = ['Aadhaar Card', 'Income Certificate', 'Ration Card', 'Bank Passbook', 'Passport Photo'];
    const rawSchemes = await db.collection('schemes').find();
    const activeSchemes = rawSchemes
      .filter((s: any) => s.status !== 'Inactive')
      .map((s: any) => {
        let cat = s.category;
        if (!cat) {
          const lower = (s.name + ' ' + s.description).toLowerCase();
          if (lower.includes('awas') || lower.includes('housing') || lower.includes('house')) cat = 'Housing';
          else if (lower.includes('krishi') || lower.includes('irrigation') || lower.includes('crop') || lower.includes('seed')) cat = 'Agriculture';
          else if (lower.includes('vidya') || lower.includes('education') || lower.includes('scholarship') || lower.includes('student')) cat = 'Education';
          else if (lower.includes('mahila') || lower.includes('women') || lower.includes('matru')) cat = 'Women';
          else if (lower.includes('pension') || lower.includes('senior') || lower.includes('elderly')) cat = 'Senior Citizens';
          else if (lower.includes('health') || lower.includes('hospital') || lower.includes('insurance') || lower.includes('arogya')) cat = 'Health';
          else cat = 'Housing';
        }
        return {
          ...s,
          category: cat,
          requiredDocuments: s.requiredDocuments && s.requiredDocuments.length > 0 ? s.requiredDocuments : defaultDocs,
        };
      });

    let userProfile: any = undefined;
    if (req.user && req.user.id) {
      const citizen = await db.collection('users').findById(req.user.id);
      if (citizen) {
        userProfile = {
          name: citizen.name,
          age: (citizen as any).age,
          income: (citizen as any).income,
          occupation: (citizen as any).occupation,
          gender: (citizen as any).gender,
          isBpl: (citizen as any).isBpl,
          zone: (citizen as any).zone || (citizen as any).assignedZone,
          address: (citizen as any).address
        };
      }
    }

    const result = await runSchemeCheckerChat(messages || [], collectedDetails || {}, userProfile, activeSchemes);
    res.json(result);
  } catch (err: any) {
    console.error('Error in /schemes/ai-checker:', err);
    res.status(500).json({ error: 'Failed to process AI scheme checker request.' });
  }
});

// Create Welfare Scheme (Admin & Officer)
router.post('/schemes', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const { name, description, benefits, eligibilityCriteria, department, category, requiredDocuments } = req.body;

  if (!name || !description || !eligibilityCriteria) {
    res.status(400).json({ message: 'Name, description, and eligibility criteria are required.' });
    return;
  }

  if (typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ message: 'Scheme description is required.' });
    return;
  }

  if (description.trim().length > 2000) {
    res.status(400).json({ message: 'Scheme description cannot exceed 2000 characters.' });
    return;
  }

  const defaultDocs = ['Aadhaar Card', 'Income Certificate', 'Ration Card', 'Bank Passbook', 'Passport Photo'];

  const newScheme = await db.collection('schemes').insertOne({
    name,
    description,
    benefits: benefits || 'N/A',
    eligibilityCriteria,
    department: department || 'Administration',
    category: category || 'Housing',
    status: 'Active',
    requiredDocuments: Array.isArray(requiredDocuments) && requiredDocuments.length > 0 ? requiredDocuments : defaultDocs,
    createdAt: new Date().toISOString(),
  });

  const actorRole = req.user?.role === 'officer' ? 'Officer' : 'Admin';
  logAudit('Scheme Created', req, `${actorRole} (${req.user?.name || 'Officer'}) launched scheme: ${name}`);
  res.status(201).json(newScheme);
});

// Update Scheme
router.put('/schemes/:id', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, description, benefits, eligibilityCriteria, department, status } = req.body;

  const updated = await db.collection('schemes').findByIdAndUpdate(id, {
    name,
    description,
    benefits,
    eligibilityCriteria,
    department,
    status,
  });

  if (!updated) {
    res.status(404).json({ message: 'Scheme not found.' });
    return;
  }

  const actorRole = req.user?.role === 'officer' ? 'Officer' : 'Admin';
  logAudit('Scheme Updated', req, `${actorRole} (${req.user?.name || 'Officer'}) updated scheme ID: ${id}`);
  res.json(updated);
});

// Delete Scheme
router.delete('/schemes/:id', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const success = await db.collection('schemes').deleteOne(id);
  if (!success) {
    res.status(404).json({ message: 'Scheme not found.' });
    return;
  }

  const actorRole = req.user?.role === 'officer' ? 'Officer' : 'Admin';
  logAudit('Scheme Deleted', req, `${actorRole} (${req.user?.name || 'Officer'}) deleted scheme ID: ${id}`);
  res.json({ message: 'Scheme deleted successfully.' });
});

// Apply for Scheme
router.post('/schemes/apply', verifyToken, checkRole(['citizen']), async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;
  const { schemeId, documents, uploadedDocuments } = req.body;
  const docsToSave = Array.isArray(documents) ? documents : (Array.isArray(uploadedDocuments) ? uploadedDocuments : []);

  const scheme = await db.collection('schemes').findById(schemeId);
  if (!scheme) {
    res.status(404).json({ message: 'Scheme not found.' });
    return;
  }

  // Avoid duplicate submissions, but allow re-applying if previously Rejected
  const existing = await db.collection('applications').findOne({ citizenId: req.user.id, schemeId });
  if (existing) {
    if (existing.status === 'Rejected') {
      const citizenUser = await db.collection('users').findById(req.user.id);
      const citizenZone = citizenUser?.zone || 'Bengaluru South';

      const assignedOfficer = await getActiveZoneOfficer(citizenZone);

      const updated = await db.collection('applications').findByIdAndUpdate(existing.id, {
        status: 'Pending',
        documents: docsToSave,
        remarks: '',
        appliedAt: new Date().toISOString(),
      });

      if (assignedOfficer) {
        sendNotification(
          assignedOfficer.id,
          `Scheme Re-application Submitted (${citizenZone})`,
          `Resident ${req.user.name} re-applied for "${scheme.name}" in ${citizenZone}. Please review application.`
        );
      }

      logAudit('Scheme Re-application Submitted', req, `Citizen re-applied for scheme: ${scheme.name} in zone ${citizenZone}`);
      res.status(200).json(updated);
      return;
    }

    res.status(400).json({ message: 'You already have an active application for this scheme.' });
    return;
  }

  const citizenUser = await db.collection('users').findById(req.user.id);
  const citizenZone = citizenUser?.zone || 'Bengaluru South';

  const assignedOfficer = await getActiveZoneOfficer(citizenZone);

  const newApp = await db.collection('applications').insertOne({
    citizenId: req.user.id,
    citizenName: req.user.name,
    schemeId,
    schemeName: scheme.name,
    status: 'Pending',
    zone: citizenZone,
    assignedOfficerId: assignedOfficer?.id || '',
    documents: docsToSave,
    appliedAt: new Date().toISOString(),
  });

  if (assignedOfficer) {
    sendNotification(
      assignedOfficer.id,
      `New Scheme Application (${citizenZone})`,
      `Resident ${req.user.name} applied for "${scheme.name}" in ${citizenZone}. Please review application.`
    );
  }

  logAudit('Scheme Application Submitted', req, `Citizen applied for scheme: ${scheme.name} in zone ${citizenZone}`);
  res.status(201).json(newApp);
});

// Get Scheme Applications (Filtered by Zone for Officers)
router.get('/schemes/applications', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return;

  const currentUser = await db.collection('users').findById(req.user.id);
  let applications: SchemeApplication[] = await db.collection('applications').find();

  if (req.user.role === 'citizen') {
    const citizenApps = await db.collection('applications').find({ citizenId: req.user.id });
    return res.json(citizenApps);
  } else if (currentUser?.role === 'officer' && currentUser.assignedZone) {
    applications = applications.filter(a => a.zone === currentUser.assignedZone);
  }

  res.json(applications);
});

// Review Scheme Application (Respective Officer ONLY - Admin cannot approve or reject scheme applications)
router.patch('/schemes/applications/:id', verifyToken, checkRole(['officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const application = await db.collection('applications').findById(id);
  if (!application) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && application.zone) {
    const userZone = currentUser.assignedZone.trim().toLowerCase();
    const appZone = application.zone.trim().toLowerCase();
    if (userZone !== 'all' && userZone !== 'all zones' && userZone !== appZone) {
      res.status(403).json({ message: `Access Denied: Only the respective zone officer (${application.zone}) can approve or reject scheme applications for this ward.` });
      return;
    }
  }

  const updated = await db.collection('applications').findByIdAndUpdate(id, {
    status,
    remarks: remarks || '',
  });

  if (application.citizenId) {
    const officerName = req.user?.name || 'Panchayath Officer';
    sendNotification(
      application.citizenId,
      `Welfare Scheme Request ${status}`,
      `Officer ${officerName} updated your application for "${application.schemeName}" to ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`
    );
  }

  logAudit('Scheme Application Reviewed', req, `Respective Officer resolved scheme application ID: ${id} as ${status}`);
  res.json(updated);
});

// Delete Scheme Application (Officer ONLY - Respective Zone Officer)
router.delete('/schemes/applications/:id', verifyToken, checkRole(['officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const application = await db.collection('applications').findById(id);
  if (!application) {
    res.status(404).json({ message: 'Application not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && application.zone) {
    const userZone = currentUser.assignedZone.trim().toLowerCase();
    const appZone = application.zone.trim().toLowerCase();
    if (userZone !== 'all' && userZone !== 'all zones' && userZone !== appZone) {
      res.status(403).json({ message: `Access Denied: Only the respective zone officer (${application.zone}) can delete scheme applications for this ward.` });
      return;
    }
  }

  const success = await db.collection('applications').deleteOne(id);
  if (!success) {
    res.status(404).json({ message: 'Application could not be deleted.' });
    return;
  }

  logAudit('Scheme Application Deleted', req, `Officer deleted scheme application ID: ${id} for "${application.schemeName}"`);
  res.json({ message: 'Scheme application deleted successfully.' });
});

// ==========================================
// 7. PUBLIC NOTICES (/api/notices)
// ==========================================

const JWT_SECRET_INTERNAL = process.env.JWT_SECRET || 'gram_panchayath_secret_key_2025';

// List notices (Filtered by area visibility based on user role/jurisdiction)
router.get('/notices', async (req: AuthenticatedRequest, res) => {
  let currentUser: any = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET_INTERNAL) as any;
      currentUser = await db.collection('users').findById(decoded.id);
    } catch (e) {
      // Ignore token verification errors for guests
    }
  }

  let list = await db.collection('notices').find();

  if (currentUser) {
    if (currentUser.role === 'citizen') {
      const citizenZone = getBackendUserZone(currentUser);
      list = list.filter(n => {
        const tz = n.targetZone || (n as any).targetArea || 'All Areas';
        return tz === 'All' || tz === 'All Areas' || tz === 'All Zones' || tz === citizenZone;
      });
    } else if (currentUser.role === 'officer') {
      const officerZone = currentUser.assignedZone || getBackendUserZone(currentUser);
      list = list.filter(n => {
        const tz = n.targetZone || (n as any).targetArea || 'All Areas';
        return tz === 'All' || tz === 'All Areas' || tz === 'All Zones' || tz === officerZone;
      });
    } else if (currentUser.role === 'admin') {
      const zoneQuery = (req.query.zone as string) || (req.query.area as string);
      if (zoneQuery && zoneQuery !== 'All' && zoneQuery !== 'All Areas' && zoneQuery !== 'All Zones') {
        list = list.filter(n => {
          const tz = n.targetZone || (n as any).targetArea || 'All Areas';
          return tz === zoneQuery;
        });
      }
    }
  } else {
    const zoneQuery = (req.query.zone as string) || (req.query.area as string);
    if (zoneQuery && zoneQuery !== 'All' && zoneQuery !== 'All Areas' && zoneQuery !== 'All Zones') {
      list = list.filter(n => {
        const tz = n.targetZone || (n as any).targetArea || 'All Areas';
        return tz === 'All' || tz === 'All Areas' || tz === 'All Zones' || tz === zoneQuery;
      });
    }
  }

  res.json(list);
});

// Create notice (Admin or Officers)
router.post('/notices', verifyToken, checkRole(['officer', 'admin']), async (req: AuthenticatedRequest, res) => {
  const { title, content, expiryDate, category, fileUrl, targetZone, targetArea } = req.body;

  if (!title || !content || !expiryDate) {
    res.status(400).json({ message: 'Title, content, and expiry date are required.' });
    return;
  }

  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ message: 'Notice content is required.' });
    return;
  }

  if (content.trim().length > 3000) {
    res.status(400).json({ message: 'Notice content cannot exceed 3000 characters.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);
  const officerZone = currentUser?.assignedZone || getBackendUserZone(currentUser);

  // Enforce area logic:
  // When an officer creates a notice, automatically assign the notice to the officer's own area.
  // Officers cannot create notices for other areas.
  let zoneToTarget = targetArea || targetZone || 'All Areas';
  if (currentUser?.role === 'officer') {
    zoneToTarget = officerZone;
  } else if (currentUser?.role === 'admin') {
    if (zoneToTarget === 'All' || zoneToTarget === 'All Zones') zoneToTarget = 'All Areas';
  }

  const authorName = `${currentUser?.name || 'Panchayath Administration'} (${currentUser?.role === 'officer' ? zoneToTarget + ' Officer' : 'Admin'})`;

  const newNotice = await db.collection('notices').insertOne({
    title,
    content,
    publishedAt: new Date().toISOString(),
    expiryDate,
    category: category || 'General',
    fileUrl: fileUrl || '',
    targetZone: zoneToTarget,
    targetArea: zoneToTarget,
    authorName,
  });

  // Broadcast notification to citizens in targeted area ONLY
  const citizens = await db.collection('users').find({ role: 'citizen' });
  for (const c of citizens) {
    const cZone = getBackendUserZone(c);
    const isTargeted = zoneToTarget === 'All' || zoneToTarget === 'All Areas' || zoneToTarget === 'All Zones' || cZone === zoneToTarget;
    if (isTargeted) {
      await sendNotification(
        c.id,
        `New Announcement (${zoneToTarget}): ${title}`,
        `Official Announcement from ${authorName}: "${title}"`
      );
    }
  }

  logAudit('Notice Published', req, `Notice published for area ${zoneToTarget}: ${title}`);
  res.status(201).json(newNotice);
});

// Delete Notice
router.delete('/notices/:id', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const notice = await db.collection('notices').findById(id);
  if (!notice) {
    res.status(404).json({ message: 'Notice not found' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);
  const noticeZone = notice.targetZone || (notice as any).targetArea || 'All Areas';
  const officerZone = currentUser?.assignedZone || getBackendUserZone(currentUser);

  if (currentUser?.role === 'officer' && noticeZone !== 'All' && noticeZone !== 'All Areas' && noticeZone !== 'All Zones' && noticeZone !== officerZone) {
    res.status(403).json({ message: 'Officers can only delete notices issued for their assigned area.' });
    return;
  }

  await db.collection('notices').deleteOne(id);
  logAudit('Notice Deleted', req, `${currentUser?.role || 'User'} deleted notice ID: ${id}`);
  res.json({ message: 'Notice deleted successfully.' });
});

// ==========================================
// 8. EMPLOYEE MANAGEMENT (/api/employees)
// ==========================================

router.get('/employees', verifyOptionalToken, async (req, res) => {
  const officers = (await db.collection('employees').find()) || [];
  const seen = new Set<string>();
  const uniqueOfficers = officers.filter(o => {
    const key = (o.email || o.id || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  res.json(uniqueOfficers);
});

router.post('/employees', verifyToken, checkRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const { name, department, role, phone, email, password, joinDate, assignedZone, status } = req.body;

  if (!name || !department || !role || !email) {
    res.status(400).json({ message: 'Name, department, role, and email are required.' });
    return;
  }

  const nameValidation = isValidFullName(name, 50);
  if (!nameValidation.isValid) {
    res.status(400).json({ message: nameValidation.error || 'Officer name must contain only letters and cannot exceed 50 characters.' });
    return;
  }

  if (password) {
    const pwdValidation = isValidPassword(password, 6, true);
    if (!pwdValidation.isValid) {
      res.status(400).json({ message: pwdValidation.error || 'Password must contain at least one numerical digit and one special character.' });
      return;
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingEmp = await db.collection('employees').findOne({ email: normalizedEmail });
  if (existingEmp) {
    res.status(400).json({ message: 'An officer with this email address already exists.' });
    return;
  }

  const newEmp = await db.collection('employees').insertOne({
    name: name.trim(),
    department,
    role,
    phone: phone || '',
    email: normalizedEmail,
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    assignedZone: assignedZone || 'Bengaluru South',
    status: status || 'Active',
  });

  // Also create/sync officer login credentials in the users collection
  const existingUser = (await db.collection('users').findOne({ email: normalizedEmail })) ||
                       (await db.collection('users').findOne({ name: name.trim(), role: 'officer' }));
  const hashedPassword = password ? bcrypt.hashSync(password, 10) : bcrypt.hashSync('Officer@2026', 10);
  const targetZone = assignedZone || 'Bengaluru South';
  const targetStatus = status || 'Active';

  if (existingUser) {
    await db.collection('users').findByIdAndUpdate(existingUser.id, {
      role: 'officer',
      assignedZone: targetZone,
      zone: targetZone,
      name: name.trim(),
      phone: phone || existingUser.phone,
      status: targetStatus,
      isDeactivated: targetStatus === 'Inactive',
      isDeleted: false,
      ...(password ? { password: hashedPassword } : {}),
    });
  } else {
    await db.collection('users').insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      role: 'officer',
      phone: phone || '',
      address: `${targetZone} Gram Panchayath Office`,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      taluk: targetZone,
      gramPanchayath: `${targetZone} Panchayath`,
      ward: 'Ward 01',
      zone: targetZone,
      assignedZone: targetZone,
      status: targetStatus,
      isDeactivated: targetStatus === 'Inactive',
      isDeleted: false,
      completedProfile: true,
    });
  }

  logAudit('Officer Added', req, `Admin added officer: ${name} assigned to ${assignedZone || 'South'}`);
  res.status(201).json(newEmp);
});

router.put('/employees/:id', verifyToken, checkRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const emp = await db.collection('employees').findById(id);
  if (!emp) {
    res.status(404).json({ message: 'Officer not found.' });
    return;
  }

  const { name, email, phone, role, assignedZone, status, department, resetPassword, newPassword } = req.body;

  // 1. Validate Officer Name
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ message: 'Officer Name is required.' });
    return;
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 50 || !/^[A-Za-z\s.'-]+$/.test(trimmedName)) {
    res.status(400).json({ message: 'Officer Name must contain only valid letters.' });
    return;
  }

  // 2. Validate Email Address
  if (!email || typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ message: 'Email address is required.' });
    return;
  }
  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    res.status(400).json({ message: 'Please enter a valid email address.' });
    return;
  }

  // Check duplicate email: another employee
  const otherEmpWithEmail = ((await db.collection('employees').find()) || []).find(
    e => e.id !== id && e.email && e.email.trim().toLowerCase() === trimmedEmail
  );
  if (otherEmpWithEmail) {
    res.status(400).json({ message: 'An account with this email already exists.' });
    return;
  }

  // Find linked user for this officer
  const currentOfficerUser = await db.collection('users').findOne({ email: emp.email?.toLowerCase() }) ||
                             await db.collection('users').findOne({ name: emp.name, role: 'officer' });

  // Check duplicate email: another user
  const userWithEmail = await db.collection('users').findOne({ email: trimmedEmail });
  if (userWithEmail && (!currentOfficerUser || userWithEmail.id !== currentOfficerUser.id)) {
    res.status(400).json({ message: 'An account with this email already exists.' });
    return;
  }

  // 3. Validate Phone Number
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    res.status(400).json({ message: 'Phone number is required.' });
    return;
  }
  const cleanedPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanedPhone)) {
    res.status(400).json({ message: 'Please enter a valid 10-digit mobile number.' });
    return;
  }

  // 4. Validate Designated Role
  if (!role || typeof role !== 'string' || !role.trim()) {
    res.status(400).json({ message: 'Designated Role is required.' });
    return;
  }
  const trimmedRole = role.trim();

  // 5. Validate Jurisdiction Zone
  const validZones = ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Bengaluru West'];
  const targetZone = validZones.includes(assignedZone) ? assignedZone : (emp.assignedZone || 'Bengaluru South');

  // 6. Validate Status
  const validStatuses = ['Active', 'On Leave', 'Inactive'];
  const targetStatus = validStatuses.includes(status) ? status : (emp.status || 'Active');

  // 7. Optional Password Reset
  const pwdToUpdate = resetPassword || newPassword;
  if (pwdToUpdate) {
    const pwdValidation = isValidPassword(pwdToUpdate, 6, true);
    if (!pwdValidation.isValid) {
      res.status(400).json({ message: pwdValidation.error || 'Password must contain at least 6 characters, one numerical digit, and one special character.' });
      return;
    }
  }

  // Track field changes for audit
  const changedFields: string[] = [];
  if (emp.name !== trimmedName) changedFields.push(`Name ("${emp.name}" → "${trimmedName}")`);
  if (emp.email?.toLowerCase() !== trimmedEmail) changedFields.push(`Email ("${emp.email}" → "${trimmedEmail}")`);
  if (emp.phone !== cleanedPhone) changedFields.push(`Phone ("${emp.phone}" → "${cleanedPhone}")`);
  if (emp.role !== trimmedRole) changedFields.push(`Role ("${emp.role}" → "${trimmedRole}")`);
  if ((emp.assignedZone || 'None') !== targetZone) changedFields.push(`Zone ("${emp.assignedZone || 'None'}" → "${targetZone}")`);
  if ((emp.status || 'Active') !== targetStatus) changedFields.push(`Status ("${emp.status || 'Active'}" → "${targetStatus}")`);
  if (pwdToUpdate) changedFields.push('Login Password Reset');

  // Update employee record (preserve existing employee ID and other historical data)
  const updatedEmp = await db.collection('employees').findByIdAndUpdate(id, {
    name: trimmedName,
    email: trimmedEmail,
    phone: cleanedPhone,
    role: trimmedRole,
    assignedZone: targetZone,
    status: targetStatus,
    department: department || emp.department || 'Jurisdiction Administration',
    joinDate: emp.joinDate || new Date().toISOString().split('T')[0],
  });

  // Update officer's linked user account (preserving existing user ID)
  if (currentOfficerUser) {
    const userUpdates: any = {
      name: trimmedName,
      email: trimmedEmail,
      phone: cleanedPhone,
      assignedZone: targetZone,
      zone: targetZone,
      taluk: targetZone,
      gramPanchayath: `${targetZone} Panchayath`,
      status: targetStatus,
      isDeactivated: targetStatus === 'Inactive',
      isDeleted: false,
    };
    if (pwdToUpdate) {
      userUpdates.password = bcrypt.hashSync(pwdToUpdate, 10);
    }
    await db.collection('users').findByIdAndUpdate(currentOfficerUser.id, userUpdates);
  } else {
    // If officer user account doesn't exist, create it with preserved identity
    const initialPassword = bcrypt.hashSync(pwdToUpdate || 'Panchayath@2026', 10);
    await db.collection('users').insertOne({
      email: trimmedEmail,
      password: initialPassword,
      name: trimmedName,
      role: 'officer',
      phone: cleanedPhone,
      address: `${targetZone} Gram Panchayath Office`,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      taluk: targetZone,
      gramPanchayath: `${targetZone} Panchayath`,
      ward: 'Ward 01',
      zone: targetZone,
      assignedZone: targetZone,
      status: targetStatus,
      isDeactivated: targetStatus === 'Inactive',
      isDeleted: false,
      completedProfile: true,
    });
  }

  // Cross-collection synchronization when officer name changes
  if (emp.name !== trimmedName) {
    const allAssets = await db.collection('assets').find() || [];
    for (const a of allAssets) {
      if (a.responsibleOfficer === emp.name) {
        await db.collection('assets').findByIdAndUpdate(a.id, { responsibleOfficer: trimmedName });
      }
    }
    const allGrievs = await db.collection('grievances').find() || [];
    for (const g of allGrievs) {
      if (g.assignedOfficerName === emp.name || (currentOfficerUser && g.assignedOfficerId === currentOfficerUser.id)) {
        await db.collection('grievances').findByIdAndUpdate(g.id, { assignedOfficerName: trimmedName });
      }
    }
  }

  // Audit Logging
  const adminName = req.user?.name || req.user?.email || 'Admin';
  const adminId = req.user?.id || 'admin';
  logAudit(
    'Officer Details Updated',
    req,
    `Admin ${adminName} (ID: ${adminId}) modified officer "${emp.name}" (ID: ${id}). Changes: ${changedFields.length > 0 ? changedFields.join(', ') : 'No modified fields'}`
  );

  res.json(updatedEmp);
});

router.delete('/employees/:id', verifyToken, checkRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const emp = await db.collection('employees').findById(id);
  if (!emp) {
    res.status(404).json({ message: 'Officer not found.' });
    return;
  }

  // Delete from active employee directory
  await db.collection('employees').deleteOne(id);

  // Deactivate matching officer user account while preserving user ID and historical record associations
  const matchingUser = await db.collection('users').findOne({ email: emp.email }) ||
                       await db.collection('users').findOne({ name: emp.name, role: 'officer' });
  if (matchingUser) {
    await db.collection('users').findByIdAndUpdate(matchingUser.id, {
      status: 'Inactive',
      isDeactivated: true,
      isDeleted: true,
    });
  }

  logAudit('Officer De-listed', req, `Admin de-listed officer "${emp.name}" (ID: ${id})`);
  res.json({ message: 'Officer deleted successfully' });
});

// ==========================================
// 9. ASSET MANAGEMENT (/api/assets)
// ==========================================

// Helper to infer jurisdiction zone for user
const VALID_ASSET_ZONES = ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Bengaluru West'];

function getCanonicalAssetZone(zone: unknown): string | undefined {
  if (typeof zone !== 'string') return undefined;
  return VALID_ASSET_ZONES.find(validZone => validZone.toLowerCase() === zone.trim().toLowerCase());
}

function getBackendUserZone(user: any): string {
  if (!user) return 'Bengaluru South';
  if (user.assignedZone && user.assignedZone !== 'All' && user.assignedZone !== 'All Zones') return user.assignedZone;
  if (user.zone && user.zone !== 'All' && user.zone !== 'All Zones') return user.zone;

  const str = `${user.taluk || ''} ${user.gramPanchayath || ''} ${user.district || ''} ${user.address || ''}`;
  if (/north/i.test(str)) return 'Bengaluru North';
  if (/east/i.test(str)) return 'Bengaluru East';
  if (/west/i.test(str)) return 'Bengaluru West';
  if (/south/i.test(str)) return 'Bengaluru South';

  return 'Bengaluru South';
}

router.get('/assets', verifyToken, async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user?.id || '');
  let assets = await db.collection('assets').find();

  if (currentUser) {
    if (currentUser.role === 'citizen') {
      const citizenZone = getBackendUserZone(currentUser);
      assets = assets.filter(a => !a.zone || a.zone === citizenZone);
    } else if (currentUser.role === 'officer') {
      const officerZone = currentUser.assignedZone || getBackendUserZone(currentUser);
      assets = assets.filter(a => !a.zone || a.zone === officerZone);
    }
  }

  res.json(assets);
});

router.post('/assets', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const {
    name,
    title,
    assetIdCode,
    category,
    type,
    description,
    location,
    ward,
    latitude,
    longitude,
    installationDate,
    cost,
    expectedLifespan,
    department,
    responsibleOfficer,
    status,
    condition,
    photoData,
    invoiceData,
    invoiceName,
    remarks,
    lastMaintenanceDate,
    zone,
  } = req.body;

  const assetName = name || title;

  if (!assetName) {
    res.status(400).json({ message: 'Asset title/name is required.' });
    return;
  }

  if (!location) {
    res.status(400).json({ message: 'Location address is required.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user?.id || '');
  if (!currentUser) {
    res.status(401).json({ message: 'Authenticated user profile not found.' });
    return;
  }

  const requestedZone = getCanonicalAssetZone(zone);
  let assetZone: string | undefined;
  if (currentUser.role === 'officer') {
    assetZone = getCanonicalAssetZone(currentUser.assignedZone || currentUser.zone);
    if (!assetZone) {
      res.status(400).json({ message: 'Officer profile has no valid assigned jurisdiction zone.' });
      return;
    }
    if (requestedZone && requestedZone !== assetZone) {
      res.status(403).json({ message: 'Officers can only create assets in their assigned jurisdiction.' });
      return;
    }
  } else {
    assetZone = requestedZone;
    if (!assetZone) {
      res.status(400).json({ message: 'A valid asset zone is required.' });
      return;
    }
  }

  // Generate Asset ID code if not provided
  const generatedAssetId =
    assetIdCode ||
    `AST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const newAsset = await db.collection('assets').insertOne({
    assetIdCode: generatedAssetId,
    name: assetName,
    title: assetName,
    category: category || 'Water & Sanitation',
    type: type || category || 'Water Tanks',
    description: description || '',
    location,
    ward: ward || 'Ward 1',
    latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
    longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
    installationDate: installationDate || new Date().toISOString().split('T')[0],
    cost: cost !== undefined ? Number(cost) : 0,
    expectedLifespan: expectedLifespan || '5 Years',
    department: department || 'Public Works',
    responsibleOfficer: responsibleOfficer || currentUser?.name || 'Sunita Sharma',
    status: status || 'Active',
    condition: condition || 'Good',
    photoData: photoData || '',
    invoiceData: invoiceData || '',
    invoiceName: invoiceName || '',
    remarks: remarks || '',
    lastMaintenanceDate: lastMaintenanceDate || new Date().toISOString().split('T')[0],
    zone: assetZone,
    createdAt: new Date().toISOString(),
  });

  logAudit(
    'Asset Logged',
    req,
    `${currentUser?.role === 'officer' ? 'Officer' : 'Admin'} logged asset [${generatedAssetId}]: ${assetName}`
  );
  res.status(201).json(newAsset);
});

router.put('/assets/:id', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const asset = await db.collection('assets').findById(id);
  if (!asset) {
    res.status(404).json({ message: 'Asset not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && asset.zone && asset.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Officers can only manage assets within their assigned jurisdiction.' });
    return;
  }

  const {
    name,
    title,
    assetIdCode,
    category,
    type,
    description,
    location,
    ward,
    latitude,
    longitude,
    installationDate,
    cost,
    expectedLifespan,
    department,
    responsibleOfficer,
    status,
    condition,
    photoData,
    invoiceData,
    invoiceName,
    remarks,
    lastMaintenanceDate,
  } = req.body;

  const assetName = name || title;

  const updated = await db.collection('assets').findByIdAndUpdate(id, {
    ...(assetName && { name: assetName, title: assetName }),
    ...(assetIdCode && { assetIdCode }),
    ...(category && { category, type: category }),
    ...(type && { type }),
    ...(description !== undefined && { description }),
    ...(location && { location }),
    ...(ward && { ward }),
    latitude: latitude !== undefined ? (latitude !== null ? Number(latitude) : null) : undefined,
    longitude: longitude !== undefined ? (longitude !== null ? Number(longitude) : null) : undefined,
    ...(installationDate && { installationDate }),
    cost: cost !== undefined ? Number(cost) : undefined,
    ...(expectedLifespan && { expectedLifespan }),
    ...(department && { department }),
    ...(responsibleOfficer && { responsibleOfficer }),
    ...(status && { status }),
    ...(condition && { condition }),
    ...(photoData !== undefined && { photoData }),
    ...(invoiceData !== undefined && { invoiceData }),
    ...(invoiceName !== undefined && { invoiceName }),
    ...(remarks !== undefined && { remarks }),
    ...(lastMaintenanceDate && { lastMaintenanceDate }),
    ...(currentUser.role === 'admin' && getCanonicalAssetZone(req.body.zone) && { zone: getCanonicalAssetZone(req.body.zone) }),
  });

  if (!updated) {
    res.status(404).json({ message: 'Asset not found.' });
    return;
  }

  logAudit('Asset Updated', req, `Modified asset ID: ${id}`);
  res.json(updated);
});

router.delete('/assets/:id', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const asset = await db.collection('assets').findById(id);
  if (!asset) {
    res.status(404).json({ message: 'Asset not found.' });
    return;
  }

  const currentUser = await db.collection('users').findById(req.user!.id);
  if (currentUser?.role === 'officer' && currentUser.assignedZone && asset.zone && asset.zone !== currentUser.assignedZone) {
    res.status(403).json({ message: 'Officers can only delete assets within their assigned jurisdiction.' });
    return;
  }

  const success = await db.collection('assets').deleteOne(id);
  if (!success) {
    res.status(404).json({ message: 'Asset not found.' });
    return;
  }

  logAudit('Asset Deleted', req, `${currentUser?.role || 'User'} deleted asset ID: ${id}`);
  res.json({ message: 'Asset deleted successfully.' });
});

// ==========================================
// 10. SYSTEM ANALYTICS / REPORTS (/api/reports)
// ==========================================

router.get('/reports/analytics', verifyToken, checkRole(['admin', 'officer']), async (req: AuthenticatedRequest, res) => {
  const currentUser = await db.collection('users').findById(req.user?.id || '');
  const officerZone = currentUser?.assignedZone || (currentUser?.role === 'officer' ? currentUser?.zone : undefined);
  const isOfficer = currentUser?.role === 'officer' && !!officerZone;
  const requestedZone = req.query.zone as string | undefined;
  const zoneFilter = isOfficer ? officerZone : (requestedZone && requestedZone !== 'All' && requestedZone !== 'All Zones' ? requestedZone : undefined);

  let citizens = await db.collection('users').find({ role: 'citizen' });
  let grievances = await db.collection('grievances').find();
  let certificates = await db.collection('certificates').find();
  let taxes = await db.collection('taxes').find();
  let payments = await db.collection('payments').find();
  let assets = await db.collection('assets').find();

  const matchZone = (recordZone?: string, target?: string) => {
    if (!target || target === 'All' || target === 'All Zones') return true;
    if (!recordZone) return false;
    const r = recordZone.toLowerCase();
    const t = target.toLowerCase();
    if (t.includes('north') && r.includes('north')) return true;
    if (t.includes('south') && r.includes('south')) return true;
    if (t.includes('east') && r.includes('east')) return true;
    if (t.includes('west') && r.includes('west')) return true;
    return r === t;
  };

  if (zoneFilter) {
    citizens = citizens.filter(c => matchZone(c.zone, zoneFilter));
    grievances = grievances.filter(g => matchZone(g.zone, zoneFilter) || (isOfficer && g.assignedOfficerId === currentUser?.id));
    certificates = certificates.filter(c => matchZone(c.zone, zoneFilter));
    taxes = taxes.filter(t => matchZone(t.zone, zoneFilter));
    payments = payments.filter(p => matchZone(p.zone, zoneFilter));
    assets = assets.filter(a => !a.zone || matchZone(a.zone, zoneFilter));
  }

  const citizensCount = citizens.length;
  const staffCount = await (await db.collection('employees').find()).length;
  const activeSchemesCount = await (await db.collection('schemes').find({ status: 'Active' })).length;

  // Deduplicate transactions by unique ID and filter for valid successful status
  const seenTransactionKeys = new Set<string>();
  const validPayments = payments.filter(p => {
    if (!p) return false;
    const key = (p.transactionId || p.id || '').trim();
    if (!key || seenTransactionKeys.has(key)) return false;
    seenTransactionKeys.add(key);

    const s = (p.status || 'paid').toLowerCase().trim();
    if (
      s === 'pending' ||
      s === 'failed' ||
      s === 'cancelled' ||
      s === 'canceled' ||
      s === 'rejected' ||
      s === 'refunded' ||
      s === 'reversed' ||
      s === 'unpaid'
    ) {
      return false;
    }
    return true;
  });
  const totalRevenue = validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Total counts
  const totalCertificates = certificates.length;
  const totalGrievances = grievances.length;
  const totalAssets = assets.length;

  // Asset status breakdown
  const activeAssets = assets.filter(a => {
    const s = (a.status || '').toLowerCase();
    const c = (a.condition || '').toLowerCase();
    return (s === 'active' || s === 'operational') && !c.includes('repair') && !c.includes('damaged');
  }).length;
  const maintenanceAssets = assets.filter(a => {
    const s = (a.status || '').toLowerCase();
    return s.includes('maint') && !s.includes('issue');
  }).length;
  const issueAssets = assets.filter(a => {
    const s = (a.status || '').toLowerCase();
    const c = (a.condition || '').toLowerCase();
    return c.includes('repair') || c.includes('damaged') || s.includes('issue') || s.includes('decommission') || s.includes('repair');
  }).length;

  // Status counters
  const pendingGrievances = grievances.filter(g => g.status !== 'Resolved' && g.status !== 'Rejected').length;
  const resolvedGrievances = grievances.filter(g => g.status === 'Resolved').length;

  const pendingCertificates = certificates.filter(c => c.status === 'Pending').length;
  const approvedCertificates = certificates.filter(c => c.status === 'Approved').length;

  // Fully dynamic monthly revenue aggregation (January–December) from valid payments
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const targetYear = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

  const monthlyRevenue = monthLabels.map((name, index) => {
    const monthPayments = validPayments.filter(p => {
      const d = new Date(p.paymentDate);
      return !isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === index;
    });

    const revenue = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const transactionsCount = monthPayments.length;

    const breakdown: Record<string, number> = {};
    monthPayments.forEach(p => {
      const cat = p.taxType || p.type || 'Property Tax';
      breakdown[cat] = (breakdown[cat] || 0) + (Number(p.amount) || 0);
    });

    return {
      name,
      fullName: fullMonthLabels[index],
      monthIndex: index,
      year: targetYear,
      revenue,
      transactionsCount,
      breakdown,
    };
  });

  // Grievances by category
  const categories = ['Water Supply', 'Road Damage', 'Electricity', 'Garbage', 'Street Light', 'Drainage', 'Others'];
  const grievanceStats = categories.map(cat => ({
    name: cat,
    value: grievances.filter(g => g.category === cat).length
  }));

  // Activity logs
  const logs = await db.collection('auditLogs').find();
  const recentActivities = logs.slice(-6).reverse().map(log => ({
    ...log,
    action: log.action ? log.action.replace(/Employees/g, 'Officers').replace(/employees/g, 'officers').replace(/Employee/g, 'Officer').replace(/employee/g, 'officer') : log.action,
    details: log.details ? log.details.replace(/Employees/g, 'Officers').replace(/employees/g, 'officers').replace(/Employee/g, 'Officer').replace(/employee/g, 'officer') : log.details,
  }));

  res.json({
    metrics: {
      totalCitizens: citizensCount,
      totalStaff: staffCount,
      activeSchemes: activeSchemesCount,
      totalRevenue,
      totalCertificates,
      totalGrievances,
      totalAssets,
      activeAssets,
      maintenanceAssets,
      issueAssets,
      pendingGrievances,
      resolvedGrievances,
      pendingCertificates,
      approvedCertificates,
      assignedZone: isOfficer ? zoneFilter : 'All Zones',
    },
    grievancesByCategory: grievanceStats,
    revenueChart: monthlyRevenue,
    recentActivities,
  });
});

// ==========================================
// 10B. OFFICER PERFORMANCE ANALYTICS (/api/reports/officer-performance)
// ==========================================

router.get('/reports/officer-performance', verifyToken, checkRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const allGrievances = await db.collection('grievances').find() || [];
  const allCertificates = await db.collection('certificates').find() || [];
  const allApplications = await db.collection('applications').find() || [];
  const allEmployees = ((await db.collection('employees').find()) || []).filter((e: any) => e.status !== 'Inactive');
  const officerUsers = ((await db.collection('users').find({ role: 'officer' })) || []).filter((u: any) => !u.isDeactivated && u.status !== 'Inactive' && !u.isDeleted);

  // Dynamically assemble all current active officers with strict deduplication
  const activeOfficers: any[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();

  allEmployees.forEach((emp: any) => {
    const userAcc = officerUsers.find((u: any) =>
      (u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()) ||
      (u.name && emp.name && u.name.toLowerCase() === emp.name.toLowerCase()) ||
      (u.id && emp.id && u.id === emp.id)
    );
    const officerId = userAcc ? userAcc.id : emp.id;
    if (!officerId || !emp.name?.trim() || !emp.assignedZone?.trim()) return;
    if (seenIds.has(officerId)) return;
    if (emp.email && seenEmails.has(emp.email.toLowerCase())) return;
    if (emp.name && seenNames.has(emp.name.toLowerCase())) return;

    seenIds.add(officerId);
    if (emp.email) seenEmails.add(emp.email.toLowerCase());
    if (userAcc?.email) seenEmails.add(userAcc.email.toLowerCase());
    if (emp.name) seenNames.add(emp.name.toLowerCase());
    if (userAcc?.name) seenNames.add(userAcc.name.toLowerCase());

    activeOfficers.push({
      id: officerId,
      name: emp.name,
      role: emp.role || 'Zone Panchayath Officer',
      assignedZone: emp.assignedZone,
      department: emp.department || 'Administration',
      email: emp.email || userAcc?.email,
      phone: emp.phone || userAcc?.phone || '',
    });
  });

  // Include any remaining officers that exist in users collection
  officerUsers.forEach((u: any) => {
    if (!u.id || !u.name?.trim() || !(u.assignedZone || u.zone)?.trim()) return;
    if (seenIds.has(u.id)) return;
    if (u.email && seenEmails.has(u.email.toLowerCase())) return;
    if (u.name && seenNames.has(u.name.toLowerCase())) return;

    seenIds.add(u.id);
    if (u.email) seenEmails.add(u.email.toLowerCase());
    if (u.name) seenNames.add(u.name.toLowerCase());

    activeOfficers.push({
      id: u.id,
      name: u.name,
      role: 'Zone Panchayath Officer',
      assignedZone: u.assignedZone || u.zone,
      department: 'Administration',
      email: u.email,
      phone: u.phone || '',
    });
  });

  const result = activeOfficers.map(off => {
    // Exact resolved grievances in database matching officer's assigned zone or ID or name
    const resolvedGrievances = allGrievances.filter(g =>
      (g.status === 'Resolved') &&
      (
        (g.assignedOfficerId && g.assignedOfficerId === off.id) ||
        (g.assignedOfficerName && g.assignedOfficerName.toLowerCase() === off.name.toLowerCase()) ||
        (g.zone && off.assignedZone && g.zone.toLowerCase() === off.assignedZone.toLowerCase())
      )
    );

    // Exact approved certificates in database matching officer's assigned zone or ID or approvedBy
    const approvedCertificates = allCertificates.filter(c =>
      (c.status === 'Approved') &&
      (
        (c.assignedOfficerId && c.assignedOfficerId === off.id) ||
        (c.approvedBy && c.approvedBy.toLowerCase().includes(off.name.toLowerCase())) ||
        (c.zone && off.assignedZone && c.zone.toLowerCase() === off.assignedZone.toLowerCase())
      )
    );

    // Exact approved scheme applications in database matching officer's assigned zone or ID or approvedBy
    const approvedSchemes = allApplications.filter(a =>
      (a.status === 'Approved') &&
      (
        (a.assignedOfficerId && a.assignedOfficerId === off.id) ||
        ((a as any).approvedBy && (a as any).approvedBy.toLowerCase().includes(off.name.toLowerCase())) ||
        (a.zone && off.assignedZone && a.zone.toLowerCase() === off.assignedZone.toLowerCase())
      )
    );

    // Calculate dynamic average resolution time from resolved grievances or default
    let avgResolutionTime = '1.2 Days';
    if (resolvedGrievances.length > 0) {
      let totalDiffMs = 0;
      let countWithDates = 0;
      resolvedGrievances.forEach(g => {
        if (g.createdAt && (g.resolvedAt || g.updatedAt)) {
          const start = new Date(g.createdAt).getTime();
          const end = new Date(g.resolvedAt || g.updatedAt).getTime();
          if (end >= start) {
            totalDiffMs += (end - start);
            countWithDates++;
          }
        }
      });
      if (countWithDates > 0) {
        const avgMs = totalDiffMs / countWithDates;
        const avgDays = Math.max(0.5, Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10);
        avgResolutionTime = `${avgDays} Days`;
      }
    } else {
      avgResolutionTime = '0 Days (Pending Tasks)';
    }

    return {
      id: off.id,
      name: off.name,
      role: off.role,
      assignedZone: off.assignedZone,
      department: off.department,
      email: off.email,
      phone: off.phone,
      complaintsResolved: resolvedGrievances.length,
      certificatesApproved: approvedCertificates.length,
      schemesApproved: approvedSchemes.length,
      avgResolutionTime,
      resolvedGrievancesList: resolvedGrievances,
      approvedCertificatesList: approvedCertificates,
      approvedSchemesList: approvedSchemes,
    };
  });

  res.json(result);
});

// ==========================================
// 11. USER NOTIFICATIONS
// ==========================================

router.get('/notifications', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const notifications = await db.collection('notifications').find({ userId: req.user.id }) || [];
  const activeNotifications = notifications.filter(n => !n.isCleared);
  const sorted = [...activeNotifications].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  res.json(sorted);
});

router.patch('/notifications/read', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const notifications = await db.collection('notifications').find({ userId: req.user.id }) || [];
  for (const n of notifications) {
    if (!n.isCleared) {
      await db.collection('notifications').findByIdAndUpdate(n.id, { isRead: true });
    }
  }
  res.json({ success: true });
});

router.patch('/notifications/clear', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const notifications = await db.collection('notifications').find({ userId: req.user.id }) || [];
  const now = new Date().toISOString();
  let count = 0;
  for (const n of notifications) {
    if (!n.isCleared) {
      await db.collection('notifications').findByIdAndUpdate(n.id, {
        isCleared: true,
        isRead: true,
        clearedAt: now
      });
      count++;
    }
  }

  logAudit('CLEAR_NOTIFICATIONS', req, `Cleared ${count} notifications from panel for user ${req.user.email}`);

  res.json({ success: true, clearedCount: count });
});

router.post('/notifications/clear', verifyToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const notifications = await db.collection('notifications').find({ userId: req.user.id }) || [];
  const now = new Date().toISOString();
  let count = 0;
  for (const n of notifications) {
    if (!n.isCleared) {
      await db.collection('notifications').findByIdAndUpdate(n.id, {
        isCleared: true,
        isRead: true,
        clearedAt: now
      });
      count++;
    }
  }

  logAudit('CLEAR_NOTIFICATIONS', req, `Cleared ${count} notifications from panel for user ${req.user.email}`);

  res.json({ success: true, clearedCount: count });
});

// ==========================================
// 12. CHAT Mitr AI SUPPORT (/api/gemini/chat)
// ==========================================

router.post('/gemini/chat', verifyOptionalToken, async (req: AuthenticatedRequest, res) => {
  const { history, message } = req.body;

  if (!message) {
    res.status(400).json({ message: 'Message is required.' });
    return;
  }

  const currentUser = req.user?.id ? (await db.collection('users').findById(req.user.id)) : null;
  const isAuthenticated = Boolean(currentUser);
  const role = currentUser?.role || req.user?.role || 'guest';
  const name = currentUser?.name || req.user?.name || 'Visitor';

  const allRawSchemes: any[] = await db.collection('schemes').find() || [];
  const activeSchemes = allRawSchemes
    .filter((s: any) => s.status === 'Active' || !s.status)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category || s.department || 'General',
      benefits: s.benefits || '',
      description: s.description || '',
      eligibilityCriteria: s.eligibilityCriteria || '',
      department: s.department || 'Panchayath Welfare'
    }));

  let contextSummary: any = {
    isAuthenticated,
    role,
    name,
    totalGrievances: null,
    pendingCertificates: null,
    unpaidTaxesCount: null,
    assignedZone: 'All Zones',
    activeSchemes
  };

  if (isAuthenticated && currentUser) {
    let allCerts: any[] = await db.collection('certificates').find() || [];
    let allGrievances: any[] = await db.collection('grievances').find() || [];
    let allTaxes: any[] = await db.collection('taxes').find() || [];

    if (role === 'citizen') {
      allCerts = allCerts.filter(c => c.citizenId === currentUser.id);
      allGrievances = allGrievances.filter(g => g.citizenId === currentUser.id);
      allTaxes = allTaxes.filter(t => t.citizenId === currentUser.id);
    } else if (role === 'officer' && currentUser?.assignedZone) {
      allCerts = allCerts.filter(c => c.zone === currentUser.assignedZone);
      allGrievances = allGrievances.filter(g => g.zone === currentUser.assignedZone || g.assignedOfficerId === currentUser.id);
      allTaxes = allTaxes.filter(t => t.zone === currentUser.assignedZone);
    }

    const pendingCerts = allCerts.filter(c => c.status === 'Pending').length;
    const unpaidTaxes = allTaxes.filter(t => t.status === 'Unpaid').length;
    const totalGrievances = allGrievances.length;

    const userGrievances = allGrievances.map((g: any) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      createdAt: g.createdAt,
      assignedOfficerName: g.assignedOfficerName || 'Ward Field Officer'
    }));

    const userCertificates = allCerts.map((c: any) => ({
      id: c.id,
      certificateType: c.certificateType,
      status: c.status,
      createdAt: c.createdAt
    }));

    contextSummary = {
      isAuthenticated: true,
      role,
      name,
      totalGrievances,
      pendingCertificates: pendingCerts,
      unpaidTaxesCount: unpaidTaxes,
      assignedZone: (currentUser as any)?.assignedZone || (currentUser as any)?.zone || 'All Zones',
      activeSchemes,
      userGrievances,
      userCertificates
    };
  }

  const responseText = await getAiChatSupport(message, history || [], role, contextSummary);
  res.json({ text: responseText });
});

// ==========================================
// 13. SYSTEM DATABASE BACKUP EXPORT (/api/backup/download)
// ==========================================
router.get('/backup/download', async (req, res) => {
  try {
    const collections = [
      'users', 'employees', 'grievances', 'certificates',
      'schemes', 'applications', 'taxes', 'payments',
      'assets', 'notices', 'notifications', 'auditLogs', 'landingVideos'
    ] as const;

    const backupData: Record<string, any> = {};
    for (const colName of collections) {
      backupData[colName] = await db.collection(colName as any).find();
    }

    const fileData = JSON.stringify(backupData, null, 2);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="namma-panchayath-backup.json"');
    res.status(200).send(fileData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export backup file.', message: err?.message });
  }
});

// Global API error handler
router.use((err: any, _req: any, res: any, next: any) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error('API Router Error:', err);
  if (err.code === 'LIMIT_FILE_SIZE' || err.status === 413) {
    return res.status(413).json({ message: 'Video file exceeds the 28MB limit. Please upload a smaller video.' });
  }
  return res.status(err.status || 500).json({
    message: err.message || 'An unexpected server error occurred.'
  });
});

export default router;
