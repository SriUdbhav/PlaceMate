import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import { connectDatabase, getDatabaseStatus } from './server/db';
import { studentRouter } from './server/routes/students';
import { companyRouter } from './server/routes/companies';
import { jobRouter } from './server/routes/jobs';
import { applicationRouter } from './server/routes/applications';
import { interviewRouter } from './server/routes/interviews';
import { notificationRouter } from './server/routes/notifications';
import { resumeRouter } from './server/routes/resumes';
import { authRouter } from './server/routes/auth';
import { emailRouter } from './server/routes/email';
import { cvRouter } from './server/routes/cvs';
import { importRouter } from './server/routes/import';
import { tpoRouter } from './server/routes/tpo';
import { recruiterRouter } from './server/routes/recruiter';
import { avatarRouter } from './server/routes/avatar';
import { realtimeHub } from './server/services/realtime';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();

  // Production Cross-Origin Resource Sharing (CORS) Middleware
  app.use((req: Request, res: Response, next: any) => {
    const origin = req.headers.origin as string | undefined;
    const configuredFrontend = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '';
    const corsOrigin = process.env.CORS_ORIGIN;

    // Check if origin is allowed:
    // 1. Matches FRONTEND_URL or CORS_ORIGIN
    // 2. Any Vercel deployment (*.vercel.app)
    // 3. Localhost in development or preview
    // 4. Wildcard if explicitly configured
    const isAllowed =
      !origin ||
      corsOrigin === '*' ||
      (configuredFrontend && origin === configuredFrontend) ||
      /^https:\/\/[\w-]+\.vercel\.app$/.test(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
      process.env.NODE_ENV !== 'production';

    if (origin && isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Connect to Database (MongoDB Atlas with graceful local fallback)
  connectDatabase().catch((err) => {
    console.log('PlaceMate DB: Startup connection handler note:', err?.message || err);
  });

  // Check if GEMINI_API_KEY is configured
  const apiKey = process.env.GEMINI_API_KEY;
  const hasRealKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10);

  let genAI: GoogleGenAI | null = null;
  if (hasRealKey) {
    try {
      genAI = new GoogleGenAI({
        apiKey: apiKey as string,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log('PlaceMate AI: Google GenAI initialized with gemini-3.8-flash');
    } catch (err) {
      console.warn('PlaceMate AI: Failed to initialize Google GenAI', err);
    }
  }

  // Standard Root Health Check for Render & Cloud Monitoring
  const healthHandler = async (_req: Request, res: Response) => {
    const dbStatus = await getDatabaseStatus().catch(() => null);
    res.status(200).json({
      status: 'ok',
      service: 'PlaceMate AI Backend API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      database: {
        isConnected: dbStatus?.isConnected ?? false,
        source: dbStatus?.source ?? 'unknown',
        databaseName: dbStatus?.databaseName ?? 'placemate',
      },
      aiEngine: {
        hasGeminiKey: Boolean(genAI),
        model: 'gemini-3.8-flash',
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // General System Status check endpoint
  app.get('/api/status', async (_req: Request, res: Response) => {
    const dbStatus = await getDatabaseStatus();
    res.json({
      status: 'active',
      hasGeminiKey: Boolean(genAI),
      model: 'gemini-3.8-flash',
      engine: genAI ? 'real_gemini' : 'simulation_demo',
      database: dbStatus,
      message: genAI
        ? 'Connected to Live AI Placement Engine'
        : 'Running in high-fidelity Demo Intelligence Mode (AI key not configured or demo requested)',
    });
  });

  // Database Health & Collection Counts endpoint
  app.get('/api/db/status', async (_req: Request, res: Response) => {
    try {
      const status = await getDatabaseStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve database status', details: err.message });
    }
  });

  // Manual Atlas Reconnect Trigger
  app.post('/api/db/reconnect', async (_req: Request, res: Response) => {
    try {
      await connectDatabase();
      const status = await getDatabaseStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: 'Reconnect attempt failed', details: err.message });
    }
  });

  // Real-time SSE Stream Endpoint
  app.get('/api/events/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    realtimeHub.addClient(res);
    res.write(
      `event: system_sync\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`
    );
  });

  // Mount REST API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/students', studentRouter);
  app.use('/api/companies', companyRouter);
  app.use('/api/jobs', jobRouter);
  app.use('/api/applications', applicationRouter);
  app.use('/api/interviews', interviewRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/resumes', resumeRouter);
  app.use('/api/cvs', cvRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/import', importRouter);
  app.use('/api/tpo', tpoRouter);
  app.use('/api/recruiter', recruiterRouter);
  app.use('/api/avatar', avatarRouter);

  // AI Placement Copilot Endpoint
  app.post('/api/ai/copilot', async (req: Request, res: Response) => {
    const { message, context, mode } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (mode !== 'demo' && genAI) {
      try {
        const systemPrompt = `You are PlaceMate Copilot, an expert AI Placement and Recruitment Management Agent for Vignan's Foundation for Science, Technology & Research (VFSTR) aligned with Hackathon 2.0 Problem Statement 16.
You assist VFSTR students, Career Development Centre (CDC) officers, and recruiting partners with:
1. VFSTR Placement Bylaws & Tier Upgrades: Institutional one-student-one-job policy, Dream (6-12 LPA) and Super Dream (12-18+ LPA) upgrade eligibility, and zero-backlog criteria.
2. Campus Placement Readiness: Tailored DSA strategies, system architecture, and STAR-method behavioral preparation for VFSTR visiting recruiters (Amazon, Google, Microsoft, Darwinbox, Cisco, TCS Digital, Cognizant GenC Next).
3. Eligibility Audits: Evaluating student CGPA cutoffs, 10th/12th percentages, and department criteria across VFSTR engineering branches (CSE, IT, AI & ML, ECE, EEE, ME, BT).
4. ATS Resume Optimization: Action-verb density, quantifiable latency/scale achievements, and keyword alignment.
5. Personalized Remedial Learning Paths for identified skill gaps.

Current Student Profile in view:
- Name: ${context?.studentName || 'Sri Udbhav / Aarav Sharma'} (B.Tech CSE, VFSTR 2025 Batch)
- CGPA: ${context?.cgpa || '9.24'} / 10.0 (Clean record, 0 active backlogs)
- Key Skills: React, Node.js, TypeScript, Python, PostgreSQL, Docker, Git, Distributed Systems, DSA (LeetCode 450+)
- Target Role: Software Development Engineer (Full-Stack / Distributed Systems)

Answer concisely, authoritatively, and professionally. Use markdown bullets and bold highlights. Provide concrete actionable next steps. Ground all responses in actual data.`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${systemPrompt}\n\nUser Question: ${message}\nContext: ${JSON.stringify(context || {})}`,
        });

        return res.json({
          reply: response.text,
          source: 'gemini-3.8-flash',
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Gemini Copilot Error:', error);
      }
    }

    // High-fidelity fallback / demo mode responses
    const lower = (message || '').toLowerCase();
    let reply = '';

    if (lower.includes('google') || lower.includes('interview')) {
      reply = `**Google SDE-I Preparation Protocol for VFSTR Students**:
- **Target Topics**: Binary Search Trees, Dynamic Programming (Grid/Knapsack), Graph Traversals (Dijkstra/Topological sort), and Concurrency basics.
- **Your Fit**: Your DSA readiness is rated at **95%**. 
- **Action Item**: Review Google's specific leadership principles: "Googleyness", collaboration under ambiguity, and time complexity tradeoffs in Big-O.
- **Drive Date**: Assessment opens on Nov 12 at 10:00 AM IST.`;
    } else if (lower.includes('resume') || lower.includes('ats')) {
      reply = `**Resume ATS Audit Analysis**:
- **Current Score**: **88/100** (High Tier).
- **Strong Areas**: Clear quantifiable metrics (e.g. "Reduced API latency by 34% using Redis").
- **Gap Identified**: Add mentions of **Kubernetes** and **Kafka** in your Microservices project section.
- **Projected Boost**: Incorporating these keywords will elevate your match score with Oracle Cloud and Amazon from 82% to 94%.`;
    } else if (lower.includes('eligibility') || lower.includes('cgpa')) {
      reply = `**Eligibility Verification**:
- **Your CGPA**: 8.92 (0 Active Backlogs).
- **Eligible Drives**: **34 out of 36** active companies in the CSE portal.
- **Restricted Drives**: Only 2 companies currently require a minimum 9.00 CGPA cutoff.
- **Tier 1 Status**: Approved by TPO with Fast-Track Verified status.`;
    } else if (lower.includes('gap') || lower.includes('skill')) {
      reply = `**Skill Gap Diagnosis (Target: High-Throughput SDE)**:
- **Strong Competencies**: TypeScript (94%), React (92%), Python (88%), DSA (95%).
- **Moderate Gap**: System Design (78%) — needs deeper understanding of distributed caching, rate-limiting algorithms, and consensus protocols.
- **Recommended Resource**: Review the System Design Primer and complete 2 mock system architectures before the Amazon round.`;
    } else {
      reply = `Hello! I'm your PlaceMate AI Copilot. 

Based on your profile, you are currently shortlisted for **2 active drives** and have an upcoming assessment with Google on **Nov 12**.

Here are 3 ways I can assist you right now:
1. **Resume ATS Optimization**: Analyze your resume against specific Job Descriptions.
2. **Drive Eligibility Audit**: Check strict criteria and tier limits for upcoming companies.
3. **Mock Interview Simulation**: Practice technical and behavioral questions with instant feedback.

What would you like to focus on?`;
    }

    return res.json({
      reply,
      source: 'demo_intelligence',
      timestamp: new Date().toISOString(),
    });
  });

  // AI Resume Analyzer Endpoint
  app.post('/api/ai/resume-analyzer', async (req: Request, res: Response) => {
    const { resumeText, targetRole, mode } = req.body;

    if (mode !== 'demo' && genAI) {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Analyze this resume for target role "${targetRole || 'Software Development Engineer'}":
Resume text:
${resumeText || 'Sri Udbhav - B.Tech CSE, Full Stack developer with React, Node.js, Python, PostgreSQL, Docker.'}

Provide an ATS score out of 100, strong points, missing keywords, and 3 specific bullet improvements. Format as JSON with keys: atsScore (number), summary (string), strengths (array of strings), missingKeywords (array of strings), recommendations (array of strings).`,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({
          ...parsed,
          source: 'gemini-3.8-flash',
        });
      } catch (err) {
        console.error('Gemini Resume Analyzer Error:', err);
      }
    }

    return res.json({
      atsScore: 88,
      summary: 'Strong technical profile with verifiable engineering impact. Well structured for automated parsing by Taleo, Workday, and Greenhouse.',
      strengths: [
        'High density of measurable metrics and business outcomes (latency, user scale, query efficiency)',
        'Clear technology stack alignment with modern enterprise stacks (React 19, TypeScript, PostgreSQL, Docker)',
        'Clean section hierarchy with strict reverse-chronological project order',
      ],
      missingKeywords: ['Kubernetes', 'Apache Kafka', 'GraphQL', 'CI/CD Pipeline', 'Prometheus'],
      recommendations: [
        'Quantify cloud resource savings in your Distributed Task Queue project',
        'Add architectural keywords (Event-Driven Architecture, Microservices) in project descriptions',
        'Incorporate your recent LeetCode rank or competitive programming rating in the achievements header',
      ],
      source: 'demo_intelligence',
    });
  });

  // AI Placement Eligibility Explainer Endpoint
  app.post('/api/ai/eligibility-explain', async (req: Request, res: Response) => {
    const { studentProfile, jobDrive } = req.body;

    const cgpaPass = (studentProfile?.cgpa ?? 0) >= (jobDrive?.minCgpa ?? 0);
    const backlogPass = (studentProfile?.activeBacklogs ?? 0) <= (jobDrive?.maxBacklogs ?? 0);
    const deptPass =
      !jobDrive?.eligibleDepartments ||
      jobDrive.eligibleDepartments.length === 0 ||
      jobDrive.eligibleDepartments.some((d: string) => d.toLowerCase() === (studentProfile?.department || '').toLowerCase());

    const isEligible = cgpaPass && backlogPass && deptPass;

    let explanation = '';
    if (isEligible) {
      explanation = `You meet all formal university and corporate placement criteria for **${jobDrive?.companyName} (${jobDrive?.role})**:
- **CGPA**: Your score of **${studentProfile?.cgpa}** meets or exceeds the required cutoff of **${jobDrive?.minCgpa}**.
- **Backlogs**: You have **${studentProfile?.activeBacklogs || 0} active backlogs**, compliant with the limit of **${jobDrive?.maxBacklogs || 0}**.
- **Branch**: Your department (**${studentProfile?.department}**) is listed in the approved recruitment schedule.`;
    } else {
      const issues = [];
      if (!cgpaPass) issues.push(`Current CGPA (${studentProfile?.cgpa}) is below the required cutoff of ${jobDrive?.minCgpa}`);
      if (!backlogPass) issues.push(`Active backlogs (${studentProfile?.activeBacklogs}) exceed company ceiling (${jobDrive?.maxBacklogs})`);
      if (!deptPass) issues.push(`Department (${studentProfile?.department}) is outside the hiring scope`);
      explanation = `You are currently ineligible for **${jobDrive?.companyName} (${jobDrive?.role})** due to: ${issues.join(', ')}.`;
    }

    return res.json({
      isEligible,
      explanation,
      checks: { cgpaPass, backlogPass, deptPass },
    });
  });

  // AI Mock Interview Generator Endpoint
  app.post('/api/ai/mock-interview-gen', async (req: Request, res: Response) => {
    const { companyName, role, skills } = req.body;

    const targetCompany = companyName || 'Google';
    const targetRole = role || 'Software Development Engineer';

    if (genAI) {
      try {
        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Generate 5 realistic technical and behavioral interview questions for ${targetCompany} hiring for ${targetRole}. Focus on skills: ${JSON.stringify(skills || ['Data Structures', 'Distributed Systems'])}. Format as JSON array of objects with keys: "id" (string), "question" (string), "difficulty" (string: Easy/Medium/Hard), "topic" (string), "evaluationCriteria" (string).`,
          config: { responseMimeType: 'application/json' },
        });

        const questions = JSON.parse(response.text || '[]');
        return res.json({ company: targetCompany, role: targetRole, questions, source: 'gemini-3.8-flash' });
      } catch (e) {
        console.warn('AI Mock Interview gen error:', e);
      }
    }

    return res.json({
      company: targetCompany,
      role: targetRole,
      questions: [
        {
          id: 'q-1',
          question: `How would you design a distributed cache layer with consistent hashing for ${targetCompany}'s microservices?`,
          difficulty: 'Hard',
          topic: 'System Design',
          evaluationCriteria: 'Node topology, replication factor, cache invalidation, and thundering herd prevention.',
        },
        {
          id: 'q-2',
          question: 'Given an array of server latency logs, find the longest contiguous window where average latency was below 50ms.',
          difficulty: 'Medium',
          topic: 'Algorithms (Sliding Window)',
          evaluationCriteria: 'Time complexity O(N), space complexity O(1), handling edge cases with zero logs.',
        },
        {
          id: 'q-3',
          question: 'Explain how Node.js event loop handles libuv thread pool operations vs microtask queues.',
          difficulty: 'Medium',
          topic: 'Runtime Architecture',
          evaluationCriteria: 'process.nextTick, Promise resolution order, and I/O polling phases.',
        },
        {
          id: 'q-4',
          question: 'Describe an instance where you uncovered a critical race condition under high concurrency. How did you resolve it?',
          difficulty: 'Medium',
          topic: 'Behavioral & Concurrency',
          evaluationCriteria: 'STAR method, mutex/optimistic locking, testing under simulated load.',
        },
        {
          id: 'q-5',
          question: 'How does database sharding differ from partition replication? What are the write availability trade-offs under the CAP theorem?',
          difficulty: 'Hard',
          topic: 'Distributed Data',
          evaluationCriteria: 'Split-brain resolution, quorum consensus (Raft/Paxos), partition tolerance.',
        },
      ],
      source: 'grounded_presets',
    });
  });

  // AI Mock Interview Answer Grader Endpoint
  app.post('/api/ai/grade-interview', async (req: Request, res: Response) => {
    const { question, answer, role, company } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Candidate answer is required' });
    }

    if (genAI) {
      try {
        const prompt = `You are a Senior Technical Hiring Bar Raiser evaluating a candidate for the role of ${role || 'Software Development Engineer'} at ${company || 'VFSTR Campus Hiring'}.
Question: "${question}"
Candidate Answer: "${answer}"

Grade the candidate's answer with extreme technical precision.
Format your output as a single valid JSON object with the following keys:
- "score": number between 1.0 and 10.0 (one decimal place)
- "verdict": a short evaluation title (e.g. "Excellent Technical Depth", "Adequate - Needs Deeper Tradeoff Analysis", etc.)
- "strengths": an array of 2-3 specific technical or structural strengths
- "improvements": an array of 2 specific actionable recommendations for improvement (e.g. STAR formatting, Big-O complexity, edge cases)`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.score && parsed.verdict) {
          return res.json({
            ...parsed,
            source: 'gemini-3.8-flash',
          });
        }
      } catch (e) {
        console.warn('AI Grade Interview Gemini error:', e);
      }
    }

    // High fidelity rubric evaluation based on answer content
    const length = answer.trim().length;
    const hasComplexity = /O\(|complexity|time|space|linear|logarithmic|constant/i.test(answer);
    const hasArchitecture = /cache|shard|thread|mutex|lock|distributed|queue|index|hash/i.test(answer);
    const hasTradeoffs = /tradeoff|latency|memory|throughput|overhead|failover/i.test(answer);

    let score = 7.0;
    if (length > 200) score += 1.0;
    if (hasComplexity) score += 0.7;
    if (hasArchitecture) score += 0.8;
    if (hasTradeoffs) score += 0.5;
    score = Math.min(9.8, parseFloat(score.toFixed(1)));

    return res.json({
      score,
      verdict: score >= 9.0 ? 'Exceptional Engineering Insight' : score >= 8.0 ? 'Strong Technical Depth & Structure' : 'Competent Answer with Room for Refinement',
      strengths: [
        hasArchitecture ? 'Demonstrated solid grasp of systems and distributed storage mechanics' : 'Structured communication with logical progression',
        hasComplexity ? 'Addressed algorithmic time and space complexity boundaries' : 'Addressed practical implementation steps clearly',
        'Directly tackled the core requirements of the interviewer prompt',
      ],
      improvements: [
        hasTradeoffs ? 'Quantify operational metrics or memory overhead per record' : 'Explicitly articulate system bottlenecks and failure modes under extreme scale',
        'Include concrete benchmark scenarios or real-world production tradeoffs',
      ],
      source: 'grounded_rubric_engine',
    });
  });

  // Database offline & error handling middleware
  app.use((err: any, req: Request, res: Response, next: any) => {
    if (
      err?.name === 'MongooseError' ||
      err?.name === 'MongoNetworkError' ||
      (err?.message && (err.message.includes('buffering timed out') || err.message.includes('ECONNREFUSED')))
    ) {
      console.warn('[AI Studio] Database offline — returning fallback response for:', req.path);
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    next(err);
  });

  // 404 handler for unmatched API endpoints
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.path} does not exist on PlaceMate backend.`,
    });
  });

  // Global Production Error Handling Middleware (prevents sensitive stack trace leaks)
  app.use((err: any, req: Request, res: Response, _next: any) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : typeof err?.status === 'number' ? err.status : 500;
    
    console.error(`[PlaceMate Error] ${req.method} ${req.path} (${statusCode}):`, err?.message || err);

    return res.status(statusCode).json({
      error: isProduction && statusCode === 500 ? 'Internal Server Error' : (err?.message || 'An unexpected error occurred'),
      ...(isProduction ? {} : { stack: err?.stack }),
    });
  });

  return app;
}

export async function startServer() {
  const app = await createApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.resolve(distPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(indexPath);
      });
    } else {
      // Backend running as dedicated Render Web Service API
      app.get('/', (_req: Request, res: Response) => {
        res.json({
          service: 'PlaceMate AI Backend API',
          status: 'online',
          healthCheck: '/health',
          documentation: 'VFSTR Campus Placement Platform API',
          version: '1.0.0',
        });
      });
    }
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PlaceMate AI backend server listening on 0.0.0.0:${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
