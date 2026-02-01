'use client';

import { useState, useEffect } from 'react';
import { Download, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '@/components/ui/States';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

interface CostCenterData {
  id: string;
  code: string;
  name: string;
  totalExpenses: number;
  totalRevenue: number;
  netPosition: number;
  transactionCount: number;
  budgetAmount: number;
  utilizationPercentage: number;
}

interface TrendData {
  month: string;
  expenses: number;
  revenue: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const COLORS = [
  'rgb(59, 130, 246)', // blue
  'rgb(34, 197, 94)',  // green
  'rgb(249, 115, 22)', // orange
  'rgb(168, 85, 247)', // purple
  'rgb(236, 72, 153)', // pink
  'rgb(14, 165, 233)', // sky
];

export default function CostCenterPerformancePage() {
  const [data, setData] = useState<CostCenterData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - 2 + i;
    return { value: y.toString(), label: y.toString() };
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      if (selectedCostCenter) params.append('analyticalAccountId', selectedCostCenter);
      
      const res = await fetch(`/api/reports/cost-center-performance?${params}`);
      const result = await res.json();
      setData(result.costCenters);
      setTrendData(result.monthlyTrend || []);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, selectedCostCenter]);

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Cost Center', 'Code', 'Expenses', 'Revenue', 'Net Position', 'Transactions', 'Budget', 'Utilization %'];
    const rows = data.map(item => [
      item.name,
      item.code,
      item.totalExpenses,
      item.totalRevenue,
      item.netPosition,
      item.transactionCount,
      item.budgetAmount,
      item.utilizationPercentage.toFixed(1),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-center-performance-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const expenseDistributionData = {
    labels: data?.map(d => d.code) || [],
    datasets: [
      {
        data: data?.map(d => d.totalExpenses) || [],
        backgroundColor: COLORS.map(c => c.replace('rgb', 'rgba').replace(')', ', 0.7)')),
        borderColor: COLORS,
        borderWidth: 2,
      },
    ],
  };

  const trendChartData = {
    labels: trendData?.map(d => d.month) || [],
    datasets: [
      {
        label: 'Expenses',
        data: trendData?.map(d => d.expenses) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Revenue',
        data: trendData?.map(d => d.revenue) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  const totalExpenses = data.reduce((sum, d) => sum + d.totalExpenses, 0);
  const totalRevenue = data.reduce((sum, d) => sum + d.totalRevenue, 0);
  const netPosition = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost Center Performance</h1>
          <p className="text-gray-500 dark:text-gray-400">Analyze performance by cost center</p>
        </div>
        <button onClick={exportToCSV} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input-field w-32"
            >
              {years.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost Center:</label>
            <select
              value={selectedCostCenter}
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="input-field w-48"
            >
              <option value="">All Cost Centers</option>
              {data.map((d) => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <ArrowUpRight className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <ArrowDownLeft className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${netPosition >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                  <TrendingUp className={`w-6 h-6 ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Position</p>
                  <p className={`text-2xl font-bold ${netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netPosition)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Expense Distribution</h3>
                <div className="h-64">
                  <Doughnut data={expenseDistributionData} options={doughnutOptions} />
                </div>
              </div>
            )}

            {trendData.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Monthly Trend</h3>
                <div className="h-64">
                  <Line data={trendChartData} options={lineOptions} />
                </div>
              </div>
            )}
          </div>

          {/* Cost Center Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((item, index) => (
              <div key={item.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.code}</p>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Expenses</span>
                    <span className="font-semibold text-red-600">{formatCurrency(item.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Revenue</span>
                    <span className="font-semibold text-green-600">{formatCurrency(item.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-500">Net</span>
                    <span className={`font-bold ${item.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(item.netPosition)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">Budget Utilization</span>
                    <span className={`text-xs font-medium ${
                      item.utilizationPercentage >= 100 ? 'text-red-600' : 
                      item.utilizationPercentage >= 80 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.utilizationPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        item.utilizationPercentage >= 100 ? 'bg-red-600' : 
                        item.utilizationPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(item.utilizationPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Budget: {formatCurrency(item.budgetAmount)}</span>
                    <span>{item.transactionCount} transactions</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-gray-500">No cost center data available for {year}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
