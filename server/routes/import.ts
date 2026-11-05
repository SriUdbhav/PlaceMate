import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  parseCsv,
  validateStudentRow,
  validateJobDriveRow,
  generateSampleStudentsCsv,
  generateSampleDrivesCsv,
  ValidationError,
} from '../services/csvParser';
import { Student } from '../models/Student';
import { JobDrive } from '../models/JobDrive';
import { User } from '../models/User';
import { ImportHistory } from '../models/ImportHistory';
import { inMemoryStore } from '../db';
import { realtimeHub } from '../services/realtime';

export const importRouter = Router();

// GET /api/import/template/:type - Return official VFSTR CSV template
importRouter.get('/template/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  if (type === 'students') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vfstr_authorized_students_template.csv"');
    return res.send(generateSampleStudentsCsv());
  } else if (type === 'jobs' || type === 'drives') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vfstr_placement_drives_template.csv"');
    return res.send(generateSampleDrivesCsv());
  }
  return res.status(400).json({ error: 'Invalid template type. Use "students" or "drives".' });
});

// GET /api/import/history - List past import batches
importRouter.get('/history', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const history = await ImportHistory.find().sort({ createdAt: -1 }).limit(50);
      return res.json(history);
    }
    // In-memory fallback
    const memHistory = (inMemoryStore as any).importHistory || [];
    return res.json(memHistory);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve import history', details: err.message });
  }
});

// POST /api/import/preview - Validate and preview CSV data without saving
importRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const { csvData, importType = 'students' } = req.body;

    if (!csvData || typeof csvData !== 'string' || csvData.trim().length === 0) {
      return res.status(400).json({ error: 'csvData (string) is required for import preview.' });
    }

    const rows = parseCsv(csvData);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file contains no data rows or is malformed.' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (importType === 'students') {
      const previewValid: any[] = [];
      const previewDuplicates: any[] = [];
      const previewInvalid: { row: number; errors: ValidationError[]; raw: any }[] = [];

      // Query existing roll numbers and emails to detect duplicates
      let existingRolls = new Set<string>();
      let existingEmails = new Set<string>();

      if (isDbConnected) {
        const existingStudents = await Student.find({}, 'rollNo email').lean();
        existingStudents.forEach((s: any) => {
          if (s.rollNo) existingRolls.add(s.rollNo.toUpperCase());
          if (s.email) existingEmails.add(s.email.toLowerCase());
        });
      } else {
        inMemoryStore.students.forEach((s) => {
          if (s.rollNo) existingRolls.add(s.rollNo.toUpperCase());
          if (s.email) existingEmails.add(s.email.toLowerCase());
        });
      }

      // Track duplicate within current CSV batch
      const batchRolls = new Set<string>();
      const batchEmails = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2; // header is row 1
        const result = validateStudentRow(rows[i], rowNum);

        if (!result.valid || !result.data) {
          previewInvalid.push({ row: rowNum, errors: result.errors, raw: rows[i] });
          continue;
        }

        const data = result.data;
        const rollUpper = data.rollNo.toUpperCase();
        const emailLower = data.email.toLowerCase();

        if (existingRolls.has(rollUpper) || existingEmails.has(emailLower) || batchRolls.has(rollUpper) || batchEmails.has(emailLower)) {
          previewDuplicates.push({
            row: rowNum,
            rollNo: data.rollNo,
            name: data.name,
            email: data.email,
            reason: existingRolls.has(rollUpper)
              ? `Registration Number ${data.rollNo} already registered in database.`
              : existingEmails.has(emailLower)
              ? `Email address ${data.email} already registered.`
              : `Duplicate entry within this CSV batch.`,
          });
        } else {
          batchRolls.add(rollUpper);
          batchEmails.add(emailLower);
          previewValid.push(data);
        }
      }

      return res.json({
        importType: 'students',
        totalRecords: rows.length,
        validCount: previewValid.length,
        duplicateCount: previewDuplicates.length,
        invalidCount: previewInvalid.length,
        previewValid,
        previewDuplicates,
        previewInvalid,
      });
    } else {
      // Job Drives preview
      const previewValid: any[] = [];
      const previewDuplicates: any[] = [];
      const previewInvalid: { row: number; errors: ValidationError[]; raw: any }[] = [];

      let existingDrives = new Set<string>();

      if (isDbConnected) {
        const drives = await JobDrive.find({}, 'companyName role').lean();
        drives.forEach((d: any) => {
          existingDrives.add(`${d.companyName.toLowerCase()}|||${d.role.toLowerCase()}`);
        });
      } else {
        inMemoryStore.jobs.forEach((j) => {
          existingDrives.add(`${j.companyName.toLowerCase()}|||${j.role.toLowerCase()}`);
        });
      }

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const result = validateJobDriveRow(rows[i], rowNum);

        if (!result.valid || !result.data) {
          previewInvalid.push({ row: rowNum, errors: result.errors, raw: rows[i] });
          continue;
        }

        const data = result.data;
        const key = `${data.companyName.toLowerCase()}|||${data.role.toLowerCase()}`;

        if (existingDrives.has(key)) {
          previewDuplicates.push({
            row: rowNum,
            companyName: data.companyName,
            role: data.role,
            reason: `Placement drive for ${data.companyName} (${data.role}) already exists in placement portal.`,
          });
        } else {
          existingDrives.add(key);
          previewValid.push(data);
        }
      }

      return res.json({
        importType: 'jobs',
        totalRecords: rows.length,
        validCount: previewValid.length,
        duplicateCount: previewDuplicates.length,
        invalidCount: previewInvalid.length,
        previewValid,
        previewDuplicates,
        previewInvalid,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Import preview processing failed', details: err.message });
  }
});

