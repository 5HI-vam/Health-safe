import React, { useState } from 'react';
import { submitPatientSafetyGrievance } from '../services/doctorApi';

const GRIEVANCE_CATEGORIES = [
  {
    id: 'Critical-care concern',
    title: 'Critical-Care Concern',
    icon: '🫁',
    tagline: 'Carefully worded for sensitive critical-care & life-support inquiries',
    prompt:
      'I have a concern regarding information provided to my family about critical care/life-support.',
    accent: '#ef4444',
  },
  {
    id: 'Concern about communication regarding patient condition',
    title: 'Communication Regarding Patient Condition',
    icon: '💬',
    tagline: 'Miscommunication or withheld updates regarding prognosis or care',
    prompt:
      'Clinical updates, treatment risks, or patient condition were not communicated transparently.',
    accent: '#f59e0b',
  },
  {
    id: 'Treatment concern',
    title: 'Treatment Concern',
    icon: '🩺',
    tagline: 'Questions regarding administered medical protocols or clinical care',
    prompt:
      'Concern regarding care administration, procedural delays, or medication protocols.',
    accent: '#38bdf8',
  },
  {
    id: 'Billing concern',
    title: 'Billing & Financial Transparency Concern',
    icon: '🧾',
    tagline: 'Undisclosed surcharges, fee transparency, or statutory receipt issues',
    prompt:
      'Disputed or undocumented treatment charges, unexpected surcharges, or withheld bills.',
    accent: '#06b6d4',
  },
  {
    id: 'Medical records concern',
    title: 'Medical Records & Discharge Summary Concern',
    icon: '📋',
    tagline: 'Refusal or delay in providing case sheets, diagnostic reports, or summaries',
    prompt:
      'Facility delayed or refused to provide diagnostic reports, case sheets, or discharge summary.',
    accent: '#8b5cf6',
  },
  {
    id: 'Consent/documentation concern',
    title: 'Informed Consent & Documentation Concern',
    icon: '📝',
    tagline: 'Procedures performed without informed consent or signed explanations',
    prompt:
      'Invasive procedures or medication adjustments administered without proper informed consent.',
    accent: '#ec4899',
  },
  {
    id: 'Suspected unauthorized practice',
    title: 'Suspected Unauthorized Practice in Facility',
    icon: '⚠',
    tagline: 'Staff or visiting practitioners operating without verified credentials',
    prompt:
      'Individual treating patients inside the facility without verified medical council registration.',
    accent: '#f97316',
  },
  {
    id: 'Other',
    title: 'Other Patient Care Concern',
    icon: 'ℹ',
    tagline: 'Other statutory healthcare safety grievances',
    prompt:
      'Other tangible concern regarding hospital safety protocols or institutional care.',
    accent: '#64748b',
  },
];

const RELATIONSHIPS = [
  'Self',
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Legal Guardian',
  'Other Relative',
  'Authorized Representative',
];

const STATES = [
  'Karnataka',
  'Delhi',
  'Maharashtra',
  'Telangana',
  'Tamil Nadu',
  'West Bengal',
  'Uttar Pradesh',
  'Rajasthan',
  'Gujarat',
  'Kerala',
  'Other State',
];

