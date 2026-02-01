import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const stage = searchParams.get('stage');
    const year = searchParams.get('year');

    const where: any = { isActive: true };
    
    if (status) {
      where.status = status;
    }

    if (stage) {
      where.stage = stage;
    }

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      where.periodStart = { gte: startDate };
      where.periodEnd = { lte: endDate };
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        budgetLines: {
          include: {
            analyticalAccount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const budget = await prisma.budget.create({
      data: {
        name: body.name,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        status: body.status || 'NEW',
        stage: body.stage || 'DRAFT',
        notes: body.notes,
        revisedBudgetId: body.revisedBudgetId,
        budgetLines: body.budgetLines?.length > 0 ? {
          create: body.budgetLines.map((line: any) => ({
            analyticalAccountId: line.analyticalAccountId,
            type: line.type || 'EXPENSE',
            budgetedAmount: line.budgetedAmount,
            achievedAmount: line.achievedAmount || 0,
          })),
        } : undefined,
      },
      include: {
        budgetLines: {
          include: {
            analyticalAccount: true,
          },
        },
      },
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}
