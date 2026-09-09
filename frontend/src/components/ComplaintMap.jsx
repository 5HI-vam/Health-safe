import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const CATEGORY_COLORS = {
  'Unauthorized practitioner': {
    primary: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.2)',
    border: '#dc2626',
    icon: '⚕',
  },
  'Facility concern': {
    primary: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.2)',
    border: '#d97706',
    icon: '🏥',
  },
  'Patient safety concern': {
    primary: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.2)',
    border: '#9333ea',
    icon: '⚠',
  },
  'Billing concern': {
    primary: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.2)',
    border: '#0891b2',
    icon: '🧾',
  },
};

function createCustomPin(markerCategory) {
  const conf = CATEGORY_COLORS[markerCategory] || CATEGORY_COLORS['Unauthorized practitioner'];
  const html = `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      background: ${conf.primary};
      border: 2px solid #ffffff;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        color: #ffffff;
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
      ">${conf.icon}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function ComplaintMap({
  markers = [],
  isLoading = false,
  onSelectCase,
  selectedCaseId = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  const filteredMarkers = markers.filter((m) => {
    if (activeCategoryFilter === 'ALL') return true;
    return m.markerCategory === activeCategoryFilter;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Bengaluru center with reasonable India zoom
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  // Update Markers when data or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    if (filteredMarkers.length === 0) return;

    const bounds = L.latLngBounds();

    filteredMarkers.forEach((item) => {
      if (
        !item.coordinates ||
        !Array.isArray(item.coordinates) ||
        item.coordinates.length !== 2 ||
        isNaN(item.coordinates[0]) ||
        isNaN(item.coordinates[1])
      ) {
        return;
      }

      const [lat, lng] = item.coordinates;
      bounds.extend([lat, lng]);

      const pinIcon = createCustomPin(item.markerCategory);
      const marker = L.marker([lat, lng], { icon: pinIcon });

      const conf = CATEGORY_COLORS[item.markerCategory] || CATEGORY_COLORS['Unauthorized practitioner'];

      const popupContent = document.createElement('div');
      popupContent.className = 'leaflet-custom-popup';
      popupContent.innerHTML = `
        <div style="font-family: inherit; color: #f8fafc; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 13px; color: #38bdf8;">${item.caseId}</span>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: #cbd5e1;">${item.status}</span>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: ${conf.primary}; margin-bottom: 4px;">
            ${item.markerCategory}
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">
            ${item.facilityName}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
            ${item.district}, ${item.state}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
            <span style="font-size: 10px; color: #64748b;">${new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
            <button id="btn-inspect-${item.caseId}" style="
              background: #0284c7;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 3px 8px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">Inspect Case &rarr;</button>
          </div>
        </div>
      `;

      // Attach click event for inspecting case
      const inspectBtn = popupContent.querySelector(`#btn-inspect-${item.caseId}`);
      if (inspectBtn) {
        inspectBtn.onclick = (e) => {
          e.preventDefault();
          if (onSelectCase) onSelectCase(item.caseId);
        };
      }

      marker.bindPopup(popupContent, {
        className: 'dark-leaflet-popup',
        closeButton: true,
      });

      marker.addTo(layerGroupRef.current);
    });

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 13,
      });
    }
  }, [filteredMarkers, onSelectCase]);

  const categories = [
    { key: 'ALL', label: 'All Markers', count: markers.length },
    {
      key: 'Unauthorized practitioner',
      label: 'Unauthorized Practitioner',
      count: markers.filter((m) => m.markerCategory === 'Unauthorized practitioner').length,
      color: '#ef4444',
    },
    {
      key: 'Facility concern',
      label: 'Facility Concern',
      count: markers.filter((m) => m.markerCategory === 'Facility concern').length,
      color: '#f59e0b',
    },
    {
      key: 'Patient safety concern',
      label: 'Patient Safety',
      count: markers.filter((m) => m.markerCategory === 'Patient safety concern').length,
      color: '#a855f7',
    },
    {
      key: 'Billing concern',
      label: 'Billing Concern',
      count: markers.filter((m) => m.markerCategory === 'Billing concern').length,
      color: '#06b6d4',
    },
  ];

  return (
    <div className="complaint-map-wrapper">
      <div className="map-controls-bar">
        <div className="map-title-strip">
          <span className="map-title">Geographic Complaint Distribution</span>
          <span className="map-marker-counter">
            {filteredMarkers.length} locations rendered
          </span>
        </div>

        <div className="map-category-toggles">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`map-filter-chip ${activeCategoryFilter === c.key ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter(c.key)}
            >
              {c.color && (
                <span className="category-dot" style={{ background: c.color }}></span>
              )}
              <span>{c.label}</span>
              <span className="filter-count-badge">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="map-container-relative">
        {isLoading && (
          <div className="map-loading-overlay">
            <div className="loading-spinner"></div>
            <span>Plotting regulatory geographic coordinates...</span>
          </div>
        )}
        <div ref={mapContainerRef} className="leaflet-map-canvas" style={{ minHeight: '440px' }} />
      </div>

      <div className="map-statutory-disclaimer">
        <span className="disclaimer-icon">⚖</span>
        <p>
          <strong>Statutory Notice:</strong> Geographic markers represent reported inquiry locations
          submitted for regulatory review. Geographic marker density does NOT prove that an area, clinic,
          or practitioner is guilty or operating unlawfully.
        </p>
      </div>
    </div>
  );
}
