import React, { useState } from 'react';

const trackCases = {
  "MP-BPL-2026-00124": {category:"Suspected unregistered practitioner", location:"Bhopal", stage:2},
  "MP-IND-2026-00087": {category:"Suspicious clinic", location:"Indore", stage:4}
};

export default function TrackCaseView({ initialCaseId = '' }) {
  const [inputValue, setInputValue] = useState(initialCaseId);
  const [trackedCase, setTrackedCase] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedId, setSearchedId] = useState('');

  // When initialCaseId changes via prop, automatically search it
  React.useEffect(() => {
    if (initialCaseId) {
      setInputValue(initialCaseId);
      handleTrack(initialCaseId);
    }
  }, [initialCaseId]);

  const handleTrack = (idToSearch = inputValue) => {
    const val = idToSearch.trim();
    if (!val) return;
    setSearchedId(val);
    setHasSearched(true);
    setTrackedCase(trackCases[val] || null);
  };

  const handleSampleClick = (id) => {
    setInputValue(id);
    handleTrack(id);
  };

  const renderResult = () => {
    if (!hasSearched) return null;

    if (!trackedCase) {
      return (
        <div className="result-card">
          <p className="result-empty">No case found for <span className="mono">{searchedId}</span>. Check the ID and try again.</p>
        </div>
      );
    }

    const stages = [
      {title:'Report submitted', meta:'Evidence and location captured'},
      {title:'Evidence verified', meta:'Cross-checked against registry data'},
      {title:'Authority assigned', meta:'Routed to ' + authorityFor(trackedCase.category)},
      {title:'Under investigation', meta:'Authority reviewing the case'},
      {title:'Closed', meta:'Outcome recorded and reporter notified'}
    ];

    return (
      <div className="result-card">
        <div className="result-top">
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: 'var(--navy)' }}>{searchedId}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-faint)', marginTop: 4 }}>{trackedCase.category} — {trackedCase.location}</div>
          </div>
        </div>
        <div className="timeline">
          {stages.map((s, i) => {
            const idx = i + 1;
            let dotClass = idx < trackedCase.stage ? 'done' : (idx === trackedCase.stage ? 'current' : 'pending');
            return (
              <div className="tl-item" key={i}>
                <div className="tl-line"></div>
                <div className={`tl-dot ${dotClass}`}></div>
                <div className="tl-content">
                  <div className={`tl-title ${dotClass === 'pending' ? 'pending' : ''}`}>{s.title}</div>
                  <div className="tl-meta">{s.meta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="view active animate-fade-in">
      <div className="page-head">
        <div className="eyebrow">Track case</div>
        <h1>Check a case status</h1>
        <p>Enter the case ID you received after filing a report to see its current status.</p>
      </div>

      <div className="search-panel">
        <div className="search-row">
          <input 
            type="text" 
            placeholder="Enter case ID (e.g. MP-BPL-2026-00124)" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
          />
          <button className="btn btn-primary" onClick={() => handleTrack()}>Track case</button>
        </div>
        <div className="samples">
          <button className="sample-chip chip-suspended" onClick={() => handleSampleClick('MP-BPL-2026-00124')}>MP-BPL-2026-00124</button>
          <button className="sample-chip chip-active" onClick={() => handleSampleClick('MP-IND-2026-00087')}>MP-IND-2026-00087</button>
        </div>
      </div>

      {renderResult()}
    </section>
  );
}

function authorityFor(category){
  const c = category.toLowerCase();
  if(c.startsWith('other')) return 'District Health Authority (forwarded as submitted)';
  if(c.includes('clinic') || c.includes('facility')) return 'District Health Authority';
  return 'State Medical Council';
}
