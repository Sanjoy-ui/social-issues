import React from 'react';
import { Navbar } from '../component/Navbar.js';
import { HeroSection } from '../component/HeroSection.js';

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-page-wrapper">
      <Navbar />
      <main id="main-content">
        <HeroSection />
      </main>
    </div>
  );
};

export default LandingPage;
