const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

const AUTH_TOKENS = {
  KMC_OFFICER: 'auth-token-kmc-officer-2026',
  BLR_DHA_OFFICER: 'auth-token-blr-dha-2026',
  DMC_OFFICER: 'auth-token-dmc-officer-2026',
  ADMIN: 'auth-token-admin-healthsafe-2026',
  CITIZEN: 'auth-token-citizen-public',
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

async function runPhase6Tests() {
  console.log('=== HEALTH-SAFE PHASE 6 AUTOMATED VERIFICATION ===\n');

  try {
    // 1. RBAC Check on Dashboard Endpoints
    console.log('1. Testing RBAC Access Control on /api/dashboard/summary...');
    const unauthRes = await request('/dashboard/summary');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return 401');

    const citizenRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.CITIZEN}` },
    });
    assert.strictEqual(citizenRes.status, 403, 'Citizen token should return 403 Forbidden for Authority Dashboard');
    console.log('   ✓ RBAC strictly guards intelligence dashboard endpoints.\n');

    // 2. Summary Aggregates
    console.log('2. Testing GET /api/dashboard/summary...');
    const summaryRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.ADMIN}` },
    });
    assert.strictEqual(summaryRes.status, 200, 'Summary should return 200 OK');
    assert.strictEqual(summaryRes.data.success, true, 'Summary success flag should be true');
    const summary = summaryRes.data.data;
    console.log(`   Total Reports: ${summary.totalReports}`);
    console.log(`   New Reports: ${summary.newReports}`);
    console.log(`   Under Review: ${summary.underReview}`);
    console.log(`   High Priority: ${summary.highPriority}`);
    console.log(`   Assigned: ${summary.assigned}`);
    console.log(`   Resolved: ${summary.resolved}`);
    assert(summary.totalReports > 0, 'Total reports should be greater than 0');
    console.log('   ✓ Summary metrics aggregated via MongoDB pipeline.\n');

    // 3. Category Aggregates
    console.log('3. Testing GET /api/dashboard/categories...');
    const categoriesRes = await request('/dashboard/categories', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.ADMIN}` },
    });
    assert.strictEqual(categoriesRes.status, 200, 'Categories should return 200 OK');
    assert(Array.isArray(categoriesRes.data.data), 'Categories should return an array');
    console.log(`   Categories count: ${categoriesRes.data.data.length}`);
    categoriesRes.data.data.slice(0, 3).forEach((c) => {
      console.log(`   - ${c.category}: ${c.count} cases (${c.percentage}%)`);
    });
    console.log('   ✓ Category breakdown aggregated.\n');

    // 4. District Heatmap Aggregates
    console.log('4. Testing GET /api/dashboard/districts...');
    const districtsRes = await request('/dashboard/districts', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.ADMIN}` },
    });
    assert.strictEqual(districtsRes.status, 200, 'Districts should return 200 OK');
    assert(Array.isArray(districtsRes.data.data), 'Districts should return an array');
    console.log(`   Districts count: ${districtsRes.data.data.length}`);
    districtsRes.data.data.slice(0, 3).forEach((d) => {
      console.log(`   - District: ${d.district} (${d.state}) | Reported cases: ${d.reportedCases} | Under review: ${d.casesUnderReview} | Trend: ${d.trend}`);
    });
    assert(districtsRes.data.statutoryNotice.includes('reported cases'), 'Statutory notice must be present');
    console.log('   ✓ District-level heatmap and category distribution aggregated.\n');

    // 5. Reports Over Time Trends
    console.log('5. Testing GET /api/dashboard/trends...');
    const trendsRes = await request('/dashboard/trends', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.ADMIN}` },
    });
    assert.strictEqual(trendsRes.status, 200, 'Trends should return 200 OK');
    assert(Array.isArray(trendsRes.data.data), 'Trends should return an array of date buckets');
    console.log(`   Trend date buckets: ${trendsRes.data.data.length}`);
    console.log('   ✓ Time-series trend metrics aggregated.\n');

    // 6. Map Markers and Privacy Verification
    console.log('6. Testing GET /api/dashboard/map (Sanitized Geographic Markers)...');
    const mapRes = await request('/dashboard/map', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.ADMIN}` },
    });
    assert.strictEqual(mapRes.status, 200, 'Map endpoint should return 200 OK');
    assert(mapRes.data.data.length > 0, 'Should return map markers');
    const sampleMarker = mapRes.data.data[0];
    console.log(`   Total map markers: ${mapRes.data.totalMarkers}`);
    console.log(`   Sample Marker: [${sampleMarker.coordinates.join(', ')}] | Category: ${sampleMarker.markerCategory} | Facility: ${sampleMarker.facilityName}`);
    
    // Privacy verification: sensitive fields must NOT be present
    assert.strictEqual(sampleMarker.reporterDetails, undefined, 'Map marker MUST NOT expose reporterDetails');
    assert.strictEqual(sampleMarker.reporterConsent, undefined, 'Map marker MUST NOT expose reporterConsent');
    assert.strictEqual(sampleMarker.investigationNotes, undefined, 'Map marker MUST NOT expose internal investigation notes');
    console.log('   ✓ Map data strictly sanitized with privacy protection.\n');

    // 7. Repeat & Related Case Detection
    console.log('7. Testing GET /api/dashboard/related-cases (Correlation Engine)...');
    // Case HS-MP-2026-000101 shares reg number KMC-88219-B and clinic "Bengaluru Ortho Care Clinic" with HS-MP-2026-000102
    const relatedRes = await request('/dashboard/related-cases?caseId=HS-MP-2026-000101', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.BLR_DHA_OFFICER}` },
    });
    assert.strictEqual(relatedRes.status, 200, 'Related cases should return 200 OK');
    assert.strictEqual(relatedRes.data.label, 'Potentially related cases', 'Label must be strictly "Potentially related cases"');
    console.log(`   Source Case: ${relatedRes.data.sourceCaseId}`);
    console.log(`   Label: "${relatedRes.data.label}"`);
    console.log(`   Related Cases Found: ${relatedRes.data.totalFound}`);
    assert(relatedRes.data.totalFound >= 1, 'Should find at least 1 related case');
    const match = relatedRes.data.relatedCases[0];
    console.log(`   - Matched Case: ${match.caseId} | Score: ${match.relationshipScore} (${match.correlationStrength})`);
    console.log(`   - Reasons: ${match.reasons.join('; ')}`);
    assert(match.reasons.some((r) => r.includes('Registration Match')), 'Should detect registration match');
    console.log('   ✓ Repeat and related case correlation engine verified.\n');

    // 8. Server-Side Filtered & Paginated Case Register
    console.log('8. Testing GET /api/dashboard/cases (Server-side Filtering & Pagination)...');
    const pagedRes = await request('/dashboard/cases?page=1&limit=4&district=Bengaluru Urban', {
      headers: { Authorization: `Bearer ${AUTH_TOKENS.ADMIN}` },
    });
    assert.strictEqual(pagedRes.status, 200, 'Cases register should return 200 OK');
    assert(pagedRes.data.pagination, 'Pagination metadata should be returned');
    console.log(`   Page: ${pagedRes.data.pagination.page} / ${pagedRes.data.pagination.totalPages} (Total: ${pagedRes.data.pagination.total})`);
    console.log(`   Cases in page: ${pagedRes.data.data.length}`);
    assert(pagedRes.data.data.length <= 4, 'Should respect limit of 4');
    pagedRes.data.data.forEach((c) => {
      assert.strictEqual(c.district, 'Bengaluru Urban', 'District filter should be enforced server-side');
    });
    console.log('   ✓ Server-side filtering and pagination verified.\n');

    // 9. End-to-End Case Update & Citizen Timeline Sync
    console.log('9. Testing Case Action Update & Citizen Timeline Sync...');
    const testCaseId = 'HS-MP-2026-000104'; // Mysuru case currently SUBMITTED
    const updateRes = await request(`/complaints/${testCaseId}/action`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AUTH_TOKENS.KMC_OFFICER}` },
      body: JSON.stringify({
        actionType: 'ACCEPT_CASE',
        notes: 'Statutory inquiry opened following preliminary jurisdiction verification.',
        targetStatus: 'UNDER_REVIEW',
      }),
    });
    assert.strictEqual(updateRes.status, 200, 'Case action update should return 200 OK');
    console.log(`   Case ${testCaseId} transitioned to: ${updateRes.data.data?.status || 'UNDER_REVIEW'}`);

    // Verify Citizen Public Tracking reflects the update
    const citizenTrackRes = await request(`/complaints/${testCaseId}/track`);
    assert.strictEqual(citizenTrackRes.status, 200, 'Citizen track should return 200 OK');
    const citizenCaseStatus = citizenTrackRes.data.status || citizenTrackRes.data.data?.status;
    console.log(`   Citizen Tracking Status: ${citizenCaseStatus}`);
    assert.strictEqual(citizenCaseStatus, 'UNDER_REVIEW', 'Citizen tracking must reflect updated UNDER_REVIEW status');

    // Verify Citizen Timeline reflects the audit event
    const citizenTimelineRes = await request(`/complaints/${testCaseId}/timeline`);
    assert.strictEqual(citizenTimelineRes.status, 200, 'Timeline should return 200 OK');
    const events = citizenTimelineRes.data.events || citizenTimelineRes.data.data?.events || [];
    console.log(`   Citizen Visible Events Count: ${events.length}`);
    const latestEvent = events[events.length - 1];
    console.log(`   Latest Event: ${latestEvent.eventType} - ${latestEvent.description}`);
    assert(events.length >= 3, 'Timeline should have created, routed, and status changed events');
    console.log('   ✓ Case action update successfully synchronized with citizen tracking & timeline.\n');

    console.log('=== ALL PHASE 6 BACKEND TESTS PASSED (100%) ===\n');
  } catch (err) {
    console.error('❌ Phase 6 test failed:', err);
    process.exit(1);
  }
}

runPhase6Tests();
