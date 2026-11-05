import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  notificationId: string;
  recipientRole: 'student' | 'tpo' | 'recruiter' | 'admin' | 'all';
  recipientId?: string;
  title: string;
  message: string;
  category: 'drive_alert' | 'shortlist' | 'tpo_notice' | 'ai_insight';
  isRead: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    recipientRole: {
      type: String,
      enum: ['student', 'tpo', 'recruiter', 'admin', 'all'],
      default: 'all',
      index: true,
    },
    recipientId: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ['drive_alert', 'shortlist', 'tpo_notice', 'ai_insight'],
      default: 'drive_alert',
    },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Notification =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
