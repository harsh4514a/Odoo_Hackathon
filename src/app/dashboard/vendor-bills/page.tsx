'use client';

import { useState, useEffect } from 'react';
import { Eye, Check, X, CreditCard, Printer, Send, Ban, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';

interface VendorBillLine {
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

interface VendorBill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor: { name: string; email?: string };
  purchaseOrderId: string | null;
  purchaseOrder?: { orderNumber: string } | null;
  billDate: string;
  dueDate: string;
  status: string;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  lines: VendorBillLine[];
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

const getPaymentStatus = (bill: VendorBill) => {
  const total = parseFloat(bill.totalAmount) || 0;
  const paid = parseFloat(bill.paidAmount) || 0;
  
  if (paid >= total && total > 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'NOT_PAID';
};

const printBill = (bill: VendorBill) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the bill');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vendor Bill ${bill.billNumber}</title>
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
        <h2 style="margin-top: 20px;">VENDOR BILL</h2>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <h3>BILL DETAILS</h3>
          <p><strong>Bill #:</strong> ${bill.billNumber}</p>
          <p><strong>Date:</strong> ${formatDate(bill.billDate)}</p>
          <p><strong>Due Date:</strong> ${formatDate(bill.dueDate)}</p>
          <p><strong>Status:</strong> ${bill.status}</p>
          ${bill.purchaseOrder ? `<p><strong>PO #:</strong> ${bill.purchaseOrder.orderNumber}</p>` : ''}
        </div>
        <div class="info-box">
          <h3>VENDOR</h3>
          <p><strong>${bill.vendor.name}</strong></p>
          ${bill.vendor.email ? `<p>${bill.vendor.email}</p>` : ''}
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
          ${bill.lines.map((line, idx) => `
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
          <td class="text-right">${formatCurrency(bill.subtotal)}</td>
        </tr>
        <tr>
          <td>Tax (GST):</td>
          <td class="text-right">${formatCurrency(bill.taxAmount)}</td>
        </tr>
        <tr class="total-row">
          <td>Total:</td>
          <td class="text-right">${formatCurrency(bill.totalAmount)}</td>
        </tr>
        <tr style="color: green;">
          <td>Paid:</td>
          <td class="text-right">${formatCurrency(bill.paidAmount)}</td>
        </tr>
        <tr style="color: red; font-weight: bold;">
          <td>Balance Due:</td>
          <td class="text-right">${formatCurrency(parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount))}</td>
        </tr>
      </table>

      ${bill.notes ? `<div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;"><strong>Notes:</strong> ${bill.notes}</div>` : ''}

      <div class="footer">
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

export default function VendorBillsPage() {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<VendorBill | null>(null);
  const [payingBill, setPayingBill] = useState<VendorBill | null>(null);

  const [paymentData, setPaymentData] = useState({
    paymentType: 'SEND',
    paymentVia: 'CASH',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/vendor-bills?${params}`);
      const data = await res.json();
      setBills(data.bills || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch vendor bills');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [page, statusFilter]);

  const handleStatusChange = async (billId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/vendor-bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Bill status updated');
      fetchBills();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      const res = await fetch(`/api/vendor-bills/${billId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete bill');
      }
      toast.success('Bill cancelled successfully');
      fetchBills();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openPaymentModal = (bill: VendorBill) => {
    setPayingBill(bill);
    const amountDue = Math.round((parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount)) * 100) / 100;
    setPaymentData({
      paymentType: 'SEND',
      paymentVia: 'CASH',
      amount: amountDue.toFixed(2),
      date: new Date().toISOString().split('T')[0],
      note: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    const amount = parseFloat(paymentData.amount);
    const amountDue = parseFloat(payingBill.totalAmount) - parseFloat(payingBill.paidAmount);
    
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
          type: 'OUTGOING',
          vendorBillId: payingBill.id,
          contactId: payingBill.vendorId,
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

      toast.success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
      setPayingBill(null);
      fetchBills();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Bills</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage bills from vendors</p>
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

      {/* Bills Table */}
      {loading ? (
        <LoadingSpinner />
      ) : bills.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="No vendor bills"
            description="Vendor bills are created from confirmed Purchase Orders."
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {bills.map((bill) => {
                    const amountDue = parseFloat(bill.totalAmount) - parseFloat(bill.paidAmount);
                    const paymentStatus = getPaymentStatus(bill);
                    const isConfirmed = bill.status === 'POSTED' || bill.status === 'CONFIRMED';
                    
                    return (
                      <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className="font-medium text-primary-600 dark:text-primary-400">{bill.billNumber}</span>
                            {bill.purchaseOrder && (
                              <p className="text-xs text-gray-500">PO: {bill.purchaseOrder.orderNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{bill.vendor.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(bill.billDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(bill.dueDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(bill.totalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">{formatCurrency(bill.paidAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-semibold">{formatCurrency(amountDue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <StatusBadge status={bill.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isConfirmed && (
                            <StatusBadge status={paymentStatus} />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setViewingBill(bill); setIsViewModalOpen(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            
                            {bill.status !== 'CANCELLED' && paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => openPaymentModal(bill)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                                title="Record Payment"
                              >
                                <CreditCard className="w-4 h-4" />
                                Pay
                              </button>
                            )}
                            
                            {bill.status === 'DRAFT' && (
                              <button
                                onClick={() => handleDelete(bill.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="Delete Bill"
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
        title={`Vendor Bill ${viewingBill?.billNumber}`}
        size="lg"
      >
        {viewingBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium">{viewingBill.vendor.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={viewingBill.status} />
                  {(viewingBill.status === 'POSTED' || viewingBill.status === 'CONFIRMED') && (
                    <StatusBadge status={getPaymentStatus(viewingBill)} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bill Date</p>
                <p className="font-medium">{formatDate(viewingBill.billDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium">{formatDate(viewingBill.dueDate)}</p>
              </div>
              {viewingBill.purchaseOrder && (
                <div>
                  <p className="text-sm text-gray-500">Purchase Order</p>
                  <p className="font-medium">{viewingBill.purchaseOrder.orderNumber}</p>
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
                  {viewingBill.lines.map((line, idx) => (
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
                    <td className="p-2 text-right">{formatCurrency(viewingBill.totalAmount)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-green-600">
                    <td colSpan={4} className="p-2 text-right">Paid:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingBill.paidAmount)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-red-600">
                    <td colSpan={4} className="p-2 text-right">Amount Due:</td>
                    <td className="p-2 text-right">{formatCurrency(parseFloat(viewingBill.totalAmount) - parseFloat(viewingBill.paidAmount))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewingBill.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm">{viewingBill.notes}</p>
              </div>
            )}
            
            {/* Action buttons in view modal */}
            {(viewingBill.status === 'POSTED' || viewingBill.status === 'CONFIRMED') && getPaymentStatus(viewingBill) !== 'PAID' && (
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openPaymentModal(viewingBill);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Bill
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPayingBill(null);
        }}
        title="Bill Payment"
        size="md"
      >
        {payingBill && (() => {
          const amountDue = Math.round((parseFloat(payingBill.totalAmount) - parseFloat(payingBill.paidAmount)) * 100) / 100;
          const paymentAmount = Math.round((parseFloat(paymentData.amount) || 0) * 100) / 100;
          const remainingAfterPayment = Math.round((amountDue - paymentAmount) * 100) / 100;
          
          return (
          <form onSubmit={handlePayment} className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2 border-b pb-4">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Check className="w-4 h-4" />
                Confirm
              </button>
              <button type="button" onClick={() => printBill(payingBill)} className="btn-secondary flex items-center gap-2">
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
                  setPayingBill(null);
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Cancel
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Partner</span>
                <span className="font-medium">{payingBill.vendor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Bill Total</span>
                <span className="font-medium">{formatCurrency(payingBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Already Paid</span>
                <span className="font-medium text-green-600">{formatCurrency(payingBill.paidAmount)}</span>
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Remaining After Payment</span>
                <span className={`font-bold text-lg ${remainingAfterPayment <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(Math.max(0, remainingAfterPayment))}
                </span>
              </div>
              {remainingAfterPayment <= 0 && paymentAmount > 0 && (
                <p className="text-green-600 text-sm mt-1">✓ Bill will be fully paid</p>
              )}
            </div>
          </form>
        );
        })()}
      </Modal>
    </div>
  );
}
