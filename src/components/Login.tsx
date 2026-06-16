import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, LogIn, Lock, Mail, Activity } from 'lucide-react';
import { saveAuth } from '../utils/auth.ts';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide administrative email and password credentials.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid clinical staff credentials.');
      }

      const { token, user } = await res.json();
      saveAuth(token, user);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Login attempt failed. Please contact infrastructure systems admins.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-8">
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-4">
          <Activity className="w-6 h-6 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">CLINIC MAIN CONSOLE</h2>
        <p className="text-xs text-slate-500 mt-1">Authorized health staff login only</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Clinician Email Address</label>
          <div className="relative">
            <span className="absolute left-3 top-3.5 text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinician@clinic.org"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Security Access Key</label>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-3.5 text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2.5 text-xs text-red-700 font-semibold">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg px-6 py-3.5 text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <LogIn className="w-4 h-4 text-blue-500" />
          <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate'}</span>
        </button>
      </form>

      <div className="mt-8 border-t border-slate-100 pt-6 text-center text-[11px] text-slate-400 font-mono">
        <p>Democratized Clinical Systems Console v2.4.1</p>
        <p className="mt-1">Initial access config: <strong>admin@clinic.org</strong> / <strong>admin</strong></p>
      </div>
    </div>
  );
}
