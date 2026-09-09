import React, { useState, useEffect } from 'react';
import { trackComplaintStatus } from '../services/doctorApi';
import CaseTimeline from './CaseTimeline';
import EvidenceLocker from './EvidenceLocker';

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Report Registered', desc: 'Case received and logged in vigilance registry.' },
  { key: 'UNDER_REVIEW', label: 'Initial Review', desc: 'Statutory compliance officers reviewing claims.' },
  { key: 'ASSIGNED', label: 'Authority Assigned', desc: 'Routed to state medical vigilance team.' },
  { key: 'INVESTIGATION', label: 'Active Investigation', desc: 'On-site verification or records audit underway.' },
  { key: 'ACTION_TAKEN', label: 'Action Taken', desc: 'Administrative or statutory notice issued.' },
  { key: 'RESOLVED', label: 'Case Concluded', desc: 'Formal inquiry completed and filed.' },
];

export default function TrackCaseView({ initialCaseId = '', onNavigateToReport }) {
  const [caseIdInput, setCaseIdInput] = useState(initialCaseId);
  const [isLoading, setIsLoading] = useState(false);
  const [caseDetails, setCaseDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('stepper'); // 'stepper' | 'timeline' | 'evidence'

  useEffect(() => {
    if (initialCaseId) {
      setCaseIdInput(initialCaseId);
      handleTrackCase(initialCaseId);
    }
  }, [initialCaseId]);

  const handleTrackCase = async (idToTrack) => {
    const targetId = (idToTrack || caseIdInput || '').trim();
    if (!targetId) return;

    setIsLoading(true);
    setErrorMessage(null);
    setCaseDetails(null);

    try {
      const data = await trackComplaintStatus(targetId);
      setCaseDetails(data);
    } catch (err) {
      setErrorMessage(err.message || `No case found matching ID: ${targetId}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndex = (statusKey) => {
    const idx = STATUS_STEPS.findIndex((s) => s.key === statusKey);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="track-case-container animate-fade-in" id="track-case-section">
      {/* Search Bar for Case ID */}
      <div className="track-search-card">
        <div className="track-search-header">
          <div className="track-search-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <h3 className="track-card-title">Track Case Inquiry Progress</h3>
            <p className="track-card-sub">
              Enter your official Health-Safe Case Reference ID to monitor investigation status and authority routing.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrackCase(caseIdInput);
          }}
          className="track-input-row"
        >
          <input
            id="case-id-input"
            type="text"
            className="track-input-field"
            placeholder="Enter Case ID (e.g. HS-MP-2026-000001)"
            value={caseIdInput}
            onChange={(e) => setCaseIdInput(e.target.value)}
            required
          />
          <button
            id="track-submit-btn"
            type="submit"
            className="track-action-btn"
            disabled={isLoading || !caseIdInput.trim()}
          >
            {isLoading ? 'Querying...' : 'Track Case'}
          </button>
        </form>

        <div className="track-quick-hint">
          <span>Demo Case: </span>
          <button
            type="button"
            className="track-hint-pill"
            onClick={() => {
              setCaseIdInput('HS-MP-2026-000001');
              handleTrackCase('HS-MP-2026-000001');
            }}
          >
            HS-MP-2026-000001
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="track-error-card animate-fade-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Case Details Display */}
      {caseDetails && (
        <div className="case-status-result-card animate-fade-in" id="case-status-result">
          <div className="case-status-header">
            <div>
              <div className="case-number-row">
                <span className="case-id-badge">{caseDetails.caseId}</span>
                <span className="case-category-pill">{caseDetails.category}</span>
              </div>
              <h2 className="case-practitioner-title">
                Subject: {caseDetails.practitionerName}
                {caseDetails.claimedRegNumber && ` (Reg: ${caseDetails.claimedRegNumber})`}
              </h2>
            </div>

            <div className="case-status-pill-large">
              <span className="status-dot"></span>
              <span>{caseDetails.status}</span>
            </div>
          </div>

          {/* Statutory Review Notice */}
          <div className="citizen-routed-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div className="banner-text">
              <strong>Your report has been routed for appropriate review.</strong>
              <p>Under statutory jurisdiction of {caseDetails.assignedAuthority?.authorityName}. Formal inquiry and factual verification are underway.</p>
            </div>
          </div>

          {caseDetails.publicNotes && caseDetails.publicNotes.length > 0 && (
            <div className="authority-public-notes-box">
              <h4 className="public-notes-heading">Notice from Review Authority:</h4>
              {caseDetails.publicNotes.map((pn, idx) => (
                <div key={idx} className="public-note-item">
                  <p className="note-text">{pn.note}</p>
                  <span className="note-meta">&bull; {pn.author} &bull; {new Date(pn.timestamp).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Section Sub-Tabs: Lifecycle Stepper | Audit Timeline | Evidence Locker */}
          <div className="case-detail-subtabs">
            <button
              type="button"
              className={`detail-tab-btn ${activeDetailTab === 'stepper' ? 'active' : ''}`}
              onClick={() => setActiveDetailTab('stepper')}
            >
              📊 Lifecycle Progression
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${activeDetailTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveDetailTab('timeline')}
            >
              🕒 Case Audit Timeline
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${activeDetailTab === 'evidence' ? 'active' : ''}`}
              onClick={() => setActiveDetailTab('evidence')}
            >
              🔒 Evidence Locker ({caseDetails.evidenceCount || 0})
            </button>
          </div>

          {/* Tab 1: Stepper */}
          {activeDetailTab === 'stepper' && (
            <div className="case-timeline-wrapper animate-fade-in">
              <h4 className="timeline-section-heading">Investigation Lifecycle Progression:</h4>
              <div className="timeline-stepper">
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = getStatusIndex(caseDetails.status);
                  const isPassed = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={step.key} className={`timeline-node ${isPassed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                      <div className="node-indicator">
                        {isPassed ? '✓' : idx + 1}
                      </div>
                      <div className="node-text-block">
                        <span className="node-title">{step.label}</span>
                        <span className="node-desc">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Audit Timeline */}
          {activeDetailTab === 'timeline' && (
            <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
              <CaseTimeline caseId={caseDetails.caseId} />
            </div>
          )}

          {/* Tab 3: Evidence Locker */}
          {activeDetailTab === 'evidence' && (
            <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
              <EvidenceLocker
                caseId={caseDetails.caseId}
                onEvidenceUpdated={() => handleTrackCase(caseDetails.caseId)}
              />
            </div>
          )}

          {/* Metadata & Authority Routing Box */}
          <div className="case-metadata-grid">
            <div className="meta-box">
              <span className="meta-label">Submitted On</span>
              <span className="meta-val">
                {new Date(caseDetails.submittedDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="meta-box">
              <span className="meta-label">Facility / Clinic</span>
              <span className="meta-val">{caseDetails.clinicName || 'Not specified'}</span>
            </div>

            <div className="meta-box">
              <span className="meta-label">Jurisdiction State</span>
              <span className="meta-val">{caseDetails.state || 'National'}</span>
            </div>

            <div className="meta-box">
              <span className="meta-label">Attached Evidence Count</span>
              <span className="meta-val">{caseDetails.evidenceCount} document(s)</span>
            </div>

            <div className="meta-box full-width highlight-authority">
              <span className="meta-label">Statutory Assigned Authority</span>
              <span className="meta-val bold">{caseDetails.assignedAuthority?.authorityName}</span>
              <p className="meta-routing-sub">{caseDetails.assignedAuthority?.routingStatus}</p>
            </div>
          </div>

          <div className="case-notice-footer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Case status is managed by statutory medical regulatory authorities. Updates are automatically synced to this record.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
