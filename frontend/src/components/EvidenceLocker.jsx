import React, { useState, useEffect } from 'react';
import {
  getCaseEvidence,
  uploadSupplementaryEvidence,
  getEvidenceDownloadUrl,
} from '../services/doctorApi';

export default function EvidenceLocker({
  caseId,
  authToken = null,
  isOfficerMode = false,
  onEvidenceUpdated = null,
}) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copiedHashId, setCopiedHashId] = useState(null);

  // Supplementary Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileCategory, setFileCategory] = useState('DOCUMENT');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const fetchEvidence = async () => {
    if (!caseId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getCaseEvidence(caseId, authToken);
      setEvidenceList(data.evidence || []);
      if (data.disclaimer) setDisclaimer(data.disclaimer);
    } catch (err) {
      console.warn('Load evidence error:', err);
      setErrorMessage(err.message || 'Unable to retrieve evidence files.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [caseId, authToken]);

  const handleCopyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2500);
  };

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files || []);
    setUploadError(null);

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    for (const f of files) {
      if (!allowed.includes(f.type)) {
        setUploadError(`File "${f.name}" is not supported. Use JPEG, PNG, WEBP, or PDF.`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setUploadError(`File "${f.name}" exceeds the 5MB size limit.`);
        return;
      }
    }

    setSelectedFiles(files);
  };

  const handleSupplementaryUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one evidence file.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('evidenceFiles', file));
      formData.append('fileCategory', fileCategory);
      formData.append('notes', uploadNotes);
      if (uploaderName.trim()) formData.append('uploaderName', uploaderName.trim());

      await uploadSupplementaryEvidence(caseId, formData, authToken);

      setUploadSuccess('Evidence uploaded successfully with verified cryptographic SHA-256 hash.');
      setSelectedFiles([]);
      setUploadNotes('');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccess(null);
      }, 1500);

      await fetchEvidence();
      if (onEvidenceUpdated) onEvidenceUpdated();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload supplementary evidence.');
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryIcon = (category, fileType) => {
    if (fileType?.includes('pdf')) return '📕';
    switch (category) {
      case 'PRESCRIPTION_SLIP':
        return '💊';
      case 'CERTIFICATE':
        return '📜';
      case 'BILL_RECEIPT':
        return '🧾';
      case 'PHOTOGRAPHIC_PROOF':
        return '📷';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="evidence-locker-container">
      {/* Evidence Header */}
      <div className="evidence-header-row">
        <div>
          <h4 className="evidence-title">Secure Evidence Locker</h4>
          <span className="evidence-subtitle">
            Cryptographically sealed case records with SHA-256 tamper-evident integrity.
          </span>
        </div>
        <div className="evidence-actions-bar">
          <button
            type="button"
            className="btn-upload-supplementary"
            onClick={() => setIsUploadModalOpen(true)}
          >
            + Attach Supplementary Evidence
          </button>
          <button
            type="button"
            className="timeline-refresh-btn"
            onClick={fetchEvidence}
            title="Refresh evidence inventory"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Prominent Legal Disclaimer Banner */}
      <div className="evidence-legal-disclaimer-banner">
        <div className="disclaimer-icon">⚖</div>
        <div className="disclaimer-text-group">
          <strong>Statutory Integrity Notice</strong>
          <p>
            {disclaimer ||
              'Cryptographic SHA-256 hashing verifies that stored files have not been modified or corrupted in storage. Hashing does NOT automatically establish statutory or legal admissibility in court or judicial proceedings.'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="timeline-loading-state">
          <div className="loading-spinner"></div>
          <span>Retrieving cryptographically sealed evidence items...</span>
        </div>
      ) : errorMessage ? (
        <div className="timeline-error-box">⚠ {errorMessage}</div>
      ) : evidenceList.length === 0 ? (
        <div className="empty-evidence-box">
          <div className="empty-ev-icon">📂</div>
          <h4>No Evidence Files Attached</h4>
          <p>No documents, certificates, or prescription slips have been submitted for this case yet.</p>
          <button
            type="button"
            className="btn-upload-supplementary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Supporting Evidence
          </button>
        </div>
      ) : (
        <div className="evidence-cards-grid">
          {evidenceList.map((ev) => (
            <div key={ev._id} className="evidence-card">
              <div className="evidence-card-top">
                <div className="evidence-file-icon">
                  {getCategoryIcon(ev.fileCategory, ev.fileType)}
                </div>
                <div className="evidence-file-main">
                  <h5 className="evidence-filename" title={ev.fileName}>
                    {ev.fileName}
                  </h5>
                  <div className="evidence-meta-row">
                    <span className="file-size-badge">{formatFileSize(ev.size)}</span>
                    <span className="file-cat-badge">{ev.fileCategory || 'DOCUMENT'}</span>
                    <span className="file-status-badge">✓ Integrity Verified</span>
                  </div>
                </div>
              </div>

              {/* SHA-256 Hash Box */}
              <div className="evidence-hash-box">
                <div className="hash-lbl-row">
                  <span className="hash-label">SHA-256 Checksum:</span>
                  <button
                    type="button"
                    className="btn-copy-hash"
                    onClick={() => handleCopyHash(ev.sha256Hash, ev._id)}
                    title="Copy full cryptographic SHA-256 checksum to clipboard"
                  >
                    {copiedHashId === ev._id ? '✓ Copied!' : 'Copy Hash'}
                  </button>
                </div>
                <div className="hash-code-display" title={ev.sha256Hash}>
                  {ev.sha256Hash}
                </div>
              </div>

              {/* Card Footer */}
              <div className="evidence-card-footer">
                <div className="uploader-info">
                  <span>Uploaded by {ev.uploadedByName || ev.uploadedByRole}</span>
                  <span className="upload-time">
                    {new Date(ev.uploadedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <a
                  href={getEvidenceDownloadUrl(ev._id, caseId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view-evidence"
                  title="Stream and view verified evidence file"
                >
                  View / Stream &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplementary Upload Modal */}
      {isUploadModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsUploadModalOpen(false)}>
          <div className="modal-container upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-subhead">Secure Evidence Locker</span>
                <h3 className="modal-title">Attach Supplementary Evidence</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsUploadModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSupplementaryUpload} className="supplementary-form">
              {uploadSuccess && (
                <div className="authority-alert success-alert" style={{ marginBottom: '1rem' }}>
                  ✓ {uploadSuccess}
                </div>
              )}
              {uploadError && (
                <div className="authority-alert error-alert" style={{ marginBottom: '1rem' }}>
                  ⚠ {uploadError}
                </div>
              )}

              <div className="form-field">
                <label className="field-label">Document Category *</label>
                <select
                  className="form-control"
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  required
                >
                  <option value="PRESCRIPTION_SLIP">Prescription Slip / Medical Memo</option>
                  <option value="CERTIFICATE">Certificate / Diploma / License Displayed</option>
                  <option value="BILL_RECEIPT">Consultation Fee Bill / Cash Receipt</option>
                  <option value="PHOTOGRAPHIC_PROOF">Clinic Exterior / Board Photograph</option>
                  <option value="DOCUMENT">General Regulatory Document / Affidavit</option>
                  <option value="OTHER">Other Tangible Record</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">Select Evidence File (Max 5MB: PDF, PNG, JPEG) *</label>
                <input
                  type="file"
                  className="form-control file-input-control"
                  onChange={handleFileSelection}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label">Contextual Notes / Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Describe what this document demonstrates (e.g. date received, clinic name printed)..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="form-field">
                <label className="field-label">Submitted By (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Patient / Investigating Officer (leave blank for anonymous)"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-cancel-action"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm-action"
                  disabled={isUploading}
                >
                  {isUploading ? 'Hashing & Uploading...' : 'Upload & Seal Hash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
