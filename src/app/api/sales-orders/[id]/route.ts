import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { parseDecimal } from '@/lib/utils';
import { applyAutoAnalyticalToLines } from '@/lib/auto-analytical';
import { sendEmail, generateSalesOrderEmail } from '@/lib/email';

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
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
            analyticalAccount: true,
          },
        },
        invoices: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
    }

    // Check customer access
    if (user.role === 'CUSTOMER' && user.contactId !== order.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    return NextResponse.json({ error: 'Failed to fetch sales order' }, { status: 500 });
  }
}

// PATCH - Update status only
export async function PATCH(
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

    const order = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: body.status,
      },
      include: {
        customer: true,
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
      console.log('📧 Status changed to SENT, checking customer email...');
      console.log('Customer data:', JSON.stringify(order.customer, null, 2));
      
      if (order.customer?.email) {
        try {
          console.log('📧 Preparing to send email to:', order.customer.email);
          const emailHtml = generateSalesOrderEmail({
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            customerEmail: order.customer.email,
            orderDate: order.orderDate,
            expectedDate: order.expectedDate,
            lines: order.lines,
            totalAmount: order.totalAmount,
            notes: order.notes,
          });

          await sendEmail({
            to: order.customer.email,
            subject: `Sales Order ${order.orderNumber} from Shiv Furniture`,
            html: emailHtml,
          });

          console.log(`✅ Sales order email sent to ${order.customer.email}`);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      } else {
        console.log('⚠️ Customer does not have an email address. Email not sent.');
      }
    }

    // Create Invoice when status changes to CONFIRMED
    if (body.status === 'CONFIRMED') {
      try {
        const existingInvoice = await prisma.invoice.findFirst({
          where: { salesOrderId: id },
        });

        if (!existingInvoice) {
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { invoiceNumber: 'desc' },
          });
          const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) : 0;
          const invoiceNumber = `INV-${String(lastNum + 1).padStart(5, '0')}`;

          await prisma.invoice.create({
            data: {
              invoiceNumber,
              customerId: order.customerId,
              salesOrderId: id,
              invoiceDate: new Date(),
              dueDate: order.expectedDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'POSTED',
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              totalAmount: order.totalAmount,
              paidAmount: 0,
              notes: `Invoice created from Sales Order ${order.orderNumber}`,
              lines: {
                create: order.lines.map((line: any) => ({
                  productId: line.productId,
                  description: line.description || '',
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  taxRate: line.taxRate || 0,
                  taxAmount: line.taxAmount || 0,
                  lineTotal: line.lineTotal,
                  analyticalAccountId: line.analyticalAccountId,
                })),
              },
            },
          });
          console.log(`✅ Invoice ${invoiceNumber} created for SO ${order.orderNumber}`);
        }
      } catch (invoiceError) {
        console.error('Failed to create invoice:', invoiceError);
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating sales order status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

// PUT - Full update
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

    if (body.lines) {
      await prisma.salesOrderLine.deleteMany({
        where: { salesOrderId: id },
      });

      const linesWithAnalytical = await applyAutoAnalyticalToLines(body.lines);

      let subtotal = 0;
      let taxAmount = 0;

      const lines = linesWithAnalytical.map((line: any) => {
        const lineSubtotal = parseDecimal(line.quantity) * parseDecimal(line.unitPrice);
        const lineTax = lineSubtotal * (parseDecimal(line.taxRate) / 100);
        const lineTotal = lineSubtotal + lineTax;

        subtotal += lineSubtotal;
        taxAmount += lineTax;

        return {
          salesOrderId: id,
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

      await prisma.salesOrderLine.createMany({
        data: lines,
      });

      const order = await prisma.salesOrder.update({
        where: { id },
        data: {
          customerId: body.customerId,
          orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
          status: body.status,
          subtotal,
          taxAmount,
          totalAmount,
          notes: body.notes,
        },
        include: {
          customer: true,
          lines: {
            include: {
              product: true,
              analyticalAccount: true,
            },
          },
        },
      });

      return NextResponse.json({ order });
    }

    const order = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: body.status,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
        notes: body.notes,
      },
      include: {
        customer: true,
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
      console.log('📧 Status changed to SENT, checking customer email...');
      console.log('Customer data:', JSON.stringify(order.customer, null, 2));
      
      if (order.customer?.email) {
        try {
          console.log('📧 Preparing to send email to:', order.customer.email);
          const emailHtml = generateSalesOrderEmail({
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            customerEmail: order.customer.email,
            orderDate: order.orderDate,
            expectedDate: order.expectedDate,
            lines: order.lines,
            totalAmount: order.totalAmount,
            notes: order.notes,
          });

          await sendEmail({
            to: order.customer.email,
            subject: `Sales Order ${order.orderNumber} from Shiv Furniture`,
            html: emailHtml,
          });

          console.log(`✅ Sales order email sent to ${order.customer.email}`);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      } else {
        console.log('⚠️ Customer does not have an email address. Email not sent.');
      }
    }

    // Create Invoice when status changes to CONFIRMED
    if (body.status === 'CONFIRMED') {
      try {
        // Check if invoice already exists for this SO
        const existingInvoice = await prisma.invoice.findFirst({
          where: { salesOrderId: id },
        });

        if (!existingInvoice) {
          // Generate invoice number
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { invoiceNumber: 'desc' },
          });
          const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace('INV-', '')) : 0;
          const invoiceNumber = `INV-${String(lastNum + 1).padStart(5, '0')}`;

          // Create the invoice with lines from SO
          await prisma.invoice.create({
            data: {
              invoiceNumber,
              customerId: order.customerId,
              salesOrderId: id,
              invoiceDate: new Date(),
              dueDate: order.expectedDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'POSTED',
              subtotal: order.subtotal,
              taxAmount: order.taxAmount,
              totalAmount: order.totalAmount,
              paidAmount: 0,
              notes: `Invoice created from Sales Order ${order.orderNumber}`,
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
          console.log(`✅ Invoice ${invoiceNumber} created for SO ${order.orderNumber}`);
        }
      } catch (invoiceError) {
        console.error('Failed to create invoice:', invoiceError);
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating sales order:', error);
    return NextResponse.json({ error: 'Failed to update sales order' }, { status: 500 });
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

    const linkedInvoices = await prisma.invoice.count({
      where: { salesOrderId: id },
    });

    if (linkedInvoices > 0) {
      return NextResponse.json(
        { error: 'Cannot delete sales order with linked invoices' },
        { status: 400 }
      );
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sales order:', error);
    return NextResponse.json({ error: 'Failed to delete sales order' }, { status: 500 });
  }
}
