import React from 'react';

export default function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner">
      <div className="disclaimer-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="disclaimer-content">
        <strong>Official Advisory on Verification Standards:</strong>{' '}
        Registration verification confirms the existence of an authorized credential record within medical council registry archives.
        It does <em>not</em> constitute an evaluation, endorsement, or rating of clinical competency, treatment safety, or medical quality.
      </div>
    </div>
  );
}
