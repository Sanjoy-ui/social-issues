import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { Logo } from './Logo.js';
import { RegisterIssueModal } from '../issue/RegisterIssueModal.js';

interface CitizendashboardProps {
  onRegisterIssue?: () => void;
  onHomeClick?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
}

export const Citizendashboard: React.FC<CitizendashboardProps> = ({
  onRegisterIssue,
  onHomeClick,
  onLogout,
  onProfileClick,
}) => {
  const navigate = useNavigate();
  const { logout, citizen, fetchCitizenProfile } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'my-reports'>('home');
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    // Revalidate and sync logged-in citizen data directly from database
    const syncProfile = async () => {
      try {
        await fetchCitizenProfile();
      } catch (err) {
        console.warn('Could not fetch citizen profile:', err);
      }
    };
    syncProfile();
  }, [fetchCitizenProfile]);

  // Handle Home Click
  const handleHome = () => {
    setActiveTab('home');
    if (onHomeClick) {
      onHomeClick();
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigate('/login');
    }
  };

  // Handle Register Issue
  const handleRegisterIssue = () => {
    if (onRegisterIssue) {
      onRegisterIssue();
    } else {
      setShowIssueModal(true);
    }
  };

  const displayName = citizen?.fullName || (citizen as any)?.full_name || 'Citizen User';
  const displayEmail = citizen?.email || 'citizen@civicresolve.org';
  const initial = (displayName && displayName !== 'Citizen User') ? displayName.charAt(0).toUpperCase() : 'C';

  return (
    <div className="dashboard-root min-h-screen w-full bg-[#f8fafc] text-slate-800 flex font-figtree antialiased">
      
      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className="w-64 lg:w-72 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 shadow-xs z-20">
        
        {/* Top: Logo & Navigation */}
        <div className="flex flex-col gap-6">
          
          {/* Logo & Brand Header */}
          <div 
            onClick={handleHome}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <Logo className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                Civic<span className="text-indigo-600">Resolve</span>
              </span>
              <span className="text-[10px] text-indigo-700 font-semibold tracking-wider uppercase bg-indigo-50 px-1.5 py-0.5 rounded-md w-fit mt-0.5">
                Citizen Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Sidebar Navigation">
            <button
              type="button"
              onClick={handleHome}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <svg 
                className="w-4 h-4 shrink-0" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-reports')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                activeTab === 'my-reports'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg 
                  className="w-4 h-4 shrink-0" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>My Reports</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                0
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Profile Summary & Logout */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-3">
          
          {/* Quick User Badge */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {displayEmail}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200/70 border border-slate-200/80 transition-all duration-200 cursor-pointer shadow-2xs group"
          >
            <svg 
              className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT WORKSPACE ==================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
          
          {/* Left: Breadcrumbs / Greeting */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Citizen Workspace
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-800">
              {activeTab === 'home' ? 'Overview' : 'My Reports'}
            </span>
          </div>

          {/* Right: User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (onProfileClick) onProfileClick();
                setShowProfileMenu(!showProfileMenu);
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {initial}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
                {displayName}
              </span>
              <svg 
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200/90 bg-white shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
                  
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Body Content */}
        <div className="p-6 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto flex flex-col gap-8">
          
          {activeTab === 'home' ? (
            /* ==================== HOME TAB: HERO ACTION CARD ==================== */
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-white via-indigo-50/20 to-blue-50/30">
              <div className="flex flex-col items-start text-left max-w-xl">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
                  Report a Civic Issue in Your Community
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Encountering road damage, water supply disruptions, garbage piles, or electrical hazards? 
                  Submit your grievance and our AI pipeline will translate, cluster evidence, and match the problem statement directly with academic researchers and district nodal officers.
                </p>

                {/* Primary Register Issue Action Button */}
                <button
                  type="button"
                  onClick={handleRegisterIssue}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center gap-2.5 text-sm cursor-pointer group"
                >
                  <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center transition-transform group-hover:rotate-90 duration-300">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <span>Register Issue</span>
                </button>
              </div>
            </section>
          ) : (
            /* ==================== MY REPORTS TAB: UNDER DEVELOPMENT ==================== */
            <section className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[360px] relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mb-5 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Under Development
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                My Reports is Under Development
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
                We are actively developing the grievance tracking module. Soon you will be able to review all your submitted issues, track real-time resolution stages, and view nodal officer feedback.
              </p>

              <button
                type="button"
                onClick={handleHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back to Home</span>
              </button>
            </section>
          )}

         

        </div>
      </main>

      {/* Register Civic Issue Modal */}
      <RegisterIssueModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
      />

    </div>
  );
};

export default Citizendashboard;
