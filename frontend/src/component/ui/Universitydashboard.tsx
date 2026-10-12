import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { api } from '../../services/api.js';
import { Logo } from './Logo.js';
import { PaginationComponent } from './pagination.js';

export type HENavTab =
  | 'overview'
  | 'problem-statements'
  | 'industries'
  | 'assigned-projects'
  | 'team-management'
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
  track?: string | null;
  urgentEscalation?: boolean | null;
  claimedByUniversityId?: string | null;
  claimedBySpocId?: string | null;
  claimedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type TeamMemberRole = 'Faculty' | 'Student';

export interface ProjectTeamMember {
  id: string;
  name: string;
  role: TeamMemberRole;
  department: string;
  email: string;
  designationOrId?: string;
  createdAt: string;
}

export interface IndustryProposalItem {
  id: string;
  proposalTitle: string;
  proposalSummary: string;
  contributionType: string;
  estimatedTimeline: string | null;
  documentUrl: string;
  documentPublicId: string;
  documentName: string;
  documentFormat: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  collegeFeedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
  problemStatement: {
    id: string;
    title: string;
    category: string | null;
    statementText: string;
  };
  industryPartner: {
    id: string;
    name: string;
    type: string;
    sectorTags: string[];
    location: string | null;
    contactDetails: any;
  };
  industrySpoc: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    designation: string | null;
  };
}

interface UniversitydashboardProps {
  onLogout?: () => void;
}

