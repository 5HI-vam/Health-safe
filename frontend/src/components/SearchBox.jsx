import React, { useState } from 'react';

export default function SearchBox({
  onSearchRegistration,
  onSearchNameState,
  councils = [],
  states = [],
  isLoading = false,
}) {
  const [searchMode, setSearchMode] = useState('regNo'); // 'regNo' | 'nameState'
  const [regNumber, setRegNumber] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCouncil, setSelectedCouncil] = useState('');

  const handleRegSubmit = (e) => {
    e.preventDefault();
    if (!regNumber.trim()) return;
    onSearchRegistration(regNumber.trim());
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!doctorName.trim() && !selectedState && !selectedCouncil) return;
    onSearchNameState({
      name: doctorName.trim(),
      state: selectedState,
      council: selectedCouncil,
    });
  };

  const handleQuickSample = (sampleReg) => {
    setSearchMode('regNo');
    setRegNumber(sampleReg);
    onSearchRegistration(sampleReg);
  };

  return (
    <div className="search-box-card">
      {/* Search Mode Tabs */}
      <div className="search-mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={searchMode === 'regNo'}
          className={`search-tab-btn ${searchMode === 'regNo' ? 'active' : ''}`}
          onClick={() => setSearchMode('regNo')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="16" x2="12" y2="16" />
          </svg>
          Search by Registration Number
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={searchMode === 'nameState'}
          className={`search-tab-btn ${searchMode === 'nameState' ? 'active' : ''}`}
          onClick={() => setSearchMode('nameState')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Search by Doctor Name & State
        </button>
      </div>

      {/* Mode 1: Search by Registration Number */}
      {searchMode === 'regNo' && (
        <form onSubmit={handleRegSubmit} className="search-form animate-fade-in">
          <div className="search-input-wrapper">
            <div className="input-icon-prefix">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              id="registration-input"
              type="text"
              className="search-input-field"
              placeholder="Enter registration number (e.g. MCI-2015-78901, KMC-45892)"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              autoComplete="off"
              spellCheck="false"
              required
            />
            <button
              id="verify-submit-btn"
              type="submit"
              className="search-action-btn"
              disabled={isLoading || !regNumber.trim()}
            >
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="spinner-icon"></span>
                  Verifying...
                </span>
              ) : (
                <>
                  <span>Verify Registration</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: Search by Name & State/Council */}
      {searchMode === 'nameState' && (
        <form onSubmit={handleNameSubmit} className="search-multi-form animate-fade-in">
          <div className="form-grid">
            <div className="form-field-group">
              <label htmlFor="doctor-name-input" className="form-label">
                Doctor Name
              </label>
              <input
                id="doctor-name-input"
                type="text"
                className="form-control"
                placeholder="e.g. Rajesh Sharma"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="state-select" className="form-label">
                State
              </label>
              <select
                id="state-select"
                className="form-control"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">All States</option>
                <option value="Delhi">Delhi</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                {states
                  .filter((s) => !['Delhi', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'West Bengal', 'Uttar Pradesh'].includes(s))
                  .map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="council-select" className="form-label">
                Medical Council (Optional)
              </label>
              <select
                id="council-select"
                className="form-control"
                value={selectedCouncil}
                onChange={(e) => setSelectedCouncil(e.target.value)}
              >
                <option value="">All Medical Councils</option>
                <option value="Medical Council of India">National Medical Commission / MCI</option>
                <option value="Delhi Medical Council">Delhi Medical Council</option>
                <option value="Karnataka Medical Council">Karnataka Medical Council</option>
                <option value="Maharashtra Medical Council">Maharashtra Medical Council</option>
                <option value="Tamil Nadu Medical Council">Tamil Nadu Medical Council</option>
                <option value="West Bengal Medical Council">West Bengal Medical Council</option>
                {councils
                  .filter((c) => !c.includes('Delhi') && !c.includes('Karnataka') && !c.includes('Maharashtra') && !c.includes('Tamil') && !c.includes('West') && !c.includes('National'))
                  .map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-actions-row">
            <button
              id="search-name-btn"
              type="submit"
              className="search-action-btn full-width"
              disabled={isLoading || (!doctorName.trim() && !selectedState && !selectedCouncil)}
            >
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="spinner-icon"></span>
                  Searching Directory...
                </span>
              ) : (
                <>
                  <span>Search Practitioner Directory</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Quick Demonstration Samples */}
      <div className="quick-samples-bar">
        <span className="quick-sample-label">Demonstration Samples:</span>
        <div className="quick-sample-pills">
          <button
            type="button"
            className="sample-pill verified"
            onClick={() => handleQuickSample('MCI-2015-78901')}
            title="Dr. Rajesh Sharma (NMC / Active)"
          >
            MCI-2015-78901 (Active)
          </button>
          <button
            type="button"
            className="sample-pill verified"
            onClick={() => handleQuickSample('KMC-45892')}
            title="Dr. Priya Venkatesh (Karnataka / Active)"
          >
            KMC-45892 (Karnataka)
          </button>
          <button
            type="button"
            className="sample-pill verified"
            onClick={() => handleQuickSample('DMC-10294')}
            title="Dr. Ananya Sen (Delhi / Active)"
          >
            DMC-10294 (Delhi)
          </button>
          <button
            type="button"
            className="sample-pill caution"
            onClick={() => handleQuickSample('MCI-2012-44102')}
            title="Dr. Arvind Mehra (Suspended)"
          >
            MCI-2012-44102 (Suspended)
          </button>
          <button
            type="button"
            className="sample-pill notfound"
            onClick={() => handleQuickSample('UNREG-99999')}
            title="Unregistered Number"
          >
            UNREG-99999 (Unregistered)
          </button>
        </div>
      </div>
    </div>
  );
}
