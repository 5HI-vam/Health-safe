import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseDoctorQRPayload } from '../services/doctorApi';

export default function VerifyView({
  onSearchRegistration,
  verificationResult,
  isLoading,
  onOpenReport,
  onOpenBadge
}) {
  const [verifyType, setVerifyType] = useState('doctor');
  const [searchTab, setSearchTab] = useState('reg');
  const [inputValue, setInputValue] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrStatus, setQrStatus] = useState('Requesting camera…');
  
  const html5QrCodeRef = useRef(null);

  // Trigger search
  const handleVerify = () => {
    if (inputValue.trim()) {
      onSearchRegistration(inputValue.trim());
    }
  };

  const handleSampleClick = (id) => {
    setInputValue(id);
    onSearchRegistration(id);
  };

  const openQrModal = () => {
    setIsQrModalOpen(true);
    setQrStatus('Requesting camera…');
  };

  useEffect(() => {
    if (isQrModalOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isQrModalOpen]);

  const startScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }
      const scanner = new Html5Qrcode('health-safe-qr-viewport-modal');
      html5QrCodeRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setQrStatus('Scanning…');
        const cameraId = devices[0].id;
        await scanner.start(
          cameraId,
          { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
          (decodedText) => {
            handleDecodedText(decodedText);
          },
          (err) => { }
        );
      } else {
        setQrStatus('No camera found.');
      }
    } catch (err) {
      console.warn(err);
      setQrStatus('Camera access denied.');
    }
  };

  const stopScanner = async () => {
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

  const handleDecodedText = async (decodedText) => {
    await stopScanner();
    setQrStatus('Verifying payload…');
    const parsed = parseDoctorQRPayload(decodedText);
    
    setTimeout(() => {
      setIsQrModalOpen(false);
      if (parsed.isValid) {
        setInputValue(parsed.registrationNumber);
        onSearchRegistration(parsed.registrationNumber);
      } else {
        // Fallback if not standard payload but just simple text
        setInputValue(decodedText);
        onSearchRegistration(decodedText);
      }
    }, 800);
  };

  const renderResult = () => {
    if (isLoading) {
      return (
        <div className="result-card">
          <div className="spin-row"><span className="spinner"></span>Checking registry…</div>
        </div>
      );
    }
    
    if (!verificationResult) {
      return (
        <div className="result-card">
          <p className="result-empty">Enter a registration number above, or tap a sample to see a result.</p>
        </div>
      );
    }

    const rec = verificationResult.doctor;
    const isUnreg = verificationResult.status === 'Registration Not Found' || !rec;
    const status = isUnreg ? 'unreg' : (rec?.status?.toLowerCase() === 'suspended' ? 'suspended' : 'active');

    let statusLabel, statusColor;
    if (status === 'active') { statusLabel = 'Registered and active'; statusColor = 'var(--teal)'; }
    else if (status === 'suspended') { statusLabel = 'Registration suspended'; statusColor = 'var(--amber)'; }
    else { statusLabel = 'Registration not found'; statusColor = 'var(--red)'; }

    if (isUnreg) {
      return (
        <div className="result-card">
          <div className="result-top">
            <div className="result-status" style={{ color: statusColor }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }}></span>
              {statusLabel}
            </div>
          </div>
          <p className="result-empty" style={{ marginTop: 16 }}>
            No record matches <span className="mono">{verificationResult.searchedQuery?.registrationNumber || inputValue}</span> in the {verifyType === 'doctor' ? 'National Medical Commission / State Medical Council' : 'facility registration'} database.
          </p>
          <div className="result-actions">
            <button className="btn btn-danger" onClick={() => onOpenReport({ claimedRegNumber: inputValue })}>Report this now</button>
          </div>
        </div>
      );
    }

    return (
      <div className="result-card">
        <div className="result-top">
          <div className="result-status" style={{ color: statusColor }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }}></span>
            {statusLabel}
          </div>
        </div>
        <div className="result-grid">
          <div className="field"><label>Name</label><div>{rec.name}</div></div>
          <div className="field"><label>Registration number</label><div><span className="mono">{rec.registrationNumber}</span></div></div>
          <div className="field"><label>{verifyType === 'doctor' ? 'Qualification' : 'Type'}</label><div>{rec.qualifications?.join(', ') || rec.qualification || 'N/A'}</div></div>
          <div className="field"><label>Council / authority</label><div>{rec.medicalCouncil || rec.council || 'N/A'}</div></div>
          <div className="field"><label>Last verified</label><div>Just now, from synced registry data</div></div>
          <div className="field"><label>Source</label><div>{verificationResult.source || 'Demo registry dataset'}</div></div>
        </div>
        <div className="result-actions">
          {status === 'active' && <button className="btn btn-teal btn-sm" onClick={() => onOpenBadge(rec.registrationNumber)}>Get verified badge</button>}
          {status === 'suspended' && <button className="btn btn-danger" onClick={() => onOpenReport({ claimedRegNumber: rec.registrationNumber, suspectName: rec.name })}>Flag a concern about this record</button>}
        </div>
      </div>
    );
  };

  return (
    <section className="view active animate-fade-in">
      <div className="page-head">
        <div className="eyebrow">Verification</div>
        <h1>{verifyType === 'doctor' ? 'Verify doctor registration' : 'Verify clinic registration'}</h1>
        <p>
          {verifyType === 'doctor' 
            ? 'Authenticate practitioner licensure against State Medical Council and National Medical Commission registry records.'
            : 'Confirm a hospital or clinic is a registered, recognised healthcare establishment.'}
        </p>
      </div>

      <div className="advisory">Registration verification confirms a record exists in the medical council registry. It does not evaluate clinical competency, treatment safety, or medical quality.</div>

      <div className="toggle-row">
        <button className={`toggle-btn ${verifyType === 'doctor' ? 'active' : ''}`} onClick={() => setVerifyType('doctor')}>Doctor</button>
        <button className={`toggle-btn ${verifyType === 'facility' ? 'active' : ''}`} onClick={() => setVerifyType('facility')}>Clinic / facility</button>
      </div>

      <div className="search-panel">
        <div className="search-tabs">
          <button className={`search-tab ${searchTab === 'reg' ? 'active' : ''}`} onClick={() => setSearchTab('reg')}>Search by registration number</button>
          <button className={`search-tab ${searchTab === 'name' ? 'active' : ''}`} onClick={() => setSearchTab('name')}>Search by name &amp; state</button>
        </div>
        <div className="search-row">
          <input 
            type="text" 
            placeholder={verifyType === 'doctor' ? 'Enter registration number (e.g. MCI-2015-78901)' : 'Enter facility registration number (e.g. MPCL-2020-3301)'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
          <button className="qr-btn" onClick={openQrModal}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>
            Scan QR
          </button>
          <button className="btn btn-primary" onClick={handleVerify}>Verify registration</button>
        </div>
        <div className="samples">
          {verifyType === 'doctor' ? (
            <>
              <button className="sample-chip chip-active" onClick={() => handleSampleClick('MCI-2015-78901')}>MCI-2015-78901</button>
              <button className="sample-chip chip-active" onClick={() => handleSampleClick('KMC-45892')}>KMC-45892</button>
              <button className="sample-chip chip-suspended" onClick={() => handleSampleClick('MCI-2012-44102')}>MCI-2012-44102</button>
              <button className="sample-chip chip-unreg" onClick={() => handleSampleClick('UNREG-99999')}>UNREG-99999</button>
            </>
          ) : (
            <>
              <button className="sample-chip chip-active" onClick={() => handleSampleClick('MPCL-2020-3301')}>MPCL-2020-3301</button>
              <button className="sample-chip chip-suspended" onClick={() => handleSampleClick('MPCL-2018-0099')}>MPCL-2018-0099</button>
              <button className="sample-chip chip-unreg" onClick={() => handleSampleClick('UNREG-99999')}>UNREG-99999</button>
            </>
          )}
        </div>
      </div>

      {renderResult()}

      {/* QR Modal Overlay */}
      {isQrModalOpen && (
        <div className="modal-overlay open">
          <div className="qr-modal" style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Scan registration QR</h3>
            <p>Point the camera at the QR code on the doctor's ID or clinic certificate.</p>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '15px auto', borderRadius: '12px', overflow: 'hidden' }}>
              <div id="health-safe-qr-viewport-modal" style={{ width: '100%' }}></div>
              <div className="qr-scanline" style={{ display: qrStatus === 'Scanning…' ? 'block' : 'none' }}></div>
            </div>
            <p className="qr-status">{qrStatus}</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setIsQrModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
