import prisma from './prisma';

const SEQUENCE_DEFAULTS: Record<string, { prefix: string; padding: number }> = {
  contact: { prefix: 'CONT', padding: 5 },
  product: { prefix: 'PROD', padding: 5 },
  purchaseOrder: { prefix: 'PO', padding: 5 },
  vendorBill: { prefix: 'BILL', padding: 5 },
  salesOrder: { prefix: 'SO', padding: 5 },
  invoice: { prefix: 'INV', padding: 5 },
  payment: { prefix: 'PAY', padding: 5 },
  analyticalAccount: { prefix: 'AA', padding: 4 },
};

export async function getNextSequence(sequenceName: string): Promise<string> {
  // Try to update existing sequence
  let sequence = await prisma.sequence.findUnique({
    where: { name: sequenceName },
  });

  // If sequence doesn't exist, create it
  if (!sequence) {
    const defaults = SEQUENCE_DEFAULTS[sequenceName] || { prefix: sequenceName.toUpperCase().slice(0, 4), padding: 5 };
    sequence = await prisma.sequence.create({
      data: {
        name: sequenceName,
        prefix: defaults.prefix,
        nextNumber: 1,
        padding: defaults.padding,
      },
    });
  }

  // Now increment and return
  const updated = await prisma.sequence.update({
    where: { name: sequenceName },
    data: { nextNumber: { increment: 1 } },
  });

  const number = (updated.nextNumber - 1).toString().padStart(updated.padding, '0');
  return `${updated.prefix}-${number}`;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calculatePercentage(actual: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.round((actual / budget) * 100 * 100) / 100;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    POSTED: 'bg-green-100 text-green-800',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
    RECEIVED: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function parseDecimal(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return 0;
}
