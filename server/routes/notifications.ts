import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { inMemoryStore } from '../db';

export const notificationRouter = Router();

// GET notifications
notificationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query: any = {};
      if (role) {
        query.$or = [{ recipientRole: role }, { recipientRole: 'all' }];
      }
      const notifications = await Notification.find(query).sort({ createdAt: -1 });
      return res.json(notifications);
    }

    let results = [...inMemoryStore.notifications];
    if (role) {
      results = results.filter((n) => n.recipientRole === role || n.recipientRole === 'all');
    }
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// GET notifications for a specific student
notificationRouter.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    if (mongoose.connection.readyState === 1) {
      const notifs = await Notification.find({
        $or: [
          { recipientId: studentId },
          { recipientRole: 'student' },
          { recipientRole: 'all' },
        ],
      }).sort({ createdAt: -1 });
      return res.json(notifs);
    }

    const results = inMemoryStore.notifications.filter(
      (n) => n.recipientId === studentId || n.recipientRole === 'student' || n.recipientRole === 'all'
    );
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch student notifications', details: err.message });
  }
});

// GET all email delivery logs (for TPO and Student history)
notificationRouter.get('/email-logs', async (req: Request, res: Response) => {
  try {
    const { studentId, jobId } = req.query;
    if (mongoose.connection.readyState === 1) {
      const { EmailDeliveryLog } = await import('../models/EmailDeliveryLog');
      const query: any = {};
      if (studentId) query.studentId = String(studentId);
      if (jobId) query.jobId = String(jobId);

      const logs = await EmailDeliveryLog.find(query).sort({ lastAttemptAt: -1 }).limit(100);
      return res.json(logs);
    }
    return res.json([]);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to query email delivery logs', details: err.message });
  }
});

// POST new notification
notificationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.title || !body.message) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    const newNotif = {
      notificationId: body.notificationId || `notif-${Date.now()}`,
      recipientRole: body.recipientRole || 'all',
      recipientId: body.recipientId || '',
      title: body.title,
      message: body.message,
      category: body.category || 'drive_alert',
      isRead: false,
      link: body.link || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Notification.create(newNotif);
      return res.status(201).json(created);
    }

    inMemoryStore.notifications.unshift(newNotif as any);
    return res.status(201).json(newNotif);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create notification', details: err.message });
  }
});

// PATCH mark as read
notificationRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const updated = await Notification.findOneAndUpdate(
        { $or: [{ notificationId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        { isRead: true, updatedAt: new Date() },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Notification not found' });
      return res.json(updated);
    }

    const index = inMemoryStore.notifications.findIndex((n) => n.notificationId === id);
    if (index === -1) return res.status(404).json({ error: 'Notification not found' });

    inMemoryStore.notifications[index].isRead = true;
    return res.json(inMemoryStore.notifications[index]);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update notification', details: err.message });
  }
});

// POST retry failed email dispatch
notificationRouter.post('/retry-email/:logId', async (req: Request, res: Response) => {
  try {
    const logId = req.params.logId;
    if (mongoose.connection.readyState === 1) {
      const { EmailDeliveryLog } = await import('../models/EmailDeliveryLog');
      const log = await EmailDeliveryLog.findOne({ logId });
      if (!log) return res.status(404).json({ error: 'Email delivery log not found' });

      const { JobDrive } = await import('../models/JobDrive');
      const job = await JobDrive.findOne({ jobId: log.jobId });
      if (!job) return res.status(404).json({ error: 'Associated job drive not found' });

      const { sendPlacementNotificationEmail } = await import('../services/emailService');
      const sendResult = await sendPlacementNotificationEmail({
        studentName: log.studentName,
        studentEmail: log.studentEmail,
        rollNo: log.rollNo,
        companyName: log.companyName,
        role: log.jobTitle,
        ctcPackageLpa: job.ctcPackageLpa,
        location: job.location,
        workMode: job.workMode,
        deadline: job.deadline,
        minCgpa: job.minCgpa,
        maxBacklogs: job.maxBacklogs,
        requiredSkills: job.requiredSkills,
        jobId: job.jobId,
      });

      log.status = sendResult.status;
      log.attemptCount += 1;
      log.lastAttemptAt = new Date();
      if (sendResult.status === 'Sent') {
        log.sentAt = new Date();
        log.errorDetails = undefined;
      } else {
        log.errorDetails = sendResult.error;
      }
      await log.save();

      return res.json({ success: sendResult.success, log });
    }

    return res.json({ success: true, message: 'Retry simulated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Retry failed', details: err.message });
  }
});
