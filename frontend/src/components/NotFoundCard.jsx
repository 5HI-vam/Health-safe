import React from 'react';

export default function NotFoundCard({ searchedQuery, onOpenReportModal }) {
  const regNo = searchedQuery?.registrationNumber || '';

  return (
    <div className="not-found-card animate-fade-in" id="not-found-card">
      <div className="not-found-header">
        <div className="not-found-icon-bubble">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <div className="not-found-status-label">STATUS: REGISTRATION NOT FOUND</div>
          <h3 className="not-found-heading">
            No record found for {regNo ? `"${regNo}"` : 'searched query'}
          </h3>
          <p className="not-found-subtext">
            Our query across National Medical Commission (NMC) and State Medical Council demonstration archives returned zero matching registrations.
          </p>
        </div>
      </div>

      <div className="not-found-guidance">
        <h4 className="guidance-title">Next Steps & Recommendations:</h4>
        <ul className="guidance-list">
          <li>
            <strong>Verify Format:</strong> Check your prescription slip or certificate for spelling, prefix dashes (e.g. <code>MCI-2015-78901</code>, <code>KMC-45892</code>).
          </li>
          <li>
            <strong>Cross-Council Check:</strong> If the doctor is registered in a different state, try selecting their specific State Medical Council or searching by name.
          </li>
          <li>
            <strong>Unregistered Practice Alert:</strong> If a practitioner is actively prescribing medications or performing procedures without valid credentials, they may be operating unlawfully.
          </li>
        </ul>
      </div>

      {/* CTA: Report Suspected Unauthorized Practice */}
      <div className="report-cta-box">
        <div className="report-cta-text">
          <div className="report-cta-title">Suspect Unlicensed or Quack Practice?</div>
          <p className="report-cta-desc">
            Help safeguard public health. Submit a confidential incident report to alert authorities and assist state council verifications.
          </p>
        </div>
        <button
          id="report-unauthorized-cta-btn"
          type="button"
          className="report-trigger-btn"
          onClick={() => onOpenReportModal({ claimedRegNumber: regNo })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Report Suspected Unauthorized Practice
        </button>
      </div>
    </div>
  );
}
