'use client';

import { useState, useEffect } from 'react';
import { Check, Eye, Package, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface PurchaseOrderLine {
  id: string;
  product: { name: string };
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDate: string | null;
  status: string;
  notes: string | null;
  totalAmount: string;
  lines: PurchaseOrderLine[];
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

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('SENT');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/vendor/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      toast.error('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleConfirm = async (orderId: string) => {
    if (!confirm('Are you sure you want to confirm this order? This action cannot be undone.')) return;
    
    setConfirming(orderId);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/confirm`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm order');
      }

      toast.success('Order confirmed successfully!');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setConfirming(null);
    }
  };

  const pendingCount = orders.filter(o => o.status === 'SENT').length;
  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">View and confirm purchase orders from Shiv Furniture</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Confirmation</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Confirmed</p>
            <p className="text-2xl font-bold">{confirmedCount}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-48"
          >
            <option value="">All Orders</option>
            <option value="SENT">Pending Confirmation</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="No orders found"
            description={statusFilter === 'SENT' ? "No pending orders to confirm." : "No orders match the selected filter."}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      {order.orderNumber}
                    </h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Order Date: {formatDate(order.orderDate)}
                    {order.expectedDate && ` • Expected Delivery: ${formatDate(order.expectedDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <p className="text-sm text-gray-500">{order.lines.length} items</p>
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items:</h4>
                <ul className="space-y-1">
                  {order.lines.slice(0, 3).map((line, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                      <span>{line.product?.name || line.description} × {line.quantity}</span>
                      <span>{formatCurrency(line.lineTotal)}</span>
                    </li>
                  ))}
                  {order.lines.length > 3 && (
                    <li className="text-sm text-gray-500 italic">
                      +{order.lines.length - 3} more items...
                    </li>
                  )}
                </ul>
              </div>

              {order.notes && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Note:</strong> {order.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => { setViewingOrder(order); setIsViewModalOpen(true); }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                {order.status === 'SENT' && (
                  <button
                    onClick={() => handleConfirm(order.id)}
                    disabled={confirming === order.id}
                    className="btn-primary flex items-center gap-2"
                  >
                    {confirming === order.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm Order
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Order ${viewingOrder?.orderNumber}`}
        size="lg"
      >
        {viewingOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium">{formatDate(viewingOrder.orderDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">{viewingOrder.expectedDate ? formatDate(viewingOrder.expectedDate) : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewingOrder.status} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-bold text-lg">{formatCurrency(viewingOrder.totalAmount)}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Order Items</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOrder.lines.map((line, idx) => (
                    <tr key={idx} className="border-b dark:border-gray-700">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{line.product?.name || line.description}</td>
                      <td className="p-2 text-right">{line.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td colSpan={4} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingOrder.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewingOrder.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm"><strong>Notes:</strong> {viewingOrder.notes}</p>
              </div>
            )}

            {viewingOrder.status === 'SENT' && (
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleConfirm(viewingOrder.id);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirm Order
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
