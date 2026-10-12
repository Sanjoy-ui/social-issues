import React from 'react';
import landingRightImg from '../assets/landing-right-img.png';
import './HeroSection.css';
import { useNavigate } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="hero-container">
        {/* Left Column: Semantic Content */}
        <article className="hero-content">
          <div className="hero-badge">
            
            <span className="badge-text">Public Grievance & Civic Resolution Platform</span>
          </div>

          <h1 id="hero-heading" className="hero-title">
            Empowering Communities to Resolve Social Issues Together.
          </h1>

          <p className="hero-description">
            CivicResolve is an open and collaborative platform connecting citizens,
            academic universities, corporate CSR partners, and government nodal authorities.
            Report grievances, monitor live verification, and drive measurable social impact.
          </p>

          <div className="hero-actions">
            <button type="button" className="btn btn-primary hero-btn" onClick={() => {
              navigate("/login")
            }}>
              Get Started
            </button>
            <button type="button" className="btn btn-dark hero-btn" onClick={() => {}}>
              Explore Issues
            </button>
          </div>

          {/* Highlights / Trust Indicators */}
          <div className="hero-highlights">
            <div className="highlight-item">
              <span className="highlight-value">100%</span>
              <span className="highlight-label">Transparent Tracking</span>
            </div>
            <div className="highlight-divider" aria-hidden="true"></div>
            <div className="highlight-item">
              <span className="highlight-value">Nodal</span>
              <span className="highlight-label">Govt Verification</span>
            </div>
            <div className="highlight-divider" aria-hidden="true"></div>
            <div className="highlight-item">
              <span className="highlight-value">Multi-SPOC</span>
              <span className="highlight-label">University & CSR</span>
            </div>
          </div>
        </article>

        {/* Right Column: Semantic Visual Artwork */}
        <figure className="hero-visual">
          <div className="visual-wrapper">
            <img
              src={landingRightImg}
              alt="CivicResolve geometric mosaic illustration representing collaboration between citizens, universities, and authorities"
              className="hero-image"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </figure>
      </div>
    </section>
  );
};
