import React, { useState } from 'react';

export default function Header({
  activeTab = 'manual',
  onChangeTab,
  onOpenClinicBadges,
  apiOnline = true,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    onChangeTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleBadgesClick = () => {
    if (onOpenClinicBadges) onOpenClinicBadges();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-group" onClick={() => handleNavClick('manual')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12h6" />
              <path d="M12 9v6" />
            </svg>
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-title">HEALTH-SAFE</span>
              <span className="brand-badge">VERIFICATION PORTAL</span>
            </div>
            <p className="brand-subtitle">
              Public Healthcare Credential & Registry Verification System
            </p>
          </div>
        </div>

        {/* Right side controls: Status Pill + Mobile Hamburger Button */}
        <div className="header-right-actions">
          <div className="header-status-pill">
            <span className={`status-indicator-dot ${apiOnline ? 'online' : 'offline'}`}></span>
            <span className="status-indicator-label">
              {apiOnline ? 'Registry Live API Connected' : 'Registry API Offline'}
            </span>
          </div>

          <button
            id="mobile-hamburger-btn"
            type="button"
            className="mobile-hamburger-btn"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation Tabs (Phase 1, Phase 2, and Phase 3) */}
        <nav className={`header-nav-tabs ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Close button — only visible inside the mobile panel */}
          <button
            type="button"
            className="mobile-nav-close-btn"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close
          </button>
          <hr className="mobile-nav-divider" />
          <button
            id="nav-manual-search-btn"
            type="button"
            className={`nav-tab-link ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => handleNavClick('manual')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Manual Search
          </button>

          <button
            id="nav-scan-qr-btn"
            type="button"
            className={`nav-tab-link ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => handleNavClick('qr')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Scan Clinic QR
          </button>

          <button
            id="nav-report-practice-btn"
            type="button"
            className={`nav-tab-link alert-tab ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => handleNavClick('report')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Report Practice
          </button>

          <button
            id="nav-patient-safety-btn"
            type="button"
            className={`nav-tab-link safety-tab ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => handleNavClick('safety')}
            title="Patient Safety & Clinical Care Grievance Module"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            Patient Safety
          </button>

          <button
            id="nav-track-case-btn"
            type="button"
            className={`nav-tab-link ${activeTab === 'track' ? 'active' : ''}`}
            onClick={() => handleNavClick('track')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Track Case
          </button>

          <button
            id="nav-authority-portal-btn"
            type="button"
            className={`nav-tab-link authority-tab ${activeTab === 'authority' ? 'active' : ''}`}
            onClick={() => handleNavClick('authority')}
            title="Statutory Authority Review & Case Routing Dashboard"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Authority Portal
          </button>

          <button
            id="nav-clinic-badges-btn"
            type="button"
            className="nav-tab-link highlight"
            onClick={handleBadgesClick}
            title="View printable / scannable demonstration QR badges"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Clinic Badges
          </button>
        </nav>

        {isMobileMenuOpen && (
          <div
            className="mobile-menu-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </header>
  );
}
