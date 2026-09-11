import React, { useState, useEffect, useCallback } from 'react';
import {
  getDemoAccounts,
  loginAuthority,
  takeCaseAction,
  reRouteCase,
  getAuthorities,
  getDashboardSummary,
  getDashboardDistricts,
  getDashboardMap,
  getDashboardTrends,
} from '../services/doctorApi';

import StatisticsCards from './StatisticsCards';
import ComplaintMap from './ComplaintMap';
import DistrictSummary from './DistrictSummary';
import CaseTable from './CaseTable';
import RelatedCases from './RelatedCases';
import EvidenceLocker from './EvidenceLocker';
import CaseTimeline from './CaseTimeline';

export default function AuthorityDashboard({ onNavigateToCitizenTrack }) {
  // Authentication State
  const [authToken, setAuthToken] = useState(
    () => sessionStorage.getItem('healthsafe_auth_token') || 'auth-token-kmc-officer-2026'
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Active Dashboard View Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'register' | 'map' | 'rules'

  // Intelligence Metrics State
  const [summaryData, setSummaryData] = useState({});
  const [districtsData, setDistrictsData] = useState([]);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);

  // External Filter State (when clicking KPI cards or District cards)
  const [externalFilter, setExternalFilter] = useState(null);
  const [activeDistrictFilter, setActiveDistrictFilter] = useState('ALL');

  // Selected Case for Modal / Action Drawer
  const [selectedCase, setSelectedCase] = useState(null);
  const [dossierActiveTab, setDossierActiveTab] = useState('overview'); // 'overview' | 'related' | 'evidence' | 'timeline' | 'action'
  const [actionType, setActionType] = useState('ACCEPT_CASE');
  const [actionNotes, setActionNotes] = useState('');
  const [officerNameInput, setOfficerNameInput] = useState('');
  const [targetStatusInput, setTargetStatusInput] = useState('UNDER_REVIEW');
  const [actionRecordTypeInput, setActionRecordTypeInput] = useState('STATUTORY_NOTICE_SERVED');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Jurisdiction Rules List (Admin view)
  const [authoritiesList, setAuthoritiesList] = useState([]);

  // Messages
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load demo accounts & authenticate on mount or token change
  useEffect(() => {
    async function loadAuth() {
      setIsAuthLoading(true);
      try {
        const accounts = await getDemoAccounts();
        setDemoAccounts(accounts);

        if (authToken) {
          const authRes = await loginAuthority({ token: authToken });
          setCurrentUser(authRes.user);
          sessionStorage.setItem('healthsafe_auth_token', authToken);
        }
      } catch (err) {
        console.warn('Authority login initialization:', err);
        setErrorMessage('Session expired or unauthorized token. Please select an authorized officer.');
      } finally {
        setIsAuthLoading(false);
      }
    }

    loadAuth();
  }, [authToken]);

  // Fetch Intelligence Dashboard Data
  const fetchIntelligenceData = useCallback(async () => {
    if (!authToken || !currentUser) return;
    setIsIntelligenceLoading(true);

    try {
      const [summaryRes, districtsRes, mapRes, trendsRes, authsRes] = await Promise.all([
        getDashboardSummary(authToken),
        getDashboardDistricts(authToken),
        getDashboardMap(authToken),
        getDashboardTrends(authToken),
        getAuthorities(authToken).catch(() => ({ authorities: [] })),
      ]);

      if (summaryRes.success) setSummaryData(summaryRes.data || {});
      if (districtsRes.success) setDistrictsData(districtsRes.data || []);
      if (mapRes.success) setMapMarkers(mapRes.data || []);
      if (trendsRes.success) setTrendsData(trendsRes.data || []);
      if (authsRes.authorities) setAuthoritiesList(authsRes.authorities || []);
    } catch (err) {
      console.error('[AuthorityDashboard] Error fetching intelligence data:', err);
    } finally {
      setIsIntelligenceLoading(false);
    }
  }, [authToken, currentUser]);

  useEffect(() => {
    fetchIntelligenceData();
  }, [fetchIntelligenceData]);

  // Handle switching active officer account
  const handleAccountSwitch = (e) => {
    const newToken = e.target.value;
    setAuthToken(newToken);
    setSelectedCase(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // KPI card filter trigger -> switches to register tab with pre-applied filter
  const handleKpiFilterClick = (filterKey) => {
    if (filterKey === 'ALL') {
      setExternalFilter({ status: 'ALL', priority: 'ALL', district: 'ALL' });
    } else if (filterKey === 'HIGH_PRIORITY') {
      setExternalFilter({ priority: 'HIGH', status: 'ALL', district: 'ALL' });
    } else {
      setExternalFilter({ status: filterKey, priority: 'ALL', district: 'ALL' });
    }
    setActiveTab('register');
  };

  // District filter trigger -> filters case table to that district
  const handleDistrictSelect = (district) => {
    setActiveDistrictFilter(district);
    setExternalFilter({ district });
    setActiveTab('register');
  };

  // Handle Case Inspection Trigger
  const handleInspectCase = (caseObj) => {
    setSelectedCase(caseObj);
    setDossierActiveTab('overview');
    setActionType('ACCEPT_CASE');
    setTargetStatusInput(caseObj.status || 'UNDER_REVIEW');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Handle Submitting an Authorized Case Action
  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;

    setIsActionSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await takeCaseAction(authToken, selectedCase.caseId, {
        actionType,
        notes: actionNotes,
        officerName: officerNameInput,
        targetStatus: targetStatusInput,
        actionRecordType: actionRecordTypeInput,
      });

      setSuccessMessage(
        `Action "${actionType}" successfully executed on Case ${selectedCase.caseId}. Updated status: ${response.data.status}.`
      );

      // Refresh intelligence metrics
      fetchIntelligenceData();

      // Update local selected case
      setSelectedCase((prev) => ({
        ...prev,
        status: response.data.status,
      }));

      setActionNotes('');
    } catch (err) {
      console.error('Case action error:', err);
      setErrorMessage(err.message || 'Failed to apply statutory action.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (isAuthLoading && !currentUser) {
    return (
      <div className="authority-loading-screen">
        <div className="loading-spinner"></div>
        <span>Verifying authority credentials & regulatory permissions...</span>
      </div>
    );
  }

  return (
    <div className="authority-dashboard-container">
      {/* Officer Profile & Jurisdiction Header */}
      <div className="authority-top-bar">
        <div className="authority-identity">
          <div className="authority-shield-icon">ΓÜû</div>
          <div>
            <div className="officer-designation-badge">
              <span className="live-dot"></span>
              {currentUser?.designation || 'Statutory Vigilance Officer'}
            </div>
            <h2 className="officer-name">{currentUser?.name || 'Authorized Officer'}</h2>
            <div className="authority-name-sub">
              {currentUser?.authorityName} &bull; Jurisdiction: <strong>{currentUser?.state}</strong>
            </div>
          </div>
        </div>

        {/* Demo Switcher & Global Actions */}
        <div className="authority-controls">
          <div className="account-switcher-group">
            <label className="switch-lbl">Simulate Authority Profile:</label>
            <select
              className="account-select-dropdown"
              value={authToken}
              onChange={handleAccountSwitch}
            >
              {demoAccounts.map((acc) => (
                <option key={acc.token} value={acc.token}>
                  {acc.name} ({acc.authorityName})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-sync-registry"
            onClick={fetchIntelligenceData}
            title="Refresh live intelligence data"
          >
            Γå╗ Refresh Intel
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="authority-alert success-alert">Γ£ô {successMessage}</div>
      )}
      {errorMessage && (
        <div className="authority-alert error-alert">ΓÜá {errorMessage}</div>
      )}

      {/* Dashboard View Navigation Tabs */}
      <div className="authority-nav-tabs">
        <button
          type="button"
          className={`auth-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          ≡ƒôê Intelligence Overview
        </button>
        <button
          type="button"
          className={`auth-nav-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          ≡ƒôï Case Register & Table
        </button>
        <button
          type="button"
          className={`auth-nav-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          ≡ƒù║∩╕Å Geographic Map Studio ({mapMarkers.length})
        </button>
        <button
          type="button"
          className={`auth-nav-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          ΓÜû∩╕Å Jurisdiction Matrix
        </button>
      </div>

      {/* TAB 1: INTELLIGENCE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="tab-pane-content animate-fade-in">
          {/* KPI Cards Strip */}
          <StatisticsCards
            summary={summaryData}
            isLoading={isIntelligenceLoading}
            onFilterClick={handleKpiFilterClick}
          />

          <div className="overview-dual-grid">
            {/* Left: District Heatmap Summary */}
            <DistrictSummary
              districts={districtsData}
              isLoading={isIntelligenceLoading}
              onSelectDistrict={handleDistrictSelect}
              activeDistrict={activeDistrictFilter}
            />

            {/* Right: Interactive Geographic Map */}
            <div className="overview-map-card">
              <ComplaintMap
                markers={mapMarkers}
                isLoading={isIntelligenceLoading}
                onSelectCase={(caseId) => handleInspectCase({ caseId, status: 'UNDER_REVIEW' })}
                selectedCaseId={selectedCase?.caseId}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CASE REGISTER & TABLE */}
      {activeTab === 'register' && (
        <div className="tab-pane-content animate-fade-in">
          <CaseTable
            authToken={authToken}
            onInspectCase={handleInspectCase}
            externalFilter={externalFilter}
          />
        </div>
      )}

      {/* TAB 3: GEOGRAPHIC MAP STUDIO */}
      {activeTab === 'map' && (
        <div className="tab-pane-content animate-fade-in">
          <div className="full-map-studio-card">
            <ComplaintMap
              markers={mapMarkers}
              isLoading={isIntelligenceLoading}
              onSelectCase={(caseId) => handleInspectCase({ caseId, status: 'UNDER_REVIEW' })}
              selectedCaseId={selectedCase?.caseId}
            />
          </div>
        </div>
      )}

      {/* TAB 4: JURISDICTION RULES MATRIX */}
      {activeTab === 'rules' && (
        <div className="tab-pane-content animate-fade-in">
          <div className="admin-rules-container">
            <div className="admin-rules-header">
              <h3>Configured Statutory Authorities & Jurisdiction Matrix</h3>
              <p>Automated routing weights and jurisdiction coverage.</p>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-authorities-table">
                <thead>
                  <tr>
                    <th>Authority Display Name</th>
                    <th>Type</th>
                    <th>State</th>
                    <th>District</th>
                    <th>Categories Covered</th>
                    <th>Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {authoritiesList.map((auth) => (
                    <tr key={auth._id}>
                      <td>
                        <strong>{auth.name}</strong>
                        <span className="auth-code">Code: {auth.code}</span>
                      </td>
                      <td><span className="auth-type-pill">{auth.type}</span></td>
                      <td>{auth.state}</td>
                      <td>{auth.district || 'Statewide'}</td>
                      <td>{auth.categories?.slice(0, 2).join(', ')}</td>
                      <td>{auth.priorityRules?.weight || 10}</td>
                      <td><span className="status-dot active">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CASE DOSSIER & ACTION MODAL DRAWER */}
      {selectedCase && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedCase(null)}>
          <div className="modal-container action-drawer-large" onClick={(e) => e.stopPropagation()}>
            {/* Dossier Header */}
            <div className="modal-header">
              <div className="dossier-header-info">
                <span className="dossier-tag">STATUTORY CASE DOSSIER</span>
                <h3 className="dossier-case-id">{selectedCase.caseId}</h3>
                <span className={`status-pill ${selectedCase.status?.toLowerCase()}`}>
                  {selectedCase.status}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedCase(null)}
                aria-label="Close dossier"
              >
                &times;
              </button>
            </div>

            {/* Dossier Sub-Navigation */}
            <div className="dossier-nav-tabs">
              <button
                type="button"
                className={`dossier-tab-btn ${dossierActiveTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDossierActiveTab('overview')}
              >
                ≡ƒôä Facts & Details
              </button>
              <button
                type="button"
                className={`dossier-tab-btn ${dossierActiveTab === 'related' ? 'active' : ''}`}
                onClick={() => setDossierActiveTab('related')}
              >
                ≡ƒöù Potentially Related Cases
              </button>
              <button
                type="button"
                className={`dossier-tab-btn ${dossierActiveTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setDossierActiveTab('evidence')}
              >
                ≡ƒöÆ Evidence Locker
              </button>
              <button
                type="button"
                className={`dossier-tab-btn ${dossierActiveTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setDossierActiveTab('timeline')}
              >
                ΓÅ▒∩╕Å Audit Timeline
              </button>
              <button
                type="button"
                className={`dossier-tab-btn action-tab ${dossierActiveTab === 'action' ? 'active' : ''}`}
                onClick={() => setDossierActiveTab('action')}
              >
                ΓÜí Take Statutory Action
              </button>
            </div>

            {/* Dossier Body */}
            <div className="dossier-body-scroll">
              {/* SUBTAB 1: FACTS & DETAILS */}
              {dossierActiveTab === 'overview' && (
                <div className="dossier-tab-pane animate-fade-in">
                  <div className="dossier-facts-grid">
                    <div className="fact-box">
                      <span className="fact-lbl">Concern Classification:</span>
                      <strong className="fact-val">{selectedCase.category}</strong>
                    </div>
                    <div className="fact-box">
                      <span className="fact-lbl">Suspected Practitioner:</span>
                      <strong className="fact-val">
                        {selectedCase.practitionerName || selectedCase.practitionerDetails?.name || 'Unspecified'}
                      </strong>
                    </div>
                    <div className="fact-box">
                      <span className="fact-lbl">Claimed Registration:</span>
                      <strong className="fact-val code-val">
                        {selectedCase.registrationNumber || selectedCase.practitionerDetails?.registrationNumber || 'None Claimed'}
                      </strong>
                    </div>
                    <div className="fact-box">
                      <span className="fact-lbl">Facility / Clinic Name:</span>
                      <strong className="fact-val">
                        {selectedCase.facilityName || selectedCase.facilityDetails?.clinicName || 'Unspecified'}
                      </strong>
                    </div>
                    <div className="fact-box">
                      <span className="fact-lbl">Jurisdiction Location:</span>
                      <strong className="fact-val">
                        {selectedCase.district}, {selectedCase.state}
                      </strong>
                    </div>
                    <div className="fact-box">
                      <span className="fact-lbl">Assigned Authority:</span>
                      <strong className="fact-val">
                        {selectedCase.assignedAuthorityName || 'State Medical Council'}
                      </strong>
                    </div>
                  </div>

                  {/* Public Tracking Sync Preview */}
                  <div className="public-sync-card">
                    <div className="sync-info-block">
                      <span className="sync-lbl">Citizen Public Tracking View:</span>
                      <p className="sync-desc">
                        Citizens querying this reference on the public portal observe sanitized statutory progress:
                        <em> &ldquo;Your report has been routed for appropriate review.&rdquo;</em>
                      </p>
                    </div>
                    {onNavigateToCitizenTrack && (
                      <button
                        type="button"
                        className="btn-switch-to-citizen"
                        onClick={() => {
                          setSelectedCase(null);
                          onNavigateToCitizenTrack(selectedCase.caseId);
                        }}
                      >
                        View Citizen Tracking Perspective &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: POTENTIALLY RELATED CASES */}
              {dossierActiveTab === 'related' && (
                <div className="dossier-tab-pane animate-fade-in">
                  <RelatedCases
                    caseId={selectedCase.caseId}
                    authToken={authToken}
                    onSelectRelatedCase={(relatedId) => {
                      setSelectedCase({ caseId: relatedId, status: 'UNDER_REVIEW' });
                      setDossierActiveTab('overview');
                    }}
                  />
                </div>
              )}

              {/* SUBTAB 3: EVIDENCE LOCKER */}
              {dossierActiveTab === 'evidence' && (
                <div className="dossier-tab-pane animate-fade-in">
                  <EvidenceLocker
                    caseId={selectedCase.caseId}
                    isOfficer={true}
                    authToken={authToken}
                  />
                </div>
              )}

              {/* SUBTAB 4: AUDIT TIMELINE */}
              {dossierActiveTab === 'timeline' && (
                <div className="dossier-tab-pane animate-fade-in">
                  <CaseTimeline
                    caseId={selectedCase.caseId}
                    isOfficer={true}
                    authToken={authToken}
                  />
                </div>
              )}

              {/* SUBTAB 5: TAKE ACTION */}
              {dossierActiveTab === 'action' && (
                <div className="dossier-tab-pane animate-fade-in">
                  <form onSubmit={handleActionSubmit} className="action-form-styled">
                    <div className="form-field">
                      <label className="field-label">Regulatory Action Measure *</label>
                      <select
                        className="form-control"
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        required
                      >
                        <option value="ACCEPT_CASE">Accept Case & Initiate Formal Inquiry</option>
                        <option value="ASSIGN_OFFICER">Assign Investigating Vigilance Officer</option>
                        <option value="REQUEST_EVIDENCE">Request Supplementary Documents</option>
                        <option value="ADD_NOTE">Add Confidential Internal Investigation Note</option>
                        <option value="RECORD_ACTION">Record Statutory Regulatory Action</option>
                        <option value="CHANGE_STATUS">Update Statutory Investigation Status</option>
                        <option value="CLOSE_CASE">Close Inquiry (Resolve / Conclude)</option>
                      </select>
                    </div>

                    {actionType === 'ASSIGN_OFFICER' && (
                      <div className="form-field">
                        <label className="field-label">Investigating Officer Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Dr. Rajesh Verma / Smt. Kavitha N."
                          value={officerNameInput}
                          onChange={(e) => setOfficerNameInput(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {['CHANGE_STATUS', 'ACCEPT_CASE'].includes(actionType) && (
                      <div className="form-field">
                        <label className="field-label">Target Case Status *</label>
                        <select
                          className="form-control"
                          value={targetStatusInput}
                          onChange={(e) => setTargetStatusInput(e.target.value)}
                        >
                          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                          <option value="INVESTIGATION">INVESTIGATION</option>
                          <option value="ACTION_TAKEN">ACTION_TAKEN</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    )}

                    {actionType === 'RECORD_ACTION' && (
                      <div className="form-field">
                        <label className="field-label">Statutory Action Type *</label>
                        <select
                          className="form-control"
                          value={actionRecordTypeInput}
                          onChange={(e) => setActionRecordTypeInput(e.target.value)}
                        >
                          <option value="STATUTORY_NOTICE_SERVED">Formal Statutory Notice Served</option>
                          <option value="FACILITY_INSPECTION_ORDERED">Site Inspection Ordered</option>
                          <option value="LICENSE_SUSPENSION_ISSUED">Registration / License Suspended</option>
                          <option value="POLICE_COMPLAINT_LODGED">Forwarded to Law Enforcement</option>
                        </select>
                      </div>
                    )}

                    <div className="form-field">
                      <label className="field-label">Officer Findings & Action Notes *</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Detail the statutory rationale, inspection findings, or directives..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        required
                      ></textarea>
                    </div>

                    <div className="dossier-action-footer">
                      <button
                        type="button"
                        className="btn-cancel-action"
                        onClick={() => setSelectedCase(null)}
                      >
                        Close Dossier
                      </button>
                      <button
                        type="submit"
                        className="btn-execute-action"
                        disabled={isActionSubmitting}
                      >
                        {isActionSubmitting ? 'Recording Action...' : 'Confirm Statutory Action'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
