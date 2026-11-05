import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  name: string;
  email: string;
  rollNo: string;
  department: string;
  branch?: string;
  batch: string;
  graduationYear?: number;
  cgpa: number;
  activeBacklogs: number;
  clearedBacklogs: number;
  tenthPercentage: number;
  twelfthPercentage: number;
  readinessScore: number;
  atsScore: number;
  tierCategory: 'Tier 1' | 'Tier 2' | 'Tier 3';
  skills: string[];
  projects?: Array<{
    title: string;
    techStack?: string;
    description?: string;
  }>;
  internships?: Array<{
    company: string;
    role: string;
    duration?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    year?: string;
  }>;
  placed: boolean;
  offersReceived: number;
  maxCtcOfferedLpa?: number;
  verificationStatus: 'Pending' | 'Verified' | 'Flagged';
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    rollNo: { type: String, required: true, unique: true, index: true },
    department: { type: String, required: true, index: true },
    branch: { type: String },
    batch: { type: String, required: true },
    graduationYear: { type: Number, default: 2025 },
    cgpa: { type: Number, required: true, min: 0, max: 10 },
    activeBacklogs: { type: Number, default: 0, min: 0 },
    clearedBacklogs: { type: Number, default: 0, min: 0 },
    tenthPercentage: { type: Number, default: 90 },
    twelfthPercentage: { type: Number, default: 90 },
    readinessScore: { type: Number, default: 85, min: 0, max: 100 },
    atsScore: { type: Number, default: 80, min: 0, max: 100 },
    tierCategory: {
      type: String,
      enum: ['Tier 1', 'Tier 2', 'Tier 3'],
      default: 'Tier 1',
    },
    skills: { type: [String], default: [] },
    projects: { type: [Schema.Types.Mixed], default: [] },
    internships: { type: [Schema.Types.Mixed], default: [] },
    certifications: { type: [Schema.Types.Mixed], default: [] },
    placed: { type: Boolean, default: false },
    offersReceived: { type: Number, default: 0 },
    maxCtcOfferedLpa: { type: Number, default: 0 },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Flagged'],
      default: 'Verified',
    },
  },
  {
    timestamps: true,
  }
);

export const Student =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
