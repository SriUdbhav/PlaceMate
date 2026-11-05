import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailDeliveryLog extends Document {
  logId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNo?: string;
  subject: string;
  criteriaSummary: string;
  status: 'Pending' | 'Sent' | 'Failed';
  attemptCount: number;
  sentAt?: Date;
  lastAttemptAt: Date;
  errorDetails?: string;
  previewHtml?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailDeliveryLogSchema: Schema = new Schema(
  {
    logId: { type: String, required: true, unique: true, index: true },
    jobId: { type: String, required: true, index: true },
    jobTitle: { type: String, required: true },
    companyName: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true, lowercase: true, trim: true },
    rollNo: { type: String, uppercase: true, trim: true },
    subject: { type: String, required: true },
    criteriaSummary: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed'],
      default: 'Pending',
      index: true,
    },
    attemptCount: { type: Number, default: 1 },
    sentAt: { type: Date },
    lastAttemptAt: { type: Date, default: Date.now },
    errorDetails: { type: String },
    previewHtml: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee deduplication per student per job
EmailDeliveryLogSchema.index({ jobId: 1, studentId: 1 }, { unique: true });

export const EmailDeliveryLog =
  mongoose.models.EmailDeliveryLog ||
  mongoose.model<IEmailDeliveryLog>('EmailDeliveryLog', EmailDeliveryLogSchema);
