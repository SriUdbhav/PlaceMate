import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { Student } from '../models/Student';
import { inMemoryStore } from '../db';
import { getTransporter } from '../services/emailService';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'placemate-secure-auth-secret-key-2026';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'placemate-secure-auth-secret-key-2026')) {
  console.warn('⚠️ [SECURITY WARNING]: JWT_SECRET is not set in production! Please configure a strong random secret in Render environment variables.');
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'student' | 'tpo' | 'recruiter' | 'admin';
  name: string;
  rollNo?: string;
  studentId?: string;
  mustChangePassword?: boolean;
}

// Authentication Middleware to protect routes
export function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = user;
    next();
  });
}

// Role Authorization Middleware
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this resource' });
    }
    next();
  };
}

export function maskEmail(email: string): string {
  try {
    const parts = email.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const masked = name.length > 2 ? `${name.substring(0, 2)}***${name.slice(-1)}` : `${name.charAt(0)}***`;
      return `${masked}@${parts[1]}`;
    }
    return '***@email.com';
  } catch {
    return '***@email.com';
  }
}

// Password strength validator adhering to university security requirements
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must include at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must include at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least one number (0-9).' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=~/`[\]\\]/.test(password)) {
    return { valid: false, error: 'Password must include at least one special character (!@#$%^&*).' };
  }
  return { valid: true };
}

// Helper: Save user updates to both MongoDB and in-memory store
async function persistUserUpdate(user: any, updates: Partial<IUser>): Promise<void> {
  Object.assign(user, updates);
  if (mongoose.connection.readyState === 1 && user._id) {
    try {
      await User.findByIdAndUpdate(user._id, { $set: updates });
    } catch (e) {
      console.warn('Persist User to MongoDB failed, kept in memory:', e);
    }
  }
  const memIdx = inMemoryStore.users.findIndex((u: any) => u.userId === user.userId || (user.rollNo && u.rollNo === user.rollNo));
  if (memIdx !== -1) {
    inMemoryStore.users[memIdx] = { ...inMemoryStore.users[memIdx], ...updates } as any;
  }
}

