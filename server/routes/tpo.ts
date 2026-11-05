import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/Student';
import { JobDrive } from '../models/JobDrive';
import { Application } from '../models/Application';
import { Company } from '../models/Company';
import { inMemoryStore } from '../db';
import { realtimeHub } from '../services/realtime';

export const tpoRouter = Router();

// Verified Historical Placement Reports (Official VFSTR CDC Historical Records)
export const VFSTR_HISTORICAL_PLACEMENT_REPORTS = [
  {
    academicYear: '2023 - 2024',
    source: 'VFSTR Career Development Centre (CDC) Annual Placement Publication',
    totalGraduatingEligible: 1450,
    placedStudents: 1242,
    placementRatePercentage: 85.6,
    averageCtcLpa: 5.4,
    highestCtcLpa: 44.0,
    medianCtcLpa: 4.8,
    keyRecruiters: ['Amazon', 'Cisco', 'Cognizant', 'TCS', 'Accenture', 'Darwinbox', 'Wipro', 'Infosys'],
    verifiedDate: '2024-06-30',
  },
  {
    academicYear: '2022 - 2023',
    source: 'VFSTR Statutory NIRF & NAAC Placement Disclosure',
    totalGraduatingEligible: 1380,
    placedStudents: 1162,
    placementRatePercentage: 84.2,
    averageCtcLpa: 5.1,
    highestCtcLpa: 42.0,
    medianCtcLpa: 4.5,
    keyRecruiters: ['Amazon', 'TCS Digital', 'DXC Technology', 'HCL', 'Tech Mahindra'],
    verifiedDate: '2023-06-30',
  },
];

