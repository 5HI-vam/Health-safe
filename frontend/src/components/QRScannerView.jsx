import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyDoctorByQR, parseDoctorQRPayload } from '../services/doctorApi';

export default function QRScannerView({ onOpenReportModal, onOpenClinicBadges, externalScannedPayload }) {
  // Scanner Lifecycle States: 'idle' | 'starting' | 'scanning' | 'verifying' | 'verified' | 'not_found' | 'invalid_qr' | 'error'
  const [scannerState, setScannerState] = useState('idle');
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Result States
  const [invalidQRDetails, setInvalidQRDetails] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [lastScannedRegNo, setLastScannedRegNo] = useState('');

  const html5QrCodeRef = useRef(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef(null);

  // External simulated scan trigger (e.g. from Clinic Badges modal)
  useEffect(() => {
    if (externalScannedPayload) {
      handleDecodedText(externalScannedPayload);
    }
  }, [externalScannedPayload]);

  useEffect(() => {
    isMountedRef.current = true;
    startCameraScanner();

    return () => {
      isMountedRef.current = false;
      stopCameraScanner();
    };
  }, [selectedCameraId]);

  // Start HTML5 QR Camera scanner
  const startCameraScanner = async () => {
    try {
      setScannerState('starting');
      setErrorMessage(null);

      // Clean up previous instance if running
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore if already stopped
        }
      }

      const qrRegionId = 'health-safe-qr-viewport';
      const scanner = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = scanner;

      // Enumerate available video inputs
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        setCameraPermission('granted');

        const cameraId = selectedCameraId || devices[0].id;
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          cameraId,
          config,
          (decodedText) => {
            handleDecodedText(decodedText);
          },
          (scanError) => {
            // Non-critical frame decode failures are ignored
          }
        );

        if (isMountedRef.current) {
          setScannerState('scanning');
        }
      } else {
        setCameraPermission('denied');
        setScannerState('error');
        setErrorMessage('No active video camera detected on your system. You can scan a saved QR image file below.');
      }
    } catch (err) {
      console.warn('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || String(err).includes('Permission')) {
        setCameraPermission('denied');
        setErrorMessage('Camera access was denied. Please grant camera permissions to scan clinic badges.');
      } else {
        setErrorMessage(err.message || 'Unable to access device camera.');
      }
      setScannerState('error');
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
  };

  // Main QR Decoder & Verification Workflow
  const handleDecodedText = async (decodedText) => {
    // 1. Pause video scanning while verifying
    await stopCameraScanner();

    // 2. Validate payload format (Zero-trust on QR contents)
    const parsed = parseDoctorQRPayload(decodedText);

    if (!parsed.isValid) {
      setScannerState('invalid_qr');
      setInvalidQRDetails({
        error: parsed.error,
        reason: parsed.reason,
        rawPayload: parsed.rawPayload,
      });
      return;
    }

    // 3. Extract identifier and dispatch verification to backend
    const regNo = parsed.registrationNumber;
    setLastScannedRegNo(regNo);
    setScannerState('verifying');

    try {
      const response = await verifyDoctorByQR(regNo);

      if (response.verificationStatus === 'VERIFIED' && response.doctor) {
        setVerificationResult(response);
        setScannerState('verified');
      } else if (response.verificationStatus === 'NOT_FOUND') {
        setVerificationResult(response);
        setScannerState('not_found');
      } else {
        // UNABLE_TO_VERIFY (e.g. suspended, lapsed, or malformed)
        setVerificationResult(response);
        setScannerState('unable_to_verify');
      }
    } catch (err) {
      console.error('QR backend verification error:', err);
      setScannerState('not_found');
      setVerificationResult({
        verificationStatus: 'NOT_FOUND',
        message: 'Registration could not be verified',
        guidance: err.message || 'An error occurred while cross-referencing credentials with the medical council registry.',
      });
    }
  };

  // Handle image file scan fallback
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerState('verifying');
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('health-safe-qr-viewport');
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      handleDecodedText(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setScannerState('invalid_qr');
      setInvalidQRDetails({
        error: 'Invalid Health-Safe QR',
        reason: 'No legible QR code found in the selected image file.',
        rawPayload: file.name,
      });
    }
  };

  const handleRetryScan = () => {
    setVerificationResult(null);
    setInvalidQRDetails(null);
    setErrorMessage(null);
    startCameraScanner();
  };

  return (
    <div className="qr-scanner-page animate-fade-in" id="qr-scanner-section">
      {/* Top Controls Bar */}
      <div className="scanner-control-bar">
        <div className="scanner-status-indicator">
          <span className={`status-radar-dot ${scannerState === 'scanning' ? 'live' : 'idle'}`}></span>
          <span className="scanner-status-text">
            {scannerState === 'scanning' && 'Live Camera Scanning Active'}
            {scannerState === 'starting' && 'Requesting Camera Access...'}
            {scannerState === 'verifying' && 'Authenticating Identifier with Registry...'}
            {scannerState === 'verified' && 'Verification Complete'}
            {scannerState === 'not_found' && 'Registration Could Not Be Verified'}
            {scannerState === 'invalid_qr' && 'Invalid QR Signature'}
            {scannerState === 'error' && 'Camera Standby'}
          </span>
        </div>

        <div className="scanner-actions-group">
          {cameras.length > 1 && (
            <button
              type="button"
              className="scanner-pill-btn"
              onClick={() => {
                const nextCam = cameras.find((c) => c.id !== selectedCameraId) || cameras[0];
                setSelectedCameraId(nextCam.id);
              }}
              title="Switch camera device"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Switch Camera
            </button>
          )}

          <button
            type="button"
            className="scanner-pill-btn accent"
            onClick={onOpenClinicBadges}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Show Sample Badges
          </button>
        </div>
      </div>

      {/* Main Viewport & State Container */}
      <div className="scanner-viewport-container">
        {/* Real Video Scanner Viewport */}
        <div
          id="health-safe-qr-viewport"
          className={`scanner-video-box ${scannerState === 'scanning' ? 'active' : 'hidden'}`}
        ></div>

        {/* Animated Reticle Overlay (Active during scanning) */}
        {scannerState === 'scanning' && (
          <div className="scanner-reticle-overlay">
            <div className="scanner-viewfinder-frame">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
              <div className="laser-scanning-line"></div>
            </div>
            <p className="scanner-prompt-text">
              Align clinic Health-Safe QR code inside the target frame
            </p>
          </div>
        )}

        {/* State: Starting / Requesting Permission */}
        {scannerState === 'starting' && (
          <div className="scanner-state-placeholder animate-fade-in">
            <div className="radar-spinner"></div>
            <h3>Connecting to Camera Feed</h3>
            <p>Please click "Allow" if prompted by your browser to enable live QR scanning.</p>
          </div>
        )}

        {/* State: Verifying against Backend */}
        {scannerState === 'verifying' && (
          <div className="scanner-state-placeholder verifying animate-fade-in">
            <div className="verification-pulse-orb">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Verifying Identifier with Medical Registry</h3>
            <p className="scanner-subtext">
              Contacting Health-Safe Express API & MongoDB archive for registration:
            </p>
            <div className="reg-code-bubble">
              <code>{lastScannedRegNo}</code>
            </div>
          </div>
        )}

        {/* State: Verified */}
        {scannerState === 'verified' && verificationResult?.doctor && (
          <div className="scanner-result-card verified animate-fade-in" id="qr-verified-card">
            <div className="result-card-banner verified">
              <div className="result-shield-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div>
                <div className="result-status-title">STATUS: VERIFIED</div>
                <p className="result-status-sub">
                  Official practitioner registration authenticated against medical council records.
                </p>
              </div>
            </div>

            <div className="result-card-details">
              <h2 className="doctor-qr-name">{verificationResult.doctor.name}</h2>
              <div className="doctor-qr-reg">
                Registration No: <strong>{verificationResult.doctor.registrationNumber}</strong>
              </div>

              <div className="details-grid-compact">
                <div className="detail-pill-box">
                  <span className="lbl">Qualification</span>
                  <span className="val">{verificationResult.doctor.qualification}</span>
                </div>
                <div className="detail-pill-box">
                  <span className="lbl">Medical Council</span>
                  <span className="val">{verificationResult.doctor.council}</span>
                </div>
                <div className="detail-pill-box">
                  <span className="lbl">State</span>
                  <span className="val">{verificationResult.doctor.state}</span>
                </div>
                <div className="detail-pill-box">
                  <span className="lbl">Registration Year</span>
                  <span className="val">{verificationResult.doctor.registrationYear || 'N/A'}</span>
                </div>
              </div>

              <div className="verification-audit-meta">
                <span>Data Source: <strong>{verificationResult.source}</strong></span>
                <span>Verified At: <strong>{new Date(verificationResult.verifiedAt).toLocaleTimeString()}</strong></span>
              </div>

              <div className="qr-scope-disclaimer">
                <strong>Standard Statutory Advisory:</strong> Verification confirms the existence of an authorized credential record in the registry. It does not rate or endorse clinical competence.
              </div>

              <div className="result-footer-actions">
                <button
                  id="scan-another-qr-btn"
                  type="button"
                  className="primary-scanner-btn"
                  onClick={handleRetryScan}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Scan Another QR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Registration could not be verified (NOT_FOUND) */}
        {scannerState === 'not_found' && (
          <div className="scanner-result-card not-found animate-fade-in" id="qr-not-found-card">
            <div className="result-card-banner not-found">
              <div className="result-alert-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <div className="result-status-title red">Registration could not be verified</div>
                <p className="result-status-sub">
                  No active medical registration was found matching the scanned QR code identifier.
                </p>
              </div>
            </div>

            <div className="result-card-details">
              <div className="unverified-id-banner">
                Scanned Identifier: <strong>{lastScannedRegNo || 'UNKNOWN'}</strong>
              </div>

              <p className="unverified-explanation">
                The displayed QR code references a practitioner number that does not exist in our authoritative State Medical Council (SMC) or National Medical Commission (NMC) archive records.
              </p>

              <div className="report-cta-box-embedded">
                <div className="embedded-text">
                  <strong>Suspect Unauthorized Practice?</strong>
                  <p>Protect patient safety by reporting clinics operating with unregistered credentials.</p>
                </div>
                <button
                  id="qr-report-cta-btn"
                  type="button"
                  className="report-trigger-btn"
                  onClick={() => onOpenReportModal({ claimedRegNumber: lastScannedRegNo })}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Report Suspected Unauthorized Practice
                </button>
              </div>

              <div className="result-footer-actions">
                <button
                  id="retry-scan-btn"
                  type="button"
                  className="secondary-scanner-btn"
                  onClick={handleRetryScan}
                >
                  Retry Scanning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Unable to Verify (Suspended / Lapsed) */}
        {scannerState === 'unable_to_verify' && (
          <div className="scanner-result-card caution animate-fade-in" id="qr-unable-card">
            <div className="result-card-banner caution">
              <div className="result-alert-badge caution">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <div className="result-status-title amber">Unable to Verify Registration</div>
                <p className="result-status-sub">
                  {verificationResult?.message || 'Registration found but currently marked under suspension.'}
                </p>
              </div>
            </div>

            <div className="result-card-details">
              <div className="unverified-id-banner">
                Doctor: <strong>{verificationResult?.doctor?.name || 'Registered Practitioner'}</strong> (Reg: {lastScannedRegNo})
              </div>

              <div className="report-cta-box-embedded">
                <div className="embedded-text">
                  <strong>Practicing During Licensure Suspension?</strong>
                  <p>Practitioners with suspended licenses are not authorized to render clinical services.</p>
                </div>
                <button
                  type="button"
                  className="report-trigger-btn"
                  onClick={() => onOpenReportModal({ claimedRegNumber: lastScannedRegNo, suspectName: verificationResult?.doctor?.name })}
                >
                  Report Violation
                </button>
              </div>

              <div className="result-footer-actions">
                <button type="button" className="secondary-scanner-btn" onClick={handleRetryScan}>
                  Retry Scanning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Invalid QR Signature */}
        {scannerState === 'invalid_qr' && (
          <div className="scanner-result-card invalid animate-fade-in" id="qr-invalid-card">
            <div className="result-card-banner invalid">
              <div className="result-alert-badge invalid">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <div className="result-status-title red">Invalid Health-Safe QR</div>
                <p className="result-status-sub">
                  {invalidQRDetails?.reason || 'The scanned QR code is not a verified Health-Safe credential badge.'}
                </p>
              </div>
            </div>

            <div className="result-card-details">
              <p className="invalid-qr-notice">
                Health-Safe strictly enforces signature standards on clinical QR badges. Third-party URLs, unencrypted text, or counterfeit QR codes cannot be verified.
              </p>

              {invalidQRDetails?.rawPayload && (
                <div className="raw-payload-box">
                  <span className="lbl">Scanned Raw Content:</span>
                  <code>{invalidQRDetails.rawPayload}</code>
                </div>
              )}

              <div className="result-footer-actions">
                <button
                  id="retry-invalid-btn"
                  type="button"
                  className="primary-scanner-btn"
                  onClick={handleRetryScan}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Retry Scanning
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: Camera Permission Denied or Device Error */}
        {scannerState === 'error' && (
          <div className="scanner-state-placeholder error animate-fade-in">
            <div className="camera-denied-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <h3>Camera Access Required</h3>
            <p>{errorMessage || 'Please enable camera permissions in your browser to scan clinic QR codes.'}</p>
            
            <div className="scanner-fallback-options">
              <button
                type="button"
                className="secondary-scanner-btn"
                onClick={handleRetryScan}
              >
                Try Requesting Camera Again
              </button>

              <span className="or-divider">&mdash; OR &mdash;</span>

              <button
                type="button"
                className="primary-scanner-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Scan QR from Saved Image File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for fallback testing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileScan}
      />

      {/* Footer Instructions */}
      <div className="scanner-bottom-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Clinics registered with Health-Safe display official QR certificates at reception. Verification is executed securely via our live statutory registry gateway.
        </span>
      </div>
    </div>
  );
}
