import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, ShieldAlert, Heart, Activity } from 'lucide-react';
import Questionnaire from './components/Questionnaire.tsx';
import Login from './components/Login.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { isAuthenticated, getAuthUser, clearAuth } from './utils/auth.ts';
import { User as UserType } from './types.ts';

export default function App() {
  // Simple path state to manage routing ('survey' | 'login' | 'admin')
  const [currentPath, setCurrentPath] = useState<'survey' | 'login' | 'admin'>('survey');
  const [authorizedUser, setAuthorizedUser] = useState<UserType | null>(null);

  // Check state on load or hash navigation
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin' || hash === '/admin') {
        if (isAuthenticated()) {
          setAuthorizedUser(getAuthUser());
          setCurrentPath('admin');
        } else {
          setCurrentPath('login');
        }
      } else if (hash === '#login' || hash === '/login') {
        if (isAuthenticated()) {
          setAuthorizedUser(getAuthUser());
          setCurrentPath('admin');
        } else {
          setCurrentPath('login');
        }
      } else {
        setCurrentPath('survey');
      }
    };

    // Initialize
    handleLocationChange();

    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleLoginSuccess = (user: UserType) => {
    setAuthorizedUser(user);
    window.location.hash = '#admin';
    setCurrentPath('admin');
  };

  const handleLogout = () => {
    clearAuth();
    setAuthorizedUser(null);
    window.location.hash = '#login';
    setCurrentPath('login');
  };

  const handleNavigateToSurvey = () => {
    window.location.hash = '#survey';
    setCurrentPath('survey');
  };

  const handleNavigateToLogin = () => {
    if (isAuthenticated()) {
      setAuthorizedUser(getAuthUser());
      window.location.hash = '#admin';
      setCurrentPath('admin');
    } else {
      window.location.hash = '#login';
      setCurrentPath('login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Clinician Entryway Header / Navbar */}
      {currentPath !== 'admin' && (
        <header className="bg-white border-b border-slate-200 py-3 px-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 tracking-tight uppercase">FZ Safety and Health Intake Portal</span>
          </div>
          
          <div className="flex items-center gap-3">
            {currentPath === 'survey' ? (
              <button
                onClick={handleNavigateToLogin}
                className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-mono font-bold uppercase transition-all cursor-pointer"
              >
                Access Clinician Terminal KEY &rarr;
              </button>
            ) : (
              <button
                onClick={handleNavigateToSurvey}
                className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-bold uppercase transition-all cursor-pointer"
              >
                &larr; Return to Intake Form
              </button>
            )}
          </div>
        </header>
      )}

      {/* Primary Page Outlet Router */}
      <main className="flex-1 flex items-center justify-center">
        {currentPath === 'survey' && (
          <div className="w-full py-10 px-4">
            <Questionnaire onSubmitSuccess={(data) => {
              console.log('Intake submission succeeded:', data);
            }} />
          </div>
        )}

        {currentPath === 'login' && (
          <div className="w-full py-10 px-4">
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        )}

        {currentPath === 'admin' && authorizedUser && (
          <div className="w-full h-[768px]">
            <AdminDashboard user={authorizedUser} onLogout={handleLogout} />
          </div>
        )}
      </main>

      {/* Footer warning for non-admin modes */}
      {currentPath !== 'admin' && (
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-[11px] text-slate-400 font-medium">
          <div className="max-w-xl mx-auto flex items-center justify-around gap-2">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-green-500" />
              <span>HIPAA Bound Security Encryption Active</span>
            </span>
            <span>&bull;</span>
            <span>System Terminal v2.4.1</span>
          </div>
        </footer>
      )}
    </div>
  );
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
