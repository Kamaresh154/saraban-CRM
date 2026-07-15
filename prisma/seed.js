const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.activity.deleteMany({});
  await prisma.followUp.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.savedFilter.deleteMany({});
  await prisma.calendarSync.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const adminHash = bcrypt.hashSync('admin123', 10);
  const memberHash = bcrypt.hashSync('member123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Ramya',
      email: 'ramyaa1304@gmail.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      mustChangePassword: true,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena@visualdrift.com',
      passwordHash: memberHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('Seeding leads...');
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Metaverse Art Gallery',
      companyName: 'Immersive Arts Ltd',
      contactPerson: 'Julian Dubois',
      email: 'julian@immersivearts.io',
      phone: '+1 415 555 0192',
      whatsapp: '+1 415 555 0192',
      website: 'immersivearts.io',
      address: '456 Immersive Way',
      country: 'USA',
      industry: 'Art & Entertainment',
      source: 'Website',
      service: 'XR',
      estimatedBudget: 45000,
      expectedStartDate: new Date('2026-07-15'),
      priority: 'HIGH',
      status: 'NEW',
      createdById: admin.id,
      assignedToId: admin.id,
      tags: 'xr,metaverse,webgl',
      internalNotes: 'Client wants a browser-based 3D gallery supporting custom NFTs and spatial audio.',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      name: 'AI Customer Agent',
      companyName: 'Apex Retailers',
      contactPerson: 'Sarah Jenkins',
      email: 's.jenkins@apexretail.com',
      phone: '+44 20 7946 0958',
      whatsapp: '+44 20 7946 0958',
      website: 'apexretail.com',
      address: '12 London Wall',
      country: 'UK',
      industry: 'E-commerce & Retail',
      source: 'Referral',
      service: 'AI',
      estimatedBudget: 28000,
      expectedStartDate: new Date('2026-08-01'),
      priority: 'MEDIUM',
      status: 'CONTACTED',
      createdById: admin.id,
      assignedToId: member.id,
      tags: 'ai,chatbot,automation',
      internalNotes: 'Integration needed with Shopify API. Expecting custom NLP training for clothing returns.',
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      name: 'SaaS Platform Rebrand & Dev',
      companyName: 'CloudSync Solutions',
      contactPerson: 'Marcus Vance',
      email: 'marcus@cloudsync.com',
      phone: '+1 650 555 0144',
      website: 'cloudsync.com',
      address: '789 Cloud St',
      country: 'USA',
      industry: 'Software',
      source: 'Cold outreach',
      service: 'WEB_DEV',
      estimatedBudget: 15000,
      expectedStartDate: new Date('2026-06-30'),
      priority: 'LOW',
      status: 'PROPOSAL_SENT',
      createdById: admin.id,
      assignedToId: admin.id,
      tags: 'nextjs,rebrand,react',
      internalNotes: 'Sent proposal for full landing page overhaul + dashboard redesign using Next.js App Router.',
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      name: 'Creative Brand Strategy',
      companyName: 'Vaporwave Studio',
      contactPerson: 'Kaelen Mercer',
      email: 'contact@vaporwave.studio',
      phone: '+61 2 9876 5432',
      website: 'vaporwave.studio',
      country: 'Australia',
      industry: 'Creative Agency',
      source: 'Inbound',
      service: 'CREATIVE',
      estimatedBudget: 8500,
      priority: 'HIGH',
      status: 'NEGOTIATION',
      createdById: admin.id,
      assignedToId: member.id,
      tags: 'branding,logo,creative',
      internalNotes: 'Negotiating logo design, brand guidelines, and UI design assets library.',
    },
  });

  const lead5 = await prisma.lead.create({
    data: {
      name: 'MR Interactive Catalog',
      companyName: 'Futura Brands',
      contactPerson: 'Chloe Zhao',
      email: 'c.zhao@futurabrands.com',
      phone: '+852 9123 4567',
      website: 'futurabrands.hk',
      country: 'Hong Kong',
      industry: 'Fashion & Apparel',
      source: 'Website',
      service: 'XR',
      estimatedBudget: 62000,
      expectedStartDate: new Date('2026-09-01'),
      priority: 'URGENT',
      status: 'WON',
      createdById: admin.id,
      assignedToId: admin.id,
      tags: 'xr,mr,visionpro',
      internalNotes: 'Deal closed! Working on mixed reality retail experience targeting Apple Vision Pro and Meta Quest 3.',
    },
  });

  const lead6 = await prisma.lead.create({
    data: {
      name: 'Crypto Exchange Redesign',
      companyName: 'CoinStack LLC',
      contactPerson: 'David Kross',
      email: 'd.kross@coinstack.io',
      phone: '+49 89 2019 4321',
      website: 'coinstack.io',
      country: 'Germany',
      industry: 'Web3 & Fintech',
      source: 'Cold outreach',
      service: 'WEB_DEV',
      estimatedBudget: 35000,
      priority: 'MEDIUM',
      status: 'LOST',
      createdById: admin.id,
      assignedToId: member.id,
      tags: 'web3,figma,redesign',
      internalNotes: 'Client chose to postpone the project due to cryptocurrency market fluctuations.',
    },
  });

  const lead7 = await prisma.lead.create({
    data: {
      name: 'Headless Shopify Build',
      companyName: 'ShopWave Inc',
      contactPerson: 'Lily Thompson',
      email: 'lily@shopwave.com',
      phone: '+1 206 555 0188',
      whatsapp: '+1 206 555 0188',
      website: 'shopwave.com',
      country: 'USA',
      industry: 'E-commerce',
      source: 'Website',
      service: 'WEB_DEV',
      estimatedBudget: 22000,
      expectedStartDate: new Date('2026-07-10'),
      priority: 'HIGH',
      status: 'FOLLOW_UP_SCHEDULED',
      createdById: admin.id,
      assignedToId: member.id,
      tags: 'shopify,headless,tailwind',
      internalNotes: 'Interested in Hydrogen/Remix framework for absolute speed and custom animation experiences.',
    },
  });

  console.log('Seeding follow-ups...');
  // Follow-up 1: Overdue (Pending in the past)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3); // 3 days ago
  await prisma.followUp.create({
    data: {
      leadId: lead1.id,
      assignedToId: admin.id,
      type: 'PHONE_CALL',
      scheduledAt: pastDate,
      reminderTiming: 'AT_TIME',
      priority: 'HIGH',
      status: 'PENDING', // Represents overdue
      note: 'Call Julian to schedule the scoping session for the VR gallery.',
    },
  });

  // Follow-up 2: Due Today
  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 1); // 1 hour from now
  await prisma.followUp.create({
    data: {
      leadId: lead2.id,
      assignedToId: member.id,
      type: 'EMAIL',
      scheduledAt: todayDate,
      reminderTiming: '15M_BEFORE',
      priority: 'MEDIUM',
      status: 'PENDING',
      note: 'Send proposal draft for review regarding Shopify chatbot custom prompts.',
    },
  });

  // Follow-up 3: Future Zoom meeting
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5); // 5 days from now
  await prisma.followUp.create({
    data: {
      leadId: lead4.id,
      assignedToId: member.id,
      type: 'ZOOM',
      scheduledAt: futureDate,
      reminderTiming: '1H_BEFORE',
      priority: 'HIGH',
      status: 'PENDING',
      note: 'Discuss pricing guidelines and present core brand concepts.',
    },
  });

  // Follow-up 4: Completed
  const completedDate = new Date();
  completedDate.setDate(completedDate.getDate() - 1);
  await prisma.followUp.create({
    data: {
      leadId: lead5.id,
      assignedToId: admin.id,
      type: 'PROPOSAL_REVIEW',
      scheduledAt: completedDate,
      reminderTiming: '1D_BEFORE',
      priority: 'URGENT',
      status: 'COMPLETED',
      note: 'Go over Apple Vision Pro contract details with Chloe Zhao.',
    },
  });

  console.log('Seeding notes...');
  await prisma.note.create({
    data: {
      leadId: lead1.id,
      createdById: admin.id,
      content: 'Julian mentioned that their main competitor is launching a museum in Decentraland. They want Visual Drift to create a far more polished, high-fidelity experience using three.js/WebGL that runs directly in safari/chrome without plugins.',
    },
  });

  await prisma.note.create({
    data: {
      leadId: lead2.id,
      createdById: member.id,
      content: 'Sarah is slightly worried about LLM hallucinations on product sizing. Suggested grounding the model using a strict RAG setup pointing to their custom product specs database. She liked this approach.',
    },
  });

  console.log('Seeding attachments...');
  await prisma.attachment.create({
    data: {
      leadId: lead3.id,
      uploadedById: admin.id,
      fileName: 'VisualDrift_CloudSync_Proposal_v1.pdf',
      fileKey: 'proposal-cloudsync-v1',
      fileUrl: '#',
      fileType: 'PDF',
      fileSize: 1240500, // ~1.2MB
    },
  });

  await prisma.attachment.create({
    data: {
      leadId: lead4.id,
      uploadedById: member.id,
      fileName: 'brand_brief_vaporwave_v2.docx',
      fileKey: 'brief-vaporwave-v2',
      fileUrl: '#',
      fileType: 'DOCX',
      fileSize: 420800, // ~420KB
    },
  });

  console.log('Seeding activities...');
  // Activities for Lead 1
  await prisma.activity.create({
    data: {
      leadId: lead1.id,
      userId: admin.id,
      type: 'LEAD_CREATED',
      description: 'Lead Metaverse Art Gallery created via inbound contact form.',
    },
  });

  // Activities for Lead 2
  await prisma.activity.create({
    data: {
      leadId: lead2.id,
      userId: admin.id,
      type: 'LEAD_CREATED',
      description: 'Lead AI Customer Agent created by Alexander Vance.',
    },
  });
  await prisma.activity.create({
    data: {
      leadId: lead2.id,
      userId: member.id,
      type: 'STATUS_CHANGED',
      description: 'Status updated from NEW to CONTACTED.',
      metadata: JSON.stringify({ oldStatus: 'NEW', newStatus: 'CONTACTED' }),
    },
  });
  await prisma.activity.create({
    data: {
      leadId: lead2.id,
      userId: member.id,
      type: 'NOTE_ADDED',
      description: 'Added internal note regarding RAG setup and Shopify integration.',
    },
  });

  // Activities for Lead 5
  await prisma.activity.create({
    data: {
      leadId: lead5.id,
      userId: admin.id,
      type: 'LEAD_CREATED',
      description: 'Lead MR Interactive Catalog created.',
    },
  });
  await prisma.activity.create({
    data: {
      leadId: lead5.id,
      userId: admin.id,
      type: 'STATUS_CHANGED',
      description: 'Status updated from NEGOTIATION to WON.',
      metadata: JSON.stringify({ oldStatus: 'NEGOTIATION', newStatus: 'WON' }),
    },
  });

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
