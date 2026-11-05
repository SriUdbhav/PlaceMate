import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'tpo' | 'recruiter' | 'admin';
  department?: string;
  rollNo?: string; // Normalized University Registration Number (e.g. "251FA04I28", "21CS048")
  studentId?: string; // Reference to Student document
  companyName?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  hasChangedInitialPassword: boolean;
  resetOtp?: string;
  resetOtpExpires?: Date;
  otpAttempts?: number;
  lastOtpSentAt?: Date;
  failedLoginAttempts?: number;
  lockUntil?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'tpo', 'recruiter', 'admin'],
      default: 'student',
      index: true,
    },
    department: { type: String, trim: true },
    rollNo: { type: String, uppercase: true, trim: true, sparse: true, index: true },
    studentId: { type: String, sparse: true, index: true },
    companyName: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    hasChangedInitialPassword: { type: Boolean, default: false },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
