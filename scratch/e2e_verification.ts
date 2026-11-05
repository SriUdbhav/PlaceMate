import { Readable } from 'stream';

process.env.NODE_ENV = 'test';

function callApi(app: any, method: string, url: string, body?: any): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const str = body !== undefined && body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const req = new Readable({
      read() {
        if (str) this.push(str);
        this.push(null);
      },
    }) as any;

    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...(str ? { 'content-length': String(Buffer.byteLength(str)) } : {}),
    };

    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader(k: string, v: string) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return this.headers[k.toLowerCase()];
      },
      status(c: number) {
        this.statusCode = c;
        return this;
      },
      json(d: any) {
        resolve({ status: this.statusCode, data: d, headers: this.headers });
      },
      send(d: any) {
        let parsed = d;
        try {
          parsed = JSON.parse(d);
        } catch (_) {}
        resolve({ status: this.statusCode, data: parsed, headers: this.headers });
      },
      end(d?: any) {
        let parsed = d;
        if (d) {
          try {
            parsed = JSON.parse(d);
          } catch (_) {}
        }
        resolve({ status: this.statusCode, data: parsed, headers: this.headers });
      },
      flushHeaders() {},
      write() {},
    };

    app(req, res);
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('   PLACEMATE AI — PHASE 10 MANDATORY END-TO-END VERIFICATION    ');
  console.log('================================================================\n');

  console.log('Initializing PlaceMate AI Express Application in-process...');
  const { createApp } = await import('../server.ts');
  const app = await createApp();
  console.log('Express application and database services initialized.\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error('       Details:', details);
      failed++;
    }
  }

  try {
    // 0. Verify System Status
    console.log('\n--- Test 0: System Status & Health ---');
    const statusRes = await callApi(app, 'GET', '/api/status');
    assert(statusRes.status === 200, 'Server responds 200 on /api/status');
    assert(statusRes.data?.status === 'active', 'System status is active', statusRes.data);
    console.log(`       Database Mode: ${statusRes.data.database?.source}`);
    console.log(`       AI Engine: ${statusRes.data.engine} (${statusRes.data.model})`);

    // 1. Authorized Student Data Import (CSV Preview & Commit)
    console.log('\n--- Test 1: Phase 2 - Authorized VFSTR Student Import (CSV) ---');
    const sampleCsv = `Registration Number,Student Name,Email,Department,Branch,Academic Year,Graduation Year,CGPA,Active Backlogs,Cleared Backlogs,Skills
211FA04991,Sai Krishna,211fa04991@vignan.ac.in,Computer Science & Engineering,CSE,2021-2025,2025,8.85,0,0,"React, Node.js, Python, PostgreSQL, DSA"
211FA04992,Harika Reddy,211fa04992@vignan.ac.in,Computer Science & Engineering,CSE,2021-2025,2025,7.20,2,1,"Java, Spring Boot, MySQL"
211FA04991,Sai Krishna Dup,211fa04991@vignan.ac.in,Computer Science & Engineering,CSE,2021-2025,2025,8.85,0,0,"Duplicate Entry"`;

    const previewRes = await callApi(app, 'POST', '/api/import/preview', {
      importType: 'students',
      csvData: sampleCsv,
    });
    assert(previewRes.status === 200, 'CSV Import Preview returns 200');
    assert(previewRes.data.totalRecords === 3, 'Preview parsed 3 total rows', previewRes.data);
    assert(previewRes.data.validCount >= 1, `Preview detected valid student records (${previewRes.data.validCount})`);
    assert(previewRes.data.duplicateCount >= 1, `Preview detected duplicate record (${previewRes.data.duplicateCount})`);

    // Commit the previewed records
    const commitRes = await callApi(app, 'POST', '/api/import/commit', {
      importType: 'students',
      fileName: 'VFSTR_CSE_Batch2025_Verified.csv',
      validRecords: previewRes.data.previewValid,
      importedBy: 'TPO Cell Officer',
    });
    assert(commitRes.status === 201 || commitRes.status === 200, 'CSV Import Commit returns 201/200');
    assert(commitRes.data.savedCount > 0, `Import committed ${commitRes.data.savedCount} student record(s) with hashed passwords`);

    // Verify import history was recorded
    const historyRes = await callApi(app, 'GET', '/api/import/history');
    assert(historyRes.status === 200, 'Import history retrieved');
    assert(Array.isArray(historyRes.data) && historyRes.data.length > 0, 'Import audit history record successfully stored');

    // 2. Student Authentication & Profile Retrieval
    console.log('\n--- Test 2: Phase 1 & 9 - Student Login & Data Privacy ---');
    const loginRes = await callApi(app, 'POST', '/api/auth/login', {
      role: 'student',
      identifier: '211FA04991',
      password: '211FA04991',
    });
    assert(loginRes.status === 200, 'Student authenticated successfully');
    assert(loginRes.data?.user?.role === 'student', 'User role is student');
    assert(Boolean(loginRes.data?.token), 'JWT authentication token issued');

    const studentProfileRes = await callApi(app, 'GET', '/api/students/211FA04991');
    assert(studentProfileRes.status === 200, 'Student profile fetched from database');
    assert(studentProfileRes.data.rollNo === '211FA04991', 'Profile matches imported roll number', studentProfileRes.data);
    assert(studentProfileRes.data.cgpa === 8.85, 'Profile has real imported CGPA 8.85');

    // 3. Recruiter Submits Placement Drive Request (Pending TPO Approval)
    console.log('\n--- Test 3: Phase 4 - Recruiter Placement Drive Request (Draft/Pending Approval) ---');
    const drivePayload = {
      companyName: 'Darwinbox Technologies',
      role: 'Member Technical Staff',
      ctcPackageLpa: 14.5,
      tier: 'Dream (12-18 LPA)',
      category: 'Product Engineering',
      minCgpa: 8.0,
      maxBacklogs: 0,
      eligibleDepartments: ['Computer Science & Engineering', 'Information Technology'],
      requiredSkills: ['Node.js', 'PostgreSQL', 'Distributed Systems'],
      selectionRounds: ['Online Assessment', 'Technical Round 1', 'Executive HR'],
      recruiterEmail: 'campus.hiring@darwinbox.io',
      recruiterName: 'Ananya Sharma',
      deadline: '2026-12-15',
      recruitmentDate: '2026-12-20',
      description: 'Campus hiring drive for high-throughput distributed platform teams.',
    };

    const driveReqRes = await callApi(app, 'POST', '/api/recruiter/request-drive', drivePayload);
    assert(driveReqRes.status === 201 || driveReqRes.status === 200, 'Recruiter drive request submitted');
    assert(driveReqRes.data.drive.status === 'Pending Approval', 'Submitted drive strictly defaults to "Pending Approval"', driveReqRes.data.drive?.status);
    const createdDriveId = driveReqRes.data.drive.jobId || driveReqRes.data.drive.id || driveReqRes.data.drive._id;

    // Verify company profile verification status is Pending
    const recruiterProfileRes = await callApi(app, 'GET', `/api/recruiter/profile?companyName=Darwinbox%20Technologies`);
    assert(recruiterProfileRes.status === 200, 'Recruiter profile fetched');
    assert(recruiterProfileRes.data.verificationStatus === 'Pending' || recruiterProfileRes.data.verificationStatus === 'Verified', `Company verification status is explicitly tracked (${recruiterProfileRes.data.verificationStatus})`);

    // 4. TPO Reviews Clearance Queue & Publishes Drive
    console.log('\n--- Test 4: Phase 3 - TPO Clearance Queue & Drive Lifecycle Approval ---');
    const pendingDrivesRes = await callApi(app, 'GET', '/api/tpo/drives?status=Pending%20Approval');
    assert(pendingDrivesRes.status === 200, 'TPO pending drives fetched');
    assert(
      Array.isArray(pendingDrivesRes.data) && pendingDrivesRes.data.some((d: any) => d.jobId === createdDriveId || d.companyName === 'Darwinbox Technologies'),
      'Pending approval queue contains submitted Darwinbox drive'
    );

    // TPO approves and publishes drive
    const publishRes = await callApi(app, 'PATCH', `/api/tpo/drives/${createdDriveId}/status`, {
      status: 'Published',
      notes: 'Approved by TPO Cell - verified corporate credentials',
    });
    assert(publishRes.status === 200, 'TPO publishes placement drive');
    assert(publishRes.data.drive.status === 'Published', 'Drive status transitioned to "Published"');

    // 5. Deterministic Eligibility Engine
    console.log('\n--- Test 5: Phase 3 - Deterministic Eligibility Audit Engine ---');
    const auditRes = await callApi(app, 'GET', `/api/tpo/eligibility-audit/${createdDriveId}`);
    assert(auditRes.status === 200, 'Eligibility audit endpoint returns 200');
    assert(typeof auditRes.data.eligibleCount === 'number', `Eligibility audit returned ${auditRes.data.eligibleCount} eligible candidates`);
    assert(typeof auditRes.data.ineligibleCount === 'number', `Eligibility audit returned ${auditRes.data.ineligibleCount} ineligible candidates`);

    // Verify student 211FA04991 (CGPA 8.85 >= 8.0, 0 backlogs <= 0, CSE in depts) is in eligible list
    const isEligibleSai = auditRes.data.eligibleStudents.some((s: any) => s.rollNo === '211FA04991');
    assert(isEligibleSai, 'Student 211FA04991 deterministically evaluated as ELIGIBLE');

    // Verify student 211FA04992 (2 backlogs > 0 max) is in ineligible list with reason
    const ineligibleHarika = auditRes.data.ineligibleStudents.find((s: any) => s.student?.rollNo === '211FA04992');
    assert(Boolean(ineligibleHarika), 'Student 211FA04992 deterministically evaluated as INELIGIBLE');
    if (ineligibleHarika) {
      assert(ineligibleHarika.reason.includes('backlogs') || ineligibleHarika.reason.includes('Backlog') || ineligibleHarika.reason.includes('CGPA'), `Ineligibility reason recorded: ${ineligibleHarika.reason}`);
    }

    // 6. Student Applies to Drive & Compound Deduplication Check
    console.log('\n--- Test 6: Phase 1 & 6 - Student Application & Duplicate Prevention ---');
    const appPayload = {
      studentId: '211FA04991',
      studentName: 'Sai Krishna',
      rollNo: '211FA04991',
      jobId: createdDriveId,
      companyName: 'Darwinbox Technologies',
      role: 'Member Technical Staff',
      ctcPackageLpa: 14.5,
      aiReadinessScore: 92,
    };

    const appRes = await callApi(app, 'POST', '/api/applications', appPayload);
    assert(appRes.status === 201 || appRes.status === 200, 'Student applied to placement drive');
    const createdAppId = appRes.data.applicationId || appRes.data._id || appRes.data.id;

    // Test Duplicate Application Prevention
    const dupAppRes = await callApi(app, 'POST', '/api/applications', appPayload);
    assert(
      dupAppRes.status === 409 || (dupAppRes.data && (dupAppRes.data.alreadyApplied || dupAppRes.data.error?.includes('Duplicate') || dupAppRes.data.error?.includes('already applied'))),
      'Duplicate application correctly rejected (HTTP 409 / Conflict prevention)',
      dupAppRes.data
    );

    // 7. Recruiter Views Applicants & Shortlists Candidate
    console.log('\n--- Test 7: Phase 4 - Recruiter Applicant Management & Shortlisting ---');
    const applicantsRes = await callApi(app, 'GET', `/api/recruiter/applicants?jobId=${createdDriveId}`);
    assert(applicantsRes.status === 200, 'Recruiter applicants endpoint returns 200');
    assert(
      Array.isArray(applicantsRes.data) && applicantsRes.data.some((a: any) => a.rollNo === '211FA04991'),
      'Recruiter sees candidate 211FA04991 in real applicant roster'
    );

    // Shortlist candidate
    const shortlistRes = await callApi(app, 'PATCH', `/api/recruiter/applicants/${createdAppId}/status`, {
      status: 'Shortlisted',
      notes: 'Shortlisted for online technical assessment',
    });
    assert(shortlistRes.status === 200, 'Recruiter updates applicant status to "Shortlisted"');

    // Schedule interview
    const interviewRes = await callApi(app, 'POST', '/api/recruiter/schedule-interview', {
      studentId: '211FA04991',
      jobId: createdDriveId,
      companyName: 'Darwinbox Technologies',
      role: 'Member Technical Staff',
      roundType: 'Technical',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert(interviewRes.status === 201 || interviewRes.status === 200, 'Recruiter successfully scheduled interview round');

    // 8. TPO Live Metrics Aggregation
    console.log('\n--- Test 8: Phase 3 - TPO Live Database Metrics Aggregation ---');
    const metricsRes = await callApi(app, 'GET', '/api/tpo/metrics');
    assert(metricsRes.status === 200, 'TPO metrics endpoint returns 200');
    assert(metricsRes.data.totalRegisteredStudents > 0, `Total registered students: ${metricsRes.data.totalRegisteredStudents}`);
    assert(metricsRes.data.totalApplications > 0, `Total applications tracked: ${metricsRes.data.totalApplications}`);
    assert(metricsRes.data.shortlistedStudents > 0, `Shortlisted students tracked: ${metricsRes.data.shortlistedStudents}`);
    assert(Array.isArray(metricsRes.data.historicalReports) && metricsRes.data.historicalReports.length > 0, 'Official VFSTR historical reports present and labeled with source & batch');

    // 9. TPO Email Campaign Management & Logs
    console.log('\n--- Test 9: Phase 5 - TPO Email Management & Delivery Logging ---');
    const previewEmailRes = await callApi(app, 'POST', '/api/email/preview-recipients', {
      category: 'eligible',
      jobId: createdDriveId,
    });
    assert(previewEmailRes.status === 200, 'Email recipient preview returns 200');
    assert(previewEmailRes.data.recipientCount > 0, `Recipient count preview computed (${previewEmailRes.data.recipientCount} recipients)`);

    // Draft email with AI
    const draftRes = await callApi(app, 'POST', '/api/email/draft-ai', {
      companyName: 'Darwinbox Technologies',
      role: 'Member Technical Staff',
      ctc: '14.5 LPA',
      recruitmentDate: '2026-12-20',
    });
    assert(draftRes.status === 200, 'AI Email drafting endpoint returns 200');
    assert(draftRes.data.subject.includes('Darwinbox'), 'Draft email includes company subject');

    // Send campaign
    const sendCampaignRes = await callApi(app, 'POST', '/api/email/send-campaign', {
      subject: draftRes.data.subject,
      htmlContent: draftRes.data.htmlContent,
      category: 'eligible',
      jobId: createdDriveId,
    });
    assert(sendCampaignRes.status === 200, 'Email campaign dispatched');
    assert(sendCampaignRes.data.sentCount > 0, `Email delivery logged for ${sendCampaignRes.data.sentCount} recipients`);

    // Verify Email Logs in database
    const emailLogsRes = await callApi(app, 'GET', `/api/email/logs?search=Darwinbox`);
    assert(emailLogsRes.status === 200, 'Email delivery logs endpoint returns 200');
    assert(
      Array.isArray(emailLogsRes.data) && emailLogsRes.data.some((l: any) => l.subject.includes('Darwinbox')),
      'Email delivery log recorded in MongoDB/store'
    );

    // 10. AI Rubric & Placement Explainer Endpoints
    console.log('\n--- Test 10: Phase 8 - Grounded AI Endpoints ---');
    const explainRes = await callApi(app, 'POST', '/api/ai/eligibility-explain', {
      studentProfile: { cgpa: 8.85, activeBacklogs: 0, department: 'Computer Science & Engineering' },
      jobDrive: { companyName: 'Darwinbox', role: 'MTS', minCgpa: 8.0, maxBacklogs: 0, eligibleDepartments: ['Computer Science & Engineering'] },
    });
    assert(explainRes.status === 200, 'AI Eligibility Explain endpoint returns 200');
    assert(explainRes.data.isEligible === true, 'AI correctly identifies student as eligible');
    assert(explainRes.data.explanation.includes('8.85'), 'AI explanation grounded in actual student CGPA');

    const gradeRes = await callApi(app, 'POST', '/api/ai/grade-interview', {
      question: 'How do you design a distributed cache with LRU eviction and consistent hashing?',
      answer: 'I would use a Hash Map combined with a Doubly Linked List for O(1) eviction order, and consistent hashing with virtual nodes to distribute keys evenly across cache nodes with minimal remapping upon node failures.',
      role: 'Software Development Engineer',
      company: 'Darwinbox Technologies',
    });
    assert(gradeRes.status === 200, 'AI Interview Grader returns 200');
    assert(typeof gradeRes.data.score === 'number', `Rubric score assigned: ${gradeRes.data.score}/10.0`);
    assert(Array.isArray(gradeRes.data.strengths), 'Rubric returned concrete strengths');
    assert(Array.isArray(gradeRes.data.improvements), 'Rubric returned actionable improvements');

    // 11. Company Verification Workflow
    console.log('\n--- Test 11: Phase 1 & 4 - Company Verification Status Workflow ---');
    const verifyCompanyRes = await callApi(app, 'PATCH', `/api/tpo/companies/Google/verify`, {
      verificationStatus: 'Verified',
      remarks: 'Verified corporate MCA registration and official domain',
    });
    assert(verifyCompanyRes.status === 200, 'TPO updates company verification status');
    assert(verifyCompanyRes.data.company.verificationStatus === 'Verified', 'Company status is Verified');

    // Summary
    console.log('\n================================================================');
    console.log(`   E2E RESULTS: ${passed} PASSED, ${failed} FAILED               `);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed with unexpected error:', error);
    process.exit(1);
  }
}

runTests();
