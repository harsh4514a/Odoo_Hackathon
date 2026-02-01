'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Home, ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Input, Checkbox } from '@/components/ui/FormFields';
import { useRouter } from 'next/navigation';

interface AutoAnalyticalRule {
  id: string;
  name: string;
  status: 'NEW' | 'CONFIRMED' | 'ARCHIVED';
  ruleStatus: 'DRAFT' | 'CONFIRM' | 'CANCELLED';
  partnerTag: string | null;
  partnerId: string | null;
  partner?: { name: string } | null;
  productCategoryId: string | null;
  productCategory?: { name: string } | null;
  productId: string | null;
  product?: { name: string } | null;
  autoApply: boolean;
  analyticalAccountId: string;
  analyticalAccount: { id: string; name: string };
}

interface AnalyticalAccount {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  name: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

type TabType = 'NEW' | 'CONFIRMED' | 'ARCHIVED';
type RuleStatusType = 'DRAFT' | 'CONFIRM' | 'CANCELLED';

export default function AutoAnalyticalRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AutoAnalyticalRule[]>([]);
  const [analyticalAccounts, setAnalyticalAccounts] = useState<AnalyticalAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoAnalyticalRule | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('NEW');
  const [activeRuleStatus, setActiveRuleStatus] = useState<RuleStatusType>('DRAFT');
  
  // Dropdown states
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [showAnalyticsDropdown, setShowAnalyticsDropdown] = useState(false);
  
