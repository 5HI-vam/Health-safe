import React, { useState, useEffect } from 'react';
import { getDashboardRelatedCases } from '../services/doctorApi';

export default function RelatedCases({ caseId, authToken, onSelectRelatedCase }) {
  const [relatedData, setRelatedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!caseId || !authToken) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    getDashboardRelatedCases(authToken, caseId)
      .then((data) => {
        if (isMounted) {
          setRelatedData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to detect potentially related cases.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [caseId, authToken]);

  if (isLoading) {
    return (
      <div className="related-cases-loading">
        <div className="loading-spinner"></div>
        <span>Analyzing credential and facility correlations across registry...</span>
      </div>
    );
  }

  if (errorMessage) {
    return <div className="related-cases-error">⚠ {errorMessage}</div>;
  }

  const cases = relatedData?.relatedCases || [];

  return (
    <div className="related-cases-container">
      <div className="related-cases-header">
        <div className="title-row">
          <span className="related-badge-icon">🔗</span>
          <h4 className="related-cases-title">Potentially Related Cases</h4>
          <span className="related-cases-count">({cases.length} correlated)</span>
        </div>
      </div>

      <div className="related-statutory-notice">
        <span className="notice-icon">⚖</span>
        <p>
          <strong>Statutory Disclaimer:</strong> These records are flagged as{' '}
          <em>"Potentially related cases"</em> using automated algorithmic matching on practitioner
          registration numbers, facility names, or geographic proximity. This preliminary correlation does
          NOT prove that a practitioner or clinic is a &ldquo;repeat offender&rdquo; or guilty of unlawful practice.
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="empty-related-cases">
          <span className="empty-icon">✓</span>
          <p>No other complaints match this practitioner&apos;s registration number, facility name, or immediate proximity.</p>
        </div>
      ) : (
        <div className="related-cards-list">
          {cases.map((rc) => (
            <div key={rc.caseId} className="related-case-card">
              <div className="related-case-top">
                <div className="case-id-group">
                  <strong className="rc-case-id">{rc.caseId}</strong>
                  <span
                    className={`correlation-strength-pill ${rc.correlationStrength.toLowerCase()}`}
                  >
                    {rc.correlationStrength === 'STRONG_CORRELATION' ? 'High Correlation' : 'Moderate Match'}
                  </span>
                </div>
                <div className="rc-meta-badges">
                  <span className={`rc-priority-badge ${rc.priority?.toLowerCase()}`}>
                    {rc.priority}
                  </span>
                  <span className="rc-status-pill">{rc.status}</span>
                </div>
              </div>

              {/* Match Reasons */}
              <div className="match-reasons-box">
                <span className="reasons-heading">Correlation Match Factors:</span>
                <ul className="reasons-list">
                  {rc.reasons?.map((reason, idx) => (
                    <li key={idx} className="reason-item">
                      <span className="reason-bullet">▸</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="related-case-summary">
                <div className="summary-col">
                  <span className="lbl">Concern:</span>
                  <span className="val">{rc.category}</span>
                </div>
                <div className="summary-col">
                  <span className="lbl">Facility:</span>
                  <span className="val">{rc.facilityName} ({rc.district}, {rc.state})</span>
                </div>
                {rc.registrationNumber && (
                  <div className="summary-col">
                    <span className="lbl">Registration:</span>
                    <span className="val code-font">{rc.registrationNumber}</span>
                  </div>
                )}
              </div>

              <div className="related-card-actions">
                <span className="rc-date">
                  Reported: {new Date(rc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {onSelectRelatedCase && (
                  <button
                    type="button"
                    className="btn-inspect-related"
                    onClick={() => onSelectRelatedCase(rc.caseId)}
                  >
                    Inspect Related Case &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
