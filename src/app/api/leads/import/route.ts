import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = sessionCookie.value;

  try {
    const body = await req.json();
    const { contacts, duplicateResolution } = body; // 'skip' | 'update' | 'import_all'

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: 'Contacts must be an array' }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const contact of contacts) {
      const {
        name,
        phone,
        address,
        email,
        companyName,
        source,
        service,
        internalNotes
      } = contact;

      // Basic validation: Name, Phone, and Address are required
      if (!name || !phone || !address) {
        skippedCount++;
        continue;
      }

      // Check for duplicate on phone or email
      let existingLead = null;
      if (email || phone) {
        existingLead = await prisma.lead.findFirst({
          where: {
            OR: [
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : [])
            ],
            isArchived: false
          }
        });
      }

      if (existingLead) {
        if (duplicateResolution === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateResolution === 'update') {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              name: name || existingLead.name,
              contactPerson: name || existingLead.contactPerson,
              phone: phone || existingLead.phone,
              address: address || existingLead.address,
              email: email || existingLead.email,
              companyName: companyName || existingLead.companyName,
              source: source || existingLead.source,
              service: service || existingLead.service,
              internalNotes: internalNotes 
                ? (existingLead.internalNotes ? `${existingLead.internalNotes}\n${internalNotes}` : internalNotes)
                : existingLead.internalNotes
            }
          });

          await prisma.activity.create({
            data: {
              leadId: existingLead.id,
              userId,
              type: 'STATUS_CHANGED',
              description: `Lead updated via spreadsheet import.`
            }
          });

          updatedCount++;
          continue;
        }
      }

      // Create new lead
      const newLead = await prisma.lead.create({
        data: {
          name,
          contactPerson: name,
          phone,
          address,
          email: email || '',
          companyName: companyName || '',
          source: source || 'Import',
          service: service || 'Website',
          priority: 'MEDIUM',
          status: 'NEW',
          assignedToId: userId,
          createdById: userId,
          tags: 'imported',
          internalNotes: internalNotes || ''
        }
      });

      await prisma.activity.create({
        data: {
          leadId: newLead.id,
          userId,
          type: 'LEAD_CREATED',
          description: `Lead "${newLead.name}" imported from spreadsheet.`
        }
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      updatedCount,
      message: `${importedCount} contacts imported successfully, ${updatedCount} updated, ${skippedCount} skipped.`
    });
  } catch (err) {
    console.error('Import API error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
