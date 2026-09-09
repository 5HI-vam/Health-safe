import React, { useState, useEffect } from 'react';
import { submitUnauthorizedPracticeReport } from '../services/doctorApi';

export default function ReportModal({ isOpen, onClose, initialData = {} }) {
  const [suspectName, setSuspectName] = useState(initialData.suspectName || '');
  const [claimedRegNumber, setClaimedRegNumber] = useState(initialData.claimedRegNumber || '');
  const [clinicName, setClinicName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [reason, setReason] = useState('Registration Not Found in Registry');
  const [details, setDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (initialData.claimedRegNumber) {
      setClaimedRegNumber(initialData.claimedRegNumber);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitUnauthorizedPracticeReport({
        suspectName: suspectName.trim() || 'Unknown Practitioner',
        claimedRegNumber: claimedRegNumber.trim(),
        clinicName: clinicName.trim(),
        city: city.trim(),
        state,
        reason,
        details: details.trim(),
        reporterName: reporterName.trim(),
        reporterContact: reporterContact.trim(),
      });

      setSubmitSuccess(response);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit report. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSubmitSuccess(null);
    setSubmitError(null);
    onClose();
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={resetAndClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-alert">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 id="modal-title" className="modal-title">
                Report Suspected Unauthorized Practice
              </h3>
              <p className="modal-subtitle">
                Confidential report submitted to health authorities and state council registry monitoring.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={resetAndClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {submitSuccess ? (
          <div className="modal-success-state animate-fade-in">
            <div className="success-icon-large">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h4 className="success-title">Report Filed Successfully</h4>
            <p className="success-desc">
              Thank you for upholding healthcare safety standards. Your report has been logged and assigned reference ID:
            </p>
            <div className="reference-pill">
              <code>{submitSuccess.reportId}</code>
            </div>
            <button type="button" className="primary-modal-btn" onClick={resetAndClose}>
              Return to Verification Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {submitError && (
              <div className="modal-error-banner">
                {submitError}
              </div>
            )}

            <div className="modal-form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="suspect-name">
                  Practitioner or Clinic Name *
                </label>
                <input
                  id="suspect-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dr. Kumar / Care PolyClinic"
                  value={suspectName}
                  onChange={(e) => setSuspectName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="claimed-reg">
                  Claimed Reg Number (If displayed on board/slip)
                </label>
                <input
                  id="claimed-reg"
                  type="text"
                  className="form-control"
                  placeholder="e.g. UNREG-99999"
                  value={claimedRegNumber}
                  onChange={(e) => setClaimedRegNumber(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="clinic-name">
                  Facility / Clinic Name
                </label>
                <input
                  id="clinic-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. HealthFirst Diagnostic Centre"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="report-state">
                  State Jurisdiction *
                </label>
                <select
                  id="report-state"
                  className="form-control"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                >
                  <option value="Delhi">Delhi</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field full-width">
                <label className="form-label" htmlFor="report-reason">
                  Primary Concern *
                </label>
                <select
                  id="report-reason"
                  className="form-control"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                >
                  <option value="Registration Not Found in Registry">Registration Not Found in Registry</option>
                  <option value="Suspicious or Counterfeit Certificate">Suspicious or Counterfeit Certificate</option>
                  <option value="Practicing Without Valid Medical License">Practicing Without Valid Medical License</option>
                  <option value="Impersonating a Licensed Doctor">Impersonating a Licensed Doctor</option>
                  <option value="Other Unauthorized Practice">Other Unauthorized Practice</option>
                </select>
              </div>

              <div className="form-field full-width">
                <label className="form-label" htmlFor="report-details">
                  Incident / Observation Details *
                </label>
                <textarea
                  id="report-details"
                  className="form-control textarea"
                  rows="3"
                  placeholder="Please describe location, observed procedures, prescriptions issued, or reasons for suspecting unauthorized practice..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reporter-name">
                  Your Name (Optional - Confidential)
                </label>
                <input
                  id="reporter-name"
                  type="text"
                  className="form-control"
                  placeholder="Leave blank for anonymous"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reporter-contact">
                  Contact Phone or Email (Optional)
                </label>
                <input
                  id="reporter-contact"
                  type="text"
                  className="form-control"
                  placeholder="For official verification follow-up"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-modal-btn" onClick={resetAndClose}>
                Cancel
              </button>
              <button
                id="submit-report-btn"
                type="submit"
                className="submit-report-action-btn"
                disabled={isSubmitting || !details.trim() || !suspectName.trim()}
              >
                {isSubmitting ? 'Submitting Report...' : 'Submit Confidential Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
