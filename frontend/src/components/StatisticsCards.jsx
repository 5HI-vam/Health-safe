import React from 'react';

export default function StatisticsCards({ summary = {}, isLoading = false, onFilterClick }) {
  const cards = [
    {
      id: 'total',
      filterKey: 'ALL',
      title: 'Total Reports',
      count: summary.totalReports ?? 0,
      icon: '📊',
      accentColor: '#38bdf8',
      bgGlow: 'rgba(56, 189, 248, 0.08)',
      borderColor: 'rgba(56, 189, 248, 0.25)',
      description: 'Total statutory inquiry records in scope',
    },
    {
      id: 'new',
      filterKey: 'SUBMITTED',
      title: 'New Reports',
      count: summary.newReports ?? 0,
      icon: '📥',
      accentColor: '#fbbf24',
      bgGlow: 'rgba(251, 191, 36, 0.08)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      badge: summary.newReports > 0 ? `${summary.newReports} action required` : null,
      description: 'Pending initial regulatory intake assessment',
    },
    {
      id: 'under_review',
      filterKey: 'UNDER_REVIEW',
      title: 'Under Review',
      count: summary.underReview ?? 0,
      icon: '🔍',
      accentColor: '#60a5fa',
      bgGlow: 'rgba(96, 165, 250, 0.08)',
      borderColor: 'rgba(96, 165, 250, 0.3)',
      description: 'Active inquiries under statutory verification',
    },
    {
      id: 'high_priority',
      filterKey: 'HIGH_PRIORITY',
      title: 'High Priority',
      count: summary.highPriority ?? 0,
      icon: '⚡',
      accentColor: '#f87171',
      bgGlow: 'rgba(248, 113, 113, 0.08)',
      borderColor: 'rgba(248, 113, 113, 0.3)',
      badge: summary.highPriority > 0 ? 'Urgent Alert' : null,
      description: 'Critical safety & severe unverified practice',
    },
    {
      id: 'assigned',
      filterKey: 'ASSIGNED',
      title: 'Assigned',
      count: summary.assigned ?? 0,
      icon: '👤',
      accentColor: '#c084fc',
      bgGlow: 'rgba(192, 132, 252, 0.08)',
      borderColor: 'rgba(192, 132, 252, 0.3)',
      description: 'Allocated to designated vigilance officers',
    },
    {
      id: 'resolved',
      filterKey: 'RESOLVED',
      title: 'Resolved',
      count: summary.resolved ?? 0,
      icon: '✓',
      accentColor: '#34d399',
      bgGlow: 'rgba(52, 211, 153, 0.08)',
      borderColor: 'rgba(52, 211, 153, 0.3)',
      description: 'Inquiries completed with statutory determination',
    },
  ];

  return (
    <div className="statistics-cards-grid">
      {cards.map((c) => (
        <div
          key={c.id}
          className="stat-card"
          style={{
            background: c.bgGlow,
            borderColor: c.borderColor,
          }}
          onClick={() => onFilterClick && onFilterClick(c.filterKey)}
          role="button"
          tabIndex={0}
          title={`Filter cases by ${c.title}`}
        >
          <div className="stat-card-header">
            <span className="stat-card-title">{c.title}</span>
            <div className="stat-icon-wrapper" style={{ color: c.accentColor }}>
              {c.icon}
            </div>
          </div>

          <div className="stat-card-body">
            <div className="stat-count-value" style={{ color: c.accentColor }}>
              {isLoading ? (
                <div className="stat-skeleton-pulse"></div>
              ) : (
                c.count.toLocaleString()
              )}
            </div>
            {c.badge && <span className="stat-badge-pill">{c.badge}</span>}
          </div>

          <div className="stat-card-footer">
            <span className="stat-desc-text">{c.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
