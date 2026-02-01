const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBillsForConfirmedPOs() {
  try {
    const confirmedPOs = await prisma.purchaseOrder.findMany({
      where: { status: 'CONFIRMED' },
      include: { vendor: true, lines: true, vendorBills: true }
    });
    
    console.log('Found confirmed POs:', confirmedPOs.length);
    
    for (const po of confirmedPOs) {
      if (po.vendorBills.length === 0) {
        const lastBill = await prisma.vendorBill.findFirst({
          orderBy: { billNumber: 'desc' }
        });
        const lastNum = lastBill ? parseInt(lastBill.billNumber.replace('BILL-', '')) : 0;
        const billNumber = 'BILL-' + String(lastNum + 1).padStart(5, '0');
        
        await prisma.vendorBill.create({
          data: {
            billNumber,
            vendorId: po.vendorId,
            purchaseOrderId: po.id,
            billDate: new Date(),
            dueDate: po.expectedDate || new Date(Date.now() + 30*24*60*60*1000),
            status: 'DRAFT',
            subtotal: po.subtotal,
            taxAmount: po.taxAmount,
            totalAmount: po.totalAmount,
            paidAmount: 0,
            notes: 'Bill created from Purchase Order ' + po.orderNumber,
            lines: {
              create: po.lines.map(line => ({
                productId: line.productId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                taxRate: line.taxRate,
                taxAmount: line.taxAmount,
                lineTotal: line.lineTotal,
                analyticalAccountId: line.analyticalAccountId
              }))
            }
          }
        });
        console.log('Created bill', billNumber, 'for PO', po.orderNumber);
      } else {
        console.log('Bill already exists for PO', po.orderNumber);
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBillsForConfirmedPOs();
