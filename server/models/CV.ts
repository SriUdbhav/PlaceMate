import mongoose, { Schema, Document } from 'mongoose';

export interface ICV extends Document {
  cvId: string;
  studentId: string;
  title: string;
  template: 'modern-ats' | 'executive-clean' | 'academic-harvard' | 'minimal-tech';
  personalDetails: {
    fullName: string;
    email: string;
    phone: string;
    rollNo: string;
    department: string;
    batch: string;
    location: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  summary: string;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startYear: string;
    endYear: string;
    cgpaOrPercentage: string;
    location?: string;
  }>;
  skills: {
    languages: string[];
    frameworks: string[];
    developerTools: string[];
    databases: string[];
    coursework: string[];
  };
  projects: Array<{
    id: string;
    title: string;
    techStack: string;
    duration?: string;
    link?: string;
    bullets: string[];
  }>;
  experience: Array<{
    id: string;
    role: string;
    company: string;
    location?: string;
    duration: string;
    bullets: string[];
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    credentialUrl?: string;
  }>;
  achievements: string[];
  targetRole?: string;
  targetCompany?: string;
  jobDescription?: string;
  conversationState?: {
    currentStep: string;
    stepIndex: number;
    totalSteps: number;
    status: 'in_progress' | 'completed';
    messages: Array<{
      id: string;
      sender: 'ai' | 'user';
      text: string;
      timestamp: string;
      quickReplies?: string[];
      stepId?: string;
    }>;
    collectedAnswers: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CVSchema: Schema = new Schema(
  {
    cvId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    title: { type: String, default: 'Placement Ready CV' },
    template: {
      type: String,
      enum: ['modern-ats', 'executive-clean', 'academic-harvard', 'minimal-tech'],
      default: 'modern-ats',
    },
    personalDetails: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: '+91 98765 43210' },
      rollNo: { type: String, default: '' },
      department: { type: String, default: 'Computer Science & Engineering' },
      batch: { type: String, default: '2021 - 2025' },
      location: { type: String, default: 'Vadlamudi, Guntur, AP' },
      linkedinUrl: { type: String, default: '' },
      githubUrl: { type: String, default: '' },
      portfolioUrl: { type: String, default: '' },
    },
    summary: { type: String, default: '' },
    education: { type: [Schema.Types.Mixed], default: [] },
    skills: {
      languages: { type: [String], default: [] },
      frameworks: { type: [String], default: [] },
      developerTools: { type: [String], default: [] },
      databases: { type: [String], default: [] },
      coursework: { type: [String], default: [] },
    },
    projects: { type: [Schema.Types.Mixed], default: [] },
    experience: { type: [Schema.Types.Mixed], default: [] },
    certifications: { type: [Schema.Types.Mixed], default: [] },
    achievements: { type: [String], default: [] },
    targetRole: { type: String, default: '' },
    targetCompany: { type: String, default: '' },
    jobDescription: { type: String, default: '' },
    conversationState: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  }
);

export const CV = mongoose.models.CV || mongoose.model<ICV>('CV', CVSchema);
