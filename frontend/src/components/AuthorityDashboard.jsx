import React, { useState, useEffect, useCallback } from 'react';
import {
  getDemoAccounts,
  loginAuthority,
  takeCaseAction,
  getAuthorities,
  getDashboardSummary,
  getDashboardDistricts,
  getDashboardMap,
} from '../services/doctorApi';

import ComplaintMap from './ComplaintMap';
import CaseTable from './CaseTable';
import EvidenceLocker from './EvidenceLocker';
import CaseTimeline from './CaseTimeline';

export default function AuthorityDashboard({ onNavigateToCitizenTrack }) {
  const [authToken, setAuthToken] = useState(
    () => sessionStorage.getItem('healthsafe_auth_token') || 'auth-token-kmc-officer-2026'
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overview');

  const [summaryData, setSummaryData] = useState({});
  const [districtsData, setDistrictsData] = useState([]);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);

  const [externalFilter, setExternalFilter] = useState(null);

  const [selectedCase, setSelectedCase] = useState(null);
  const [dossierActiveTab, setDossierActiveTab] = useState('overview');
  const [actionType, setActionType] = useState('ACCEPT_CASE');
  const [actionNotes, setActionNotes] = useState('');
  const [officerNameInput, setOfficerNameInput] = useState('');
  const [targetStatusInput, setTargetStatusInput] = useState('UNDER_REVIEW');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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
        setErrorMessage('Session expired or unauthorized token. Please select an authorized officer.');
      } finally {
        setIsAuthLoading(false);
      }
    }
    loadAuth();
  }, [authToken]);

  const fetchIntelligenceData = useCallback(async () => {
    if (!authToken || !currentUser) return;
    setIsIntelligenceLoading(true);
    try {
      const [summaryRes, districtsRes, mapRes] = await Promise.all([
        getDashboardSummary(authToken),
        getDashboardDistricts(authToken),
        getDashboardMap(authToken),
      ]);
      if (summaryRes.success) setSummaryData(summaryRes.data || {});
      if (districtsRes.success) setDistrictsData(districtsRes.data || []);
      if (mapRes.success) setMapMarkers(mapRes.data || []);
    } catch (err) {
      console.error('[AuthorityDashboard] fetch error:', err);
    } finally {
      setIsIntelligenceLoading(false);
    }
  }, [authToken, currentUser]);

  useEffect(() => { fetchIntelligenceData(); }, [fetchIntelligenceData]);

  const handleAccountSwitch = (e) => {
    setAuthToken(e.target.value);
    setSelectedCase(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleKpiFilterClick = (filterKey) => {
    if (filterKey === 'ALL') setExternalFilter({ status: 'ALL', priority: 'ALL', district: 'ALL' });
    else if (filterKey === 'HIGH_PRIORITY') setExternalFilter({ priority: 'HIGH', status: 'ALL', district: 'ALL' });
    else setExternalFilter({ status: filterKey, priority: 'ALL', district: 'ALL' });
    setActiveTab('register');
  };

  const handleDistrictSelect = (district) => {
    setExternalFilter({ district });
    setActiveTab('register');
  };

  const handleInspectCase = (caseObj) => {
    setSelectedCase(caseObj);
    setDossierActiveTab('overview');
    setActionType('ACCEPT_CASE');
    setTargetStatusInput(caseObj.status || 'UNDER_REVIEW');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    setIsActionSubmitting(true);
    try {
      const response = await takeCaseAction(authToken, selectedCase.caseId, {
        actionType,
        notes: actionNotes,
        officerName: officerNameInput,
        targetStatus: targetStatusInput,
      });
      setSuccessMessage(`Action "${actionType}" recorded on Case ${selectedCase.caseId}.`);
      fetchIntelligenceData();
      setSelectedCase(prev => ({ ...prev, status: response.data.status }));
      setActionNotes('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to apply statutory action.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (isAuthLoading && !currentUser) {
    return (
      <section className="view active animate-fade-in">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--ink-faint)' }}>Verifying authority credentials…</p>
        </div>
      </section>
    );
  }

  const maxCount = districtsData.length > 0 ? Math.max(...districtsData.map(d => d.count || 0)) : 1;
  const initials = (currentUser?.name || 'AO').split(' ').map(w => w[0]).slice(0, 2).join('');

  return (
    <section className="view active animate-fade-in">

      {/* Officer Identity Strip */}
      <div className="officer-strip">
        <div className="officer-info">
          <div className="officer-avatar">{initials}</div>
          <div>
            <div className="officer-name">{currentUser?.name || 'Authorized Officer'}</div>
            <div className="officer-role">
              {currentUser?.designation || 'Statutory Vigilance Officer'} &bull; {currentUser?.authorityName} &bull; <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{currentUser?.state}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="auth-switcher-row">
            <label>Switch officer:</label>
            <select className="auth-select" value={authToken} onChange={handleAccountSwitch}>
              {demoAccounts.map(acc => (
                <option key={acc.token} value={acc.token}>{acc.name} — {acc.authorityName}</option>
              ))}
            </select>
          </div>
          <button className="btn-refresh" onClick={fetchIntelligenceData} title="Refresh live intelligence data">
            ↻ Refresh
          </button>
          <div className="officer-live-badge">
            <span className="officer-live-dot"></span>
            Live session
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="advisory" style={{ background: '#f0fdf4', color: '#0F6E56', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
          ✓ {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="advisory" style={{ background: '#fff0f0', color: 'var(--red)', border: '1px solid #ffd6d6', marginBottom: '20px' }}>
          ⚠ {errorMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="auth-nav-tabs">
        <button className={`auth-nav-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 Intelligence Overview
        </button>
        <button className={`auth-nav-btn ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>
          📋 Case Register
        </button>
        <button className={`auth-nav-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          🗺 Geographic Map
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card" onClick={() => handleKpiFilterClick('ALL')}>
              <div className="val">{isIntelligenceLoading ? '—' : (summaryData.totalCases ?? 0)}</div>
              <div className="lbl">Total Cases</div>
            </div>
            <div className="kpi-card" onClick={() => handleKpiFilterClick('UNDER_REVIEW')}>
              <div className="val">{isIntelligenceLoading ? '—' : (summaryData.underReview ?? 0)}</div>
              <div className="lbl">Under Review</div>
            </div>
            <div className="kpi-card flag" onClick={() => handleKpiFilterClick('HIGH_PRIORITY')}>
              <div className="val">{isIntelligenceLoading ? '—' : (summaryData.highPriority ?? 0)}</div>
              <div className="lbl">High Priority</div>
            </div>
            <div className="kpi-card" onClick={() => handleKpiFilterClick('RESOLVED')}>
              <div className="val">{isIntelligenceLoading ? '—' : (summaryData.resolved ?? 0)}</div>
              <div className="lbl">Resolved</div>
            </div>
          </div>

          {/* Dual grid */}
          <div className="dash-grid">
            {/* District bar chart */}
            <div className="panel">
              <h3>Reports by District</h3>
              {isIntelligenceLoading ? (
                <div className="spin-row"><span className="spinner"></span>Loading districts…</div>
              ) : districtsData.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>No district data yet</p>
              ) : (
                districtsData.slice(0, 8).map((d, i) => {
                  const pct = Math.round(((d.count || 0) / maxCount) * 100);
                  const cls = pct > 60 ? '' : pct > 30 ? 'mid' : 'low';
                  return (
                    <div className="district-row" key={i} onClick={() => handleDistrictSelect(d._id)}>
                      <div className="name">{d._id || 'Unknown'}</div>
                      <div className="bar-track">
                        <div className={`bar-fill ${cls}`} style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="count">{d.count}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Map */}
            <div className="panel">
              <h3>Intelligence Map</h3>
              <div style={{ height: '260px', borderRadius: '8px', overflow: 'hidden' }}>
                <ComplaintMap
                  markers={mapMarkers}
                  isLoading={isIntelligenceLoading}
                  onSelectCase={(id) => handleInspectCase({ caseId: id })}
                  selectedCaseId={selectedCase?.caseId}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTER TAB ── */}
      {activeTab === 'register' && (
        <div className="panel animate-fade-in">
          <CaseTable authToken={authToken} onInspectCase={handleInspectCase} externalFilter={externalFilter} />
        </div>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === 'map' && (
        <div className="panel animate-fade-in" style={{ height: '600px', padding: '0', overflow: 'hidden', borderRadius: '12px' }}>
          <ComplaintMap
            markers={mapMarkers}
            isLoading={isIntelligenceLoading}
            onSelectCase={(id) => handleInspectCase({ caseId: id })}
            selectedCaseId={selectedCase?.caseId}
          />
        </div>
      )}

      {/* ── CASE DOSSIER MODAL ── */}
      {selectedCase && (
        <div className="modal-overlay open" onClick={() => setSelectedCase(null)} style={{ zIndex: 999, alignItems: 'center' }}>
          <div className="dossier-modal" onClick={(e) => e.stopPropagation()}>

            {/* Dossier Header */}
            <div className="dossier-header">
              <div>
                <div className="dossier-eyebrow">STATUTORY CASE DOSSIER</div>
                <div className="dossier-case-id">{selectedCase.caseId}</div>
                <span className="dossier-status-chip">{selectedCase.status || 'PENDING'}</span>
              </div>
              <button className="dossier-close" onClick={() => setSelectedCase(null)} aria-label="Close">×</button>
            </div>

            {/* Dossier Tabs */}
            <div className="dossier-tabs">
              <button className={`dossier-tab ${dossierActiveTab === 'overview' ? 'active' : ''}`} onClick={() => setDossierActiveTab('overview')}>
                Facts
              </button>
              <button className={`dossier-tab ${dossierActiveTab === 'evidence' ? 'active' : ''}`} onClick={() => setDossierActiveTab('evidence')}>
                Evidence
              </button>
              <button className={`dossier-tab ${dossierActiveTab === 'timeline' ? 'active' : ''}`} onClick={() => setDossierActiveTab('timeline')}>
                Timeline
              </button>
              <button className={`dossier-tab action-tab ${dossierActiveTab === 'action' ? 'active' : ''}`} onClick={() => setDossierActiveTab('action')}>
                ⚡ Take Action
              </button>
            </div>

            {/* Dossier Body */}
            <div className="dossier-body">

              {/* Facts */}
              {dossierActiveTab === 'overview' && (
                <div className="animate-fade-in">
                  <div className="result-grid">
                    <div className="field"><label>Concern Classification</label><div>{selectedCase.category || '—'}</div></div>
                    <div className="field"><label>Practitioner</label><div>{selectedCase.practitionerName || selectedCase.practitionerDetails?.name || 'Unspecified'}</div></div>
                    <div className="field"><label>Claimed Registration</label><div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>{selectedCase.registrationNumber || selectedCase.practitionerDetails?.registrationNumber || 'None'}</div></div>
                    <div className="field"><label>Facility</label><div>{selectedCase.facilityName || selectedCase.facilityDetails?.clinicName || 'Unspecified'}</div></div>
                    <div className="field"><label>Jurisdiction</label><div>{selectedCase.district}, {selectedCase.state}</div></div>
                    <div className="field"><label>Assigned Authority</label><div>{selectedCase.assignedAuthorityName || 'State Medical Council'}</div></div>
                  </div>

                  {onNavigateToCitizenTrack && (
                    <div className="advisory" style={{ marginTop: '20px' }}>
                      Citizens querying this reference see sanitized statutory progress.{' '}
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ marginTop: '8px' }}
                        onClick={() => { setSelectedCase(null); onNavigateToCitizenTrack(selectedCase.caseId); }}
                      >
                        View citizen tracking →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Evidence */}
              {dossierActiveTab === 'evidence' && (
                <div className="animate-fade-in">
                  <EvidenceLocker caseId={selectedCase.caseId} isOfficer={true} authToken={authToken} />
                </div>
              )}

              {/* Timeline */}
              {dossierActiveTab === 'timeline' && (
                <div className="animate-fade-in">
                  <CaseTimeline caseId={selectedCase.caseId} isOfficer={true} authToken={authToken} />
                </div>
              )}

              {/* Action Form */}
              {dossierActiveTab === 'action' && (
                <form onSubmit={handleActionSubmit} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="input-group">
                    <label>Regulatory Action Measure *</label>
                    <select value={actionType} onChange={(e) => setActionType(e.target.value)} required>
                      <option value="ACCEPT_CASE">Accept Case & Initiate Formal Inquiry</option>
                      <option value="ASSIGN_OFFICER">Assign Investigating Vigilance Officer</option>
                      <option value="REQUEST_EVIDENCE">Request Supplementary Documents</option>
                      <option value="ADD_NOTE">Add Confidential Investigation Note</option>
                      <option value="RECORD_ACTION">Record Statutory Regulatory Action</option>
                      <option value="CHANGE_STATUS">Update Statutory Investigation Status</option>
                      <option value="CLOSE_CASE">Close Inquiry</option>
                    </select>
                  </div>

                  {actionType === 'ASSIGN_OFFICER' && (
                    <div className="input-group">
                      <label>Investigating Officer Name *</label>
                      <input type="text" placeholder="e.g. Dr. Rajesh Verma" value={officerNameInput} onChange={(e) => setOfficerNameInput(e.target.value)} required />
                    </div>
                  )}

                  {['CHANGE_STATUS', 'ACCEPT_CASE'].includes(actionType) && (
                    <div className="input-group">
                      <label>Target Case Status *</label>
                      <select value={targetStatusInput} onChange={(e) => setTargetStatusInput(e.target.value)}>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="INVESTIGATION">INVESTIGATION</option>
                        <option value="ACTION_TAKEN">ACTION_TAKEN</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                  )}

                  <div className="input-group">
                    <label>Officer Findings & Notes *</label>
                    <textarea
                      rows="4"
                      placeholder="Detail the statutory rationale, inspection findings, or directives…"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setSelectedCase(null)}>
                      Close
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isActionSubmitting} style={{ flex: 1, justifyContent: 'center' }}>
                      {isActionSubmitting ? 'Recording action…' : 'Confirm Statutory Action'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
