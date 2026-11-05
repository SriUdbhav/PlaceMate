export type UserRole = 'student' | 'tpo' | 'recruiter' | 'admin';

export type NavigationTab =
  | 'student-dashboard'
  | 'resume-analyzer'
  | 'cv-generator'
  | 'job-recommendations'
  | 'eligibility-checker'
  | 'skill-gap'
  | 'mock-interview'
  | 'application-tracker'
  | 'tpo-dashboard'
  | 'recruiter-dashboard'
  | 'admin-dashboard';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  department: string;
  batch: string;
  cgpa: number;
  activeBacklogs: number;
  clearedBacklogs: number;
  tenthPercentage: number;
  twelfthPercentage: number;
  readinessScore: number;
  atsScore: number;
  tierCategory: 'Tier 1' | 'Tier 2' | 'Tier 3';
  skills: string[];
  placed: boolean;
  offersReceived: number;
  maxCtcOfferedLpa?: number;
}

export interface JobDrive {
  id: string;
  companyName: string;
  logoUrl?: string;
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
  deadline: string;
  assessmentDate: string;
  matchScore: number;
  requiredSkills: string[];
  preferredSkills: string[];
  positionsCount: number;
  description: string;
  isApplied?: boolean;
  applicationStatus?: ApplicationStatus;
  status?:
    | 'Draft'
    | 'Pending Approval'
    | 'Approved'
    | 'Published'
    | 'Open'
    | 'Scheduled'
    | 'Completed'
    | 'Closed'
    | 'Rejected';
}

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Online Assessment'
  | 'Technical Interview'
  | 'HR Interview'
  | 'Offer Received'
  | 'Rejected';

export interface ApplicationRecord {
  id: string;
  jobId: string;
  companyName: string;
  role: string;
  ctcPackageLpa: number;
  appliedDate: string;
  status: ApplicationStatus;
  nextRound?: string;
  nextRoundDate?: string;
  aiReadinessScore: number;
  feedbackNotes?: string;
}

export interface SkillItem {
  name: string;
  category: 'Core CS' | 'Languages' | 'Cloud & Systems' | 'AI / Data';
  currentLevel: number; // 0 - 100
  targetLevel: number; // 0 - 100
  gapSeverity: 'low' | 'medium' | 'high';
  curatedResource: string;
}

export interface MockInterviewSession {
  id: string;
  role: string;
  company: string;
  overallScore?: number;
  date: string;
  status: 'In Progress' | 'Completed';
  questions: Array<{
    id: number;
    question: string;
    type: 'technical' | 'behavioral' | 'system_design';
    studentAnswer?: string;
    feedback?: string;
    starScore?: number; // 1-10
  }>;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  source?: 'gemini-3.8-flash' | 'demo_intelligence';
  suggestedActions?: string[];
}

export interface CVEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  cgpaOrPercentage: string;
  location?: string;
}

export interface CVProject {
  id: string;
  title: string;
  techStack: string;
  duration?: string;
  link?: string;
  bullets: string[];
}

export interface CVExperience {
  id: string;
  role: string;
  company: string;
  location?: string;
  duration: string;
  bullets: string[];
}

export interface CVCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
}

export interface CVChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  quickReplies?: string[];
  stepId?: string;
  isError?: boolean;
}

export interface CVConversationState {
  currentStep: string;
  stepIndex: number;
  totalSteps: number;
  status: 'in_progress' | 'completed';
  messages: CVChatMessage[];
  collectedAnswers: Record<string, any>;
}

export interface CVData {
  id: string;
  studentId: string;
  title: string;
  template: 'modern-ats' | 'executive-clean' | 'academic-harvard' | 'minimal-tech';
  targetRole?: string;
  targetCompany?: string;
  jobDescription?: string;
  conversationState?: CVConversationState;
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
  education: CVEducation[];
  skills: {
    languages: string[];
    frameworks: string[];
    developerTools: string[];
    databases: string[];
    coursework: string[];
  };
  projects: CVProject[];
  experience: CVExperience[];
  certifications: CVCertification[];
  achievements: string[];
  lastModified?: string;
}

export interface TPOMetrics {
  totalRegisteredStudents: number;
  totalEligibleStudents: number;
  placedStudents: number;
  placementRatePercentage: number;
  activeRecruiters: number;
  ongoingDrives: number;
  pendingRequestsCount: number;
  totalApplications: number;
  shortlistedStudents: number;
  selectedStudents: number;
  averagePackageLpa: number;
  highestPackageLpa: number;
  medianPackageLpa: number;
  departmentStats: Array<{
    department: string;
    totalStudents?: number;
    eligible: number;
    placed: number;
    percentage: number;
    avgCtcLpa: number;
  }>;
  tierDistribution: Array<{
    tier: string;
    count: number;
    percentage: number;
  }>;
  historicalReports?: Array<{
    academicYear: string;
    source: string;
    totalGraduatingEligible: number;
    placedStudents: number;
    placementRatePercentage: number;
    averageCtcLpa: number;
    highestCtcLpa: number;
    medianCtcLpa: number;
    keyRecruiters: string[];
    verifiedDate: string;
  }>;
}

export interface RecruiterMetrics {
  companyName: string;
  verificationStatus: string;
  activeDrivesCount: number;
  pendingDrivesCount: number;
  applicationsReceived: number;
  shortlistedCount: number;
  interviewSchedulesCount: number;
  selectedCandidates: number;
}

export interface RecruiterApplicant {
  id: string;
  applicationId: string;
  studentId: string;
  name: string;
  rollNo: string;
  cgpa: number;
  department: string;
  roleApplied: string;
  companyName: string;
  aiMatchScore: number;
  atsScore: number;
  status: string;
  appliedDate?: string;
  nextRound?: string;
  nextRoundDate?: string;
  skills: string[];
  flag: string;
}

export interface ImportPreviewResponse {
  importType: 'students' | 'jobs';
  totalRecords: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  previewValid: any[];
  previewDuplicates: any[];
  previewInvalid: any[];
}
