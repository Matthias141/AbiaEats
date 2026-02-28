'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Pencil, Trash2, ImagePlus, X, ToggleLeft, ToggleRight, Star } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { MenuItem } from '@/types/database';

const CATEGORIES = ['Starters', 'Main Course', 'Rice & Swallow', 'Grills', 'Soups', 'Snacks', 'Drinks', 'Desserts', 'Specials'];

interface MenuItemForm {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
  is_popular: boolean;
  image_url: string;
  restaurant_id: string;
}

const empty = (restaurantId: string): MenuItemForm => ({
  name: '', description: '', price: '', category: CATEGORIES[0],
  is_available: true, is_popular: false, image_url: '', restaurant_id: restaurantId,
});

export default function RestaurantMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<MenuItemForm>(empty(''));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/restaurant/menu');
    if (res.status === 404) { setLoading(false); return; }
    const data = await res.json();
    setItems(data.items || []);
    if (data.items?.length > 0) setRestaurantId(data.items[0].restaurant_id);
    setLoading(false);
  }, []);

  // Get restaurantId from profile if no items exist yet
  useEffect(() => {
    fetchMenu();
    fetch('/api/restaurant/info').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.restaurant?.id) setRestaurantId(d.restaurant.id);
    }).catch(() => {});
  }, [fetchMenu]);

  const openAdd = () => { setEditing(null); setForm(empty(restaurantId)); setShowForm(true); };
  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? '', price: String(item.price), category: item.category, is_available: item.is_available, is_popular: item.is_popular, image_url: item.image_url ?? '', restaurant_id: item.restaurant_id });
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    // Step 1: Get signed upload URL
    const urlRes = await fetch('/api/restaurant/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content_type: file.type }),
    });

    if (!urlRes.ok) { showToast('Image upload failed'); setUploading(false); return; }
    const { upload_url, public_url } = await urlRes.json();

    // Step 2: PUT file directly to Supabase Storage
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    setUploading(false);
    if (uploadRes.ok) {
      setForm(f => ({ ...f, image_url: public_url }));
      showToast('Image uploaded');
    } else {
      showToast('Upload failed');
    }
  };

  const save = async () => {
    if (!form.name || !form.price || !form.category) {
      showToast('Name, price and category are required');
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      price: parseInt(form.price),
      image_url: form.image_url || null,
    };

    const res = editing
      ? await fetch(`/api/restaurant/menu/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/restaurant/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    setSaving(false);

    if (res.ok) {
      showToast(editing ? 'Item updated' : 'Item added');
      setShowForm(false);
      fetchMenu();
    } else {
      const d = await res.json();
      showToast(d.error || 'Save failed');
    }
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/restaurant/menu/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('Item deleted'); fetchMenu(); }
    else { showToast('Delete failed'); }
    setDeleteConfirm(null);
  };

  const toggleAvailability = async (item: MenuItem) => {
    await fetch(`/api/restaurant/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !item.is_available }),
    });
    fetchMenu();
  };

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} items across {Object.keys(grouped).length} categories</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 gradient-orange text-white text-sm font-medium rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading menu...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-sm mb-4">No menu items yet</p>
          <button onClick={openAdd} className="px-5 py-2.5 gradient-orange text-white text-sm font-medium rounded-xl">Add your first item</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{category}</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {categoryItems.map(item => (
                  <div key={item.id} className={`flex items-center gap-4 p-4 ${!item.is_available ? 'opacity-50' : ''}`}>
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        {item.is_popular && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      </div>
                      {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
                      <p className="text-sm font-semibold text-brand-orange mt-1">{formatPrice(item.price)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleAvailability(item)} className="text-gray-400 hover:text-gray-600 transition-colors" title={item.is_available ? 'Mark unavailable' : 'Mark available'}>
                        {item.is_available ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Item Photo</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-orange/50 hover:bg-orange-50/30 transition-all relative overflow-hidden"
                >
                  {form.image_url ? (
                    <>
                      <img src={form.image_url} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium">Change photo</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-7 h-7 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">{uploading ? 'Uploading...' : 'Click to upload photo'}</p>
                      <p className="text-xs text-gray-300 mt-0.5">JPG, PNG, WebP · Max 2MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                />
                {form.image_url && (
                  <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="mt-1.5 text-xs text-red-500 hover:underline">Remove photo</button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Item Name *</label>
                <input type="text" placeholder="e.g. Jollof Rice & Chicken" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                <textarea rows={2} placeholder="Describe this item..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Price (₦) *</label>
                  <input type="number" min="50" placeholder="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 accent-orange-500 rounded" />
                  <span className="text-sm text-gray-700">Available now</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_popular} onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} className="w-4 h-4 accent-orange-500 rounded" />
                  <span className="text-sm text-gray-700">Mark as popular ⭐</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving || uploading} className="flex-1 py-2.5 gradient-orange text-white text-sm font-medium rounded-xl disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-2">Delete item?</h3>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={() => deleteItem(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">{toast}</div>
      )}
    </div>
  );
}
