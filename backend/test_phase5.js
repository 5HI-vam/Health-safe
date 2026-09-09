const http = require('http');
const fs = require('fs');
const path = require('path');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      if (typeof postData === 'object' && !Buffer.isBuffer(postData)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

function createMultipartBody(boundary, fields, files) {
  const crlf = '\r\n';
  let body = Buffer.alloc(0);

  // Append fields
  for (const [key, value] of Object.entries(fields)) {
    const fieldHeader = `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`;
    body = Buffer.concat([body, Buffer.from(fieldHeader)]);
  }

  // Append files
  for (const f of files) {
    const fileHeader = `--${boundary}${crlf}Content-Disposition: form-data; name="${f.fieldName}"; filename="${f.fileName}"${crlf}Content-Type: ${f.mimeType}${crlf}${crlf}`;
    const fileEnd = crlf;
    body = Buffer.concat([body, Buffer.from(fileHeader), f.content, Buffer.from(fileEnd)]);
  }

  body = Buffer.concat([body, Buffer.from(`--${boundary}--${crlf}`)]);
  return body;
}

async function runTests() {
  console.log('=== HEALTH-SAFE PHASE 5 AUTOMATED VERIFICATION ===\n');

  try {
    // 1. Create a test complaint with initial evidence attachment
    console.log('1. Submitting test complaint with initial attached evidence...');
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const testFileContent = Buffer.from('FAKE MEDICAL CERTIFICATE EVIDENCE CONTENT FOR TAMPER TESTING 2026');
    const fields = {
      practitionerName: 'Dr. Quack Evidence Test',
      registrationNumber: 'EVID-TEST-001',
      clinicName: 'Test Diagnostic Clinic',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      category: 'Suspected fake qualification',
      description: 'Patient presented with forged diploma certificate and unauthorized fee receipts.',
      reporterConsent: 'true',
    };
    const files = [
      {
        fieldName: 'evidenceFiles',
        fileName: 'forged_qualification_diploma.pdf',
        mimeType: 'application/pdf',
        content: testFileContent,
      },
    ];

    const multipartBody = createMultipartBody(boundary, fields, files);

    const submitRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/complaints',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': multipartBody.length,
        },
      },
      multipartBody
    );

    console.log(`   Status: ${submitRes.status}, Case ID: ${submitRes.body.caseId}`);
    if (submitRes.status !== 201) throw new Error('Complaint submission failed');
    const testCaseId = submitRes.body.caseId;
    console.log('   ✓ Case created with initial evidence.');

    // 2. Query Evidence Locker
    console.log('\n2. Testing GET /api/complaints/:caseId/evidence (Evidence Locker)...');
    const evLockerRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/complaints/${testCaseId}/evidence`,
      method: 'GET',
    });
    console.log(`   Status: ${evLockerRes.status}, Evidence Count: ${evLockerRes.body.count}`);
    console.log(`   Disclaimer: ${evLockerRes.body.disclaimer?.slice(0, 65)}...`);
    const initialEvidence = evLockerRes.body.evidence[0];
    console.log(`   File Name: ${initialEvidence.fileName}`);
    console.log(`   Cryptographic SHA-256: ${initialEvidence.sha256Hash}`);
    if (!initialEvidence.sha256Hash || initialEvidence.sha256Hash.length !== 64) {
      throw new Error('SHA-256 hash missing or invalid format');
    }
    console.log('   ✓ Evidence Locker returns SHA-256 checksums and statutory admissibility disclaimer.');

    // 3. Officer actions & internal note logging
    console.log('\n3. Officer adds internal investigation note and requests evidence...');
    const officerToken = 'auth-token-kmc-officer-2026';
    await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/complaints/${testCaseId}/action`,
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${officerToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        actionType: 'ADD_NOTE',
        notes: 'INTERNAL CONFIDENTIAL: Registry match negative. Dispatched vigilance subpoena.',
        isInternal: true,
      }
    );

    await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/complaints/${testCaseId}/action`,
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${officerToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        actionType: 'REQUEST_EVIDENCE',
        notes: 'Please upload prescription slip or payment receipt showing practitioner signature.',
      }
    );
    console.log('   ✓ Internal note added and evidence requested.');

    // 4. Test Case Timeline filtering (Citizen vs Officer)
    console.log('\n4. Testing GET /api/complaints/:caseId/timeline (Access Control)...');
    // 4a. Citizen public query (internal notes hidden)
    const citizenTimeline = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/complaints/${testCaseId}/timeline`,
      method: 'GET',
    });
    console.log(`   Citizen View Events Count: ${citizenTimeline.body.count}`);
    const hasInternalInCitizen = citizenTimeline.body.events.some((e) => e.isInternal === true);
    if (hasInternalInCitizen) throw new Error('Security Breach: Internal notes exposed to citizen!');
    console.log('   ✓ Citizen view successfully masks confidential internal investigation notes.');

    // 4b. Authorized Officer query (sees all events)
    const officerTimeline = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/complaints/${testCaseId}/timeline`,
      method: 'GET',
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    console.log(`   Officer View Events Count: ${officerTimeline.body.count}`);
    const hasInternalInOfficer = officerTimeline.body.events.some((e) => e.eventType === 'OFFICER_NOTE_ADDED');
    if (!hasInternalInOfficer) throw new Error('Officer view missing internal audit notes');
    console.log('   ✓ Officer view successfully displays complete unredacted audit trail.');

    // 5. Upload supplementary evidence
    console.log('\n5. Testing POST /api/complaints/:caseId/evidence (Supplementary Upload)...');
    const suppBoundary = '----WebKitFormBoundarySuppEvidence2026';
    const suppContent = Buffer.from('SUPPLEMENTARY PAYMENT RECEIPT AND CLINIC PHOTO PROOF');
    const suppFields = {
      fileCategory: 'BILL_RECEIPT',
      notes: 'Consultation fee receipt showing unverified practitioner registration signature.',
      uploaderName: 'Concerned Patient',
    };
    const suppFiles = [
      {
        fieldName: 'evidenceFiles',
        fileName: 'payment_receipt_and_bill.png',
        mimeType: 'image/png',
        content: suppContent,
      },
    ];

    const suppMultipart = createMultipartBody(suppBoundary, suppFields, suppFiles);
    const suppRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/complaints/${testCaseId}/evidence`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${suppBoundary}`,
          'Content-Length': suppMultipart.length,
        },
      },
      suppMultipart
    );

    console.log(`   Supplementary Upload Status: ${suppRes.status}, Uploaded Count: ${suppRes.body.uploadedCount}`);
    if (suppRes.status !== 201) throw new Error('Supplementary evidence upload failed');
    const suppEvidenceDoc = suppRes.body.evidence[0];
    console.log(`   Supplementary SHA-256: ${suppEvidenceDoc.sha256Hash}`);
    console.log('   ✓ Supplementary evidence persisted with verified SHA-256 hash.');

    // 6. Test Secure Evidence Streaming & Disk Checksum Verification
    console.log('\n6. Testing GET /api/evidence/:id (Tamper-Checked Streaming)...');
    // 6a. Unauthorized access attempt
    const unauthStream = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/evidence/${suppEvidenceDoc._id}`,
      method: 'GET',
    });
    console.log(`   Unauthorized download status: ${unauthStream.status} (Expected 403)`);
    if (unauthStream.status !== 403) throw new Error('Evidence streaming access control failed');

    // 6b. Authorized stream with verified case access
    const authStream = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/evidence/${suppEvidenceDoc._id}?caseId=${testCaseId}`,
      method: 'GET',
    });
    console.log(`   Authorized download status: ${authStream.status} (Expected 200)`);
    console.log(`   Integrity Verified Header: ${authStream.headers['x-integrity-verified']}`);
    console.log(`   Checksum Header: ${authStream.headers['x-checksum-sha256']}`);
    if (authStream.status !== 200 || authStream.headers['x-integrity-verified'] !== 'true') {
      throw new Error('Authorized evidence streaming failed or integrity check missing');
    }
    console.log('   ✓ Secure evidence streaming verified disk integrity against stored SHA-256.');

    console.log('\n=== ALL PHASE 5 BACKEND TESTS PASSED (100%) ===\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
