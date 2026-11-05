import mongoose, { Schema, Document } from 'mongoose';

export interface IJobDrive extends Document {
  jobId: string;
  companyId?: string;
  companyName: string;
  role: string;
  ctcPackageLpa: number;
  stipendPerMonth?: number;
  tier: 'Dream (18+ LPA)' | 'Super Dream (12-18 LPA)' | 'Standard (6-12 LPA)' | 'Mass (3-6 LPA)';
  location: string;
  workMode: 'On-site' | 'Hybrid' | 'Remote';
  category: 'Core Tech' | 'FinTech' | 'Cloud/DevOps' | 'Data Science' | 'Consulting';
  minCgpa: number;
  maxBacklogs: number;
  eligibleDepartments: string[];
  graduationYear?: number;
  deadline: Date;
  assessmentDate: Date;
  matchScore: number;
  requiredSkills: string[];
  preferredSkills: string[];
  positionsCount: number;
  description: string;
  recruiterId?: string;
  recruiterEmail?: string;
  approvalRemarks?: string;
  status:
    | 'Draft'
    | 'Pending Approval'
    | 'Approved'
    | 'Published'
    | 'Open'
    | 'Scheduled'
    | 'Completed'
    | 'Closed'
    | 'Rejected';
  createdAt: Date;
  updatedAt: Date;
}

const JobDriveSchema: Schema = new Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    companyId: { type: String },
    companyName: { type: String, required: true, index: true },
    role: { type: String, required: true },
    ctcPackageLpa: { type: Number, required: true },
    stipendPerMonth: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ['Dream (18+ LPA)', 'Super Dream (12-18 LPA)', 'Standard (6-12 LPA)', 'Mass (3-6 LPA)'],
      default: 'Dream (18+ LPA)',
    },
    location: { type: String, required: true },
    workMode: {
      type: String,
      enum: ['On-site', 'Hybrid', 'Remote'],
      default: 'Hybrid',
    },
    category: {
      type: String,
      enum: ['Core Tech', 'FinTech', 'Cloud/DevOps', 'Data Science', 'Consulting'],
      default: 'Core Tech',
    },
    minCgpa: { type: Number, required: true, min: 0, max: 10 },
    maxBacklogs: { type: Number, default: 0 },
    eligibleDepartments: { type: [String], default: [] },
    graduationYear: { type: Number, default: 2025 },
    deadline: { type: Date, required: true },
    assessmentDate: { type: Date, required: true },
    matchScore: { type: Number, default: 85 },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    positionsCount: { type: Number, default: 10 },
    description: { type: String, required: true },
    recruiterId: { type: String },
    recruiterEmail: { type: String },
    approvalRemarks: { type: String },
    status: {
      type: String,
      enum: [
        'Draft',
        'Pending Approval',
        'Approved',
        'Published',
        'Open',
        'Scheduled',
        'Completed',
        'Closed',
        'Rejected',
      ],
      default: 'Published',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate placement drives for the same company, role, and graduation year
JobDriveSchema.index({ companyName: 1, role: 1, graduationYear: 1 }, { unique: true, sparse: true });

export const JobDrive =
  mongoose.models.JobDrive || mongoose.model<IJobDrive>('JobDrive', JobDriveSchema);
