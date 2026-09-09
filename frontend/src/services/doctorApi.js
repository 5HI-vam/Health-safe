const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Verify doctor by registration number
 * @param {string} registrationNumber 
 */
export async function verifyDoctor(registrationNumber) {
  if (!registrationNumber || !registrationNumber.trim()) {
    throw new Error('Please enter a doctor registration number.');
  }

  const cleanRegNo = registrationNumber.trim();
  const url = `${API_BASE_URL}/doctors/verify?registrationNumber=${encodeURIComponent(cleanRegNo)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (response.status === 404) {
    // Standardized "Registration Not Found" response from backend
    return {
      status: 'Registration Not Found',
      isVerified: false,
      doctor: null,
      source: data.source || 'Medical Council Registry Archive',
      guidance: data.guidance,
      searchedQuery: data.searchedQuery || { registrationNumber: cleanRegNo },
      disclaimer: data.disclaimer,
    };
  }

  if (!response.ok) {
    throw new Error(data.error || `Server responded with status ${response.status}`);
  }

  return data;
}

/**
 * Multi-criteria search by name, state, and council
 */
export async function searchDoctors({ name = '', state = '', council = '', page = 1, limit = 20 }) {
  const params = new URLSearchParams();
  if (name.trim()) params.append('name', name.trim());
  if (state.trim()) params.append('state', state.trim());
  if (council.trim()) params.append('council', council.trim());
  params.append('page', page);
  params.append('limit', limit);

  const response = await fetch(`${API_BASE_URL}/doctors/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to search practitioner directory.');
  }

  return data;
}

/**
 * Retrieve list of Councils and States for filter dropdowns
 */
export async function getRegistryMetadata() {
  try {
    const response = await fetch(`${API_BASE_URL}/doctors/meta/councils`);
    if (!response.ok) return { councils: [], states: [] };
    const data = await response.json();
    return { councils: data.councils || [], states: data.states || [] };
  } catch {
    return { councils: [], states: [] };
  }
}

/**
 * Submit an unauthorized practice incident report
 */
export async function submitUnauthorizedPracticeReport(reportData) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit report. Please try again.');
  }

  return data;
}

/**
 * Verify doctor via QR identifier
 * Calls GET /api/doctors/verify/qr/:registrationNumber
 */
