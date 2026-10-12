import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../services/api.js';
import { Logo } from './Logo.js';
import { PaginationComponent } from './pagination.js';

export type IndustryNavTab =
  | 'overview'
  | 'project-management'
  | 'he-active-projects'
  | 'report';

export interface HeActiveProjectItem {
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
  track?: string | null;
  urgentEscalation?: boolean | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  university: {
    universityID: string;
    universityName: string;
    AISHECode: string;
    universityAddress?: string | null;
    universityContactNo?: string | null;
    universityWebsiteLink?: string | null;
    universityResearchDepartments?: string[] | null;
  };
  spoc: {
    spocID?: string;
    firstname: string;
    lastname: string;
    universityEmail: string;
    positionTitle?: string | null;
    departmentSpoc?: string | null;
  } | null;
}

interface IndustrydashboardProps {
  onLogout?: () => void;
  defaultTab?: IndustryNavTab;
}

export const Industrydashboard: React.FC<IndustrydashboardProps> = ({
  onLogout,
  defaultTab = 'overview',
}) => {
  const navigate = useNavigate();
  const { logout, industrySpoc, industryPartner } = useAuthStore();

  // Active navigation tab state
  const [activeTab, setActiveTab] = useState<IndustryNavTab>(defaultTab);

  // Profile dropdown menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derived user and enterprise identity details
  const spocName = industrySpoc?.firstname
    ? `${industrySpoc.firstname} ${industrySpoc.lastname}`
    : 'Corporate SPOC';
  const spocEmail = industrySpoc?.email || 'spoc@industry.org';
  const spocDesignation =
    industrySpoc?.designation || 'Corporate Partnership Lead';
  const partnerName = industryPartner?.name || 'Industry Partner';
  const partnerType = industryPartner?.type || 'Enterprise / Corporate';
  const sectorTags = industryPartner?.sectorTags || ['Technology', 'Civic Innovation'];
  const initial =
    (industrySpoc?.firstname || partnerName).charAt(0).toUpperCase() || 'I';

  // ==================== STATE: HIGHER EDUCATION ACTIVE PROJECTS ====================
  const [heProjects, setHeProjects] = useState<HeActiveProjectItem[]>([]);
  const [loadingHeProjects, setLoadingHeProjects] = useState(false);
  const [heProjectsError, setHeProjectsError] = useState<string | null>(null);
  const [hePage, setHePage] = useState(1);
  const [heTotalPages, setHeTotalPages] = useState(1);
  const [heTotalItems, setHeTotalItems] = useState(0);
  const [selectedHeProject, setSelectedHeProject] = useState<HeActiveProjectItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [partnerInterestProject, setPartnerInterestProject] = useState<HeActiveProjectItem | null>(null);
  const [interestSubmitted, setInterestSubmitted] = useState<string | null>(null);

  // Proposal Modal State
  const [proposeModalProject, setProposeModalProject] = useState<HeActiveProjectItem | null>(null);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalSummary, setProposalSummary] = useState('');
  const [contributionType, setContributionType] = useState('CSR_GRANT');
  const [estimatedTimeline, setEstimatedTimeline] = useState('6 Months');
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [submittedProposalsMap, setSubmittedProposalsMap] = useState<Record<string, boolean>>({});

  // In-memory cache for Higher Education Active Projects pagination & filters
  const heProjectsCacheRef = useRef<
    Record<
      string,
      {
        items: HeActiveProjectItem[];
        page: number;
        totalPages: number;
        total: number;
      }
    >
  >({});

  // ==================== API: FETCH HE ACTIVE PROJECTS ====================
  const fetchHeActiveProjects = useCallback(
    async (
      page: number = 1,
      forceRefresh: boolean = false,
      search: string = searchQuery,
      category: string = selectedCategory
    ) => {
      const cacheKey = `${page}_${category}_${search.trim().toLowerCase()}`;

      // Use cached result if available and not forced to refresh
      if (!forceRefresh && heProjectsCacheRef.current[cacheKey]) {
        const cached = heProjectsCacheRef.current[cacheKey];
        setHeProjects(cached.items);
        setHePage(cached.page);
        setHeTotalPages(cached.totalPages);
        setHeTotalItems(cached.total);
        return;
      }

      setLoadingHeProjects(true);
      setHeProjectsError(null);

      try {
        const res = await api.get('/api/v1/industry/he-active-projects', {
          params: {
            page,
            limit: 6,
            search: search.trim() || undefined,
            category: category !== 'all' ? category : undefined,
          },
        });

        if (res.data?.success && res.data?.data) {
          const items = res.data.data.items || [];
          const curPage = res.data.data.pagination?.page || 1;
          const totalPages = res.data.data.pagination?.totalPages || 1;
          const total = res.data.data.pagination?.total || 0;

          // Save to in-memory cache
          heProjectsCacheRef.current[cacheKey] = {
            items,
            page: curPage,
            totalPages,
            total,
          };

          setHeProjects(items);
          setHePage(curPage);
          setHeTotalPages(totalPages);
          setHeTotalItems(total);
        }
      } catch (err: any) {
        console.warn('Could not fetch HE active projects:', err);
        setHeProjectsError(
          err.response?.data?.message || 'Failed to fetch Higher Education active projects'
        );
      } finally {
        setLoadingHeProjects(false);
      }
    },
    [searchQuery, selectedCategory]
  );

  // Initial fetch on component mount
  useEffect(() => {
    fetchHeActiveProjects(1);
  }, [fetchHeActiveProjects]);

  // Tab change effect: Re-fetch if tab switched to he-active-projects and not loaded yet
  useEffect(() => {
    if (activeTab === 'he-active-projects') {
      fetchHeActiveProjects(hePage);
    }
  }, [activeTab, fetchHeActiveProjects, hePage]);

  // Handle Search Input Change
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    heProjectsCacheRef.current = {};
    fetchHeActiveProjects(1, true, searchQuery, selectedCategory);
  };

  // Handle Category Filter Change
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    heProjectsCacheRef.current = {};
    fetchHeActiveProjects(1, true, searchQuery, category);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      if (onLogout) {
        onLogout();
      } else {
        await logout();
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.warn('Logout failed:', err);
      navigate('/', { replace: true });
    }
  };

  // Sidebar navigation configuration matching wireframe layout
  const navItems: {
    id: IndustryNavTab;
    label: string;
    sublabel?: string;
    badge?: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'project-management',
      label: 'Project Management',
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      id: 'he-active-projects',
      label: 'Higher Educations',
      sublabel: 'Active Projects',
      badge: heTotalItems > 0 ? heTotalItems : undefined,
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
    },
    {
      id: 'report',
      label: 'report',
      icon: (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  // Distinct category tags for filtering
  const categoriesList = [
    { id: 'all', label: 'All Domains' },
    { id: 'Healthcare', label: 'Healthcare' },
    { id: 'Infrastructure', label: 'Infrastructure' },
    { id: 'Water Resources', label: 'Water' },
    { id: 'Sanitation', label: 'Sanitation' },
    { id: 'Environment', label: 'Environment' },
    { id: 'Education', label: 'Education' },
  ];

  return (
    <div className="dashboard-root h-screen w-full bg-[#f8fafc] text-[#0f172a] flex font-figtree antialiased overflow-hidden">
      {/* ==================== LEFT SIDEBAR (FIXED / NON-SCROLLABLE) ==================== */}
      <aside className="w-64 lg:w-72 h-screen sticky top-0 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 shadow-[2px_0_16px_rgba(15,23,42,0.03)] z-20 overflow-y-auto select-none">
        {/* Top: Logo & Nav items */}
        <div className="flex flex-col gap-6">
          {/* Logo / Brand Header */}
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
                Industry Portal
              </span>
            </div>
          </div>

          {/* Navigation Links matching Wireframe */}
          <nav className="flex flex-col gap-1.5" aria-label="Industry Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#0f172a] text-white font-bold shadow-md shadow-slate-900/15 border border-[#0f172a]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <div className="flex flex-col text-left">
                      <span>{item.label}</span>
                      {item.sublabel && (
                        <span
                          className={`text-[10px] font-medium leading-tight ${
                            isActive ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {item.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Identity Card & Logout Button */}
        <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-3">
          {/* User Identity Pill */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0f172a] to-[#2563eb] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {initial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#0f172a] truncate">
                {spocName}
              </span>
              <span className="text-[11px] text-[#2563eb] font-semibold truncate">
                {partnerName}
              </span>
            </div>
          </div>

          {/* Wireframe-matched Logout Button */}
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
        {/* Top Header Bar with Dotted Separator Line matching Wireframe */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b-2 border-dashed border-slate-200/90 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
          {/* Left: Breadcrumbs & Corporate Context */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Industry Portal
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-semibold text-[#0f172a] bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80 truncate max-w-[200px] sm:max-w-xs">
              {partnerName}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-[#2563eb] capitalize bg-blue-50/70 px-2.5 py-0.5 rounded-md border border-blue-200/60">
              {activeTab === 'he-active-projects'
                ? 'Higher Educations Active Projects'
                : activeTab.replace('-', ' ')}
            </span>
          </div>

          {/* Right: user profile Trigger matching Wireframe */}
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
                  {spocName}
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

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200/90 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-slate-200/80 mb-2">
                  <p className="text-xs font-bold text-[#0f172a]">{spocName}</p>
                  <p className="text-[11px] text-slate-500">{spocEmail}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#2563eb] border border-blue-200/60">
                      {partnerType}
                    </span>
                    <span className="text-[10px] text-slate-600 truncate">
                      {spocDesignation}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-2 text-[11px] text-slate-600 flex flex-col gap-1 border-b border-slate-100 pb-2 mb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Organization:</span>
                    <span className="font-semibold text-slate-800">{partnerName}</span>
                  </div>
                  {sectorTags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {sectorTags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Body: Dynamic View Templates */}
        <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {/* ==================== VIEW 1: OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e3a8a] text-white p-7 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
                <div className="relative z-10 max-w-3xl">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome, {partnerName}
                  </h1>
                  <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
                    Collaborate with Higher Education institutions, co-sponsor academic research on critical civic challenges, and oversee corporate project milestones.
                  </p>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/20 to-transparent pointer-events-none" />
              </div>

              {/* Metrics Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      HE Active Projects
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0f172a] mt-2">
                    {heTotalItems}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Claimed by universities for research
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Corporate Workspaces
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0f172a] mt-2">0</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Industry-monitored projects
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      R&D Initiatives
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 14 14" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#059669] mt-2">0</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Pilot solutions underway
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Impact Reports
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0f172a] mt-2">0</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    CSR / R&D outcome briefs
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                <h3 className="text-sm font-bold text-[#0f172a] mb-4">
                  Quick Actions & Workspaces
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('he-active-projects')}
                    className="p-4 rounded-xl border border-slate-200/90 hover:border-[#2563eb] hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0f172a]">
                        Higher Educations Active Projects
                      </span>
                      {heTotalItems > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563eb]">
                          {heTotalItems}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Explore academic research partnerships, university guides, and active scholars
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('project-management')}
                    className="p-4 rounded-xl border border-slate-200/90 hover:border-[#2563eb] hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <div className="text-xs font-bold text-[#0f172a]">
                      Project Management
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Oversee active corporate milestones and civic solutions
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('report')}
                    className="p-4 rounded-xl border border-slate-200/90 hover:border-[#2563eb] hover:bg-blue-50/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                    <div className="text-xs font-bold text-[#0f172a]">
                      Reports & Analytics
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      View impact metrics and project completion reports
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== VIEW 2: PROJECT MANAGEMENT ==================== */}
          {activeTab === 'project-management' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f172a]">
                      Project Management
                    </h2>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Monitor corporate R&D initiatives, pilot testing, and deliverables
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200">
                      Workspace Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Template Placeholder Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Project Management Workspace
                </h3>
                <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                  This template area is ready for your specific project management workflows, milestone tracking, and team deliverables.
                </p>
              </div>
            </div>
          )}

          {/* ==================== VIEW 3: HIGHER EDUCATIONS ACTIVE PROJECTS ==================== */}
          {activeTab === 'he-active-projects' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f172a]">
                      Higher Educations Active Projects
                    </h2>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Civic problem statements claimed and actively researched by accredited universities & academic institutions
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => fetchHeActiveProjects(hePage, true)}
                      disabled={loadingHeProjects}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb] text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                    >
                      <svg
                        className={`w-3.5 h-3.5 text-[#2563eb] ${loadingHeProjects ? 'animate-spin' : ''}`}
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
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {heTotalItems} {heTotalItems === 1 ? 'Active Project' : 'Active Projects'}
                    </span>
                  </div>
                </div>

                {/* Search & Domain Filter Bar */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  {/* Search Bar */}
                  <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search active project, university or location..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                    <svg
                      className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </form>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {categoriesList.map((cat) => {
                      const isCatSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isCatSelected
                              ? 'bg-[#0f172a] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Error Notice */}
              {heProjectsError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                  <span>{heProjectsError}</span>
                  <button
                    type="button"
                    onClick={() => fetchHeActiveProjects(hePage, true)}
                    className="underline font-semibold hover:text-rose-900 ml-3 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Success Notification on Interest Submission */}
              {interestSubmitted && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{interestSubmitted}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInterestSubmitted(null)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loadingHeProjects && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse flex flex-col justify-between h-72"
                    >
                      <div className="space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-5 bg-slate-200 rounded w-5/6"></div>
                        <div className="h-16 bg-slate-100 rounded w-full"></div>
                      </div>
                      <div className="h-9 bg-slate-200 rounded-xl w-full"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Projects Found */}
              {!loadingHeProjects && heProjects.length === 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                  <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    No Higher Education Active Projects Found
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'No claimed projects match your filter criteria. Try resetting the search filters.'
                      : 'Higher Education institutions have not claimed any problem statements yet. Once claimed by a university, they will appear here for corporate collaboration.'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        fetchHeActiveProjects(1, true, '', 'all');
                      }}
                      className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}

              {/* Active Project Cards Grid */}
              {!loadingHeProjects && heProjects.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {heProjects.map((proj) => {
                    const claimedDateFormatted = proj.claimedAt
                      ? new Date(proj.claimedAt).toLocaleDateString('en-GB')
                      : 'Recently Claimed';
                    const facultyName = proj.spoc
                      ? `${proj.spoc.firstname} ${proj.spoc.lastname}`
                      : 'Faculty Guide Assigned';

                    return (
                      <div
                        key={proj.id}
                        className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* University Header Row */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-[#0f172a] truncate group-hover:text-indigo-700 transition-colors">
                                  {proj.university?.universityName || 'Higher Education Partner'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold tracking-wide">
                                  AISHE: {proj.university?.AISHECode || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 shrink-0">
                              Active Research
                            </span>
                          </div>

                          {/* Academic Faculty Lead */}
                          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                            </svg>
                            <span className="text-[11px] text-slate-700 font-medium truncate">
                              Mentor: <span className="font-semibold text-slate-900">{facultyName}</span>
                            </span>
                          </div>

                          {/* Problem Title */}
                          <h3 className="text-sm font-bold text-[#0f172a] line-clamp-2 leading-snug group-hover:text-[#2563eb] transition-colors mb-2">
                            {proj.title}
                          </h3>

                          {/* Statement Preview */}
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                            {proj.statementText}
                          </p>
                        </div>

                        {/* Card Footer: Metadata & Actions */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                          {/* Badges Row */}
                          <div className="flex items-center justify-between text-[11px]">
                            {proj.category ? (
                              <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-[#2563eb]">
                                {proj.category}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600">
                                Civic Challenge
                              </span>
                            )}
                            <span className="text-slate-500 font-medium">
                              Claimed: {claimedDateFormatted}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedHeProject(proj)}
                              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 hover:text-[#0f172a] bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer text-center"
                            >
                              Research Brief
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProposeModalProject(proj);
                                setProposalTitle(`Solution Proposal: ${proj.title}`);
                                setProposalSummary('');
                                setProposalFile(null);
                                setEstimatedTimeline('6 Months');
                                setContributionType('CSR_GRANT');
                                setProposalError(null);
                              }}
                              className={`w-full py-2 px-3 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                                submittedProposalsMap[proj.id]
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
                              }`}
                            >
                              <span>
                                {submittedProposalsMap[proj.id]
                                  ? 'Proposal Sent ✓'
                                  : 'Propose Solution'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {!loadingHeProjects && heTotalPages > 1 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                  <PaginationComponent
                    currentPage={hePage}
                    totalPages={heTotalPages}
                    totalItems={heTotalItems}
                    onPageChange={(newPage) => fetchHeActiveProjects(newPage)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ==================== VIEW 4: REPORT ==================== */}
          {activeTab === 'report' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f172a]">report</h2>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Corporate Social Responsibility (CSR) and project outcome reports
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Reporting Suite
                    </span>
                  </div>
                </div>
              </div>

              {/* Template Placeholder Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(15,23,42,0.03)]">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">
                  Reports & Analytics Suite
                </h3>
                <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                  Generate CSR compliance reports, track resource deployment, and view project impact summaries.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== MODAL 1: VIEW RESEARCH BRIEF ==================== */}
      {selectedHeProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Active Academic Project
                  </span>
                  {selectedHeProject.category && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563eb]">
                      {selectedHeProject.category}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#0f172a] leading-snug">
                  {selectedHeProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHeProject(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* University & Academic SPOC Box */}
            <div className="my-5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lead Academic Institution
                </span>
                <span className="text-xs font-bold text-[#0f172a] block mt-0.5">
                  {selectedHeProject.university?.universityName}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  AISHE Code: {selectedHeProject.university?.AISHECode}
                </span>
                {selectedHeProject.university?.universityAddress && (
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {selectedHeProject.university.universityAddress}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Faculty Guide / Academic SPOC
                </span>
                <span className="text-xs font-bold text-[#0f172a] block mt-0.5">
                  {selectedHeProject.spoc
                    ? `${selectedHeProject.spoc.firstname} ${selectedHeProject.spoc.lastname}`
                    : 'Institutional Coordinator'}
                </span>
                {selectedHeProject.spoc?.positionTitle && (
                  <span className="text-[11px] text-slate-500 block">
                    {selectedHeProject.spoc.positionTitle}
                  </span>
                )}
                {selectedHeProject.spoc?.universityEmail && (
                  <span className="text-[11px] text-[#2563eb] font-semibold block mt-0.5">
                    {selectedHeProject.spoc.universityEmail}
                  </span>
                )}
              </div>
            </div>

            {/* Research Problem Statement Details */}
            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-[#0f172a] uppercase tracking-wider text-[11px] mb-1">
                  Synthesized Research Statement
                </h4>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                  {selectedHeProject.statementText}
                </div>
              </div>

              {/* Context Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {selectedHeProject.affectedArea && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Affected Area
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {selectedHeProject.affectedArea}
                    </span>
                  </div>
                )}
                {selectedHeProject.solutionDomain && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Solution Domain
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {selectedHeProject.solutionDomain}
                    </span>
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Claimed For Research
                  </span>
                  <span className="text-xs font-bold text-[#059669] mt-0.5 block">
                    {selectedHeProject.claimedAt
                      ? new Date(selectedHeProject.claimedAt).toLocaleDateString('en-GB')
                      : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedHeProject(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const proj = selectedHeProject;
                  setSelectedHeProject(null);
                  setPartnerInterestProject(proj);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Co-Sponsor / Express CSR Interest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: PROPOSE SOLUTION & PARTNERSHIP (CLOUDINARY DOC UPLOAD) ==================== */}
      {proposeModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563eb]">
                    Solution Proposal & CSR Partnership
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    AISHE: {proposeModalProject.university?.AISHECode}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0f172a] leading-snug">
                  Propose Solution to {proposeModalProject.university?.universityName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submittingProposal) setProposeModalProject(null);
                }}
                disabled={submittingProposal}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Target Project Brief Preview */}
            <div className="my-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Target Research Challenge
              </span>
              <p className="text-xs font-bold text-[#0f172a] mt-0.5 truncate">
                {proposeModalProject.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600">
                <span>College: <strong>{proposeModalProject.university?.universityName}</strong></span>
                {proposeModalProject.spoc && (
                  <span>• Faculty Guide: <strong>{proposeModalProject.spoc.firstname} {proposeModalProject.spoc.lastname}</strong></span>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {proposalError && (
              <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                <span>{proposalError}</span>
                <button
                  type="button"
                  onClick={() => setProposalError(null)}
                  className="font-bold ml-2 text-rose-800 hover:text-rose-900"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Proposal Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!proposalFile) {
                  setProposalError('Please attach a proposal document (PDF or Word document).');
                  return;
                }

                setSubmittingProposal(true);
                setProposalError(null);

                try {
                  const formData = new FormData();
                  formData.append('problemStatementId', proposeModalProject.id);
                  formData.append('proposalTitle', proposalTitle);
                  formData.append('proposalSummary', proposalSummary);
                  formData.append('contributionType', contributionType);
                  if (estimatedTimeline) {
                    formData.append('estimatedTimeline', estimatedTimeline);
                  }
                  formData.append('document', proposalFile);

                  const res = await api.post('/api/v1/industry/proposals', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });

                  if (res.data?.success) {
                    setInterestSubmitted(
                      `Solution proposal "${proposalTitle}" submitted successfully to ${proposeModalProject.university?.universityName}! Uploaded document saved in Cloudinary.`
                    );
                    setSubmittedProposalsMap((prev) => ({
                      ...prev,
                      [proposeModalProject.id]: true,
                    }));
                    setProposeModalProject(null);
                    setProposalFile(null);
                    setProposalTitle('');
                    setProposalSummary('');
                  }
                } catch (err: any) {
                  console.error('Failed to submit proposal:', err);
                  setProposalError(
                    err.response?.data?.message ||
                      'Failed to submit proposal. Please check your document format and try again.'
                  );
                } finally {
                  setSubmittingProposal(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {/* Proposal Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposal Subject / Solution Title *
                </label>
                <input
                  type="text"
                  required
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  placeholder="e.g. Decentralized Solar Water Purification Deployment"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] outline-none font-medium"
                />
              </div>

              {/* Contribution Type & Timeline Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proposed Contribution Type *
                  </label>
                  <select
                    value={contributionType}
                    onChange={(e) => setContributionType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] outline-none font-medium cursor-pointer"
                  >
                    <option value="CSR_GRANT">CSR Funding & Financial Grant</option>
                    <option value="TECHNICAL_MENTORSHIP">Technical Mentorship & Academic Advisory</option>
                    <option value="FIELD_PILOT">Field Pilot Deployment & Testing</option>
                    <option value="LAB_RESOURCES">Lab Hardware & Compute Infrastructure</option>
                    <option value="JOINT_PATENT">Joint R&D & Co-IP Prototyping</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estimated Timeline / Milestones
                  </label>
                  <input
                    type="text"
                    value={estimatedTimeline}
                    onChange={(e) => setEstimatedTimeline(e.target.value)}
                    placeholder="e.g. 6 Months (Q1 - Q2 2027)"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] outline-none font-medium"
                  />
                </div>
              </div>

              {/* Proposal Summary */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Solution Summary & Technical Methodology *
                </label>
                <textarea
                  required
                  rows={4}
                  value={proposalSummary}
                  onChange={(e) => setProposalSummary(e.target.value)}
                  placeholder="Summarize your corporate solution, pilot plan, and how your team will collaborate with the faculty mentor and student scholars..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563eb] outline-none leading-relaxed font-medium"
                ></textarea>
              </div>

              {/* Cloudinary Document Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attach Solution Document (PDF or DOC) *
                </label>
                <div className="mt-1 border-2 border-dashed border-slate-300 hover:border-[#2563eb] rounded-xl p-4 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  {proposalFile ? (
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-xs font-bold text-[#0f172a] truncate">
                            {proposalFile.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {(proposalFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Cloudinary Upload
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProposalFile(null)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto w-8 h-8 text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <label className="cursor-pointer font-bold text-[#2563eb] hover:underline">
                        <span>Click to choose document</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setProposalFile(e.target.files[0]);
                              setProposalError(null);
                            }
                          }}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Supported formats: PDF, DOC, DOCX (Max 15MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submittingProposal}
                  onClick={() => setProposeModalProject(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal || !proposalFile}
                  className="px-5 py-2 font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  {submittingProposal ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span>Uploading to Cloudinary & Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Proposal to College</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Industrydashboard;
