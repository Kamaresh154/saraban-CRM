import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Fetch single lead detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          orderBy: { scheduledAt: 'asc' },
        },
        activities: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Fetch lead detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead details' }, { status: 500 });
  }
}

// Update single lead
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;
  const { id } = params;

  try {
    const body = await req.json();
    const existingLead = await prisma.lead.findUnique({ where: { id } });

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

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
      isArchived,
    } = body;

    const budget = estimatedBudget !== undefined ? (estimatedBudget ? parseFloat(estimatedBudget) : null) : existingLead.estimatedBudget;
    const startDate = expectedStartDate !== undefined ? (expectedStartDate ? new Date(expectedStartDate) : null) : existingLead.expectedStartDate;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingLead.name,
        companyName: companyName !== undefined ? companyName : existingLead.companyName,
        contactPerson: contactPerson !== undefined ? contactPerson : existingLead.contactPerson,
        email: email !== undefined ? email : existingLead.email,
        phone: phone !== undefined ? phone : existingLead.phone,
        whatsapp: whatsapp !== undefined ? whatsapp : existingLead.whatsapp,
        website: website !== undefined ? website : existingLead.website,
        address: address !== undefined ? address : existingLead.address,
        country: country !== undefined ? country : existingLead.country,
        industry: industry !== undefined ? industry : existingLead.industry,
        source: source !== undefined ? source : existingLead.source,
        service: service !== undefined ? service : existingLead.service,
        estimatedBudget: budget,
        expectedStartDate: startDate,
        priority: priority !== undefined ? priority : existingLead.priority,
        status: status !== undefined ? status : existingLead.status,
        assignedToId: assignedToId !== undefined ? assignedToId : existingLead.assignedToId,
        tags: tags !== undefined ? tags : existingLead.tags,
        internalNotes: internalNotes !== undefined ? internalNotes : existingLead.internalNotes,
        isArchived: isArchived !== undefined ? isArchived : existingLead.isArchived,
      },
    });

    // Automatically log activities for status or assignee changes
    if (status && status !== existingLead.status) {
      await prisma.activity.create({
        data: {
          leadId: id,
          userId: userId,
          type: 'STATUS_CHANGED',
          description: `Status changed from "${existingLead.status}" to "${status}".`,
          metadata: JSON.stringify({ oldStatus: existingLead.status, newStatus: status }),
        },
      });
    }

    if (assignedToId && assignedToId !== existingLead.assignedToId) {
      const newAssignee = await prisma.user.findUnique({ where: { id: assignedToId } });
      await prisma.activity.create({
        data: {
          leadId: id,
          userId: userId,
          type: 'STATUS_CHANGED',
          description: `Lead assigned to ${newAssignee ? newAssignee.name : 'Unknown User'}.`,
        },
      });
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

// Delete or duplicate lead
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'duplicate') {
      const existingLead = await prisma.lead.findUnique({ where: { id } });
      if (!existingLead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const duplicated = await prisma.lead.create({
        data: {
          name: `${existingLead.name} (Copy)`,
          companyName: existingLead.companyName,
          contactPerson: existingLead.contactPerson,
          email: existingLead.email,
          phone: existingLead.phone,
          whatsapp: existingLead.whatsapp,
          website: existingLead.website,
          address: existingLead.address,
          country: existingLead.country,
          industry: existingLead.industry,
          source: existingLead.source,
          service: existingLead.service,
          estimatedBudget: existingLead.estimatedBudget,
          priority: existingLead.priority,
          status: 'NEW', // reset status
          assignedToId: userId,
          createdById: userId,
          tags: existingLead.tags,
          internalNotes: existingLead.internalNotes,
        },
      });

      await prisma.activity.create({
        data: {
          leadId: duplicated.id,
          userId: userId,
          type: 'LEAD_CREATED',
          description: `Duplicated from lead "${existingLead.name}".`,
        },
      });

      return NextResponse.json({ success: true, lead: duplicated });
    }

    // Handle posting a new note or attachment on this lead
    const body = await req.json();
    if (body.note) {
      const note = await prisma.note.create({
        data: {
          leadId: id,
          createdById: userId,
          content: body.note,
        },
      });

      await prisma.activity.create({
        data: {
          leadId: id,
          userId: userId,
          type: 'NOTE_ADDED',
          description: 'Added a new internal note.',
        },
      });

      return NextResponse.json({ success: true, note });
    }

    if (body.fileName && body.fileUrl) {
      const attachment = await prisma.attachment.create({
        data: {
          leadId: id,
          uploadedById: userId,
          fileName: body.fileName,
          fileKey: body.fileKey || 'local-mock',
          fileUrl: body.fileUrl,
          fileType: body.fileType || 'PDF',
          fileSize: body.fileSize || 1024,
        },
      });

      await prisma.activity.create({
        data: {
          leadId: id,
          userId: userId,
          type: 'ATTACHMENT_UPLOADED',
          description: `Uploaded attachment "${body.fileName}".`,
        },
      });

      return NextResponse.json({ success: true, attachment });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Lead action error:', error);
    return NextResponse.json({ error: 'Failed to process lead action' }, { status: 500 });
  }
}

// Hard Delete Lead
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role (restricted to ADMIN)
  const user = await prisma.user.findUnique({ where: { id: sessionCookie.value } });
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Requires Admin privileges' }, { status: 403 });
  }

  const { id } = params;

  try {
    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Lead permanently deleted' });
  } catch (error) {
    console.error('Delete lead error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
