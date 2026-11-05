import mongoose, { Schema, Document } from 'mongoose';

export interface IResume extends Document {
  resumeId: string;
  studentId: string;
  targetRole: string;
  resumeText: string;
  atsScore: number;
  categoryScores: {
    actionVerbs: number;
    metricsDensity: number;
    technicalMatch: number;
    parserFormat: number;
  };
  strengths: string[];
  missingKeywords: string[];
  recommendations: string[];
  lastAuditedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema: Schema = new Schema(
  {
    resumeId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    targetRole: { type: String, required: true },
    resumeText: { type: String, required: true },
    atsScore: { type: Number, default: 80, min: 0, max: 100 },
    categoryScores: {
      actionVerbs: { type: Number, default: 85 },
      metricsDensity: { type: Number, default: 80 },
      technicalMatch: { type: Number, default: 80 },
      parserFormat: { type: Number, default: 100 },
    },
    strengths: { type: [String], default: [] },
    missingKeywords: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    lastAuditedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const Resume =
  mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);
