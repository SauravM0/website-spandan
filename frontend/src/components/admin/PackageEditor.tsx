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
    onSave?.(form);
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
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Active
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} />
          Featured
        </label>
      </div>
      <button type="submit" className="btn bg-navy text-white hover:bg-navy-light">
        Save Package
      </button>
    </form>
  );
}
