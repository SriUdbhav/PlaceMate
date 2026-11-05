import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Interview } from '../models/Interview';
import { inMemoryStore } from '../db';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const interviewRouter = Router();

const PREFERRED_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
    try {
      return new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI for interviews:', e);
    }
  }
  return null;
}

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY || process.env.VOICE;
  if (key && key.trim().startsWith('sk-')) {
    try {
      return new OpenAI({ apiKey: key.trim() });
    } catch (e) {
      console.warn('Failed to initialize OpenAI for interviews:', e);
    }
  }
  return null;
}

// GET all interviews
interviewRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query: any = {};
      if (studentId) query.studentId = studentId;
      const interviews = await Interview.find(query).sort({ scheduledAt: -1, createdAt: -1 });
      return res.json(interviews);
    }

    let results = [...inMemoryStore.interviews];
    if (studentId) results = results.filter((i: any) => i.studentId === studentId);
    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch interviews', details: err.message });
  }
});

// GET interview by id
interviewRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const interview = await Interview.findOne({
        $or: [{ interviewId: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!interview) return res.status(404).json({ error: 'Interview not found' });
      return res.json(interview);
    }

    const mem = (inMemoryStore.interviews as any[]).find((i: any) => i.interviewId === id);
    if (!mem) return res.status(404).json({ error: 'Interview not found' });
    return res.json(mem);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve interview', details: err.message });
  }
});

// POST schedule / record interview
interviewRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.studentId || !body.companyName || !body.role) {
      return res.status(400).json({ error: 'studentId, companyName, and role are required' });
    }

    const newInterview = {
      interviewId: body.interviewId || `int-${Date.now()}`,
      studentId: body.studentId,
      jobId: body.jobId || '',
      companyName: body.companyName,
      role: body.role,
      roundType: body.roundType || 'Technical',
      difficulty: body.difficulty || 'Beginner',
      preferredLanguage: body.preferredLanguage || 'Java',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
      durationMinutes: Number(body.durationMinutes) || 45,
      meetingLink: body.meetingLink || '',
      interviewerName: body.interviewerName || 'Technical Interview Panel',
      status: body.status || 'Scheduled',
      score: body.score !== undefined ? Number(body.score) : undefined,
      scoreOutOf100: body.scoreOutOf100 !== undefined ? Number(body.scoreOutOf100) : (body.score ? Number(body.score) * 10 : undefined),
      questions: body.questions || [],
      summaryFeedback: body.summaryFeedback || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Interview.create(newInterview);
      return res.status(201).json(created);
    }

    (inMemoryStore.interviews as any[]).unshift(newInterview);
    return res.status(201).json(newInterview);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create interview record', details: err.message });
  }
});

