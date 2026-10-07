import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RoleSelector, type UserRole } from '../component/auth/RoleSelector.js';
import { api } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

const INDUSTRY_TYPES = [
  { value: 'corporate', label: 'Corporate Enterprise' },
  { value: 'startup', label: 'Startup / Scaleup' },
  { value: 'msme', label: 'MSME' },
  { value: 'csr', label: 'CSR Foundation' },
  { value: 'research_lab', label: 'Research & Industrial Lab' },
  { value: 'incubator', label: 'Technology Incubator / Accelerator' },
  { value: 'psu', label: 'Public Sector Undertaking (PSU)' },
] as const;

const CONTRIBUTION_OPTIONS = [
  { id: 'funding', label: 'Grant & Solution Funding' },
  { id: 'mentorship', label: 'Expert Mentorship' },
  { id: 'prototyping', label: 'Prototyping & Sandbox' },
  { id: 'deployment', label: 'Pilot Deployment' },
  { id: 'testing', label: 'Field Testing & Validation' },
] as const;

const SUGGESTED_SECTORS = [
  'Clean Energy',
  'Waste Management',
  'Urban Mobility',
  'Healthcare Tech',
  'Water & Sanitation',
  'Smart Governance',
  'AgriTech',
];

const POPULAR_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Delhi (NCT)',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [role, setRole] = useState<UserRole>('UNIVERSITY');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Citizen Form State
  const [citizenFullName, setCitizenFullName] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [citizenConfirmPassword, setCitizenConfirmPassword] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');

  // University Form State
  const [universityName, setUniversityName] = useState('');
  const [AISHECode, setAISHECode] = useState('');
  const [universityAddress, setUniversityAddress] = useState('');
  const [universityContactNo, setUniversityContactNo] = useState('');
  const [universityWebsiteLink, setUniversityWebsiteLink] = useState('');
  const [departmentsInput, setDepartmentsInput] = useState('');

  // University SPOC State
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [universityEmail, setUniversityEmail] = useState('');
  const [password, setPassword] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [departmentSpoc, setDepartmentSpoc] = useState('');

  // Industry Partner Form State
  const [industryName, setIndustryName] = useState('');
  const [industryType, setIndustryType] = useState<string>('corporate');
  const [industrySectors, setIndustrySectors] = useState('');
  const [selectedContributions, setSelectedContributions] = useState<string[]>([]);
  const [industryDistricts, setIndustryDistricts] = useState('');
  const [industryLocation, setIndustryLocation] = useState('');
  const [industryWebsite, setIndustryWebsite] = useState('');
  const [industryPhone, setIndustryPhone] = useState('');
  const [industryRegNo, setIndustryRegNo] = useState('');

  // Industry SPOC State
  const [indSpocFirstname, setIndSpocFirstname] = useState('');
  const [indSpocLastname, setIndSpocLastname] = useState('');
  const [indSpocEmail, setIndSpocEmail] = useState('');
  const [indSpocPassword, setIndSpocPassword] = useState('');
  const [indSpocDesignation, setIndSpocDesignation] = useState('');
  const [indSpocPhone, setIndSpocPhone] = useState('');

  // Government Nodal Officer State
  const [govtFirstname, setGovtFirstname] = useState('');
  const [govtLastname, setGovtLastname] = useState('');
  const [govtEmail, setGovtEmail] = useState('');
  const [govtPassword, setGovtPassword] = useState('');
  const [govtState, setGovtState] = useState('');
  const [govtDistrict, setGovtDistrict] = useState('');
  const [govtDepartment, setGovtDepartment] = useState('');
  const [govtDesignation, setGovtDesignation] = useState('');
  const [govtOfficeId, setGovtOfficeId] = useState('');
  const [govtContactNo, setGovtContactNo] = useState('');
  const [districtAvailable, setDistrictAvailable] = useState<boolean | null>(null);
  const [checkingDistrict, setCheckingDistrict] = useState(false);

  const checkDistrict = async (st: string, dist: string) => {
    if (!st || !dist || dist.trim().length < 2) {
      setDistrictAvailable(null);
      return;
    }
    try {
      setCheckingDistrict(true);
      const res = await api.get(
        `/api/v1/govt/check-district?state=${encodeURIComponent(st.trim())}&district=${encodeURIComponent(dist.trim())}`
      );
      setDistrictAvailable(res.data.data?.available ?? null);
    } catch {
      setDistrictAvailable(null);
    } finally {
      setCheckingDistrict(false);
    }
  };

  const toggleContribution = (id: string) => {
    if (selectedContributions.includes(id)) {
      setSelectedContributions(selectedContributions.filter((c) => c !== id));
    } else {
      setSelectedContributions([...selectedContributions, id]);
    }
  };

  const addSectorTag = (tag: string) => {
    const current = industrySectors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!current.includes(tag)) {
      setIndustrySectors([...current, tag].join(', '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setLoading(true);

    try {
      if (role === 'CITIZEN') {
        if (citizenPassword.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        if (citizenPassword !== citizenConfirmPassword) {
          setErrorMessage('Passwords do not match. Please re-enter your password.');
          setLoading(false);
          return;
        }

        const payload = {
          fullName: citizenFullName.trim(),
          email: citizenEmail.trim().toLowerCase(),
          password: citizenPassword,
          phone: citizenPhone.trim() || undefined,
        };

        const response = await api.post('/api/v1/citizen/register', payload);
        const { accessToken, data } = response.data;

        // Auto-login to Zustand Auth Store
        setAuth({
          role: 'CITIZEN',
          citizen: data.citizen,
          accessToken,
        });

        setSuccessMessage(response.data.message || 'Citizen account registered successfully!');

        setTimeout(() => {
          navigate('/citizen');
        }, 1200);
        return;
      } else if (role === 'GOVT') {
        const payload = {
          firstname: govtFirstname.trim(),
          lastname: govtLastname.trim(),
          email: govtEmail.trim().toLowerCase(),
          password: govtPassword,
          state: govtState.trim(),
          district: govtDistrict.trim(),
          department: govtDepartment.trim(),
          designation: govtDesignation.trim(),
          officeId: govtOfficeId.trim() || undefined,
          contactNo: govtContactNo.trim(),
        };

        const response = await api.post('/api/v1/govt/register', payload);
        setSuccessMessage(response.data.message || 'District Nodal Officer registered successfully!');

        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else if (role === 'INDUSTRY') {
        const sectorTags = industrySectors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (sectorTags.length === 0) {
          setErrorMessage('Please provide at least one relevant sector or theme tag.');
          setLoading(false);
          return;
        }

        if (selectedContributions.length === 0) {
          setErrorMessage('Please select at least one contribution type.');
          setLoading(false);
          return;
        }

        const payload = {
          name: industryName.trim(),
          type: industryType,
          sectorTags,
          contributionTypes: selectedContributions,
          operatingDistricts: industryDistricts
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
          location: industryLocation.trim() || undefined,
          contactDetails: {
            website: industryWebsite.trim() || undefined,
            phone: industryPhone.trim() || undefined,
            officialEmail: indSpocEmail.trim() || undefined,
            registrationNumber: industryRegNo.trim() || undefined,
          },
          spoc: {
            firstname: indSpocFirstname.trim(),
            lastname: indSpocLastname.trim(),
            email: indSpocEmail.trim().toLowerCase(),
            password: indSpocPassword,
            designation: indSpocDesignation.trim() || 'SPOC',
            phone: indSpocPhone.trim() || undefined,
          },
        };

        const response = await api.post('/api/v1/industry/register', payload);
        setSuccessMessage(response.data.message || 'Industry partner registered successfully!');

        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        // University Onboarding
        const researchDepartments = departmentsInput
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);

        const payload = {
          universityName: universityName.trim(),
          AISHECode: AISHECode.trim().toUpperCase(),
          universityAddress: universityAddress.trim() || undefined,
          universityContactNo: universityContactNo.trim() || undefined,
          universityWebsiteLink: universityWebsiteLink.trim() || undefined,
          universityResearchDepartments: researchDepartments,
          spoc: {
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            universityEmail: universityEmail.trim().toLowerCase(),
            password,
            positionTitle: positionTitle.trim() || 'SPOC',
            departmentSpoc: departmentSpoc.trim() || 'General',
          },
        };

        const response = await api.post('/api/v1/university/onboard', payload);
        setSuccessMessage(response.data.message || 'University onboarded successfully!');

        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Failed to complete registration. Please verify your details.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl bg-white border border-gray-200/80 shadow-xl rounded-2xl p-6 sm:p-10">
        {/* Back to previous page */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 group cursor-pointer"
          aria-label="Go back to previous page"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Back</span>
        </button>

        {/* Header / Brand */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-2 mb-3 group">
            <img src="/logo.png" alt="CivicResolve Logo" className="w-12 h-12 object-contain group-hover:scale-105 transition-transform" />
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              Civic<span className="text-indigo-600">Resolve</span>
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {role === 'GOVT'
              ? 'District Nodal Officer Onboarding'
              : role === 'INDUSTRY'
              ? 'Industry Partner Onboarding'
              : role === 'CITIZEN'
              ? 'Citizen Account Registration'
              : 'Institutional Onboarding'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {role === 'GOVT'
              ? 'Register the designated Nodal Authority for your district jurisdiction (strictly 1 per district)'
              : role === 'INDUSTRY'
              ? 'Connect your enterprise to fund, mentor, prototype, and scale civic solutions'
              : role === 'CITIZEN'
              ? 'Create your citizen profile to report local civic issues and track resolutions'
              : 'Register your university or partner with nodal authorities'}
          </p>
        </div>

        {/* Role Selector */}
        <RoleSelector selectedRole={role} onChange={(r) => { setRole(r); setErrorMessage(null); }} />

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage} {role === 'CITIZEN' ? 'Opening citizen dashboard...' : 'Redirecting to login...'}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {role === 'GOVT' ? (
          /* ==================== GOVERNMENT DISTRICT NODAL FORM ==================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: District Jurisdiction & Administrative Details */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Administrative Jurisdiction
                </h2>
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  1 Nodal Officer per District
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State / UT *
                  </label>
                  <input
                    type="text"
                    required
                    list="states-list"
                    value={govtState}
                    onChange={(e) => {
                      setGovtState(e.target.value);
                      checkDistrict(e.target.value, govtDistrict);
                    }}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <datalist id="states-list">
                    {POPULAR_STATES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    District Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={govtDistrict}
                    onChange={(e) => {
                      setGovtDistrict(e.target.value);
                      checkDistrict(govtState, e.target.value);
                    }}
                    placeholder="e.g. Bengaluru Urban / Pune"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  {govtDistrict.trim().length >= 2 && (
                    <div className="mt-1 text-[11px]">
                      {checkingDistrict ? (
                        <span className="text-gray-500">Checking district designation status...</span>
                      ) : districtAvailable === true ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          District available for designation
                        </span>
                      ) : districtAvailable === false ? (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          District already assigned to another Nodal Officer
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department / Administrative Body *
                  </label>
                  <input
                    type="text"
                    required
                    value={govtDepartment}
                    onChange={(e) => setGovtDepartment(e.target.value)}
                    placeholder="e.g. District Magistrate & Collectorate Office"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={govtDesignation}
                    onChange={(e) => setGovtDesignation(e.target.value)}
                    placeholder="e.g. Additional District Magistrate (ADM)"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Government Employee ID / Office Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={govtOfficeId}
                    onChange={(e) => setGovtOfficeId(e.target.value)}
                    placeholder="e.g. KA-GOV-2026-ADM01"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Officer Credentials & Contact */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Officer Credentials & Contact
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={govtFirstname}
                    onChange={(e) => setGovtFirstname(e.target.value)}
                    placeholder="e.g. Suresh"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={govtLastname}
                    onChange={(e) => setGovtLastname(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Government Email * (Login ID)
                  </label>
                  <input
                    type="email"
                    required
                    value={govtEmail}
                    onChange={(e) => setGovtEmail(e.target.value)}
                    placeholder="officer@karnataka.gov.in"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password (Min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={govtPassword}
                    onChange={(e) => setGovtPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Contact Number * (Min 10 digits)
                  </label>
                  <input
                    type="tel"
                    required
                    value={govtContactNo}
                    onChange={(e) => setGovtContactNo(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || districtAvailable === false}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Registering District Nodal Officer...</span>
                </>
              ) : (
                'Complete District Nodal Registration'
              )}
            </button>
          </form>
        ) : role === 'INDUSTRY' ? (
          /* ==================== INDUSTRY PARTNER FORM ==================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Company / Partner Information */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Organization Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Industry / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={industryName}
                    onChange={(e) => setIndustryName(e.target.value)}
                    placeholder="e.g. Tata Power Innovation Lab / TechCorp CSR"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Organization Type *
                  </label>
                  <select
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {INDUSTRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    CIN / Registration No (Optional)
                  </label>
                  <input
                    type="text"
                    value={industryRegNo}
                    onChange={(e) => setIndustryRegNo(e.target.value)}
                    placeholder="e.g. U72200MH2020PTC123456"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                  />
                </div>

                {/* Contribution Types Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    How Can Your Organization Contribute? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CONTRIBUTION_OPTIONS.map((c) => {
                      const isSelected = selectedContributions.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleContribution(c.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </span>
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sector Tags Input */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Theme / Sector Tags * (Comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={industrySectors}
                    onChange={(e) => setIndustrySectors(e.target.value)}
                    placeholder="Clean Energy, Urban Mobility, Waste Management"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-gray-400 self-center mr-1">Quick add:</span>
                    {SUGGESTED_SECTORS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSectorTag(s)}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 transition-colors cursor-pointer border border-gray-200"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Operating Districts / Coverage (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={industryDistricts}
                    onChange={(e) => setIndustryDistricts(e.target.value)}
                    placeholder="e.g. Bengaluru Urban, Pune, NCR"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Headquarters / Office Location
                  </label>
                  <input
                    type="text"
                    value={industryLocation}
                    onChange={(e) => setIndustryLocation(e.target.value)}
                    placeholder="City, State"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    value={industryWebsite}
                    onChange={(e) => setIndustryWebsite(e.target.value)}
                    placeholder="https://company.example.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={industryPhone}
                    onChange={(e) => setIndustryPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Industry SPOC Details */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Primary Industry SPOC (Representative)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={indSpocFirstname}
                    onChange={(e) => setIndSpocFirstname(e.target.value)}
                    placeholder="e.g. Vikram"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={indSpocLastname}
                    onChange={(e) => setIndSpocLastname(e.target.value)}
                    placeholder="e.g. Mehra"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Corporate Email * (Login Identifier)
                  </label>
                  <input
                    type="email"
                    required
                    value={indSpocEmail}
                    onChange={(e) => setIndSpocEmail(e.target.value)}
                    placeholder="spoc@company.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password (Min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={indSpocPassword}
                    onChange={(e) => setIndSpocPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={indSpocDesignation}
                    onChange={(e) => setIndSpocDesignation(e.target.value)}
                    placeholder="e.g. Head of CSR & Innovation"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={indSpocPhone}
                    onChange={(e) => setIndSpocPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Registering Industry Partner...</span>
                </>
              ) : (
                'Complete Industry Registration'
              )}
            </button>
          </form>
        ) : role === 'UNIVERSITY' ? (
          /* ==================== UNIVERSITY ONBOARDING FORM ==================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: University Information */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                University Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    University / Institution Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    AISHE Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={AISHECode}
                    onChange={(e) => setAISHECode(e.target.value)}
                    placeholder="e.g. U-0123"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Campus Contact Number
                  </label>
                  <input
                    type="tel"
                    value={universityContactNo}
                    onChange={(e) => setUniversityContactNo(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    value={universityWebsiteLink}
                    onChange={(e) => setUniversityWebsiteLink(e.target.value)}
                    placeholder="https://www.university.ac.in"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={universityAddress}
                    onChange={(e) => setUniversityAddress(e.target.value)}
                    placeholder="Campus Road, City, State, PIN"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Research Departments (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={departmentsInput}
                    onChange={(e) => setDepartmentsInput(e.target.value)}
                    placeholder="Computer Science, Environment, Public Health"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: University SPOC Details */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Primary SPOC (Point of Contact)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    placeholder="e.g. Rajesh"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={universityEmail}
                    onChange={(e) => setUniversityEmail(e.target.value)}
                    placeholder="spoc@university.ac.in"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password (Min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Position / Title
                  </label>
                  <input
                    type="text"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="e.g. Dean / Professor"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={departmentSpoc}
                    onChange={(e) => setDepartmentSpoc(e.target.value)}
                    placeholder="e.g. Computer Science & Eng"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Registering University...</span>
                </>
              ) : (
                'Complete University Onboarding'
              )}
            </button>
          </form>
        ) : (
          /* ==================== CITIZEN REGISTRATION FORM ==================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Personal Information */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={citizenFullName}
                    onChange={(e) => setCitizenFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={citizenEmail}
                    onChange={(e) => setCitizenEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Password & Security */}
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200/60">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Security & Password
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={citizenPassword}
                    onChange={(e) => setCitizenPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={citizenConfirmPassword}
                    onChange={(e) => setCitizenConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-sm hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Creating Citizen Account...</span>
                </>
              ) : (
                'Create Citizen Account'
              )}
            </button>
          </form>
        )}

        {/* Existing Member Link */}
        <div className="text-center text-xs text-gray-600 mt-6 pt-4 border-t border-gray-100">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Sign In to your portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
