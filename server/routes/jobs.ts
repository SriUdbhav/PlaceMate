import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { JobDrive } from '../models/JobDrive';
import { inMemoryStore } from '../db';

export const jobRouter = Router();

// GET all placement drives (supports query parameters: tier, category, search)
jobRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { tier, category, search } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query: any = {};
      if (tier && tier !== 'All') {
        query.tier = { $regex: String(tier), $options: 'i' };
      }
      if (category && category !== 'All') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { companyName: { $regex: String(search), $options: 'i' } },
          { role: { $regex: String(search), $options: 'i' } },
          { requiredSkills: { $in: [new RegExp(String(search), 'i')] } },
        ];
      }

      const drives = await JobDrive.find(query).sort({ assessmentDate: 1 });
      return res.json(drives);
    }

    // In-memory filter
    let results = [...inMemoryStore.jobs];
    if (tier && tier !== 'All') {
      results = results.filter((j) => j.tier.toLowerCase().includes(String(tier).toLowerCase()));
    }
    if (category && category !== 'All') {
      results = results.filter((j) => j.category === category);
    }
    if (search) {
      const s = String(search).toLowerCase();
      results = results.filter(
        (j) =>
          j.companyName.toLowerCase().includes(s) ||
          j.role.toLowerCase().includes(s) ||
          j.requiredSkills.some((sk) => sk.toLowerCase().includes(s))
      );
    }

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch placement drives', details: err.message });
  }
});

// GET single placement drive
jobRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1) {
      const drive = await JobDrive.findOne({
        $or: [{ jobId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!drive) return res.status(404).json({ error: 'Placement drive not found' });
      return res.json(drive);
    }

    const drive = inMemoryStore.jobs.find((j) => j.jobId === id);
    if (!drive) return res.status(404).json({ error: 'Placement drive not found' });
    return res.json(drive);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to query drive', details: err.message });
  }
});

// POST schedule / create new placement drive
jobRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.companyName || !body.role || !body.ctcPackageLpa) {
      return res.status(400).json({ error: 'companyName, role, and ctcPackageLpa are required' });
    }

    const newDrive = {
      jobId: body.jobId || `job-${Date.now()}`,
      companyId: body.companyId || '',
      companyName: body.companyName,
      role: body.role,
      ctcPackageLpa: Number(body.ctcPackageLpa),
      stipendPerMonth: Number(body.stipendPerMonth) || 0,
      tier: body.tier || 'Dream (18+ LPA)',
      location: body.location || 'Bengaluru / Hybrid',
      workMode: body.workMode || 'Hybrid',
      category: body.category || 'Core Tech',
      minCgpa: Number(body.minCgpa) || 7.5,
      maxBacklogs: Number(body.maxBacklogs) || 0,
      eligibleDepartments: body.eligibleDepartments || [
        'Computer Science & Engineering',
        'Information Technology',
      ],
      deadline: body.deadline ? new Date(body.deadline) : new Date(Date.now() + 14 * 86400000),
      assessmentDate: body.assessmentDate
        ? new Date(body.assessmentDate)
        : new Date(Date.now() + 18 * 86400000),
      matchScore: Number(body.matchScore) || 88,
      requiredSkills: body.requiredSkills || ['Data Structures', 'Problem Solving'],
      preferredSkills: body.preferredSkills || [],
      positionsCount: Number(body.positionsCount) || 10,
      description: body.description || 'Full-time campus recruitment drive opening.',
      status: body.status || 'Open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await JobDrive.create(newDrive);
      // Trigger background notification dispatch to eligible students
      const { notifyEligibleStudentsForJob } = await import('../services/eligibilityNotifier');
      notifyEligibleStudentsForJob(created).catch((err) => {
        console.error('Background notification dispatch error:', err);
      });
      return res.status(201).json(created);
    }

    inMemoryStore.jobs.unshift(newDrive as any);
    const { notifyEligibleStudentsForJob } = await import('../services/eligibilityNotifier');
    notifyEligibleStudentsForJob(newDrive).catch(() => {});
    return res.status(201).json(newDrive);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create placement drive', details: err.message });
  }
});

// POST trigger notification dispatch to all eligible students for a drive
jobRouter.post('/:id/notify-eligible', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let drive: any = null;

    if (mongoose.connection.readyState === 1) {
      drive = await JobDrive.findOne({
        $or: [{ jobId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
    } else {
      drive = inMemoryStore.jobs.find((j) => j.jobId === id);
    }

    if (!drive) return res.status(404).json({ error: 'Placement drive not found' });

    const { notifyEligibleStudentsForJob } = await import('../services/eligibilityNotifier');
    const result = await notifyEligibleStudentsForJob(drive);

    return res.json({
      success: true,
      message: `Notification run completed: ${result.emailsSent} emails dispatched, ${result.eligibleCount} eligible candidates found.`,
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to notify eligible students', details: err.message });
  }
});

// POST verify eligibility for a specific drive
jobRouter.post('/:id/verify-eligibility', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { cgpa, activeBacklogs, department } = req.body;

    let drive: any = null;
    if (mongoose.connection.readyState === 1) {
      drive = await JobDrive.findOne({
        $or: [{ jobId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
    } else {
      drive = inMemoryStore.jobs.find((j) => j.jobId === id);
    }

    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    const studentCgpa = Number(cgpa) || 0;
    const studentBacklogs = Number(activeBacklogs) || 0;
    const studentDept = String(department || '');

    const cgpaPass = studentCgpa >= drive.minCgpa;
    const backlogPass = studentBacklogs <= drive.maxBacklogs;
    const deptPass =
      drive.eligibleDepartments.length === 0 ||
      drive.eligibleDepartments.some((d: string) => d.toLowerCase() === studentDept.toLowerCase());

    const isEligible = cgpaPass && backlogPass && deptPass;

    return res.json({
      jobId: drive.jobId,
      companyName: drive.companyName,
      role: drive.role,
      isEligible,
      checks: {
        cgpa: {
          required: drive.minCgpa,
          actual: studentCgpa,
          passed: cgpaPass,
        },
        backlogs: {
          allowed: drive.maxBacklogs,
          actual: studentBacklogs,
          passed: backlogPass,
        },
        department: {
          eligibleDepartments: drive.eligibleDepartments,
          actual: studentDept,
          passed: deptPass,
        },
      },
      reason: isEligible
        ? 'Qualified for placement drive screening.'
        : !cgpaPass
        ? `CGPA ${studentCgpa} is below the required cutoff of ${drive.minCgpa}.`
        : !backlogPass
        ? `Active backlogs (${studentBacklogs}) exceed company allowance (${drive.maxBacklogs}).`
        : `Branch ${studentDept} is not among the eligible departments.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Eligibility check failed', details: err.message });
  }
});
