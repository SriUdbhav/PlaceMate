import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Resume } from '../models/Resume';
import { inMemoryStore } from '../db';

export const resumeRouter = Router();

// GET resume by studentId
resumeRouter.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;

    if (mongoose.connection.readyState === 1) {
      const resume = await Resume.findOne({ studentId }).sort({ updatedAt: -1 });
      if (!resume) return res.status(404).json({ error: 'No stored resume found for student' });
      return res.json(resume);
    }

    const resume = inMemoryStore.resumes.find((r) => r.studentId === studentId);
    if (!resume) return res.status(404).json({ error: 'No stored resume found for student' });
    return res.json(resume);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch resume', details: err.message });
  }
});

// POST save / update resume analysis
resumeRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, targetRole, resumeText, atsScore, categoryScores, strengths, missingKeywords, recommendations } = req.body;

    if (!studentId || !resumeText) {
      return res.status(400).json({ error: 'studentId and resumeText are required' });
    }

    const payload = {
      resumeId: `res-${Date.now()}`,
      studentId,
      targetRole: targetRole || 'Software Development Engineer',
      resumeText,
      atsScore: Number(atsScore) || 85,
      categoryScores: categoryScores || {
        actionVerbs: 90,
        metricsDensity: 85,
        technicalMatch: 85,
        parserFormat: 100,
      },
      strengths: strengths || [],
      missingKeywords: missingKeywords || [],
      recommendations: recommendations || [],
      lastAuditedAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const saved = await Resume.findOneAndUpdate(
        { studentId },
        payload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(201).json(saved);
    }

    const index = inMemoryStore.resumes.findIndex((r) => r.studentId === studentId);
    if (index >= 0) {
      inMemoryStore.resumes[index] = { ...inMemoryStore.resumes[index], ...payload };
      return res.status(200).json(inMemoryStore.resumes[index]);
    }

    inMemoryStore.resumes.unshift(payload as any);
    return res.status(201).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save resume analysis', details: err.message });
  }
});
