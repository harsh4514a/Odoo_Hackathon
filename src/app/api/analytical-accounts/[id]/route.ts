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
    const analyticalAccount = await prisma.analyticalAccount.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        budgets: true,
        products: { take: 10 },
      },
    });

    if (!analyticalAccount) {
      return NextResponse.json({ error: 'Analytical account not found' }, { status: 404 });
    }

    return NextResponse.json({ analyticalAccount });
  } catch (error) {
    console.error('Error fetching analytical account:', error);
    return NextResponse.json({ error: 'Failed to fetch analytical account' }, { status: 500 });
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

    const analyticalAccount = await prisma.analyticalAccount.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        parentId: body.parentId,
        isActive: body.isActive,
        status: body.status,
      },
    });

    return NextResponse.json({ analyticalAccount });
  } catch (error) {
    console.error('Error updating analytical account:', error);
    return NextResponse.json({ error: 'Failed to update analytical account' }, { status: 500 });
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

    await prisma.analyticalAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting analytical account:', error);
    return NextResponse.json({ error: 'Failed to delete analytical account' }, { status: 500 });
  }
}
