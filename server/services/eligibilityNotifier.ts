import mongoose from 'mongoose';
import { Student } from '../models/Student';
import { Notification } from '../models/Notification';
import { EmailDeliveryLog } from '../models/EmailDeliveryLog';
import { sendPlacementNotificationEmail } from './emailService';

export interface NotifyResult {
  jobId: string;
  companyName: string;
  totalStudentsAudited: number;
  eligibleCount: number;
  emailsSent: number;
  emailsFailed: number;
  alreadyNotifiedCount: number;
  eligibleStudentNames: string[];
}

export async function notifyEligibleStudentsForJob(job: any): Promise<NotifyResult> {
  const result: NotifyResult = {
    jobId: job.jobId || job.id,
    companyName: job.companyName,
    totalStudentsAudited: 0,
    eligibleCount: 0,
    emailsSent: 0,
    emailsFailed: 0,
    alreadyNotifiedCount: 0,
    eligibleStudentNames: [],
  };

  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let students: any[] = [];

    if (isDbConnected) {
      students = await Student.find({});
    }

    // If no students in DB or DB not connected, retrieve from seed store
    if (!students || students.length === 0) {
      const { inMemoryStore } = await import('../db');
      students = inMemoryStore.students;
    }

    result.totalStudentsAudited = students.length;

    for (const student of students) {
      // 1. Evaluate Academic Eligibility Rules
      const passesCgpa = (student.cgpa || 0) >= (job.minCgpa || 0);
      const passesBacklogs = (student.activeBacklogs ?? 0) <= (job.maxBacklogs ?? 0);
      
      let passesDepartment = true;
      if (job.eligibleDepartments && Array.isArray(job.eligibleDepartments) && job.eligibleDepartments.length > 0) {
        passesDepartment = job.eligibleDepartments.includes(student.department);
      }

      const isEligible = passesCgpa && passesBacklogs && passesDepartment;

      if (!isEligible) {
        continue;
      }

      result.eligibleCount++;
      result.eligibleStudentNames.push(student.name);

      const targetEmail = student.email;
      const targetRoll = student.rollNo;
      const criteriaSummary = `CGPA ≥ ${job.minCgpa} (Student: ${student.cgpa}), Backlogs ≤ ${job.maxBacklogs} (Student: ${student.activeBacklogs || 0}), Dept: ${student.department}`;

      // 2. Check Deduplication in MongoDB
      if (isDbConnected) {
        const existingLog = await EmailDeliveryLog.findOne({
          jobId: result.jobId,
          studentId: student.studentId,
        });

        if (existingLog && existingLog.status === 'Sent') {
          result.alreadyNotifiedCount++;
          continue;
        }
      }

      // 3. Send Personalized Placement Email via Gmail Service
      const sendResult = await sendPlacementNotificationEmail({
        studentName: student.name,
        studentEmail: targetEmail,
        rollNo: targetRoll,
        companyName: job.companyName,
        role: job.role,
        ctcPackageLpa: job.ctcPackageLpa,
        location: job.location || 'Campus / Multiple Locations',
        workMode: job.workMode || 'Full-Time',
        deadline: job.deadline || new Date(Date.now() + 7 * 86400000),
        minCgpa: job.minCgpa || 7.0,
        maxBacklogs: job.maxBacklogs ?? 0,
        requiredSkills: job.requiredSkills || [],
        jobId: result.jobId,
      });

      // 4. Save Delivery Log in MongoDB
      if (isDbConnected) {
        await EmailDeliveryLog.findOneAndUpdate(
          { jobId: result.jobId, studentId: student.studentId },
          {
            logId: `log-${result.jobId}-${student.studentId}`,
            jobId: result.jobId,
            jobTitle: job.role,
            companyName: job.companyName,
            studentId: student.studentId,
            studentName: student.name,
            studentEmail: targetEmail,
            rollNo: targetRoll,
            subject: sendResult.subject,
            criteriaSummary,
            status: sendResult.status,
            attemptCount: 1,
            sentAt: sendResult.status === 'Sent' ? new Date() : undefined,
            lastAttemptAt: new Date(),
            errorDetails: sendResult.error,
            previewHtml: sendResult.previewHtml,
          },
          { upsert: true, new: true }
        );

        // 5. Create in-portal Student Notification
        await Notification.create({
          notificationId: `notif-${Date.now()}-${student.studentId}`,
          recipientRole: 'student',
          recipientId: student.studentId,
          title: `Eligible Drive: ${job.companyName} (${job.role})`,
          message: `Official placement email dispatched to ${targetEmail}. Verified eligible with CGPA ${student.cgpa}. CTC: ₹${job.ctcPackageLpa} LPA.`,
          category: 'drive_alert',
          isRead: false,
          link: `tab=job-recommendations&jobId=${result.jobId}`,
        }).catch((e) => console.log('Notification create notice:', e.message));
      }

      if (sendResult.success) {
        result.emailsSent++;
      } else {
        result.emailsFailed++;
      }
    }
  } catch (err: any) {
    console.error('Error during eligibility notification run:', err);
  }

  return result;
}
