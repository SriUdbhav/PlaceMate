import mongoose, { Schema, Document } from 'mongoose';

export interface IInterview extends Document {
  interviewId: string;
  studentId: string;
  jobId?: string;
  companyName: string;
  role: string;
  roundType: 'Technical' | 'Behavioral' | 'System Design' | 'HR' | 'Mock Practice' | 'Coding' | 'Project-Based' | 'Communication Skills' | 'Full Mock';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  preferredLanguage?: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string;
  interviewerName?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  score?: number; // 0 to 10 or 0 to 100
  scoreOutOf100?: number;
  technicalScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  correctnessScore?: number;
  confidenceScore?: number;
  confidenceIndicators?: string;
  verdict?: string;
  strengths?: string[];
  weaknesses?: string[];
  missedConcepts?: string[];
  prepRoadmap?: string[];
  transcript?: Array<{
    speaker: 'interviewer' | 'candidate';
    text: string;
    timestamp: string;
  }>;
  isLiveAvatarSession?: boolean;
  questions: Array<{
    id?: number;
    question?: string;
    questionText?: string;
    answer?: string;
    candidateAnswer?: string;
    correctAnswer?: string;
    feedback?: string;
    score?: number;
    isCorrect?: boolean;
  }>;
  summaryFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema: Schema = new Schema(
  {
    interviewId: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    jobId: { type: String },
    companyName: { type: String, required: true },
    role: { type: String, required: true },
    roundType: {
      type: String,
      default: 'Technical',
    },
    difficulty: { type: String, default: 'Beginner' },
    preferredLanguage: { type: String, default: 'Java' },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45 },
    meetingLink: { type: String },
    interviewerName: { type: String, default: 'Placement Technical Panel' },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    score: { type: Number },
    scoreOutOf100: { type: Number },
    technicalScore: { type: Number },
    communicationScore: { type: Number },
    problemSolvingScore: { type: Number },
    correctnessScore: { type: Number },
    confidenceScore: { type: Number },
    confidenceIndicators: { type: String },
    verdict: { type: String },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    missedConcepts: [{ type: String }],
    prepRoadmap: [{ type: String }],
    transcript: [
      {
        speaker: { type: String, enum: ['interviewer', 'candidate'] },
        text: { type: String },
        timestamp: { type: String },
      },
    ],
    isLiveAvatarSession: { type: Boolean, default: false },
    questions: [
      {
        id: { type: Number },
        question: { type: String },
        questionText: { type: String },
        answer: { type: String },
        candidateAnswer: { type: String },
        correctAnswer: { type: String },
        feedback: { type: String },
        score: { type: Number },
        isCorrect: { type: Boolean },
      },
    ],
    summaryFeedback: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Interview =
  mongoose.models.Interview || mongoose.model<IInterview>('Interview', InterviewSchema);
