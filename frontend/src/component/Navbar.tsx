import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    role,
    spoc,
    university,
    industrySpoc,
    industryPartner,
    govtOfficer,
    citizen,
    logout,
  } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userName =
    citizen?.fullName ||
    spoc?.firstname ||
    industrySpoc?.firstname ||
    govtOfficer?.firstname ||
    'Account';
  const orgName =
    university?.universityName ||
    industryPartner?.name ||
    (govtOfficer ? `${govtOfficer.district} Nodal` : undefined);

  // Determine dashboard path and label based on user's role
  const getDashboardConfig = () => {
    switch (role) {
      case 'GOVT':
        return { path: '/govt', label: 'Govt Dashboard' };
      case 'UNIVERSITY':
        return { path: '/university', label: 'University Dashboard' };
      case 'CITIZEN':
        return { path: '/citizen', label: 'Citizen Portal' };
      case 'INDUSTRY':
        return { path: '/industry', label: 'Industry Dashboard' };
      default:
        return { path: '/govt', label: 'Dashboard' };
    }
  };
  const dashboard = getDashboardConfig();

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setIsLoggingOut(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="navbar-header">
      <nav className="navbar-container" aria-label="Main Navigation">
        {/* Left: Brand Logo & Name */}
        <div className="navbar-left">
          <a href="/" className="navbar-brand" aria-label="CivicResolve Home">
            <img src="/logo.png" alt="CivicResolve Logo" className="brand-logo-img" />
            <span className="brand-title">CIVICRESOLVE</span>
          </a>
        </div>

        {/* Center: Navigation Options */}
        <div className={`navbar-center ${mobileMenuOpen ? 'active' : ''}`}>
          <ul className="nav-links" role="list">
            <li>
              <a href="/home" className="nav-link active">Home</a>
            </li>
            <li>
              <a href="/issues" className="nav-link">Issues</a>
            </li>
            <li>
              <a href="/universities" className="nav-link">Universities</a>
            </li>
            <li>
              <a href="/industry" className="nav-link">Industry SPOCs</a>
            </li>
            <li>
              <a href="/govt" className="nav-link">Govt Portal</a>
            </li>
            <li>
              <a href="#docs" className="nav-link nav-link-docs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                <span>Docs</span>
              </a>
            </li>
          </ul>

          {/* Mobile Auth Actions inside mobile menu */}
          <div className="mobile-auth-actions">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline mobile-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(dashboard.path);
                  }}
                >
                  {dashboard.label}
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  className="btn btn-dark mobile-btn"
                  onClick={handleSignOut}
                >
                  {isLoggingOut ? 'Signing Out...' : `Sign Out (${userName})`}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline mobile-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="btn btn-dark mobile-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Desktop Auth Actions (Dashboard / Sign Out or Log In / Sign Up) */}
        <div className="navbar-right">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-700 hidden lg:inline">
                {userName} {orgName ? `(${orgName.slice(0, 16)}${orgName.length > 16 ? '...' : ''})` : ''}
              </span>
              <button
                type="button"
                className="btn btn-outline auth-btn-dashboard"
                onClick={() => navigate(dashboard.path)}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>{dashboard.label}</span>
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                className="btn btn-dark auth-btn-signup"
                onClick={handleSignOut}
              >
                {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost auth-btn-login"
                onClick={() => navigate('/login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn-dark auth-btn-signup"
                onClick={() => navigate('/register')}
              >
                Sign Up
              </button>
            </>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
};