// GET /api/tpo/metrics - Live MongoDB-backed analytics aggregation
tpoRouter.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    let students: any[] = [];
    let jobs: any[] = [];
    let apps: any[] = [];
    let companies: any[] = [];

    if (isDbConnected) {
      [students, jobs, apps, companies] = await Promise.all([
        Student.find().lean(),
        JobDrive.find().lean(),
        Application.find().lean(),
        Company.find().lean(),
      ]);
    } else {
      students = inMemoryStore.students;
      jobs = inMemoryStore.jobs;
      apps = inMemoryStore.applications;
      companies = inMemoryStore.companies;
    }

    const totalStudents = students.length;
    // Institutional placement eligibility policy: CGPA >= 6.0 and activeBacklogs === 0
    const eligibleStudentsList = students.filter(
      (s) => (s.cgpa ?? 0) >= 6.0 && (s.activeBacklogs ?? 0) === 0
    );
    const totalEligibleStudents = eligibleStudentsList.length;

    // Distinct placed students (either placed: true on Student or Offer Received in Application)
    const placedStudentIds = new Set<string>();
    students.forEach((s) => {
      if (s.placed) placedStudentIds.add(s.studentId || s.rollNo);
    });
    apps.forEach((a) => {
      if (a.status === 'Offer Received') placedStudentIds.add(a.studentId);
    });
    const placedCount = placedStudentIds.size;

    const placementRatePercentage =
      totalEligibleStudents > 0
        ? Math.round((placedCount / totalEligibleStudents) * 1000) / 10
        : 0;

    const activeDrives = jobs.filter(
      (j) => j.status === 'Published' || j.status === 'Open' || j.status === 'Scheduled'
    );
    const pendingApprovalDrives = jobs.filter((j) => j.status === 'Pending Approval');

    const totalApplications = apps.length;
    const shortlistedCount = apps.filter((a) =>
      ['Shortlisted', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Offer Received'].includes(a.status)
    ).length;
    const selectedCount = apps.filter((a) => a.status === 'Offer Received').length;

    // Calculate packages from active drives & offers
    const offerCtcs = apps
      .filter((a) => a.status === 'Offer Received' && a.ctcPackageLpa > 0)
      .map((a) => a.ctcPackageLpa);

    const driveCtcs = jobs.filter((j) => j.ctcPackageLpa > 0).map((j) => j.ctcPackageLpa);
    const allRelevantCtcs = offerCtcs.length > 0 ? offerCtcs : driveCtcs;

    const highestPackageLpa = allRelevantCtcs.length > 0 ? Math.max(...allRelevantCtcs) : 0;
    const averagePackageLpa =
      allRelevantCtcs.length > 0
        ? Math.round((allRelevantCtcs.reduce((acc, c) => acc + c, 0) / allRelevantCtcs.length) * 10) / 10
        : 0;
    const sortedCtcs = [...allRelevantCtcs].sort((a, b) => a - b);
    const medianPackageLpa =
      sortedCtcs.length > 0
        ? sortedCtcs[Math.floor(sortedCtcs.length / 2)]
        : 0;

    // Department-wise breakdown aggregated from real students and applications
    const deptMap: Record<
      string,
      { total: number; eligible: number; placed: number; totalCtc: number; ctcCount: number }
    > = {};

    students.forEach((s) => {
      const dept = s.department || 'Other';
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, eligible: 0, placed: 0, totalCtc: 0, ctcCount: 0 };
      }
      deptMap[dept].total++;
      if ((s.cgpa ?? 0) >= 6.0 && (s.activeBacklogs ?? 0) === 0) {
        deptMap[dept].eligible++;
      }
      if (placedStudentIds.has(s.studentId || s.rollNo) || s.placed) {
        deptMap[dept].placed++;
      }
    });

    apps.forEach((a) => {
      if (a.status === 'Offer Received' && a.department && deptMap[a.department]) {
        deptMap[a.department].totalCtc += a.ctcPackageLpa || 0;
        deptMap[a.department].ctcCount++;
      }
    });

    const departmentStats = Object.keys(deptMap).map((dept) => {
      const d = deptMap[dept];
      const percentage = d.eligible > 0 ? Math.round((d.placed / d.eligible) * 1000) / 10 : 0;
      const avgCtcLpa = d.ctcCount > 0 ? Math.round((d.totalCtc / d.ctcCount) * 10) / 10 : averagePackageLpa;
      return {
        department: dept,
        totalStudents: d.total,
        eligible: d.eligible,
        placed: d.placed,
        percentage,
        avgCtcLpa,
      };
    });

    // Tier Distribution calculation
    const tierCounts: Record<string, number> = {
      'Dream (18+ LPA)': 0,
      'Super Dream (12-18 LPA)': 0,
      'Standard (6-12 LPA)': 0,
      'Mass Recruiters (3-6 LPA)': 0,
    };

    activeDrives.forEach((j) => {
      const ctc = j.ctcPackageLpa;
      if (ctc >= 18) tierCounts['Dream (18+ LPA)']++;
      else if (ctc >= 12) tierCounts['Super Dream (12-18 LPA)']++;
      else if (ctc >= 6) tierCounts['Standard (6-12 LPA)']++;
      else tierCounts['Mass Recruiters (3-6 LPA)']++;
    });

    const totalTierDrives = activeDrives.length || 1;
    const tierDistribution = Object.keys(tierCounts).map((tier) => ({
      tier,
      count: tierCounts[tier],
      percentage: Math.round((tierCounts[tier] / totalTierDrives) * 1000) / 10,
    }));

    // Active recruiter count (verified companies)
    const verifiedRecruiters = companies.filter((c) => c.verificationStatus === 'Verified').length;

    return res.json({
      totalRegisteredStudents: totalStudents,
      totalEligibleStudents,
      placedStudents: placedCount,
      placementRatePercentage,
      activeRecruiters: verifiedRecruiters || companies.length,
      ongoingDrives: activeDrives.length,
      pendingRequestsCount: pendingApprovalDrives.length,
      totalApplications,
      shortlistedStudents: shortlistedCount,
      selectedStudents: selectedCount,
      averagePackageLpa,
      highestPackageLpa,
      medianPackageLpa,
      departmentStats,
      tierDistribution,
      historicalReports: VFSTR_HISTORICAL_PLACEMENT_REPORTS,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to aggregate TPO metrics', details: err.message });
  }
});

// GET /api/tpo/drives - List all placement drives across workflow stages
tpoRouter.get('/drives', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const query: any = {};
      if (status && status !== 'All') {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { companyName: { $regex: String(search), $options: 'i' } },
          { role: { $regex: String(search), $options: 'i' } },
        ];
      }
      const drives = await JobDrive.find(query).sort({ createdAt: -1 });
      return res.json(drives);
    }

    let results = [...inMemoryStore.jobs];
    if (status && status !== 'All') {
      results = results.filter((j) => j.status === status);
    }
    if (search) {
      const s = String(search).toLowerCase();
      results = results.filter(
        (j) => j.companyName.toLowerCase().includes(s) || j.role.toLowerCase().includes(s)
      );
    }
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch drives', details: err.message });
  }
});

