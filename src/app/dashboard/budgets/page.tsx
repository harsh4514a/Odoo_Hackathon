'use client';

import { useState, useEffect, useMemo } from 'react';
import { Home, ArrowLeft, Plus, Trash2, Search, Link2, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input, Select } from '@/components/ui/FormFields';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';

interface BudgetLine {
  id?: string;
  analyticalAccountId: string;
  analyticalAccount?: { id: string; code: string; name: string };
  type: 'INCOME' | 'EXPENSE';
  budgetedAmount: string;
  achievedAmount: string;
}

interface Budget {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  stage: string;
  notes: string | null;
  budgetLines: BudgetLine[];
  revisedBudget?: { id: string; name: string } | null;
  originalBudgets?: Array<{ id: string; name: string }>;
}

interface AnalyticalAccount {
  id: string;
  code: string;
  name: string;
  status: string;
}

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
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

const formatDateInput = (date: string) => {
  return date ? date.split('T')[0] : '';
};

// Simple Pie Chart Component
const SimplePieChart = ({ achieved, total }: { achieved: number; total: number }) => {
  const achievedPercent = total > 0 ? (achieved / total) * 100 : 0;
  
  const circumference = 2 * Math.PI * 40;
  const achievedLength = (achievedPercent / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="15"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#22c55e"
          strokeWidth="15"
          strokeDasharray={`${achievedLength} ${circumference}`}
          strokeDashoffset="0"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="flex gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Achieved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          <span>Balance</span>
        </div>
      </div>
    </div>
  );
};