export const Universitydashboard: React.FC<UniversitydashboardProps> = ({
  onLogout,
}) => {
  const navigate = useNavigate();
  const { logout, spoc, university } = useAuthStore();

  // Active navigation tab state
  const [activeTab, setActiveTab] = useState<HENavTab>('overview');
  // Top-right profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derive Institutional & SPOC Details
  const spocName = spoc?.firstname
    ? `${spoc.firstname} ${spoc.lastname}`
    : 'Institutional SPOC';
  const spocEmail = spoc?.universityEmail || 'spoc@university.edu';
  const universityName = university?.universityName || 'Higher Education Partner';
  const aisheCode = university?.AISHECode || 'AISHE-PENDING';
  const initial = (spoc?.firstname || universityName).charAt(0).toUpperCase() || 'U';

  // ==================== STATE: AVAILABLE PROBLEM STATEMENTS ====================
  const [availablePs, setAvailablePs] = useState<ProblemStatementItem[]>([]);
  const [loadingAvailablePs, setLoadingAvailablePs] = useState(false);
  const [psError, setPsError] = useState<string | null>(null);
  const [psPage, setPsPage] = useState(1);
  const [psTotalPages, setPsTotalPages] = useState(1);
  const [psTotalItems, setPsTotalItems] = useState(0);
  const [selectedPs, setSelectedPs] = useState<ProblemStatementItem | null>(null);

  // Claim workflow state
  const [claimingPsId, setClaimingPsId] = useState<string | null>(null);
  const [claimConfirmPs, setClaimConfirmPs] = useState<ProblemStatementItem | null>(null);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);
  const [claimErrorMessage, setClaimErrorMessage] = useState<string | null>(null);
  const [newlyClaimedId, setNewlyClaimedId] = useState<string | null>(null);

  // ==================== STATE: ASSIGNED PROJECTS ====================
  const [assignedProjects, setAssignedProjects] = useState<ProblemStatementItem[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assignedError, setAssignedError] = useState<string | null>(null);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedTotalPages, setAssignedTotalPages] = useState(1);
  const [assignedTotalItems, setAssignedTotalItems] = useState(0);
  const [selectedAssigned, setSelectedAssigned] = useState<ProblemStatementItem | null>(null);

  // ==================== STATE: PROJECT TEAM MANAGEMENT ====================
  const [selectedTeamProjectId, setSelectedTeamProjectId] = useState<string | null>(null);
  const [teamsByProject, setTeamsByProject] = useState<Record<string, ProjectTeamMember[]>>(() => {
    try {
      const storageKey = `civic_project_teams_${university?.universityID || 'univ'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal State for Adding Team Member
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberFormRole, setMemberFormRole] = useState<TeamMemberRole>('Faculty');
  const [memberFormName, setMemberFormName] = useState('');
  const [memberFormDept, setMemberFormDept] = useState('');
  const [memberFormEmail, setMemberFormEmail] = useState('');
  const [memberFormDetail, setMemberFormDetail] = useState('');
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<{
    projectId: string;
    memberId: string;
    memberName: string;
  } | null>(null);

  // ==================== STATE: INDUSTRY PROPOSALS ====================
  const [proposals, setProposals] = useState<IndustryProposalItem[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [proposalFilter, setProposalFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [proposalPage, setProposalPage] = useState(1);
  const [proposalTotalPages, setProposalTotalPages] = useState(1);
  const [proposalTotalItems, setProposalTotalItems] = useState(0);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);

  // Proposal Review Modal State
  const [reviewModalProposal, setReviewModalProposal] = useState<IndustryProposalItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'accepted' | 'rejected' | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);

  // Persist teams to localStorage on update
  const saveTeamsToStorage = (updated: Record<string, ProjectTeamMember[]>) => {
    setTeamsByProject(updated);
    try {
      const storageKey = `civic_project_teams_${university?.universityID || 'univ'}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist project teams to localStorage:', e);
    }
  };

  // Sync selectedTeamProjectId when assigned projects load if not set
  useEffect(() => {
    if (assignedProjects.length > 0 && !selectedTeamProjectId) {
      setSelectedTeamProjectId(assignedProjects[0].id);
    }
  }, [assignedProjects, selectedTeamProjectId]);

  const handleOpenAddMemberModal = (role: TeamMemberRole, projectId?: string) => {
    if (projectId) {
      setSelectedTeamProjectId(projectId);
    }
    setMemberFormRole(role);
    setMemberFormName('');
    setMemberFormDept('');
    setMemberFormEmail('');
    setMemberFormDetail('');
    setMemberFormError(null);
    setIsAddMemberModalOpen(true);
  };

  const handleSaveTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberFormError(null);

    const activeProjId = selectedTeamProjectId || assignedProjects[0]?.id;
    if (!activeProjId) {
      setMemberFormError('Please select a project statement first.');
      return;
    }

    if (!memberFormName.trim()) {
      setMemberFormError('Full name is required.');
      return;
    }
    if (!memberFormDept.trim()) {
      setMemberFormError('Academic department is required.');
      return;
    }
    if (!memberFormEmail.trim() || !memberFormEmail.includes('@')) {
      setMemberFormError('A valid institutional email is required.');
      return;
    }

    const newMember: ProjectTeamMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: memberFormName.trim(),
      role: memberFormRole,
      department: memberFormDept.trim(),
      email: memberFormEmail.trim().toLowerCase(),
      designationOrId: memberFormDetail.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const currentList = teamsByProject[activeProjId] || [];
    const updated = {
      ...teamsByProject,
      [activeProjId]: [...currentList, newMember],
    };

    saveTeamsToStorage(updated);
    setIsAddMemberModalOpen(false);
  };

  const handleConfirmDeleteMember = () => {
    if (!memberToDelete) return;
    const { projectId, memberId } = memberToDelete;
    const currentList = teamsByProject[projectId] || [];
    const updated = {
      ...teamsByProject,
      [projectId]: currentList.filter((m) => m.id !== memberId),
    };
    saveTeamsToStorage(updated);
    setMemberToDelete(null);
  };

  // Handle Logout
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    }
    await logout();
    navigate('/login');
  };

  // ==================== API: FETCH AVAILABLE PROBLEM STATEMENTS ====================
  const fetchAvailableProblemStatements = useCallback(async (page: number = 1) => {
    setLoadingAvailablePs(true);
    setPsError(null);
    try {
      const res = await api.get('/api/v1/university/problem-statements', {
        params: {
          page,
          limit: 6,
        },
      });
      if (res.data?.success && res.data?.data) {
        setAvailablePs(res.data.data.items || []);
        setPsPage(res.data.data.pagination?.page || 1);
        setPsTotalPages(res.data.data.pagination?.totalPages || 1);
        setPsTotalItems(res.data.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.warn('Could not fetch available problem statements:', err);
      setPsError(
        err.response?.data?.message || 'Failed to fetch available research challenges'
      );
    } finally {
      setLoadingAvailablePs(false);
    }
  }, []);

  // In-memory cache for assigned projects pagination
  const assignedProjectsCacheRef = React.useRef<
    Record<
      number,
      {
        items: ProblemStatementItem[];
        page: number;
        totalPages: number;
        total: number;
      }
    >
  >({});

  // ==================== API: FETCH ASSIGNED PROJECTS (CACHED) ====================
  const fetchAssignedProjects = useCallback(
    async (page: number = 1, forceRefresh: boolean = false) => {
      // Use cached result if available and not forced to refresh
      if (!forceRefresh && assignedProjectsCacheRef.current[page]) {
        const cached = assignedProjectsCacheRef.current[page];
        setAssignedProjects(cached.items);
        setAssignedPage(cached.page);
        setAssignedTotalPages(cached.totalPages);
        setAssignedTotalItems(cached.total);
        return;
      }

      setLoadingAssigned(true);
      setAssignedError(null);
      try {
        const res = await api.get('/api/v1/university/assigned-projects', {
          params: {
            page,
            limit: 6,
          },
        });
        if (res.data?.success && res.data?.data) {
          const items = res.data.data.items || [];
          const curPage = res.data.data.pagination?.page || 1;
          const totalPages = res.data.data.pagination?.totalPages || 1;
          const total = res.data.data.pagination?.total || 0;

          // Save to in-memory cache
          assignedProjectsCacheRef.current[curPage] = {
            items,
            page: curPage,
            totalPages,
            total,
          };

          setAssignedProjects(items);
          setAssignedPage(curPage);
          setAssignedTotalPages(totalPages);
          setAssignedTotalItems(total);
        }
      } catch (err: any) {
        console.warn('Could not fetch assigned projects:', err);
        setAssignedError(
          err.response?.data?.message || 'Failed to fetch assigned research projects'
        );
      } finally {
        setLoadingAssigned(false);
      }
    },
    []
  );

  // API: EXECUTE CLAIM PROBLEM STATEMENT 
  const handleExecuteClaim = async (ps: ProblemStatementItem) => {
    setClaimingPsId(ps.id);
    setClaimErrorMessage(null);
    setClaimSuccessMessage(null);
    try {
      const res = await api.post(`/api/v1/university/problem-statements/${ps.id}/claim`);
      if (res.data?.success) {
        setClaimSuccessMessage(
          `Successfully claimed "${ps.title}" for institutional research! It is now under active Project Management in Assigned Projects.`
        );
        // Highlight the newly claimed project
        setNewlyClaimedId(ps.id);
        // Close modals
        setClaimConfirmPs(null);
        setSelectedPs(null);
        // Automatically switch tab to assigned-projects for project management
        setActiveTab('assigned-projects');
        // Clear cache and refetch assigned projects (page 1) and available problem statements
        assignedProjectsCacheRef.current = {};
        await Promise.all([
          fetchAssignedProjects(1, true),
          fetchAvailableProblemStatements(1),
        ]);
      }
    } catch (err: any) {
      console.error('Failed to claim problem statement:', err);
      const errMsg =
        err.response?.data?.message ||
        'Unable to claim this problem statement. It may have already been claimed by another institution.';
      setClaimErrorMessage(errMsg);
      // If 409 Conflict, refresh available list so stale card is removed
      if (err.response?.status === 409) {
        fetchAvailableProblemStatements(psPage);
      }
    } finally {
      setClaimingPsId(null);
    }
  };

  // ==================== API: FETCH INDUSTRY PROPOSALS ====================
  const fetchProposals = useCallback(
    async (page: number = 1, statusFilter: string = proposalFilter) => {
      setLoadingProposals(true);
      setProposalsError(null);
      try {
        const params: any = { page, limit: 6 };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const res = await api.get('/api/v1/university/industry-proposals', { params });
        if (res.data?.success && res.data?.data) {
          setProposals(res.data.data.items || []);
          setProposalPage(res.data.data.pagination?.page || 1);
          setProposalTotalPages(res.data.data.pagination?.totalPages || 1);
          setProposalTotalItems(res.data.data.pagination?.total || 0);
        }
      } catch (err: any) {
        console.warn('Could not fetch industry proposals:', err);
        setProposalsError(
          err.response?.data?.message || 'Failed to fetch industry proposals'
        );
      } finally {
        setLoadingProposals(false);
      }
    },
    [proposalFilter]
  );

  const fetchPendingProposalsCount = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/university/industry-proposals', {
        params: { page: 1, limit: 1, status: 'pending' },
      });
      if (res.data?.success && res.data?.data) {
        setPendingProposalsCount(res.data.data.pagination?.total || 0);
      }
    } catch {
      // silently ignore
    }
  }, []);

  const handleOpenReviewModal = (proposal: IndustryProposalItem, action: 'accepted' | 'rejected') => {
    setReviewModalProposal(proposal);
    setReviewAction(action);
    setReviewFeedback(
      action === 'accepted'
        ? 'We are pleased to accept your collaboration proposal for this research challenge. Our academic research team looks forward to partnering with your organization.'
        : 'Thank you for your proposal. We are currently unable to take on this collaboration due to project scope priorities.'
    );
    setReviewErrorMessage(null);
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalProposal || !reviewAction) return;
    setSubmittingReview(true);
    setReviewErrorMessage(null);
    try {
      const res = await api.patch(
        `/api/v1/university/industry-proposals/${reviewModalProposal.id}/review`,
        {
          status: reviewAction,
          feedback: reviewFeedback.trim() || undefined,
        }
      );
      if (res.data?.success) {
        setReviewSuccessMessage(
          reviewAction === 'accepted'
            ? `Proposal accepted! Active collaboration established with ${reviewModalProposal.industryPartner.name}.`
            : `Proposal from ${reviewModalProposal.industryPartner.name} declined.`
        );
        setReviewModalProposal(null);
        setReviewFeedback('');
        setReviewAction(null);
        // Refresh proposal list & counts
        await Promise.all([
          fetchProposals(proposalPage, proposalFilter),
          fetchPendingProposalsCount(),
        ]);
      }
    } catch (err: any) {
      console.error('Failed to review proposal:', err);
      setReviewErrorMessage(
        err.response?.data?.message || 'Failed to submit review decision.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchAvailableProblemStatements(1);
    fetchAssignedProjects(1);
    fetchPendingProposalsCount();
  }, [fetchAvailableProblemStatements, fetchAssignedProjects, fetchPendingProposalsCount]);

  // Tab switch effect for non-cached dynamic queries
  useEffect(() => {
    if (activeTab === 'problem-statements') {
      fetchAvailableProblemStatements(psPage);
    } else if (activeTab === 'industries') {
      fetchProposals(proposalPage, proposalFilter);
      fetchPendingProposalsCount();
    }
  }, [activeTab, fetchAvailableProblemStatements, psPage, fetchProposals, proposalPage, proposalFilter, fetchPendingProposalsCount]);

  // Sidebar navigation configuration matching wireframe
  const navItems: { id: HENavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'problem-statements',
      label: 'problem statements',
      badge: psTotalItems > 0 ? psTotalItems : undefined,
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
      id: 'industries',
      label: 'Industries',
      badge: pendingProposalsCount > 0 ? pendingProposalsCount : undefined,
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: 'assigned-projects',
      label: 'Assigned Projects',
      badge: assignedTotalItems > 0 ? assignedTotalItems : undefined,
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      id: 'team-management',
      label: 'Team Management',
      icon: (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'report',
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
                HE Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Higher Education Navigation">
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
                    <span>{item.label}</span>
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

        {/* Bottom Section: Institutional SPOC Identity & Logout */}
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
                {universityName}
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
          {/* Left: Breadcrumbs / Institutional Context */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              HE Portal
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-semibold text-[#0f172a] bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80 truncate max-w-[200px] sm:max-w-xs">
              {universityName}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-[#2563eb] capitalize bg-blue-50/70 px-2.5 py-0.5 rounded-md border border-blue-200/60">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          {/* Right: user profile Button & Dropdown */}
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

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200/90 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-slate-200/80 mb-2">
                  <p className="text-xs font-bold text-[#0f172a]">{spocName}</p>
                  <p className="text-[11px] text-slate-700 truncate">{spocEmail}</p>
                  <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Institution:</span>
                      <span className="font-bold text-[#0f172a] text-right truncate max-w-[140px]">
                        {universityName}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>AISHE Code:</span>
                      <span className="font-bold text-[#2563eb]">{aisheCode}</span>
                    </div>
                    {spoc?.positionTitle && (
                      <div className="flex justify-between text-slate-700 font-medium">
                        <span>Position:</span>
                        <span className="font-bold text-[#0f172a] text-right truncate max-w-[140px]">
                          {spoc.positionTitle}
                        </span>
                      </div>
                    )}
                    {spoc?.departmentSpoc && (
                      <div className="flex justify-between text-slate-700 font-medium">
                        <span>Department:</span>
                        <span className="font-bold text-[#0f172a] text-right truncate max-w-[140px]">
                          {spoc.departmentSpoc}
                        </span>
                      </div>
                    )}
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

        {/* ==================== GLOBAL NOTIFICATIONS ==================== */}
        {claimSuccessMessage && (
          <div className="mx-6 sm:mx-8 lg:mx-10 mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{claimSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setClaimSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {claimErrorMessage && (
          <div className="mx-6 sm:mx-8 lg:mx-10 mt-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{claimErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setClaimErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {reviewSuccessMessage && (
          <div className="mx-6 sm:mx-8 lg:mx-10 mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{reviewSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setReviewSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {reviewErrorMessage && (
          <div className="mx-6 sm:mx-8 lg:mx-10 mt-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{reviewErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setReviewErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ==================== DASHBOARD BODY WORKSPACE ==================== */}
        <div className="p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto flex flex-col gap-8">
          {/* ==================== VIEW 1: OVERVIEW TAB ==================== */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-200">
              {/* Institutional Hero Banner */}
              <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,23,42,0.04)] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col items-start text-left max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-[11px] font-bold text-[#2563eb] uppercase tracking-wider mb-2">
                    Academic Research & Civic Partnership
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight leading-tight mb-2">
                    {universityName}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    Higher Education Command Hub for civic problem statement research claims, R&D thesis tracks, and institutional project deliverables.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('problem-statements')}
                    className="px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Browse Problem Statements</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('assigned-projects')}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0f172a] border border-slate-200/80 text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Assigned Projects</span>
                  </button>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Open Research Challenges</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-[#0f172a]">{psTotalItems}</span>
                    <p className="text-xs text-slate-700 font-medium mt-1">Available for institutional claim</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Claimed Assigned Projects</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-[#059669]">{assignedTotalItems}</span>
                    <p className="text-xs text-slate-700 font-medium mt-1">Active research projects underway</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Institution Status</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="mt-4">
                    <span className="text-lg font-bold text-[#0f172a]">AISHE Verified</span>
                    <p className="text-xs text-[#2563eb] font-semibold mt-1">Code: {aisheCode}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== VIEW 2: PROBLEM STATEMENTS TAB ==================== */}
          {activeTab === 'problem-statements' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Available Problem Statements</h2>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    Unclaimed civic research challenges available for {universityName} to claim for academic research
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => fetchAvailableProblemStatements(psPage)}
                    disabled={loadingAvailablePs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb] text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-[#2563eb] ${loadingAvailablePs ? 'animate-spin' : ''}`}
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
                    {psTotalItems} {psTotalItems === 1 ? 'Open Challenge' : 'Open Challenges'}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {psError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                  <span>{psError}</span>
                  <button
                    type="button"
                    onClick={() => fetchAvailableProblemStatements(psPage)}
                    className="underline font-semibold hover:text-rose-900 ml-3 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loadingAvailablePs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-64 flex flex-col justify-between shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
                    >
                      <div className="space-y-3">
                        <div className="h-4 w-24 bg-slate-200/60 rounded"></div>
                        <div className="h-6 w-3/4 bg-slate-200/70 rounded-md"></div>
                        <div className="h-3.5 w-full bg-slate-200/40 rounded"></div>
                        <div className="h-3.5 w-5/6 bg-slate-200/40 rounded"></div>
                      </div>
                      <div className="h-8 w-full bg-slate-200/50 rounded-xl mt-4"></div>
                    </div>
                  ))}
                </div>
              ) : availablePs.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3 shadow-xs">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a]">No Open Problem Statements</h3>
                  <p className="text-xs text-slate-700 max-w-md mt-1 leading-relaxed">
                    All current civic problem statements have either been claimed for research or are being synthesized by the AI agent pipeline.
                  </p>
                </div>
              ) : (
                /* Cards Grid + Pagination */
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availablePs.map((ps) => (
                      <div
                        key={ps.id}
                        className="bg-white border border-slate-200/80 hover:border-[#2563eb]/60 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Problem Title */}
                          <h3 className="text-base sm:text-lg font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-snug line-clamp-2">
                            {ps.title}
                          </h3>

                          {/* Statement Description Snippet */}
                          <p className="mt-2.5 text-xs text-slate-700 font-normal leading-relaxed line-clamp-4">
                            {ps.statementText}
                          </p>
                        </div>

                        {/* Action Buttons: View Details & Claim */}
                        <div className="mt-6 pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPs(ps)}
                            className="flex-1 h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200/90 text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center text-center whitespace-nowrap shadow-xs"
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => setClaimConfirmPs(ps)}
                            disabled={claimingPsId === ps.id}
                            className="flex-1 h-10 px-3 text-xs font-semibold rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            {claimingPsId === ps.id ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Claiming...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                  <polyline points="2 17 12 22 22 17" />
                                  <polyline points="2 12 12 17 22 12" />
                                </svg>
                                <span>Claim for Research</span>
                              </>
                            )}
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
                    onPageChange={(newPage) => fetchAvailableProblemStatements(newPage)}
                  />
                </div>
              )}

              {/* View Details Modal */}
              {selectedPs && (
                <div
                  className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setSelectedPs(null)}
                >
                  <div
                    className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.16)] relative max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPs(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Close dialog"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-[#2563eb] border border-blue-200/80">
                          {selectedPs.category || 'Civic Research'}
                        </span>
                        {selectedPs.affectedArea && (
                          <span className="text-xs text-slate-700 font-semibold">
                            {selectedPs.affectedArea}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] leading-snug">
                        {selectedPs.title}
                      </h2>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Synthesized Problem Statement
                        </span>
                        <p className="text-slate-800 font-normal leading-relaxed whitespace-pre-wrap">
                          {selectedPs.statementText}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Solution Domain
                          </span>
                          <p className="font-bold text-[#0f172a] mt-0.5">{selectedPs.solutionDomain || 'Multi-disciplinary'}</p>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Citizen Evidence Count
                          </span>
                          <p className="font-bold text-[#2563eb] mt-0.5">{selectedPs.evidenceCount} Grievance Clusters</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedPs(null)}
                        className="h-10 px-5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedPs;
                          setSelectedPs(null);
                          setClaimConfirmPs(target);
                        }}
                        className="h-10 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                        <span>Claim for Research</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Popup Modal: Confirm to Claim */}
              {claimConfirmPs && (
                <div
                  className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setClaimConfirmPs(null)}
                >
                  <div
                    className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.2)] relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Top Close Button (X) */}
                    <button
                      type="button"
                      onClick={() => setClaimConfirmPs(null)}
                      className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Close"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {/* Modal Header Icon */}
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] border border-blue-200/60 flex items-center justify-center mb-4 shadow-xs">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-[#0f172a] leading-tight">
                      Confirm to Claim Problem Statement
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                      Are you sure you want to claim this civic challenge for institutional academic research?
                    </p>

                    {/* Problem Statement Summary Card */}
                    <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 my-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-100 text-[#2563eb]">
                          {claimConfirmPs.category || 'Civic Research'}
                        </span>
                        {claimConfirmPs.affectedArea && (
                          <span className="text-[11px] text-slate-600 font-semibold truncate">
                            {claimConfirmPs.affectedArea}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#0f172a] leading-snug">
                        {claimConfirmPs.title}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        Claiming Institution: <strong className="text-[#0f172a]">{universityName}</strong>
                      </p>
                    </div>

                    

                    {/* Action Buttons */}
                    <div className="mt-6 flex items-center justify-end gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setClaimConfirmPs(null)}
                        className="h-10 px-5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center whitespace-nowrap"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteClaim(claimConfirmPs)}
                        disabled={claimingPsId === claimConfirmPs.id}
                        className="h-10 px-5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {claimingPsId === claimConfirmPs.id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Claiming Project...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 2 7 12 12 22 7 12 2" />
                              <polyline points="2 17 12 22 22 17" />
                              <polyline points="2 12 12 17 22 12" />
                            </svg>
                            <span>Confirm to Claim</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== VIEW 3: ASSIGNED PROJECTS TAB ==================== */}
          {activeTab === 'assigned-projects' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Bar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Assigned Projects & Project Management</h2>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    Civic problem statements claimed by {universityName} for active academic research, project management & piloting
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => fetchAssignedProjects(assignedPage, true)}
                    disabled={loadingAssigned}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-[#2563eb] text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-[#2563eb] ${loadingAssigned ? 'animate-spin' : ''}`}
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
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
                    {assignedTotalItems} {assignedTotalItems === 1 ? 'Claimed Project' : 'Claimed Projects'}
                  </span>
                </div>
              </div>

              {/* Error Notice */}
              {assignedError && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                  <span>{assignedError}</span>
                  <button
                    type="button"
                    onClick={() => fetchAssignedProjects(assignedPage, true)}
                    className="underline font-semibold hover:text-rose-900 ml-3 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {loadingAssigned ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 h-64 flex flex-col justify-between shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
                    >
                      <div className="space-y-3">
                        <div className="h-4 w-28 bg-slate-200/60 rounded"></div>
                        <div className="h-6 w-3/4 bg-slate-200/70 rounded-md"></div>
                        <div className="h-3.5 w-full bg-slate-200/40 rounded"></div>
                      </div>
                      <div className="h-8 w-24 bg-slate-200/50 rounded-xl mt-4"></div>
                    </div>
                  ))}
                </div>
              ) : assignedProjects.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-[0_4px_16px_rgba(15,23,42,0.04)] text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center mb-3 shadow-xs">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a]">No Assigned Projects Yet</h3>
                  <p className="text-xs text-slate-700 max-w-md mt-1 leading-relaxed">
                    Your institution hasn't claimed any problem statements yet. Explore the Problem Statements tab to claim civic challenges for academic research.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('problem-statements')}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Browse Available Statements
                  </button>
                </div>
              ) : (
                /* Cards Grid + Pagination */
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedProjects.map((proj) => {
                      const isNewlyClaimed = proj.id === newlyClaimedId;
                      return (
                        <div
                          key={proj.id}
                          className={`bg-white border rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group ${
                            isNewlyClaimed
                              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/15'
                              : 'border-slate-200/80 hover:border-emerald-300'
                          }`}
                        >
                          <div>
                            {/* Problem Title */}
                            <h3 className="text-base sm:text-lg font-bold text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-snug line-clamp-2">
                              {proj.title}
                            </h3>

                            {/* Statement Description Snippet */}
                            <p className="mt-2.5 text-xs text-slate-700 font-normal leading-relaxed line-clamp-3">
                              {proj.statementText}
                            </p>

                            {/* Claimed On Date */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                              <span className="text-slate-500 font-medium">Claimed On:</span>
                              <span className="font-semibold text-[#0f172a]">
                                {proj.claimedAt ? new Date(proj.claimedAt).toLocaleDateString() : 'Recently'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons: View Research Brief & Assign Team */}
                          <div className="mt-5 pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAssigned(proj)}
                              className="flex-1 h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200/90 text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center text-center shadow-xs whitespace-nowrap"
                            >
                              View Research Brief
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTeamProjectId(proj.id);
                                setActiveTab('team-management');
                              }}
                              className="flex-1 h-10 px-3 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                              title="Assign research scholars & faculty team in Team Management"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                              <span>Assign Team</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Component */}
                  <PaginationComponent
                    currentPage={assignedPage}
                    totalPages={assignedTotalPages}
                    totalItems={assignedTotalItems}
                    onPageChange={(newPage) => fetchAssignedProjects(newPage)}
                  />
                </div>
              )}

              {/* View Assigned Modal */}
              {selectedAssigned && (
                <div
                  className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setSelectedAssigned(null)}
                >
                  <div
                    className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.16)] relative max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAssigned(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Close dialog"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-emerald-50 text-[#059669] border border-emerald-200">
                          Claimed for Research
                        </span>
                        {selectedAssigned.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-[#2563eb] border border-blue-200">
                            {selectedAssigned.category}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a] leading-snug">
                        {selectedAssigned.title}
                      </h2>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Research Objective & Scope
                        </span>
                        <p className="text-slate-800 font-normal leading-relaxed whitespace-pre-wrap">
                          {selectedAssigned.statementText}
                        </p>
                      </div>

                      {/* Project Management Milestones Tracker */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col gap-3">
                        <span className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[#2563eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          Project Management Milestones
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/90 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                            <span className="font-semibold text-emerald-900">Phase 1: Inception & Scope (Active)</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Phase 2: Field Survey & Data Synthesis</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Phase 3: Solution Architecture & Prototype</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Phase 4: Pilot Deployment & Evaluation</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2 mt-1">
                        <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider">
                          Institutional Assignment Metadata
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                          <div>
                            <span className="text-slate-500">Institution:</span>{' '}
                            <strong className="text-[#0f172a]">{universityName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">AISHE Code:</span>{' '}
                            <strong className="text-[#2563eb]">{aisheCode}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Supervising SPOC:</span>{' '}
                            <strong className="text-[#0f172a]">{spocName}</strong>
                          </div>
                          {selectedAssigned.claimedAt && (
                            <div>
                              <span className="text-slate-500">Claimed Date:</span>{' '}
                              <strong className="text-[#0f172a]">
                                {new Date(selectedAssigned.claimedAt).toLocaleString()}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAssigned(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all cursor-pointer"
                      >
                        Close Brief
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = selectedAssigned.id;
                          setSelectedAssigned(null);
                          setSelectedTeamProjectId(targetId);
                          setActiveTab('team-management');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Assign Research Team</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== VIEW 4: INDUSTRIES TAB ==================== */}
          {activeTab === 'industries' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#2563eb] text-[11px] font-bold border border-blue-200/60 uppercase tracking-wider">
                      Corporate R&D & Co-Development
                    </span>
                    {pendingProposalsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {pendingProposalsCount} Awaiting Review
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-[#0f172a] tracking-tight">
                    Industry & CSR Collaboration Proposals
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-2xl">
                    Review solution blueprints, technical co-development pitches, and CSR funding proposals submitted by verified corporate partners for your claimed civic challenges.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      fetchProposals(proposalPage, proposalFilter);
                      fetchPendingProposalsCount();
                    }}
                    disabled={loadingProposals}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#0f172a] bg-slate-50 hover:bg-slate-100 border border-slate-200/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg
                      className={`w-3.5 h-3.5 ${loadingProposals ? 'animate-spin text-[#2563eb]' : 'text-slate-500'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>{loadingProposals ? 'Refreshing...' : 'Refresh Proposals'}</span>
                  </button>
                </div>
              </div>

              {/* Status Tabs and Quick Metric Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-1 overflow-x-auto p-1">
                  {(
                    [
                      { id: 'all', label: 'All Proposals' },
                      { id: 'pending', label: 'Pending Review', count: pendingProposalsCount },
                      { id: 'accepted', label: 'Accepted Collaborations' },
                      { id: 'rejected', label: 'Declined' },
                    ] as Array<{
                      id: 'all' | 'pending' | 'accepted' | 'rejected';
                      label: string;
                      count?: number;
                    }>
                  ).map((tab) => {
                    const isActive = proposalFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setProposalFilter(tab.id);
                          setProposalPage(1);
                          fetchProposals(1, tab.id);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                          isActive
                            ? 'bg-[#0f172a] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              isActive
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500 font-medium px-3 self-center sm:self-auto">
                  Showing <span className="font-bold text-slate-800">{proposals.length}</span> of{' '}
                  <span className="font-bold text-slate-800">{proposalTotalItems}</span> total proposals
                </div>
              </div>

              {/* Proposals List Workspace */}
              {proposalsError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
                  <span>{proposalsError}</span>
                  <button
                    type="button"
                    onClick={() => fetchProposals(proposalPage, proposalFilter)}
                    className="font-bold underline ml-3 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loadingProposals ? (
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse flex flex-col gap-4"
                    >
                      <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                      <div className="h-20 bg-slate-50 rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : proposals.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a]">
                    {proposalFilter === 'pending'
                      ? 'No Pending Proposals'
                      : proposalFilter === 'accepted'
                      ? 'No Accepted Collaborations Yet'
                      : proposalFilter === 'rejected'
                      ? 'No Declined Proposals'
                      : 'No Industry Proposals Received Yet'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                    {proposalFilter === 'pending'
                      ? 'All incoming solution proposals have been reviewed and evaluated by your university.'
                      : 'When verified corporate partners and CSR incubators submit solutions with technical documents for your claimed research challenges, they will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {proposals.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all flex flex-col gap-5"
                    >
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold text-xs shrink-0">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                              </svg>
                            </div>
                            <h3 className="text-base font-extrabold text-[#0f172a]">
                              {item.industryPartner.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.industryPartner.type || 'Corporate Partner'}
                            </span>
                            {Array.isArray(item.industryPartner.sectorTags) &&
                              item.industryPartner.sectorTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-[#2563eb]"
                                >
                                  #{tag}
                                </span>
                              ))}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <span>
                              Submitted on{' '}
                              {new Date(item.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {item.industryPartner.location && (
                              <>
                                <span>•</span>
                                <span>{item.industryPartner.location}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-start">
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending Review
                            </span>
                          )}
                          {item.status === 'accepted' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
                              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Collaboration Accepted
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-xs">
                              Declined
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Problem Statement Reference Banner */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                            Target Research Challenge:
                          </span>
                          <span className="text-xs font-bold text-[#0f172a] truncate">
                            {item.problemStatement.title}
                          </span>
                        </div>
                        {item.problemStatement.category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-[#2563eb] border border-blue-200/60 shrink-0 self-start sm:self-auto">
                            {item.problemStatement.category}
                          </span>
                        )}
                      </div>

                      {/* Proposal Title & Details */}
                      <div className="flex flex-col gap-2">
                        <h4 className="text-base font-bold text-[#0f172a]">
                          {item.proposalTitle}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            {item.contributionType}
                          </span>

                          {item.estimatedTimeline && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Timeline: {item.estimatedTimeline}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line mt-1 bg-white p-3.5 rounded-xl border border-slate-100">
                          {item.proposalSummary}
                        </p>
                      </div>

                      {/* Document Attachment Box (Cloudinary Upload) */}
                      <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-200/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 text-rose-600 flex items-center justify-center shadow-xs shrink-0">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[#0f172a] truncate">
                              {item.documentName || 'Solution Proposal Document'}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                              <span className="uppercase text-[#2563eb]">{item.documentFormat || 'PDF'} Document</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Cloudinary Cloud Storage</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={item.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-bold transition-all shadow-xs hover:shadow-sm"
                          >
                            <span>View Solution Doc</span>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                          <a
                            href={item.documentUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-xs"
                            title="Download Document"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </a>
                        </div>
                      </div>

                      {/* Industry SPOC Information */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Corporate SPOC:</span>
                          <span className="font-bold text-slate-800">
                            {item.industrySpoc.firstname} {item.industrySpoc.lastname}
                          </span>
                          {item.industrySpoc.designation && (
                            <span className="text-slate-500">({item.industrySpoc.designation})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium">
                          <a
                            href={`mailto:${item.industrySpoc.email}`}
                            className="text-[#2563eb] hover:underline flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            {item.industrySpoc.email}
                          </a>
                          <a
                            href={`tel:${item.industrySpoc.phone}`}
                            className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {item.industrySpoc.phone}
                          </a>
                        </div>
                      </div>

                      {/* Feedback banner if already evaluated */}
                      {item.reviewedAt && (
                        <div
                          className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1 ${
                            item.status === 'accepted'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {item.status === 'accepted'
                                ? '✓ Accepted for Academic-Industry Co-Development'
                                : 'Proposal Declined'}
                            </span>
                            <span className="text-[11px] opacity-75">
                              Evaluated on {new Date(item.reviewedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {item.collegeFeedback && (
                            <p className="mt-1 text-[11px] italic leading-relaxed">
                              "{item.collegeFeedback}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Review Actions if Pending */}
                      {item.status === 'pending' && (
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(item, 'rejected')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer shadow-xs"
                          >
                            Decline Proposal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(item, 'accepted')}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Accept Proposal & Partner</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {proposalTotalPages > 1 && (
                <div className="mt-2 flex justify-center">
                  <PaginationComponent
                    currentPage={proposalPage}
                    totalPages={proposalTotalPages}
                    onPageChange={(page) => {
                      setProposalPage(page);
                      fetchProposals(page, proposalFilter);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ==================== VIEW 5: PROJECT TEAM MANAGEMENT ==================== */}
          {activeTab === 'team-management' && (() => {
            const totalAssignedCount = assignedProjects.length;
            const allMembersList = Object.values(teamsByProject).flat();
            const totalFacultyCount = allMembersList.filter((m) => m.role === 'Faculty').length;
            const totalStudentCount = allMembersList.filter((m) => m.role === 'Student').length;
            const projectsWithTeamsCount = assignedProjects.filter(
              (p) => (teamsByProject[p.id] || []).length > 0
            ).length;

            const activeProject =
              assignedProjects.find(
                (p) => p.id === (selectedTeamProjectId || assignedProjects[0]?.id)
              ) || assignedProjects[0];

            const currentMembers = activeProject ? teamsByProject[activeProject.id] || [] : [];
            const currentFaculty = currentMembers.filter((m) => m.role === 'Faculty');
            const currentStudents = currentMembers.filter((m) => m.role === 'Student');

            return (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                {/* Header & Metrics */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#0f172a]">Project Team Management</h2>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        Allocate faculty mentors and student research scholars across your institution's claimed projects
                      </p>
                    </div>
                  </div>

                  {/* Summary Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
                    <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Assigned Projects
                      </div>
                      <div className="text-xl font-bold text-[#0f172a] mt-1">
                        {totalAssignedCount}
                      </div>
                    </div>
                    <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Teams Configured
                      </div>
                      <div className="text-xl font-bold text-[#2563eb] mt-1">
                        {projectsWithTeamsCount} / {totalAssignedCount}
                      </div>
                    </div>
                    <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Faculty Guides
                      </div>
                      <div className="text-xl font-bold text-[#0f172a] mt-1">
                        {totalFacultyCount}
                      </div>
                    </div>
                    <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Student Scholars
                      </div>
                      <div className="text-xl font-bold text-[#059669] mt-1">
                        {totalStudentCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* If No Claimed Problem Statements Yet */}
                {totalAssignedCount === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-3">
                      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-[#0f172a]">No Claimed Projects Available</h3>
                    <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                      Please claim a research problem statement first. Once claimed, you can allocate faculty guides and student teams here.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('problem-statements')}
                      className="mt-5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Browse Problem Statements
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Multi-Project Selector */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Select Project Workspace ({totalAssignedCount})
                        </span>
                        <span className="text-[11px] text-slate-700 font-medium">
                          Click any project to view or manage its team
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                        {assignedProjects.map((proj) => {
                          const isSelected = activeProject?.id === proj.id;
                          const members = teamsByProject[proj.id] || [];
                          const fCount = members.filter((m) => m.role === 'Faculty').length;
                          const sCount = members.filter((m) => m.role === 'Student').length;
                          const hasTeam = members.length > 0;

                          return (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => setSelectedTeamProjectId(proj.id)}
                              className={`px-4 py-3 rounded-xl border text-left transition-all shrink-0 max-w-[280px] sm:max-w-[320px] cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/90 text-[#0f172a] border-[#2563eb] shadow-xs ring-2 ring-blue-500/20'
                                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 hover:border-slate-300'
                              }`}
                            >
                              <div className={`text-xs font-bold truncate leading-snug ${isSelected ? 'text-[#1e40af]' : 'text-[#0f172a]'}`}>
                                {proj.title}
                              </div>
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                                {hasTeam ? (
                                  <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                                    {fCount} Faculty • {sCount} Students
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    Team Not Assigned
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Project Workspace */}
                    {activeProject && (
                      <div className="flex flex-col gap-6">
                        {/* Active Project Banner */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-[#2563eb] border border-blue-200">
                                Active Project Workspace
                              </span>
                              {activeProject.category && (
                                <span className="text-[11px] font-semibold text-slate-700">
                                  {activeProject.category}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-[#0f172a] leading-snug">
                              {activeProject.title}
                            </h3>
                            <p className="mt-1.5 text-xs text-slate-700 line-clamp-2 leading-relaxed">
                              {activeProject.statementText}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenAddMemberModal('Faculty', activeProject.id)}
                              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              <span>Add Faculty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddMemberModal('Student', activeProject.id)}
                              className="h-9 px-3.5 text-xs font-semibold rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                              <span>Add Student</span>
                            </button>
                          </div>
                        </div>

                        {/* Section 1: Faculty Guides */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-[#0f172a]">Faculty Guides</h4>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563eb]">
                                {currentFaculty.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAddMemberModal('Faculty', activeProject.id)}
                              className="text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <span>+ Add Faculty Guide</span>
                            </button>
                          </div>

                          {currentFaculty.length === 0 ? (
                            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mb-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                </svg>
                              </div>
                              <p className="text-xs font-medium text-slate-700">
                                No faculty guide assigned to this project yet.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenAddMemberModal('Faculty', activeProject.id)}
                                className="mt-3 px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
                              >
                                + Add Faculty Guide
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {currentFaculty.map((fac) => (
                                <div
                                  key={fac.id}
                                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                                          {fac.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="text-sm font-bold text-[#0f172a] leading-tight">
                                            {fac.name}
                                          </div>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#2563eb] border border-blue-100 uppercase tracking-wider inline-block mt-0.5">
                                            Faculty
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setMemberToDelete({
                                            projectId: activeProject.id,
                                            memberId: fac.id,
                                            memberName: fac.name,
                                          })
                                        }
                                        className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1 rounded-md hover:bg-red-50"
                                        title="Remove Faculty Guide"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                      </button>
                                    </div>

                                    <div className="mt-3.5 text-xs text-slate-700 flex flex-col gap-1">
                                      <div className="font-semibold text-slate-800">
                                        {fac.department}
                                        {fac.designationOrId && (
                                          <span className="font-normal text-slate-600"> • {fac.designationOrId}</span>
                                        )}
                                      </div>
                                      <div className="text-slate-600 text-[11px] truncate flex items-center gap-1.5 mt-0.5">
                                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                          <polyline points="22,6 12,13 2,6" />
                                        </svg>
                                        <span className="truncate">{fac.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 2: Student Members */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-[#0f172a]">Student Members</h4>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669]">
                                {currentStudents.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenAddMemberModal('Student', activeProject.id)}
                              className="text-xs font-semibold text-[#059669] hover:text-[#047857] cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <span>+ Add Student</span>
                            </button>
                          </div>

                          {currentStudents.length === 0 ? (
                            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center mb-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                </svg>
                              </div>
                              <p className="text-xs font-medium text-slate-700">
                                No students assigned to this project yet.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenAddMemberModal('Student', activeProject.id)}
                                className="mt-3 px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
                              >
                                + Add Student
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {currentStudents.map((stud) => (
                                <div
                                  key={stud.id}
                                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-200 hover:shadow-xs transition-all flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                                          {stud.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="text-sm font-bold text-[#0f172a] leading-tight">
                                            {stud.name}
                                          </div>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-100 uppercase tracking-wider inline-block mt-0.5">
                                            Student
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setMemberToDelete({
                                            projectId: activeProject.id,
                                            memberId: stud.id,
                                            memberName: stud.name,
                                          })
                                        }
                                        className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1 rounded-md hover:bg-red-50"
                                        title="Remove Student Member"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                      </button>
                                    </div>

                                    <div className="mt-3.5 text-xs text-slate-700 flex flex-col gap-1">
                                      <div className="font-semibold text-slate-800">
                                        {stud.department}
                                        {stud.designationOrId && (
                                          <span className="font-normal text-slate-600"> • Roll #{stud.designationOrId}</span>
                                        )}
                                      </div>
                                      <div className="text-slate-600 text-[11px] truncate flex items-center gap-1.5 mt-0.5">
                                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                          <polyline points="22,6 12,13 2,6" />
                                        </svg>
                                        <span className="truncate">{stud.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ==================== MODAL: ADD TEAM MEMBER ==================== */}
          {isAddMemberModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setIsAddMemberModalOpen(false)}
            >
              <div
                className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.16)] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                <div>
                  <h3 className="text-lg font-bold text-[#0f172a]">
                    Add {memberFormRole === 'Faculty' ? 'Faculty Guide' : 'Student Member'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Assign a dedicated team member to this academic research problem statement.
                  </p>
                </div>

                {/* Role Switcher Toggle */}
                <div className="mt-5 p-1 bg-slate-100 rounded-xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberFormRole('Faculty');
                      setMemberFormError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      memberFormRole === 'Faculty'
                        ? 'bg-white text-[#2563eb] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberFormRole('Student');
                      setMemberFormError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      memberFormRole === 'Student'
                        ? 'bg-white text-[#059669] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Student
                  </button>
                </div>

                {memberFormError && (
                  <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {memberFormError}
                  </div>
                )}

                <form onSubmit={handleSaveTeamMember} className="mt-5 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={memberFormName}
                      onChange={(e) => setMemberFormName(e.target.value)}
                      placeholder={memberFormRole === 'Faculty' ? 'e.g. Dr. Rajesh Sharma' : 'e.g. Priya Debnath'}
                      className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={memberFormDept}
                        onChange={(e) => setMemberFormDept(e.target.value)}
                        placeholder="e.g. Computer Science & Engg"
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {memberFormRole === 'Faculty' ? 'Designation' : 'Student / Roll ID'}
                      </label>
                      <input
                        type="text"
                        value={memberFormDetail}
                        onChange={(e) => setMemberFormDetail(e.target.value)}
                        placeholder={
                          memberFormRole === 'Faculty'
                            ? 'e.g. Professor, Assoc. Professor'
                            : 'e.g. 2024CS042, SCH-892'
                        }
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Institutional Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={memberFormEmail}
                      onChange={(e) => setMemberFormEmail(e.target.value)}
                      placeholder="e.g. scholar@university.ac.in"
                      className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                      required
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsAddMemberModalOpen(false)}
                      className="h-10 px-4 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-10 px-5 text-xs font-semibold rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs transition-all cursor-pointer"
                    >
                      Add Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================== MODAL: DELETE CONFIRMATION ==================== */}
          {memberToDelete && (
            <div
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setMemberToDelete(null)}
            >
              <div
                className="bg-white border border-slate-200/90 rounded-2xl max-w-sm w-full p-6 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[#0f172a]">Remove Team Member?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to remove <span className="font-semibold text-slate-800">{memberToDelete.memberName}</span> from this project team?
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMemberToDelete(null)}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteMember}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer"
                  >
                    Confirm Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== MODAL: INDUSTRY PROPOSAL REVIEW ==================== */}
          {reviewModalProposal && reviewAction && (
            <div
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => !submittingReview && setReviewModalProposal(null)}
            >
              <div
                className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-[0_20px_50px_rgba(15,23,42,0.16)] flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        reviewAction === 'accepted'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {reviewAction === 'accepted' ? (
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0f172a]">
                        {reviewAction === 'accepted'
                          ? 'Accept Industry Collaboration'
                          : 'Decline Solution Proposal'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {reviewModalProposal.industryPartner.name}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => !submittingReview && setReviewModalProposal(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {reviewErrorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {reviewErrorMessage}
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-700 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Proposal Title</span>
                  <span className="font-bold text-[#0f172a]">{reviewModalProposal.proposalTitle}</span>
                  <span className="text-[11px] text-slate-500">
                    Challenge: {reviewModalProposal.problemStatement.title}
                  </span>
                </div>

                <form onSubmit={handleExecuteReview} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {reviewAction === 'accepted'
                        ? 'Institutional Acceptance Note & Next Steps (Optional)'
                        : 'Feedback for Industry Partner (Optional)'}
                    </label>
                    <textarea
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      rows={3}
                      placeholder={
                        reviewAction === 'accepted'
                          ? 'e.g. We are excited to collaborate. Our faculty lead Dr. Sharma will reach out to schedule the project kickoff.'
                          : 'e.g. Thank you for the proposal. Currently our lab resources are committed to another phase.'
                      }
                      className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-500/10 text-slate-800 resize-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => setReviewModalProposal(null)}
                      className="h-10 px-4 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className={`h-10 px-5 text-xs font-bold rounded-xl text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        reviewAction === 'accepted'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      {submittingReview ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" />
                          </svg>
                          <span>Submitting...</span>
                        </>
                      ) : reviewAction === 'accepted' ? (
                        <span>Confirm & Accept Proposal</span>
                      ) : (
                        <span>Confirm Decline</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================== VIEW 6: REPORT TAB TEMPLATE ==================== */}
          {activeTab === 'report' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Reports</h2>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    Academic audit trails, research deliverables, and civic impact documentation for {universityName}
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
                  Quarterly research audits, published papers, and pilot evaluations will appear once submitted and verified.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Universitydashboard;
