import React from 'react';

export default function SearchResultsList({ searchData, onSelectDoctor }) {
  if (!searchData || !searchData.doctors) return null;

  const { doctors, totalCount } = searchData;

  if (doctors.length === 0) {
    return (
      <div className="search-empty-results animate-fade-in">
        <div className="empty-results-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h3>No matching doctors found</h3>
        <p>Try broadening your query, adjusting the state filter, or searching directly by registration number.</p>
      </div>
    );
  }

  return (
    <div className="search-results-container animate-fade-in">
      <div className="results-summary-header">
        <h3>Practitioner Directory Matches ({totalCount})</h3>
        <span className="results-hint">Click on any record to view full registration details</span>
      </div>

      <div className="results-grid">
        {doctors.map((doc) => {
          const isSuspended = doc.status === 'Suspended';
          return (
            <div
              key={doc._id}
              className="result-row-card"
              onClick={() => onSelectDoctor(doc)}
            >
              <div className="result-row-main">
                <div className="result-doctor-name">{doc.name}</div>
                <div className="result-reg-no">
                  Registration: <strong>{doc.registrationNumber}</strong>
                </div>
                <div className="result-meta-line">
                  <span>{doc.qualification}</span> &bull; <span>{doc.council}</span> &bull; <span>{doc.state}</span>
                </div>
              </div>

              <div className="result-row-status">
                <span className={`status-pill ${isSuspended ? 'pill-amber' : 'pill-green'}`}>
                  {isSuspended ? 'Suspended' : 'Registration Verified'}
                </span>
                <span className="view-details-arrow">&rarr;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
