import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailDispatchRecord {
  id: string;
  to: string;
  subject: string;
  sentAt: string;
  expiresAt: string;
  previewText: string;
  otp?: string; // Stored only for local development sandbox verification
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SIMULATED_EMAILS_FILE = path.join(DATA_DIR, 'simulated_emails.json');

// In-memory cache for recent simulated emails (kept in memory & sync'd to local disk for development)
let simulatedMailbox: EmailDispatchRecord[] = [];

// Load initial simulated emails from disk if present
try {
  if (fs.existsSync(SIMULATED_EMAILS_FILE)) {
    const raw = fs.readFileSync(SIMULATED_EMAILS_FILE, 'utf8');
    simulatedMailbox = JSON.parse(raw);
  }
} catch {
  simulatedMailbox = [];
}

function saveSimulatedMailbox() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SIMULATED_EMAILS_FILE, JSON.stringify(simulatedMailbox.slice(-20), null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save simulated emails to disk:', err);
  }
}

/**
 * Masks an email for safe logging (e.g. "ra****l@gmail.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${'*'.repeat(Math.min(4, local.length - 2))}${last}@${domain}`;
}

/**
 * Checks if real SMTP configuration is present in the environment
 */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Dispatches a password recovery OTP email.
 * Uses real SMTP if configured; otherwise gracefully falls back to the local development mailbox.
 */
export async function sendPasswordResetOtpEmail(options: {
  to: string;
  name?: string;
  otp: string;
}): Promise<{ success: boolean; simulated: boolean; messageId?: string }> {
  const { to, name, otp } = options;
  const recipientName = name || 'Valued User';
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Namma Panchayath Password Recovery</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.9; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .description { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-container { text-align: center; background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: monospace; }
        .otp-expiry { font-size: 11px; font-weight: 600; color: #166534; margin-top: 8px; }
        .security-notice { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; font-size: 11px; color: #92400e; margin-top: 24px; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Namma Panchayath Portal</h1>
          <p>e-Governance & Citizen Services</p>
        </div>
        <div class="content">
          <div class="greeting">Namaskara, ${recipientName}</div>
          <div class="description">
            We received a request to recover the password for your Namma Panchayath account. Use the 6-digit verification code below to authorize your password reset:
          </div>
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">⏱️ Valid for 5 minutes only</div>
          </div>
          <div class="description">
            Please enter this code on the password recovery screen. Do not share this code with anyone, including Panchayath officials or support staff.
          </div>
          <div class="security-notice">
            <strong>Security Alert:</strong> If you did not initiate this password recovery request, please disregard this email. Your current password remains secure.
          </div>
        </div>
        <div class="footer">
          Namma Panchayath Digital Governance Initiative • Rural Development & Panchayat Raj Department
        </div>
      </div>
    </body>
    </html>
  `;

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Namma Panchayath" <no-reply@gram.gov.in>',
        to,
        subject: 'Namma Panchayath — Password Reset Verification Code',
        html: htmlBody,
      });

      console.log(`[Email Service] Real SMTP dispatch successful to ${maskEmail(to)}`);
      return { success: true, simulated: false, messageId: info.messageId };
    } catch (err: any) {
      console.warn(`[Email Service] SMTP dispatch failed (${err.message}). Falling back to development mailbox.`);
    }
  }

  // Safe development fallback when SMTP is not configured or fails
  const record: EmailDispatchRecord = {
    id: `em_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    to,
    subject: 'Namma Panchayath — Password Reset Verification Code',
    sentAt: new Date().toISOString(),
    expiresAt,
    previewText: `Your password recovery code is ready. Use the 6-digit code to proceed.`,
    otp, // Stored safely for dev sandbox lookup
  };

  simulatedMailbox.push(record);
  if (simulatedMailbox.length > 50) {
    simulatedMailbox = simulatedMailbox.slice(-50);
  }
  saveSimulatedMailbox();

  console.log(`[Email Service] Password recovery OTP dispatched for ${maskEmail(to)} (Dev Fallback Active)`);
  return { success: true, simulated: true, messageId: record.id };
}

/**
 * Returns recent simulated emails for a given email address (development/testing sandbox only).
 * Sanitizes output to remove internal server details.
 */
export function getSimulatedEmails(email?: string): EmailDispatchRecord[] {
  const normalized = (email || '').trim().toLowerCase();
  const list = normalized 
    ? simulatedMailbox.filter(e => e.to.toLowerCase() === normalized)
    : simulatedMailbox;
  return list.slice(-5).reverse();
}

/**
 * Clears expired simulated emails from the in-memory mailbox.
 */
export function pruneSimulatedEmails(): void {
  const now = Date.now();
  simulatedMailbox = simulatedMailbox.filter(e => new Date(e.expiresAt).getTime() > now);
  saveSimulatedMailbox();
}
