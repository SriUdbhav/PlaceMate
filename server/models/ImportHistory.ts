import mongoose, { Schema, Document } from 'mongoose';

export interface IImportHistory extends Document {
  importId: string;
  importType: 'students' | 'jobs' | 'companies';
  fileName: string;
  totalRecords: number;
  successCount: number;
  duplicateCount: number;
  invalidCount: number;
  importedBy: string;
  details?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImportHistorySchema: Schema = new Schema(
  {
    importId: { type: String, required: true, unique: true, index: true },
    importType: {
      type: String,
      enum: ['students', 'jobs', 'companies'],
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    totalRecords: { type: Number, required: true },
    successCount: { type: Number, required: true },
    duplicateCount: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    importedBy: { type: String, required: true },
    details: { type: String },
  },
  {
    timestamps: true,
  }
);

export const ImportHistory =
  mongoose.models.ImportHistory ||
  mongoose.model<IImportHistory>('ImportHistory', ImportHistorySchema);
