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

interface AuthState {
  role: UserRole | null;
  spoc: SpocUser | null;
  university: UniversityData | null;
  industrySpoc: IndustrySpocUser | null;
  industryPartner: IndustryPartnerData | null;
  govtOfficer: GovtOfficerUser | null;
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
    accessToken: string;
  }) => void;
  setAccessToken: (token: string) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: null,
  spoc: null,
  university: null,
  industrySpoc: null,
  industryPartner: null,
  govtOfficer: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: ({
    role = 'UNIVERSITY',
    spoc = null,
    university = null,
    industrySpoc = null,
    industryPartner = null,
    govtOfficer = null,
    accessToken,
  }) => {
    localStorage.setItem('civic_user_role', role);
    set({
      role,
      spoc,
      university,
      industrySpoc,
      industryPartner,
      govtOfficer,
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
      if (currentRole === 'GOVT') {
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
      set({
        role: null,
        spoc: null,
        university: null,
        industrySpoc: null,
        industryPartner: null,
        govtOfficer: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const storedRole = (localStorage.getItem('civic_user_role') as UserRole) || 'UNIVERSITY';

    try {
      if (storedRole === 'GOVT') {
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
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },
}));
