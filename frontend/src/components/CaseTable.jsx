import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardCases } from '../services/doctorApi';

export default function CaseTable({ authToken, onInspectCase, externalFilter = null }) {
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Handle external filter updates (from KPI cards or District cards)
  useEffect(() => {
    if (!externalFilter) return;

    if (externalFilter.status) {
      setStatusFilter(externalFilter.status);
    }
    if (externalFilter.priority) {
      setPriorityFilter(externalFilter.priority);
    }
    if (externalFilter.district) {
      setDistrictFilter(externalFilter.district);
    }
  }, [externalFilter]);

  const fetchCases = useCallback(async () => {
    if (!authToken) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getDashboardCases(authToken, {
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter,
        category: categoryFilter,
        district: districtFilter,
        priority: priorityFilter,
        search: searchQuery,
        dateFrom,
        dateTo,
      });

      if (response.success) {
        setCases(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load case register.');
    } finally {
      setIsLoading(false);
    }
  }, [
    authToken,
    pagination.page,
    pagination.limit,
    statusFilter,
    categoryFilter,
    districtFilter,
    priorityFilter,
    searchQuery,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setDistrictFilter('ALL');
    setPriorityFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      default:
        return '';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return 'status-new';
      case 'UNDER_REVIEW':
      case 'INVESTIGATION':
        return 'status-under-review';
      case 'EVIDENCE_REQUESTED':
        return 'status-evidence-req';
      case 'ASSIGNED':
        return 'status-assigned';
      case 'ACTION_TAKEN':
        return 'status-action-taken';
      case 'RESOLVED':
        return 'status-resolved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  };

  return (
    <div className="case-table-card">
      <div className="case-table-header-row">
        <div className="table-title-block">
          <span className="table-sec-tag">Statutory Case Inquiries</span>
          <h3 className="table-sec-heading">Regulatory Case Register</h3>
        </div>
        <div className="table-stats-pill">
          <span>{pagination.total} registered cases</span>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="table-filters-container">
        <div className="filter-search-box">
          <input
            type="text"
            className="filter-input search-input"
            placeholder="Search Case ID, clinic, registration..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
        </div>

        <div className="filter-selects-grid">
          {/* Status Filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED (New)</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="EVIDENCE_REQUESTED">EVIDENCE_REQUESTED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="INVESTIGATION">INVESTIGATION</option>
            <option value="ACTION_TAKEN">ACTION_TAKEN</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {/* Category Filter */}
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Suspected unauthorized medical practice">Unauthorized Medical Practice</option>
            <option value="Suspected unauthorized clinic">Unauthorized Clinic</option>
            <option value="Suspected fake qualification">Fake Qualification</option>
            <option value="Suspected forged certificate">Forged Certificate</option>
            <option value="Person claiming to be a doctor without verification">Unverified Practitioner</option>
            <option value="Registration could not be verified">Registration Not Found</option>
            <option value="Other">Other Issues</option>
          </select>

          {/* Priority Filter */}
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* District Filter */}
          <select
            className="filter-select"
            value={districtFilter}
            onChange={(e) => {
              setDistrictFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <option value="ALL">All Districts</option>
            <option value="Bengaluru Urban">Bengaluru Urban</option>
            <option value="Bengaluru Rural">Bengaluru Rural</option>
            <option value="Mysuru">Mysuru</option>
            <option value="Central Delhi">Central Delhi</option>
            <option value="South Delhi">South Delhi</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Mumbai Suburban">Mumbai Suburban</option>
            <option value="Pune">Pune</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>

          {/* Reset Filters */}
          {(statusFilter !== 'ALL' ||
            categoryFilter !== 'ALL' ||
            districtFilter !== 'ALL' ||
            priorityFilter !== 'ALL' ||
            searchQuery ||
            dateFrom ||
            dateTo) && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
              title="Reset all search filters"
            >
              Reset Filters &times;
            </button>
          )}
        </div>
      </div>

      {errorMessage && <div className="table-error-banner">⚠ {errorMessage}</div>}

      {/* Cases Table */}
      <div className="table-scroll-container">
        {isLoading ? (
          <div className="table-loading-box">
            <div className="loading-spinner"></div>
            <span>Loading regulatory register records...</span>
          </div>
        ) : cases.length === 0 ? (
          <div className="table-empty-box">
            <div className="empty-icon">📂</div>
            <h4>No Cases Found Matching Filters</h4>
            <p>Adjust your search criteria or reset filters to display registered complaints.</p>
          </div>
        ) : (
          <table className="register-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Category</th>
                <th>District & Facility</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Assigned Officer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.caseId} className="register-row">
                  <td className="case-id-col">
                    <strong className="id-code">{c.caseId}</strong>
                    {c.evidenceCount > 0 && (
                      <span className="evidence-count-pill" title={`${c.evidenceCount} evidence file(s) attached`}>
                        📎 {c.evidenceCount}
                      </span>
                    )}
                  </td>
                  <td className="category-col">
                    <span className="cat-title">{c.category}</span>
                  </td>
                  <td className="location-col">
                    <span className="facility-title">{c.facilityName}</span>
                    <span className="district-subtitle">{c.district}, {c.state}</span>
                  </td>
                  <td className="priority-col">
                    <span className={`priority-chip ${getPriorityBadgeClass(c.priority)}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="status-col">
                    <span className={`status-pill ${getStatusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="date-col">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="officer-col">
                    <span className="officer-name">{c.assignedOfficer}</span>
                  </td>
                  <td className="actions-col">
                    <button
                      type="button"
                      className="btn-table-action"
                      onClick={() => onInspectCase && onInspectCase(c)}
                    >
                      Inspect & Action &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <div className="pagination-left">
          <span>
            Showing page <strong>{pagination.page}</strong> of{' '}
            <strong>{pagination.totalPages || 1}</strong> ({pagination.total} total cases)
          </span>
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            className="btn-page-nav"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            &larr; Previous
          </button>
          <span className="current-page-display">{pagination.page}</span>
          <button
            type="button"
            className="btn-page-nav"
            disabled={pagination.page >= pagination.totalPages || isLoading}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
