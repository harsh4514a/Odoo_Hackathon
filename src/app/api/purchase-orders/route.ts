import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getNextSequence, parseDecimal } from '@/lib/utils';
import { applyAutoAnalyticalToLines } from '@/lib/auto-analytical';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: true,
          lines: {
            include: {
              product: true,
              analyticalAccount: true,
            },
          },
          vendorBills: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const orderNumber = await getNextSequence('purchase_order');

    // Apply auto analytical rules to lines without analytical accounts
    const linesWithAnalytical = await applyAutoAnalyticalToLines(body.lines);

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const lines = linesWithAnalytical.map((line: any) => {
      const lineSubtotal = parseDecimal(line.quantity) * parseDecimal(line.unitPrice);
      const lineTax = lineSubtotal * (parseDecimal(line.taxRate || 0) / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        productId: line.productId,
        description: line.description || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || 0,
        taxAmount: lineTax,
        lineTotal: lineTotal,
        analyticalAccountId: line.analyticalAccountId || null,
      };
    });

    const totalAmount = subtotal + taxAmount;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        vendorId: body.vendorId,
        orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        status: body.status || 'DRAFT',
        subtotal,
        taxAmount,
        totalAmount,
        notes: body.notes,
        lines: {
          create: lines,
        },
      },
      include: {
        vendor: true,
        lines: {
          include: {
            product: true,
            analyticalAccount: true,
          },
        },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });
  }
}