  const partnerRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    partnerTag: '',
    partnerId: '',
    productCategoryId: '',
    productId: '',
    autoApply: true,
    analyticalAccountId: '',
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partnerRef.current && !partnerRef.current.contains(event.target as Node)) {
        setShowPartnerDropdown(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (productRef.current && !productRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (analyticsRef.current && !analyticsRef.current.contains(event.target as Node)) {
        setShowAnalyticsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auto-analytical-rules');
      const data = await res.json();
      setRules(data.rules || []);
    } catch (error) {
      toast.error('Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticalAccounts = async () => {
    try {
      const res = await fetch('/api/analytical-accounts');
      const data = await res.json();
      setAnalyticalAccounts(data.analyticalAccounts || []);
    } catch (error) {
      console.error('Failed to fetch analytics');
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchRules();
    fetchAnalyticalAccounts();
    fetchContacts();
    fetchProducts();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.analyticalAccountId) {
      toast.error('Please select an Analytic to Apply');
      return;
    }

    try {
      const url = editingRule 
        ? `/api/auto-analytical-rules/${editingRule.id}` 
        : '/api/auto-analytical-rules';
      const method = editingRule ? 'PUT' : 'POST';

      const selectedAnalytic = analyticalAccounts.find(a => a.id === formData.analyticalAccountId);
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedAnalytic?.name || 'Auto Rule',
          partnerTag: formData.partnerTag || null,
          partnerId: formData.partnerId || null,
          productCategoryId: formData.productCategoryId || null,
          productId: formData.productId || null,
          autoApply: formData.autoApply,
          analyticalAccountId: formData.analyticalAccountId,
          status: activeTab,
          ruleStatus: activeRuleStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(editingRule ? 'Model updated' : 'Model created');
      setIsModalOpen(false);
      resetForm();
      fetchRules();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    
    try {
      const res = await fetch(`/api/auto-analytical-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Model deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete model');
    }
  };

  const handleStatusChange = async (rule: AutoAnalyticalRule, newStatus: TabType) => {
    try {
      const res = await fetch(`/api/auto-analytical-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rule,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Moved to ${newStatus.toLowerCase()}`);
      fetchRules();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      partnerTag: '',
      partnerId: '',
      productCategoryId: '',
      productId: '',
      autoApply: true,
      analyticalAccountId: '',
    });
    setPartnerSearch('');
    setCategorySearch('');
    setProductSearch('');
    setAnalyticsSearch('');
    setEditingRule(null);
  };

  const openEditModal = (rule: AutoAnalyticalRule) => {
    setEditingRule(rule);
    setFormData({
      partnerTag: rule.partnerTag || '',
      partnerId: rule.partnerId || '',
      productCategoryId: rule.productCategoryId || '',
      productId: rule.productId || '',
      autoApply: rule.autoApply,
      analyticalAccountId: rule.analyticalAccountId,
    });
    setPartnerSearch(rule.partner?.name || '');
    setCategorySearch(rule.productCategory?.name || '');
    setProductSearch(rule.product?.name || '');
    setAnalyticsSearch(rule.analyticalAccount?.name || '');
    setIsModalOpen(true);
  };

  // Filter rules by status/tab
  const filteredRules = rules.filter(rule => {
    const status = (rule as any).status || 'NEW';
    return status === activeTab;
  });

  const tabs: { key: TabType; label: string }[] = [
    { key: 'NEW', label: 'New' },
    { key: 'CONFIRMED', label: 'Confirm' },
    { key: 'ARCHIVED', label: 'Archived' },
  ];

  const ruleStatusTabs: { key: RuleStatusType; label: string }[] = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'CONFIRM', label: 'Confirm' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auto Analytical Model</h1>
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
        {/* Tabs Row */}
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
          <div className="flex gap-2">
            {ruleStatusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRuleStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeRuleStatus === tab.key
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Partner Tag */}
                <div>
                  <label className="block text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                    Partner Tag
                  </label>
                  <Input
                    value={formData.partnerTag}
                    onChange={(e) => setFormData({ ...formData, partnerTag: e.target.value })}
                    placeholder="Enter partner tag"
                  />
                  <p className="text-xs text-gray-500 mt-1">Many to One (from list)</p>
                </div>

                {/* Product Category */}
                <div ref={categoryRef} className="relative">
                  <label className="block text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                    Product Category
                  </label>
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setShowCategoryDropdown(true);
                      setFormData({ ...formData, productCategoryId: '' });
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder="Search category..."
                    className="input-field w-full"
                  />
                  {showCategoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {categories
                        .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setCategorySearch(cat.name);
                              setFormData({ ...formData, productCategoryId: cat.id });
                              setShowCategoryDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            {cat.name}
                          </button>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Many to One (from list)</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Partner */}
                <div ref={partnerRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Partner
                  </label>
                  <input
                    type="text"
                    value={partnerSearch}
                    onChange={(e) => {
                      setPartnerSearch(e.target.value);
                      setShowPartnerDropdown(true);
                      setFormData({ ...formData, partnerId: '' });
                    }}
                    onFocus={() => setShowPartnerDropdown(true)}
                    placeholder="Search partner..."
                    className="input-field w-full"
                  />
                  {showPartnerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {contacts
                        .filter(c => c.name.toLowerCase().includes(partnerSearch.toLowerCase()))
                        .map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => {
                              setPartnerSearch(contact.name);
                              setFormData({ ...formData, partnerId: contact.id });
                              setShowPartnerDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            {contact.name}
                          </button>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Many to One (from list)</p>
                </div>

                {/* Product */}
                <div ref={productRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                      setFormData({ ...formData, productId: '' });
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search product..."
                    className="input-field w-full"
                  />
                  {showProductDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {products
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setProductSearch(product.name);
                              setFormData({ ...formData, productId: product.id });
                              setShowProductDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                          >
                            {product.name}
                          </button>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Many to One (from list)</p>
                </div>
              </div>
            </div>

            {/* Auto Apply Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  label="Auto Apply Analytical Model"
                  checked={formData.autoApply}
                  onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
                />
              </div>

              {/* Analytics to Apply */}
              <div ref={analyticsRef} className="relative max-w-md">
                <label className="block text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Analyticals to Apply? *
                </label>
                <input
                  type="text"
                  value={analyticsSearch}
                  onChange={(e) => {
                    setAnalyticsSearch(e.target.value);
                    setShowAnalyticsDropdown(true);
                    setFormData({ ...formData, analyticalAccountId: '' });
                  }}
                  onFocus={() => setShowAnalyticsDropdown(true)}
                  placeholder="Search analytics..."
                  className="input-field w-full"
                  required
                />
                {showAnalyticsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {analyticalAccounts
                      .filter(a => a.name.toLowerCase().includes(analyticsSearch.toLowerCase()))
                      .map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setAnalyticsSearch(account.name);
                            setFormData({ ...formData, analyticalAccountId: account.id });
                            setShowAnalyticsDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                        >
                          {account.name}
                        </button>
                      ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Many to One (from analytical master list)</p>
              </div>

              <div className="mt-4">
                <button type="submit" className="btn-primary">
                  {editingRule ? 'Update Model' : 'Save Model'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Existing Rules List */}
        <div className="p-4">
          {loading ? (
            <LoadingSpinner />
          ) : filteredRules.length === 0 ? (
            <EmptyState
              title={`No ${activeTab.toLowerCase()} models`}
              description="Create a new auto analytical model above."
            />
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-700 dark:text-gray-300">Existing Models</span>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="text-primary-600 dark:text-primary-400 font-medium">
                        {rule.analyticalAccount?.name}
                      </span>
                      <div className="text-xs text-gray-500 mt-1 space-x-2">
                        {rule.partner && <span>Partner: {rule.partner.name}</span>}
                        {rule.productCategory && <span>Category: {rule.productCategory.name}</span>}
                        {rule.product && <span>Product: {rule.product.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeTab === 'NEW' && (
                        <button
                          onClick={() => handleStatusChange(rule, 'CONFIRMED')}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                        >
                          Confirm
                        </button>
                      )}
                      {activeTab === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(rule, 'ARCHIVED')}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(rule)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
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

      {/* Info Section */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-600 mt-0.5" />
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p><strong>The model is applied if any one field matches the transaction line.</strong></p>
            <p>If multiple fields match, the model becomes more specific and takes priority.</p>
            <p>Models with fewer matched fields are more generic, while more matches make them stricter.</p>
            <p>This allows flexible yet prioritized automatic analytic model.</p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium mb-2">Example:</p>
              <p>In the above model, the Product Category is Wooden Furniture and the Partner is Mr. A.</p>
              <p>When the customer or vendor selected is Mr. A and the product belongs to the Wooden Furniture category, this analytic distribution will be applied.</p>
              <p>If no partner is selected, the distribution will still apply whenever the selected product falls under the Wooden Furniture category.</p>
              <p className="mt-2"><strong>Hence, more selected fields make the rule stricter, while fewer selections make it more generic.</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
