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
    const search = searchParams.get('search');

    const where: any = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const analyticalAccounts = await prisma.analyticalAccount.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            budgetLines: true,
            products: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ analyticalAccounts });
  } catch (error) {
    console.error('Error fetching analytical accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch analytical accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if code already exists
    const existing = await prisma.analyticalAccount.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
    }

    const analyticalAccount = await prisma.analyticalAccount.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        parentId: body.parentId,
      },
      include: {
        parent: true,
      },
    });

    return NextResponse.json({ analyticalAccount }, { status: 201 });
  } catch (error) {
    console.error('Error creating analytical account:', error);
    return NextResponse.json({ error: 'Failed to create analytical account' }, { status: 500 });
  }
}