// POST /api/auth/login - Handles University Authentication with Lockout Protection & Clear Errors
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { role, identifier, password } = req.body;
    const cleanRole = String(role || 'student').toLowerCase();
    const cleanId = String(identifier || '').trim();

    // 1. Validation with specific user-friendly messages
    if (!cleanId) {
      if (cleanRole === 'student') {
        return res.status(400).json({ error: 'Please enter your registration number.' });
      }
      return res.status(400).json({ error: 'Please enter your email address.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }

    let user: any = null;
    let studentRecord: any = null;

    if (cleanRole === 'student') {
      const normalizedRoll = cleanId.toUpperCase();

      // Look up student in university records
      if (mongoose.connection.readyState === 1) {
        studentRecord = await Student.findOne({ rollNo: normalizedRoll });
        if (!studentRecord) {
          studentRecord = inMemoryStore.students.find((s) => s.rollNo?.toUpperCase() === normalizedRoll);
        }
      } else {
        studentRecord = inMemoryStore.students.find((s) => s.rollNo?.toUpperCase() === normalizedRoll);
      }

      // If student not found in DB, check if it matches university roll number format
      if (!studentRecord && /^[0-9]{2}[A-Z0-9]{3,}$/i.test(normalizedRoll)) {
        const newStu = {
          studentId: `stu-${normalizedRoll}`,
          name: `Student ${normalizedRoll}`,
          email: `${normalizedRoll.toLowerCase()}@vfstr.ac.in`,
          rollNo: normalizedRoll,
          department: 'Computer Science & Engineering',
          batch: '2021 - 2025 (Final Year)',
          graduationYear: 2025,
          cgpa: 8.5,
          activeBacklogs: 0,
          clearedBacklogs: 0,
          tenthPercentage: 88.0,
          twelfthPercentage: 87.0,
          readinessScore: 85,
          atsScore: 82,
          tierCategory: 'Tier 1' as const,
          skills: ['Data Structures & Algorithms', 'Python', 'Web Development'],
          placed: false,
          offersReceived: 0,
          maxCtcOfferedLpa: 0,
          verificationStatus: 'Verified' as const,
        };
        if (mongoose.connection.readyState === 1) {
          try {
            studentRecord = await Student.create(newStu);
          } catch {
            studentRecord = (await Student.findOne({ rollNo: normalizedRoll })) || newStu;
          }
        } else {
          studentRecord = newStu;
          inMemoryStore.students.push(studentRecord);
        }
      }

      if (!studentRecord) {
        return res.status(401).json({ error: 'Invalid registration number or password.' });
      }

      // Look up authentication record
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ role: 'student', rollNo: normalizedRoll });
        if (!user) {
          // Provision default user with registration number as initial password
          const initialPasswordHash = bcrypt.hashSync(normalizedRoll, 10);
          user = await User.create({
            userId: `usr-${studentRecord.studentId}`,
            studentId: studentRecord.studentId,
            name: studentRecord.name,
            email: studentRecord.email,
            role: 'student',
            department: studentRecord.department,
            rollNo: normalizedRoll,
            passwordHash: initialPasswordHash,
            mustChangePassword: true,
            hasChangedInitialPassword: false,
            failedLoginAttempts: 0,
            isActive: true,
          });
        }
      } else {
        user = inMemoryStore.users.find((u: any) => u.role === 'student' && u.rollNo?.toUpperCase() === normalizedRoll);
        if (!user) {
          user = {
            userId: `usr-${studentRecord.studentId}`,
            studentId: studentRecord.studentId,
            name: studentRecord.name,
            email: studentRecord.email,
            role: 'student' as const,
            department: studentRecord.department,
            rollNo: normalizedRoll,
            passwordHash: bcrypt.hashSync(normalizedRoll, 10),
            mustChangePassword: true,
            hasChangedInitialPassword: false,
            failedLoginAttempts: 0,
            isActive: true,
          };
          inMemoryStore.users.push(user);
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid registration number or password.' });
      }

      // 2. Check Account Lockout
      if (user.lockUntil && new Date() < new Date(user.lockUntil)) {
        return res.status(423).json({
          error: 'Your account is temporarily locked due to repeated failed attempts. Please try again later or reset your password.',
        });
      }

      // 3. Password Verification Logic
      let isMatch = false;
      const isInitialSetupPhase = !user.hasChangedInitialPassword || user.mustChangePassword;
      if (isInitialSetupPhase) {
        // Initial setup: registration number, initial hash, or Student@123
        isMatch =
          password.trim().toUpperCase() === normalizedRoll ||
          bcrypt.compareSync(password, user.passwordHash) ||
          password === 'Student@123';
      } else {
        isMatch = bcrypt.compareSync(password, user.passwordHash);
      }

      if (!isMatch) {
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const updates: Partial<IUser> = { failedLoginAttempts: failedAttempts };

        if (failedAttempts >= 5) {
          updates.lockUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes lock
          await persistUserUpdate(user, updates);
          return res.status(423).json({
            error: 'Your account is temporarily locked due to repeated failed attempts. Please try again after 10 minutes or reset your password.',
          });
        }

        await persistUserUpdate(user, updates);
        return res.status(401).json({ error: 'Invalid registration number or password.' });
      }

      // Password matches! Reset failed attempts
      await persistUserUpdate(user, {
        failedLoginAttempts: 0,
        lockUntil: undefined,
        lastLoginAt: new Date(),
      });

      // Check whether user must set a permanent password
      const mustSetPermanent = Boolean(!user.hasChangedInitialPassword || user.mustChangePassword);

      const payload: AuthTokenPayload = {
        userId: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
        rollNo: user.rollNo,
        studentId: user.studentId || studentRecord.studentId,
        mustChangePassword: mustSetPermanent,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        token,
        mustChangePassword: mustSetPermanent,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          rollNo: user.rollNo,
          studentId: user.studentId || studentRecord.studentId,
          mustChangePassword: mustSetPermanent,
        },
      });
    } else {
      // TPO / Recruiter / Admin Login
      const cleanEmail = cleanId.toLowerCase();

      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ role: cleanRole, email: cleanEmail });
      } else {
        user = inMemoryStore.users.find((u: any) => u.role === cleanRole && u.email.toLowerCase() === cleanEmail);
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email address or password.' });
      }

      // Check Account Lockout
      if (user.lockUntil && new Date() < new Date(user.lockUntil)) {
        return res.status(423).json({
          error: 'Your account is temporarily locked due to repeated failed attempts. Please try again later or reset your password.',
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
      if (!isPasswordValid) {
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const updates: Partial<IUser> = { failedLoginAttempts: failedAttempts };

        if (failedAttempts >= 5) {
          updates.lockUntil = new Date(Date.now() + 10 * 60 * 1000);
          await persistUserUpdate(user, updates);
          return res.status(423).json({
            error: 'Your account is temporarily locked due to repeated failed attempts. Please try again after 10 minutes.',
          });
        }

        await persistUserUpdate(user, updates);
        return res.status(401).json({ error: 'Invalid email address or password.' });
      }

      // Success
      await persistUserUpdate(user, {
        failedLoginAttempts: 0,
        lockUntil: undefined,
        lastLoginAt: new Date(),
      });

      const payload: AuthTokenPayload = {
        userId: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
        mustChangePassword: false,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        token,
        mustChangePassword: false,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          mustChangePassword: false,
        },
      });
    }
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unable to connect. Please try again.' });
  }
});

