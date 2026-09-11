import React, { useState } from 'react';

export default function Header({
  activeTab = 'home',
  onChangeTab,
  apiOnline = true,
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleTabClick = (tabId) => {
    onChangeTab(tabId);
    setIsMobileNavOpen(false);
  };

  return (
    <header>
      <div className="header-inner">
        <div className="brand" onClick={() => handleTabClick('home')} style={{ cursor: 'pointer' }}>
          <div className="brand-mark">H</div>
          <div className="brand-text">
            <span className="name">Health-Safe</span>
            <span className="tag">Verification &amp; reporting portal</span>
          </div>
        </div>
        <nav>
          <div className="nav-group">
            <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabClick('home')}>Home</button>
            <button className={`nav-btn ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => handleTabClick('verify')}>Verify</button>
            <button className={`nav-btn report ${activeTab === 'report' ? 'active' : ''}`} onClick={() => handleTabClick('report')}>Report</button>
            <button className={`nav-btn ${activeTab === 'track' ? 'active' : ''}`} onClick={() => handleTabClick('track')}>Track case</button>
            <button className={`nav-btn ${activeTab === 'safety' ? 'active' : ''}`} onClick={() => handleTabClick('safety')}>Safety tips</button>
          </div>
          <div className="nav-divider"></div>
          <div className="nav-group">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabClick('dashboard')}>Authority portal</button>
            <button className={`nav-btn ${activeTab === 'badge' ? 'active' : ''}`} onClick={() => handleTabClick('badge')}>Get verified badge</button>
          </div>
        </nav>
        <div className="status-pill">
          <span className="dot" style={{ backgroundColor: apiOnline ? '#5DCAA5' : '#8C2A26' }}></span>
          {apiOnline ? 'Registry database synced — demo dataset' : 'Registry API Offline'}
        </div>
        <button className="menu-btn" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="20" y2="17"/>
          </svg>
        </button>
      </div>
      <div className={`mobile-nav ${isMobileNavOpen ? 'open' : ''}`}>
        <button onClick={() => handleTabClick('home')}>Home</button>
        <button onClick={() => handleTabClick('verify')}>Verify</button>
        <button onClick={() => handleTabClick('report')}>Report</button>
        <button onClick={() => handleTabClick('track')}>Track case</button>
        <button onClick={() => handleTabClick('safety')}>Safety tips</button>
        <button onClick={() => handleTabClick('dashboard')}>Authority portal</button>
        <button onClick={() => handleTabClick('badge')}>Get verified badge</button>
      </div>
    </header>
  );
}