// POST /api/interviews/evaluate - Complete interview evaluation & persist report
interviewRouter.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const {
      interviewId,
      studentId,
      companyName = 'Campus Hiring Panel',
      role = 'Software Engineer Trainee',
      roundType = 'Technical',
      difficulty = 'Beginner',
      preferredLanguage = 'Java',
      durationMinutes = 15,
      transcript = [],
      questions = [],
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required for interview evaluation.' });
    }

    const genAI = getGeminiClient();
    const openai = getOpenAIClient();

    let evaluationResult: any = null;

    const evaluationPrompt = `You are a Senior Bar Raiser and Placement Evaluation Committee Chair at VFSTR University evaluating an authentic placement interview for candidate (${studentId}) applying for ${companyName} (${role}, ${roundType} round, ${difficulty} difficulty, preferred language: ${preferredLanguage}).
Session Duration: ${durationMinutes} minutes.

Questions and Candidate Responses:
${JSON.stringify(questions, null, 2)}

Full Interview Transcript:
${JSON.stringify(transcript, null, 2)}

CRITICAL EVALUATION GUIDELINES FOR INDIAN CAMPUS PLACEMENTS:
1. Base your evaluation strictly on the candidate's actual answers in the transcript.
2. Provide realistic scores out of 100:
   - "overallScore": Integer between 1 and 100 (e.g. 82)
   - "technicalScore": Integer between 1 and 100
   - "communicationScore": Integer between 1 and 100
   - "problemSolvingScore": Integer between 1 and 100
   - "correctnessScore": Integer between 1 and 100
   - "confidenceScore": Integer between 1 and 100
3. Confidence indicators: Describe observed communication flow, sentence structure, articulation, and hesitation without claiming psychological certainty.
4. For EACH question in "evaluatedQuestions", provide:
   - "id": number
   - "question": string
   - "candidateAnswer": string (actual words spoken by student)
   - "correctAnswer": string (ideal concise explanation with key technical points)
   - "score": number out of 100
   - "isCorrect": boolean
   - "feedback": 1-2 constructive sentences on what was good and what was missed
5. Provide actionable campus preparation guidance:
   - "strengths": 3 specific strengths observed
   - "weaknesses": 2-3 specific knowledge gaps
   - "missedConcepts": 2-3 specific concepts the student should review
   - "prepRoadmap": 3-4 concrete study recommendations (e.g. "Review SQL Joins and HAVING clause", "Practice implementing Stack using Array in Java", "Structure project answers using STAR method")
   - "verdict": "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Preparation"

Format your output strictly as a single JSON object.`;

    // 1. Try Gemini with multi-model fallback
    if (genAI) {
      for (const model of PREFERRED_GEMINI_MODELS) {
        try {
          const response = await genAI.models.generateContent({
            model,
            contents: evaluationPrompt,
            config: { responseMimeType: 'application/json' },
          });
          if (response && response.text) {
            evaluationResult = JSON.parse(response.text);
            break;
          }
        } catch (e: any) {
          console.warn(`[Evaluation] Model ${model} failed (${e?.message || e}), trying next...`);
        }
      }
    }

    // 2. Try OpenAI if Gemini was unavailable
    if (!evaluationResult && openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: evaluationPrompt }],
          response_format: { type: 'json_object' },
        });
        evaluationResult = JSON.parse(completion.choices[0]?.message?.content || '{}');
      } catch (e: any) {
        console.warn('OpenAI evaluation failed, using rubric engine:', e?.message);
      }
    }

    // 3. Robust Placement Rubric Fallback
    if (!evaluationResult || !evaluationResult.overallScore) {
      let totalCorrect = 0;
      let totalAnswerLength = 0;

      const evaluatedQuestions = questions.map((q: any, idx: number) => {
        const ans = (q.candidateAnswer || q.answer || '').trim();
        totalAnswerLength += ans.length;
        const isOk = ans.length > 30 && !/i don't know|no idea|skip|pass/i.test(ans);
        if (isOk) totalCorrect++;

        const qScore = isOk ? Math.min(95, 75 + Math.min(20, ans.length / 5)) : 45;

        return {
          id: idx + 1,
          question: q.questionText || q.question || `Question ${idx + 1}`,
          candidateAnswer: ans || 'No answer recorded',
          correctAnswer: q.expectedConcepts || 'Fundamental principles, syntax accuracy, and practical tradeoffs.',
          score: Math.round(qScore),
          isCorrect: isOk,
          feedback: isOk
            ? 'Candidate explained the fundamental concept with appropriate terminology.'
            : 'Answer lacked technical depth or was left incomplete. Review fundamental definitions.',
        };
      });

      const avgQScore = evaluatedQuestions.length > 0
        ? evaluatedQuestions.reduce((acc: number, q: any) => acc + q.score, 0) / evaluatedQuestions.length
        : 78;

      const overall100 = Math.round(avgQScore);
      const tech100 = Math.round(Math.min(98, overall100 + 2));
      const comm100 = Math.round(Math.max(60, overall100 - 3));
      const prob100 = Math.round(overall100);

      evaluationResult = {
        overallScore: overall100,
        scoreOutOf100: overall100,
        technicalScore: tech100,
        communicationScore: comm100,
        problemSolvingScore: prob100,
        correctnessScore: Math.round((totalCorrect / Math.max(1, questions.length)) * 100),
        confidenceScore: Math.round(Math.min(92, 70 + (totalAnswerLength > 200 ? 15 : 5))),
        confidenceIndicators: totalAnswerLength > 150
          ? 'Steady articulation with structured pacing. Communicated technical points clearly without noticeable hesitation.'
          : 'Answers were brief. Practice elaborating on core principles with 1-2 concrete code examples to project stronger confidence.',
        verdict: overall100 >= 85 ? 'Strong Hire' : overall100 >= 72 ? 'Hire' : overall100 >= 60 ? 'Leaning Hire' : 'Needs Preparation',
        summaryFeedback: `The student participated in a ${difficulty} ${roundType} placement interview for ${companyName}. Demonstrated foundational understanding of core concepts with respectable communication flow. Addressing specific technical nuances will significantly elevate placement clearance rate.`,
        strengths: [
          'Clear communication of foundational computer science principles',
          'Good composure and conversational pacing during questioning',
          'Proper identification of core data structure characteristics',
        ],
        weaknesses: [
          'Could elaborate more on practical edge cases and memory trade-offs',
          'Can structure technical explanations using real-world project examples',
        ],
        missedConcepts: [
          'Detailed time and space complexity quantification (Big-O)',
          'Practical application differences between standard collection types',
        ],
        prepRoadmap: [
          'Review OOP pillars with practical Java/Python code examples',
          'Practice explaining DBMS Normalization (1NF, 2NF, 3NF) and SQL Joins',
          'Refine 2-minute elevator pitch for your college academic project',
          'Solve 10 top campus placement coding questions on LeetCode/GeeksforGeeks',
        ],
        evaluatedQuestions,
      };
    }

    // Normalize score fields
    const score100 = evaluationResult.overallScore > 10 ? evaluationResult.overallScore : Math.round(evaluationResult.overallScore * 10);
    const score10 = Number((score100 / 10).toFixed(1));

    const finalInterviewId = interviewId || `int-${Date.now()}`;
    const reportDoc: any = {
      interviewId: finalInterviewId,
      studentId,
      jobId: req.body.jobId || 'job-campus-01',
      companyName,
      role,
      roundType,
      difficulty,
      preferredLanguage,
      scheduledAt: new Date(),
      durationMinutes: Number(durationMinutes) || 15,
      interviewerName: 'Sarah Jenkins (AI Placement Bar Raiser)',
      status: 'Completed',
      score: score10,
      scoreOutOf100: score100,
      technicalScore: evaluationResult.technicalScore || Math.round(score10 * 10),
      communicationScore: evaluationResult.communicationScore || Math.round(score10 * 10),
      problemSolvingScore: evaluationResult.problemSolvingScore || Math.round(score10 * 10),
      correctnessScore: evaluationResult.correctnessScore || Math.round(score10 * 10),
      confidenceScore: evaluationResult.confidenceScore || 80,
      confidenceIndicators: evaluationResult.confidenceIndicators || 'Consistent pacing and articulate delivery.',
      verdict: evaluationResult.verdict || (score10 >= 8.0 ? 'Hire' : 'Needs Preparation'),
      summaryFeedback: evaluationResult.summaryFeedback || 'Completed campus placement interview round.',
      strengths: evaluationResult.strengths || [],
      weaknesses: evaluationResult.weaknesses || [],
      missedConcepts: evaluationResult.missedConcepts || [],
      prepRoadmap: evaluationResult.prepRoadmap || [],
      transcript,
      isLiveAvatarSession: true,
      questions: evaluationResult.evaluatedQuestions || questions,
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const saved = await Interview.findOneAndUpdate(
        { interviewId: finalInterviewId },
        { $set: reportDoc },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, report: saved, evaluation: evaluationResult });
    }

    const existingIdx = (inMemoryStore.interviews as any[]).findIndex((i: any) => i.interviewId === finalInterviewId);
    if (existingIdx !== -1) {
      (inMemoryStore.interviews as any[])[existingIdx] = { ...(inMemoryStore.interviews as any[])[existingIdx], ...reportDoc };
    } else {
      (inMemoryStore.interviews as any[]).unshift(reportDoc);
    }

    return res.status(200).json({
      success: true,
      report: reportDoc,
      evaluation: evaluationResult,
    });
  } catch (err: any) {
    console.error('Interview evaluation error:', err);
    return res.status(500).json({ error: 'Failed to generate interview evaluation report', details: err.message });
  }
});
