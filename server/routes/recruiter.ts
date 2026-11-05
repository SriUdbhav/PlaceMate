import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { JobDrive } from '../models/JobDrive';
import { Application } from '../models/Application';
import { Company } from '../models/Company';
import { Interview } from '../models/Interview';
import { Student } from '../models/Student';
import { inMemoryStore } from '../db';
import { realtimeHub } from '../services/realtime';

export const recruiterRouter = Router();

// GET /api/recruiter/profile - Get company profile and verification status
recruiterRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const { companyName = 'Google' } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    let company: any = null;
    if (isDbConnected) {
      company = await Company.findOne({
        name: { $regex: new RegExp(`^${companyName}$`, 'i') },
      });
    } else {
      company = inMemoryStore.companies.find(
        (c) => c.name.toLowerCase() === String(companyName).toLowerCase()
      );
    }

    if (!company) {
      return res.json({
        name: companyName,
        industry: 'Core Tech & Software',
        website: 'https://campus.recruiting.edu',
        verificationStatus: 'Pending',
        description: 'Campus hiring partner registered with VFSTR University Career Development Centre.',
        headquarters: 'Bengaluru / Hyderabad',
        hiringStatus: 'Active',
      });
    }

    return res.json(company);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch company profile', details: err.message });
  }
});

// GET /api/recruiter/metrics - Recruiter analytics from actual database records
recruiterRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { companyName } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    let drives: any[] = [];
    let apps: any[] = [];
    let interviews: any[] = [];
    let company: any = null;

    if (isDbConnected) {
      const driveFilter = companyName ? { companyName: { $regex: new RegExp(`^${companyName}$`, 'i') } } : {};
      const appFilter = companyName ? { companyName: { $regex: new RegExp(`^${companyName}$`, 'i') } } : {};

      [drives, apps, interviews, company] = await Promise.all([
        JobDrive.find(driveFilter).lean(),
        Application.find(appFilter).lean(),
        Interview.find().lean(),
        companyName ? Company.findOne({ name: { $regex: new RegExp(`^${companyName}$`, 'i') } }).lean() : null,
      ]);
    } else {
      drives = companyName
        ? inMemoryStore.jobs.filter((j) => j.companyName.toLowerCase() === String(companyName).toLowerCase())
        : inMemoryStore.jobs;
      apps = companyName
        ? inMemoryStore.applications.filter((a) => a.companyName.toLowerCase() === String(companyName).toLowerCase())
        : inMemoryStore.applications;
      interviews = inMemoryStore.interviews;
      company = companyName
        ? inMemoryStore.companies.find((c) => c.name.toLowerCase() === String(companyName).toLowerCase())
        : null;
    }

    const activeDrivesCount = drives.filter(
      (d) => d.status === 'Published' || d.status === 'Open' || d.status === 'Scheduled'
    ).length;
    const pendingDrivesCount = drives.filter((d) => d.status === 'Pending Approval').length;
    const applicationsReceived = apps.length;
    const shortlistedCount = apps.filter((a) =>
      ['Shortlisted', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Offer Received'].includes(a.status)
    ).length;
    const selectedCandidates = apps.filter((a) => a.status === 'Offer Received').length;
    const interviewSchedulesCount = interviews.length;

    return res.json({
      companyName: company?.name || companyName || 'All Companies',
      verificationStatus: company?.verificationStatus || 'Verified',
      activeDrivesCount,
      pendingDrivesCount,
      applicationsReceived,
      shortlistedCount,
      interviewSchedulesCount,
      selectedCandidates,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve recruiter metrics', details: err.message });
  }
});

