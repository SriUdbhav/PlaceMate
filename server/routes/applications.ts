import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Application } from '../models/Application';
import { JobDrive } from '../models/JobDrive';
import { inMemoryStore } from '../db';

export const applicationRouter = Router();

// GET all applications
applicationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, jobId, status } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query: any = {};
      if (studentId) query.studentId = studentId;
      if (jobId) query.jobId = jobId;
      if (status) query.status = status;

      const applications = await Application.find(query).sort({ appliedDate: -1 });
      return res.json(applications);
    }

    let results = [...inMemoryStore.applications];
    if (studentId) results = results.filter((a) => a.studentId === studentId);
    if (jobId) results = results.filter((a) => a.jobId === jobId);
    if (status) results = results.filter((a) => a.status === status);

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch applications', details: err.message });
  }
});

// POST submit application to a drive
applicationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, jobId, companyName, role, ctcPackageLpa, aiReadinessScore } = req.body;

    if (!studentId || !jobId) {
      return res.status(400).json({ error: 'studentId and jobId are required' });
    }

    // Check if already applied
    if (mongoose.connection.readyState === 1) {
      const existing = await Application.findOne({ studentId, jobId });
      if (existing) {
        return res.status(409).json({ error: 'Already applied for this drive', application: existing });
      }

      const newApp = await Application.create({
        applicationId: `app-${Date.now()}`,
        studentId,
        studentName: studentName || 'Aarav Sharma',
        jobId,
        companyName: companyName || 'Company',
        role: role || 'Software Development Engineer',
        ctcPackageLpa: Number(ctcPackageLpa) || 18.0,
        appliedDate: new Date(),
        status: 'Applied',
        nextRound: 'Campus Profile Screening',
        aiReadinessScore: Number(aiReadinessScore) || 90,
        feedbackNotes: 'Application registered in placement database.',
        verifiedByTpo: true,
      });

      return res.status(201).json(newApp);
    }

    const existingMem = inMemoryStore.applications.find(
      (a) => a.studentId === studentId && a.jobId === jobId
    );
    if (existingMem) {
      return res.status(409).json({ error: 'Already applied for this drive', application: existingMem });
    }

    const newAppMem = {
      applicationId: `app-${Date.now()}`,
      studentId,
      studentName: studentName || 'Aarav Sharma',
      jobId,
      companyName: companyName || 'Company',
      role: role || 'Software Development Engineer',
      ctcPackageLpa: Number(ctcPackageLpa) || 18.0,
      appliedDate: new Date(),
      status: 'Applied' as const,
      nextRound: 'Campus Profile Screening',
      aiReadinessScore: Number(aiReadinessScore) || 90,
      feedbackNotes: 'Application registered in placement database.',
      verifiedByTpo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryStore.applications.unshift(newAppMem as any);
    return res.status(201).json(newAppMem);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit application', details: err.message });
  }
});

// PATCH update application status (Kanban movement)
applicationRouter.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { status, nextRound, nextRoundDate, feedbackNotes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const updates: any = {
      status,
      updatedAt: new Date(),
    };
    if (nextRound !== undefined) updates.nextRound = nextRound;
    if (nextRoundDate !== undefined) updates.nextRoundDate = nextRoundDate;
    if (feedbackNotes !== undefined) updates.feedbackNotes = feedbackNotes;

    if (mongoose.connection.readyState === 1) {
      const updated = await Application.findOneAndUpdate(
        { $or: [{ applicationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Application not found' });
      return res.json(updated);
    }

    const index = inMemoryStore.applications.findIndex((a) => a.applicationId === id);
    if (index === -1) return res.status(404).json({ error: 'Application not found' });

    inMemoryStore.applications[index] = {
      ...inMemoryStore.applications[index],
      ...updates,
    };
    return res.json(inMemoryStore.applications[index]);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update application status', details: err.message });
  }
});
