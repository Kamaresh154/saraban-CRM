import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Fetch all leads with filters
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const service = searchParams.get('service') || '';
  const assignedToId = searchParams.get('assignedToId') || '';
  const source = searchParams.get('source') || '';
  const showArchived = searchParams.get('showArchived') === 'true';

  try {
    // Build query conditions
    const where: any = {
      isArchived: showArchived,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
        { tags: { contains: search.toLowerCase() } },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (service) where.service = service;
    if (assignedToId) where.assignedToId = assignedToId;
    if (source) where.source = source;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        followUps: {
          where: { status: 'PENDING' },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Fetch leads error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// Create new lead
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;

  try {
    const body = await req.json();
    const {
      name,
      companyName,
      contactPerson,
      email,
      phone,
      whatsapp,
      website,
      address,
      country,
      industry,
      source,
      service,
      estimatedBudget,
      expectedStartDate,
      priority,
      status,
      assignedToId,
      tags,
      internalNotes,
    } = body;

    if (!name || !contactPerson || !email || !source || !service) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert estimatedBudget to float
    const budget = estimatedBudget ? parseFloat(estimatedBudget) : null;
    const startDate = expectedStartDate ? new Date(expectedStartDate) : null;

    const lead = await prisma.lead.create({
      data: {
        name,
        companyName,
        contactPerson,
        email,
        phone,
        whatsapp,
        website,
        address,
        country,
        industry,
        source,
        service,
        estimatedBudget: budget,
        expectedStartDate: startDate,
        priority: priority || 'MEDIUM',
        status: status || 'NEW',
        assignedToId: assignedToId || userId,
        createdById: userId,
        tags: tags || '',
        internalNotes,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: userId,
        type: 'LEAD_CREATED',
        description: `Lead "${lead.name}" was created by user.`,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
