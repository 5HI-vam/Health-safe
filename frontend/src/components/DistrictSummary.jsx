import React from 'react';

export default function DistrictSummary({
  districts = [],
  isLoading = false,
  onSelectDistrict,
  activeDistrict = 'ALL',
}) {
  return (
    <div className="district-summary-card">
      <div className="district-summary-header">
        <div className="district-title-group">
          <span className="district-sec-subhead">District-Level Healthcare Inquiries</span>
          <h3 className="district-sec-title">Jurisdictional Case Density & Category Distribution</h3>
        </div>
        {activeDistrict !== 'ALL' && (
          <button
            type="button"
            className="btn-clear-district-filter"
            onClick={() => onSelectDistrict && onSelectDistrict('ALL')}
          >
            Clear District Filter ({activeDistrict}) &times;
          </button>
        )}
      </div>

      <div className="district-statutory-alert">
        <span className="alert-shield">ℹ</span>
        <p>
          <strong>Statutory Guidance:</strong> A higher number of reported cases in a district reflects
          reporting volume and citizen engagement. It does NOT prove that an area or practitioner is guilty.
          Labels strictly reflect <em>"Reported cases"</em> and <em>"Cases under review"</em>.
        </p>
      </div>

      {isLoading ? (
        <div className="districts-loading-state">
          <div className="loading-spinner"></div>
          <span>Aggregating jurisdictional district metrics...</span>
        </div>
      ) : districts.length === 0 ? (
        <div className="empty-districts-notice">
          <p>No district reports found in the current jurisdictional filter.</p>
        </div>
      ) : (
        <div className="district-cards-grid">
          {districts.map((d) => {
            const isSelected = activeDistrict === d.district;
            const total = d.reportedCases || 1;

            return (
              <div
                key={`${d.state}-${d.district}`}
                className={`district-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDistrict && onSelectDistrict(d.district)}
                role="button"
                tabIndex={0}
                title={`Filter case table to ${d.district}`}
              >
                <div className="district-card-top">
                  <div className="district-name-block">
                    <h4 className="district-title">{d.district}</h4>
                    <span className="district-state-label">{d.state}</span>
                  </div>
                  <span className={`trend-pill ${d.trend.toLowerCase()}`}>
                    {d.trend === 'INCREASING' && '↑ Trend Increasing'}
                    {d.trend === 'DECREASING' && '↓ Trend Decreasing'}
                    {d.trend === 'STABLE' && '→ Trend Stable'}
                  </span>
                </div>

                <div className="district-metrics-row">
                  <div className="district-metric-box">
                    <span className="dm-label">Reported cases</span>
                    <strong className="dm-value">{d.reportedCases}</strong>
                  </div>
                  <div className="district-metric-box">
                    <span className="dm-label">Cases under review</span>
                    <strong className="dm-value blue">{d.casesUnderReview}</strong>
                  </div>
                  <div className="district-metric-box">
                    <span className="dm-label">Resolved</span>
                    <strong className="dm-value green">{d.resolvedCount || 0}</strong>
                  </div>
                </div>

                {/* Category Distribution Mini Breakdown */}
                {d.categoryDistribution && (
                  <div className="district-cats-breakdown">
                    <span className="cats-heading">Category Distribution:</span>
                    <div className="cats-tag-list">
                      {Object.entries(d.categoryDistribution).map(([cat, count]) => {
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={cat} className="cat-distribution-tag" title={`${cat}: ${count} cases (${pct}%)`}>
                            <span className="cat-tag-name">{cat}</span>
                            <span className="cat-tag-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
