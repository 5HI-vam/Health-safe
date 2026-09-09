import React, { useState, useEffect } from 'react';
import { submitComplaintForm } from '../services/doctorApi';

const CONCERN_CATEGORIES = [
  'Registration could not be verified',
  'Suspected unauthorized medical practice',
  'Suspected fake qualification',
  'Suspected forged certificate',
  'Person claiming to be a doctor without verification',
  'Suspected unauthorized clinic',
  'Other',
];

export default function ReportComplaintForm({
  initialData = {},
  onNavigateToTrackCase,
  onResetToSearch,
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1 to 5

  // Form State: Step 1 (Practitioner Info)
  const [practitionerName, setPractitionerName] = useState(initialData.suspectName || '');
  const [registrationNumber, setRegistrationNumber] = useState(initialData.claimedRegNumber || '');
  const [clinicName, setClinicName] = useState(initialData.clinicName || '');
  const [practitionerPhone, setPractitionerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState(initialData.state || 'Delhi');

  // Form State: Step 2 (Concern Type)
  const [category, setCategory] = useState(initialData.reason || CONCERN_CATEGORIES[1]);

  // Form State: Step 3 (Incident Details)
  const [description, setDescription] = useState(initialData.details || '');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Form State: Step 4 (Evidence)
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceError, setEvidenceError] = useState(null);

  // Form State: Step 5 (Consent)
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (initialData.claimedRegNumber) setRegistrationNumber(initialData.claimedRegNumber);
    if (initialData.suspectName) setPractitionerName(initialData.suspectName);
  }, [initialData]);

  // File Handling (Step 4)
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setEvidenceError(null);

    const validFiles = [];
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

    for (const f of selected) {
      if (!allowedMime.includes(f.type)) {
        setEvidenceError(`File "${f.name}" is not supported. Please upload JPEG, PNG, WEBP, or PDF.`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setEvidenceError(`File "${f.name}" exceeds the 5MB size limit.`);
        return;
      }
      validFiles.push(f);
    }

    if (evidenceFiles.length + validFiles.length > 5) {
      setEvidenceError('Maximum 5 evidence files allowed per report.');
      return;
    }

    setEvidenceFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Step Validation & Navigation
  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!state) {
        setErrorMessage('State jurisdiction is required for statutory authority routing.');
        return;
      }
      if (!practitionerName.trim() && !clinicName.trim() && !registrationNumber.trim()) {
        setErrorMessage('Please provide at least a practitioner name, clinic name, or registration number.');
        return;
      }
    } else if (currentStep === 2) {
      if (!category) {
        setErrorMessage('Please select a type of concern.');
        return;
      }
    } else if (currentStep === 3) {
      if (!description.trim()) {
        setErrorMessage('Please provide an incident description describing the suspected practice.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Form Submit
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!consentAgreed) {
      setErrorMessage('You must confirm the good-faith declaration to proceed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('practitionerName', practitionerName);
      formData.append('registrationNumber', registrationNumber);
      formData.append('practitionerPhone', practitionerPhone);
      formData.append('clinicName', clinicName);
      formData.append('address', address);
      formData.append('district', district);
      formData.append('state', state);
      formData.append('category', category);
      formData.append('description', `${description}${additionalNotes ? `\n\nAdditional Notes: ${additionalNotes}` : ''}`);
      formData.append('incidentDate', incidentDate);
      formData.append('reporterName', reporterName);
      formData.append('reporterContact', reporterContact);
      formData.append('reporterConsent', consentAgreed);

      evidenceFiles.forEach((file) => {
        formData.append('evidenceFiles', file);
      });

      const result = await submitComplaintForm(formData);
      setSubmissionResult(result);
    } catch (err) {
      console.error('Report submission error:', err);
      setErrorMessage(err.message || 'Failed to submit report. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-system-container animate-fade-in" id="report-complaint-section">
      {/* Legal & Product Due Process Banner */}
      <div className="due-process-banner">
        <div className="due-process-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="due-process-text">
          <strong>Official Due Process Standards:</strong> This portal facilitates confidential citizen reports of suspected unauthorized medical practice. Health-Safe does not declare guilt, criminal standing, or pronounce judgment; all submissions are securely transmitted to competent statutory medical councils and health enforcement directorates for formal investigation.
        </div>
      </div>

      {submissionResult ? (
        /* SUCCESS CONFIRMATION STATE */
        <div className="submission-success-card animate-fade-in" id="submission-success-view">
          <div className="success-badge-header">
            <div className="success-icon-wrap">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div className="success-headline">Report submitted successfully</div>
              <p className="success-subtext">
                Your suspected unauthorized practice incident has been assigned a statutory reference and routed for inquiry.
              </p>
            </div>
          </div>

          <div className="case-id-display-box">
            <span className="case-id-label">Official Case ID</span>
            <div className="case-id-value" id="generated-case-id">
              {submissionResult.caseId}
            </div>
            <span className="case-id-sub">Keep this Case ID confidential to track the progress of your inquiry.</span>
          </div>

          <div className="case-meta-grid">
            <div className="meta-cell">
              <span className="lbl">Current Status</span>
              <span className="val pill-submitted">{submissionResult.status}</span>
            </div>
            <div className="meta-cell">
              <span className="lbl">Submitted Date</span>
              <span className="val">{new Date(submissionResult.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="meta-cell full-width">
              <span className="lbl">Authority Routing Status</span>
              <span className="val highlight">{submissionResult.assignedAuthority?.authorityName}</span>
              <small className="sub-routing">{submissionResult.assignedAuthority?.routingStatus}</small>
            </div>
            <div className="meta-cell">
              <span className="lbl">Evidence Files Attached</span>
              <span className="val">{submissionResult.evidenceCount || 0} document(s)</span>
            </div>
          </div>

          <div className="success-card-actions">
            <button
              id="track-case-btn"
              type="button"
              className="primary-action-btn"
              onClick={() => onNavigateToTrackCase(submissionResult.caseId)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Track My Case
            </button>

            <button
              type="button"
              className="secondary-action-btn"
              onClick={onResetToSearch}
            >
              Return to Registry Search
            </button>
          </div>
        </div>
      ) : (
        /* MULTI-STEP REPORTING FORM */
        <div className="multi-step-form-card">
          {/* Stepper Navigation */}
          <div className="form-stepper" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={5}>
            {[
              { num: 1, title: 'Practitioner' },
              { num: 2, title: 'Concern Type' },
              { num: 3, title: 'Incident' },
              { num: 4, title: 'Evidence' },
              { num: 5, title: 'Review & Consent' },
            ].map((step) => (
              <div
                key={step.num}
                className={`step-item ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
                onClick={() => currentStep > step.num && setCurrentStep(step.num)}
              >
                <div className="step-circle">
                  {currentStep > step.num ? '✓' : step.num}
                </div>
                <span className="step-title">{step.title}</span>
              </div>
            ))}
          </div>

          {errorMessage && (
            <div className="form-error-callout animate-fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmitReport} className="step-content-form">
            {/* STEP 1: Practitioner Information */}
            {currentStep === 1 && (
              <div className="step-section animate-fade-in">
                <div className="step-header">
                  <h3 className="step-heading">Step 1 — Practitioner & Facility Information</h3>
                  <p className="step-subheading">
                    Provide all available details regarding the person or clinic suspected of unauthorized practice.
                  </p>
                </div>

                <div className="form-grid-two">
                  <div className="form-field">
                    <label className="field-label" htmlFor="step1-name">
                      Practitioner Name (If known)
                    </label>
                    <input
                      id="step1-name"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. R. K. Sharma / Kumar"
                      value={practitionerName}
                      onChange={(e) => setPractitionerName(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step1-regno">
                      Registration Number (If displayed on board/slip)
                    </label>
                    <input
                      id="step1-regno"
                      type="text"
                      className="form-control"
                      placeholder="e.g. UNREG-99999, DMC-10294"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step1-clinic">
                      Clinic / Facility Name
                    </label>
                    <input
                      id="step1-clinic"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Care PolyClinic & Daycare"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step1-phone">
                      Practitioner / Clinic Contact Phone (Optional)
                    </label>
                    <input
                      id="step1-phone"
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={practitionerPhone}
                      onChange={(e) => setPractitionerPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-field full-width">
                    <label className="field-label" htmlFor="step1-address">
                      Address / Landmark / Street
                    </label>
                    <input
                      id="step1-address"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Near Bus Stand, Market Block 4"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step1-district">
                      District / City
                    </label>
                    <input
                      id="step1-district"
                      type="text"
                      className="form-control"
                      placeholder="e.g. South Delhi / Bengaluru Urban"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step1-state">
                      State Jurisdiction *
                    </label>
                    <select
                      id="step1-state"
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
                      <option value="Gujarat">Gujarat</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Other">Other State</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Type of Concern */}
            {currentStep === 2 && (
              <div className="step-section animate-fade-in">
                <div className="step-header">
                  <h3 className="step-heading">Step 2 — Type of Concern</h3>
                  <p className="step-subheading">
                    Select the primary classification that best describes the suspected violation.
                  </p>
                </div>

                <div className="concern-options-list">
                  {CONCERN_CATEGORIES.map((catOption) => (
                    <label
                      key={catOption}
                      className={`concern-radio-card ${category === catOption ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="concernCategory"
                        value={catOption}
                        checked={category === catOption}
                        onChange={() => setCategory(catOption)}
                      />
                      <div className="radio-text">
                        <span className="radio-title">{catOption}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Incident Details */}
            {currentStep === 3 && (
              <div className="step-section animate-fade-in">
                <div className="step-header">
                  <h3 className="step-heading">Step 3 — Incident Details</h3>
                  <p className="step-subheading">
                    Provide objective observations regarding treatments, procedures, prescriptions, or credential discrepancies.
                  </p>
                </div>

                <div className="form-grid-single">
                  <div className="form-field">
                    <label className="field-label" htmlFor="step3-date">
                      Date Observed / Incident Date *
                    </label>
                    <input
                      id="step3-date"
                      type="date"
                      className="form-control"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step3-desc">
                      Factual Description of Suspected Unauthorized Practice *
                    </label>
                    <textarea
                      id="step3-desc"
                      className="form-control textarea"
                      rows="5"
                      placeholder="Please state what was observed (e.g. practitioner performing surgical procedures or writing Schedule H/X prescriptions without valid MBBS/MD registration; inability or refusal to display statutory medical council certificate)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="form-field">
                    <label className="field-label" htmlFor="step3-notes">
                      Additional Relevant Observations (Optional)
                    </label>
                    <input
                      id="step3-notes"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Operating hours, signboards displayed, witnesses"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Evidence Upload */}
            {currentStep === 4 && (
              <div className="step-section animate-fade-in">
                <div className="step-header">
                  <h3 className="step-heading">Step 4 — Supporting Evidence</h3>
                  <p className="step-subheading">
                    Attach supporting documents, prescriptions, certificates, bills, or facility photographs (Max 5 files, 5MB each).
                  </p>
                </div>

                <div className="evidence-upload-zone">
                  <input
                    id="evidence-file-input"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div
                    className="upload-drop-target"
                    onClick={() => document.getElementById('evidence-file-input').click()}
                  >
                    <div className="upload-icon-circle">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="upload-primary-text">Click to browse or drop evidence files here</span>
                    <span className="upload-secondary-text">
                      Accepted: Images (JPEG, PNG, WEBP), Prescription Slips, Certificates, Bills, Documents (PDF)
                    </span>
                  </div>
                </div>

                {evidenceError && (
                  <div className="evidence-error-banner">{evidenceError}</div>
                )}

                {/* Uploaded Files Chips */}
                {evidenceFiles.length > 0 && (
                  <div className="uploaded-files-list">
                    <h4>Attached Evidence ({evidenceFiles.length}/5):</h4>
                    <div className="files-grid">
                      {evidenceFiles.map((f, idx) => (
                        <div key={idx} className="file-chip">
                          <div className="file-chip-info">
                            <span className="file-name">{f.name}</span>
                            <span className="file-size">({(f.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            className="file-remove-btn"
                            onClick={() => removeFile(idx)}
                            aria-label="Remove attachment"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Confirmation & Consent */}
            {currentStep === 5 && (
              <div className="step-section animate-fade-in">
                <div className="step-header">
                  <h3 className="step-heading">Step 5 — Summary Review & Legal Declaration</h3>
                  <p className="step-subheading">
                    Please review your submission details and verify the good-faith declaration.
                  </p>
                </div>

                <div className="summary-review-card">
                  <div className="summary-item">
                    <span className="lbl">Practitioner / Facility</span>
                    <span className="val">{practitionerName || 'Unspecified'} &bull; {clinicName || 'Unspecified Facility'}</span>
                  </div>

                  <div className="summary-item">
                    <span className="lbl">Registration Number</span>
                    <span className="val">{registrationNumber || 'Not Displayed / Unknown'}</span>
                  </div>

                  <div className="summary-item">
                    <span className="lbl">Type of Concern</span>
                    <span className="val highlight">{category}</span>
                  </div>

                  <div className="summary-item">
                    <span className="lbl">Location & Jurisdiction</span>
                    <span className="val">{address ? `${address}, ` : ''}{district ? `${district}, ` : ''}{state}</span>
                  </div>

                  <div className="summary-item">
                    <span className="lbl">Observation Date</span>
                    <span className="val">
                      {(() => {
                        try {
                          const d = new Date(incidentDate);
                          return isNaN(d.getTime()) ? incidentDate : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        } catch {
                          return incidentDate;
                        }
                      })()}
                    </span>
                  </div>

                  <div className="summary-item full-width">
                    <span className="lbl">Incident Narrative</span>
                    <p className="val-block">{description}</p>
                  </div>

                  <div className="summary-item">
                    <span className="lbl">Evidence Files Attached</span>
                    <span className="val">{evidenceFiles.length} file(s)</span>
                  </div>
                </div>

                <div className="reporter-contact-box">
                  <h4 className="contact-title">Reporter Information (Optional - Confidential)</h4>
                  <div className="form-grid-two">
                    <div className="form-field">
                      <label className="field-label" htmlFor="rep-name">Your Name</label>
                      <input
                        id="rep-name"
                        type="text"
                        className="form-control"
                        placeholder="Leave blank for anonymous"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="field-label" htmlFor="rep-contact">Contact Phone or Email</label>
                      <input
                        id="rep-contact"
                        type="text"
                        className="form-control"
                        placeholder="For official statutory follow-up"
                        value={reporterContact}
                        onChange={(e) => setReporterContact(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Consent & Good-Faith Legal Declaration */}
                <div className="declaration-consent-card">
                  <label className="declaration-checkbox-label">
                    <input
                      id="consent-checkbox"
                      type="checkbox"
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      required
                    />
                    <span className="declaration-text">
                      <strong>Mandatory Good-Faith Declaration:</strong> I declare that the information provided in this report is true and accurate to the best of my knowledge and is submitted in good faith for statutory review. I understand that the platform does not pronounce criminal guilt, but routes this report directly to the competent State Medical Council or Directorate of Health Services for official administrative inquiry.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Form Wizard Navigation Buttons */}
            <div className="form-nav-buttons">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  &larr; Back
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  id="step-next-btn"
                  type="button"
                  className="primary-btn"
                  onClick={handleNext}
                >
                  Continue to Step {currentStep + 1} &rarr;
                </button>
              ) : (
                <button
                  id="submit-complaint-final-btn"
                  type="submit"
                  className="submit-report-final-btn"
                  disabled={isSubmitting || !consentAgreed}
                >
                  {isSubmitting ? (
                    <span className="btn-loading-content">
                      <span className="spinner-icon"></span>
                      Registering Report...
                    </span>
                  ) : (
                    'Submit Confidential Report'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
