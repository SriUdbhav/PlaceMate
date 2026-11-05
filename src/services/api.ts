import {
  JobDrive,
  ApplicationRecord,
  StudentProfile,
  ApplicationStatus,
  CVData,
  TPOMetrics,
  RecruiterMetrics,
  RecruiterApplicant,
  ImportPreviewResponse,
} from '../types';

export interface DatabaseStatusResponse {
  isConnected: boolean;
  connectionState: string;
  source: 'mongodb_atlas' | 'local_memory_fallback';
  databaseName: string;
  ipWhitelistHint?: string;
  hasEnvUri?: boolean;
  sanitizedHost?: string;
  lastErrorMessage?: string;
  counts: {
    students: number;
    companies: number;
    jobs: number;
    applications: number;
    resumes: number;
    cvs?: number;
    interviews: number;
    notifications: number;
    users: number;
  };
}

// Production API Base URL (configured via VITE_API_URL on Vercel)
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

// Internal wrapper to route all apiClient requests to the configured production backend
const clientFetch = (url: string, init?: RequestInit): Promise<Response> => {
  return fetch(getApiUrl(url), init);
};

export const apiClient = {
  // Database status
  async getDatabaseStatus(): Promise<DatabaseStatusResponse | null> {
    try {
      const res = await clientFetch('/api/db/status');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to fetch db status', e);
      return null;
    }
  },

  async reconnectDatabase(): Promise<DatabaseStatusResponse | null> {
    try {
      const res = await clientFetch('/api/db/reconnect', { method: 'POST' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to reconnect db', e);
      return null;
    }
  },

  // Students
  async getStudent(id: string = 'stu-2025-089'): Promise<StudentProfile | null> {
    try {
      const res = await clientFetch(`/api/students/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.studentId || data._id,
        name: data.name,
        email: data.email,
        rollNo: data.rollNo,
        department: data.department,
        batch: data.batch,
        cgpa: data.cgpa,
        activeBacklogs: data.activeBacklogs,
        clearedBacklogs: data.clearedBacklogs,
        tenthPercentage: data.tenthPercentage,
        twelfthPercentage: data.twelfthPercentage,
        readinessScore: data.readinessScore,
        atsScore: data.atsScore,
        tierCategory: data.tierCategory,
        skills: data.skills || [],
        placed: data.placed,
        offersReceived: data.offersReceived,
        maxCtcOfferedLpa: data.maxCtcOfferedLpa,
      };
    } catch (e) {
      console.warn('apiClient: failed to fetch student', e);
      return null;
    }
  },

  async updateStudent(id: string, updates: Partial<StudentProfile>): Promise<boolean> {
    try {
      const res = await clientFetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.ok;
    } catch (e) {
      console.warn('apiClient: failed to update student', e);
      return false;
    }
  },

  // Jobs / Placement Drives
  async getJobs(params?: { tier?: string; category?: string; search?: string }): Promise<JobDrive[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.tier) searchParams.append('tier', params.tier);
      if (params?.category) searchParams.append('category', params.category);
      if (params?.search) searchParams.append('search', params.search);

      const url = `/api/jobs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const res = await clientFetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      return data.map((d: any) => ({
        id: d.jobId || d._id,
        companyName: d.companyName,
        role: d.role,
        ctcPackageLpa: d.ctcPackageLpa,
        stipendPerMonth: d.stipendPerMonth,
        tier: d.tier,
        location: d.location,
        workMode: d.workMode,
        category: d.category,
        minCgpa: d.minCgpa,
        maxBacklogs: d.maxBacklogs,
        eligibleDepartments: d.eligibleDepartments || [],
        deadline: typeof d.deadline === 'string' ? d.deadline : new Date(d.deadline).toISOString(),
        assessmentDate: typeof d.assessmentDate === 'string' ? d.assessmentDate : new Date(d.assessmentDate).toISOString(),
        matchScore: d.matchScore,
        requiredSkills: d.requiredSkills || [],
        preferredSkills: d.preferredSkills || [],
        positionsCount: d.positionsCount,
        description: d.description,
        status: d.status,
      }));
    } catch (e) {
      console.warn('apiClient: failed to fetch jobs', e);
      return [];
    }
  },

  async createJob(jobData: Partial<JobDrive>): Promise<JobDrive | null> {
    try {
      const res = await clientFetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to create job', e);
      return null;
    }
  },

  async verifyEligibility(jobId: string, criteria: { cgpa: number; activeBacklogs: number; department: string }) {
    try {
      const res = await clientFetch(`/api/jobs/${jobId}/verify-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to verify eligibility', e);
      return null;
    }
  },

  // Applications
  async getApplications(studentId?: string): Promise<ApplicationRecord[]> {
    try {
      const url = studentId ? `/api/applications?studentId=${studentId}` : '/api/applications';
      const res = await clientFetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      return data.map((a: any) => ({
        id: a.applicationId || a._id,
        jobId: a.jobId,
        companyName: a.companyName,
        role: a.role,
        ctcPackageLpa: a.ctcPackageLpa,
        appliedDate: typeof a.appliedDate === 'string' ? a.appliedDate.split('T')[0] : new Date(a.appliedDate).toISOString().split('T')[0],
        status: a.status,
        nextRound: a.nextRound,
        nextRoundDate: a.nextRoundDate,
        aiReadinessScore: a.aiReadinessScore,
        feedbackNotes: a.feedbackNotes,
      }));
    } catch (e) {
      console.warn('apiClient: failed to fetch applications', e);
      return [];
    }
  },

  async submitApplication(applicationData: {
    studentId: string;
    studentName: string;
    jobId: string;
    companyName: string;
    role: string;
    ctcPackageLpa: number;
    aiReadinessScore: number;
  }): Promise<ApplicationRecord | null> {
    try {
      const res = await clientFetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });
      if (!res.ok) return null;
      const a = await res.json();
      return {
        id: a.applicationId || a._id,
        jobId: a.jobId,
        companyName: a.companyName,
        role: a.role,
        ctcPackageLpa: a.ctcPackageLpa,
        appliedDate: typeof a.appliedDate === 'string' ? a.appliedDate.split('T')[0] : new Date(a.appliedDate).toISOString().split('T')[0],
        status: a.status,
        nextRound: a.nextRound,
        nextRoundDate: a.nextRoundDate,
        aiReadinessScore: a.aiReadinessScore,
        feedbackNotes: a.feedbackNotes,
      };
    } catch (e) {
      console.warn('apiClient: failed to submit application', e);
      return null;
    }
  },

  async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<boolean> {
    try {
      const res = await clientFetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch (e) {
      console.warn('apiClient: failed to update status', e);
      return false;
    }
  },

  // Notifications
  async getNotifications(role: string = 'student') {
    try {
      const res = await clientFetch(`/api/notifications?role=${role}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async markNotificationRead(id: string) {
    try {
      await clientFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch (e) {
      // ignore
    }
  },

  // CV Generator
  async getCVs(studentId?: string): Promise<CVData[]> {
    try {
      const url = studentId ? `/api/cvs?studentId=${encodeURIComponent(studentId)}` : '/api/cvs';
      const res = await clientFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        ...d,
        id: d.cvId || d._id || d.id,
      }));
    } catch (e) {
      console.warn('apiClient: failed to fetch CVs', e);
      return [];
    }
  },

  async getCV(id: string): Promise<CVData | null> {
    try {
      const res = await clientFetch(`/api/cvs/${id}`);
      if (!res.ok) return null;
      const d = await res.json();
      return {
        ...d,
        id: d.cvId || d._id || d.id,
      };
    } catch (e) {
      console.warn('apiClient: failed to fetch CV', e);
      return null;
    }
  },

  async createCV(cvData: Partial<CVData>): Promise<CVData | null> {
    try {
      const res = await clientFetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cvData),
      });
      if (!res.ok) return null;
      const d = await res.json();
      return {
        ...d,
        id: d.cvId || d._id || d.id,
      };
    } catch (e) {
      console.warn('apiClient: failed to create CV', e);
      return null;
    }
  },

  async updateCV(id: string, updates: Partial<CVData>): Promise<CVData | null> {
    try {
      const res = await clientFetch(`/api/cvs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return null;
      const d = await res.json();
      return {
        ...d,
        id: d.cvId || d._id || d.id,
      };
    } catch (e) {
      console.warn('apiClient: failed to update CV', e);
      return null;
    }
  },

  async deleteCV(id: string): Promise<boolean> {
    try {
      const res = await clientFetch(`/api/cvs/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.warn('apiClient: failed to delete CV', e);
      return false;
    }
  },

  async enhanceCVSection(params: {
    sectionType: 'objective' | 'summary' | 'project' | 'experience';
    draftText: string;
    targetRole?: string;
    studentContext?: any;
  }): Promise<string> {
    try {
      const res = await clientFetch('/api/cvs/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Enhancement request failed');
      const data = await res.json();
      return data.enhancedText || '';
    } catch (e) {
      console.warn('apiClient: AI enhance error', e);
      return '';
    }
  },

  async sendCVChatStep(payload: {
    message: string;
    stepId: string;
    conversationHistory?: any[];
    currentCv?: Partial<CVData>;
    studentProfile?: any;
    targetRole?: string;
    targetCompany?: string;
    jobDescription?: string;
  }): Promise<{
    success?: boolean;
    aiResponse: string;
    nextStepId: string;
    progressPercent: number;
    quickReplies: string[];
    cvPatch: Partial<CVData>;
    modelUsed?: string;
    isGeneralQuery?: boolean;
  }> {
    const res = await clientFetch('/api/cvs/chat-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error || errJson.details || `Server responded with status ${res.status}`;
      throw new Error(msg);
    }
    return await res.json();
  },

  async generateFullResumeWithAI(payload: {
    cvData: Partial<CVData>;
    targetRole?: string;
    studentProfile?: any;
  }): Promise<Partial<CVData> | null> {
    try {
      const res = await clientFetch('/api/cvs/generate-full-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.optimizedCv || null;
    } catch (e) {
      console.warn('apiClient: generateFullResumeWithAI failed', e);
      return null;
    }
  },

  async regenerateCVSection(payload: {
    section: 'summary' | 'projects' | 'experience' | 'skills';
    cvData: Partial<CVData>;
    targetRole?: string;
    studentProfile?: any;
  }): Promise<any | null> {
    try {
      const res = await clientFetch('/api/cvs/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.updatedSection || null;
    } catch (e) {
      console.warn('apiClient: regenerateCVSection failed', e);
      return null;
    }
  },

  async streamResumeGeneration(
    payload: {
      studentProfile?: any;
      targetRole?: string;
      targetCompany?: string;
      jobDescription?: string;
      cvData?: Partial<CVData>;
    },
    onChunk: (chunkText: string) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const response = await clientFetch('/api/cvs/stream-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.replace(/^data:\s*/, ''));
              if (data.text) {
                onChunk(data.text);
              }
              if (data.done) {
                onComplete();
                return;
              }
            } catch (err) {
              // Ignore malformed SSE chunk
            }
          }
        }
      }

      onComplete();
    } catch (err) {
      onError(err);
    }
  },

  // ==========================================
  // TPO Cell Management & Analytics APIs
  // ==========================================
  async getTpoMetrics(): Promise<TPOMetrics | null> {
    try {
      const res = await clientFetch('/api/tpo/metrics');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to fetch TPO metrics', e);
      return null;
    }
  },

  async getTpoDrives(status?: string, search?: string): Promise<JobDrive[]> {
    try {
      const sp = new URLSearchParams();
      if (status && status !== 'All') sp.append('status', status);
      if (search) sp.append('search', search);
      const res = await clientFetch(`/api/tpo/drives?${sp.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.jobId || d._id,
        companyName: d.companyName,
        role: d.role,
        ctcPackageLpa: d.ctcPackageLpa,
        stipendPerMonth: d.stipendPerMonth,
        tier: d.tier,
        location: d.location,
        workMode: d.workMode,
        category: d.category,
        minCgpa: d.minCgpa,
        maxBacklogs: d.maxBacklogs,
        eligibleDepartments: d.eligibleDepartments || [],
        deadline: typeof d.deadline === 'string' ? d.deadline : new Date(d.deadline).toISOString(),
        assessmentDate: typeof d.assessmentDate === 'string' ? d.assessmentDate : new Date(d.assessmentDate).toISOString(),
        matchScore: d.matchScore,
        requiredSkills: d.requiredSkills || [],
        preferredSkills: d.preferredSkills || [],
        positionsCount: d.positionsCount,
        description: d.description,
        status: d.status,
      }));
    } catch (e) {
      console.warn('apiClient: failed to fetch TPO drives', e);
      return [];
    }
  },

  async updateDriveStatus(id: string, status: string, approvalRemarks?: string): Promise<{ success: boolean; message?: string; drive?: any }> {
    try {
      const res = await clientFetch(`/api/tpo/drives/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approvalRemarks }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async createTpoDrive(drive: Partial<JobDrive>): Promise<JobDrive | null> {
    try {
      const res = await clientFetch('/api/tpo/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drive),
      });
      if (!res.ok) return null;
      const d = await res.json();
      return {
        ...d,
        id: d.jobId || d._id,
      };
    } catch (e) {
      console.warn('apiClient: failed to create TPO drive', e);
      return null;
    }
  },

  async runEligibilityAudit(jobId: string): Promise<any> {
    try {
      const res = await clientFetch(`/api/tpo/eligibility-audit/${jobId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to run eligibility audit', e);
      return null;
    }
  },

  async getClearanceQueue(): Promise<any[]> {
    try {
      const res = await clientFetch('/api/tpo/clearance-queue');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async clearCandidateApplication(id: string): Promise<boolean> {
    try {
      const res = await clientFetch(`/api/tpo/clear-application/${id}`, { method: 'PATCH' });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async getCompanies(): Promise<any[]> {
    try {
      const res = await clientFetch('/api/tpo/companies');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async verifyCompany(id: string, verificationStatus: 'Verified' | 'Pending' | 'Rejected'): Promise<boolean> {
    try {
      const res = await clientFetch(`/api/tpo/companies/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // ==========================================
  // Recruiter Portal APIs
  // ==========================================
  async getRecruiterProfile(companyName?: string): Promise<any> {
    try {
      const url = companyName ? `/api/recruiter/profile?companyName=${encodeURIComponent(companyName)}` : '/api/recruiter/profile';
      const res = await clientFetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getRecruiterMetrics(companyName?: string): Promise<RecruiterMetrics | null> {
    try {
      const url = companyName ? `/api/recruiter/metrics?companyName=${encodeURIComponent(companyName)}` : '/api/recruiter/metrics';
      const res = await clientFetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getRecruiterApplicants(filters?: { companyName?: string; jobId?: string; status?: string; department?: string; minCgpa?: number; search?: string }): Promise<RecruiterApplicant[]> {
    try {
      const sp = new URLSearchParams();
      if (filters?.companyName) sp.append('companyName', filters.companyName);
      if (filters?.jobId) sp.append('jobId', filters.jobId);
      if (filters?.status) sp.append('status', filters.status);
      if (filters?.department) sp.append('department', filters.department);
      if (filters?.minCgpa) sp.append('minCgpa', String(filters.minCgpa));
      if (filters?.search) sp.append('search', filters.search);

      const res = await clientFetch(`/api/recruiter/applicants?${sp.toString()}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.warn('apiClient: failed to fetch recruiter applicants', e);
      return [];
    }
  },

  async requestPlacementDrive(driveData: any): Promise<{ success: boolean; message: string; drive: any }> {
    const res = await clientFetch('/api/recruiter/request-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driveData),
    });
    return await res.json();
  },

  async updateApplicantPipelineStage(appId: string, status: string, nextRound?: string, nextRoundDate?: string, notes?: string): Promise<boolean> {
    try {
      const res = await clientFetch(`/api/recruiter/applicants/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, nextRound, nextRoundDate, feedbackNotes: notes }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async scheduleRecruiterInterview(details: { studentId: string; jobId: string; companyName: string; role: string; roundType?: string; scheduledAt?: string; durationMinutes?: number }): Promise<boolean> {
    try {
      const res = await clientFetch('/api/recruiter/schedule-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // ==========================================
  // Authorized VFSTR Data Import APIs
  // ==========================================
  async previewImport(csvData: string, importType: 'students' | 'jobs'): Promise<ImportPreviewResponse | null> {
    try {
      const res = await clientFetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, importType }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('apiClient: previewImport failed', e);
      return null;
    }
  },

  async commitImport(validRecords: any[], importType: 'students' | 'jobs', fileName: string = 'upload.csv', importedBy: string = 'TPO Cell'): Promise<any> {
    const res = await clientFetch('/api/import/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validRecords, importType, fileName, importedBy }),
    });
    return await res.json();
  },

  async getImportHistory(): Promise<any[]> {
    try {
      const res = await clientFetch('/api/import/history');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async getImportTemplate(type: 'students' | 'jobs'): Promise<string> {
    const res = await clientFetch(`/api/import/template/${type}`);
    return await res.text();
  },

  // ==========================================
  // TPO Email Management APIs
  // ==========================================
  async previewEmailRecipients(params: { category: string; jobId?: string; branches?: string[]; targetRollNo?: string }): Promise<any> {
    try {
      const res = await clientFetch('/api/email/preview-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async draftEmailWithAi(params: { category: string; companyName?: string; role?: string; ctcPackageLpa?: number; deadline?: string; location?: string; customNotes?: string }): Promise<{ subject: string; htmlContent: string; source: string }> {
    const res = await clientFetch('/api/email/draft-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  async sendEmailCampaign(payload: { category: string; jobId?: string; subject: string; htmlContent: string; customRecipients?: any[] }): Promise<any> {
    const res = await clientFetch('/api/email/send-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getEmailDeliveryLogs(status?: string, search?: string): Promise<any[]> {
    try {
      const sp = new URLSearchParams();
      if (status && status !== 'All') sp.append('status', status);
      if (search) sp.append('search', search);
      const res = await clientFetch(`/api/email/logs?${sp.toString()}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  // ==========================================
  // Real-time Event Subscription (SSE)
  // ==========================================
  subscribeToRealtimeEvents(onEvent: (event: any) => void): () => void {
    try {
      const eventSource = new EventSource(getApiUrl('/api/events/stream'));
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch (err) {
          // ignore
        }
      };

      const eventNames = [
        'drive_created',
        'drive_status_changed',
        'application_created',
        'application_status_changed',
        'interview_scheduled',
        'email_campaign_sent',
        'student_imported',
        'company_verified',
      ];

      eventNames.forEach((ev) => {
        eventSource.addEventListener(ev, (e: any) => {
          try {
            const parsed = JSON.parse(e.data);
            onEvent(parsed);
          } catch (err) {
            // ignore
          }
        });
      });

      return () => {
        eventSource.close();
      };
    } catch (err) {
      console.warn('Realtime SSE not available in environment:', err);
      return () => {};
    }
  },

  // ==========================================
  // HeyGen LiveAvatar & Live Interview APIs
  // ==========================================
  async getAvatarStatus(): Promise<{
    hasHeyGenKey: boolean;
    hasVoiceKey: boolean;
    hasGeminiKey: boolean;
    avatarId: string;
    voiceId: string;
    voiceGender?: string;
    voiceName?: string;
  }> {
    try {
      const res = await clientFetch('/api/avatar/status');
      if (!res.ok) throw new Error('Status failed');
      return await res.json();
    } catch {
      return {
        hasHeyGenKey: true,
        hasVoiceKey: true,
        hasGeminiKey: true,
        avatarId: 'default-female-avatar',
        voiceId: 'default-female-voice',
        voiceGender: 'female',
        voiceName: 'Sarah (Professional Placement Lead)',
      };
    }
  },

  async getAvatarToken(apiKey?: string, avatarId?: string, voiceId?: string): Promise<{ success: boolean; token?: string; sessionId?: string; avatarId?: string; voiceId?: string; voiceGender?: string; error?: string }> {
    try {
      const res = await clientFetch('/api/avatar/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, avatarId, voiceId }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to connect to avatar token gateway' };
    }
  },

  async generateAvatarQuestions(payload: {
    category: string;
    difficulty: string;
    preferredLanguage: string;
    role: string;
    company: string;
    questionCount: number;
    studentProfile?: any;
  }): Promise<{ success: boolean; questions: Array<{ id: number; questionText: string; expectedConcepts?: string; topic?: string; category?: string }>; source: string }> {
    const res = await clientFetch('/api/avatar/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Question generation failed');
    return await res.json();
  },

  async chatAvatar(payload: {
    candidateResponse: string;
    currentQuestion: string;
    expectedConcepts?: string;
    questionIndex: number;
    totalQuestions: number;
    company: string;
    role: string;
    category?: string;
    difficulty?: string;
    preferredLanguage?: string;
    roundType?: string;
    conversationHistory?: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  }): Promise<{
    spokenResponse: string;
    nextQuestion: string;
    feedbackOnAnswer: string;
    scoreOnAnswer: number;
    isCorrect?: boolean;
    isCompleted: boolean;
    source: string;
  }> {
    const res = await clientFetch('/api/avatar/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Chat failed');
    return await res.json();
  },

  async evaluateLiveInterview(payload: {
    interviewId?: string;
    studentId: string;
    companyName: string;
    role: string;
    roundType: string;
    difficulty?: string;
    preferredLanguage?: string;
    durationMinutes: number;
    transcript: Array<{ speaker: 'interviewer' | 'candidate'; text: string; timestamp: string }>;
    questions: Array<{ id?: number; question?: string; questionText?: string; answer?: string; candidateAnswer?: string; feedback?: string; score?: number }>;
  }): Promise<{ success: boolean; report: any; evaluation: any }> {
    const res = await clientFetch('/api/interviews/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Evaluation failed');
    return await res.json();
  },
};