// POST /api/tpo/drives - Create placement drive directly by TPO
tpoRouter.post('/drives', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.companyName || !body.role || !body.ctcPackageLpa) {
      return res.status(400).json({ error: 'Company Name, Role, and CTC Package are required.' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const cleanSlug = `${body.companyName}-${body.role}`.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    const jobId = body.jobId || `job-${cleanSlug}-${Date.now().toString().slice(-4)}`;

    const newDrive = {
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
      eligibleDepartments: body.eligibleDepartments || ['Computer Science & Engineering', 'Information Technology'],
      graduationYear: Number(body.graduationYear) || 2025,
      deadline: body.deadline ? new Date(body.deadline) : new Date(Date.now() + 14 * 86400000),
      assessmentDate: body.assessmentDate ? new Date(body.assessmentDate) : new Date(Date.now() + 18 * 86400000),
      matchScore: 90,
      requiredSkills: Array.isArray(body.requiredSkills)
        ? body.requiredSkills
        : (body.requiredSkills || 'Data Structures, Problem Solving').split(',').map((s: string) => s.trim()),
      preferredSkills: body.preferredSkills || [],
      positionsCount: Number(body.positionsCount) || 10,
      description: body.description || `Campus placement drive by ${body.companyName} for ${body.role}.`,
      status: body.status || 'Published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isDbConnected) {
      const created = await JobDrive.create(newDrive);
      realtimeHub.broadcast('drive_created', created);
      return res.status(201).json(created);
    }

    inMemoryStore.jobs.unshift(newDrive as any);
    realtimeHub.broadcast('drive_created', newDrive);
    return res.status(201).json(newDrive);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create placement drive', details: err.message });
  }
});

