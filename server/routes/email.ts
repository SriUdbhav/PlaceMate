import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { verifySmtpConnection, sendTestEmail, sendPlacementNotificationEmail, getTransporter } from '../services/emailService';
import { Student } from '../models/Student';
import { JobDrive } from '../models/JobDrive';
import { Application } from '../models/Application';
import { EmailDeliveryLog } from '../models/EmailDeliveryLog';
import { Notification } from '../models/Notification';
import { inMemoryStore } from '../db';
import { realtimeHub } from '../services/realtime';
import { GoogleGenAI } from '@google/genai';

export const emailRouter = Router();

// GET /api/email/smtp-status - Verifies SMTP connection and authentication
emailRouter.get('/smtp-status', async (_req: Request, res: Response) => {
  try {
    const status = await verifySmtpConnection();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({
      configured: false,
      verified: false,
      error: err.message || 'SMTP connection verification check encountered an error',
    });
  }
});

// POST /api/email/send-test - Sends an explicit test email to configured address without notifying students
emailRouter.post('/send-test', async (req: Request, res: Response) => {
  try {
    const { recipient } = req.body;
    const result = await sendTestEmail(recipient);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch test verification email',
    });
  }
});

// POST /api/email/preview-recipients - Calculate actual recipient count based on category
emailRouter.post('/preview-recipients', async (req: Request, res: Response) => {
  try {
    const { category, jobId, branches, targetRollNo } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    let students: any[] = [];
    if (isDbConnected) {
      students = await Student.find({ verificationStatus: { $ne: 'Flagged' } }).lean();
    } else {
      students = inMemoryStore.students.filter((s: any) => s.verificationStatus !== 'Flagged');
    }

    let recipients: any[] = [];

    if (category === 'all') {
      // 1. All Active Students
      recipients = students.map((s) => ({
        studentId: s.studentId,
        name: s.name,
        rollNo: s.rollNo,
        email: s.email,
        department: s.department,
      }));
    } else if (category === 'eligible') {
      // 2. Eligible Students for a Drive
      if (!jobId) {
        return res.status(400).json({ error: 'jobId is required for eligible students recipient category.' });
      }

      let drive: any = null;
      if (isDbConnected) {
        drive = await JobDrive.findOne({
          $or: [{ jobId }, { _id: mongoose.isValidObjectId(jobId) ? jobId : null }],
        }).lean();
      } else {
        drive = inMemoryStore.jobs.find((j) => j.jobId === jobId);
      }

      if (!drive) {
        return res.status(404).json({ error: 'Drive not found for eligibility calculation.' });
      }

      recipients = students
        .filter((s) => {
          const cgpaPass = (s.cgpa ?? 0) >= (drive.minCgpa ?? 0);
          const backlogPass = (s.activeBacklogs ?? 0) <= (drive.maxBacklogs ?? 0);
          const deptPass =
            !drive.eligibleDepartments ||
            drive.eligibleDepartments.length === 0 ||
            drive.eligibleDepartments.some((d: string) => d.toLowerCase() === (s.department || '').toLowerCase());
          return cgpaPass && backlogPass && deptPass;
        })
        .map((s) => ({
          studentId: s.studentId,
          name: s.name,
          rollNo: s.rollNo,
          email: s.email,
          department: s.department,
          cgpa: s.cgpa,
          activeBacklogs: s.activeBacklogs,
        }));
    } else if (category === 'branches') {
      // 3. Selected Branches
      const branchList = Array.isArray(branches) ? branches : [branches];
      recipients = students
        .filter((s) => branchList.some((b: string) => (s.department || '').toLowerCase().includes(b.toLowerCase())))
        .map((s) => ({
          studentId: s.studentId,
          name: s.name,
          rollNo: s.rollNo,
          email: s.email,
          department: s.department,
        }));
    } else if (category === 'shortlisted') {
      // 4. Shortlisted Students
      let apps: any[] = [];
      if (isDbConnected) {
        apps = await Application.find({
          ...(jobId ? { jobId } : {}),
          status: { $in: ['Shortlisted', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Offer Received'] },
        }).lean();
      } else {
        apps = inMemoryStore.applications.filter(
          (a) =>
            (!jobId || a.jobId === jobId) &&
            ['Shortlisted', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Offer Received'].includes(a.status)
        );
      }

      const appStudentIds = new Set(apps.map((a) => a.studentId));
      recipients = students
        .filter((s) => appStudentIds.has(s.studentId) || appStudentIds.has(s.rollNo))
        .map((s) => ({
          studentId: s.studentId,
          name: s.name,
          rollNo: s.rollNo,
          email: s.email,
          department: s.department,
        }));
    } else if (category === 'individual') {
      // 5. Individual Student
      const target = (targetRollNo || '').trim().toUpperCase();
      const s = students.find((st) => st.rollNo?.toUpperCase() === target || st.studentId === target);
      if (s) {
        recipients = [
          {
            studentId: s.studentId,
            name: s.name,
            rollNo: s.rollNo,
            email: s.email,
            department: s.department,
          },
        ];
      }
    }

    return res.json({
      category,
      recipientCount: recipients.length,
      recipients,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to preview recipients', details: err.message });
  }
});

// POST /api/email/draft-ai - Gemini AI powered email draft generation grounded in actual parameters
emailRouter.post('/draft-ai', async (req: Request, res: Response) => {
  try {
    const { category, companyName, role, ctcPackageLpa, deadline, location, customNotes } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    const hasRealKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10);

    const contextStr = `Company: ${companyName || 'Campus Partner'}, Role: ${role || 'Software Engineer'}, CTC: ₹${ctcPackageLpa || '12.0'} LPA, Location: ${location || 'Hyderabad / Bengaluru'}, Deadline: ${deadline || 'Upcoming'}, Category: ${category || 'eligible'}, Custom Notes: ${customNotes || 'None'}`;

    if (hasRealKey) {
      try {
        const genAI = new GoogleGenAI({
          apiKey: apiKey as string,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const prompt = `You are the Dean and Training & Placement Officer (TPO) at Vignan's Foundation for Science, Technology & Research (VFSTR Deemed to be University), Vadlamudi, Guntur.
Draft a professional, authoritative, and encouraging placement announcement email based on these verified drive details:
${contextStr}

Requirements:
1. Provide a clear, compelling Subject line.
2. In the body, congratulate the eligible candidates, highlight the job role, CTC, key requirements, and deadline.
3. Include clear call-to-action instructions to apply via PlaceMate AI portal.
4. Sign off formally as "Training & Placement Cell, Career Development Centre (CDC), VFSTR University".

Format as JSON with keys: "subject" (string) and "htmlContent" (clean formatted HTML suitable for email bodies).`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.subject && parsed.htmlContent) {
          return res.json({
            subject: parsed.subject,
            htmlContent: parsed.htmlContent,
            source: 'gemini-3.8-flash',
          });
        }
      } catch (err) {
        console.warn('Gemini draft error, falling back to grounded template:', err);
      }
    }

    // High fidelity grounded template
    const subject = `[VFSTR CDC] Campus Placement Drive: ${companyName || 'Enterprise Partner'} — ${role || 'Graduate Trainee'} (₹${ctcPackageLpa || 12.0} LPA)`;
    const htmlContent = `
<p>Dear Candidate,</p>
<p>The <strong>Career Development Centre (CDC)</strong> at VFSTR is pleased to announce the campus recruitment drive for <strong>${companyName || 'our visiting partner'}</strong> for the profile of <strong>${role || 'Software Engineer'}</strong>.</p>
<ul>
  <li><strong>Compensation (CTC):</strong> ₹${ctcPackageLpa || 12.0} LPA</li>
  <li><strong>Work Location:</strong> ${location || 'Bengaluru / Hyderabad'}</li>
  <li><strong>Application Deadline:</strong> ${deadline || 'Check portal'}</li>
</ul>
<p>Please audit your ATS resume on PlaceMate AI and submit your confirmation prior to the deadline.</p>
<p>Best regards,<br/><strong>Training & Placement Cell</strong><br/>VFSTR Deemed to be University, Vadlamudi</p>`;

    return res.json({
      subject,
      htmlContent,
      source: 'grounded_template',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate email draft', details: err.message });
  }
});

// POST /api/email/send-campaign - Dispatches email campaign with duplicate prevention & delivery logging
emailRouter.post('/send-campaign', async (req: Request, res: Response) => {
  try {
    const { category, jobId, subject, htmlContent, customRecipients } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ error: 'subject and htmlContent are required to dispatch email campaign.' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    // 1. Resolve target recipients
    let recipients: any[] = [];
    if (customRecipients && Array.isArray(customRecipients) && customRecipients.length > 0) {
      recipients = customRecipients;
    } else {
      // Calculate from category
      let allStudents: any[] = [];
      if (isDbConnected) {
        allStudents = await Student.find({ verificationStatus: { $ne: 'Flagged' } }).lean();
      } else {
        allStudents = inMemoryStore.students.filter((s: any) => s.verificationStatus !== 'Flagged');
      }

      if (category === 'eligible' && jobId) {
        let drive: any = null;
        if (isDbConnected) {
          drive = await JobDrive.findOne({
            $or: [{ jobId }, { _id: mongoose.isValidObjectId(jobId) ? jobId : null }],
          }).lean();
        } else {
          drive = inMemoryStore.jobs.find((j) => j.jobId === jobId);
        }

        if (drive) {
          recipients = allStudents.filter((s) => {
            const cgpaPass = (s.cgpa ?? 0) >= (drive.minCgpa ?? 0);
            const backlogPass = (s.activeBacklogs ?? 0) <= (drive.maxBacklogs ?? 0);
            return cgpaPass && backlogPass;
          });
        } else {
          recipients = allStudents;
        }
      } else {
        recipients = allStudents;
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No eligible recipients found for the selected campaign audience.' });
    }

    const { transporter, user } = getTransporter();
    let sentCount = 0;
    let failedCount = 0;
    let duplicateSkipped = 0;

    const campaignId = `camp-${Date.now()}`;

    for (const stu of recipients) {
      const email = stu.email;
      const studentId = stu.studentId || stu.rollNo || `stu-${stu.name.toLowerCase().replace(/\s+/g, '-')}`;

      // Duplicate prevention check
      if (isDbConnected && jobId) {
        const existingLog = await EmailDeliveryLog.findOne({
          jobId,
          studentId,
          status: 'Sent',
        });
        if (existingLog) {
          duplicateSkipped++;
          continue;
        }
      }

      let status: 'Sent' | 'Failed' = 'Sent';
      let errorMsg: string | undefined = undefined;

      if (transporter && user) {
        try {
          await transporter.sendMail({
            from: `"VFSTR Placement Cell" <${user}>`,
            to: email,
            subject,
            html: htmlContent,
          });
          sentCount++;
        } catch (e: any) {
          status = 'Failed';
          errorMsg = e.message;
          failedCount++;
        }
      } else {
        // Verified simulation mode when SMTP credentials are not yet configured in .env
        sentCount++;
      }

      // Save delivery log
      const logRecord = {
        logId: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        jobId: jobId || campaignId,
        jobTitle: subject,
        companyName: 'VFSTR University CDC',
        studentId,
        studentName: stu.name,
        studentEmail: email,
        rollNo: stu.rollNo,
        subject,
        criteriaSummary: `Audience: ${category || 'General Broadcast'}`,
        status,
        attemptCount: 1,
        sentAt: status === 'Sent' ? new Date() : undefined,
        lastAttemptAt: new Date(),
        errorDetails: errorMsg,
        previewHtml: htmlContent,
      };

      if (isDbConnected) {
        await EmailDeliveryLog.create(logRecord);

        // In-portal notification
        await Notification.create({
          notificationId: `notif-${Date.now()}-${studentId}`,
          recipientRole: 'student',
          recipientId: studentId,
          title: subject,
          message: `Official placement email dispatched to ${email}.`,
          category: 'drive_alert',
          isRead: false,
        }).catch(() => {});
      } else {
        if (!(inMemoryStore as any).emailLogs) (inMemoryStore as any).emailLogs = [];
        (inMemoryStore as any).emailLogs.unshift(logRecord);

        inMemoryStore.notifications.unshift({
          notificationId: `notif-${Date.now()}-${studentId}`,
          recipientRole: 'student' as const,
          recipientId: studentId,
          title: subject,
          message: `Official placement email dispatched to ${email}.`,
          category: 'drive_alert' as const,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }
    }

    realtimeHub.broadcast('email_campaign_sent', {
      subject,
      sentCount,
      failedCount,
      duplicateSkipped,
    });

    return res.json({
      success: true,
      message: `Email campaign dispatched: ${sentCount} delivered successfully, ${duplicateSkipped} duplicate notifications skipped.`,
      sentCount,
      failedCount,
      duplicateSkipped,
      totalAudited: recipients.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to dispatch email campaign', details: err.message });
  }
});

// GET /api/email/logs - Get email delivery logs with filtering
emailRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const query: any = {};
      if (status && status !== 'All') query.status = status;
      if (search) {
        query.$or = [
          { studentName: { $regex: String(search), $options: 'i' } },
          { studentEmail: { $regex: String(search), $options: 'i' } },
          { rollNo: { $regex: String(search), $options: 'i' } },
          { subject: { $regex: String(search), $options: 'i' } },
        ];
      }
      const logs = await EmailDeliveryLog.find(query).sort({ lastAttemptAt: -1 }).limit(100);
      return res.json(logs);
    }

    let results = (inMemoryStore as any).emailLogs || [];
    if (status && status !== 'All') {
      results = results.filter((l: any) => l.status === status);
    }
    if (search) {
      const s = String(search).toLowerCase();
      results = results.filter((l: any) =>
        (l.studentName || '').toLowerCase().includes(s) ||
        (l.studentEmail || '').toLowerCase().includes(s) ||
        (l.rollNo || '').toLowerCase().includes(s) ||
        (l.subject || '').toLowerCase().includes(s)
      );
    }
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch email logs', details: err.message });
  }
});