export default function PatientSafetyView({ onNavigateToTrackCase, onResetToSearch }) {
  // Wizard Step: 1 = Facility & Relationship, 2 = Category, 3 = Narrative & Details, 4 = Evidence, 5 = Review & Declaration
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('Bengaluru Urban');
  const [practitionerName, setPractitionerName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [patientRelationship, setPatientRelationship] = useState('Child');

  const [category, setCategory] = useState('Critical-care concern');
  const [careSetting, setCareSetting] = useState('Intensive Care Unit (ICU)');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(
    'I have a concern regarding information provided to my family about critical care/life-support. '
  );
  const [isEmergency, setIsEmergency] = useState(false);

  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [reporterConsent, setReporterConsent] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedGrievance, setSubmittedGrievance] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const validFiles = selected.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds maximum allowed size of 5MB.`);
          return false;
        }
        return true;
      });
      setEvidenceFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    }
  };

  const handleRemoveFile = (index) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reporterConsent) {
      setSubmitError('You must confirm the good-faith statutory declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('facilityName', facilityName);
      formData.append('facilityAddress', facilityAddress);
      formData.append('state', state);
      formData.append('district', district);
      formData.append('practitionerName', practitionerName);
      formData.append('registrationNumber', registrationNumber);
      formData.append('specialization', specialization);
      formData.append('patientRelationship', patientRelationship);
      formData.append('category', category);
      formData.append('description', `[Care Setting: ${careSetting}] ${description}`);
      formData.append('incidentDate', incidentDate);
      formData.append('isEmergency', String(isEmergency));
      formData.append('reporterName', reporterName);
      formData.append('reporterContact', reporterContact);
      formData.append('reporterConsent', String(reporterConsent));

      evidenceFiles.forEach((file) => {
        formData.append('evidenceFiles', file);
      });

      const response = await submitPatientSafetyGrievance(formData);
      setSubmittedGrievance(response);
    } catch (err) {
      console.error('Patient safety submission error:', err);
      setSubmitError(err.message || 'Failed to register care grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedGrievance) {
    return (
      <div className="ps-confirmation-wrapper animate-fade-in">
        <div className="ps-confirmation-card">
          <div className="ps-conf-header">
            <div className="ps-conf-badge">✓ REGISTERED FOR STATUTORY INQUIRY</div>
            <h2 className="ps-conf-title">Care Grievance Docket Established</h2>
            <p className="ps-conf-sub">
              Your concern has been securely logged with cryptographic integrity and auto-routed to the competent healthcare oversight authority.
            </p>
          </div>

          <div className="ps-case-id-display">
            <span className="cid-lbl">OFFICIAL GRIEVANCE REFERENCE NUMBER</span>
            <strong className="cid-value">{submittedGrievance.caseId}</strong>
            <span className="cid-copy-hint">Keep this Case ID to track status updates on the public portal.</span>
          </div>

          <div className="ps-conf-details-grid">
            <div className="conf-item">
              <span className="lbl">Hospital / Facility:</span>
              <strong className="val">{submittedGrievance.facilityName}</strong>
            </div>
            <div className="conf-item">
              <span className="lbl">Jurisdiction:</span>
              <strong className="val">{submittedGrievance.district}, {submittedGrievance.state}</strong>
            </div>
            <div className="conf-item">
              <span className="lbl">Concern Classification:</span>
              <strong className="val">{submittedGrievance.category}</strong>
            </div>
            <div className="conf-item">
              <span className="lbl">Initial Statutory Status:</span>
              <strong className="val green">{submittedGrievance.status}</strong>
            </div>
            <div className="conf-item full-width">
              <span className="lbl">Routed Review Authority:</span>
              <strong className="val cyan">{submittedGrievance.assignedAuthority?.authorityName}</strong>
              <p className="routing-desc-text">
                {submittedGrievance.assignedAuthority?.routingStatus}
              </p>
            </div>
          </div>

          {/* Statutory Guardrail Notice */}
          <div className="statutory-legal-alert">
            <span className="statutory-icon">⚖</span>
            <p>
              <strong>Important Statutory Notice:</strong> Health-Safe does not independently determine medical negligence, death, treatment necessity, or other clinical/legal outcomes. Reports are submitted for review by the appropriate competent authority.
            </p>
          </div>

          {submittedGrievance.emergencyAdvisory && (
            <div className="ps-emergency-inline-alert">
              <strong>⚠ Immediate Medical Advisory:</strong>
              <p>{submittedGrievance.emergencyAdvisory}</p>
            </div>
          )}

          <div className="ps-conf-actions">
            {onNavigateToTrackCase && (
              <button
                type="button"
                className="btn-track-now"
                onClick={() => onNavigateToTrackCase(submittedGrievance.caseId)}
              >
                Track Case Progress &rarr;
              </button>
            )}
            <button
              type="button"
              className="btn-submit-another"
              onClick={() => {
                setSubmittedGrievance(null);
                setCurrentStep(1);
                setDescription('');
                setEvidenceFiles([]);
              }}
            >
              Submit Another Grievance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-safety-module-container animate-fade-in">
      {/* Module Title Banner */}
      <div className="patient-safety-hero">
        <div className="ps-hero-badge">PATIENT SAFETY & CARE GRIEVANCE</div>
        <h1 className="ps-hero-title">Record a Healthcare Safety or Care Grievance</h1>
        <p className="ps-hero-desc">
          Confidential statutory reporting platform for patients, families, and guardians to register clinical care concerns, critical-care communication inquiries, and facility practice questions for formal regulatory review.
        </p>

        {/* Legal Clinical Guardrail Notice */}
        <div className="ps-statutory-disclaimer-box">
          <span className="disclaimer-symbol">⚖</span>
          <p>
            <strong>Statutory Framework Notice:</strong> Health-Safe does not independently determine medical negligence, death, treatment necessity, or other clinical/legal outcomes. Reports are submitted for review by the appropriate competent authority.
          </p>
        </div>

        {/* Emergency Medical Advisory Banner */}
        <div className="ps-emergency-warning-banner">
          <div className="emergency-icon-orb">🚨</div>
          <div className="emergency-text-content">
            <strong>IMMEDIATE MEDICAL EMERGENCY ADVISORY</strong>
            <p>
              If a patient is currently experiencing an active, life-threatening emergency, severe acute distress, or immediate deterioration, <strong>please call emergency services (112 / local ambulance) or visit the nearest hospital emergency department immediately</strong>. Do not delay medical intervention waiting for administrative grievance processing.
            </p>
          </div>
          <label className="emergency-checkbox-toggle">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            <span>Active Clinical Emergency</span>
          </label>
        </div>
      </div>

      {/* Step Navigation Progress */}
      <div className="ps-wizard-stepper">
        <div className={`step-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
          <span className="step-label">Facility & Patient</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
          <span className="step-label">Care Category</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step-item ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
          <span className="step-label">Grievance Details</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step-item ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 4 ? '✓' : '4'}</div>
          <span className="step-label">Clinical Evidence</span>
        </div>
        <div className="step-connector"></div>
        <div className={`step-item ${currentStep >= 5 ? 'active' : ''}`}>
          <div className="step-circle">5</div>
          <span className="step-label">Declaration</span>
        </div>
      </div>

      {submitError && <div className="ps-form-error-banner">⚠ {submitError}</div>}

      <div className="ps-form-card">
        <form onSubmit={handleSubmit}>
          {/* STEP 1: FACILITY & PATIENT RELATIONSHIP */}
          {currentStep === 1 && (
            <div className="wizard-step-pane animate-fade-in">
              <div className="step-pane-header">
                <span className="pane-step-tag">Step 1 of 5</span>
                <h3 className="pane-step-title">Clinical Facility & Patient Relationship</h3>
                <p className="pane-step-sub">
                  Identify the healthcare institution, geographic jurisdiction, and your relationship to the patient.
                </p>
              </div>

              <div className="ps-fields-grid">
                <div className="form-group full-col">
                  <label className="input-label">Hospital / Clinical Facility Name *</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. Manipal Hospital, Fortis Health Institute, Apex Nursing Home"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">State Jurisdiction *</label>
                  <select
                    className="select-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  >
                    {STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">District *</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. Bengaluru Urban, South Delhi, Mumbai Suburban"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-col">
                  <label className="input-label">Facility Street Address / Branch Location</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. HAL Airport Road, Indiranagar Block 4"
                    value={facilityAddress}
                    onChange={(e) => setFacilityAddress(e.target.value)}
                  />
                </div>

                <div className="form-group full-col">
                  <label className="input-label">Your Relationship to the Patient *</label>
                  <div className="relationship-pill-selector">
                    {RELATIONSHIPS.map((rel) => (
                      <button
                        key={rel}
                        type="button"
                        className={`rel-pill ${patientRelationship === rel ? 'active' : ''}`}
                        onClick={() => setPatientRelationship(rel)}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">Attending Doctor / Practitioner Name (Optional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. Dr. Suresh V. (leave blank if unknown)"
                    value={practitionerName}
                    onChange={(e) => setPractitionerName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Registration Number Displayed (Optional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. KMC-66219"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="step-actions-footer">
                <button
                  type="button"
                  className="btn-step-next"
                  onClick={() => {
                    if (!facilityName.trim()) {
                      alert('Please specify the hospital or facility name.');
                      return;
                    }
                    if (!district.trim()) {
                      alert('Please specify the district.');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                >
                  Continue to Category Selection &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORY OF CARE GRIEVANCE */}
          {currentStep === 2 && (
            <div className="wizard-step-pane animate-fade-in">
              <div className="step-pane-header">
                <span className="pane-step-tag">Step 2 of 5</span>
                <h3 className="pane-step-title">Select Grievance Concern Classification</h3>
                <p className="pane-step-sub">
                  Choose the category that best reflects your care inquiry. Specialized options are provided for critical-care communication.
                </p>
              </div>

              <div className="categories-selection-grid">
                {GRIEVANCE_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`category-card-choice ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setCategory(cat.id);
                        if (cat.id === 'Critical-care concern' && !description.includes('critical care/life-support')) {
                          setDescription(cat.prompt + ' ');
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cat-choice-top">
                        <span className="cat-choice-icon">{cat.icon}</span>
                        <div className="cat-choice-radio">
                          <input
                            type="radio"
                            name="category"
                            checked={isSelected}
                            onChange={() => setCategory(cat.id)}
                          />
                        </div>
                      </div>
                      <h4 className="cat-choice-title">{cat.title}</h4>
                      <p className="cat-choice-tagline">{cat.tagline}</p>
                      <div className="cat-choice-prompt">
                        <em>&ldquo;{cat.prompt}&rdquo;</em>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="step-actions-footer between">
                <button
                  type="button"
                  className="btn-step-back"
                  onClick={() => setCurrentStep(1)}
                >
                  &larr; Back to Facility
                </button>
                <button
                  type="button"
                  className="btn-step-next"
                  onClick={() => setCurrentStep(3)}
                >
                  Continue to Grievance Narrative &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GRIEVANCE NARRATIVE & CARE SETTING */}
          {currentStep === 3 && (
            <div className="wizard-step-pane animate-fade-in">
              <div className="step-pane-header">
                <span className="pane-step-tag">Step 3 of 5</span>
                <h3 className="pane-step-title">Grievance Narrative & Incident Context</h3>
                <p className="pane-step-sub">
                  Describe what transpired in your own words. We never ask whether a patient has passed away; you may share any relevant clinical facts.
                </p>
              </div>

              <div className="ps-fields-grid">
                <div className="form-group">
                  <label className="input-label">Date of Incident / Observation *</label>
                  <input
                    type="date"
                    className="text-input"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">Care Setting Department *</label>
                  <select
                    className="select-input"
                    value={careSetting}
                    onChange={(e) => setCareSetting(e.target.value)}
                  >
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="Emergency Department / Casualty">Emergency Department / Casualty</option>
                    <option value="Inpatient General / Semi-Private Ward">Inpatient General / Semi-Private Ward</option>
                    <option value="Operation Theatre / Surgical Recovery">Operation Theatre / Surgical Recovery</option>
                    <option value="Outpatient Consultation (OPD)">Outpatient Consultation (OPD)</option>
                    <option value="Billing & Discharge Counter">Billing & Discharge Counter</option>
                    <option value="Other Department">Other Department</option>
                  </select>
                </div>

                <div className="form-group full-col">
                  <label className="input-label">Detailed Grievance Statement *</label>
                  <textarea
                    className="textarea-input"
                    rows="6"
                    placeholder="Describe your concern in chronological detail. For critical care, note what information was provided regarding life support, diagnosis, or care steps..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  ></textarea>
                  <span className="field-hint">
                    Provide factual details, dates, and names of staff or consultants spoken to where known.
                  </span>
                </div>
              </div>

              <div className="step-actions-footer between">
                <button
                  type="button"
                  className="btn-step-back"
                  onClick={() => setCurrentStep(2)}
                >
                  &larr; Back to Category
                </button>
                <button
                  type="button"
                  className="btn-step-next"
                  onClick={() => {
                    if (!description.trim() || description.trim().length < 15) {
                      alert('Please provide a descriptive explanation of your concern (minimum 15 characters).');
                      return;
                    }
                    setCurrentStep(4);
                  }}
                >
                  Continue to Supporting Documents &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: EVIDENCE LOCKER UPLOAD */}
          {currentStep === 4 && (
            <div className="wizard-step-pane animate-fade-in">
              <div className="step-pane-header">
                <span className="pane-step-tag">Step 4 of 5</span>
                <h3 className="pane-step-title">Supporting Clinical Records & Bills</h3>
                <p className="pane-step-sub">
                  Attach supporting documents, discharge memos, prescription slips, or bills. Each file is cryptographically sealed with a SHA-256 integrity hash.
                </p>
              </div>

              <div className="file-upload-dropzone">
                <input
                  type="file"
                  id="evidence-file-input"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="file-hidden-input"
                />
                <label htmlFor="evidence-file-input" className="dropzone-label">
                  <span className="dropzone-icon">📁</span>
                  <strong>Choose Supporting Documents / Files</strong>
                  <span>Max 5 files &bull; PDF, PNG, JPEG &bull; Up to 5MB per file</span>
                </label>
              </div>

              {evidenceFiles.length > 0 && (
                <div className="selected-files-list">
                  <span className="files-list-title">Selected Documents ({evidenceFiles.length}/5):</span>
                  {evidenceFiles.map((file, idx) => (
                    <div key={idx} className="selected-file-item">
                      <span className="doc-icon">📄</span>
                      <div className="file-info-block">
                        <strong className="doc-name">{file.name}</strong>
                        <span className="doc-size">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={() => handleRemoveFile(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="evidence-sha-note">
                <span className="sha-lock-icon">🔒</span>
                <p>
                  <strong>Cryptographic Integrity Guarantee:</strong> Stored documents are indexed in our secure Evidence Locker with SHA-256 hashing. This detects any tampering in storage, but does not independently determine legal admissibility.
                </p>
              </div>

              <div className="step-actions-footer between">
                <button
                  type="button"
                  className="btn-step-back"
                  onClick={() => setCurrentStep(3)}
                >
                  &larr; Back to Narrative
                </button>
                <button
                  type="button"
                  className="btn-step-next"
                  onClick={() => setCurrentStep(5)}
                >
                  Continue to Review & Submit &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & DECLARATION */}
          {currentStep === 5 && (
            <div className="wizard-step-pane animate-fade-in">
              <div className="step-pane-header">
                <span className="pane-step-tag">Step 5 of 5</span>
                <h3 className="pane-step-title">Review & Good-Faith Statutory Declaration</h3>
                <p className="pane-step-sub">
                  Review your recorded grievance prior to submission for statutory authority routing.
                </p>
              </div>

              <div className="review-summary-box">
                <div className="review-row">
                  <span className="r-label">Facility / Hospital:</span>
                  <strong className="r-val">{facilityName} ({district}, {state})</strong>
                </div>
                <div className="review-row">
                  <span className="r-label">Patient Relationship:</span>
                  <strong className="r-val">{patientRelationship}</strong>
                </div>
                <div className="review-row">
                  <span className="r-label">Concern Category:</span>
                  <strong className="r-val cyan">{category}</strong>
                </div>
                <div className="review-row">
                  <span className="r-label">Care Setting:</span>
                  <strong className="r-val">{careSetting}</strong>
                </div>
                <div className="review-row">
                  <span className="r-label">Incident Date:</span>
                  <strong className="r-val">{incidentDate}</strong>
                </div>
                <div className="review-row">
                  <span className="r-label">Attached Documents:</span>
                  <strong className="r-val">{evidenceFiles.length} file(s)</strong>
                </div>
              </div>

              <div className="ps-fields-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="input-label">Reporter Name (Optional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. Smt. Sunita Sharma"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">Contact Phone / Email (Optional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. +91 98450 11223 or email@domain.com"
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                  />
                </div>
              </div>

              {/* Good Faith Statutory Declaration */}
              <div className="statutory-declaration-container">
                <label className="declaration-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reporterConsent}
                    onChange={(e) => setReporterConsent(e.target.checked)}
                    required
                  />
                  <span>
                    <strong>Good-Faith Declaration:</strong> I hereby declare that this grievance is submitted in good faith to request regulatory review by competent healthcare oversight authorities. I understand that Health-Safe does not independently determine medical negligence, death, or treatment necessity, and reports are routed for formal review.
                  </span>
                </label>
              </div>

              <div className="step-actions-footer between">
                <button
                  type="button"
                  className="btn-step-back"
                  onClick={() => setCurrentStep(4)}
                  disabled={isSubmitting}
                >
                  &larr; Back to Evidence
                </button>
                <button
                  type="submit"
                  className="btn-submit-grievance"
                  disabled={isSubmitting || !reporterConsent}
                >
                  {isSubmitting ? 'Registering Grievance Docket...' : 'Submit Care Grievance &rarr;'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
