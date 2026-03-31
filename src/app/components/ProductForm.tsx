import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getCategories, createVendorProduct, updateVendorProduct } from '@/services/api';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  existing?: any;
}

export default function ProductForm({ onSuccess, onCancel, existing }: Props) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    description: existing?.description || '',
    base_price: existing?.base_price || '',
    stock: existing?.stock || '',
    category: existing?.category || '',
  });
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(existing?.image_url || '');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories()
      .then((d: any) => setCategories(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleCategoryChange = async (value: string) => {
    if (value === 'others_custom') {
      setShowCustomCategory(true);
      setForm(p => ({ ...p, category: '' }));
    } else {
      setShowCustomCategory(false);
      setForm(p => ({ ...p, category: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    let categoryId = form.category;

    // If custom category, create it first
    if (showCustomCategory && customCategory.trim()) {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://127.0.0.1:8000/api/categories/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: customCategory.trim() }),
        });
        const data = await res.json();
        if (res.ok) categoryId = data.id;
        else if (data.name) {
          // Category already exists, find it
          const existing_cat = categories.find(c => c.name.toLowerCase() === customCategory.trim().toLowerCase());
          if (existing_cat) categoryId = existing_cat.id;
        }
      } catch { /* use empty */ }
    }

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    // Only send base_price if it's a new product OR explicitly editing price
    if (!existing || form.base_price !== existing.base_price) {
      fd.append('base_price', String(form.base_price));
    }
    fd.append('stock', String(form.stock));
    if (categoryId) fd.append('category', String(categoryId));
    if (image) fd.append('image', image);

    try {
      if (existing) await updateVendorProduct(existing.id, fd);
      else await createVendorProduct(fd);
      onSuccess();
    } catch (err: any) { setError(err.message || 'Failed to save product'); }
    finally { setLoading(false); }
  };

  // Find "Others" category id
  const othersCategory = categories.find(c => c.name.toLowerCase() === 'others');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{existing ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onCancel}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          {/* Image Upload */}
          <div>
            <Label>Product Image</Label>
            <label className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-blue-400">
              {preview ? (
                <img src={preview} alt="preview" className="h-32 object-contain rounded-lg" />
              ) : (
                <div className="text-center text-gray-400"><Upload className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">Click to upload</p></div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
          </div>

          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>

          <div>
            <Label>Description *</Label>
            <textarea
              className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Wholesale Price (₹) *</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.base_price}
                onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
                required
              />
              {existing && <p className="text-xs text-gray-400 mt-1">Current: ₹{existing.base_price}</p>}
            </div>
            <div>
              <Label>Stock *</Label>
              <Input
                type="number" min="0"
                value={form.stock}
                onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <select
              className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
              value={showCustomCategory ? 'others_custom' : form.category}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="">Select category</option>
              {categories.filter(c => c.name.toLowerCase() !== 'others').map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value={othersCategory?.id || 'others_custom'}>Others</option>
              <option value="others_custom">Others (Custom)</option>
            </select>

            {/* Custom category input */}
            {showCustomCategory && (
              <div className="mt-2">
                <Input
                  placeholder="Enter custom category name..."
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">This will create a new category</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white">
              {loading ? 'Saving...' : existing ? 'Update Product' : 'Add Product'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
