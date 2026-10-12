import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../services/api.js';
import { Logo } from './Logo.js';
import { PaginationComponent } from './pagination.js';

export type GovtNavTab =
  | 'overview'
  | 'ai-control'
  | 'problem-statements'
  | 'higher-education'
  | 'industries'
  | 'report';

export interface ProblemStatementItem {
  id: string;
  title: string;
  statementText: string;
  category: string | null;
  status: string;
  confidence: number | null;
  evidenceCount: number;
  affectedArea: string | null;
  solutionDomain: string | null;
  targetInstitutionType: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface HigherEducationItem {
  universityID: string;
  universityName: string;
  universityAddress: string | null;
  universityContactNo: string | null;
  universityWebsiteLink: string | null;
  isUniversityActive: boolean | null;
  isUniversityVerified: boolean | null;
  universityResearchDepartments: string[] | null;
  AISHECode: string;
  createdAt: string | null;
  spoc: {
    spocID?: string;
    firstname: string;
    lastname: string;
    universityEmail: string;
    positionTitle: string | null;
    departmentSpoc: string | null;
  } | null;
}

export interface IndustryPartnerItem {
  id: string;
  name: string;
  type: string;
  sectorTags: string[];
  contributionTypes: string[];
  operatingDistricts: string[] | null;
  location: string | null;
  contactDetails: {
    website?: string;
    phone?: string;
    officialEmail?: string;
    registrationNumber?: string;
  } | null;
  isActive: boolean | null;
  createdAt: string | null;
  spoc: {
    id?: string;
    firstname: string;
    lastname: string;
    email: string;
    designation: string | null;
    phone: string | null;
  } | null;
}

interface GovtdashboardProps {
  onLogout?: () => void;
  defaultTab?: GovtNavTab;
}

export const Govtdashboard: React.FC<GovtdashboardProps> = ({
  onLogout,
  defaultTab = 'overview',
}) => {
  const navigate = useNavigate();
  const { logout, govtOfficer, fetchGovtProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<GovtNavTab>(defaultTab);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(!govtOfficer);

  const [problemStatements, setProblemStatements] = useState<ProblemStatementItem[]>([]);
  const [selectedProblemStatement, setSelectedProblemStatement] = useState<ProblemStatementItem | null>(null);
  const [psPage, setPsPage] = useState(1);
  const [psTotalPages, setPsTotalPages] = useState(1);
  const [psTotalItems, setPsTotalItems] = useState(0);
  const [loadingPs, setLoadingPs] = useState(false);
  const [psError, setPsError] = useState<string | null>(null);

  // Higher Education State
  const [higherEducationList, setHigherEducationList] = useState<HigherEducationItem[]>([]);
  const [selectedHe, setSelectedHe] = useState<HigherEducationItem | null>(null);
  const [hePage, setHePage] = useState(1);
  const [heTotalPages, setHeTotalPages] = useState(1);
  const [heTotalItems, setHeTotalItems] = useState(0);
  const [loadingHe, setLoadingHe] = useState(false);
  const [heError, setHeError] = useState<string | null>(null);

  // Industry / Corporate Partners State
  const [industryList, setIndustryList] = useState<IndustryPartnerItem[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryPartnerItem | null>(null);
  const [industryPage, setIndustryPage] = useState(1);
  const [industryTotalPages, setIndustryTotalPages] = useState(1);
  const [industryTotalItems, setIndustryTotalItems] = useState(0);
  const [loadingIndustry, setLoadingIndustry] = useState(false);
  const [industryError, setIndustryError] = useState<string | null>(null);

  const fetchIndustryPartners = async (page: number = 1) => {
    setLoadingIndustry(true);
    setIndustryError(null);
    try {
      const res = await api.get('/api/v1/govt/industries', {
        params: {
          page,
          limit: 6,
        },
      });
      if (res.data?.success && res.data?.data) {
        setIndustryList(res.data.data.items || []);
        setIndustryPage(res.data.data.pagination?.page || 1);
        setIndustryTotalPages(res.data.data.pagination?.totalPages || 1);
        setIndustryTotalItems(res.data.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.warn('Could not fetch industry partners:', err);
      setIndustryError(err.response?.data?.message || 'Failed to fetch industry partners');
    } finally {
      setLoadingIndustry(false);
    }
  };

  const fetchHigherEducation = async (page: number = 1) => {
    setLoadingHe(true);
    setHeError(null);
    try {
      const res = await api.get('/api/v1/govt/higher-education', {
        params: {
          page,
          limit: 6,
        },
      });
      if (res.data?.success && res.data?.data) {
        setHigherEducationList(res.data.data.items || []);
        setHePage(res.data.data.pagination?.page || 1);
        setHeTotalPages(res.data.data.pagination?.totalPages || 1);
        setHeTotalItems(res.data.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.warn('Could not fetch higher education institutes:', err);
      setHeError(err.response?.data?.message || 'Failed to fetch higher education institutes');
    } finally {
      setLoadingHe(false);
    }
  };

  const fetchProblemStatements = async (page: number = 1) => {
    setLoadingPs(true);
    setPsError(null);
    try {
      const res = await api.get('/api/v1/govt/problem-statements', {
        params: {
          page,
          limit: 6,
        },
      });
      if (res.data?.success && res.data?.data) {
        setProblemStatements(res.data.data.items || []);
        setPsPage(res.data.data.pagination?.page || 1);
        setPsTotalPages(res.data.data.pagination?.totalPages || 1);
        setPsTotalItems(res.data.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.warn('Could not fetch problem statements:', err);
      setPsError(err.response?.data?.message || 'Failed to fetch problem statements');
    } finally {
      setLoadingPs(false);
    }
  };

  // Fetch initial data on mount
  useEffect(() => {
    fetchProblemStatements(1);
    fetchHigherEducation(1);
    fetchIndustryPartners(1);
  }, []);

  // Live Agent / Grievance Telemetry State
  const [agentQueueStats, setAgentQueueStats] = useState<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalProcessed: number;
    isWorkerRunning: boolean;
  } | null>(null);
  const [agentHealth, setAgentHealth] = useState<{
    status: string;
    mongoConnected: boolean;
    pgConnected: boolean;
    workerRunning: boolean;
  } | null>(null);

  // Sync authenticated officer profile on mount
  useEffect(() => {
    let isMounted = true;
    const syncProfile = async () => {
      try {
        await fetchGovtProfile();
      } catch (err) {
        console.warn('Could not refresh govt officer profile:', err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };
    syncProfile();

    return () => {
      isMounted = false;
    };
  }, [fetchGovtProfile]);

  // Fetch real agent telemetry for the AI control & overview panels
  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const [queueRes, healthRes] = await Promise.allSettled([
          api.get('/api/v1/agent/queue'),
          api.get('/api/v1/agent/health'),
        ]);

        if (isMounted) {
          if (queueRes.status === 'fulfilled' && queueRes.value.data?.data) {
            setAgentQueueStats(queueRes.value.data.data);
          }
          if (healthRes.status === 'fulfilled' && healthRes.value.data?.data) {
            setAgentHealth(healthRes.value.data.data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch agent telemetry:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000); // 15s polling for live telemetry
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigate('/login');
    }
  };

  // If loading and officer is not yet hydrated
  if (loadingProfile && !govtOfficer) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] text-[#0f172a] font-figtree">
        <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-wide text-[#0f172a]/70">
          Loading District Nodal Officer Workspace...
        </p>
      </div>
    );
  }

  // Real Authenticated Nodal Officer Profile Data (No Dummy Fallbacks)
  const officerName = govtOfficer
    ? `${govtOfficer.firstname} ${govtOfficer.lastname}`.trim()
    : 'Nodal Officer';
  const officerEmail = govtOfficer?.email || '';
  const officerDistrict = govtOfficer?.district || '';
  const officerState = govtOfficer?.state || 'Tripura';
  const officerDept = govtOfficer?.department || '';
  const officerDesignation = govtOfficer?.designation || '';
  const officerId = govtOfficer?.officeId || 'Pending Assignment';
  const officerContact = govtOfficer?.contactNo || 'Not Provided';
  const initial = officerName ? officerName.charAt(0).toUpperCase() : 'G';

  const navItems = [
    {
      id: 'overview' as GovtNavTab,
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: 'ai-control' as GovtNavTab,
      label: 'AI control panel',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
          <path d="M6 10v1a6 6 0 0 0 12 0v-1" />
          <path d="M12 17v5" />
          <path d="M8 22h8" />
          <path d="m3 7 2 2-2 2" />
          <path d="m21 7-2 2 2 2" />
        </svg>
      ),
    },
    {
      id: 'problem-statements' as GovtNavTab,
      label: 'problem statements',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: 'higher-education' as GovtNavTab,
      label: 'Higher Education',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      id: 'industries' as GovtNavTab,
      label: 'industries',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: 'report' as GovtNavTab,
      label: 'report',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="dashboard-root h-screen w-full bg-[#f8fafc] text-[#0f172a] flex font-figtree antialiased overflow-hidden">
      {/* ==================== LEFT SIDEBAR (NON-SCROLLABLE / FIXED) ==================== */}
      <aside className="w-64 lg:w-72 h-screen sticky top-0 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 shadow-[2px_0_16px_rgba(15,23,42,0.03)] z-20 overflow-y-auto select-none">
        {/* Top: Logo & Nav items */}
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <Logo className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#0f172a]">
                Civic<span className="text-[#2563eb]">Resolve</span>
              </span>
              <span className="text-[10px] text-[#2563eb] font-bold tracking-wider uppercase bg-blue-50 px-2 py-0.5 rounded-md w-fit mt-0.5 border border-blue-200/80">
                Govt Nodal Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Government Dashboard Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#0f172a] text-white font-bold shadow-md shadow-slate-900/15 border border-[#0f172a]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-medium border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="capitalize">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Real Officer Info & Logout */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-3">
          {/* Officer Identity Pill */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0f172a] to-[#2563eb] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#0f172a] truncate">
                {officerName}
              </span>
              <span className="text-[11px] text-[#2563eb] font-semibold truncate">
                {officerDistrict ? `${officerDistrict}, ${officerState}` : officerState}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-slate-200/80 transition-all duration-200 cursor-pointer shadow-xs group"
          >
            <svg
              className="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-colors"
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
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT WORKSPACE ==================== */}
      <main className="flex-1 h-screen flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
          {/* Left: Breadcrumbs / Real Jurisdiction Context */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Govt Portal
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-semibold text-[#0f172a] bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80">
              {officerDistrict ? `${officerDistrict}, ${officerState}` : officerState}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-[#2563eb] capitalize bg-blue-50/70 px-2.5 py-0.5 rounded-md border border-blue-200/60">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          {/* Right: User Profile Button & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb]/40 transition-all duration-200 cursor-pointer shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0f172a] to-[#2563eb] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {initial}
              </div>
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="text-xs font-bold text-[#0f172a] leading-tight">
                  {officerName}
                </span>
                <span className="text-[10px] text-[#2563eb] font-semibold leading-tight">
                  user profile
                </span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  showProfileMenu ? 'rotate-180' : ''
                }`}
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

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200/90 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-slate-200/80 mb-2">
                  <p className="text-xs font-bold text-[#0f172a]">{officerName}</p>
                  <p className="text-[11px] text-slate-700 truncate">{officerEmail}</p>
                  <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Jurisdiction:</span>
                      <span className="font-bold text-[#0f172a]">
                        {officerDistrict ? `${officerDistrict}, ${officerState}` : officerState}
                      </span>
                    </div>
                    {officerDept && (
                      <div className="flex justify-between text-slate-600">
                        <span>Department:</span>
                        <span className="font-semibold text-[#0f172a] text-right truncate max-w-[140px]">
                          {officerDept}
                        </span>
                      </div>
                    )}
                    {officerDesignation && (
                      <div className="flex justify-between text-slate-600">
                        <span>Designation:</span>
                        <span className="font-semibold text-[#0f172a] text-right truncate max-w-[140px]">
                          {officerDesignation}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Office ID:</span>
                      <span className="font-semibold text-[#2563eb]">{officerId}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Contact No:</span>
                      <span className="font-semibold text-[#0f172a]">{officerContact}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ==================== DASHBOARD BODY CONTENT ==================== */}
        <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto flex flex-col gap-8">
          {/* View 1: Overview Tab */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-200">
              {/* Hero / Jurisdiction Banner */}
              <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,23,42,0.04)] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col items-start text-left max-w-2xl">
                  
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight leading-tight mb-2">
                    {officerDept || 'District Nodal Command'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    Official district administration nodal portal for public grievance synthesis, academic research problem gates, and industry solution partnerships in{' '}
                    <span className="font-bold text-[#2563eb]">
                      {officerDistrict ? `${officerDistrict}, ${officerState}` : officerState}
                    </span>.
                  </p>
                </div>

                {/* Authenticated Officer Badge Card */}
               
              </section>

              {/* Metric Highlights (Live Data / Authentic States) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Queue Ingestion</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-[#2563eb] shadow-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">
                      {agentQueueStats ? agentQueueStats.pending : 0}
                    </p>
                    <p className="text-[11px] text-[#2563eb] font-semibold mt-0.5">
                      Pending Ingestion Queue
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Synthesized Problems</span>
                    <span className="p-2 rounded-xl bg-emerald-50 text-[#059669] shadow-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">{psTotalItems}</p>
                    <p className="text-[11px] text-[#059669] font-semibold mt-0.5">
                      Synthesized via Gate 2
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Higher Education Labs</span>
                    <span className="p-2 rounded-xl bg-indigo-50 text-[#4f46e5] shadow-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">{heTotalItems}</p>
                    <p className="text-[11px] text-[#4f46e5] font-semibold mt-0.5">
                      Linked University Labs
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Industry Partners</span>
                    <span className="p-2 rounded-xl bg-amber-50 text-[#d97706] shadow-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">{industryTotalItems}</p>
                    <p className="text-[11px] text-[#d97706] font-semibold mt-0.5">
                      Active CSR Sponsors
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  onClick={() => setActiveTab('ai-control')}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-[#2563eb]/60 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] group-hover:bg-[#0f172a] group-hover:text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-all shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                      <path d="M6 10v1a6 6 0 0 0 12 0v-1" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                    AI Control Panel
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Monitor live grievance ingestion, Gate 1 novelty checks, and pgvector embeddings.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('problem-statements')}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-[#2563eb]/60 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] group-hover:bg-[#0f172a] group-hover:text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-all shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                    Problem Statements
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Review published problem statements synthesized from recurring public issues.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('report')}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-[#2563eb]/60 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] group-hover:bg-[#0f172a] group-hover:text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-all shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                    District Reports & Analytics
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Analyze resolution milestones, civic trends, and district-wide development reports.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* View 2: AI Control Panel Tab (Real Telemetry) */}
          {activeTab === 'ai-control' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">AI Control Panel</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Autonomous Grievance Processing & Research Gate Pipeline
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <span className={`w-2 h-2 rounded-full ${agentHealth?.workerRunning !== false ? 'bg-[#059669] animate-pulse' : 'bg-amber-500'}`}></span>
                  {agentHealth?.workerRunning !== false ? 'Agent Worker Active' : 'Agent Idle'}
                </span>
              </div>

              {/* Live Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition-all duration-200">
                  <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Pending Issues</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">
                    {agentQueueStats ? agentQueueStats.pending : 0}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium mt-0.5">Awaiting gate processing</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition-all duration-200">
                  <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Currently In Process</span>
                  <p className="text-xl font-bold text-[#2563eb] mt-1">
                    {agentQueueStats ? agentQueueStats.processing : 0}
                  </p>
                  <p className="text-[10px] text-[#2563eb] font-semibold mt-0.5">Evaluating novelty / synthesis</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition-all duration-200">
                  <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Completed Runs</span>
                  <p className="text-xl font-bold text-[#059669] mt-1">
                    {agentQueueStats ? agentQueueStats.completed : 0}
                  </p>
                  <p className="text-[10px] text-[#059669] font-semibold mt-0.5">Processed through pipeline</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)] transition-all duration-200">
                  <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">Failed Runs</span>
                  <p className="text-xl font-bold text-[#dc2626] mt-1">
                    {agentQueueStats ? agentQueueStats.failed : 0}
                  </p>
                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Failed pipeline checks</p>
                </div>
              </div>

              {/* Gate Architecture Pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200">
                  <span className="text-xs font-bold text-white bg-[#0f172a] px-2.5 py-0.5 rounded-md shadow-2xs">Gate 1</span>
                  <h3 className="text-sm font-bold text-[#0f172a] mt-2">Routine Grievance Filter</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Filters out single-incident routine issues (pot-holes, streetlights) into pgvector knowledge base.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200">
                  <span className="text-xs font-bold text-white bg-[#1e3a8a] px-2.5 py-0.5 rounded-md shadow-2xs">Gate 2</span>
                  <h3 className="text-sm font-bold text-[#0f172a] mt-2">Recurrence & Impact Analysis</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Evaluates historical depth, severe civic impact, and recurring cluster patterns.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200">
                  <span className="text-xs font-bold text-[#059669] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md shadow-2xs">Synthesizer</span>
                  <h3 className="text-sm font-bold text-[#0f172a] mt-2">Problem Statement Formulation</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Extracts structural root causes, core gaps, and industry-grade research challenges.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* View 3: Problem Statements Tab */}
          {activeTab === 'problem-statements' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Problem Statements</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Research challenges synthesized from citizen grievances for {officerDistrict ? `${officerDistrict}, ${officerState}` : officerState}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => fetchProblemStatements(psPage)}
                    disabled={loadingPs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb] text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-[#2563eb] ${loadingPs ? 'animate-spin' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 shadow-2xs">
                    {psTotalItems} {psTotalItems === 1 ? 'Problem' : 'Problems'}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {psError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between shadow-xs">
                  <span>{psError}</span>
                  <button
                    type="button"
                    onClick={() => fetchProblemStatements(psPage)}
                    className="underline font-semibold hover:text-rose-900 ml-3"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loadingPs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-56 flex flex-col justify-between shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
                    >
                      <div className="space-y-3">
                        <div className="h-6 w-3/4 bg-slate-200/70 rounded-md"></div>
                        <div className="h-4 w-full bg-slate-200/40 rounded"></div>
                        <div className="h-4 w-5/6 bg-slate-200/40 rounded"></div>
                        <div className="h-4 w-4/6 bg-slate-200/40 rounded"></div>
                      </div>
                      <div className="h-4 w-28 bg-slate-200/60 rounded mt-4"></div>
                    </div>
                  ))}
                </div>
              ) : problemStatements.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3 shadow-xs">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a]">No Problem Statements Formulated Yet</h3>
                  <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                    As recurring civic grievances in {officerDistrict || officerState} pass Gate 1 novelty checks and Gate 2 pattern analysis, synthesized research-grade problem statements will appear here.
                  </p>
                </div>
              ) : (
                /* Problem Statements Grid + Pagination */
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {problemStatements.map((ps) => (
                      <div
                        key={ps.id}
                        className="bg-white border border-slate-200/80 hover:border-[#2563eb]/60 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
                      >
                        {/* Heading & Clean Description */}
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-snug line-clamp-2">
                            {ps.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-700 mt-3 leading-relaxed line-clamp-4 font-normal">
                            {ps.statementText.replace(/\*\*/g, '').trim()}
                          </p>
                        </div>

                        {/* View Details arrow link */}
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => setSelectedProblemStatement(ps)}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition-all cursor-pointer"
                          >
                            <span>View Details</span>
                            <svg
                              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Component */}
                  <PaginationComponent
                    currentPage={psPage}
                    totalPages={psTotalPages}
                    totalItems={psTotalItems}
                    onPageChange={(newPage) => fetchProblemStatements(newPage)}
                  />
                </div>
              )}

              {/* View Details Modal */}
              {selectedProblemStatement && (
                <div
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setSelectedProblemStatement(null)}
                >
                  <div
                    className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.16)] relative max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close button */}
                    <button
                      type="button"
                      onClick={() => setSelectedProblemStatement(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#0f172a] flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Close dialog"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    <div className="pr-8">
                      <h2 className="text-lg sm:text-xl font-bold text-[#0f172a] leading-snug">
                        {selectedProblemStatement.title}
                      </h2>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                        {selectedProblemStatement.statementText.replace(/\*\*/g, '').trim()}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedProblemStatement(null)}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition-all cursor-pointer shadow-xs"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View 4: Higher Education Tab */}
          {activeTab === 'higher-education' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Higher Education Partners</h2>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    Registered Universities, Institutes & R&D departments in {officerState}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => fetchHigherEducation(hePage)}
                    disabled={loadingHe}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb] text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-[#2563eb] ${loadingHe ? 'animate-spin' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50/80 text-[#2563eb] border border-blue-200/80">
                    {heTotalItems} {heTotalItems === 1 ? 'Linked Lab' : 'Linked Labs'}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {heError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                  <span>{heError}</span>
                  <button
                    type="button"
                    onClick={() => fetchHigherEducation(hePage)}
                    className="underline font-semibold hover:text-rose-900 ml-3 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loadingHe ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-56 flex flex-col justify-between shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
                    >
                      <div className="space-y-3">
                        <div className="h-6 w-3/4 bg-slate-200/70 rounded-md"></div>
                        <div className="h-4 w-1/2 bg-slate-200/50 rounded"></div>
                        <div className="h-3.5 w-full bg-slate-200/40 rounded"></div>
                        <div className="h-3.5 w-4/6 bg-slate-200/40 rounded"></div>
                      </div>
                      <div className="h-4 w-28 bg-slate-200/60 rounded mt-4"></div>
                    </div>
                  ))}
                </div>
              ) : higherEducationList.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3 shadow-xs">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a]">No Academic Research Partners Linked Yet</h3>
                  <p className="text-xs text-slate-700 max-w-md mt-1 leading-relaxed">
                    University research departments registered in {officerState} will appear here for student projects, thesis tracks, and sponsored civic research.
                  </p>
                </div>
              ) : (
                /* Higher Education Cards Grid + Pagination */
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {higherEducationList.map((he) => (
                      <div
                        key={he.universityID}
                        className="bg-white border border-slate-200/80 hover:border-[#2563eb]/60 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
                      >
                        {/* College Name & Contact Details */}
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-snug line-clamp-2">
                            {he.universityName}
                          </h3>

                          <div className="mt-4 flex flex-col gap-2.5 text-xs sm:text-sm">
                            {he.spoc && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                  SPOC Contact
                                </span>
                                <span className="font-bold text-[#0f172a]">
                                  {he.spoc.firstname} {he.spoc.lastname}
                                </span>
                                <span className="text-[#2563eb] font-semibold truncate">
                                  {he.spoc.universityEmail}
                                </span>
                              </div>
                            )}

                            {he.universityContactNo && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                <svg
                                  className="w-3.5 h-3.5 text-[#2563eb] shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span className="truncate">{he.universityContactNo}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* View More Link */}
                        <div className="mt-6 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedHe(he)}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-all cursor-pointer"
                          >
                            <span>View More</span>
                            <svg
                              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Component */}
                  <PaginationComponent
                    currentPage={hePage}
                    totalPages={heTotalPages}
                    totalItems={heTotalItems}
                    onPageChange={(newPage) => fetchHigherEducation(newPage)}
                  />
                </div>
              )}

              {/* View More Modal */}
              {selectedHe && (
                <div
                  className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setSelectedHe(null)}
                >
                  <div
                    className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.16)] relative max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedHe(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Close dialog"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {/* College Title & AISHE */}
                    <div className="pr-8">
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] leading-snug">
                        {selectedHe.universityName}
                      </h2>
                      <p className="text-xs font-bold text-[#2563eb] mt-1">
                        AISHE Code: {selectedHe.AISHECode}
                      </p>
                    </div>

                    {/* All Details */}
                    <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col gap-4 text-xs sm:text-sm">
                      {selectedHe.universityAddress && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Campus Address
                          </span>
                          <p className="text-slate-800 font-medium mt-0.5">{selectedHe.universityAddress}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedHe.universityContactNo && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              Phone Contact
                            </span>
                            <p className="font-bold text-[#0f172a] mt-0.5">{selectedHe.universityContactNo}</p>
                          </div>
                        )}
                        {selectedHe.universityWebsiteLink && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              Official Portal
                            </span>
                            <a
                              href={selectedHe.universityWebsiteLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2563eb] font-semibold underline mt-0.5 block truncate hover:text-[#1d4ed8]"
                            >
                              {selectedHe.universityWebsiteLink}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Designated SPOC */}
                      {selectedHe.spoc && (
                        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider">
                            Designated Institutional SPOC
                          </span>
                          <p className="text-sm font-bold text-[#0f172a]">
                            {selectedHe.spoc.firstname} {selectedHe.spoc.lastname}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-700">
                            <span>Email: <strong className="text-[#0f172a] font-bold">{selectedHe.spoc.universityEmail}</strong></span>
                            {selectedHe.spoc.departmentSpoc && (
                              <span>Dept: <strong className="text-[#0f172a] font-bold">{selectedHe.spoc.departmentSpoc}</strong></span>
                            )}
                            {selectedHe.spoc.positionTitle && (
                              <span>Role: <strong className="text-[#0f172a] font-bold">{selectedHe.spoc.positionTitle}</strong></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Research Departments */}
                      {selectedHe.universityResearchDepartments && selectedHe.universityResearchDepartments.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                            Active Research Departments & Labs
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedHe.universityResearchDepartments.map((dept, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100/90 text-slate-800 border border-slate-200/80"
                              >
                                {dept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
                      <span>
                        Status: <strong className="text-[#059669] font-bold">{selectedHe.isUniversityActive ? 'Active' : 'Inactive'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedHe(null)}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View 5: Industries Tab */}
          {activeTab === 'industries' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Industries & CSR Partners</h2>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    Corporate enterprises, MSMEs, and startups supporting civic solutions
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => fetchIndustryPartners(industryPage)}
                    disabled={loadingIndustry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb] text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-[#2563eb] ${loadingIndustry ? 'animate-spin' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50/80 text-[#2563eb] border border-blue-200/80">
                    {industryTotalItems} {industryTotalItems === 1 ? 'Active Partner' : 'Active Partners'}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {industryError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                  <span>{industryError}</span>
                  <button
                    type="button"
                    onClick={() => fetchIndustryPartners(industryPage)}
                    className="underline font-semibold hover:text-rose-900 ml-3 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loadingIndustry ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-56 flex flex-col justify-between shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
                    >
                      <div className="space-y-3">
                        <div className="h-6 w-3/4 bg-slate-200/70 rounded-md"></div>
                        <div className="h-4 w-1/2 bg-slate-200/50 rounded"></div>
                        <div className="h-3.5 w-full bg-slate-200/40 rounded"></div>
                        <div className="h-3.5 w-4/6 bg-slate-200/40 rounded"></div>
                      </div>
                      <div className="h-4 w-28 bg-slate-200/60 rounded mt-4"></div>
                    </div>
                  ))}
                </div>
              ) : industryList.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3 shadow-xs">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a]">No Industry Partners Linked Yet</h3>
                  <p className="text-xs text-slate-700 max-w-md mt-1 leading-relaxed">
                    Corporate CSR funders, technology incubators, and enterprise pilot partners for {officerDistrict || officerState} will be displayed here.
                  </p>
                </div>
              ) : (
                /* Industry Cards Grid + Pagination */
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {industryList.map((ind) => (
                      <div
                        key={ind.id}
                        className="bg-white border border-slate-200/80 hover:border-[#2563eb]/60 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
                      >
                        {/* Company Name & Summary */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50/80 text-[#2563eb] border border-blue-200/80">
                              {ind.type}
                            </span>
                            {ind.location && (
                              <span className="text-[11px] text-slate-700 truncate font-semibold">
                                {ind.location}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-snug line-clamp-2">
                            {ind.name}
                          </h3>

                          <div className="mt-4 flex flex-col gap-2.5 text-xs sm:text-sm">
                            {ind.spoc && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                  Corporate SPOC
                                </span>
                                <span className="font-bold text-[#0f172a]">
                                  {ind.spoc.firstname} {ind.spoc.lastname}
                                  {ind.spoc.designation ? ` • ${ind.spoc.designation}` : ''}
                                </span>
                                <span className="text-[#2563eb] font-semibold truncate">
                                  {ind.spoc.email}
                                </span>
                              </div>
                            )}

                            {(ind.contactDetails?.phone || ind.spoc?.phone) && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                <svg
                                  className="w-3.5 h-3.5 text-[#2563eb] shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span className="truncate">{ind.contactDetails?.phone || ind.spoc?.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* View More Link */}
                        <div className="mt-6 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedIndustry(ind)}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-all cursor-pointer"
                          >
                            <span>View More</span>
                            <svg
                              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Component */}
                  <PaginationComponent
                    currentPage={industryPage}
                    totalPages={industryTotalPages}
                    totalItems={industryTotalItems}
                    onPageChange={(newPage) => fetchIndustryPartners(newPage)}
                  />
                </div>
              )}

              {/* View More Modal */}
              {selectedIndustry && (
                <div
                  className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setSelectedIndustry(null)}
                >
                  <div
                    className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.16)] relative max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedIndustry(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Close dialog"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {/* Company Header */}
                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50/80 text-[#2563eb] border border-blue-200/80">
                          {selectedIndustry.type}
                        </span>
                        {selectedIndustry.location && (
                          <span className="text-xs text-slate-700 font-semibold">
                            {selectedIndustry.location}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] leading-snug">
                        {selectedIndustry.name}
                      </h2>
                      {selectedIndustry.contactDetails?.registrationNumber && (
                        <p className="text-xs font-bold text-[#2563eb] mt-1">
                          Registration / CIN: {selectedIndustry.contactDetails.registrationNumber}
                        </p>
                      )}
                    </div>

                    {/* Details Sections */}
                    <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col gap-4 text-xs sm:text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedIndustry.contactDetails?.phone && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              Official Phone
                            </span>
                            <p className="font-bold text-[#0f172a] mt-0.5">
                              {selectedIndustry.contactDetails.phone}
                            </p>
                          </div>
                        )}
                        {selectedIndustry.contactDetails?.officialEmail && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              Corporate Inquiries
                            </span>
                            <p className="font-bold text-[#2563eb] mt-0.5">
                              {selectedIndustry.contactDetails.officialEmail}
                            </p>
                          </div>
                        )}
                      </div>

                      {selectedIndustry.contactDetails?.website && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Corporate Website
                          </span>
                          <a
                            href={selectedIndustry.contactDetails.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2563eb] font-semibold underline mt-0.5 block truncate hover:text-[#1d4ed8]"
                          >
                            {selectedIndustry.contactDetails.website}
                          </a>
                        </div>
                      )}

                      {/* SPOC Card */}
                      {selectedIndustry.spoc && (
                        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-1.5 mt-1">
                          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider">
                            Designated Corporate SPOC
                          </span>
                          <p className="text-sm font-bold text-[#0f172a]">
                            {selectedIndustry.spoc.firstname} {selectedIndustry.spoc.lastname}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-700">
                            <span>Email: <strong className="text-[#0f172a] font-bold">{selectedIndustry.spoc.email}</strong></span>
                            {selectedIndustry.spoc.designation && (
                              <span>Role: <strong className="text-[#0f172a] font-bold">{selectedIndustry.spoc.designation}</strong></span>
                            )}
                            {selectedIndustry.spoc.phone && (
                              <span>Direct: <strong className="text-[#0f172a] font-bold">{selectedIndustry.spoc.phone}</strong></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sector Tags */}
                      {selectedIndustry.sectorTags && selectedIndustry.sectorTags.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                            Focus Sectors & Domains
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedIndustry.sectorTags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50/80 text-[#2563eb] border border-blue-200/80"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contribution Types */}
                      {selectedIndustry.contributionTypes && selectedIndustry.contributionTypes.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                            Contribution & Partnership Capabilities
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedIndustry.contributionTypes.map((ctype, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100/90 text-slate-800 border border-slate-200/80 capitalize"
                              >
                                {ctype.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Operating Districts */}
                      {selectedIndustry.operatingDistricts && selectedIndustry.operatingDistricts.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                            Deployment Districts
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedIndustry.operatingDistricts.map((dist, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-800 border border-slate-200/80"
                              >
                                {dist}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
                      <span>
                        Status: <strong className="text-[#059669] font-bold">{selectedIndustry.isActive ? 'Active Partner' : 'Inactive'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedIndustry(null)}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View 6: Report Tab */}
          {activeTab === 'report' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">District Reports</h2>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    Civic grievance resolution and problem statement progress for {officerDistrict ? `${officerDistrict}, ${officerState}` : officerState}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[#0f172a]">No Resolution Reports Available</h3>
                <p className="text-xs text-slate-700 max-w-md mt-1 leading-relaxed">
                  Quarterly audits, district escalation statistics, and performance benchmarks for {officerDistrict || officerState} will appear once reports are published.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Govtdashboard;
