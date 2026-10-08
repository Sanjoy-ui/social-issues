import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../services/api.js';
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

  // My Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const res = await api.get('/api/v1/issue/my-reports');
      const issues = res.data?.data?.issues || [];
      setReports(issues);
    } catch (err: any) {
      console.warn('Could not fetch citizen reports:', err);
      setReportsError(err.response?.data?.message || 'Failed to load your reports');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

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
                {reports.length}
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
            /* ==================== MY REPORTS TAB: LIVE DATA ==================== */
            <div className="flex flex-col gap-5">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      My Reported Grievances
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {reports.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Track AI analysis progress, cluster synthesis, and municipal resolution status.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={fetchReports}
                    disabled={loadingReports}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-slate-500 ${loadingReports ? 'animate-spin' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRegisterIssue}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Report New Issue</span>
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {reportsError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                  <span>{reportsError}</span>
                  <button onClick={fetchReports} className="underline font-semibold cursor-pointer">Retry</button>
                </div>
              )}

              {/* Loading State */}
              {loadingReports && reports.length === 0 && (
                <div className="flex flex-col gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-pulse flex flex-col gap-3">
                      <div className="h-4 bg-slate-100 rounded w-1/4" />
                      <div className="h-5 bg-slate-100 rounded w-3/4" />
                      <div className="h-12 bg-slate-100 rounded w-full" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loadingReports && reports.length === 0 && (
                <section className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center min-h-[340px]">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-2xs">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No Grievances Submitted Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                    You haven't reported any civic issues yet. Submit your first community grievance to trigger the AI research & solution pipeline.
                  </p>
                  <button
                    type="button"
                    onClick={handleRegisterIssue}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Register Your First Issue</span>
                  </button>
                </section>
              )}

              {/* Reports List */}
              {reports.length > 0 && (
                <div className="flex flex-col gap-4">
                  {reports.map((item: any) => {
                    const isClustered = item.agent_status === 'clustered';
                    const isResearchable = item.is_researchable === true;
                    const isUnassigned = item.agent_status === 'unassigned';
                    const isRejected = item.agent_status === 'gated_not_researchable' || item.agent_status === 'gated_out';
                    
                    return (
                      <div
                        key={item.id || item._id}
                        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col gap-4"
                      >
                        {/* Top Metadata Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                              {item.id}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Recent'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Workflow Status */}
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {item.status || 'SUBMITTED'}
                            </span>

                            {/* AI Agent Status Badge */}
                            {isClustered && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Synthesized Problem Statement
                              </span>
                            )}
                            {isUnassigned && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                In Evidence Pool (Awaiting Cluster)
                              </span>
                            )}
                            {isResearchable && !isClustered && !isUnassigned && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                ✓ Researchable (Gate 1 Passed)
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80">
                                ✕ Non-Researchable
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Issue Title & Description */}
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            {item.issue_title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {item.issue_description}
                          </p>
                        </div>

                        {/* Location / Address */}
                        {item.address && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="truncate">{item.address}</span>
                          </div>
                        )}

                        {/* AI Solvability & Reasoning Box */}
                        {item.researchability_reasoning && (
                          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                AI Solvability Analysis
                              </span>
                              {item.solution_domain && (
                                <span className="text-[10px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  Domain: <strong className="text-slate-800">{item.solution_domain}</strong>
                                </span>
                              )}
                              {item.target_institution_type && (
                                <span className="text-[10px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  Target: <strong className="text-slate-800">{item.target_institution_type}</strong>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 italic leading-relaxed">
                              "{item.researchability_reasoning}"
                            </p>
                          </div>
                        )}

                        {/* Cloudinary Uploaded Proof Photos */}
                        {item.issue_proof && Array.isArray(item.issue_proof) && item.issue_proof.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Uploaded Evidence ({item.issue_proof.length})
                            </span>
                            <div className="flex flex-wrap gap-2.5">
                              {item.issue_proof.map((url: string, pIdx: number) => (
                                <a
                                  key={pIdx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition-all shadow-2xs"
                                >
                                  <img
                                    src={url}
                                    alt={`Proof ${pIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* Register Civic Issue Modal */}
      <RegisterIssueModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSuccess={() => {
          fetchReports();
        }}
      />

    </div>
  );
};

export default Citizendashboard;
