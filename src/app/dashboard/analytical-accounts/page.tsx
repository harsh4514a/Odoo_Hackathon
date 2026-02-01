'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Home, ArrowLeft, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/FormFields';
import { useRouter } from 'next/navigation';

interface AnalyticalAccount {
  id: string;
  code: string;
  name: string;
  status: 'NEW' | 'CONFIRMED' | 'ARCHIVED';
}

type TabType = 'CONFIRMED' | 'ARCHIVED';

export default function AnalyticalAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AnalyticalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AnalyticalAccount | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('CONFIRMED');
  const [formData, setFormData] = useState({
    name: '',
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytical-accounts');
      const data = await res.json();
      setAccounts(data.analyticalAccounts || []);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAccount 
        ? `/api/analytical-accounts/${editingAccount.id}` 
        : '/api/analytical-accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.name.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
          status: editingAccount ? editingAccount.status : 'CONFIRMED',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(editingAccount ? 'Analytic updated' : 'Analytic created');
      setIsModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analytic?')) return;
    
    try {
      const res = await fetch(`/api/analytical-accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Analytic deleted');
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to delete analytic');
    }
  };

  const handleStatusChange = async (account: AnalyticalAccount, newStatus: TabType) => {
    try {
      const res = await fetch(`/api/analytical-accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          code: account.code,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Moved to ${newStatus.toLowerCase()}`);
      setActiveTab(newStatus); // Switch to the target tab
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingAccount(null);
  };

  const openEditModal = (account: AnalyticalAccount) => {
    setEditingAccount(account);
    setFormData({ name: account.name });
    setIsModalOpen(true);
  };

  // Filter accounts by status/tab
  const filteredAccounts = accounts.filter(account => {
    // If status field doesn't exist or is NEW, treat as CONFIRMED
    const status = (account as any).status || 'CONFIRMED';
    const effectiveStatus = status === 'NEW' ? 'CONFIRMED' : status;
    return effectiveStatus === activeTab;
  });

  const tabs: { key: TabType; label: string }[] = [
    { key: 'CONFIRMED', label: 'Confirm' },
    { key: 'ARCHIVED', label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Master</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-secondary flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => router.back()}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Table */}
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : filteredAccounts.length === 0 ? (
            <EmptyState
              title={`No ${activeTab.toLowerCase()} analytics`}
              description="Click New to add an analytic."
              action={
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                  Add Analytic
                </button>
              }
            />
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {activeTab === 'CONFIRMED' ? 'Confirm Name' : 'Archived Name'}
                </span>
              </div>
              
              {/* Table Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      {account.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {activeTab === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(account, 'ARCHIVED')}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          Archive
                        </button>
                      )}
                      {activeTab === 'ARCHIVED' && (
                        <button
                          onClick={() => handleStatusChange(account, 'CONFIRMED')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(account)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingAccount ? 'Edit Analytic' : 'Add Analytic'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Analytic Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Deepawali, Marriage Session"
            required
          />

          <div className="flex justify-between items-center gap-3 pt-4 border-t">
            <div>
              {editingAccount && editingAccount.status !== 'ARCHIVED' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange(editingAccount, 'ARCHIVED');
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="btn-danger flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
              {editingAccount && editingAccount.status === 'ARCHIVED' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange(editingAccount, 'CONFIRMED');
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="btn-secondary flex items-center gap-2"
                >
                  Restore
                </button>
              )}
            </div>
            <div className="flex gap-3">
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
                {editingAccount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
