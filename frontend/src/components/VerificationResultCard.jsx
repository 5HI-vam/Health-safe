import React from 'react';

export default function VerificationResultCard({ result }) {
  if (!result || !result.doctor) return null;

  const { doctor, status, source, lastVerifiedAt, disclaimer } = result;
  const isSuspended = doctor.status === 'Suspended';
  const isVerified = status === 'Registration Verified';

  const formattedDate = lastVerifiedAt
    ? new Date(lastVerifiedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently Synchronized';

  return (
    <div className="verification-card animate-fade-in" id="verification-result-card">
      {/* Top Status Header */}
      <div className={`verification-card-header ${isVerified ? 'verified' : 'caution'}`}>
        <div className="status-badge-container">
          <div className="status-icon">
            {isVerified ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div>
            <div className="status-title-text">{status}</div>
            <div className="status-subtitle-text">
              {isVerified
                ? 'Official registration record confirmed in state medical council archive.'
                : 'Registration record located, but registration status requires cautionary attention.'}
            </div>
          </div>
        </div>

        <div className={`status-pill ${isVerified ? 'pill-green' : 'pill-amber'}`}>
          {doctor.status || 'Active'}
        </div>
      </div>

      {/* Practitioner Detail Fields */}
      <div className="verification-card-body">
        <div className="practitioner-main-info">
          <h2 className="doctor-display-name">{doctor.name}</h2>
          <div className="doctor-specialty-line">
            {doctor.specialty && <span className="specialty-badge">{doctor.specialty}</span>}
            <span className="reg-id-highlight">
              Reg No: <strong>{doctor.registrationNumber}</strong>
            </span>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">Recognized Qualification</span>
            <span className="detail-value">{doctor.qualification || 'MBBS'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Registration Council</span>
            <span className="detail-value">{doctor.council}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">State Jurisdiction</span>
            <span className="detail-value">{doctor.state}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Registration Year</span>
            <span className="detail-value">{doctor.registrationYear || 'N/A'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Archive Data Source</span>
            <span className="detail-value source-text">{source || 'State Medical Council Registry Archive'}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Last Synchronized</span>
            <span className="detail-value">{formattedDate}</span>
          </div>
        </div>

        {/* Suspended Alert Warning */}
        {isSuspended && (
          <div className="status-warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <strong>Advisory:</strong> This registration record is marked as <strong>SUSPENDED</strong> by the medical council. The practitioner is not authorized to practice clinical medicine during suspension.
            </div>
          </div>
        )}

        {/* Legal Disclaimer Box */}
        <div className="verification-legal-disclaimer">
          <div className="disclaimer-mini-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>REGISTRATION VERIFICATION SCOPE</span>
          </div>
          <p className="disclaimer-mini-body">
            {disclaimer ||
              'Verification indicates only that an official registration record exists in the medical council archive. It is not an endorsement of clinical competence, quality, or patient safety ratings.'}
          </p>
        </div>
      </div>
    </div>
  );
}