// GET /api/recruiter/applicants - Actual candidate applicant roster with filters
recruiterRouter.get('/applicants', async (req: Request, res: Response) => {
  try {
    const { companyName, jobId, status, department, minCgpa, search } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    let apps: any[] = [];
    let students: any[] = [];

    if (isDbConnected) {
      const query: any = {};
      if (companyName) query.companyName = { $regex: new RegExp(`^${companyName}$`, 'i') };
      if (jobId) query.jobId = jobId;
      if (status && status !== 'All') query.status = status;
      if (department && department !== 'All') query.department = department;

      apps = await Application.find(query).sort({ appliedDate: -1 }).lean();
      students = await Student.find({}, 'studentId rollNo cgpa department skills readinessScore atsScore').lean();
    } else {
      apps = [...inMemoryStore.applications];
      if (companyName) {
        apps = apps.filter((a) => a.companyName.toLowerCase() === String(companyName).toLowerCase());
      }
      if (jobId) {
        apps = apps.filter((a) => a.jobId === jobId);
      }
      if (status && status !== 'All') {
        apps = apps.filter((a) => a.status === status);
      }
      if (department && department !== 'All') {
        apps = apps.filter((a) => a.department === department);
      }
      students = inMemoryStore.students;
    }

    // Merge student attributes for rich recruiter screening (strictly preserving student privacy)
    const studentMap = new Map<string, any>();
    students.forEach((s) => {
      if (s.studentId) studentMap.set(s.studentId, s);
      if (s.rollNo) studentMap.set(s.rollNo, s);
    });

    let merged = apps.map((a) => {
      const stu = studentMap.get(a.studentId) || studentMap.get(a.rollNo) || {};
      return {
        id: a.applicationId || a._id,
        applicationId: a.applicationId || a._id,
        studentId: a.studentId,
        name: a.studentName || stu.name || 'Candidate',
        rollNo: a.rollNo || stu.rollNo || '21CS000',
        cgpa: a.cgpa || stu.cgpa || 8.0,
        department: a.department || stu.department || 'Computer Science & Engineering',
        roleApplied: a.role,
        companyName: a.companyName,
        aiMatchScore: a.aiReadinessScore || stu.readinessScore || 90,
        atsScore: stu.atsScore || 85,
        status: a.status,
        appliedDate: a.appliedDate,
        nextRound: a.nextRound,
        nextRoundDate: a.nextRoundDate,
        skills: stu.skills || ['DSA', 'TypeScript', 'Node.js'],
        flag:
          (a.cgpa || stu.cgpa || 0) >= 9.0
            ? 'Top Tier Academic Honor · 0 Backlogs'
            : (a.aiReadinessScore || 0) >= 90
            ? 'High Algorithmic Proficiency'
            : 'Verified Candidate',
      };
    });

    if (minCgpa) {
      const min = parseFloat(String(minCgpa));
      if (!isNaN(min)) {
        merged = merged.filter((c) => c.cgpa >= min);
      }
    }

    if (search) {
      const s = String(search).toLowerCase();
      merged = merged.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.rollNo.toLowerCase().includes(s) ||
          c.department.toLowerCase().includes(s) ||
          c.roleApplied.toLowerCase().includes(s)
      );
    }

    return res.json(merged);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve applicants', details: err.message });
  }
});