// POST /api/import/commit - Authorize and save validated non-duplicate records
importRouter.post('/commit', async (req: Request, res: Response) => {
  try {
    const { validRecords, importType = 'students', fileName = 'upload.csv', importedBy = 'TPO Cell Officer' } = req.body;

    if (!validRecords || !Array.isArray(validRecords) || validRecords.length === 0) {
      return res.status(400).json({ error: 'No validated records provided for commit.' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    let savedCount = 0;
    let duplicateSkipped = 0;

    if (importType === 'students') {
      for (const rec of validRecords) {
        const rollNo = (rec.rollNo || '').trim().toUpperCase();
        const email = (rec.email || '').trim().toLowerCase();

        if (isDbConnected) {
          const exists = await Student.findOne({ $or: [{ rollNo }, { email }] });
          if (exists) {
            duplicateSkipped++;
            continue;
          }

          // 1. Create Student Document
          const studentDoc = await Student.create({
            ...rec,
            rollNo,
            email,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // 2. Provision Student Login Account with securely hashed temporary password (rollNo)
          const userExists = await User.findOne({ $or: [{ email }, { rollNo }] });
          if (!userExists) {
            await User.create({
              userId: `usr-${rollNo.toLowerCase()}`,
              studentId: studentDoc.studentId,
              name: rec.name,
              email,
              role: 'student',
              department: rec.department,
              rollNo,
              passwordHash: bcrypt.hashSync(rollNo, 10), // Initial password = registration number
              mustChangePassword: true, // Requires first-time permanent password setup
              hasChangedInitialPassword: false,
              isActive: true,
            });
          }
          savedCount++;
        } else {
          // In-memory store
          const existsMem = inMemoryStore.students.some(
            (s) => s.rollNo.toUpperCase() === rollNo || s.email.toLowerCase() === email
          );
          if (existsMem) {
            duplicateSkipped++;
            continue;
          }

          inMemoryStore.students.push({
            ...rec,
            rollNo,
            email,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const userExistsMem = inMemoryStore.users.some(
            (u) => u.email.toLowerCase() === email || (u.rollNo && u.rollNo.toUpperCase() === rollNo)
          );
          if (!userExistsMem) {
            inMemoryStore.users.push({
              userId: `usr-${rollNo.toLowerCase()}`,
              studentId: rec.studentId,
              name: rec.name,
              email,
              role: 'student' as const,
              department: rec.department,
              rollNo,
              passwordHash: bcrypt.hashSync(rollNo, 10),
              mustChangePassword: true,
              hasChangedInitialPassword: false,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          savedCount++;
        }
      }

      // Record in ImportHistory
      const historyRecord = {
        importId: `imp-${Date.now()}`,
        importType: 'students' as const,
        fileName,
        totalRecords: validRecords.length,
        successCount: savedCount,
        duplicateCount: duplicateSkipped,
        invalidCount: 0,
        importedBy,
        details: `Successfully authorized and imported ${savedCount} student records with password provisioning.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isDbConnected) {
        await ImportHistory.create(historyRecord);
      } else {
        if (!(inMemoryStore as any).importHistory) (inMemoryStore as any).importHistory = [];
        (inMemoryStore as any).importHistory.unshift(historyRecord);
      }

      realtimeHub.broadcast('student_imported', {
        count: savedCount,
        importedBy,
      });

      return res.status(201).json({
        success: true,
        message: `Successfully imported ${savedCount} student profiles into PlaceMate database (${duplicateSkipped} duplicates skipped).`,
        savedCount,
        duplicateSkipped,
      });
    } else {
      // Import Placement Drives
      for (const rec of validRecords) {
        const companyName = rec.companyName.trim();
        const role = rec.role.trim();

        if (isDbConnected) {
          const exists = await JobDrive.findOne({ companyName, role });
          if (exists) {
            duplicateSkipped++;
            continue;
          }

          await JobDrive.create({
            ...rec,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          savedCount++;
        } else {
          const existsMem = inMemoryStore.jobs.some(
            (j) => j.companyName.toLowerCase() === companyName.toLowerCase() && j.role.toLowerCase() === role.toLowerCase()
          );
          if (existsMem) {
            duplicateSkipped++;
            continue;
          }

          inMemoryStore.jobs.unshift({
            ...rec,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          savedCount++;
        }
      }

      const historyRecord = {
        importId: `imp-${Date.now()}`,
        importType: 'jobs' as const,
        fileName,
        totalRecords: validRecords.length,
        successCount: savedCount,
        duplicateCount: duplicateSkipped,
        invalidCount: 0,
        importedBy,
        details: `Authorized and published ${savedCount} placement drives.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isDbConnected) {
        await ImportHistory.create(historyRecord);
      } else {
        if (!(inMemoryStore as any).importHistory) (inMemoryStore as any).importHistory = [];
        (inMemoryStore as any).importHistory.unshift(historyRecord);
      }

      realtimeHub.broadcast('drive_created', {
        count: savedCount,
        importedBy,
      });

      return res.status(201).json({
        success: true,
        message: `Successfully published ${savedCount} placement drives into PlaceMate database (${duplicateSkipped} duplicates skipped).`,
        savedCount,
        duplicateSkipped,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Import commit failed', details: err.message });
  }
});

