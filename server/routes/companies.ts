import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Company } from '../models/Company';
import { inMemoryStore } from '../db';

export const companyRouter = Router();

// GET all companies
companyRouter.get('/', async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const companies = await Company.find().sort({ name: 1 });
      return res.json(companies);
    }
    return res.json(inMemoryStore.companies);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch companies', details: err.message });
  }
});

// GET single company
companyRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (mongoose.connection.readyState === 1) {
      const company = await Company.findOne({
        $or: [{ companyId: id }, { name: id }],
      });
      if (!company) return res.status(404).json({ error: 'Company not found' });
      return res.json(company);
    }

    const company = inMemoryStore.companies.find(
      (c) => c.companyId === id || c.name.toLowerCase() === id.toLowerCase()
    );
    if (!company) return res.status(404).json({ error: 'Company not found' });
    return res.json(company);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to query company', details: err.message });
  }
});

// POST create company
companyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.industry || !body.contactEmail) {
      return res.status(400).json({ error: 'Name, industry, and contactEmail are required' });
    }

    const newCompany = {
      companyId: body.companyId || `comp-${Date.now()}`,
      name: body.name,
      industry: body.industry,
      website: body.website || '',
      tier: body.tier || 'Dream',
      logoUrl: body.logoUrl || '',
      contactEmail: body.contactEmail,
      description: body.description || '',
      headquarters: body.headquarters || 'Bengaluru, India',
      hiringStatus: body.hiringStatus || 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Company.create(newCompany);
      return res.status(201).json(created);
    }

    inMemoryStore.companies.push(newCompany as any);
    return res.status(201).json(newCompany);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create company', details: err.message });
  }
});
