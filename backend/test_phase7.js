const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

const AUTH_TOKENS = {
  KMC_OFFICER: 'auth-token-kmc-officer-2026',
  BLR_DHA_OFFICER: 'auth-token-blr-dha-2026',
  ADMIN: 'auth-token-admin-healthsafe-2026',
};

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runPhase7Tests() {
  console.log('=== HEALTH-SAFE PHASE 7 AUTOMATED VERIFICATION ===\n');

  try {
    // 1. Submit Patient Safety Grievance (Critical-care Concern)
    console.log('1. Submitting Patient Safety & Care Grievance (Critical-care Concern)...');
    const submitRes = await request('/patient-safety', {
      method: 'POST',
      body: JSON.stringify({
        facilityName: 'Bengaluru Tertiary Multi-Specialty Hospital',
        facilityAddress: 'HAL Airport Road',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        practitionerName: 'Dr. Suresh V.',
        registrationNumber: 'KMC-66219',
        specialization: 'Critical Care & Pulmonology',
        patientRelationship: 'Child',
        category: 'Critical-care concern',
        description:
          'I have a concern regarding information provided to my family about critical care/life-support. Communication on ventilator weaning protocols was unclear and contradictory.',
        incidentDate: new Date().toISOString(),
        isEmergency: false,
        reporterName: 'Sunita Sharma (Daughter)',
        reporterContact: 'sunita@patientfamily.in',
        reporterConsent: true,
      }),
    });

    assert.strictEqual(submitRes.status, 201, 'Grievance submission should return 201 Created');
    assert.strictEqual(submitRes.data.success, true, 'Grievance submission success should be true');
    const caseId = submitRes.data.caseId;
    console.log(`   Status: ${submitRes.status}, Generated Case ID: ${caseId}`);
    assert(caseId.startsWith('HS-PSC-'), 'Case ID should follow HS-PSC-YYYY-XXXXXX format');
    console.log(`   Category: ${submitRes.data.category}`);
    console.log(`   Assigned Priority: ${submitRes.data.priority}`);
    assert.strictEqual(submitRes.data.priority, 'CRITICAL', 'Critical-care concerns must default to CRITICAL priority');
    console.log(`   Routed Authority: ${submitRes.data.assignedAuthority?.authorityName}`);
    assert(submitRes.data.assignedAuthority?.authorityName, 'Assigned authority must be populated');

    // Verify statutory disclaimer is present
    console.log(`   Statutory Notice: ${submitRes.data.statutoryNotice?.substring(0, 60)}...`);
    assert(
      submitRes.data.statutoryNotice.includes('does not independently determine medical negligence'),
      'Statutory legal disclaimer must be present'
    );
    console.log('   ✓ Patient safety grievance registered and routed with statutory disclaimer.\n');

    // 2. Emergency Medical Advisory Verification
    console.log('2. Testing Emergency Medical Advisory for Active Emergency Submission...');
    const emergencyRes = await request('/patient-safety', {
      method: 'POST',
      body: JSON.stringify({
        facilityName: 'City Emergency Nursing Home',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        patientRelationship: 'Parent',
        category: 'Critical-care concern',
        description: 'Patient in ICU with immediate emergency distress and oxygen drop.',
        isEmergency: true,
        reporterConsent: true,
      }),
    });

    assert.strictEqual(emergencyRes.status, 201, 'Emergency grievance should return 201');
    assert(emergencyRes.data.emergencyAdvisory, 'Emergency advisory must be returned when emergency is indicated');
    console.log(`   Emergency Advisory: ${emergencyRes.data.emergencyAdvisory?.substring(0, 70)}...`);
    assert(
      emergencyRes.data.emergencyAdvisory.toLowerCase().includes('112') ||
        emergencyRes.data.emergencyAdvisory.toLowerCase().includes('emergency'),
      'Advisory must direct user to immediate emergency care'
    );
    console.log('   ✓ Emergency advisory prominently returned during active crisis indications.\n');

    // 3. Privacy Sanitization on Public Tracking
    console.log('3. Testing Privacy Sanitization on Public Tracking (GET /api/patient-safety/:caseId/status)...');
    const publicTrackRes = await request(`/patient-safety/${caseId}/status`);
    assert.strictEqual(publicTrackRes.status, 200, 'Public track should return 200 OK');
    console.log(`   Tracked Status: ${publicTrackRes.data.status}`);
    console.log(`   Facility: ${publicTrackRes.data.facilityName} (${publicTrackRes.data.district}, ${publicTrackRes.data.state})`);

    // Strict privacy checks: patient personal data must NEVER be exposed
    assert.strictEqual(publicTrackRes.data.patientRelationship, undefined, 'Public track MUST NOT expose patientRelationship');
    assert.strictEqual(publicTrackRes.data.description, undefined, 'Public track MUST NOT expose full grievance narrative description');
    assert.strictEqual(publicTrackRes.data.reporterDetails, undefined, 'Public track MUST NOT expose reporter details');
    console.log('   ✓ Patient health privacy strictly enforced on public tracking endpoints.\n');

    // 4. Unified Tracking via /api/complaints/:caseId/track
    console.log('4. Testing Unified Citizen Tracking Fallback (GET /api/complaints/:caseId/track)...');
    const unifiedTrackRes = await request(`/complaints/${caseId}/track`);
    assert.strictEqual(unifiedTrackRes.status, 200, 'Unified tracking should resolve HS-PSC-* case IDs');
    assert.strictEqual(unifiedTrackRes.data.caseId, caseId, 'Case ID should match');
    assert.strictEqual(unifiedTrackRes.data.status, 'SUBMITTED', 'Status should match');
    console.log('   ✓ Unified citizen tracking successfully resolves patient safety case IDs.\n');

    // 5. Timeline Verification
    console.log('5. Testing Audit Timeline for Patient Safety Case (GET /api/complaints/:caseId/timeline)...');
    const timelineRes = await request(`/complaints/${caseId}/timeline`);
    assert.strictEqual(timelineRes.status, 200, 'Timeline should return 200 OK');
    const events = timelineRes.data.events || [];
    console.log(`   Audit Events Count: ${events.length}`);
    events.forEach((ev) => {
      console.log(`   - ${ev.eventType}: ${ev.description}`);
    });
    assert(events.some((e) => e.eventType === 'CASE_CREATED'), 'Should have CASE_CREATED audit event');
    assert(events.some((e) => e.eventType === 'CASE_ROUTED'), 'Should have CASE_ROUTED audit event');
    console.log('   ✓ Immutable audit timeline records lifecycle events for grievance.\n');

    // 6. Authority Officer Review & Action Execution
    console.log('6. Testing Authority Officer Action on Grievance (POST /api/patient-safety/:caseId/action)...');
    const actionRes = await request(`/patient-safety/${caseId}/action`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AUTH_TOKENS.BLR_DHA_OFFICER}` },
      body: JSON.stringify({
        actionType: 'ACCEPT_CASE',
        targetStatus: 'UNDER_REVIEW',
        notes: 'Clinical inquiry initiated regarding critical-care communication. Case docket opened.',
      }),
    });

    assert.strictEqual(actionRes.status, 200, 'Action execution should return 200 OK');
    console.log(`   Updated Status: ${actionRes.data.data.status}`);
    assert.strictEqual(actionRes.data.data.status, 'UNDER_REVIEW', 'Status should be UNDER_REVIEW');

    // Verify Citizen Tracking reflects the updated status
    const updatedTrackRes = await request(`/patient-safety/${caseId}/status`);
    assert.strictEqual(updatedTrackRes.data.status, 'UNDER_REVIEW', 'Citizen tracking must reflect UNDER_REVIEW');
    console.log('   ✓ Officer action successfully updated grievance status and synchronized with citizen tracking.\n');

    console.log('=== ALL PHASE 7 BACKEND TESTS PASSED (100%) ===\n');
  } catch (err) {
    console.error('❌ Phase 7 test failed:', err);
    process.exit(1);
  }
}

runPhase7Tests();
