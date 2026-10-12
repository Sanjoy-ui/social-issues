import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RoleSelector, type UserRole } from '../component/auth/RoleSelector.js';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../services/api.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [role, setRole] = useState<UserRole>('UNIVERSITY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please fill in both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      if (role === 'CITIZEN') {
        const response = await api.post('/api/v1/citizen/login', {
          email,
          password,
        });

        const { accessToken, data } = response.data;

        // Update Zustand Auth Store for Citizen
        setAuth({
          role: 'CITIZEN',
          citizen: data.citizen,
          accessToken,
        });

        navigate('/citizen');
        return;
      } else if (role === 'GOVT') {
        const response = await api.post('/api/v1/govt/login', {
          email,
          password,
        });

        const { accessToken, data } = response.data;

        // Update Zustand Auth Store for Government
        setAuth({
          role: 'GOVT',
          govtOfficer: data.officer,
          accessToken,
        });

        navigate('/govt');
      } else if (role === 'INDUSTRY') {
        const response = await api.post('/api/v1/industry/login', {
          email,
          password,
        });

        const { accessToken, data } = response.data;

        // Update Zustand Auth Store for Industry
        setAuth({
          role: 'INDUSTRY',
          industrySpoc: data.spoc,
          industryPartner: data.partner,
          accessToken,
        });

        navigate('/');
      } else {
        const response = await api.post('/api/v1/university/login', {
          universityEmail: email,
          password,
        });

        const { accessToken, data } = response.data;

        // Update Zustand Auth Store for University
        setAuth({
          role: 'UNIVERSITY',
          spoc: data.spoc,
          university: data.university,
          accessToken,
        });

        navigate('/university');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Unable to sign in. Please verify your credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200/80 shadow-xl rounded-2xl p-6 sm:p-8">
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
          <h1 className="text-xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-xs text-gray-500 mt-1">
            Sign in to access your grievance resolution portal
          </p>
        </div>

        {/* Role Selector */}
        <RoleSelector selectedRole={role} onChange={setRole} />

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {role === 'UNIVERSITY'
                ? 'Institutional Email'
                : role === 'INDUSTRY'
                ? 'Corporate Email'
                : role === 'GOVT'
                ? 'Official Government Email'
                : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                role === 'GOVT'
                  ? 'officer@tripura.gov.in'
                  : role === 'INDUSTRY'
                  ? 'spoc@company.com'
                  : role === 'UNIVERSITY'
                  ? 'name@organization.ac.in'
                  : 'name@example.com'
              }
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              Remember me
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Password reset instructions will be sent to your administrator.');
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center text-xs text-gray-600 mt-6 pt-4 border-t border-gray-100">
          Not registered yet?{' '}
          <Link
            to="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Register / Onboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
