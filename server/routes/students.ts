import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/Student';
import { inMemoryStore } from '../db';

export const studentRouter = Router();

// GET all students
studentRouter.get('/', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const students = await Student.find().sort({ createdAt: -1 });
      return res.json(students);
    }
    return res.json(inMemoryStore.students);
  } catch (err: any) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ error: 'Failed to fetch students', details: err.message });
  }
});

// GET single student by ID or rollNo
studentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1) {
      const student = await Student.findOne({
        $or: [{ studentId: id }, { rollNo: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!student) return res.status(404).json({ error: 'Student profile not found' });
      return res.json(student);
    }

    const student = inMemoryStore.students.find(
      (s) => s.studentId === id || s.rollNo === id
    );
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    return res.json(student);
  } catch (err: any) {
    return res.status(500).json({ error: 'Error querying student', details: err.message });
  }
});

// POST create student
studentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.email || !body.rollNo) {
      return res.status(400).json({ error: 'Name, email, and rollNo are required' });
    }

    const newStudent = {
      studentId: body.studentId || `stu-${Date.now()}`,
      name: body.name,
      email: body.email,
      rollNo: body.rollNo,
      department: body.department || 'Computer Science & Engineering',
      batch: body.batch || '2021 - 2025 (Final Year)',
      cgpa: Number(body.cgpa) || 8.0,
      activeBacklogs: Number(body.activeBacklogs) || 0,
      clearedBacklogs: Number(body.clearedBacklogs) || 0,
      tenthPercentage: Number(body.tenthPercentage) || 90,
      twelfthPercentage: Number(body.twelfthPercentage) || 90,
      readinessScore: Number(body.readinessScore) || 85,
      atsScore: Number(body.atsScore) || 80,
      tierCategory: body.tierCategory || 'Tier 1',
      skills: body.skills || [],
      placed: Boolean(body.placed),
      offersReceived: Number(body.offersReceived) || 0,
      maxCtcOfferedLpa: Number(body.maxCtcOfferedLpa) || 0,
      verificationStatus: body.verificationStatus || 'Verified',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Student.create(newStudent);
      return res.status(201).json(created);
    }

    inMemoryStore.students.push(newStudent as any);
    return res.status(201).json(newStudent);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create student', details: err.message });
  }
});

// PUT update student
studentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updates = { ...req.body, updatedAt: new Date() };

    if (mongoose.connection.readyState === 1) {
      const updated = await Student.findOneAndUpdate(
        { $or: [{ studentId: id }, { rollNo: id }] },
        updates,
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Student not found' });
      return res.json(updated);
    }

    const index = inMemoryStore.students.findIndex(
      (s) => s.studentId === id || s.rollNo === id
    );
    if (index === -1) return res.status(404).json({ error: 'Student not found' });

    inMemoryStore.students[index] = { ...inMemoryStore.students[index], ...updates };
    return res.json(inMemoryStore.students[index]);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update student', details: err.message });
  }
});
