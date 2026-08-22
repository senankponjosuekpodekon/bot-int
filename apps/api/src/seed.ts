import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';

const envCandidates = [process.env.API_ENV_PATH, join(__dirname, '..', '.env'), join(__dirname, '.env')].filter(
  (c): c is string => !!c,
);
for (const p of envCandidates) {
  if (existsSync(p)) {
    loadEnv({ path: p, override: true });
    break;
  }
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'stiamond_agent',
  entities: [join(__dirname, '**/*.entity.{ts,js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
});

async function seed() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  const tenantRepo = dataSource.getRepository('Tenant');
  const userRepo = dataSource.getRepository('User');
  const agentRepo = dataSource.getRepository('Agent');
  const leadRepo = dataSource.getRepository('Lead');
  const knowledgeRepo = dataSource.getRepository('KnowledgeDocument');

  const existing = await tenantRepo.findOne({ where: { email: 'demo@stiamond.dev' } });
  if (existing) {
    console.log('Seed data already exists — skipping.');
    await dataSource.destroy();
    return;
  }

  console.log('[seed] Creating demo tenant...');
  const tenant = tenantRepo.create({
    name: 'Stiamond Demo',
    email: 'demo@stiamond.dev',
    plan: 'pro',
    isActive: true,
  });
  await tenantRepo.save(tenant);

  console.log('[seed] Creating demo user...');
  const hashedPassword = await bcrypt.hash('Demo123!', 10);
  const user = userRepo.create({
    name: 'Demo Admin',
    email: 'demo@stiamond.dev',
    password: hashedPassword,
    role: 'admin',
    tenantId: tenant.id,
    isActive: true,
  });
  await userRepo.save(user);

  console.log('[seed] Creating demo agents...');
  const agents = [
    {
      name: 'Sales Assistant',
      type: 'sales',
      systemPrompt:
        "Tu es un expert commercial B2B. Ton objectif est de qualifier les prospects, comprendre leurs besoins et présenter les solutions adaptées. Tu poses des questions ouvertes pour identifier les pain points. Tu es persuasif sans être agressif. Tu réponds en français et demandes toujours des coordonnées (email/téléphone) pour qualifier le lead.",
      personality: 'Professional and persuasive',
      isActive: true,
      tenantId: tenant.id,
    },
    {
      name: 'Support Agent',
      type: 'support',
      systemPrompt:
        "Tu es un agent de support technique niveau 1. Tu diagnostiques les problèmes en posant des questions méthodiques, tu proposes des solutions étape par étape et tu escalades vers le support N2 si nécessaire. Tu restes patient et clair. Tu réponds en français.",
      personality: 'Patient and methodical',
      isActive: true,
      tenantId: tenant.id,
    },
    {
      name: 'General Assistant',
      type: 'general',
      systemPrompt:
        "Tu es un assistant IA polyvalent. Tu réponds de manière claire, concise et utile. Tu adaptes ton ton à l'interlocuteur et poses des questions pertinentes pour mieux comprendre les besoins. Tu réponds toujours en français.",
      personality: 'Friendly and versatile',
      isActive: true,
      tenantId: tenant.id,
    },
  ];
  for (const a of agents) {
    await agentRepo.save(agentRepo.create(a));
  }

  console.log('[seed] Creating demo leads...');
  const leads = [
    {
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33 6 12 34 56 78',
      company: 'Tech Solutions SARL',
      score: 75,
      status: 'contacted',
      source: 'chat',
      agentId: undefined,
      tags: ['intent:pricing', 'source:chat', 'language:fr', 'funnel:consideration'],
      tenantId: tenant.id,
    },
    {
      name: 'Marie Martin',
      email: 'marie.martin@example.com',
      phone: '+33 6 98 76 54 32',
      company: 'Martin & Associés',
      score: 90,
      status: 'qualified',
      source: 'chat',
      agentId: undefined,
      tags: ['intent:demo', 'source:chat', 'language:fr', 'funnel:decision', 'hot-lead'],
      tenantId: tenant.id,
    },
    {
      name: 'Hans Schmidt',
      email: 'hans.schmidt@example.de',
      phone: '+49 170 1234567',
      company: 'Schmidt GmbH',
      score: 45,
      status: 'new',
      source: 'widget',
      agentId: undefined,
      tags: ['intent:info', 'source:widget', 'language:de', 'funnel:awareness'],
      tenantId: tenant.id,
    },
  ];

  const savedAgents = await agentRepo.find({ where: { tenantId: tenant.id } });
  leads.forEach((lead, i) => {
    lead.agentId = savedAgents[i % savedAgents.length]?.id;
  });

  for (const l of leads) {
    await leadRepo.save(leadRepo.create(l));
  }

  console.log('[seed] Creating demo knowledge documents...');
  const knowledgeDocs = [
    {
      title: 'Pricing Guide',
      content:
        'Stiamond offers three plans: Basic (29€/mo), Pro (79€/mo), and Business (199€/mo). All plans include AI agent, lead capture, and analytics. Pro adds multi-agent, knowledge base, and integrations. Business includes white-label, priority support, and custom workflows.',
      tenantId: tenant.id,
    },
    {
      title: 'Product FAQ',
      content:
        'Common questions: 1) How does the AI agent work? It uses LLM via Ollama to converse with visitors. 2) Can I customize the agent? Yes, system prompts, personality, and ice breakers are configurable. 3) Is my data secure? Yes, JWT auth, bcrypt passwords, tenant isolation, and GDPR compliance.',
      tenantId: tenant.id,
    },
    {
      title: 'Company Overview',
      content:
        'Stiamond is an AI-powered conversational platform that helps businesses capture, qualify, and convert leads through intelligent chat agents. Founded in 2024, serving clients across Europe and Africa.',
      tenantId: tenant.id,
    },
  ];

  for (const doc of knowledgeDocs) {
    try {
      await knowledgeRepo.save(knowledgeRepo.create(doc));
    } catch {
      // KnowledgeDocument entity may have different fields — skip if schema mismatch
    }
  }

  console.log('[seed] Done!');
  console.log('');
  console.log('  Demo credentials:');
  console.log('    Email:    demo@stiamond.dev');
  console.log('    Password: Demo123!');
  console.log('');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
