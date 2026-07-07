'use client';

import React, { useState } from 'react';
import { login } from '../../../lib/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      localStorage.setItem('admin_token', 'cookie-session');
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      window.location.href = '/admin/leads';
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-bg-alt flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <h1 className="text-2xl font-bold text-center text-navy mb-8">Admin Login</h1>
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <button type="submit" className="btn bg-accent text-white w-full justify-center hover:bg-accent-light">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