export async function verifyDoctorByQR(registrationNumber) {
  if (!registrationNumber || !registrationNumber.trim()) {
    throw new Error('Registration number identifier missing from QR.');
  }

  const cleanRegNo = registrationNumber.trim();
  const url = `${API_BASE_URL}/doctors/verify/qr/${encodeURIComponent(cleanRegNo)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (response.status === 404) {
    return {
      success: false,
      verificationStatus: 'NOT_FOUND',
      doctor: null,
      source: data.source || 'Medical Council Registry Archive',
      message: data.message || 'Registration could not be verified',
      guidance: data.guidance,
      verifiedAt: data.verifiedAt || new Date().toISOString(),
    };
  }

  if (!response.ok && response.status !== 200) {
    return {
      success: false,
      verificationStatus: data.verificationStatus || 'UNABLE_TO_VERIFY',
      doctor: data.doctor || null,
      source: data.source || 'Medical Council Registry Archive',
      message: data.message || data.error || 'Registration could not be verified',
      verifiedAt: data.verifiedAt || new Date().toISOString(),
    };
  }

  return data;
}

/**
 * Validate and safely extract the doctor identifier from raw scanned QR text
 * Zero-trust rule: rejects any QR that does not adhere strictly to { type: "HEALTH_SAFE_DOCTOR", registrationNumber: "..." }
 */
export function parseDoctorQRPayload(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      isValid: false,
      error: 'Invalid Health-Safe QR',
      reason: 'Empty or corrupt scan data.',
    };
  }

  try {
    const parsed = JSON.parse(rawText.trim());

    if (parsed && parsed.type === 'HEALTH_SAFE_DOCTOR' && parsed.registrationNumber) {
      const regNo = String(parsed.registrationNumber).trim();
      if (regNo.length > 0) {
        return {
          isValid: true,
          registrationNumber: regNo,
        };
      }
    }

    return {
      isValid: false,
      error: 'Invalid Health-Safe QR',
      reason: 'QR code does not contain a verified Health-Safe doctor badge signature.',
      rawPayload: rawText.slice(0, 100),
    };
  } catch {
    // If text was plain string or non-JSON
    return {
      isValid: false,
      error: 'Invalid Health-Safe QR',
      reason: 'Unrecognized format. Not an official Health-Safe credential QR.',
      rawPayload: rawText.slice(0, 100),
    };
  }
}

/**
 * Check backend health
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Phase 3: Submit suspected unauthorized practice complaint with evidence attachments
 * @param {FormData} formData 
 */
export async function submitComplaintForm(formData) {
  const response = await fetch(`${API_BASE_URL}/complaints`, {
    method: 'POST',
    body: formData, // fetch automatically sets multipart/form-data boundary
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit complaint report. Please check input fields.');
  }

  return data;
}

/**
 * Phase 3: Track complaint status by unique Case ID
 * @param {string} caseId (e.g. HS-MP-2026-000001)
 */
export async function trackComplaintStatus(caseId) {
  if (!caseId || !caseId.trim()) {
    throw new Error('Please enter a valid Case ID.');
  }

  const cleanId = caseId.trim().toUpperCase();
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(cleanId)}/status`);

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Case ID "${caseId}" could not be found.`);
  }

  return data;
}

/**
 * Phase 4: Fetch pre-configured demo authority accounts
 */
export async function getDemoAccounts() {
  const response = await fetch(`${API_BASE_URL}/auth/demo-accounts`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch demo accounts');
  return data.accounts || [];
}

/**
 * Phase 4: Authenticate authority officer or admin
 */
export async function loginAuthority({ token, username, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Authentication failed.');
  return data;
}

/**
 * Phase 4: Retrieve statutory authorities list
 */
export async function getAuthorities(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.type) params.append('type', filters.type);
  if (filters.district) params.append('district', filters.district);

  const response = await fetch(`${API_BASE_URL}/authorities?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load statutory authorities.');
  return data.authorities || [];
}

/**
 * Phase 4: Fetch authority officer's case queue with live KPIs (Protected RBAC)
 */
export async function getAuthorityCases(token, { filter = '', status = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (filter) params.append('filter', filter);
  if (status) params.append('status', status);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE_URL}/complaints/authority/cases?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unauthorized: Authority access required.');
  }
  return data;
}

/**
 * Phase 4: Officer action on case (accept, assign, request evidence, add note, record action, close)
 */
export async function takeCaseAction(token, caseId, actionPayload) {
  const cleanId = caseId.trim().toUpperCase();
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(cleanId)}/action`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(actionPayload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to record officer action.');
  }
  return data;
}

/**
 * Phase 4: Re-route complaint with routing engine or manual override
 */
export async function reRouteCase(token, caseId, overrideData = {}) {
  const cleanId = caseId.trim().toUpperCase();
  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(cleanId)}/route`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(overrideData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to route complaint.');
  }
  return data;
}

/**
 * Phase 5: Fetch immutable case audit timeline
 */
export async function getCaseTimeline(caseId, token = null) {
  if (!caseId || !caseId.trim()) throw new Error('Case ID is required');
  const cleanId = caseId.trim().toUpperCase();

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(cleanId)}/timeline`, {
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load case timeline.');
  return data;
}

/**
 * Phase 5: Fetch evidence locker files for a case with SHA-256 hashes
 */
export async function getCaseEvidence(caseId, token = null) {
  if (!caseId || !caseId.trim()) throw new Error('Case ID is required');
  const cleanId = caseId.trim().toUpperCase();

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(cleanId)}/evidence`, {
    headers,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load case evidence.');
  return data;
}

/**
 * Phase 5: Upload supplementary evidence to a case
 */
