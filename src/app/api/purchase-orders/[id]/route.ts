import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { parseDecimal } from '@/lib/utils';
import { applyAutoAnalyticalToLines } from '@/lib/auto-analytical';
import { sendEmail, generatePurchaseOrderEmail } from '@/lib/email';

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
        vendorBills: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase order' }, { status: 500 });
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

    // If lines are being updated
    if (body.lines) {
      // Delete existing lines
      await prisma.purchaseOrderLine.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Apply auto analytical rules
      const linesWithAnalytical = await applyAutoAnalyticalToLines(body.lines);

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;

      const lines = linesWithAnalytical.map((line: any) => {
        const lineSubtotal = parseDecimal(line.quantity) * parseDecimal(line.unitPrice);
        const lineTax = lineSubtotal * (parseDecimal(line.taxRate) / 100);
        const lineTotal = lineSubtotal + lineTax;

        subtotal += lineSubtotal;
        taxAmount += lineTax;

        return {
          purchaseOrderId: id,
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          taxAmount: lineTax,
          lineTotal: lineTotal,
          analyticalAccountId: line.analyticalAccountId,
        };
      });

      const totalAmount = subtotal + taxAmount;

      // Create new lines
      await prisma.purchaseOrderLine.createMany({
        data: lines,
      });

      // Update order
      const order = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: body.vendorId,
          orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
          status: body.status,
          subtotal,
          taxAmount,
          totalAmount,
          notes: body.notes,
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

      // Send email and create Vendor Bill if status is CONFIRMED
      if (body.status === 'SENT') {
        // Send email to vendor when order is sent
        if (order.vendor?.email) {
          try {
            const emailHtml = generatePurchaseOrderEmail({
              orderNumber: order.orderNumber,
              vendorName: order.vendor.name,
              vendorEmail: order.vendor.email,
              orderDate: order.orderDate,
              expectedDate: order.expectedDate,
              lines: order.lines,
              totalAmount: order.totalAmount,
              notes: order.notes,
            });

            await sendEmail({
              to: order.vendor.email,
              subject: `Purchase Order ${order.orderNumber} from Shiv Furniture - Action Required`,
              html: emailHtml,
            });

            console.log(`✅ Purchase order email sent to ${order.vendor.email}`);
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the request if email fails
          }
        }
      }

      // Create Vendor Bill when status changes to CONFIRMED (after vendor confirms)
      if (body.status === 'CONFIRMED') {
        // Create Vendor Bill automatically
        try {
          // Check if vendor bill already exists for this PO
          const existingBill = await prisma.vendorBill.findFirst({
            where: { purchaseOrderId: id },
          });

          if (!existingBill) {
            // Generate bill number
            const lastBill = await prisma.vendorBill.findFirst({
              orderBy: { billNumber: 'desc' },
            });
            const lastNum = lastBill ? parseInt(lastBill.billNumber.replace('BILL-', '')) : 0;
            const billNumber = `BILL-${String(lastNum + 1).padStart(5, '0')}`;

            // Create the vendor bill with lines from PO
            await prisma.vendorBill.create({
              data: {
                billNumber,
                vendorId: order.vendorId,
                purchaseOrderId: id,
                billDate: new Date(),
                dueDate: order.expectedDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'POSTED',
                subtotal: order.subtotal,
                taxAmount: order.taxAmount,
                totalAmount: order.totalAmount,
                paidAmount: 0,
                notes: `Bill created from Purchase Order ${order.orderNumber}`,
                lines: {
                  create: order.lines.map((line: any) => ({
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
          // Don't fail the request if bill creation fails
        }
      }

      return NextResponse.json({ order });
    }

    // Simple update without lines
    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: body.status,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
        notes: body.notes,
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

    // Send email when status changes to SENT
    if (body.status === 'SENT') {
      if (order.vendor?.email) {
        try {
          const emailHtml = generatePurchaseOrderEmail({
            orderNumber: order.orderNumber,
            vendorName: order.vendor.name,
            vendorEmail: order.vendor.email,
            orderDate: order.orderDate,
            expectedDate: order.expectedDate,
            lines: order.lines,
            totalAmount: order.totalAmount,
            notes: order.notes,
          });

          await sendEmail({
            to: order.vendor.email,
            subject: `Purchase Order ${order.orderNumber} from Shiv Furniture - Action Required`,
            html: emailHtml,
          });

          console.log(`✅ Purchase order email sent to ${order.vendor.email}`);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }
    }

    // Create Vendor Bill when status changes to CONFIRMED (after vendor confirms)
    if (body.status === 'CONFIRMED') {
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
              notes: `Bill created from Purchase Order ${order.orderNumber}`,
              lines: {
                create: order.lines.map((line: any) => ({
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
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 });
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

    // Check if there are linked bills
    const linkedBills = await prisma.vendorBill.count({
      where: { purchaseOrderId: id },
    });

    if (linkedBills > 0) {
      return NextResponse.json(
        { error: 'Cannot delete purchase order with linked bills' },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 });
  }
}
