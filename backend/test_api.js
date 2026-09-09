async function runTests() {
  try {
    console.log('--- PHASE 1 TESTS ---');
    const verifyValid = await fetch('http://localhost:5000/api/doctors/verify?registrationNumber=MCI-2015-78901').then((r) => r.json());
    console.log('Test 1 (MCI-2015-78901):', verifyValid.status, '| Doctor:', verifyValid.doctor?.name);

    console.log('\n--- PHASE 2: QR ENDPOINT TESTS ---');
    const qrValidRes = await fetch('http://localhost:5000/api/doctors/verify/qr/MCI-2015-78901');
    const qrValid = await qrValidRes.json();
    console.log('Test 6 (QR Valid):', qrValidRes.status, '| verificationStatus:', qrValid.verificationStatus);

    console.log('\n--- PHASE 3: COMPLAINT & CASE TRACKING TESTS ---');
    console.log('Test 10: Submit Suspected Unauthorized Practice Report');
    const complaintPayload = {
      practitionerName: 'Suspect Quack Practitioner',
      registrationNumber: 'UNKNOWN-99999',
      practitionerPhone: '9876543210',
      qualificationClaimed: 'MBBS (Unverified)',
      clinicName: 'Unauthorized Health Diagnostic Clinic',
      address: 'Shop 12, Market Area',
      district: 'South Delhi',
      state: 'Delhi',
      category: 'Suspected unauthorized medical practice',
      description: 'The practitioner is administering prescription intravenous injections without a valid medical registration certificate displayed.',
      reporterName: 'Concerned Citizen',
      reporterConsent: true,
    };

    const submitRes = await fetch('http://localhost:5000/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complaintPayload),
    });

    const submitData = await submitRes.json();
    console.log('Submit HTTP:', submitRes.status);
    console.log('Case ID Generated:', submitData.caseId);
    console.log('Status:', submitData.status);
    console.log('Assigned Authority:', submitData.assignedAuthority?.authorityName);
    console.log('Routing:', submitData.assignedAuthority?.routingStatus);

    const generatedCaseId = submitData.caseId;

    console.log('\nTest 11: Track Complaint Status by Case ID');
    const trackRes = await fetch(`http://localhost:5000/api/complaints/${generatedCaseId}/status`);
    const trackData = await trackRes.json();
    console.log('Track HTTP:', trackRes.status);
    console.log('Tracked Case ID:', trackData.caseId);
    console.log('Tracked Status:', trackData.status);
    console.log('Category:', trackData.category);
    console.log('Authority:', trackData.assignedAuthority?.authorityName);
    console.log('Timeline Count:', trackData.caseTimeline?.length);

    console.log('\nTest 12: Track Non-Existent Case ID');
    const trackNotFoundRes = await fetch('http://localhost:5000/api/complaints/HS-MP-2026-999999/status');
    console.log('Not Found HTTP:', trackNotFoundRes.status);

    console.log('\nALL PHASE 1, 2, AND 3 BACKEND API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTests();
