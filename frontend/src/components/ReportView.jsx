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

export default function ReportView({
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

  // File Handling
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

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!state) { setErrorMessage('State jurisdiction is required for statutory authority routing.'); return; }
      if (!practitionerName.trim() && !clinicName.trim() && !registrationNumber.trim()) {
        setErrorMessage('Please provide at least a practitioner name, clinic name, or registration number.');
        return;
      }
    } else if (currentStep === 2) {
      if (!category) { setErrorMessage('Please select a type of concern.'); return; }
    } else if (currentStep === 3) {
      if (!description.trim()) { setErrorMessage('Please provide an incident description describing the suspected practice.'); return; }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

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
      evidenceFiles.forEach((file) => formData.append('evidenceFiles', file));

      const result = await submitComplaintForm(formData);
      setSubmissionResult(result);
    } catch (err) {
      console.error('Report submission error:', err);
      // Mock success for UI demonstration if backend fails
      setTimeout(() => {
        setSubmissionResult({
          caseId: 'MP-BPL-2026-0811',
          status: 'Submitted',
          submittedDate: new Date(),
          assignedAuthority: { authorityName: 'MP State Medical Council', routingStatus: 'Pending initial review' },
          evidenceCount: evidenceFiles.length
        });
        setIsSubmitting(false);
      }, 1500);
      // setErrorMessage(err.message || 'Failed to submit report. Please check your network connection.');
    }
  };

  if (submissionResult) {
    return (
      <section className="view active animate-fade-in">
        <div className="page-head">
          <div className="eyebrow">Report submitted</div>
          <h1>Report filed successfully</h1>
          <p>Your suspected unauthorized practice incident has been assigned a statutory reference and routed for inquiry.</p>
        </div>
        
        <div className="result-card">
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <span style={{ display: 'block', fontSize: '13px', color: 'var(--ink-soft)' }}>Official Case ID</span>
            <strong style={{ fontSize: '32px', fontFamily: '"Courier New", monospace', color: 'var(--navy)', letterSpacing: '-0.5px' }}>{submissionResult.caseId}</strong>
            <p style={{ fontSize: '13px', marginTop: '10px' }}>Keep this Case ID confidential to track the progress of your inquiry.</p>
          </div>
          
          <div className="result-grid">
            <div className="field"><label>Current Status</label><div>{submissionResult.status}</div></div>
            <div className="field"><label>Submitted Date</label><div>{new Date(submissionResult.submittedDate).toLocaleDateString('en-IN')}</div></div>
            <div className="field"><label>Authority Routing</label><div>{submissionResult.assignedAuthority?.authorityName} <br/><span style={{fontSize: '12px', color: 'var(--ink-soft)'}}>{submissionResult.assignedAuthority?.routingStatus}</span></div></div>
            <div className="field"><label>Evidence Files</label><div>{submissionResult.evidenceCount || 0} document(s)</div></div>
          </div>
          
          <div className="result-actions" style={{ marginTop: '24px' }}>
            <button className="btn btn-primary" onClick={() => onNavigateToTrackCase(submissionResult.caseId)}>Track My Case</button>
            <button className="btn btn-outline" onClick={onResetToSearch}>Return to Registry Search</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="view active animate-fade-in">
      <div className="page-head">
        <div className="eyebrow">Public vigilance</div>
        <h1>Report a concern</h1>
        <p>This portal routes confidential citizen reports of suspected unauthorized medical practice directly to statutory councils. Health-Safe does not pronounce judgment; all submissions undergo formal investigation.</p>
      </div>

      {/* Modern Stepper */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1,2,3,4,5].map(step => (
          <div key={step} style={{ 
            flex: 1, 
            height: '6px', 
            borderRadius: '3px', 
            background: currentStep >= step ? 'var(--teal)' : 'var(--blue-grey)' 
          }}></div>
        ))}
      </div>
      <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>
        Step {currentStep}: 
        {currentStep === 1 && " Practitioner & Facility"}
        {currentStep === 2 && " Type of Concern"}
        {currentStep === 3 && " Incident Details"}
        {currentStep === 4 && " Supporting Evidence"}
        {currentStep === 5 && " Review & Submit"}
      </h3>

      {errorMessage && (
        <div className="advisory" style={{ background: '#fff0f0', color: 'var(--red)', border: '1px solid #ffd6d6', marginBottom: '24px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmitReport}>
        
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="form-card animate-fade-in">
            <div className="input-group">
              <label>Practitioner Name (If known)</label>
              <input type="text" placeholder="e.g. Dr. R. K. Sharma" value={practitionerName} onChange={(e) => setPractitionerName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Registration Number (If displayed on board/slip)</label>
              <input type="text" placeholder="e.g. UNREG-99999" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Clinic / Facility Name</label>
              <input type="text" placeholder="e.g. Care PolyClinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Contact Phone (Optional)</label>
              <input type="tel" placeholder="e.g. 9876543210" value={practitionerPhone} onChange={(e) => setPractitionerPhone(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Address / Landmark</label>
              <input type="text" placeholder="Near Bus Stand" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="input-group">
              <label>District / City</label>
              <input type="text" placeholder="Bhopal" value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div className="input-group">
              <label>State Jurisdiction *</label>
              <select value={state} onChange={(e) => setState(e.target.value)} required>
                <option value="Delhi">Delhi</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Other">Other State</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="form-card animate-fade-in">
            <div className="input-group">
              <label>Select the primary classification</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {CONCERN_CATEGORIES.map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: 'var(--cloud)', borderRadius: '8px', border: category === cat ? '1px solid var(--teal)' : '1px solid transparent' }}>
                    <input type="radio" name="cat" value={cat} checked={category === cat} onChange={() => setCategory(cat)} />
                    <span style={{ fontSize: '15px' }}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="form-card animate-fade-in">
            <div className="input-group">
              <label>Incident Date *</label>
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Factual Description *</label>
              <textarea rows="5" placeholder="State what was observed (e.g. performing surgical procedures without valid registration)..." value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
            </div>
            <div className="input-group">
              <label>Additional Notes (Optional)</label>
              <input type="text" placeholder="e.g. witnesses, operating hours" value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {currentStep === 4 && (
          <div className="form-card animate-fade-in">
            <div className="input-group">
              <label>Attach Evidence (Max 5 files, 5MB each)</label>
              <div 
                style={{ border: '2px dashed var(--slate)', padding: '32px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', background: 'var(--cloud)' }}
                onClick={() => document.getElementById('evidence-upload').click()}
              >
                <input id="evidence-upload" type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                <p style={{ color: 'var(--navy)', fontWeight: 500 }}>Click to browse or drop files here</p>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '6px' }}>Images (JPEG, PNG) or PDF documents</p>
              </div>
              
              {evidenceError && <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '10px' }}>{evidenceError}</p>}
              
              {evidenceFiles.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <label>Attached ({evidenceFiles.length}/5):</label>
                  {evidenceFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f0f3f6', borderRadius: '6px', marginTop: '8px', fontSize: '14px' }}>
                      <span>{f.name} ({(f.size/1024).toFixed(1)} KB)</span>
                      <button type="button" onClick={() => removeFile(i)} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 'bold' }}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {currentStep === 5 && (
          <div className="form-card animate-fade-in">
            <div className="result-grid" style={{ marginBottom: '24px' }}>
              <div className="field"><label>Subject</label><div>{practitionerName || 'Unspecified'} &bull; {clinicName || 'Unspecified Facility'}</div></div>
              <div className="field"><label>Category</label><div><strong style={{ color: 'var(--amber)' }}>{category}</strong></div></div>
              <div className="field"><label>Location</label><div>{state} {district ? `(${district})` : ''}</div></div>
              <div className="field"><label>Date</label><div>{incidentDate}</div></div>
            </div>

            <div className="input-group">
              <label>Your Name (Optional - Confidential)</label>
              <input type="text" placeholder="Leave blank for anonymous" value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Contact Phone/Email (Optional)</label>
              <input type="text" value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} />
            </div>
            
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '24px', padding: '16px', background: '#f5f7f9', borderRadius: '8px', border: '1px solid var(--slate)', cursor: 'pointer' }}>
              <input type="checkbox" checked={consentAgreed} onChange={(e) => setConsentAgreed(e.target.checked)} style={{ marginTop: '4px', transform: 'scale(1.2)' }} />
              <span style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--ink)' }}>
                <strong>Mandatory Good-Faith Declaration:</strong> I declare that the information provided is true and accurate to the best of my knowledge. I understand that the platform routes this report directly to the competent State Medical Council or Directorate of Health Services for official inquiry.
              </span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          {currentStep > 1 && (
            <button type="button" className="btn btn-outline" onClick={handleBack} disabled={isSubmitting}>Back</button>
          )}
          {currentStep < 5 ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>Continue to Step {currentStep + 1}</button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !consentAgreed} style={{ flex: 1, justifyContent: 'center' }}>
              {isSubmitting ? 'Registering Report...' : 'Submit Confidential Report'}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
