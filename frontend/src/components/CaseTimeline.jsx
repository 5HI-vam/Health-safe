import React, { useState, useEffect } from 'react';
import { getCaseTimeline } from '../services/doctorApi';

export default function CaseTimeline({ caseId, authToken = null, isOfficerMode = false }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchTimeline = async () => {
    if (!caseId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getCaseTimeline(caseId, authToken);
      setEvents(data.events || []);
    } catch (err) {
      console.warn('Load timeline error:', err);
      setErrorMessage(err.message || 'Unable to load timeline events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [caseId, authToken]);

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'CASE_CREATED':
        return { label: 'Complaint Submitted', colorClass: 'badge-created', icon: '📝' };
      case 'EVIDENCE_UPLOADED':
        return { label: 'Evidence Uploaded', colorClass: 'badge-evidence', icon: '📎' };
      case 'CASE_ROUTED':
        return { label: 'Routed to Authority', colorClass: 'badge-routed', icon: '⚖' };
      case 'STATUS_CHANGED':
        return { label: 'Status Progressed', colorClass: 'badge-status', icon: '🔄' };
      case 'CASE_ASSIGNED':
        return { label: 'Officer Assigned', colorClass: 'badge-assigned', icon: '👤' };
      case 'EVIDENCE_REQUESTED':
        return { label: 'Evidence Requested', colorClass: 'badge-requested', icon: '📄' };
      case 'EVIDENCE_SUBMITTED':
        return { label: 'Evidence Submitted', colorClass: 'badge-submitted', icon: '✓' };
      case 'OFFICER_NOTE_ADDED':
        return { label: 'Investigation Note', colorClass: 'badge-note', icon: '📌' };
      case 'ACTION_RECORDED':
        return { label: 'Action Recorded', colorClass: 'badge-action', icon: '⚡' };
      case 'CASE_RESOLVED':
        return { label: 'Inquiry Concluded', colorClass: 'badge-resolved', icon: '🔒' };
      case 'CASE_REJECTED':
        return { label: 'Case Dismissed', colorClass: 'badge-rejected', icon: '✕' };
      default:
        return { label: eventType.replace(/_/g, ' '), colorClass: 'badge-default', icon: '•' };
    }
  };

  const getActorRoleLabel = (role) => {
    switch (role) {
      case 'CITIZEN':
        return 'Citizen Reporter';
      case 'AUTHORITY_OFFICER':
        return 'Statutory Officer';
      case 'ADMIN':
        return 'System Administrator';
      case 'SYSTEM':
        return 'Health-Safe Routing Engine';
      default:
        return role;
    }
  };

  return (
    <div className="case-timeline-container">
      <div className="timeline-header-row">
        <div>
          <h4 className="timeline-title">Official Case Audit Timeline</h4>
          <span className="timeline-subtitle">
            Immutable chronological record of inquiry milestones and statutory events.
          </span>
        </div>
        <button
          type="button"
          className="timeline-refresh-btn"
          onClick={fetchTimeline}
          title="Refresh audit timeline"
        >
          ↻ Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="timeline-loading-state">
          <div className="loading-spinner"></div>
          <span>Retrieving verified audit milestones...</span>
        </div>
      ) : errorMessage ? (
        <div className="timeline-error-box">⚠ {errorMessage}</div>
      ) : events.length === 0 ? (
        <div className="timeline-empty-box">
          <p>No audit events recorded for this case yet.</p>
        </div>
      ) : (
        <div className="audit-timeline-flow">
          {events.map((evt, idx) => {
            const badge = getEventBadge(evt.eventType);
            const isLast = idx === events.length - 1;

            return (
              <div
                key={evt._id || idx}
                className={`audit-timeline-node ${evt.isInternal ? 'internal-node' : ''} ${
                  isLast ? 'latest-node' : ''
                }`}
              >
                <div className="timeline-left-col">
                  <div className={`timeline-icon-dot ${badge.colorClass}`}>
                    <span>{badge.icon}</span>
                  </div>
                  {!isLast && <div className="timeline-vertical-line"></div>}
                </div>

                <div className="timeline-content-card">
                  <div className="timeline-event-header">
                    <div className="event-badge-group">
                      <span className={`event-type-chip ${badge.colorClass}`}>
                        {badge.label}
                      </span>
                      {evt.isInternal && (
                        <span className="internal-confidential-chip">
                          INTERNAL / CONFIDENTIAL
                        </span>
                      )}
                    </div>
                    <span className="event-timestamp">
                      {new Date(evt.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  <p className="event-description-text">{evt.description}</p>

                  <div className="event-footer-meta">
                    <span className="event-actor-role">
                      Actor: <strong>{getActorRoleLabel(evt.actorRole)}</strong>
                    </span>
                    {evt.metadata?.actionType && (
                      <span className="event-meta-tag">
                        Measure: {evt.metadata.actionType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