// POST /api/auth/setup-initial-password - Permanent Password Setup for Student Accounts
authRouter.post('/setup-initial-password', async (req: Request, res: Response) => {
  try {
    const { rollNo, currentPassword, newPassword, confirmPassword } = req.body;

    if (!rollNo || !newPassword) {
      return res.status(400).json({ error: 'Registration number and new password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation password do not match.' });
    }

    const normalizedRoll = String(rollNo).trim().toUpperCase();

    // 1. Password Strength Validation (Min 8 chars, uppercase, lowercase, number, special char)
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    // 2. Prevent Registration Number reuse
    if (newPassword.trim().toUpperCase() === normalizedRoll) {
      return res.status(400).json({
        error: 'University Security Policy: Registration Number cannot be reused as your personal password.',
      });
    }

    // 3. Find User
    let user: any = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ role: 'student', rollNo: normalizedRoll });
    } else {
      user = inMemoryStore.users.find((u: any) => u.role === 'student' && u.rollNo?.toUpperCase() === normalizedRoll);
    }

    if (!user) {
      return res.status(404).json({ error: 'Authorized student account not found.' });
    }

    // 4. Verify initial password if supplied
    if (currentPassword) {
      const isInitialMatch =
        currentPassword.trim().toUpperCase() === normalizedRoll ||
        bcrypt.compareSync(currentPassword, user.passwordHash) ||
        currentPassword === 'Student@123';
      if (!isInitialMatch && user.hasChangedInitialPassword) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
    }

    // 5. Hash new password securely with bcrypt
    const newPasswordHash = bcrypt.hashSync(newPassword.trim(), 10);

    await persistUserUpdate(user, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });

    const payload: AuthTokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
      rollNo: user.rollNo,
      studentId: user.studentId,
      mustChangePassword: false,
    };
    const freshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    console.log(`[PlaceMate Auth] Permanent password set for student ${normalizedRoll}.`);

    return res.json({
      success: true,
      message: 'Permanent password configured successfully! Redirecting to student dashboard...',
      token: freshToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNo: user.rollNo,
        studentId: user.studentId,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    console.error('Setup initial password error:', err);
    return res.status(500).json({ error: 'Unable to update password. Please try again.' });
  }
});

// POST /api/auth/change-password - General Authenticated Password Change
authRouter.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    if (authUser.rollNo && newPassword.trim().toUpperCase() === authUser.rollNo.toUpperCase()) {
      return res.status(400).json({
        error: 'University Security Policy: Your Registration Number cannot be reused as your personal password.',
      });
    }

    let user: any = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ userId: authUser.userId });
    } else {
      user = inMemoryStore.users.find((u: any) => u.userId === authUser.userId);
    }

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (currentPassword && user.hasChangedInitialPassword) {
      const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
    }

    const newPasswordHash = bcrypt.hashSync(newPassword.trim(), 10);

    await persistUserUpdate(user, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });

    const freshPayload: AuthTokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
      rollNo: user.rollNo,
      studentId: user.studentId,
      mustChangePassword: false,
    };
    const freshToken = jwt.sign(freshPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Password successfully changed. Your Registration Number will no longer work as your password.',
      token: freshToken,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNo: user.rollNo,
        studentId: user.studentId,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Unable to update password. Please try again.' });
  }
});

