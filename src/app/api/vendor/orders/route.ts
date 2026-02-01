import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a vendor
    if (user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Access denied. Vendor access required.' }, { status: 403 });
    }

    // Get vendor's contact ID
    if (!user.contactId) {
      return NextResponse.json({ error: 'Vendor profile not linked' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      vendorId: user.contactId,
      status: {
        in: ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'],
      },
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
