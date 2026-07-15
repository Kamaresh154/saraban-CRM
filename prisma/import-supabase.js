const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Supabase Data Import ---');

  const dumpPath = path.join(__dirname, 'sqlite-dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error(`Dump file not found at: ${dumpPath}. Please run export-sqlite.js first.`);
    process.exit(1);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

  try {
    // 1. Migrate Users
    console.log(`Migrating ${dump.users.length} Users...`);
    for (const u of dump.users) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            role: u.role,
            status: u.status,
            googleId: u.googleId,
            emailVerified: u.emailVerified,
            mustChangePassword: u.mustChangePassword,
            failedAttempts: u.failedAttempts,
            lockoutUntil: u.lockoutUntil ? new Date(u.lockoutUntil) : null,
            verificationToken: u.verificationToken,
            resetToken: u.resetToken,
            resetTokenExpires: u.resetTokenExpires ? new Date(u.resetTokenExpires) : null,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          }
        });
      }
    }

    // 2. Migrate Leads
    console.log(`Migrating ${dump.leads.length} Leads...`);
    for (const l of dump.leads) {
      const existing = await prisma.lead.findUnique({ where: { id: l.id } });
      if (!existing) {
        await prisma.lead.create({
          data: {
            id: l.id,
            name: l.name,
            companyName: l.companyName,
            contactPerson: l.contactPerson,
            email: l.email,
            phone: l.phone,
            whatsapp: l.whatsapp,
            website: l.website,
            address: l.address,
            country: l.country,
            industry: l.industry,
            source: l.source,
            service: l.service,
            estimatedBudget: l.estimatedBudget,
            expectedStartDate: l.expectedStartDate ? new Date(l.expectedStartDate) : null,
            priority: l.priority,
            status: l.status,
            assignedToId: l.assignedToId,
            createdById: l.createdById,
            tags: l.tags,
            internalNotes: l.internalNotes,
            isArchived: l.isArchived,
            createdAt: new Date(l.createdAt),
            updatedAt: new Date(l.updatedAt),
          }
        });
      }
    }

    // 3. Migrate Follow-ups
    console.log(`Migrating ${dump.followUps.length} Follow-ups...`);
    for (const f of dump.followUps) {
      const existing = await prisma.followUp.findUnique({ where: { id: f.id } });
      if (!existing) {
        await prisma.followUp.create({
          data: {
            id: f.id,
            leadId: f.leadId,
            assignedToId: f.assignedToId,
            type: f.type,
            scheduledAt: new Date(f.scheduledAt),
            reminderTiming: f.reminderTiming,
            priority: f.priority,
            status: f.status,
            note: f.note,
            isRecurring: f.isRecurring,
            recurrence: f.recurrence,
            createdAt: new Date(f.createdAt),
            updatedAt: new Date(f.updatedAt),
          }
        });
      }
    }

    // 4. Migrate Notes
    console.log(`Migrating ${dump.notes.length} Notes...`);
    for (const n of dump.notes) {
      const existing = await prisma.note.findUnique({ where: { id: n.id } });
      if (!existing) {
        await prisma.note.create({
          data: {
            id: n.id,
            leadId: n.leadId,
            createdById: n.createdById,
            content: n.content,
            createdAt: new Date(n.createdAt),
            updatedAt: new Date(n.updatedAt),
          }
        });
      }
    }

    // 5. Migrate Attachments
    console.log(`Migrating ${dump.attachments.length} Attachments...`);
    for (const a of dump.attachments) {
      const existing = await prisma.attachment.findUnique({ where: { id: a.id } });
      if (!existing) {
        await prisma.attachment.create({
          data: {
            id: a.id,
            leadId: a.leadId,
            uploadedById: a.uploadedById,
            fileName: a.fileName,
            fileKey: a.fileKey,
            fileUrl: a.fileUrl,
            fileType: a.fileType,
            fileSize: a.fileSize,
            createdAt: new Date(a.createdAt),
          }
        });
      }
    }

    // 6. Migrate Activities
    console.log(`Migrating ${dump.activities.length} Activities...`);
    for (const ac of dump.activities) {
      const existing = await prisma.activity.findUnique({ where: { id: ac.id } });
      if (!existing) {
        await prisma.activity.create({
          data: {
            id: ac.id,
            leadId: ac.leadId,
            userId: ac.userId,
            type: ac.type,
            description: ac.description,
            metadata: ac.metadata,
            createdAt: new Date(ac.createdAt),
          }
        });
      }
    }

    // 7. Migrate Calendar Syncs
    console.log(`Migrating ${dump.calendarSyncs.length} Calendar Connections...`);
    for (const c of dump.calendarSyncs) {
      const existing = await prisma.calendarSync.findUnique({ where: { id: c.id } });
      if (!existing) {
        await prisma.calendarSync.create({
          data: {
            id: c.id,
            userId: c.userId,
            provider: c.provider,
            accessToken: c.accessToken,
            refreshToken: c.refreshToken,
            expiresAt: new Date(c.expiresAt),
            connectedEmail: c.connectedEmail,
            scope: c.scope,
            syncToken: c.syncToken,
            lastSyncedAt: c.lastSyncedAt ? new Date(c.lastSyncedAt) : null,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          }
        });
      }
    }

    // 8. Migrate Saved Filters
    console.log(`Migrating ${dump.savedFilters.length} Saved Filters...`);
    for (const sf of dump.savedFilters) {
      const existing = await prisma.savedFilter.findUnique({ where: { id: sf.id } });
      if (!existing) {
        await prisma.savedFilter.create({
          data: {
            id: sf.id,
            userId: sf.userId,
            name: sf.name,
            filters: sf.filters,
            createdAt: new Date(sf.createdAt),
          }
        });
      }
    }

    console.log('--- Supabase Import Completed Successfully ---');
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
