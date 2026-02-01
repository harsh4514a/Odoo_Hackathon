'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useTheme } from '@/components/Providers';
import {
  LayoutDashboard,
  Users,
  Package,
  Building,
  Wallet,
  FileText,
  ShoppingCart,
  Receipt,
  ClipboardList,
  FileSpreadsheet,
  CreditCard,
  BarChart3,
  PieChart,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  UserCog,
} from 'lucide-react';
import toast from 'react-hot-toast';

const menuItems = [
  { 
    label: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard 
  },
  {
    label: 'Master Data',
    icon: Building,
    children: [
      { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
      { label: 'Products', href: '/dashboard/products', icon: Package },
      { label: 'Analytics Master', href: '/dashboard/analytical-accounts', icon: Building },
      { label: 'Budgets', href: '/dashboard/budgets', icon: Wallet },
      { label: 'Auto Analytical Model', href: '/dashboard/auto-analytical-rules', icon: Settings },
    ],
  },
  {
    label: 'Purchases',
    icon: ShoppingCart,
    children: [
      { label: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ClipboardList },
      { label: 'Vendor Bills', href: '/dashboard/vendor-bills', icon: Receipt },
    ],
  },
  {
    label: 'Sales',
    icon: FileText,
    children: [
      { label: 'Sales Orders', href: '/dashboard/sales-orders', icon: FileSpreadsheet },
      { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
    ],
  },
  {
    label: 'Payments',
    href: '/dashboard/payments',
    icon: CreditCard,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Master Data', 'Purchases', 'Sales']);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        } bg-sidebar text-white transition-all duration-300 flex flex-col fixed h-full z-30 lg:relative`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Building className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Shiv Furniture</h1>
            <p className="text-xs text-gray-400">Accounting System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {menuItems.map((item) => (
            <div key={item.label} className="mb-1">
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full sidebar-link justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedMenus.includes(item.label) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedMenus.includes(item.label) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`sidebar-link text-sm ${
                            pathname === child.href ? 'active' : ''
                          }`}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href!}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="font-semibold">{user.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full sidebar-link text-red-400 hover:text-red-300 hover:bg-red-900/30"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
