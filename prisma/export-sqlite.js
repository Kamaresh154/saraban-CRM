const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting SQLite Data Export ---');

  try {
    const users = await prisma.user.findMany();
    console.log(`Exported ${users.length} Users`);

    const leads = await prisma.lead.findMany();
    console.log(`Exported ${leads.length} Leads`);

    const followUps = await prisma.followUp.findMany();
    console.log(`Exported ${followUps.length} Follow-ups`);

    const activities = await prisma.activity.findMany();
    console.log(`Exported ${activities.length} Activities`);

    const notes = await prisma.note.findMany();
    console.log(`Exported ${notes.length} Notes`);

    const attachments = await prisma.attachment.findMany();
    console.log(`Exported ${attachments.length} Attachments`);

    const calendarSyncs = await prisma.calendarSync.findMany();
    console.log(`Exported ${calendarSyncs.length} Calendar Connections`);

    const savedFilters = await prisma.savedFilter.findMany();
    console.log(`Exported ${savedFilters.length} Saved Filters`);

    const exportData = {
      users,
      leads,
      followUps,
      activities,
      notes,
      attachments,
      calendarSyncs,
      savedFilters
    };

    const dumpPath = path.join(__dirname, 'sqlite-dump.json');
    fs.writeFileSync(dumpPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`Successfully exported data to: ${dumpPath}`);
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
