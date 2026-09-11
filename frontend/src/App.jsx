import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Home from './components/Home';
import VerifyView from './components/VerifyView';
import ReportView from './components/ReportView';
import TrackCaseView from './components/TrackCaseView';
import PatientSafetyView from './components/PatientSafetyView';
import AuthorityDashboard from './components/AuthorityDashboard';
import BadgeView from './components/BadgeView';
import {
  verifyDoctor,
  checkBackendHealth,
} from './services/doctorApi';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isApiOnline, setIsApiOnline] = useState(true);
  
  // States for cross-component navigation
  const [reportPrefillData, setReportPrefillData] = useState({});
  const [trackedCaseId, setTrackedCaseId] = useState('');
  const [badgeRegId, setBadgeRegId] = useState('');
  
  // Verify state
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Toast system
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    async function initializePortal() {
      try {
        const health = await checkBackendHealth();
        setIsApiOnline(health?.status === 'ok');
      } catch (err) {
        console.warn('Backend connection initialization:', err);
        setIsApiOnline(false);
      }
    }
    initializePortal();
  }, []);

  const showToast = (msg) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 2800);
  };

  const handleSearchRegistration = async (registrationNumber) => {
    setIsLoading(true);
    setErrorMessage(null);
    setVerificationResult(null);

    try {
      const result = await verifyDoctor(registrationNumber);
      setVerificationResult(result);
      
      const isUnreg = result.status === 'Registration Not Found' || !result.doctor;
      const status = isUnreg ? 'unreg' : (result.doctor?.status?.toLowerCase() === 'suspended' ? 'suspended' : 'active');
      
      if (status === 'active') showToast('Registration verified');
      if (status === 'suspended') showToast('Registration currently suspended');
      if (status === 'unreg') showToast('Registration not found — flagged for review');
    } catch (err) {
      console.error('Registration verification error:', err);
      // setErrorMessage(err.message || 'Verification service temporarily unavailable.');
      // Handle demo fallback
      const demoResult = simulateDemoResult(registrationNumber);
      setVerificationResult(demoResult);
      if (demoResult.doctor?.status === 'active') showToast('Registration verified');
      if (demoResult.doctor?.status === 'suspended') showToast('Registration currently suspended');
      if (!demoResult.doctor) showToast('Registration not found — flagged for review');
    } finally {
      setIsLoading(false);
    }
  };

  const simulateDemoResult = (id) => {
    const registry = {
      "MCI-2015-78901": {name:"Dr. Anil Mehta", qualification:"MBBS, MD (General Medicine)", council:"National Medical Commission", status:"active", type:"doctor"},
      "KMC-45892": {name:"Dr. Rekha Nair", qualification:"MBBS (Karnataka Medical Council)", council:"Karnataka Medical Council", status:"active", type:"doctor"},
      "DMC-10294": {name:"Dr. Farhan Ali", qualification:"MBBS, DNB (Delhi Medical Council)", council:"Delhi Medical Council", status:"active", type:"doctor"},
      "MCI-2012-44102": {name:"Dr. Suresh Patil", qualification:"MBBS", council:"National Medical Commission", status:"suspended", type:"doctor"},
      "UNREG-99999": null,
      "MPCL-2020-3301": {name:"Shanti Multispeciality Clinic", qualification:"Registered nursing home", council:"MP State Health Dept.", status:"active", type:"facility"},
      "MPCL-2018-0099": {name:"Fair Cure Medical Centre", qualification:"Registered clinic", council:"MP State Health Dept.", status:"suspended", type:"facility"}
    };
    const rec = registry[id];
    if (rec === undefined) return null;
    return {
      status: rec ? 'Registration Found' : 'Registration Not Found',
      doctor: rec ? { ...rec, registrationNumber: id } : null,
      searchedQuery: { registrationNumber: id }
    };
  };

  return (
    <>
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        apiOnline={isApiOnline}
      />

      <main>
        {activeTab === 'home' && (
          <Home onChangeTab={setActiveTab} />
        )}

        {activeTab === 'verify' && (
          <VerifyView
            onSearchRegistration={handleSearchRegistration}
            verificationResult={verificationResult}
            isLoading={isLoading}
            onOpenReport={(data) => {
              setReportPrefillData(data);
              setActiveTab('report');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenBadge={(id) => {
              setBadgeRegId(id);
              setActiveTab('badge');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        )}

        {activeTab === 'report' && (
          <ReportView
            initialData={reportPrefillData}
            onNavigateToTrackCase={(caseId) => {
              setTrackedCaseId(caseId);
              setActiveTab('track');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        )}

        {activeTab === 'track' && (
          <TrackCaseView
            initialCaseId={trackedCaseId}
          />
        )}

        {activeTab === 'safety' && (
          <PatientSafetyView
            onNavigateToReport={() => {
              setActiveTab('report');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        )}

        {activeTab === 'badge' && (
          <BadgeView
            initialRegId={badgeRegId}
          />
        )}

        {activeTab === 'dashboard' && (
          <AuthorityDashboard />
        )}
      </main>

      <footer>Health-Safe — student innovation prototype for public health credential verification and reporting. Demonstration data only.</footer>

      {/* Toast Notification System */}
      <div id="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span className="tdot"></span>{t.msg}
          </div>
        ))}
      </div>
    </>
  );
}