export default function BudgetsPage() {
  // View state
  const [viewMode, setViewMode] = useState<'form' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'CONFIRMED' | 'REVISED' | 'ARCHIVED'>('CONFIRMED');
  const [activeStage, setActiveStage] = useState<'DRAFT' | 'CONFIRM' | 'REVISED' | 'CANCELLED'>('DRAFT');
  
  // Data state
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [analyticalAccounts, setAnalyticalAccounts] = useState<AnalyticalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    periodStart: '',
    periodEnd: '',
    notes: '',
  });
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [showAnalyticsDropdown, setShowAnalyticsDropdown] = useState<number | null>(null);

  // Fetch data
  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/budgets');
      const data = await res.json();
      setBudgets(data.budgets || []);
    } catch (error) {
      toast.error('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticalAccounts = async () => {
    try {
      const res = await fetch('/api/analytical-accounts?status=CONFIRMED');
      const data = await res.json();
      setAnalyticalAccounts(data.analyticalAccounts || []);
    } catch (error) {
      console.error('Failed to fetch analytics');
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchAnalyticalAccounts();
  }, []);

  // Filter budgets based on active tab
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      // Treat NEW status as CONFIRMED for existing data
      const effectiveStatus = b.status === 'NEW' ? 'CONFIRMED' : b.status;
      return effectiveStatus === activeTab;
    });
  }, [budgets, activeTab]);

  // Stage filtered budgets
  const stageFilteredBudgets = useMemo(() => {
    return filteredBudgets.filter(b => b.stage === activeStage);
  }, [filteredBudgets, activeStage]);

  // Calculate totals for a budget
  const calculateTotals = (lines: BudgetLine[]) => {
    let totalBudgeted = 0;
    let totalAchieved = 0;
    
    lines.forEach(line => {
      const budgeted = parseFloat(line.budgetedAmount) || 0;
      const achieved = parseFloat(line.achievedAmount) || 0;
      totalBudgeted += budgeted;
      totalAchieved += achieved;
    });
    
    return {
      totalBudgeted,
      totalAchieved,
      toAchieve: totalBudgeted - totalAchieved,
      achievedPercent: totalBudgeted > 0 ? ((totalAchieved / totalBudgeted) * 100).toFixed(1) : '0',
    };
  };

  // Handlers
  const resetForm = () => {
    setFormData({
      name: '',
      periodStart: '',
      periodEnd: '',
      notes: '',
    });
    setBudgetLines([]);
    setSelectedBudget(null);
  };

  const openBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      periodStart: formatDateInput(budget.periodStart),
      periodEnd: formatDateInput(budget.periodEnd),
      notes: budget.notes || '',
    });
    setBudgetLines(budget.budgetLines.map(line => ({
      id: line.id,
      analyticalAccountId: line.analyticalAccountId,
      analyticalAccount: line.analyticalAccount,
      type: line.type as 'INCOME' | 'EXPENSE',
      budgetedAmount: line.budgetedAmount,
      achievedAmount: line.achievedAmount,
    })));
    setViewMode('form');
  };

  const handleAddLine = () => {
    setBudgetLines([...budgetLines, {
      analyticalAccountId: '',
      type: 'EXPENSE',
      budgetedAmount: '',
      achievedAmount: '0',
    }]);
  };

  const handleRemoveLine = (index: number) => {
    setBudgetLines(budgetLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof BudgetLine, value: string) => {
    const newLines = [...budgetLines];
    (newLines[index] as any)[field] = value;
    setBudgetLines(newLines);
  };

  const selectAnalytical = (index: number, account: AnalyticalAccount) => {
    const newLines = [...budgetLines];
    newLines[index].analyticalAccountId = account.id;
    newLines[index].analyticalAccount = account;
    setBudgetLines(newLines);
    setShowAnalyticsDropdown(null);
    setAnalyticsSearch('');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.periodStart || !formData.periodEnd) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that start date is before end date
    if (new Date(formData.periodStart) > new Date(formData.periodEnd)) {
      toast.error('Start date must be before end date');
      return;
    }

    if (budgetLines.length === 0) {
      toast.error('Please add at least one budget line');
      return;
    }

    try {
      const url = selectedBudget ? `/api/budgets/${selectedBudget.id}` : '/api/budgets';
      const method = selectedBudget ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          notes: formData.notes,
          status: selectedBudget ? selectedBudget.status : 'CONFIRMED',
          stage: selectedBudget ? selectedBudget.stage : 'CONFIRM',
          budgetLines: budgetLines.map(line => ({
            analyticalAccountId: line.analyticalAccountId,
            type: line.type,
            budgetedAmount: parseFloat(line.budgetedAmount) || 0,
            achievedAmount: parseFloat(line.achievedAmount) || 0,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(selectedBudget ? 'Budget updated' : 'Budget created');
      resetForm();
      setViewMode('list');
      fetchBudgets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save budget');
    }
  };

  const handleConfirm = async () => {
    if (!selectedBudget) return;
    
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CONFIRMED',
          stage: 'CONFIRM',
        }),
      });

      if (!res.ok) throw new Error('Failed to confirm');
      toast.success('Budget confirmed');
      fetchBudgets();
      setViewMode('list');
      resetForm();
    } catch (error) {
      toast.error('Failed to confirm budget');
    }
  };

  const handleRevise = async () => {
    if (!selectedBudget) return;
    
    try {
      // Create a new revised budget based on current
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.name} (Revised)`,
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          notes: formData.notes,
          status: 'REVISED',
          stage: 'REVISED',
          revisedBudgetId: selectedBudget.id,
          budgetLines: budgetLines.map(line => ({
            analyticalAccountId: line.analyticalAccountId,
            type: line.type,
            budgetedAmount: parseFloat(line.budgetedAmount) || 0,
            achievedAmount: parseFloat(line.achievedAmount) || 0,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create revision');
      
      // Update original budget
      await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REVISED',
          stage: 'REVISED',
        }),
      });

      toast.success('Budget revised');
      setActiveTab('REVISED'); // Switch to Revise tab
      fetchBudgets();
      setViewMode('list');
      resetForm();
    } catch (error) {
      toast.error('Failed to revise budget');
    }
  };

  const handleArchive = async () => {
    if (!selectedBudget) return;
    
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ARCHIVED',
          stage: 'CANCELLED',
        }),
      });

      if (!res.ok) throw new Error('Failed to archive');
      toast.success('Budget archived');
      fetchBudgets();
      setViewMode('list');
      resetForm();
    } catch (error) {
      toast.error('Failed to archive budget');
    }
  };

  const handleDelete = async () => {
    if (!selectedBudget) return;
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    try {
      const res = await fetch(`/api/budgets/${selectedBudget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Budget deleted');
      fetchBudgets();
      setViewMode('list');
      resetForm();
    } catch (error) {
      toast.error('Failed to delete budget');
    }
  };

  // Filtered analytics for dropdown
  const filteredAnalytics = analyticalAccounts.filter(a => 
    a.name.toLowerCase().includes(analyticsSearch.toLowerCase()) ||
    a.code.toLowerCase().includes(analyticsSearch.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  // Render Form View
  const renderFormView = () => {
    const totals = calculateTotals(budgetLines);
    const isConfirmed = selectedBudget?.status === 'CONFIRMED';
    const isRevised = selectedBudget?.status === 'REVISED';

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                resetForm();
                setViewMode('list');
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Back to list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedBudget ? `Budget: ${selectedBudget.name}` : 'New Budget'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedBudget && selectedBudget.status === 'CONFIRMED' && (
              <>
                <button onClick={handleSave} className="btn-secondary">Save Changes</button>
                <button onClick={handleRevise} className="btn-primary">Revise</button>
                <button onClick={handleArchive} className="btn-danger">Archive</button>
              </>
            )}
            {selectedBudget && selectedBudget.status === 'REVISED' && (
              <>
                <button onClick={handleSave} className="btn-secondary">Save Changes</button>
                <button onClick={handleArchive} className="btn-danger">Archive</button>
              </>
            )}
            {selectedBudget && selectedBudget.status === 'ARCHIVED' && (
              <button onClick={() => {
                // Restore to confirmed
                fetch(`/api/budgets/${selectedBudget.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'CONFIRMED', stage: 'CONFIRM' }),
                }).then(() => {
                  toast.success('Budget restored');
                  fetchBudgets();
                  setViewMode('list');
                  resetForm();
                });
              }} className="btn-primary">Restore</button>
            )}
            {!selectedBudget && (
              <button onClick={handleSave} className="btn-primary">Create Budget</button>
            )}
          </div>
        </div>

        {/* Stage Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {(['DRAFT', 'CONFIRM', 'REVISED', 'CANCELLED'] as const).map(stage => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeStage === stage
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        {/* Revised Budget Link */}
        {selectedBudget?.revisedBudget && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Link2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Revised with: <strong>{selectedBudget.revisedBudget.name}</strong>
            </span>
          </div>
        )}

        {selectedBudget?.originalBudgets && selectedBudget.originalBudgets.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Link2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Original Budget: <strong>{selectedBudget.originalBudgets[0].name}</strong>
            </span>
          </div>
        )}

        {/* Form Fields */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              label="Budget Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., January 2026"
              required
            />
            <Input
              label="Start Date *"
              type="date"
              value={formData.periodStart}
              onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
              required
            />
            <Input
              label="End Date *"
              type="date"
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              required
            />
          </div>

          {/* Budget Lines Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Segmental Analytics</h3>
              <button
                onClick={handleAddLine}
                className="btn-secondary flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analytic Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budgeted
                    </th>
                    {isConfirmed && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Achieved
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Achieved %
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          To Achieve
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {budgetLines.map((line, index) => {
                    const budgeted = parseFloat(line.budgetedAmount) || 0;
                    const achieved = parseFloat(line.achievedAmount) || 0;
                    const toAchieve = budgeted - achieved;
                    const achievedPercent = budgeted > 0 ? ((achieved / budgeted) * 100).toFixed(1) : '0';

                    return (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 relative">
                          <div className="relative">
                            <input
                              type="text"
                              value={line.analyticalAccount?.name || ''}
                              onChange={(e) => {
                                setAnalyticsSearch(e.target.value);
                                setShowAnalyticsDropdown(index);
                              }}
                              onFocus={() => setShowAnalyticsDropdown(index)}
                              placeholder="Search analytics..."
                              className="input-field w-full"
                            />
                            {showAnalyticsDropdown === index && (
                              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredAnalytics.map(account => (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => selectAnalytical(index, account)}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <span className="font-medium">{account.name}</span>
                                    <span className="text-gray-500 ml-2">({account.code})</span>
                                  </button>
                                ))}
                                {filteredAnalytics.length === 0 && (
                                  <div className="px-4 py-2 text-gray-500">No analytics found</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={line.type}
                            onChange={(e) => handleLineChange(index, 'type', e.target.value)}
                            className="input-field"
                          >
                            <option value="INCOME">Income</option>
                            <option value="EXPENSE">Expense</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={line.budgetedAmount}
                            onChange={(e) => handleLineChange(index, 'budgetedAmount', e.target.value)}
                            placeholder="0"
                            className="input-field text-right w-32"
                          />
                        </td>
                        {isConfirmed && (
                          <>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {formatCurrency(achieved)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-1 rounded text-sm ${
                                parseFloat(achievedPercent) >= 100 
                                  ? 'bg-green-100 text-green-800'
                                  : parseFloat(achievedPercent) >= 50
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {achievedPercent}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-orange-600">
                              {formatCurrency(toAchieve)}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveLine(index)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {budgetLines.length === 0 && (
                    <tr>
                      <td colSpan={isConfirmed ? 7 : 4} className="px-4 py-8 text-center text-gray-500">
                        No budget lines. Click "Add Line" to add analytics.
                      </td>
                    </tr>
                  )}
                </tbody>
                {budgetLines.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
                    <tr>
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right">{formatCurrency(totals.totalBudgeted)}</td>
                      {isConfirmed && (
                        <>
                          <td className="px-4 py-3 text-right text-green-600">{formatCurrency(totals.totalAchieved)}</td>
                          <td className="px-4 py-3 text-right">{totals.achievedPercent}%</td>
                          <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totals.toAchieve)}</td>
                        </>
                      )}
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render List View
  const renderListView = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Budgets</h1>
          </div>
          <button
            onClick={() => {
              resetForm();
              setViewMode('form');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Budget
          </button>
        </div>

        {/* Menu Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {(['CONFIRMED', 'REVISED', 'ARCHIVED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'CONFIRMED' ? 'Confirm' : tab === 'REVISED' ? 'Revise' : 'Archived'}
            </button>
          ))}
        </div>

        {/* Budget List with Pie Charts */}
        {filteredBudgets.length === 0 ? (
          <div className="card p-8">
            <EmptyState
              title="No budgets found"
              description={`No budgets in ${activeTab.toLowerCase()} status.`}
              action={
                <button onClick={() => {
                  resetForm();
                  setViewMode('form');
                }} className="btn-primary">
                  Create Budget
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBudgets.map((budget) => {
                  const totals = calculateTotals(budget.budgetLines);
                  
                  return (
                    <tr
                      key={budget.id}
                      onClick={() => openBudget(budget)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{budget.name}</div>
                        <div className="text-sm text-gray-500">{budget.budgetLines.length} analytics</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(budget.periodStart)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(budget.periodEnd)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          budget.stage === 'CONFIRM' ? 'bg-green-100 text-green-800' :
                          budget.stage === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                          budget.stage === 'REVISED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {budget.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <SimplePieChart
                          achieved={totals.totalAchieved}
                          total={totals.totalBudgeted}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {viewMode === 'form' ? renderFormView() : renderListView()}
    </div>
  );
}
