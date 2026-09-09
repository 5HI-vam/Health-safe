import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const SAMPLE_BADGES = [
  {
    id: 'mci-active',
    name: 'Dr. Rajesh Sharma',
    regNo: 'MCI-2015-78901',
    council: 'National Medical Commission',
    status: 'Active (Expected: VERIFIED)',
    payload: {
      type: 'HEALTH_SAFE_DOCTOR',
      registrationNumber: 'MCI-2015-78901',
    },
  },
  {
    id: 'kmc-active',
    name: 'Dr. Priya Venkatesh',
    regNo: 'KMC-45892',
    council: 'Karnataka Medical Council',
    status: 'Active (Expected: VERIFIED)',
    payload: {
      type: 'HEALTH_SAFE_DOCTOR',
      registrationNumber: 'KMC-45892',
    },
  },
  {
    id: 'mci-suspended',
    name: 'Dr. Arvind Mehra',
    regNo: 'MCI-2012-44102',
    council: 'National Medical Commission',
    status: 'Suspended (Expected: UNABLE_TO_VERIFY)',
    payload: {
      type: 'HEALTH_SAFE_DOCTOR',
      registrationNumber: 'MCI-2012-44102',
    },
  },
  {
    id: 'unknown-doctor',
    name: 'Unregistered Clinic Display',
    regNo: 'UNKNOWN-99999',
    council: 'Claimed Delhi Council',
    status: 'Unregistered (Expected: NOT_FOUND)',
    payload: {
      type: 'HEALTH_SAFE_DOCTOR',
      registrationNumber: 'UNKNOWN-99999',
    },
  },
  {
    id: 'invalid-signature',
    name: 'Counterfeit / Third-Party QR',
    regNo: 'N/A',
    council: 'N/A',
    status: 'Invalid Signature (Expected: Invalid Health-Safe QR)',
    payload: {
      type: 'EXTERNAL_URL',
      url: 'https://malicious-counterfeit-medical.example.com/qr',
    },
  },
];

export default function ClinicQRModal({ isOpen, onClose, onSimulateScan }) {
  const [selectedBadge, setSelectedBadge] = useState(SAMPLE_BADGES[0]);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!selectedBadge) return;
    const textToEncode = JSON.stringify(selectedBadge.payload);
    QRCode.toDataURL(textToEncode, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [selectedBadge]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="modal-card qr-badge-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="qr-modal-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <div>
              <h3 id="qr-modal-title" className="modal-title">
                Doctor & Clinic Verification QR Badges
              </h3>
              <p className="modal-subtitle">
                Official demonstration QR badges displayed in licensed clinics for patient scanning.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="qr-modal-body">
          {/* Badge Selector Tabs */}
          <div className="badge-selector-chips">
            {SAMPLE_BADGES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`badge-chip ${selectedBadge.id === b.id ? 'active' : ''}`}
                onClick={() => setSelectedBadge(b)}
              >
                {b.name}
              </button>
            ))}
          </div>

          <div className="qr-display-container">
            <div className="qr-badge-physical-card">
              <div className="badge-card-header">
                <div className="badge-shield-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div className="badge-card-brand">HEALTH-SAFE VERIFIED QR</div>
                  <div className="badge-card-sub">OFFICIAL CLINICAL CREDENTIAL</div>
                </div>
              </div>

              <div className="qr-image-frame">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Clinic QR Code" className="qr-image-element" />
                ) : (
                  <div className="qr-loading-placeholder">Generating QR...</div>
                )}
              </div>

              <div className="badge-card-footer">
                <div className="badge-doctor-title">{selectedBadge.name}</div>
                <div className="badge-reg-pill">Reg No: {selectedBadge.regNo}</div>
                <div className="badge-council-text">{selectedBadge.council}</div>
              </div>
            </div>

            <div className="qr-badge-instructions">
              <h4>How to verify this QR:</h4>
              <ol className="qr-instruct-steps">
                <li>
                  Open the <strong>"Scan Clinic QR"</strong> tab on this device or scan with a smartphone camera.
                </li>
                <li>
                  Point your webcam directly at this QR code on screen.
                </li>
                <li>
                  The scanner will decode the secure identifier and verify against MongoDB archives.
                </li>
              </ol>

              <div className="badge-status-box">
                <span className="badge-status-label">Test Case Profile:</span>
                <span className="badge-status-val">{selectedBadge.status}</span>
              </div>

              <div className="payload-inspect-box">
                <span className="payload-label">Encoded QR Payload (Safe ID Only):</span>
                <pre className="payload-code">{JSON.stringify(selectedBadge.payload, null, 2)}</pre>
              </div>

              {onSimulateScan && (
                <button
                  type="button"
                  className="quick-feed-btn"
                  onClick={() => {
                    onSimulateScan(JSON.stringify(selectedBadge.payload));
                    onClose();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                  Scan This Badge in Scanner
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
