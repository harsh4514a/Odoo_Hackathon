'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/FormFields';

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryId: string | null;
  categoryRef: { id: string; name: string } | null;
  purchasePrice: string;
  salePrice: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface AnalyticalAccount {
  id: string;
  code: string;
  name: string;
}

// Default categories (legacy enum values)
const ALL_DEFAULT_CATEGORIES = [
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'FINISHED_GOODS', label: 'Finished Goods' },
  { value: 'CONSUMABLES', label: 'Consumables' },
  { value: 'SERVICES', label: 'Services' },
];

const formatCurrency = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(num);
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analyticalAccounts, setAnalyticalAccounts] = useState<AnalyticalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [hiddenDefaultCategories, setHiddenDefaultCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter default categories based on hidden state
  const defaultCategories = ALL_DEFAULT_CATEGORIES.filter(
    cat => !hiddenDefaultCategories.includes(cat.value)
  );
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    purchasePrice: '',
    salePrice: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(categoryFilter && { category: categoryFilter }),
      });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticalAccounts = async () => {
    try {
      const res = await fetch('/api/analytical-accounts');
      const data = await res.json();
      setAnalyticalAccounts(data.analyticalAccounts);
    } catch (error) {
      console.error('Failed to fetch analytical accounts');
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

  // Load hidden default categories from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('hiddenDefaultCategories');
    if (stored) {
      try {
        setHiddenDefaultCategories(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse hidden categories');
      }
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchAnalyticalAccounts();
    fetchCategories();
  }, [page, search, categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const purchasePrice = parseFloat(formData.purchasePrice);
    const salePrice = parseFloat(formData.salePrice);
    
    // Validation: Sale price should not be less than purchase price
    if (salePrice < purchasePrice) {
      toast.error('Sale Price cannot be less than Purchase Price. You would be selling at a loss!');
      return;
    }
    
    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}` 
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          purchasePrice: purchasePrice,
          salePrice: salePrice,
          categoryId: formData.categoryId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(editingProduct ? 'Product updated' : 'Product created');
      setIsModalOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}` 
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(editingCategory ? 'Category updated' : 'Category created');
      setIsCategoryModalOpen(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Category deleted');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      purchasePrice: '',
      salePrice: '',
    });
    setEditingProduct(null);
    setNewCategoryName('');
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', description: '' });
    setEditingCategory(null);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId || product.category || '',
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
    });
    // Set the category name for display
    if (product.categoryRef) {
      setNewCategoryName(product.categoryRef.name);
    } else {
      const defaultCat = ALL_DEFAULT_CATEGORIES.find(c => c.value === product.category);
      setNewCategoryName(defaultCat?.label || '');
    }
    setIsModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setIsCategoryModalOpen(true);
  };

  // Combine default and custom categories for dropdown
  const allCategories = [
    ...defaultCategories,
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage products and services</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetCategoryForm();
              setIsCategoryModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            Manage Categories
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field w-full md:w-48"
          >
            <option value="">All Categories</option>
            {allCategories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Get started by creating your first product."
            action={
              <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                Add Product
              </button>
            }
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Purchase Price</th>
                  <th>Sale Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="font-medium">{product.code}</td>
                    <td>{product.name}</td>
                    <td>
                      {product.categoryRef ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {product.categoryRef.name}
                        </span>
                      ) : (
                        <StatusBadge status={product.category} />
                      )}
                    </td>
                    <td>{formatCurrency(product.purchasePrice)}</td>
                    <td>{formatCurrency(product.salePrice)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          {/* Category Selection with Create on the fly */}
          <div className="relative" ref={categoryDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category *
            </label>
            <div className="relative">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setShowCategoryDropdown(true);
                  // Clear categoryId when typing
                  setFormData({ ...formData, categoryId: '' });
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                placeholder="Type to search or create new category"
                className="input-field w-full"
                required
              />
              {showCategoryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {/* Filtered existing categories */}
                  {allCategories
                    .filter(c => c.label.toLowerCase().includes(newCategoryName.toLowerCase()))
                    .map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setNewCategoryName(cat.label);
                          setFormData({ ...formData, categoryId: cat.value });
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        {cat.label}
                      </button>
                    ))}
                  {/* Create new category option */}
                  {newCategoryName && !allCategories.some(c => c.label.toLowerCase() === newCategoryName.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/categories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newCategoryName, description: '' }),
                          });
                          if (!res.ok) throw new Error('Failed to create category');
                          const data = await res.json();
                          toast.success('Category created');
                          fetchCategories();
                          setFormData({ ...formData, categoryId: data.category.id });
                          setShowCategoryDropdown(false);
                        } catch (error) {
                          toast.error('Failed to create category');
                        }
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900 text-sm text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-700"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create "{newCategoryName}"
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Type to search or create new category on the fly</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sales Price *"
              type="number"
              step="0.01"
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
              required
            />
            <Input
              label="Purchase Price *"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              required
            />
          </div>

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
              {editingProduct ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          resetCategoryForm();
        }}
        title="Manage Categories"
        size="lg"
      >
        <div className="space-y-6">
          {/* Add/Edit Category Form */}
          <form onSubmit={handleCategorySubmit} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Category Name *"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="e.g., Furniture, Electronics"
                required
              />
              <Input
                label="Description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingCategory ? 'Update' : 'Add'} Category
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="btn-secondary"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {/* Existing Categories List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Existing Categories</h3>
              {hiddenDefaultCategories.length > 0 && (
                <button
                  onClick={() => {
                    setHiddenDefaultCategories([]);
                    localStorage.removeItem('hiddenDefaultCategories');
                    toast.success('Default categories restored');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Restore defaults
                </button>
              )}
            </div>
            
            {defaultCategories.length === 0 && categories.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No categories available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Default Categories */}
                {defaultCategories.map((cat) => (
                  <div
                    key={cat.value}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{cat.label}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${cat.label}" category? Products using this category will not be affected.`)) {
                          setHiddenDefaultCategories(prev => [...prev, cat.value]);
                          localStorage.setItem('hiddenDefaultCategories', JSON.stringify([...hiddenDefaultCategories, cat.value]));
                          toast.success('Category removed');
                        }
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                      title="Remove Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {/* Custom Categories */}
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{cat.name}</p>
                      {cat.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditCategoryModal(cat)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Edit Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsCategoryModalOpen(false);
                resetCategoryForm();
              }}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