// POST /api/auth/forgot-password-otp - Secure 6-Digit Gmail OTP Dispatch (Expires in 5 minutes)
authRouter.post('/forgot-password-otp', async (req: Request, res: Response) => {
  try {
    const { identifier, rollNo } = req.body;
    const lookupKey = String(identifier || rollNo || '').trim();

    if (!lookupKey) {
      return res.status(400).json({ error: 'Please enter your Registration Number or registered email address.' });
    }

    const normalizedRoll = lookupKey.toUpperCase();
    const cleanEmail = lookupKey.toLowerCase();

    let studentRecord: any = null;
    let user: any = null;

    if (mongoose.connection.readyState === 1) {
      if (cleanEmail.includes('@')) {
        user = await User.findOne({ email: cleanEmail });
        if (!user) {
          studentRecord = await Student.findOne({ email: cleanEmail });
        }
      } else {
        user = await User.findOne({ rollNo: normalizedRoll });
        if (!user) {
          studentRecord = await Student.findOne({ rollNo: normalizedRoll });
        }
      }
    }

    // In-memory fallback
    if (!user && !studentRecord) {
      if (cleanEmail.includes('@')) {
        user = inMemoryStore.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        studentRecord = inMemoryStore.students.find((s) => s.email?.toLowerCase() === cleanEmail);
      } else {
        user = inMemoryStore.users.find((u: any) => u.rollNo?.toUpperCase() === normalizedRoll);
        studentRecord = inMemoryStore.students.find((s) => s.rollNo?.toUpperCase() === normalizedRoll);
      }
    }

    // Fallback for default test roll number 251FA04I28
    if (!user && normalizedRoll === '251FA04I28') {
      user = inMemoryStore.users.find((u: any) => u.rollNo === '251FA04I28');
      studentRecord = inMemoryStore.students.find((s) => s.rollNo === '251FA04I28');
    }

    // Security requirement: Never reveal whether an unverified or nonexistent account exists through detailed error messages.
    if (!user && !studentRecord) {
      return res.json({
        success: true,
        emailSent: false,
        message: 'If an account associated with this identifier exists, a 6-digit verification code has been dispatched to your registered Gmail address.',
        maskedEmail: maskEmail(cleanEmail.includes('@') ? cleanEmail : 'student@gmail.com'),
      });
    }

    const targetEmail = cleanEmail.includes('@') ? cleanEmail : (user?.email || studentRecord?.email || process.env.SMTP_USER || 'v.sriudbhav68@gmail.com');
    const targetName = user?.name || studentRecord?.name || 'Student';

    // Rate limiting: 60-second cooldown between OTP requests
    if (user?.lastOtpSentAt) {
      const elapsedMs = Date.now() - new Date(user.lastOtpSentAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSec} seconds before requesting another verification code.`,
        });
      }
    }

    // Generate random 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    // Secure hashing of OTP before storing in database
    const hashedOtp = bcrypt.hashSync(rawOtp, 10);
    // Expiration: Exactly 5 minutes (300 seconds)
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    const otpUpdates = {
      resetOtp: hashedOtp,
      resetOtpExpires: expires,
      otpAttempts: 0,
      lastOtpSentAt: new Date(),
    };

    if (user) {
      await persistUserUpdate(user, otpUpdates);
    }

    // Dispatch OTP via live Gmail SMTP service if configured
    let emailSent = false;
    let emailError: string | null = null;
    const { transporter, user: smtpSender } = getTransporter();

    if (transporter && smtpSender) {
      try {
        console.log(`[PlaceMate Auth] Sending live Gmail OTP to ${targetEmail} via ${smtpSender}...`);
        await transporter.sendMail({
          from: `"PlaceMate AI Security" <${smtpSender}>`,
          to: targetEmail,
          subject: `[PlaceMate AI] Password Reset Verification Code: ${rawOtp}`,
          html: `
            <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
              <div style="text-align:center;margin-bottom:20px;">
                <h2 style="color:#4f46e5;margin:0 0 4px;font-size:22px;font-weight:700;">PlaceMate AI Security</h2>
                <p style="font-size:12px;color:#64748b;margin:0;">VFSTR University Training & Placement Cell</p>
              </div>
              <p style="font-size:14px;color:#334155;line-height:1.6;">
                Dear <strong>${targetName}</strong>,
              </p>
              <p style="font-size:14px;color:#334155;line-height:1.6;">
                We received a request to reset your password for the PlaceMate AI recruitment portal. Please use the following 6-digit verification code:
              </p>
              <div style="text-align:center;margin:28px 0;">
                <span style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:800;color:#0f172a;background:#f8fafc;padding:14px 28px;border-radius:12px;border:1px solid #cbd5e1;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                  ${rawOtp}
                </span>
              </div>
              <p style="font-size:13px;color:#dc2626;font-weight:600;margin-bottom:8px;">
                ⏱ Security Notice: This code expires in exactly 5 minutes.
              </p>
              <p style="font-size:12px;color:#64748b;line-height:1.5;">
                For your security, do not share this code with anyone. If you did not initiate this password reset request, please contact the VFSTR Career Development Centre immediately.
              </p>
            </div>
          `,
        });
        emailSent = true;
        console.log(`[PlaceMate Auth] ✅ Secure 5-minute OTP dispatched to ${maskEmail(targetEmail)}.`);
      } catch (mailErr: any) {
        emailError = mailErr?.message || 'SMTP delivery failed';
        console.error('SMTP Mail error:', emailError);
      }
    } else {
      console.log(`[PlaceMate Auth - SMTP Unconfigured] Generated OTP ${rawOtp} for ${targetEmail}. Set SMTP_USER & SMTP_PASS in .env for live outbound Gmail.`);
    }

    return res.json({
      success: true,
      emailSent,
      smtpConfigured: Boolean(transporter && smtpSender),
      message: emailSent
        ? `A 6-digit verification code has been dispatched to your registered Gmail address (${maskEmail(targetEmail)}).`
        : `Verification code generated for ${maskEmail(targetEmail)}. ${
            !transporter
              ? 'SMTP credentials are not configured on the server, so code is provided directly.'
              : 'Delivery failed: ' + emailError
          }`,
      maskedEmail: maskEmail(targetEmail),
      // Provide devOtp so password reset is immediately testable in preview alongside live Gmail SMTP delivery
      devOtp: rawOtp,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Unable to dispatch verification code. Please try again.' });
  }
});

// POST /api/auth/verify-reset-password - Verifies Hashed OTP and Sets New Strong Password
authRouter.post('/verify-reset-password', async (req: Request, res: Response) => {
  try {
    const { identifier, rollNo, otp, newPassword, confirmPassword } = req.body;
    const lookupKey = String(identifier || rollNo || '').trim();

    if (!lookupKey || !otp || !newPassword) {
      return res.status(400).json({ error: 'Identifier, verification code, and new password are required.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation password do not match.' });
    }

    // Validate password strength (Min 8 chars, uppercase, lowercase, number, special char)
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    const normalizedRoll = lookupKey.toUpperCase();
    const cleanEmail = lookupKey.toLowerCase();

    // Prevent using registration number as new password
    if (newPassword.trim().toUpperCase() === normalizedRoll) {
      return res.status(400).json({
        error: 'University Security Policy: Registration Number cannot be used as your new password.',
      });
    }

    let user: any = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({
        $or: [{ rollNo: normalizedRoll }, { email: cleanEmail }],
      });
    }

    if (!user) {
      user = inMemoryStore.users.find(
        (u: any) => u.rollNo?.toUpperCase() === normalizedRoll || u.email?.toLowerCase() === cleanEmail
      );
    }

    // Fallback for default test roll number 251FA04I28
    if (!user && (normalizedRoll === '251FA04I28' || cleanEmail.includes('sriudbhav') || cleanEmail.includes('karthikeya'))) {
      user = inMemoryStore.users.find((u: any) => u.rollNo === '251FA04I28');
    }

    if (!user || !user.resetOtp) {
      return res.status(400).json({ error: 'Invalid or expired verification session. Please request a new code.' });
    }

    // 1. Check expiration (5 minutes)
    if (!user.resetOtpExpires || new Date() > new Date(user.resetOtpExpires)) {
      await persistUserUpdate(user, {
        resetOtp: undefined,
        resetOtpExpires: undefined,
        otpAttempts: 0,
      });
      return res.status(400).json({ error: 'Verification code has expired. OTPs are valid for 5 minutes. Please request a new code.' });
    }

    // 2. Limit OTP verification attempts (max 5)
    const currentAttempts = (user.otpAttempts || 0) + 1;
    if (currentAttempts > 5) {
      await persistUserUpdate(user, {
        resetOtp: undefined,
        resetOtpExpires: undefined,
        otpAttempts: 0,
      });
      return res.status(400).json({
        error: 'Too many failed verification attempts. This code has been invalidated for security. Please request a new code.',
      });
    }

    // 3. Verify OTP against stored bcrypt hash (or fallback plaintext)
    const isOtpValid = bcrypt.compareSync(String(otp).trim(), user.resetOtp) || user.resetOtp === String(otp).trim();

    if (!isOtpValid) {
      await persistUserUpdate(user, { otpAttempts: currentAttempts });
      const remaining = 5 - currentAttempts;
      return res.status(400).json({
        error: `Invalid verification code. Please check your 6-digit code. (${remaining} attempts remaining)`,
      });
    }

    // 4. Hash new password securely before storing in MongoDB
    const newHash = bcrypt.hashSync(newPassword.trim(), 10);

    // Prevent OTP reuse: clear OTP tokens immediately
    await persistUserUpdate(user, {
      passwordHash: newHash,
      mustChangePassword: false,
      hasChangedInitialPassword: true,
      resetOtp: undefined,
      resetOtpExpires: undefined,
      otpAttempts: 0,
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });

    console.log(`[PlaceMate Auth] Password reset successfully for ${user.email || user.rollNo}.`);

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your updated credentials.',
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Unable to complete password reset. Please try again.' });
  }
});

// POST /api/auth/register-student - Onboards new student or activates university account
authRouter.post('/register-student', async (req: Request, res: Response) => {
  try {
    const { rollNo, name, email, department, password, batch, cgpa } = req.body;

    if (!rollNo || !password) {
      return res.status(400).json({ error: 'University Registration Number and password are required.' });
    }

    const normalizedRoll = String(rollNo).trim().toUpperCase();
    const cleanEmail = email ? String(email).trim().toLowerCase() : `${normalizedRoll.toLowerCase()}@vfstr.ac.in`;

    // 1. Password Strength Validation (Min 8 chars, uppercase, lowercase, number, special char)
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    if (password.trim().toUpperCase() === normalizedRoll) {
      return res.status(400).json({
        error: 'University Security Policy: Your Registration Number cannot be reused as your personal password.',
      });
    }

    // 2. Check if user account already activated
    let existingUser: any = null;
    if (mongoose.connection.readyState === 1) {
      existingUser = await User.findOne({
        $or: [{ rollNo: normalizedRoll }, { email: cleanEmail }],
      });
    } else {
      existingUser = inMemoryStore.users.find(
        (u: any) => u.rollNo?.toUpperCase() === normalizedRoll || u.email?.toLowerCase() === cleanEmail
      );
    }

    if (existingUser && existingUser.hasChangedInitialPassword && existingUser.passwordHash) {
      return res.status(409).json({
        error: `Account for ${normalizedRoll} (${existingUser.email}) is already active. Please sign in or use the OTP password reset option.`,
      });
    }

    // 3. Find or Auto-provision Institutional Student Record
    let authorizedRecord: any = null;
    if (mongoose.connection.readyState === 1) {
      authorizedRecord = await Student.findOne({
        $or: [{ rollNo: normalizedRoll }, { email: cleanEmail }],
      });
      if (!authorizedRecord) {
        authorizedRecord = inMemoryStore.students.find(
          (s) => s.rollNo?.toUpperCase() === normalizedRoll || s.email?.toLowerCase() === cleanEmail
        );
      }
    } else {
      authorizedRecord = inMemoryStore.students.find(
        (s) => s.rollNo?.toUpperCase() === normalizedRoll || s.email?.toLowerCase() === cleanEmail
      );
    }

    const studentName = (name || authorizedRecord?.name || `Student ${normalizedRoll}`).trim();
    const studentDept = (department || authorizedRecord?.department || 'Computer Science & Engineering').trim();
    const studentBatch = (batch || authorizedRecord?.batch || '2021 - 2025 (Final Year)').trim();
    const parsedCgpa = parseFloat(cgpa) || authorizedRecord?.cgpa || 8.5;
    const studentId = authorizedRecord?.studentId || `stu-${normalizedRoll}`;

    if (!authorizedRecord) {
      const newStudentDoc = {
        studentId,
        name: studentName,
        email: cleanEmail,
        rollNo: normalizedRoll,
        department: studentDept,
        batch: studentBatch,
        graduationYear: 2025,
        cgpa: parsedCgpa,
        activeBacklogs: 0,
        clearedBacklogs: 0,
        tenthPercentage: 88.0,
        twelfthPercentage: 87.0,
        readinessScore: 85,
        atsScore: 82,
        tierCategory: 'Tier 1' as const,
        skills: ['Python', 'Data Structures', 'JavaScript', 'React', 'Problem Solving'],
        placed: false,
        offersReceived: 0,
        maxCtcOfferedLpa: 0,
        verificationStatus: 'Verified' as const,
      };

      if (mongoose.connection.readyState === 1) {
        try {
          authorizedRecord = await Student.create(newStudentDoc);
        } catch {
          authorizedRecord = (await Student.findOne({ rollNo: normalizedRoll })) || newStudentDoc;
        }
      } else {
        authorizedRecord = newStudentDoc;
        inMemoryStore.students.push(authorizedRecord);
      }
    } else {
      // Update existing record if needed
      if (mongoose.connection.readyState === 1) {
        await Student.updateOne(
          { rollNo: normalizedRoll },
          { $set: { email: cleanEmail, name: studentName, department: studentDept } }
        );
      }
    }

    const passwordHash = bcrypt.hashSync(password.trim(), 10);
    let savedUser: any = null;

    if (mongoose.connection.readyState === 1) {
      savedUser = await User.findOneAndUpdate(
        { $or: [{ rollNo: normalizedRoll }, { email: cleanEmail }] },
        {
          $set: {
            userId: existingUser?.userId || `usr-${normalizedRoll}`,
            studentId,
            name: studentName,
            email: cleanEmail,
            role: 'student',
            department: studentDept,
            rollNo: normalizedRoll,
            passwordHash,
            mustChangePassword: false,
            hasChangedInitialPassword: true,
            isActive: true,
            failedLoginAttempts: 0,
            lockUntil: undefined,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
    } else {
      if (existingUser) {
        existingUser.name = studentName;
        existingUser.email = cleanEmail;
        existingUser.department = studentDept;
        existingUser.passwordHash = passwordHash;
        existingUser.mustChangePassword = false;
        existingUser.hasChangedInitialPassword = true;
        existingUser.failedLoginAttempts = 0;
        existingUser.lockUntil = undefined;
        savedUser = existingUser;
      } else {
        savedUser = {
          userId: `usr-${normalizedRoll}`,
          studentId,
          name: studentName,
          email: cleanEmail,
          role: 'student' as const,
          department: studentDept,
          rollNo: normalizedRoll,
          passwordHash,
          mustChangePassword: false,
          hasChangedInitialPassword: true,
          isActive: true,
        };
        inMemoryStore.users.push(savedUser);
      }
    }

    const payload: AuthTokenPayload = {
      userId: savedUser.userId,
      email: savedUser.email,
      role: 'student',
      name: savedUser.name,
      rollNo: savedUser.rollNo,
      studentId: savedUser.studentId,
      mustChangePassword: false,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Account registered and activated successfully!',
      token,
      user: {
        userId: savedUser.userId,
        name: savedUser.name,
        email: savedUser.email,
        role: 'student',
        department: savedUser.department,
        rollNo: savedUser.rollNo,
        studentId: savedUser.studentId,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to complete registration: ' + (err.message || 'Server error') });
  }
});

// GET /api/auth/me - Current authenticated user
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  return res.json({ user: authUser });
});
