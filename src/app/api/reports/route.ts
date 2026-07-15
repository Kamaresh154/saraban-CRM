import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SERVICES } from '@/lib/services';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('vd_session');
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = sessionCookie.value;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMember = user && user.role !== 'ADMIN';

    // Core filters based on role
    const baseWhere: any = { isArchived: false };
    if (isMember) {
      baseWhere.assignedToId = userId;
    }

    // 1. KPI Counts and setup
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const followUpsWhere: any = { status: 'PENDING' };
    if (isMember) followUpsWhere.assignedToId = userId;

    const [
      totalLeads,
      newLeadsMonth,
      hotLeads,
      followUpsDueToday,
      followUpsOverdue,
      convertedClients,
      closedLeads,
    ] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { ...baseWhere, priority: { in: ['HIGH', 'URGENT'] }, status: { notIn: ['WON', 'LOST'] } } }),
      prisma.followUp.count({ where: { ...followUpsWhere, scheduledAt: { gte: startOfToday, lte: endOfToday } } }),
      prisma.followUp.count({ where: { ...followUpsWhere, status: 'OVERDUE' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'WON' } }),
      prisma.lead.count({ where: { ...baseWhere, status: { in: ['WON', 'LOST'] } } }),
    ]);

    const conversionRate = closedLeads > 0 ? (convertedClients / closedLeads) * 100 : 0;

    // 2. Charts Data (Optimized with groupBy to query in parallel)
    const statuses = ['NEW', 'CONTACTED', 'FOLLOW_UP_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD'];
    const sources = ['Website', 'Referral', 'Cold outreach', 'Inbound', 'Other'];

    const [statusGroups, serviceGroups, sourceGroups] = await Promise.all([
      prisma.lead.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      prisma.lead.groupBy({
        by: ['service'],
        where: baseWhere,
        _count: { service: true },
      }),
      prisma.lead.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: { source: true },
      }),
    ]);

    const statusDistribution = statuses.map((status) => {
      const g = statusGroups.find((x) => x.status === status);
      return { name: status.replace(/_/g, ' '), value: g?._count.status || 0 };
    });

    const serviceMap = new Map<string, number>();
    SERVICES.forEach((s) => serviceMap.set(s, 0));
    serviceGroups.forEach((g) => serviceMap.set(g.service, g._count.service));
    const serviceDistribution = Array.from(serviceMap.entries()).map(([name, value]) => ({ name, value }));

    const sourceDistribution = sources.map((source) => {
      const g = sourceGroups.find((x) => x.source === source);
      return { name: source, value: g?._count.source || 0 };
    });

    // 3. Monthly Trends (Executed in parallel)
    const monthlyTrendsPromises = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short' });

      monthlyTrendsPromises.push(
        Promise.all([
          prisma.lead.count({
            where: { ...baseWhere, createdAt: { gte: start, lte: end } },
          }),
          prisma.lead.count({
            where: { ...baseWhere, status: 'WON', updatedAt: { gte: start, lte: end } },
          }),
        ]).then(([count, won]) => ({
          month: monthName,
          leads: count,
          conversions: won,
        }))
      );
    }
    const monthlyTrends = await Promise.all(monthlyTrendsPromises);

    // 4. Recent activities feed (Global or Personal)
    const activitiesWhere: any = {};
    if (isMember) {
      activitiesWhere.lead = { assignedToId: userId };
    }

    const recentActivitiesPromise = prisma.activity.findMany({
      where: activitiesWhere,
      include: {
        user: { select: { name: true } },
        lead: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 5. Team performance (For admin settings/reports)
    let teamPerformance: any[] = [];
    const activeUsersPromise = !isMember
      ? prisma.user.findMany({ where: { status: 'ACTIVE' } })
      : Promise.resolve([]);

    const [recentActivities, activeUsers] = await Promise.all([
      recentActivitiesPromise,
      activeUsersPromise,
    ]);

    if (!isMember && activeUsers.length > 0) {
      teamPerformance = await Promise.all(
        activeUsers.map(async (u) => {
          const [completedReminders, totalAssignedLeads, wonLeads] = await Promise.all([
            prisma.followUp.count({
              where: { assignedToId: u.id, status: 'COMPLETED' },
            }),
            prisma.lead.count({
              where: { assignedToId: u.id },
            }),
            prisma.lead.count({
              where: { assignedToId: u.id, status: 'WON' },
            }),
          ]);
          return {
            name: u.name,
            completedReminders,
            assignedLeads: totalAssignedLeads,
            wonLeads,
          };
        })
      );
    }

    return NextResponse.json({
      stats: {
        totalLeads,
        newLeadsMonth,
        hotLeads,
        followUpsDueToday,
        followUpsOverdue,
        convertedClients,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
      },
      charts: {
        statusDistribution,
        serviceDistribution,
        sourceDistribution,
        monthlyTrends,
      },
      recentActivities,
      teamPerformance,
    });
  } catch (error) {
    console.error('Reports aggregation error:', error);
    return NextResponse.json({ error: 'Failed to aggregate reports' }, { status: 500 });
  }
}
