import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a vendor
    if (user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Access denied. Vendor access required.' }, { status: 403 });
    }

    if (!user.contactId) {
      return NextResponse.json({ error: 'Vendor profile not linked' }, { status: 400 });
    }

    const { id } = await params;

    // Get the order and verify it belongs to this vendor
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
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

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.vendorId !== user.contactId) {
      return NextResponse.json({ error: 'Access denied. This order does not belong to you.' }, { status: 403 });
    }

    if (order.status !== 'SENT') {
      return NextResponse.json({ error: 'Only sent orders can be confirmed' }, { status: 400 });
    }

    // Update order status to CONFIRMED
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    // Create Vendor Bill automatically
    try {
      const existingBill = await prisma.vendorBill.findFirst({
        where: { purchaseOrderId: id },
      });

      if (!existingBill) {
        const lastBill = await prisma.vendorBill.findFirst({
          orderBy: { billNumber: 'desc' },
        });
        const lastNum = lastBill ? parseInt(lastBill.billNumber.replace('BILL-', '')) : 0;
        const billNumber = `BILL-${String(lastNum + 1).padStart(5, '0')}`;

        await prisma.vendorBill.create({
          data: {
            billNumber,
            vendorId: order.vendorId,
            purchaseOrderId: id,
            billDate: new Date(),
            dueDate: order.expectedDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'DRAFT',
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            totalAmount: order.totalAmount,
            paidAmount: 0,
            notes: `Bill created from Purchase Order ${order.orderNumber} - Confirmed by Vendor`,
            lines: {
              create: order.lines.map((line) => ({
                productId: line.productId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                taxRate: line.taxRate,
                taxAmount: line.taxAmount,
                lineTotal: line.lineTotal,
                analyticalAccountId: line.analyticalAccountId,
              })),
            },
          },
        });
        console.log(`✅ Vendor Bill ${billNumber} created for PO ${order.orderNumber}`);
      }
    } catch (billError) {
      console.error('Failed to create vendor bill:', billError);
    }

    return NextResponse.json({ 
      success: true, 
      order: updatedOrder,
      message: 'Order confirmed successfully' 
    });
  } catch (error) {
    console.error('Error confirming order:', error);
    return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 });
  }
}
