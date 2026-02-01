'use client';

import { useState, useEffect } from 'react';
import { Eye, Check, CreditCard, Printer, Send, Ban, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';

interface InvoiceLine {
  id?: string;
  productId: string;
  product?: { name: string };
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  analyticalAccountId: string | null;
  analyticalAccount?: { code: string; name: string } | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: { name: string; email?: string };
  salesOrderId: string | null;
  salesOrder?: { orderNumber: string } | null;
  invoiceDate: string;
  dueDate: string;
  status: string;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  lines: InvoiceLine[];
}

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num || 0);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getPaymentStatus = (invoice: Invoice) => {
  const total = parseFloat(invoice.totalAmount) || 0;
  const paid = parseFloat(invoice.paidAmount) || 0;
  
  if (paid >= total && total > 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'NOT_PAID';
};

const printInvoice = (invoice: Invoice) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the invoice');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1f2937; }
        .header p { margin: 5px 0; color: #6b7280; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-box { padding: 15px; background: #f9fafb; border-radius: 8px; }
        .info-box h3 { margin: 0 0 10px 0; color: #374151; font-size: 14px; }
        .info-box p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        .text-right { text-align: right; }
        .totals { margin-top: 20px; }
        .totals tr td { padding: 8px 12px; }
        .totals .total-row { font-weight: bold; font-size: 16px; background: #f3f4f6; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SHIV FURNITURE</h1>
        <p>Budget Accounting System</p>
        <h2 style="margin-top: 20px;">TAX INVOICE</h2>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <h3>INVOICE DETAILS</h3>
          <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
          <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
          <p><strong>Status:</strong> ${invoice.status}</p>
        </div>
        <div class="info-box">
          <h3>BILL TO</h3>
          <p><strong>${invoice.customer.name}</strong></p>
          ${invoice.customer.email ? `<p>${invoice.customer.email}</p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.lines.map((line, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${line.product?.name || line.description}</td>
              <td class="text-right">${line.quantity}</td>
              <td class="text-right">${formatCurrency(line.unitPrice)}</td>
              <td class="text-right">${formatCurrency(line.lineTotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <table class="totals" style="width: 300px; margin-left: auto;">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
        </tr>
        <tr>
          <td>Tax (GST):</td>
          <td class="text-right">${formatCurrency(invoice.taxAmount)}</td>
        </tr>
        <tr class="total-row">
          <td>Total:</td>
          <td class="text-right">${formatCurrency(invoice.totalAmount)}</td>
        </tr>
        <tr style="color: green;">
          <td>Paid:</td>
          <td class="text-right">${formatCurrency(invoice.paidAmount)}</td>
        </tr>
        <tr style="color: red; font-weight: bold;">
          <td>Balance Due:</td>
          <td class="text-right">${formatCurrency(parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount))}</td>
        </tr>
      </table>

      ${invoice.notes ? `<div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const [paymentData, setPaymentData] = useState({
    paymentVia: 'CASH',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete invoice');
      }
      toast.success('Invoice cancelled successfully');
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    const amountDue = Math.round((parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount)) * 100) / 100;
    setPaymentData({
      paymentVia: 'CASH',
      amount: amountDue.toFixed(2),
      date: new Date().toISOString().split('T')[0],
      note: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    const amount = parseFloat(paymentData.amount);
    const amountDue = parseFloat(payingInvoice.totalAmount) - parseFloat(payingInvoice.paidAmount);
    
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    
    if (amount > amountDue) {
      toast.error(`Payment amount cannot exceed due amount (${formatCurrency(amountDue)})`);
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INCOMING',
          invoiceId: payingInvoice.id,
          contactId: payingInvoice.customerId,
          amount: amount,
          paymentDate: paymentData.date,
          method: paymentData.paymentVia,
          notes: paymentData.note || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      toast.success('Payment received successfully');
      setIsPaymentModalOpen(false);
      setPayingInvoice(null);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage customer invoices</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-40"
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <LoadingSpinner />
      ) : invoices.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="No invoices"
            description="Invoices are created from confirmed Sales Orders."
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Received</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map((invoice) => {
                    const amountDue = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
                    const paymentStatus = getPaymentStatus(invoice);
                    const isConfirmed = invoice.status === 'POSTED' || invoice.status === 'CONFIRMED';
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className="font-medium text-primary-600 dark:text-primary-400">{invoice.invoiceNumber}</span>
                            {invoice.salesOrder && (
                              <p className="text-xs text-gray-500">SO: {invoice.salesOrder.orderNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{invoice.customer.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(invoice.invoiceDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(invoice.dueDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-semibold">{formatCurrency(amountDue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isConfirmed && (
                            <StatusBadge status={paymentStatus} />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setViewingInvoice(invoice); setIsViewModalOpen(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            
                            <button
                              onClick={() => printInvoice(invoice)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4 text-blue-600" />
                            </button>
                            
                            {invoice.status !== 'CANCELLED' && paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => openPaymentModal(invoice)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                                title="Receive Payment"
                              >
                                <CreditCard className="w-4 h-4" />
                                Receive
                              </button>
                            )}
                            
                            {invoice.status === 'DRAFT' && (
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / 10)}
            onPageChange={setPage}
          />
        </>
      )}

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Invoice ${viewingInvoice?.invoiceNumber}`}
        size="lg"
      >
        {viewingInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{viewingInvoice.customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={viewingInvoice.status} />
                  {(viewingInvoice.status === 'POSTED' || viewingInvoice.status === 'CONFIRMED') && (
                    <StatusBadge status={getPaymentStatus(viewingInvoice)} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-medium">{formatDate(viewingInvoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium">{formatDate(viewingInvoice.dueDate)}</p>
              </div>
              {viewingInvoice.salesOrder && (
                <div>
                  <p className="text-sm text-gray-500">Sales Order</p>
                  <p className="font-medium">{viewingInvoice.salesOrder.orderNumber}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Line Items</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-left p-2">Cost Center</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.lines.map((line, idx) => (
                    <tr key={idx} className="border-b dark:border-gray-700">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{line.product?.name || line.description}</td>
                      <td className="p-2 text-right">{line.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(line.lineTotal)}</td>
                      <td className="p-2">{line.analyticalAccount ? `${line.analyticalAccount.code}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td colSpan={4} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingInvoice.totalAmount)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-green-600">
                    <td colSpan={4} className="p-2 text-right">Received:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingInvoice.paidAmount)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-red-600">
                    <td colSpan={4} className="p-2 text-right">Amount Due:</td>
                    <td className="p-2 text-right">{formatCurrency(parseFloat(viewingInvoice.totalAmount) - parseFloat(viewingInvoice.paidAmount))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewingInvoice.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm">{viewingInvoice.notes}</p>
              </div>
            )}
            
            {/* Action buttons in view modal */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => printInvoice(viewingInvoice)}
                className="btn-secondary flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
              {(viewingInvoice.status === 'POSTED' || viewingInvoice.status === 'CONFIRMED') && getPaymentStatus(viewingInvoice) !== 'PAID' && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openPaymentModal(viewingInvoice);
                  }}
                  className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Receive Payment
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPayingInvoice(null);
        }}
        title="Receive Payment"
        size="md"
      >
        {payingInvoice && (() => {
          const amountDue = Math.round((parseFloat(payingInvoice.totalAmount) - parseFloat(payingInvoice.paidAmount)) * 100) / 100;
          const paymentAmount = Math.round((parseFloat(paymentData.amount) || 0) * 100) / 100;
          const remainingAfterPayment = Math.round((amountDue - paymentAmount) * 100) / 100;
          
          return (
          <form onSubmit={handlePayment} className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2 border-b pb-4">
              <button type="submit" className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4" />
                Confirm
              </button>
              <button type="button" onClick={() => printInvoice(payingInvoice)} className="btn-secondary flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button type="button" className="btn-secondary flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPayingInvoice(null);
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Cancel
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Customer</span>
                <span className="font-medium">{payingInvoice.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Invoice Total</span>
                <span className="font-medium">{formatCurrency(payingInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Already Received</span>
                <span className="font-medium text-green-600">{formatCurrency(payingInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Amount Due</span>
                <span className="font-bold text-red-600">{formatCurrency(amountDue)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={amountDue}
                    value={paymentData.amount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (val > amountDue) {
                        setPaymentData({ ...paymentData, amount: amountDue.toString() });
                      } else {
                        setPaymentData({ ...paymentData, amount: e.target.value });
                      }
                    }}
                    className="input-field w-full"
                    required
                  />
                  {paymentAmount > amountDue && (
                    <p className="text-red-500 text-xs mt-1">Amount cannot exceed {formatCurrency(amountDue)}</p>
                  )}
                </div>
                <Select
                  label="Payment Via"
                  value={paymentData.paymentVia}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentVia: e.target.value })}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'BANK', label: 'Bank Transfer' },
                    { value: 'UPI', label: 'UPI' },
                    { value: 'CHEQUE', label: 'Cheque' },
                  ]}
                />
              </div>

              <Input
                label="Date"
                type="date"
                value={paymentData.date}
                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
              />

              <Textarea
                label="Note"
                value={paymentData.note}
                onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                placeholder="Alpha numeric (text)"
                rows={2}
              />
            </div>

            {/* Remaining Amount After Payment */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Remaining After Payment</span>
                <span className={`font-bold text-lg ${remainingAfterPayment <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(Math.max(0, remainingAfterPayment))}
                </span>
              </div>
              {remainingAfterPayment <= 0 && paymentAmount > 0 && (
                <p className="text-green-600 text-sm mt-1">✓ Invoice will be fully paid</p>
              )}
            </div>
          </form>
        );
        })()}
      </Modal>
    </div>
  );
}
