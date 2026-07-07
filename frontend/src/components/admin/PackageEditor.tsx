'use client';

import React, { useState } from 'react';

interface PackageEditorProps {
  pkg?: any;
  onSave?: (data: any) => void;
}

export default function PackageEditor({ pkg, onSave }: PackageEditorProps) {
  const [form, setForm] = useState({
    name: pkg?.name || '',
    category: pkg?.category || '',
    base_price: pkg?.base_price?.toString() || '',
    discounted_price: pkg?.discounted_price?.toString() || '',
    short_description: pkg?.short_description || '',
    description: pkg?.description || '',
    prep_instructions: pkg?.prep_instructions || '',
    is_active: pkg?.is_active ?? true,
    is_featured: pkg?.is_featured ?? false,
    tax_applicable: pkg?.tax_applicable ?? false,
    tax_rate: pkg?.tax_rate?.toString() || '0',
    convenience_fee: pkg?.convenience_fee?.toString() || '0',
    purchase_status: pkg?.purchase_status || 'available',
    badge_text: pkg?.badge_text || '',
    available_days: Array.isArray(pkg?.available_days) ? pkg.available_days.join(', ') : '',
    terms_text: pkg?.terms_text || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave?.({
      ...form,
      available_days: form.available_days
        .split(',')
        .map((day: string) => day.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label>Package Name *</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Category</label>
          <input name="category" value={form.category} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Base Price *</label>
          <input name="base_price" type="number" value={form.base_price} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Discounted Price</label>
          <input name="discounted_price" type="number" value={form.discounted_price} onChange={handleChange} />
        </div>
      </div>
      <div className="form-group">
        <label>Short Description</label>
        <textarea name="short_description" value={form.short_description} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Full Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Prep Instructions</label>
        <textarea name="prep_instructions" value={form.prep_instructions} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="form-group">
          <label>Purchase Status</label>
          <select name="purchase_status" value={form.purchase_status} onChange={handleChange}>
            <option value="available">Available</option>
            <option value="temporarily_unavailable">Temporarily unavailable</option>
            <option value="hidden">Hidden from purchase</option>
          </select>
        </div>
        <div className="form-group">
          <label>Tax Rate (%)</label>
          <input name="tax_rate" type="number" min="0" step="0.01" value={form.tax_rate} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Convenience Fee</label>
          <input name="convenience_fee" type="number" min="0" step="0.01" value={form.convenience_fee} onChange={handleChange} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label>Display Badge</label>
          <input name="badge_text" value={form.badge_text} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Available Days</label>
          <input name="available_days" value={form.available_days} onChange={handleChange} placeholder="Monday, Tuesday" />
        </div>
      </div>
      <div className="form-group">
        <label>Terms / No-refund Acknowledgement</label>
        <textarea name="terms_text" value={form.terms_text} onChange={handleChange} />
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Active
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} />
          Featured
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="tax_applicable" checked={form.tax_applicable} onChange={handleChange} />
          Tax Applicable
        </label>
      </div>
      <button type="submit" className="btn bg-navy text-white hover:bg-navy-light">
        Save Package
      </button>
    </form>
  );
}
