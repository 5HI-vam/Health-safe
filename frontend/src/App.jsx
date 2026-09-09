import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import DisclaimerBanner from './components/DisclaimerBanner';
import SearchBox from './components/SearchBox';
import VerificationResultCard from './components/VerificationResultCard';
import NotFoundCard from './components/NotFoundCard';
import SearchResultsList from './components/SearchResultsList';
import ReportModal from './components/ReportModal';
import QRScannerView from './components/QRScannerView';
import ClinicQRModal from './components/ClinicQRModal';
import ReportComplaintForm from './components/ReportComplaintForm';
import TrackCaseView from './components/TrackCaseView';
import AuthorityDashboard from './components/AuthorityDashboard';
import PatientSafetyView from './components/PatientSafetyView';
import {
  verifyDoctor,
  searchDoctors,
  getRegistryMetadata,
  checkBackendHealth,
} from './services/doctorApi';

export default function App() {
  // Navigation: 'manual' (Phase 1) | 'qr' (Phase 2) | 'report' (Phase 3) | 'track' (Phase 3)
  const [activeTab, setActiveTab] = useState('manual');

  // Phase 1 Search States
  const [verificationResult, setVerificationResult] = useState(null);
  const [multiSearchResults, setMultiSearchResults] = useState(null);
  const [lastSearchedRegNo, setLastSearchedRegNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Metadata & System Status
  const [councils, setCouncils] = useState([]);
  const [states, setStates] = useState([]);
  const [isApiOnline, setIsApiOnline] = useState(true);

  // Phase 2 Badges & Simulated Payloads
  const [isClinicBadgesOpen, setIsClinicBadgesOpen] = useState(false);
  const [simulatedQRPayload, setSimulatedQRPayload] = useState(null);

  // Phase 3 Reporting & Case Tracking
  const [reportPrefillData, setReportPrefillData] = useState({});
  const [trackedCaseId, setTrackedCaseId] = useState('');

  // Fallback modal (also wired to redirect to full multi-step form)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalData, setReportModalData] = useState({});

  // Initialize registry metadata and health status
  useEffect(() => {
    async function initializePortal() {
      try {
        const health = await checkBackendHealth();
        setIsApiOnline(health?.status === 'ok');

        const meta = await getRegistryMetadata();
        setCouncils(meta.councils || []);
        setStates(meta.states || []);
      } catch (err) {
        console.warn('Backend connection initialization:', err);
        setIsApiOnline(false);
      }
    }

    initializePortal();
  }, []);

  // Phase 1: Registration Verification
  const handleSearchRegistration = async (registrationNumber) => {
    setIsLoading(true);
    setErrorMessage(null);
    setMultiSearchResults(null);
    setVerificationResult(null);
    setLastSearchedRegNo(registrationNumber);

    try {
      const result = await verifyDoctor(registrationNumber);
      setVerificationResult(result);
    } catch (err) {
      console.error('Registration verification error:', err);
      setErrorMessage(err.message || 'Verification service temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 1: Directory Search
  const handleSearchNameState = async ({ name, state, council }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setVerificationResult(null);
    setMultiSearchResults(null);

    try {
      const searchResponse = await searchDoctors({ name, state, council });
      setMultiSearchResults(searchResponse);
    } catch (err) {
      console.error('Directory search error:', err);
      setErrorMessage(err.message || 'Unable to perform directory search.');
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 1: Doctor selection from list
  const handleSelectDoctor = (doctorDoc) => {
    setVerificationResult({
      status: doctorDoc.status === 'Active' ? 'Registration Verified' : 'Registration Found',
      isVerified: doctorDoc.status === 'Active',
      doctor: doctorDoc,
      source: doctorDoc.source,
      disclaimer: doctorDoc.disclaimer,
      lastVerifiedAt: doctorDoc.lastVerifiedAt,
      searchedQuery: { registrationNumber: doctorDoc.registrationNumber },
    });
    setTimeout(() => {
      document.getElementById('verification-result-card')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Phase 1 & 2 CTA: Directs user directly into the comprehensive Phase 3 reporting workflow
  const handleOpenReportWorkflow = (data = {}) => {
    setReportPrefillData(data);
    setActiveTab('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Phase 2: Simulate QR scan
  const handleSimulateScan = (qrPayloadString) => {
    setActiveTab('qr');
    setSimulatedQRPayload(qrPayloadString);
  };

  // Phase 3: Navigate from completed report directly to Case Tracker
  const handleNavigateToTrackCase = (caseId) => {
    setTrackedCaseId(caseId);
    setActiveTab('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setErrorMessage(null);
        }}
        onOpenClinicBadges={() => setIsClinicBadgesOpen(true)}
        apiOnline={isApiOnline}
      />

      <main className="main-content">
        {/* Mandatory Scope Disclaimer */}
        <DisclaimerBanner />

        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-pill-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Official Healthcare Credential & Vigilance Network
          </div>
          <h1 className="hero-heading">
            {activeTab === 'manual' && 'Verify Doctor Registration'}
            {activeTab === 'qr' && 'QR-based Doctor Verification'}
            {activeTab === 'report' && 'Report Suspected Unauthorized Practice'}
            {activeTab === 'track' && 'Track Investigation Case'}
          </h1>
          <p className="hero-subheading">
            {activeTab === 'manual' &&
              'Authenticate practitioner licensure against authoritative State Medical Council (SMC) and National Medical Commission (NMC) registry archives.'}
            {activeTab === 'qr' &&
              'Scan the official Health-Safe QR code displayed at doctor clinics to authenticate practitioner credentials via live statutory registry archives.'}
            {activeTab === 'report' &&
              'Submit confidential reports regarding suspected unlicensed practice, counterfeit credentials, or unauthorized facilities to state medical councils.'}
            {activeTab === 'track' &&
              'Monitor the administrative inquiry status and statutory authority routing for your registered case reference.'}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="app-error-banner animate-fade-in">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setErrorMessage(null)}
            >
              &times;
            </button>
          </div>
        )}

        {/* PHASE 1 VIEW: Manual Registry Search */}
        {activeTab === 'manual' && (
          <div className="manual-search-view animate-fade-in">
            <SearchBox
              onSearchRegistration={handleSearchRegistration}
              onSearchNameState={handleSearchNameState}
              councils={councils}
              states={states}
              isLoading={isLoading}
            />

            {isLoading && (
              <div className="loading-scanner-container animate-fade-in">
                <div className="scanner-radar"></div>
                <h3 className="loading-scanner-title">Querying Medical Council Registry</h3>
                <p className="loading-scanner-sub">
                  Cross-referencing registration records against verified state and national council archives...
                </p>
              </div>
            )}

            {!isLoading && verificationResult && verificationResult.doctor && (
              <VerificationResultCard result={verificationResult} />
            )}

            {!isLoading && verificationResult && !verificationResult.doctor && verificationResult.status === 'Registration Not Found' && (
              <NotFoundCard
                searchedQuery={verificationResult.searchedQuery || { registrationNumber: lastSearchedRegNo }}
                onOpenReportModal={handleOpenReportWorkflow}
              />
            )}

            {!isLoading && multiSearchResults && (
              <SearchResultsList
                searchData={multiSearchResults}
                onSelectDoctor={handleSelectDoctor}
              />
            )}
          </div>
        )}

        {/* PHASE 2 VIEW: QR Camera Scanner */}
        {activeTab === 'qr' && (
          <div className="qr-scanner-view animate-fade-in">
            <QRScannerView
              onOpenReportModal={handleOpenReportWorkflow}
              onOpenClinicBadges={() => setIsClinicBadgesOpen(true)}
              externalScannedPayload={simulatedQRPayload}
            />
          </div>
        )}

        {/* PHASE 3 VIEW: Multi-Step "Report Suspected Unauthorized Practice" */}
        {activeTab === 'report' && (
          <div className="report-practice-view animate-fade-in">
            <ReportComplaintForm
              initialData={reportPrefillData}
              onNavigateToTrackCase={handleNavigateToTrackCase}
              onResetToSearch={() => setActiveTab('manual')}
            />
          </div>
        )}

        {/* PHASE 3 VIEW: "Track My Case" Portal */}
        {activeTab === 'track' && (
          <div className="track-case-view animate-fade-in">
            <TrackCaseView
              initialCaseId={trackedCaseId}
              onNavigateToReport={() => setActiveTab('report')}
            />
          </div>
        )}

        {/* PHASE 4 VIEW: Authority Review & Case Routing Dashboard */}
        {activeTab === 'authority' && (
          <div className="authority-dashboard-view animate-fade-in">
            <AuthorityDashboard
              onNavigateToCitizenTrack={(caseId) => {
                setTrackedCaseId(caseId);
                setActiveTab('track');
              }}
            />
          </div>
        )}

        {/* PHASE 7 VIEW: Patient Safety & Care Grievance */}
        {activeTab === 'safety' && (
          <div className="patient-safety-view animate-fade-in">
            <PatientSafetyView
              onNavigateToTrackCase={handleNavigateToTrackCase}
              onResetToSearch={() => setActiveTab('manual')}
            />
          </div>
        )}
      </main>

      {/* Legacy/Quick Reporting Modal (Preserved from Phase 1) */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialData={reportModalData}
      />

      {/* Clinic Demonstration QR Badges Showcase (Phase 2) */}
      <ClinicQRModal
        isOpen={isClinicBadgesOpen}
        onClose={() => setIsClinicBadgesOpen(false)}
        onSimulateScan={handleSimulateScan}
      />

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            &copy; {new Date().getFullYear()} Health-Safe Platform &bull; Built for Patient Safety & Credential Integrity.
          </p>
          <p className="footer-disclaimer-note">
            Health-Safe cross-references registration data from statutory council archives. Citizen submissions represent suspected violations; formal findings and enforcement remain under the sole jurisdiction of designated statutory medical authorities.
          </p>
        </div>
      </footer>
    </div>
  );
}
