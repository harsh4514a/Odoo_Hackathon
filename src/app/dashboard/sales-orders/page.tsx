'use client';

import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, Package, Send, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Input, Select, Textarea } from '@/components/ui/FormFields';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Pagination } from '@/components/ui/Pagination';

interface SalesOrderLine {
  id?: string;
  productId: string;
  product?: { name: string; sku: string };
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  analyticalAccountId: string | null;
  analyticalAccount?: { code: string; name: string } | null;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: { name: string; email?: string };
  orderDate: string;
  expectedDate: string | null;
  status: string;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  lines: SalesOrderLine[];
}

interface Contact {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: string;
  analyticalAccountId: string | null;
}

interface AnalyticalAccount {
  id: string;
  code: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'gray' },
  SENT: { label: 'Sent', color: 'blue' },
  CONFIRMED: { label: 'Confirmed', color: 'green' },
  CANCELLED: { label: 'Cancelled', color: 'red' },
};

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analyticalAccounts, setAnalyticalAccounts] = useState<AnalyticalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    notes: '',
    lines: [{ productId: '', description: '', quantity: 1, unitPrice: '', analyticalAccountId: '' }],
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/sales-orders?${params}`);
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [customersRes, productsRes, analyticalRes] = await Promise.all([
        fetch('/api/contacts?type=customer'),
        fetch('/api/products'),
        fetch('/api/analytical-accounts'),
      ]);
      
      const customersData = await customersRes.json();
      const productsData = await productsRes.json();
      const analyticalData = await analyticalRes.json();
      
      setCustomers(customersData.contacts);
      setProducts(productsData.products);
      setAnalyticalAccounts(analyticalData.analyticalAccounts);
    } catch (error) {
      console.error('Failed to fetch dropdown data');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validLines = formData.lines.filter(l => l.productId && l.quantity && l.unitPrice);
    if (validLines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    try {
      const url = editingOrder 
        ? `/api/sales-orders/${editingOrder.id}` 
        : '/api/sales-orders';
      const method = editingOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          orderDate: formData.orderDate,
          expectedDate: formData.expectedDelivery || null,
          notes: formData.notes || null,
          lines: validLines.map(l => ({
            productId: l.productId,
            description: l.description,
            quantity: parseFloat(l.quantity.toString()),
            unitPrice: parseFloat(l.unitPrice),
            taxRate: 0,
            analyticalAccountId: l.analyticalAccountId || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(editingOrder ? 'Sales order updated' : 'Sales order created');
      setIsModalOpen(false);
      resetForm();
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/sales-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sales order?')) return;
    
    try {
      const res = await fetch(`/api/sales-orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Sales order deleted');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to delete sales order');
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: '',
      notes: '',
      lines: [{ productId: '', description: '', quantity: 1, unitPrice: '', analyticalAccountId: '' }],
    });
    setEditingOrder(null);
  };

  const openEditModal = (order: SalesOrder) => {
    setEditingOrder(order);
    setFormData({
      customerId: order.customerId,
      orderDate: order.orderDate.split('T')[0],
      expectedDelivery: order.expectedDate?.split('T')[0] || '',
      notes: order.notes || '',
      lines: order.lines.map(l => ({
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        analyticalAccountId: l.analyticalAccountId || '',
      })),
    });
    setIsModalOpen(true);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { productId: '', description: '', quantity: 1, unitPrice: '', analyticalAccountId: '' }],
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length === 1) return;
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-fill when product is selected
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLines[index].description = product.name;
        newLines[index].unitPrice = product.salePrice;
        newLines[index].analyticalAccountId = product.analyticalAccountId || '';
      }
    }
    
    setFormData({ ...formData, lines: newLines });
  };

  const calculateTotal = () => {
    return formData.lines.reduce((sum, line) => {
      const qty = parseFloat(line.quantity.toString()) || 0;
      const price = parseFloat(line.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage sales orders from customers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Sales Order
        </button>
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
            <option value="SENT">Sent</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            title="No sales orders"
            description="Create your first sales order to start managing customer orders."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                New Sales Order
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expected Delivery</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-600 dark:text-primary-400">{order.orderNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{order.customer.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(order.orderDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{order.expectedDate ? formatDate(order.expectedDate) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={order.status} config={STATUS_CONFIG} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setViewingOrder(order); setIsViewModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          {order.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => openEditModal(order)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'SENT')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                                title="Send to Customer"
                              >
                                <Send className="w-4 h-4" />
                                Send
                              </button>
                            </>
                          )}
                          {order.status === 'SENT' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'CONFIRMED')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                                title="Confirm Order"
                              >
                                <Check className="w-4 h-4" />
                                Confirm
                              </button>
                              <button
                                onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                          {order.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingOrder ? 'Edit Sales Order' : 'New Sales Order'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Customer *"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Input
              label="Order Date *"
              type="date"
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Expected Delivery"
            type="date"
            value={formData.expectedDelivery}
            onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
          />

          {/* Line Items */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Line Items</h4>
              <button type="button" onClick={addLine} className="btn-secondary text-sm py-1">
                <Plus className="w-4 h-4 inline mr-1" />
                Add Line
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div className="col-span-3">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      className="input-field text-sm"
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                      className="input-field text-sm"
                      placeholder="Price"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="block py-2 text-sm font-medium">
                      {formatCurrency((parseFloat(line.quantity.toString()) || 0) * (parseFloat(line.unitPrice) || 0))}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <select
                      value={line.analyticalAccountId}
                      onChange={(e) => updateLine(index, 'analyticalAccountId', e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Cost Center</option>
                      {analyticalAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                      disabled={formData.lines.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4 text-lg font-bold">
              Total: {formatCurrency(calculateTotal())}
            </div>
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingOrder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Sales Order ${viewingOrder?.orderNumber}`}
        size="lg"
      >
        {viewingOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{viewingOrder.customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewingOrder.status} config={STATUS_CONFIG} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium">{formatDate(viewingOrder.orderDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">{viewingOrder.expectedDate ? formatDate(viewingOrder.expectedDate) : '-'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Line Items</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-left p-2">Cost Center</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOrder.lines.map((line, idx) => (
                    <tr key={idx} className="border-b dark:border-gray-700">
                      <td className="p-2">{line.description}</td>
                      <td className="p-2 text-right">{line.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(line.total)}</td>
                      <td className="p-2">{line.analyticalAccount ? `${line.analyticalAccount.code}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Total:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingOrder.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {viewingOrder.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm">{viewingOrder.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
