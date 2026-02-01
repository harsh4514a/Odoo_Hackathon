'use client';

interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  SENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  POSTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CUSTOMER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  VENDOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  BOTH: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  RAW_MATERIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  FINISHED_GOODS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CONSUMABLES: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  SERVICES: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  // Payment statuses
  NOT_PAID: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PARTIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  // Payment types
  INCOMING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  OUTGOING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = statusColors[status] || statusColors.DRAFT;
  const displayStatus = status.replace(/_/g, ' ');

  return (
    <span className={`status-badge ${colorClass}`}>
      {displayStatus}
    </span>
  );
}