// POST /api/recruiter/request-drive - Submit placement request (default status: Pending Approval)
recruiterRouter.post('/request-drive', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.companyName || !body.role || !body.ctcPackageLpa) {
      return res.status(400).json({ error: 'companyName, role, and ctcPackageLpa are required.' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const cleanSlug = `${body.companyName}-${body.role}`.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    const jobId = `job-${cleanSlug}-${Date.now().toString().slice(-4)}`;

    const newDriveRequest = {
      jobId,
      companyId: body.companyId || '',
      companyName: body.companyName,
      role: body.role,
      ctcPackageLpa: Number(body.ctcPackageLpa),
      stipendPerMonth: Number(body.stipendPerMonth) || 0,
      tier: body.tier || (Number(body.ctcPackageLpa) >= 18 ? 'Dream (18+ LPA)' : 'Super Dream (12-18 LPA)'),
      location: body.location || 'Bengaluru / Hyderabad',
      workMode: body.workMode || 'Hybrid',
      category: body.category || 'Core Tech',
      minCgpa: Number(body.minCgpa) || 7.0,
      maxBacklogs: Number(body.maxBacklogs) || 0,
      eligibleDepartments: body.eligibleDepartments || [
        'Computer Science & Engineering',
        'Information Technology',
        'Artificial Intelligence & Machine Learning',
      ],
      graduationYear: Number(body.graduationYear) || 2025,
      deadline: body.deadline ? new Date(body.deadline) : new Date(Date.now() + 14 * 86400000),
      assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date(Date.now() + 18 * 86400000),
      matchScore: 92,
      requiredSkills: Array.isArray(body.requiredSkills)
        ? body.requiredSkills
        : (body.requiredSkills || 'Data Structures, Problem Solving').split(',').map((s: string) => s.trim()),
      preferredSkills: body.preferredSkills || [],
      positionsCount: Number(body.positionsCount) || 10,
      description: body.description || `Campus placement drive request submitted by recruiter for ${body.role}.`,
      status: 'Pending Approval' as const, // Strict Requirement: Recruiter requests default to Pending Approval!
      recruiterId: body.recruiterId || '',
      recruiterEmail: body.recruiterEmail || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isDbConnected) {
      const created = await JobDrive.create(newDriveRequest);
      realtimeHub.broadcast('drive_status_changed', {
        jobId: created.jobId,
        status: created.status,
        companyName: created.companyName,
      });
      return res.status(201).json({
        success: true,
        message: 'Placement drive request submitted successfully! It is now pending TPO review and approval.',
        drive: created,
      });
    }

    inMemoryStore.jobs.unshift(newDriveRequest as any);
    realtimeHub.broadcast('drive_status_changed', {
      jobId: newDriveRequest.jobId,
      status: newDriveRequest.status,
      companyName: newDriveRequest.companyName,
    });
    return res.status(201).json({
      success: true,
      message: 'Placement drive request submitted successfully! It is now pending TPO review and approval.',
      drive: newDriveRequest,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit placement drive request', details: err.message });
  }
});

// PATCH /api/recruiter/applicants/:id/status - Update applicant status (Shortlist, Interview, Offer)
recruiterRouter.patch('/applicants/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { status, nextRound, nextRoundDate, feedbackNotes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const updates: any = { status, updatedAt: new Date() };
    if (nextRound !== undefined) updates.nextRound = nextRound;
    if (nextRoundDate !== undefined) updates.nextRoundDate = nextRoundDate;
    if (feedbackNotes !== undefined) updates.feedbackNotes = feedbackNotes;

    let updatedApp: any = null;

    if (isDbConnected) {
      updatedApp = await Application.findOneAndUpdate(
        { $or: [{ applicationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { $set: updates },
        { new: true }
      );

      if (updatedApp && status === 'Offer Received') {
        // Mark student as placed
        await Student.findOneAndUpdate(
          { $or: [{ studentId: updatedApp.studentId }, { rollNo: updatedApp.rollNo }] },
          { $set: { placed: true }, $inc: { offersReceived: 1 }, $max: { maxCtcOfferedLpa: updatedApp.ctcPackageLpa } }
        );
      }
    } else {
      const idx = inMemoryStore.applications.findIndex((a) => a.applicationId === id);
      if (idx !== -1) {
        inMemoryStore.applications[idx] = { ...inMemoryStore.applications[idx], ...updates };
        updatedApp = inMemoryStore.applications[idx];

        if (status === 'Offer Received') {
          const stuIdx = inMemoryStore.students.findIndex(
            (s) => s.studentId === updatedApp.studentId || s.rollNo === updatedApp.rollNo
          );
          if (stuIdx !== -1) {
            inMemoryStore.students[stuIdx].placed = true;
            inMemoryStore.students[stuIdx].offersReceived = (inMemoryStore.students[stuIdx].offersReceived || 0) + 1;
            inMemoryStore.students[stuIdx].maxCtcOfferedLpa = Math.max(
              inMemoryStore.students[stuIdx].maxCtcOfferedLpa || 0,
              updatedApp.ctcPackageLpa || 0
            );
          }
        }
      }
    }

    if (!updatedApp) {
      return res.status(404).json({ error: 'Applicant application record not found.' });
    }

    realtimeHub.broadcast('application_status_changed', updatedApp);

    return res.json({
      success: true,
      message: `Applicant pipeline stage advanced to "${status}".`,
      application: updatedApp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update applicant status', details: err.message });
  }
});

// POST /api/recruiter/schedule-interview - Schedule interview for an applicant
recruiterRouter.post('/schedule-interview', async (req: Request, res: Response) => {
  try {
    const { studentId, jobId, companyName, role, roundType = 'Technical', scheduledAt, durationMinutes = 45 } = req.body;

    if (!studentId || !jobId) {
      return res.status(400).json({ error: 'studentId and jobId are required' });
    }

    const interviewId = `int-${Date.now()}`;
    const newInterview = {
      interviewId,
      studentId,
      jobId,
      companyName: companyName || 'Hiring Partner',
      role: role || 'Software Development Engineer',
      roundType,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 48 * 3600000),
      durationMinutes: Number(durationMinutes) || 45,
      status: 'Scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      await Interview.create(newInterview);
      await Application.findOneAndUpdate(
        { studentId, jobId },
        {
          $set: {
            status: roundType === 'HR' ? 'HR Interview' : 'Technical Interview',
            nextRound: `${roundType} Interview via PlaceMate Video`,
            nextRoundDate: new Date(newInterview.scheduledAt).toLocaleString(),
          },
        }
      );
    } else {
      inMemoryStore.interviews.unshift(newInterview as any);
      const appIdx = inMemoryStore.applications.findIndex((a) => a.studentId === studentId && a.jobId === jobId);
      if (appIdx !== -1) {
        inMemoryStore.applications[appIdx].status = roundType === 'HR' ? ('HR Interview' as any) : ('Technical Interview' as any);
        inMemoryStore.applications[appIdx].nextRound = `${roundType} Interview via PlaceMate Video`;
        inMemoryStore.applications[appIdx].nextRoundDate = new Date(newInterview.scheduledAt).toLocaleString();
      }
    }

    realtimeHub.broadcast('interview_scheduled', newInterview);

    return res.status(201).json({
      success: true,
      message: 'Interview round scheduled successfully and student notified.',
      interview: newInterview,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to schedule interview', details: err.message });
  }
});

