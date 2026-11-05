import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CV } from '../models/CV';
import { inMemoryStore } from '../db';
import { GoogleGenAI } from '@google/genai';

export const cvRouter = Router();

// Priority list of Gemini models: gemini-3.1-flash-lite (fastest, high availability), gemini-3.5-flash, gemini-3.8-flash
export const PREFERRED_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

// Dynamic GenAI client factory to always read fresh GEMINI_API_KEY from environment
export const getGenAI = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
};

// Resilient Gemini generateContent caller using official SDK
export const generateWithGemini = async (
  contents: string,
  options?: {
    systemInstruction?: string;
    responseMimeType?: string;
  }
): Promise<{ text: string; modelUsed: string }> => {
  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured or missing on the server. Please check your environment variables.');
  }

  let lastError: any = null;
  for (const model of PREFERRED_GEMINI_MODELS) {
    try {
      const config: any = {};
      if (options?.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options?.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }

      const res = await ai.models.generateContent({
        model,
        contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      if (res && res.text) {
        return { text: res.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini CV] Model "${model}" failed:`, err?.message || err);
      lastError = err;
    }
  }

  const cleanMsg = lastError?.message || 'Gemini models are currently unavailable.';
  throw new Error(`Gemini AI request failed: ${cleanMsg}`);
};

// Helper: Ensure student authorization
const checkStudentAuth = (req: Request, studentIdOnDoc?: string): boolean => {
  const reqStudent = (req.query.studentId || req.headers['x-student-id'] || req.body?.studentId) as string | undefined;
  if (!reqStudent || !studentIdOnDoc) return true;
  return reqStudent.trim().toLowerCase() === studentIdOnDoc.trim().toLowerCase();
};

// GET all CVs (filtered by ?studentId=...)
cvRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const query = studentId ? { studentId: String(studentId) } : {};
      const cvs = await CV.find(query).sort({ updatedAt: -1 });
      return res.json(cvs);
    }

    // In-memory fallback
    let list = inMemoryStore.cvs || [];
    if (studentId) {
      list = list.filter((c: any) => c.studentId === studentId || c.personalDetails?.rollNo === studentId);
    }
    return res.json(list);
  } catch (err: any) {
    console.error('Error fetching CVs:', err);
    return res.status(500).json({ error: 'Failed to retrieve CVs', details: err.message });
  }
});

// GET single CV by id
cvRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { studentId } = req.query;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const found = await CV.findOne({
        $or: [{ cvId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!found) return res.status(404).json({ error: 'CV document not found' });
      if (studentId && found.studentId && found.studentId !== studentId) {
        return res.status(403).json({ error: 'Unauthorized access to another student resume' });
      }
      return res.json(found);
    }

    const found = (inMemoryStore.cvs || []).find((c: any) => c.cvId === id || c.id === id);
    if (!found) return res.status(404).json({ error: 'CV document not found' });
    if (studentId && found.studentId && found.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized access to another student resume' });
    }
    return res.json(found);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve CV', details: err.message });
  }
});

// POST create new CV
cvRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const newCv = {
      cvId: body.cvId || `cv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId: body.studentId,
      title: body.title || 'Placement Ready CV',
      template: body.template || 'modern-ats',
      targetRole: body.targetRole || '',
      targetCompany: body.targetCompany || '',
      jobDescription: body.jobDescription || '',
      conversationState: body.conversationState || null,
      personalDetails: body.personalDetails || {
        fullName: body.fullName || 'Candidate Name',
        email: body.email || 'candidate@campus.edu',
        phone: body.phone || '+91 98765 43210',
        rollNo: body.rollNo || '',
        department: body.department || 'Computer Science & Engineering',
        batch: body.batch || '2021 - 2025',
        location: body.location || 'Vadlamudi, Guntur, AP',
        linkedinUrl: body.linkedinUrl || '',
        githubUrl: body.githubUrl || '',
        portfolioUrl: body.portfolioUrl || '',
      },
      summary: body.summary || '',
      education: body.education || [],
      skills: body.skills || {
        languages: [],
        frameworks: [],
        developerTools: [],
        databases: [],
        coursework: [],
      },
      projects: body.projects || [],
      experience: body.experience || [],
      certifications: body.certifications || [],
      achievements: body.achievements || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const created = await CV.create(newCv);
      return res.status(201).json(created);
    }

    if (!inMemoryStore.cvs) inMemoryStore.cvs = [];
    inMemoryStore.cvs.unshift(newCv);
    return res.status(201).json(newCv);
  } catch (err: any) {
    console.error('Error creating CV:', err);
    return res.status(500).json({ error: 'Failed to create CV', details: err.message });
  }
});

// PUT update existing CV
cvRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updates = { ...req.body, updatedAt: new Date() };
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const found = await CV.findOne({
        $or: [{ cvId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (found && req.body.studentId && found.studentId && found.studentId !== req.body.studentId) {
        return res.status(403).json({ error: 'Unauthorized to modify another student resume' });
      }

      const updated = await CV.findOneAndUpdate(
        { $or: [{ cvId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'CV document not found' });
      return res.json(updated);
    }

    if (!inMemoryStore.cvs) inMemoryStore.cvs = [];
    const idx = inMemoryStore.cvs.findIndex((c: any) => c.cvId === id || c.id === id);
    if (idx === -1) {
      const newEntry = { cvId: id, ...updates };
      inMemoryStore.cvs.push(newEntry);
      return res.json(newEntry);
    }

    inMemoryStore.cvs[idx] = { ...inMemoryStore.cvs[idx], ...updates };
    return res.json(inMemoryStore.cvs[idx]);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update CV', details: err.message });
  }
});

// DELETE CV
cvRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      await CV.findOneAndDelete({
        $or: [{ cvId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      return res.json({ success: true, message: 'CV deleted successfully' });
    }

    if (inMemoryStore.cvs) {
      inMemoryStore.cvs = inMemoryStore.cvs.filter((c: any) => c.cvId !== id && c.id !== id);
    }
    return res.json({ success: true, message: 'CV deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete CV', details: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/cvs/stream-generate
// Real-time progressive streaming of resume generation using Gemini API
// -------------------------------------------------------------
cvRouter.post('/stream-generate', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const ai = getGenAI();
  if (!ai) {
    res.write(`data: ${JSON.stringify({ error: 'GEMINI_API_KEY is not configured or missing on the server.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return res.end();
  }

  const { studentProfile, targetRole, targetCompany, jobDescription, cvData } = req.body;
  const role = targetRole || cvData?.targetRole || 'Software Development Engineer';
  const name = studentProfile?.name || cvData?.personalDetails?.fullName || 'Sri Udbhav';
  const dept = studentProfile?.department || cvData?.personalDetails?.department || 'Computer Science & Engineering';
  const cgpa = studentProfile?.cgpa || '9.24';

  const prompt = `You are PlaceMate AI's Senior Technical Placement Officer and ATS Resume Architect at Vignan's Foundation for Science, Technology & Research (VFSTR).
Task: Progressively generate an exceptional, highly-tailored ATS resume for this candidate:
- Name: ${name}
- Department: ${dept}
- Verified CGPA: ${cgpa} / 10.0
- Target Role: "${role}"
- Target Company/Drive: "${targetCompany || 'Premier Enterprise Recruitment'}"
- Target Job Description: "${jobDescription || 'Scalable engineering, microservices, databases, system design'}"
- Known Skills: ${cvData?.skills?.languages?.join(', ') || 'TypeScript, Java, Python, React, PostgreSQL, Docker'}
- Existing Projects: ${cvData?.projects?.map((p: any) => p.title).join(', ') || 'PlaceMate AI, Distributed Task Queue'}

Format each section strictly with these delimited block tags so the client stream parser can assemble the live resume section by section:

[[SECTION:SUMMARY]]
[Write 2-3 compelling, ATS-optimized sentences emphasizing the candidate's strong academic record at VFSTR (${cgpa} CGPA), mastery of modern software paradigms, and dedication to ${role} impact.]
[[END_SUMMARY]]

[[SECTION:SKILLS]]
Languages: [List relevant languages]
Frameworks: [List web/backend frameworks]
Databases: [List database systems]
Tools: [List dev & cloud tools]
Coursework: Data Structures & Algorithms, Operating Systems, Database Management Systems, Computer Networks, System Design
[[END_SKILLS]]

[[SECTION:PROJECTS]]
[PROJECT]
Title: [Project Title]
TechStack: [Key Tech Stack]
Duration: [Duration]
Bullets:
• [Action verb + technical accomplishment + quantified metric]
• [Action verb + system architecture/pipeline + quantified metric]
• [Action verb + testing/deployment best practice]
[/PROJECT]
[[END_PROJECTS]]

[[SECTION:EXPERIENCE]]
[EXP]
Role: Software Development Engineering Intern
Company: Campus Career Development Centre (CDC)
Duration: May 2024 - Jul 2024
Bullets:
• Developed automated data extraction and student batch verification microservices handling 800+ candidate academic dossiers.
• Optimized relational query indices in PostgreSQL, decreasing student placement audit generation latency from 4.2s to 650ms.
• Collaborated with placement coordinators to implement secure registration-number authentication and role-based access control.
[/EXP]
[[END_EXPERIENCE]]

[[SECTION:CERTIFICATIONS]]
• AWS Certified Cloud Practitioner — Amazon Web Services (AWS) (2024)
• Meta Front-End Developer Professional Certificate — Meta / Coursera (2024)
[[END_CERTIFICATIONS]]

[[SECTION:ACHIEVEMENTS]]
• Solved 450+ algorithmic problems across LeetCode & CodeChef with top 5% contest rating.
• Finalist at VFSTR Hackathon 2.0 Problem Statement 16 for Campus Placement Intelligence Agent.
• Academic Merit Scholar at VFSTR for maintaining consistent CGPA above 9.20 across all semesters.
[[END_ACHIEVEMENTS]]

RULES:
- Base all achievements strictly on authentic engineering capabilities. Do not hallucinate fake companies or unearned degrees.
- Output ONLY the delimited tags and text.`;

  let streamSuccess = false;
  let lastStreamError: any = null;

  for (const model of PREFERRED_GEMINI_MODELS) {
    try {
      console.log(`[Gemini CV Stream] Calling live Gemini streaming with model ${model}...`);
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: prompt,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      streamSuccess = true;
      break;
    } catch (err: any) {
      console.warn(`[Gemini CV Stream] Model ${model} failed:`, err?.message);
      lastStreamError = err;
    }
  }

  if (!streamSuccess) {
    const errorMsg = lastStreamError?.message || 'Gemini streaming service is unavailable.';
    res.write(`data: ${JSON.stringify({ error: `Gemini API error: ${errorMsg}` })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

// -------------------------------------------------------------
// POST /api/cvs/chat-step
// Interactive step-by-step AI Resume Copilot processor with natural language edit support
// -------------------------------------------------------------
cvRouter.post('/chat-step', async (req: Request, res: Response) => {
  try {
    const {
      message,
      stepId = 'target_role',
      conversationHistory = [],
      currentCv,
      studentProfile,
      targetRole,
      targetCompany,
      jobDescription,
    } = req.body;

    const userMsg = (message || '').trim();
    if (!userMsg) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const stepsSequence = [
      'target_role',
      'target_company_jd',
      'academics_contact',
      'skills',
      'projects',
      'experience',
      'certifications_achievements',
      'ready',
    ];
    let currentStepIndex = stepsSequence.indexOf(stepId);
    if (currentStepIndex === -1) currentStepIndex = 0;

    const systemInstruction = `You are the PlaceMate AI Campus Recruitment & Placement Copilot at Vignan's Foundation for Science, Technology & Research (VFSTR).

You have TWO distinct responsibilities:

1. GENERAL QUESTIONS & ACADEMIC/TECHNICAL ASSISTANT (isGeneralQuery = true):
- If the user asks a general question, math problem (e.g. "What is the sum of 2 + 3?"), factual question (e.g. "What is the capital of India?"), technical conceptual question (e.g. "Explain the difference between HTML and CSS"), greeting, or anything unrelated to modifying specific resume data:
  * Answer their question directly, accurately, and thoroughly with correct facts/math.
  * DO NOT modify any resume fields.
  * Set "isGeneralQuery": true.
  * Set "cvPatch": {}.
  * Set "nextStepId": "${stepId}".
  * Provide 2 to 4 relevant quick reply suggestions.

2. RESUME BUILDER & CAREER GUIDANCE (isGeneralQuery = false):
- If the user is responding to the resume interview question, providing qualifications (role, target company, contact info, skills, projects, internships, certifications), or asking to modify/improve/optimize their resume (e.g., "Generate a resume summary for a CSE student with Python and HTML skills", "Improve my summary", "Make my project descriptions more impactful", "Add Python and HTML skills"):
  * Synthesize their input into professional ATS-ready phrasing.
  * Set "isGeneralQuery": false.
  * Populate "cvPatch" with the relevant fields to update:
    - summary: 2-3 compelling sentences
    - targetRole: extracted or updated role title
    - targetCompany: extracted company name
    - personalDetails: object with updated fields
    - skills: object with languages, frameworks, databases, developerTools, coursework arrays
    - projects: array of project objects with title, techStack, duration, and 3 impact bullets
    - experience: array of experience objects with role, company, location, duration, bullets
    - certifications: array of { id, name, issuer, issueDate }
    - achievements: array of strings
  * Advance "nextStepId" to the next logical step in the sequence: target_role -> target_company_jd -> academics_contact -> skills -> projects -> experience -> certifications_achievements -> ready.
  * Set "aiResponse" to a friendly, encouraging message explaining what was updated and prompting for the next detail.
  * Provide 2 to 4 relevant quick replies.

MANDATORY RESPONSE FORMAT:
You MUST respond with valid JSON matching this schema:
{
  "isGeneralQuery": boolean,
  "aiResponse": string,
  "nextStepId": string,
  "progressPercent": number,
  "quickReplies": string[],
  "cvPatch": object
}`;

    const promptContext = `Student Profile:
- Name: ${studentProfile?.name || currentCv?.personalDetails?.fullName || 'Sri Udbhav'}
- Roll No: ${studentProfile?.rollNo || currentCv?.personalDetails?.rollNo || '251FA04I28'}
- Department: ${studentProfile?.department || currentCv?.personalDetails?.department || 'Computer Science & Engineering'}
- CGPA: ${studentProfile?.cgpa || '9.24'}
- Current Step: ${stepId}
- Current Target Role: ${targetRole || currentCv?.targetRole || 'Not specified'}
- Current Target Company: ${targetCompany || currentCv?.targetCompany || 'Not specified'}
- Current Job Description: ${jobDescription || currentCv?.jobDescription || 'Not specified'}
- Current CV State: ${JSON.stringify(currentCv || {})}

Recent Conversation History:
${conversationHistory
  .slice(-6)
  .map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`)
  .join('\n')}

User Message:
"${userMsg}"`;

    const { text, modelUsed } = await generateWithGemini(promptContext, {
      systemInstruction,
      responseMimeType: 'application/json',
    });

    let parsed: any;
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          isGeneralQuery: true,
          aiResponse: text,
          nextStepId: stepId,
          progressPercent: Math.round(((currentStepIndex + 1) / stepsSequence.length) * 100),
          quickReplies: ['Continue resume builder', 'Help with projects', 'Generate Resume'],
          cvPatch: {},
        };
      }
    }

    const isGeneral = !!parsed.isGeneralQuery;
    const finalNextStep = isGeneral
      ? stepId
      : parsed.nextStepId || stepsSequence[Math.min(currentStepIndex + 1, stepsSequence.length - 1)];

    const calculatedProgress = isGeneral
      ? Math.round(((currentStepIndex) / stepsSequence.length) * 100)
      : (parsed.progressPercent || Math.round(((currentStepIndex + 1) / stepsSequence.length) * 100));

    return res.json({
      success: true,
      aiResponse: parsed.aiResponse || text,
      nextStepId: finalNextStep,
      progressPercent: calculatedProgress,
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [],
      cvPatch: isGeneral ? {} : (parsed.cvPatch || {}),
      isGeneralQuery: isGeneral,
      modelUsed,
      source: 'gemini_api',
    });
  } catch (err: any) {
    console.error('Gemini chat-step failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Gemini AI service error. Please try again.',
      details: err.message,
    });
  }
});

// -------------------------------------------------------------
// POST /api/cvs/generate-full-resume
// Complete ATS polish and optimization pass for target role
// -------------------------------------------------------------
cvRouter.post('/generate-full-resume', async (req: Request, res: Response) => {
  try {
    const { cvData, targetRole, studentProfile } = req.body;
    if (!cvData) return res.status(400).json({ error: 'cvData is required' });

    const role = targetRole || cvData.targetRole || 'Software Development Engineer';
    const dept = studentProfile?.department || cvData.personalDetails?.department || 'Computer Science & Engineering';
    const cgpa = studentProfile?.cgpa || cvData.education?.[0]?.cgpaOrPercentage || '9.24';

    const systemInstruction = `You are the Lead ATS Placement Officer and Technical Resume Optimizer at Vignan's Foundation for Science, Technology & Research (VFSTR).
Task: Run a full ATS enhancement pass over this candidate's resume for the target role: "${role}".
Output JSON with:
{
  "summary": "2-3 compelling ATS sentences emphasizing academic excellence at VFSTR (${cgpa} CGPA) and engineering impact in ${role}",
  "projects": [ updated array of project objects with title, techStack, duration, and 3 strong Google X-Y-Z formula bullets with metrics ],
  "experience": [ updated array of experience objects with role, company, location, duration, and 3 metric-backed bullets ]
}`;

    const prompt = `Input Resume Data:
${JSON.stringify(cvData)}
Target Role: ${role}
Candidate Dept: ${dept}
Candidate CGPA: ${cgpa}`;

    const { text, modelUsed } = await generateWithGemini(prompt, {
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    const updatedCv = {
      ...cvData,
      summary: parsed.summary || cvData.summary,
      projects: parsed.projects?.length ? parsed.projects : cvData.projects,
      experience: parsed.experience?.length ? parsed.experience : cvData.experience,
    };

    return res.json({
      success: true,
      optimizedCv: updatedCv,
      source: 'gemini_api',
      modelUsed,
    });
  } catch (err: any) {
    console.error('generate-full-resume error:', err);
    return res.status(500).json({ error: 'Failed to generate full resume with Gemini', details: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/cvs/regenerate-section
// Regenerate only a specific section without recreating entire resume
// -------------------------------------------------------------
cvRouter.post('/regenerate-section', async (req: Request, res: Response) => {
  try {
    const { section, cvData, targetRole, studentProfile } = req.body;
    if (!section || !cvData) {
      return res.status(400).json({ error: 'section and cvData are required' });
    }

    const role = targetRole || cvData.targetRole || 'Software Development Engineer';
    const dept = studentProfile?.department || 'Computer Science & Engineering';
    const cgpa = studentProfile?.cgpa || '9.24';

    const systemInstruction = `You are the ATS Resume Specialist for VFSTR placements. Regenerate the "${section}" section of a student's resume for the target role: "${role}".
Ensure high ATS keyword density, Google X-Y-Z formula for bullets, and authentic engineering tone.
Respond with JSON matching:
{
  "${section}": ...
}`;

    const prompt = `Student: ${dept}, ${cgpa} CGPA.
Role: ${role}
Current Resume Context: ${JSON.stringify(cvData)}`;

    const { text, modelUsed } = await generateWithGemini(prompt, {
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({
      success: true,
      updatedSection: parsed,
      source: 'gemini_api',
      modelUsed,
    });
  } catch (err: any) {
    console.error('regenerate-section error:', err);
    return res.status(500).json({ error: 'Failed to regenerate section with Gemini', details: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/cvs/ai-enhance
// AI enhance specific text snippet or bullet
// -------------------------------------------------------------
cvRouter.post('/ai-enhance', async (req: Request, res: Response) => {
  try {
    const { sectionType, draftText, targetRole, studentContext } = req.body;
    if (!draftText) {
      return res.status(400).json({ error: 'draftText is required' });
    }

    const systemInstruction = `You are PlaceMate AI's Senior Resume Writer at VFSTR.
Transform and elevate the user's draft ${sectionType || 'resume content'} for the role "${targetRole || 'Software Engineer'}".
Use Google's X-Y-Z formula (Accomplished [X] as measured by [Y], by doing [Z]).
Keep it concise, professional, and grounded.
Output ONLY the enhanced text without commentary or quotes.`;

    const { text, modelUsed } = await generateWithGemini(
      `Draft to enhance: "${draftText}"\nStudent Context: ${JSON.stringify(studentContext || {})}`,
      { systemInstruction }
    );

    return res.json({
      success: true,
      enhancedText: text.trim(),
      source: 'gemini_api',
      modelUsed,
    });
  } catch (err: any) {
    console.error('ai-enhance error:', err);
    return res.status(500).json({ error: 'Failed to enhance text with Gemini', details: err.message });
  }
});
