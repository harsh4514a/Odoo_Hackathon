import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        budgetLines: {
          include: {
            analyticalAccount: true,
          },
        },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const currentBudget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!currentBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Update budget lines - delete existing and create new ones
    if (body.budgetLines) {
      await prisma.budgetLine.deleteMany({
        where: { budgetId: id },
      });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: body.name,
        periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
        status: body.status,
        stage: body.stage,
        notes: body.notes,
        revisedBudgetId: body.revisedBudgetId,
        isActive: body.isActive,
        budgetLines: body.budgetLines ? {
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

    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.budget.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}
