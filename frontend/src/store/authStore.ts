import { create } from 'zustand';
import { api } from '../services/api.js';

export type UserRole = 'UNIVERSITY' | 'INDUSTRY' | 'GOVT' | 'CITIZEN';

export interface SpocUser {
  spocID: string;
  universityID: string;
  firstname: string;
  lastname: string;
  universityEmail: string;
  positionTitle?: string;
  departmentSpoc?: string;
}

export interface UniversityData {
  universityID: string;
  universityName: string;
  universityAddress?: string;
  universityContactNo?: string;
  universityWebsiteLink?: string;
  isUniversityActive?: boolean;
  isUniversityVerified?: boolean;
  AISHECode: string;
  universityResearchDepartments?: string[];
}

export interface IndustrySpocUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  designation?: string;
  phone?: string;
}

export interface IndustryPartnerData {
  id: string;
  name: string;
  type: string;
  sectorTags: string[];
  contributionTypes: string[];
  operatingDistricts?: string[];
  location?: string;
  contactDetails?: {
    website?: string;
    phone?: string;
    officialEmail?: string;
    registrationNumber?: string;
  };
  isActive?: boolean;
}

export interface GovtOfficerUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  state: string;
  district: string;
  department: string;
  designation: string;
  officeId?: string;
  contactNo?: string;
}

export interface CitizenUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  state?: string | null;
  district?: string | null;
  pincode?: string | null;
  isEmailVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  role: UserRole | null;
  spoc: SpocUser | null;
  university: UniversityData | null;
  industrySpoc: IndustrySpocUser | null;
  industryPartner: IndustryPartnerData | null;
  govtOfficer: GovtOfficerUser | null;
  citizen: CitizenUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (data: {
    role?: UserRole;
    spoc?: SpocUser | null;
    university?: UniversityData | null;
    industrySpoc?: IndustrySpocUser | null;
    industryPartner?: IndustryPartnerData | null;
    govtOfficer?: GovtOfficerUser | null;
    citizen?: CitizenUser | null;
    accessToken: string;
  }) => void;
  setAccessToken: (token: string) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  fetchCitizenProfile: () => Promise<CitizenUser | null>;
}

const getInitialCitizen = (): CitizenUser | null => {
  try {
    const raw = localStorage.getItem('civic_citizen');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  role: (typeof window !== 'undefined' ? (localStorage.getItem('civic_user_role') as UserRole) : null) || null,
  spoc: null,
  university: null,
  industrySpoc: null,
  industryPartner: null,
  govtOfficer: null,
  citizen: typeof window !== 'undefined' ? getInitialCitizen() : null,
  accessToken: null,
  isAuthenticated: typeof window !== 'undefined' ? Boolean(localStorage.getItem('civic_user_role')) : false,
  isLoading: false,
  error: null,

  setAuth: ({
    role = 'UNIVERSITY',
    spoc = null,
    university = null,
    industrySpoc = null,
    industryPartner = null,
    govtOfficer = null,
    citizen = null,
    accessToken,
  }) => {
    localStorage.setItem('civic_user_role', role);
    if (citizen) {
      localStorage.setItem('civic_citizen', JSON.stringify(citizen));
    }
    set({
      role,
      spoc,
      university,
      industrySpoc,
      industryPartner,
      govtOfficer,
      citizen,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setError: (error) => set({ error }),

  logout: async () => {
    try {
      const currentRole = get().role || (localStorage.getItem('civic_user_role') as UserRole);
      if (currentRole === 'CITIZEN') {
        await api.post('/api/v1/citizen/logout');
      } else if (currentRole === 'GOVT') {
        await api.post('/api/v1/govt/logout');
      } else if (currentRole === 'INDUSTRY') {
        await api.post('/api/v1/industry/logout');
      } else {
        await api.post('/api/v1/university/logout');
      }
    } catch (err) {
      console.warn('Logout API failed, clearing local auth state', err);
    } finally {
      localStorage.removeItem('civic_user_role');
      localStorage.removeItem('civic_citizen');
      set({
        role: null,
        spoc: null,
        university: null,
        industrySpoc: null,
        industryPartner: null,
        govtOfficer: null,
        citizen: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  fetchCitizenProfile: async () => {
    try {
      const res = await api.get('/api/v1/citizen/me');
      if (res.data?.data?.citizen) {
        const citizen = res.data.data.citizen;
        localStorage.setItem('civic_citizen', JSON.stringify(citizen));
        localStorage.setItem('civic_user_role', 'CITIZEN');
        set({ citizen, role: 'CITIZEN', isAuthenticated: true });
        return citizen;
      }
    } catch {
      await get().checkAuth();
      return get().citizen;
    }
    return null;
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const storedRole = (localStorage.getItem('civic_user_role') as UserRole) || 'UNIVERSITY';

    try {
      if (storedRole === 'CITIZEN') {
        const refreshRes = await api.post('/api/v1/citizen/refresh');
        const newAccessToken = refreshRes.data.accessToken;
        let citizen = refreshRes.data.data?.citizen;

        if (newAccessToken) {
          set({ accessToken: newAccessToken });

          if (!citizen) {
            try {
              const profileRes = await api.get('/api/v1/citizen/me', {
                headers: { Authorization: `Bearer ${newAccessToken}` },
              });
              citizen = profileRes.data.data?.citizen;
            } catch (err) {
              console.warn('Citizen profile query fallback error:', err);
            }
          }

          if (citizen) {
            localStorage.setItem('civic_citizen', JSON.stringify(citizen));
            localStorage.setItem('civic_user_role', 'CITIZEN');
          }

          set({
            role: 'CITIZEN',
            citizen: citizen || getInitialCitizen(),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
      } else if (storedRole === 'GOVT') {
        const refreshRes = await api.post('/api/v1/govt/refresh');
        const newAccessToken = refreshRes.data.accessToken;

        if (newAccessToken) {
          set({ accessToken: newAccessToken });

          const profileRes = await api.get('/api/v1/govt/me', {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });

          set({
            role: 'GOVT',
            govtOfficer: profileRes.data.data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
      } else if (storedRole === 'INDUSTRY') {
        const refreshRes = await api.post('/api/v1/industry/refresh');
        const newAccessToken = refreshRes.data.accessToken;

        if (newAccessToken) {
          set({ accessToken: newAccessToken });

          const profileRes = await api.get('/api/v1/industry/me', {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });

          set({
            role: 'INDUSTRY',
            industrySpoc: profileRes.data.data.spoc,
            industryPartner: profileRes.data.data.partner,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
      } else {
        const refreshRes = await api.post('/api/v1/university/refresh');
        const newAccessToken = refreshRes.data.accessToken;

        if (newAccessToken) {
          set({ accessToken: newAccessToken });

          const profileRes = await api.get('/api/v1/university/me', {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });

          set({
            role: 'UNIVERSITY',
            spoc: profileRes.data.data.spoc,
            university: profileRes.data.data.university,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
      }

      set({ isLoading: false, isAuthenticated: false });
      return false;
    } catch {
      set({
        role: null,
        spoc: null,
        university: null,
        industrySpoc: null,
        industryPartner: null,
        govtOfficer: null,
        citizen: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },
}));