// PATCH /api/tpo/drives/:id/status - Approve, publish, close, or reject placement drive
tpoRouter.patch('/drives/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { status, approvalRemarks } = req.body;

    const validStatuses = [
      'Draft',
      'Pending Approval',
      'Approved',
      'Published',
      'Completed',
      'Closed',
      'Rejected',
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const updates: any = { status, updatedAt: new Date() };
    if (approvalRemarks) updates.approvalRemarks = approvalRemarks;

    let updatedDrive: any = null;

    if (isDbConnected) {
      updatedDrive = await JobDrive.findOneAndUpdate(
        { $or: [{ jobId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { $set: updates },
        { new: true }
      );
    } else {
      const idx = inMemoryStore.jobs.findIndex((j) => j.jobId === id);
      if (idx !== -1) {
        inMemoryStore.jobs[idx] = { ...inMemoryStore.jobs[idx], ...updates };
        updatedDrive = inMemoryStore.jobs[idx];
      }
    }

    if (!updatedDrive) {
      return res.status(404).json({ error: 'Placement drive not found.' });
    }

    // When a drive is published, automatically run background notification dispatch to eligible students
    if (status === 'Published') {
      import('../services/eligibilityNotifier')
        .then(({ notifyEligibleStudentsForJob }) => {
          notifyEligibleStudentsForJob(updatedDrive).catch((e) => console.log('Dispatch run error:', e.message));
        })
        .catch(() => {});
    }

    realtimeHub.broadcast('drive_status_changed', {
      jobId: updatedDrive.jobId,
      status: updatedDrive.status,
      companyName: updatedDrive.companyName,
    });

    return res.json({
      success: true,
      message: `Placement drive status updated to "${status}".`,
      drive: updatedDrive,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update drive status', details: err.message });
  }
});

// GET /api/tpo/eligibility-audit/:jobId - Deterministic eligibility engine evaluation
tpoRouter.get('/eligibility-audit/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const isDbConnected = mongoose.connection.readyState === 1;

    let drive: any = null;
    let students: any[] = [];

    if (isDbConnected) {
      drive = await JobDrive.findOne({
        $or: [{ jobId }, { _id: mongoose.isValidObjectId(jobId) ? jobId : null }],
      }).lean();
      students = await Student.find({ verificationStatus: { $ne: 'Flagged' } }).lean();
    } else {
      drive = inMemoryStore.jobs.find((j) => j.jobId === jobId);
      students = inMemoryStore.students.filter((s: any) => s.verificationStatus !== 'Flagged');
    }

    if (!drive) {
      return res.status(404).json({ error: 'Placement drive not found' });
    }

    const eligibleStudents: any[] = [];
    const ineligibleStudents: { student: any; reason: string }[] = [];

    for (const student of students) {
      const cgpa = student.cgpa ?? 0;
      const backlogs = student.activeBacklogs ?? 0;
      const dept = student.department || '';

      const cgpaPass = cgpa >= (drive.minCgpa ?? 0);
      const backlogPass = backlogs <= (drive.maxBacklogs ?? 0);
      const deptPass =
        !drive.eligibleDepartments ||
        drive.eligibleDepartments.length === 0 ||
        drive.eligibleDepartments.some((d: string) => d.toLowerCase() === dept.toLowerCase());

      if (cgpaPass && backlogPass && deptPass) {
        eligibleStudents.push({
          studentId: student.studentId,
          name: student.name,
          rollNo: student.rollNo,
          email: student.email,
          department: student.department,
          cgpa: student.cgpa,
          activeBacklogs: student.activeBacklogs,
          skills: student.skills || [],
        });
      } else {
        const reasons: string[] = [];
        if (!cgpaPass) reasons.push(`CGPA ${cgpa} is below cutoff (${drive.minCgpa})`);
        if (!backlogPass) reasons.push(`Active backlogs (${backlogs}) exceed limit (${drive.maxBacklogs})`);
        if (!deptPass) reasons.push(`Branch ${dept} not eligible`);

        ineligibleStudents.push({
          student: {
            studentId: student.studentId,
            name: student.name,
            rollNo: student.rollNo,
            department: student.department,
            cgpa: student.cgpa,
            activeBacklogs: student.activeBacklogs,
          },
          reason: reasons.join('; '),
        });
      }
    }

    return res.json({
      jobId: drive.jobId,
      companyName: drive.companyName,
      role: drive.role,
      ctcPackageLpa: drive.ctcPackageLpa,
      criteria: {
        minCgpa: drive.minCgpa,
        maxBacklogs: drive.maxBacklogs,
        eligibleDepartments: drive.eligibleDepartments,
      },
      totalAudited: students.length,
      eligibleCount: eligibleStudents.length,
      ineligibleCount: ineligibleStudents.length,
      eligibleStudents,
      ineligibleStudents,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to run eligibility audit', details: err.message });
  }
});

// GET /api/tpo/clearance-queue - Candidate clearance approvals
tpoRouter.get('/clearance-queue', async (_req: Request, res: Response) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let apps: any[] = [];

    if (isDbConnected) {
      apps = await Application.find({ verifiedByTpo: false }).sort({ appliedDate: -1 });
      if (apps.length === 0) {
        // Return recent pending/under review applications for TPO clearance overview
        apps = await Application.find().sort({ appliedDate: -1 }).limit(10);
      }
    } else {
      apps = inMemoryStore.applications.slice(0, 10);
    }

    return res.json(apps);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve clearance queue', details: err.message });
  }
});

// PATCH /api/tpo/clear-application/:id - Clear/approve candidate application
tpoRouter.patch('/clear-application/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const app = await Application.findOneAndUpdate(
        { $or: [{ applicationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { $set: { verifiedByTpo: true, status: 'Shortlisted' } },
        { new: true }
      );
      if (!app) return res.status(404).json({ error: 'Application not found' });
      realtimeHub.broadcast('application_status_changed', app);
      return res.json({ success: true, application: app });
    }

    const idx = inMemoryStore.applications.findIndex((a) => a.applicationId === id);
    if (idx === -1) return res.status(404).json({ error: 'Application not found' });

    inMemoryStore.applications[idx].verifiedByTpo = true;
    inMemoryStore.applications[idx].status = 'Shortlisted' as any;
    realtimeHub.broadcast('application_status_changed', inMemoryStore.applications[idx]);

    return res.json({ success: true, application: inMemoryStore.applications[idx] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear application', details: err.message });
  }
});

// GET /api/tpo/companies - Company verification status list
tpoRouter.get('/companies', async (_req: Request, res: Response) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const companies = await Company.find().sort({ name: 1 });
      return res.json(companies);
    }
    return res.json(inMemoryStore.companies);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch companies', details: err.message });
  }
});

// PATCH /api/tpo/companies/:id/verify - Approve/reject recruiter company verification
tpoRouter.patch('/companies/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verificationStatus } = req.body;

    if (!['Verified', 'Pending', 'Rejected'].includes(verificationStatus)) {
      return res.status(400).json({ error: 'Invalid verificationStatus. Must be Verified, Pending, or Rejected.' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const company = await Company.findOneAndUpdate(
        { $or: [{ companyId: id }, { name: id }] },
        { $set: { verificationStatus, updatedAt: new Date() } },
        { new: true }
      );
      if (!company) return res.status(404).json({ error: 'Company not found' });
      realtimeHub.broadcast('company_verified', company);
      return res.json({ success: true, company });
    }

    const idx = inMemoryStore.companies.findIndex(
      (c) => c.companyId === id || c.name.toLowerCase() === id.toLowerCase()
    );
    if (idx === -1) return res.status(404).json({ error: 'Company not found' });

    (inMemoryStore.companies[idx] as any).verificationStatus = verificationStatus;
    realtimeHub.broadcast('company_verified', inMemoryStore.companies[idx]);

    return res.json({ success: true, company: inMemoryStore.companies[idx] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update company verification', details: err.message });
  }
});