export async function uploadSupplementaryEvidence(caseId, formData, token = null) {
  if (!caseId || !caseId.trim()) throw new Error('Case ID is required');
  const cleanId = caseId.trim().toUpperCase();

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/complaints/${encodeURIComponent(cleanId)}/evidence`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to upload supplementary evidence.');
  return data;
}

/**
 * Phase 5: Get secure stream download URL for an evidence file
 */
export function getEvidenceDownloadUrl(evidenceId, caseId = '') {
  const params = new URLSearchParams();
  if (caseId) params.append('caseId', caseId.trim().toUpperCase());
  return `${API_BASE_URL}/evidence/${encodeURIComponent(evidenceId)}?${params.toString()}`;
}

/**
 * Phase 6: Get Authority Intelligence Dashboard Summary KPIs
 */
export async function getDashboardSummary(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);
  if (filters.district && filters.district !== 'ALL') params.append('district', filters.district);

  const res = await fetch(`${API_BASE_URL}/dashboard/summary?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard summary.');
  return data;
}

/**
 * Phase 6: Get Breakdown by Category
 */
export async function getDashboardCategories(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);
  if (filters.district && filters.district !== 'ALL') params.append('district', filters.district);

  const res = await fetch(`${API_BASE_URL}/dashboard/categories?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch category distribution.');
  return data;
}

/**
 * Phase 6: Get District-level Heatmap & Breakdown
 */
export async function getDashboardDistricts(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);

  const res = await fetch(`${API_BASE_URL}/dashboard/districts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch district distribution.');
  return data;
}

/**
 * Phase 6: Get Reports Over Time Trends
 */
export async function getDashboardTrends(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);

  const res = await fetch(`${API_BASE_URL}/dashboard/trends?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch trend data.');
  return data;
}

/**
 * Phase 6: Get Sanitized Geographic Markers for Map
 */
export async function getDashboardMap(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);
  if (filters.district && filters.district !== 'ALL') params.append('district', filters.district);
  if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);

  const res = await fetch(`${API_BASE_URL}/dashboard/map?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch geographic map points.');
  return data;
}

/**
 * Phase 6: Get Potentially Related Cases for a complaint
 */
export async function getDashboardRelatedCases(token, caseId) {
  if (!caseId) throw new Error('Case ID is required');
  const res = await fetch(`${API_BASE_URL}/dashboard/related-cases?caseId=${encodeURIComponent(caseId.trim())}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to identify potentially related cases.');
  return data;
}

/**
 * Phase 6: Get Server-Side Paginated & Filtered Cases Register
 */
export async function getDashboardCases(token, query = {}) {
  const params = new URLSearchParams();
  if (query.page) params.append('page', query.page);
  if (query.limit) params.append('limit', query.limit);
  if (query.status && query.status !== 'ALL') params.append('status', query.status);
  if (query.category && query.category !== 'ALL') params.append('category', query.category);
  if (query.district && query.district !== 'ALL') params.append('district', query.district);
  if (query.priority && query.priority !== 'ALL') params.append('priority', query.priority);
  if (query.search && query.search.trim()) params.append('search', query.search.trim());
  if (query.dateFrom) params.append('dateFrom', query.dateFrom);
  if (query.dateTo) params.append('dateTo', query.dateTo);

  const res = await fetch(`${API_BASE_URL}/dashboard/cases?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch cases register.');
  return data;
}

/**
 * Phase 7: Submit Patient Safety & Care Grievance
 */
export async function submitPatientSafetyGrievance(formData) {
  const response = await fetch(`${API_BASE_URL}/patient-safety`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to register patient safety grievance.');
  }
  return data;
}

/**
 * Phase 7: Get Patient Safety Grievance Status
 */
export async function getPatientSafetyGrievance(caseId) {
  if (!caseId || !caseId.trim()) throw new Error('Case ID is required');
  const cleanId = caseId.trim().toUpperCase();

  const response = await fetch(`${API_BASE_URL}/patient-safety/${encodeURIComponent(cleanId)}/status`, {
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load grievance details.');
  }
  return data;
}


