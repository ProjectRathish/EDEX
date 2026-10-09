import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Bus, Navigation, MapPin, Radio, Clock, Users, ArrowRight,
  RefreshCw, Search, Phone, Gauge, Compass, AlertTriangle,
  CheckCircle2, ChevronRight, Eye, Layers, Maximize2, Zap,
  School, Sliders, Activity, Filter, Info, Route, ShieldAlert,
  Lock, Check, X, ChevronDown, ChevronUp, Crosshair, ListOrdered, Square
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { BusService } from '../services/api';

// ── Leaflet Default Icons Fix ──────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Dedicated School Bus Badge Icon (Side View Profile) ───────────────────────
function SchoolBusBadgeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* School bus yellow chassis */}
      <rect x="2" y="5" width="20" height="12" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
      {/* Black bumper */}
      <rect x="1" y="14" width="22" height="2" rx="0.5" fill="#1e293b" />
      {/* Front Windshield */}
      <path d="M16 6.5 L20.5 7 L19.5 11 L16 11 Z" fill="#0f172a" />
      {/* Passenger Windows */}
      <rect x="4" y="7" width="2.5" height="4" rx="0.5" fill="#0f172a" />
      <rect x="7.5" y="7" width="2.5" height="4" rx="0.5" fill="#0f172a" />
      <rect x="11" y="7" width="2.5" height="4" rx="0.5" fill="#0f172a" />
      {/* Emergency flashing lights on roof */}
      <circle cx="5" cy="4.5" r="1" fill="#ef4444" />
      <circle cx="19" cy="4.5" r="1" fill="#f59e0b" />
      {/* Wheels */}
      <circle cx="6" cy="17" r="2.2" fill="#0f172a" stroke="#ffffff" strokeWidth="0.8" />
      <circle cx="18" cy="17" r="2.2" fill="#0f172a" stroke="#ffffff" strokeWidth="0.8" />
    </svg>
  );
}

// ── Custom Leaflet School Bus Top-View Markers ────────────────────────────────
function createBusMarkerIcon({ vehicleNumber, speed, heading = 0, isOnline = true, isSelected = false }) {
  const statusColor = isOnline ? '#10b981' : '#f59e0b';
  const glow = isOnline ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.35)';
  const selectedFilter = isSelected
    ? 'filter: drop-shadow(0 0 10px #4f46e5) drop-shadow(0 0 18px rgba(79, 70, 229, 0.85));'
    : 'filter: drop-shadow(0 5px 12px rgba(0,0,0,0.45));';

  const headingSafe = isNaN(heading) ? 0 : heading;

  return L.divIcon({
    className: 'custom-bus-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
        
        <!-- Rotating School Bus Body (Follows Compass Heading) -->
        <div class="bus-top-body-rotating" style="
          width: 48px; height: 76px;
          transform: rotate(${headingSafe}deg);
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: 24px 38px;
          position: relative;
          display: flex; align-items: center; justify-content: center;
          ${selectedFilter}
        ">
          <!-- Live Radar Pulse if Active Trip (Zero Headlight Cone) -->
          ${isOnline ? `
            <div style="
              position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
              width: 52px; height: 52px; border-radius: 50%;
              background: ${glow}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              pointer-events: none; z-index: 1;
            "></div>
          ` : ''}

          <!-- Top-Front-Side 3/4 Perspective School Bus Vector SVG -->
          <svg width="48" height="76" viewBox="0 0 48 76" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 3;">
            <defs>
              <!-- School Bus Yellow Primary Gradient -->
              <linearGradient id="sb3dBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#d97706" />
                <stop offset="20%" stop-color="#f59e0b" />
                <stop offset="55%" stop-color="#fbbf24" />
                <stop offset="85%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#b45309" />
              </linearGradient>

              <!-- 3D Shaded Right Flank (Gives perspective depth) -->
              <linearGradient id="sb3dFlank" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#b45309" />
                <stop offset="100%" stop-color="#78350f" />
              </linearGradient>

              <!-- Roof White Climate Cap -->
              <linearGradient id="sb3dRoof" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#f8fafc" />
              </linearGradient>

              <!-- Windshield Glass Tint -->
              <linearGradient id="sb3dGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#090d16" />
                <stop offset="50%" stop-color="#1e293b" />
                <stop offset="100%" stop-color="#0f172a" />
              </linearGradient>

              <!-- Metallic Bumper -->
              <linearGradient id="sb3dBumper" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#1e293b" />
                <stop offset="50%" stop-color="#334155" />
                <stop offset="100%" stop-color="#0f172a" />
              </linearGradient>
            </defs>

            <!-- 1. Ground Contact Drop Shadow -->
            <ellipse cx="24" cy="42" rx="19" ry="30" fill="rgba(0,0,0,0.3)" />

            <!-- 2. Rubber Wheels / Tires (with Silver Hubs) -->
            <!-- Left Wheels -->
            <rect x="5" y="16" width="3" height="10" rx="1.5" fill="#090d16" />
            <circle cx="6.5" cy="21" r="1.2" fill="#64748b" />
            <rect x="5" y="52" width="3" height="12" rx="1.5" fill="#090d16" />
            <circle cx="6.5" cy="58" r="1.2" fill="#64748b" />
            <!-- Right 3D Wheels -->
            <rect x="40" y="18" width="3.5" height="10" rx="1.5" fill="#090d16" />
            <circle cx="41.5" cy="23" r="1.2" fill="#64748b" />
            <rect x="40" y="54" width="3.5" height="12" rx="1.5" fill="#090d16" />
            <circle cx="41.5" cy="60" r="1.2" fill="#64748b" />

            <!-- 3. 3D Under-Chassis / Right Flank Extrusion -->
            <path d="M 10 12 L 36 12 L 41 18 L 41 68 L 36 71 L 10 71 Z" fill="url(#sb3dFlank)" />

            <!-- 4. Main School Bus Cabin Body -->
            <rect x="8" y="10" width="30" height="59" rx="6" fill="url(#sb3dBody)" stroke="#78350f" stroke-width="1.2" />

            <!-- 5. 3D Angled Side Windows Strip (Right Perspective Flank) -->
            <rect x="34.5" y="24" width="3" height="7" rx="1" fill="#0f172a" />
            <rect x="34.5" y="33" width="3" height="7" rx="1" fill="#0f172a" />
            <rect x="34.5" y="42" width="3" height="7" rx="1" fill="#0f172a" />
            <rect x="34.5" y="51" width="3" height="7" rx="1" fill="#0f172a" />
            <!-- Left Side Windows -->
            <rect x="8.5" y="24" width="2" height="34" rx="0.8" fill="#0f172a" />

            <!-- 6. Front Hood & Heavy Front Bumper (Top-Front View) -->
            <path d="M 10 10 Q 23 7 36 10 L 35 15 Q 23 13 11 15 Z" fill="url(#sb3dBumper)" />
            <line x1="12" y1="12" x2="34" y2="12" stroke="#94a3b8" stroke-width="0.8" />

            <!-- Headlights on Bumper (Crisp lamps, but NO beam projection) -->
            <circle cx="13.5" cy="11.5" r="2" fill="#fef08a" stroke="#ca8a04" stroke-width="0.5" />
            <circle cx="13.5" cy="11.5" r="0.9" fill="#ffffff" />
            <circle cx="32.5" cy="11.5" r="2" fill="#fef08a" stroke="#ca8a04" stroke-width="0.5" />
            <circle cx="32.5" cy="11.5" r="0.9" fill="#ffffff" />

            <!-- Radiator Grille Slats -->
            <line x1="18" y1="11" x2="28" y2="11" stroke="#0f172a" stroke-width="1.2" />
            <line x1="19" y1="13" x2="27" y2="13" stroke="#0f172a" stroke-width="1" />

            <!-- 7. Raked 3D Front Windshield (Angled Forward Glass) -->
            <path d="M 11.5 15.5 Q 23 13 34.5 15.5 L 33.5 24 Q 23 21.5 12.5 24 Z" fill="url(#sb3dGlass)" stroke="#0f172a" stroke-width="0.8" />
            <!-- Windshield Reflection Glare -->
            <path d="M 14 16 Q 19 14.5 23 15.2 L 21 22 Q 17 21.5 14 22 Z" fill="rgba(56, 189, 248, 0.45)" />

            <!-- 8. Side Rearview Mirrors on Stalks -->
            <!-- Left Mirror -->
            <line x1="8" y1="18" x2="4" y2="17" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" />
            <rect x="2" y="15" width="4" height="4.5" rx="1.2" fill="#0f172a" />
            <!-- Right Mirror (Angled 3D) -->
            <line x1="38" y1="18" x2="42" y2="17" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" />
            <rect x="40" y="15" width="4" height="4.5" rx="1.2" fill="#0f172a" />

            <!-- 9. Top Roof Panel (White Climate Cap with 3D Bevel) -->
            <rect x="13" y="24" width="20" height="36" rx="3.5" fill="url(#sb3dRoof)" stroke="#eab308" stroke-width="1" />
            
            <!-- Roof Corrugation Ribs -->
            <line x1="16" y1="28" x2="30" y2="28" stroke="#f59e0b" stroke-width="1" stroke-linecap="round" />
            <line x1="16" y1="40" x2="30" y2="40" stroke="#f59e0b" stroke-width="1" stroke-linecap="round" />
            <line x1="16" y1="52" x2="30" y2="52" stroke="#f59e0b" stroke-width="1" stroke-linecap="round" />

            <!-- Emergency Escape Roof Hatches (White with Red Safety Border & Cross) -->
            <rect x="17.5" y="31" width="11" height="7" rx="2" fill="#ffffff" stroke="#dc2626" stroke-width="1.1" />
            <line x1="23" y1="32.5" x2="23" y2="36.5" stroke="#dc2626" stroke-width="1.2" stroke-linecap="round" />
            <line x1="21" y1="34.5" x2="25" y2="34.5" stroke="#dc2626" stroke-width="1.2" stroke-linecap="round" />

            <rect x="17.5" y="44" width="11" height="7" rx="2" fill="#ffffff" stroke="#dc2626" stroke-width="1.1" />
            <line x1="23" y1="45.5" x2="23" y2="49.5" stroke="#dc2626" stroke-width="1.2" stroke-linecap="round" />
            <line x1="21" y1="47.5" x2="25" y2="47.5" stroke="#dc2626" stroke-width="1.2" stroke-linecap="round" />

            <!-- 10. Warning Beacons (Roof Perimeter Flashers) -->
            <!-- Front Warning Beacons (Red & Amber) -->
            <circle cx="13" cy="16" r="1.6" fill="#ef4444" stroke="#991b1b" stroke-width="0.5" />
            <circle cx="16.5" cy="15" r="1.4" fill="#f59e0b" />
            <circle cx="29.5" cy="15" r="1.4" fill="#f59e0b" />
            <circle cx="33" cy="16" r="1.6" fill="#ef4444" stroke="#991b1b" stroke-width="0.5" />

            <!-- Rear Tail / Brake Lights & Rear Window -->
            <rect x="12" y="62" width="22" height="3" rx="1" fill="#0f172a" />
            <path d="M 10 68 Q 23 70 36 68" stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" fill="none" />
            <rect x="10" y="66" width="3.5" height="2" rx="0.8" fill="#ef4444" />
            <rect x="32.5" y="66" width="3.5" height="2" rx="0.8" fill="#ef4444" />
          </svg>
        </div>

        <!-- Upright Number & Speed Badge (Remains Horizontally Readable) -->
        <div style="
          margin-top: 4px; padding: 2.5px 8px; border-radius: 10px;
          background: #0f172a; border: 1.5px solid ${isSelected ? '#818cf8' : 'rgba(255,255,255,0.35)'};
          color: #ffffff; font-size: 10.5px; font-weight: 800;
          white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 4; display: flex; align-items: center; gap: 4px;
        ">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusColor};"></span>
          <span style="letter-spacing: 0.02em;">${vehicleNumber}</span>
          ${speed > 0 ? `<span style="color: #38bdf8; font-weight: 900;">• ${Math.round(speed)}k</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [52, 106],
    iconAnchor: [26, 38],
    popupAnchor: [0, -40],
  });
}

function createStopMarkerIcon(sequence, isSchool = false, isFocused = false) {
  const bg = isSchool ? '#059669' : (isFocused ? '#f59e0b' : '#4f46e5');
  const label = isSchool ? '🏫' : sequence;
  const border = isFocused ? '3px solid #ffffff' : '2.5px solid #ffffff';
  const shadow = isFocused
    ? '0 0 0 5px rgba(245, 158, 11, 0.55), 0 8px 24px rgba(0,0,0,0.5)'
    : '0 3px 10px rgba(0,0,0,0.35)';
  const transform = isFocused ? 'transform: scale(1.25);' : '';

  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        width: 28px; height: 28px; border-radius: 50%;
        background: ${bg}; ${border}
        box-shadow: ${shadow};
        ${transform}
        display: flex; align-items: center; justify-content: center;
        color: #ffffff; font-size: ${isSchool ? '14px' : '11.5px'}; font-weight: 900;
        transition: all 0.25s ease;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// ── Smooth Animated Bus Marker for Fluid Vehicle Motion ────────────────────────
function SmoothBusMarker({ bus, isSelected, onSelect }) {
  const markerRef = useRef(null);
  const targetLat = parseFloat(bus.live?.latitude);
  const targetLng = parseFloat(bus.live?.longitude);
  const targetHeading = bus.live?.heading_degrees || 0;
  const speed = bus.live?.speed_kmh || 0;
  const isOnline = Boolean(bus.live?.is_online);

  const currentPosRef = useRef([targetLat, targetLng]);
  const currentHeadingRef = useRef(targetHeading);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (isNaN(targetLat) || isNaN(targetLng)) return;

    const startLat = currentPosRef.current[0] ?? targetLat;
    const startLng = currentPosRef.current[1] ?? targetLng;
    const startHeading = currentHeadingRef.current ?? targetHeading;

    const dLat = targetLat - startLat;
    const dLng = targetLng - startLng;

    // If initial placement or distant teleport (> ~8km), snap directly
    if (isNaN(startLat) || isNaN(startLng) || Math.abs(dLat) > 0.08 || Math.abs(dLng) > 0.08) {
      currentPosRef.current = [targetLat, targetLng];
      currentHeadingRef.current = targetHeading;
      if (markerRef.current) {
        markerRef.current.setLatLng([targetLat, targetLng]);
      }
      return;
    }

    // Shortest angular difference for compass heading
    let dHeading = (targetHeading - startHeading) % 360;
    if (dHeading > 180) dHeading -= 360;
    if (dHeading < -180) dHeading += 360;

    const startTime = performance.now();
    const duration = 2400; // Continuous gliding animation over the 2.5s telemetry interval

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Smooth linear transition across road coordinates
      const curLat = startLat + dLat * progress;
      const curLng = startLng + dLng * progress;
      const curHeading = (startHeading + dHeading * progress + 360) % 360;

      currentPosRef.current = [curLat, curLng];
      currentHeadingRef.current = curHeading;

      if (markerRef.current) {
        markerRef.current.setLatLng([curLat, curLng]);
        const el = markerRef.current.getElement();
        if (el) {
          const body = el.querySelector('.bus-top-body-rotating');
          if (body) {
            body.style.transform = `rotate(${curHeading}deg)`;
          }
        }
      }

      if (progress < 1.0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetLat, targetLng, targetHeading]);

  if (isNaN(targetLat) || isNaN(targetLng)) return null;

  return (
    <Marker
      ref={markerRef}
      position={[targetLat, targetLng]}
      icon={createBusMarkerIcon({
        vehicleNumber: bus.vehicle_number,
        speed,
        heading: targetHeading,
        isOnline,
        isSelected,
      })}
      eventHandlers={{
        click: () => onSelect(bus),
      }}
    >
      <Popup>
        <div style={{ minWidth: 210, fontFamily: 'sans-serif', padding: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>
              {bus.vehicle_number}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8,
              background: isOnline ? '#d1fae5' : '#fef3c7',
              color: isOnline ? '#047857' : '#b45309',
            }}>
              {isOnline ? 'ON TRIP' : 'STANDBY'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#4338ca', fontWeight: 800 }}>
            {bus.route_code}: {bus.route_name}
          </div>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>
            Driver: <span style={{ fontWeight: 700 }}>{bus.driver_name || 'N/A'}</span>
          </div>
          <div style={{ fontSize: 11, color: '#0369a1', marginTop: 2, fontWeight: 700 }}>
            Speed: {Math.round(speed)} km/h • Heading: {Math.round(targetHeading)}°
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ── Time Formatter for Route Stops ─────────────────────────────────────────────
function formatStopTime(timeStr) {
  if (!timeStr) return '--:--';
  try {
    const parts = timeStr.toString().split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    }
  } catch (e) {
    // fallback
  }
  return timeStr;
}

// ── Map Controller Helpers ────────────────────────────────────────────────────
function MapRecenterController({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom, { duration: 0.9 });
    }
  }, [center, zoom, map]);
  return null;
}

function MapBoundsFitController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.8 });
      } catch (e) {
        console.warn('Map bounds fit error:', e);
      }
    }
  }, [bounds, map]);
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// ── Helper to format GPS ping age ─────────────────────────────────────────────
function formatGpsAge(seconds) {
  if (seconds == null || isNaN(seconds)) return 'No recent signal';
  const s = Math.max(0, Math.round(seconds));
  if (s < 10) return 'Just now (Live GPS)';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

const DEFAULT_CAMPUS_CENTER = [10.9856, 76.2235];

export default function LiveBusMapView({ school, academicYear, onNavigate, theme = 'light' }) {
  // ── Theme Context ───────────────────────────────────────────────────────────
  const isDark = theme === 'dark';

  // Theme-aware design tokens
  const surfaceBg = isDark ? '#0f172a' : '#ffffff';
  const elevatedBg = isDark ? '#1e293b' : '#f8fafc';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  const shadowVal = isDark
    ? '0 8px 30px rgba(0, 0, 0, 0.35)'
    : '0 4px 20px rgba(15, 23, 42, 0.08)';

  // ── States ──────────────────────────────────────────────────────────────────
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'on_trip', 'idle'

  // Selection & Route Geometry
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [selectedRoutePath, setSelectedRoutePath] = useState([]);
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [loadingRouteDetails, setLoadingRouteDetails] = useState(false);

  // Route Stops Cache, Card Expansion & Map Pin Focus
  const [stopsCache, setStopsCache] = useState({});
  const [loadingStopsRouteId, setLoadingStopsRouteId] = useState(null);
  const [expandedCardRouteId, setExpandedCardRouteId] = useState(null);
  const [focusedStopId, setFocusedStopId] = useState(null);

  // Map Navigation Settings
  const [mapCenter, setMapCenter] = useState(DEFAULT_CAMPUS_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [fitAllBounds, setFitAllBounds] = useState(null);
  const [showStops, setShowStops] = useState(true);
  const [showPolyline, setShowPolyline] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(4); // Balanced 4s stream sync
  const [endingTripRouteId, setEndingTripRouteId] = useState(null);

  // ── Fetch Real-time Fleet Telemetry (Broadcast by Drivers) ───────────────────
  const fetchFleetData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      let fleetData = [];
      try {
        const res = await BusService.getFleetLivePositions();
        if (res.data?.data && Array.isArray(res.data.data)) {
          fleetData = res.data.data;
        }
      } catch (err) {
        console.warn('Backend fleet live endpoint error, checking vehicles:', err);
      }

      // If backend returns empty, fallback to vehicle list
      if (fleetData.length === 0) {
        try {
          const vRes = await BusService.listVehicles();
          if (vRes.data?.data && vRes.data.data.length > 0) {
            fleetData = vRes.data.data.map(v => ({
              ...v,
              driver_name: v.driver_first_name ? `${v.driver_first_name} ${v.driver_last_name || ''}`.trim() : null,
              driver_phone: v.driver_phone || null,
              route_code: v.assigned_route_code || 'UNASSIGNED',
              route_name: v.assigned_route_name || 'No route assigned',
              route_id: v.assigned_route_id || null,
              student_count: v.assigned_students || 0,
              live: v.live || null,
            }));
          }
        } catch (e) {
          console.error('Error fetching fallback vehicles:', e);
        }
      }

      setFleet(fleetData);
      setLastRefreshedAt(new Date());

      // If no bus selected yet, select the first active on-trip bus, or first vehicle
      if (!selectedBusId && fleetData.length > 0) {
        const activeOne = fleetData.find(b => b.live?.is_online) || fleetData[0];
        if (activeOne) {
          setSelectedBusId(activeOne.bus_id);
          if (activeOne.live?.latitude && activeOne.live?.longitude) {
            setMapCenter([parseFloat(activeOne.live.latitude), parseFloat(activeOne.live.longitude)]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch fleet telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBusId]);

  // Initial load
  useEffect(() => {
    fetchFleetData();
  }, []);

  // ── Auto-Refresh Polling Timer ───────────────────────────────────────────────
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchFleetData(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchFleetData]);

  // ── Currently Selected Bus ──────────────────────────────────────────────────
  const selectedBus = useMemo(() => {
    return fleet.find(b => b.bus_id === selectedBusId) || fleet[0] || null;
  }, [fleet, selectedBusId]);

  // ── Driver-Controlled Live Shift & Status ────────────────────────────────────
  // The shift (morning pickup vs evening drop) is determined EXCLUSIVELY by the driver's
  // mobile app ping session. Administrators cannot change this direction.
  const activeDriverShift = useMemo(() => {
    if (selectedBus?.live?.shift) {
      return selectedBus.live.shift;
    }
    return new Date().getHours() >= 12 ? 'evening' : 'morning';
  }, [selectedBus]);

  const isDriverTripActive = Boolean(selectedBus?.live?.is_online);

  const handleForceEndTrip = async (routeId, vehicleNumber) => {
    if (!routeId) return;
    if (!window.confirm(`Are you sure you want to end the active trip for ${vehicleNumber || 'this bus'} and set it to Standby?`)) {
      return;
    }
    setEndingTripRouteId(routeId);
    try {
      await BusService.endTrip(routeId);
      await fetchFleetData(true);
    } catch (err) {
      console.error('Failed to end trip:', err);
      alert('Could not end trip. Please try again.');
    } finally {
      setEndingTripRouteId(null);
    }
  };

  // ── Fetch Stops for Route Cache ─────────────────────────────────────────────
  const fetchRouteStops = useCallback(async (routeId) => {
    if (!routeId) return [];
    if (stopsCache[routeId]) return stopsCache[routeId];
    setLoadingStopsRouteId(routeId);
    try {
      const res = await BusService.listStops(routeId);
      const stops = res.data?.data || [];
      setStopsCache(prev => ({ ...prev, [routeId]: stops }));
      return stops;
    } catch (err) {
      console.warn('Failed to load stops for route', routeId, err);
      return [];
    } finally {
      setLoadingStopsRouteId(null);
    }
  }, [stopsCache]);

  // ── Load Route Geometry & Stops in Driver's Active Shift Order ───────────────
  useEffect(() => {
    if (!selectedBus?.route_id) {
      setSelectedRoutePath([]);
      setSelectedRouteStops([]);
      return;
    }

    let isMounted = true;
    const loadDetails = async () => {
      setLoadingRouteDetails(true);
      try {
        // Fetch Stops
        const stopsRes = await BusService.listStops(selectedBus.route_id);
        let rawStops = stopsRes.data?.data || [];
        setStopsCache(prev => ({ ...prev, [selectedBus.route_id]: rawStops }));
        let stops = [...rawStops];

        // Fetch OSRM Road Path
        let pathPoints = [];
        try {
          const pathRes = await BusService.getRoutePath(selectedBus.route_id);
          const waypoints = pathRes.data?.data?.waypoints || pathRes.data?.data || [];
          if (Array.isArray(waypoints) && waypoints.length > 0) {
            pathPoints = waypoints
              .map(wp => [parseFloat(wp.latitude || wp.lat), parseFloat(wp.longitude || wp.lng)])
              .filter(p => !isNaN(p[0]) && !isNaN(p[1]));
          }
        } catch (e) {
          console.warn('Could not load stored route path, connecting stops sequentially:', e);
        }

        // If no stored polyline, connect stop coordinates
        if (pathPoints.length === 0 && stops.length > 0) {
          pathPoints = stops
            .filter(s => s.latitude && s.longitude)
            .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]);
        }

        // Apply Driver's Active Shift Direction (evening return trip reverses order)
        if (activeDriverShift === 'evening') {
          pathPoints = [...pathPoints].reverse();
          stops = [...stops].reverse();
        }

        if (isMounted) {
          setSelectedRouteStops(stops);
          setSelectedRoutePath(pathPoints);
        }
      } catch (err) {
        console.warn('Error loading route geometry:', err);
      } finally {
        if (isMounted) setLoadingRouteDetails(false);
      }
    };

    loadDetails();
    return () => { isMounted = false; };
  }, [selectedBus?.route_id, activeDriverShift]);

  // ── Handle Bus Selection ────────────────────────────────────────────────────
  const handleSelectBus = (bus) => {
    setSelectedBusId(bus.bus_id);
    if (bus.live?.latitude && bus.live?.longitude) {
      const lat = parseFloat(bus.live.latitude);
      const lng = parseFloat(bus.live.longitude);
      setMapCenter([lat, lng]);
      setMapZoom(15);
    }
  };

  // ── Focus/Locate a Stop on Map ──────────────────────────────────────────────
  const handleFocusStop = (stop, bus = null, e = null) => {
    if (e) e.stopPropagation();
    if (bus && bus.bus_id !== selectedBusId) {
      handleSelectBus(bus);
    }
    setFocusedStopId(stop.stop_id);
    const lat = parseFloat(stop.latitude);
    const lng = parseFloat(stop.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng]);
      setMapZoom(16);
      setShowStops(true);
    }
  };

  // ── Toggle Inline Stop List on Bus Card ─────────────────────────────────────
  const toggleExpandRouteStops = async (e, bus) => {
    e.stopPropagation();
    handleSelectBus(bus);
    if (expandedCardRouteId === bus.route_id) {
      setExpandedCardRouteId(null);
    } else {
      setExpandedCardRouteId(bus.route_id);
      if (bus.route_id && !stopsCache[bus.route_id]) {
        await fetchRouteStops(bus.route_id);
      }
    }
  };

  // ── Fit Bounds to All Fleet ─────────────────────────────────────────────────
  const handleFitAllBuses = () => {
    const validCoords = fleet
      .filter(b => b.live?.latitude && b.live?.longitude)
      .map(b => [parseFloat(b.live.latitude), parseFloat(b.live.longitude)]);

    if (validCoords.length > 0) {
      setFitAllBounds(validCoords);
    } else {
      setMapCenter(DEFAULT_CAMPUS_CENTER);
      setMapZoom(13);
    }
  };

  // ── Filtered Fleet List ─────────────────────────────────────────────────────
  const filteredFleet = useMemo(() => {
    return fleet.filter(b => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        (b.vehicle_number && b.vehicle_number.toLowerCase().includes(q)) ||
        (b.vehicle_name && b.vehicle_name.toLowerCase().includes(q)) ||
        (b.route_code && b.route_code.toLowerCase().includes(q)) ||
        (b.route_name && b.route_name.toLowerCase().includes(q)) ||
        (b.driver_name && b.driver_name.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter === 'on_trip') {
        matchStatus = b.live?.is_online;
      } else if (statusFilter === 'idle') {
        matchStatus = !b.live?.is_online;
      }

      return matchQuery && matchStatus;
    });
  }, [fleet, searchQuery, statusFilter]);

  // ── Fleet Statistics ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = fleet.length;
    const active = fleet.filter(b => b.live?.is_online).length;
    const idle = total - active;
    const totalStudents = fleet.reduce((acc, b) => acc + (parseInt(b.student_count) || 0), 0);
    return { total, active, idle, totalStudents };
  }, [fleet]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 124px)', gap: 14 }}>
      
      {/* ── TOP KPI & CONTROL BAR (THEME AWARE) ───────────────────────────── */}
      <div style={{
        background: surfaceBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '16px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: shadowVal,
      }}>
        {/* Title & Live Status Beacon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(79, 70, 229, 0.35)',
          }}>
            <Radio size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 17, fontWeight: 900, color: textPrimary, margin: 0, letterSpacing: '-0.3px' }}>
                Live Bus Fleet Monitoring
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
                color: isDark ? '#10b981' : '#059669',
                border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0'}`,
                display: 'inline-flex', alignItems: 'center', gap: 5, letterSpacing: '0.04em'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
                DRIVER TELEMETRY STREAM
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: textSecondary, margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={11} color="#4f46e5" />
              <span>Trip lifecycle & route direction are exclusively controlled by drivers on the mobile console.</span>
            </p>
          </div>
        </div>

        {/* Fleet KPI Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '6px 14px', borderRadius: '10px',
            background: elevatedBg, border: `1px solid ${cardBorder}`,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Bus size={15} color="#4f46e5" />
            <div>
              <div style={{ fontSize: 9.5, color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>Fleet Size</div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: textPrimary }}>{stats.total} Buses</div>
            </div>
          </div>

          <div style={{
            padding: '6px 14px', borderRadius: '10px',
            background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}`,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Navigation size={15} color="#059669" />
            <div>
              <div style={{ fontSize: 9.5, color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>On Trip</div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#059669' }}>{stats.active} Active</div>
            </div>
          </div>

          <div style={{
            padding: '6px 14px', borderRadius: '10px',
            background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'}`,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Clock size={15} color="#d97706" />
            <div>
              <div style={{ fontSize: 9.5, color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>Standby</div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#d97706' }}>{stats.idle} Idle</div>
            </div>
          </div>

          <div style={{
            padding: '6px 14px', borderRadius: '10px',
            background: isDark ? 'rgba(56, 189, 248, 0.12)' : '#f0f9ff',
            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Users size={15} color="#0284c7" />
            <div>
              <div style={{ fontSize: 9.5, color: '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>Students</div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0284c7' }}>{stats.totalStudents} Monitored</div>
            </div>
          </div>
        </div>

        {/* Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => fetchFleetData(false)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 15px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              border: '1px solid #4f46e5',
              color: '#ffffff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Fleet'}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: 2-COLUMN VIEW ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, gap: 14, minHeight: 0 }}>
        
        {/* ── LEFT PANEL: FLEET BUSES WITH INLINE ROUTE STOPS ────────────── */}
        <div style={{
          width: '380px',
          background: surfaceBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: shadowVal,
          flexShrink: 0,
        }}>
          {/* Search & Filter Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${cardBorder}`,
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bus number, route, or driver..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '10px',
                  background: elevatedBg,
                  border: `1px solid ${cardBorder}`,
                  color: textPrimary,
                  fontSize: 12.5,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Quick Filter Pills & Fit All */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[
                  { id: 'all', label: `All (${fleet.length})` },
                  { id: 'on_trip', label: `Active (${stats.active})` },
                  { id: 'idle', label: `Idle (${stats.idle})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    style={{
                      padding: '4px 9px', borderRadius: '8px', fontSize: 11, fontWeight: 700,
                      background: statusFilter === f.id ? '#4f46e5' : elevatedBg,
                      color: statusFilter === f.id ? '#ffffff' : textSecondary,
                      border: `1px solid ${statusFilter === f.id ? '#4f46e5' : cardBorder}`,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* View All Buses on Map */}
              <button
                onClick={handleFitAllBuses}
                title="Fit map view to display all vehicles simultaneously"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: '8px',
                  background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
                  border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe'}`,
                  color: '#4f46e5', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}
              >
                <Maximize2 size={12} />
                <span>Fit All</span>
              </button>
            </div>
          </div>

          {/* Bus Cards List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredFleet.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: textMuted }}>
                <Bus size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>No vehicles match filter</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Try clearing search criteria</div>
              </div>
            ) : (
              filteredFleet.map(b => {
                const isSelected = selectedBusId === b.bus_id;
                const isOnline = b.live?.is_online;
                const speed = b.live?.speed_kmh || 0;
                const driverShift = b.live?.shift || (new Date().getHours() >= 12 ? 'evening' : 'morning');

                // Stop list for this bus (deriving from stopsCache or selectedRouteStops)
                const rawStopsForBus = stopsCache[b.route_id] || (b.route_id === selectedBus?.route_id ? selectedRouteStops : []);
                const stopsForBus = driverShift === 'evening'
                  ? (stopsCache[b.route_id] ? [...stopsCache[b.route_id]].reverse() : rawStopsForBus)
                  : (stopsCache[b.route_id] || rawStopsForBus);

                const isExpanded = expandedCardRouteId === b.route_id;
                const isLoadingStops = loadingStopsRouteId === b.route_id;

                return (
                  <div
                    key={b.bus_id}
                    onClick={() => handleSelectBus(b)}
                    style={{
                      padding: '14px 15px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      background: isSelected
                        ? (isDark
                            ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.22) 0%, rgba(30, 41, 59, 0.8) 100%)'
                            : 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)')
                        : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'),
                      border: isSelected
                        ? '2px solid #4f46e5'
                        : `1px solid ${cardBorder}`,
                      boxShadow: isSelected
                        ? (isDark ? '0 6px 20px rgba(79, 70, 229, 0.35)' : '0 4px 16px rgba(79, 70, 229, 0.18)')
                        : (isDark ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.05)'),
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Top Row: Vehicle Number, Status Pill & Speed */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '10px',
                          background: isOnline
                            ? (isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5')
                            : (isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb'),
                          border: `1.5px solid ${isOnline
                            ? (isDark ? 'rgba(16, 185, 129, 0.45)' : '#a7f3d0')
                            : (isDark ? 'rgba(245, 158, 11, 0.45)' : '#fde68a')}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <SchoolBusBadgeIcon size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: textPrimary, letterSpacing: '-0.2px' }}>
                            {b.vehicle_number}
                          </div>
                          <div style={{ fontSize: 11, color: textSecondary }}>
                            {b.vehicle_name || 'Campus Transit'}
                          </div>
                        </div>
                      </div>

                      {/* Status / Speed Pill */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 12,
                          background: isOnline
                            ? (isDark ? 'rgba(16, 185, 129, 0.22)' : '#ecfdf5')
                            : (isDark ? 'rgba(245, 158, 11, 0.22)' : '#fffbeb'),
                          color: isOnline ? (isDark ? '#34d399' : '#047857') : (isDark ? '#fbbf24' : '#b45309'),
                          border: `1.5px solid ${isOnline
                            ? (isDark ? 'rgba(16, 185, 129, 0.45)' : '#a7f3d0')
                            : (isDark ? 'rgba(245, 158, 11, 0.45)' : '#fde68a')}`,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#059669' : '#d97706' }} />
                          {isOnline ? 'ON TRIP' : 'STANDBY'}
                        </span>
                        {isOnline && speed > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', marginTop: 3 }}>
                            {Math.round(speed)} km/h
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Route Details (High Contrast, Beautiful & Clear) */}
                    <div style={{
                      padding: '7px 10px', borderRadius: '10px',
                      background: isDark ? 'rgba(99, 102, 241, 0.14)' : '#eef2ff',
                      border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : '#c7d2fe'}`,
                      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px',
                        background: '#4f46e5', color: '#ffffff', flexShrink: 0
                      }}>
                        {b.route_code || 'RT'}
                      </span>
                      <span style={{
                        fontSize: '12px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
                      }}>
                        {b.route_name || 'No route assigned'}
                      </span>
                      {isOnline && (
                        <span style={{
                          fontSize: '10px', fontWeight: 800, padding: '1.5px 6px', borderRadius: '6px',
                          background: isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe',
                          color: '#0284c7', flexShrink: 0
                        }}>
                          {driverShift === 'evening' ? '🌇 Evening' : '🌅 Morning'}
                        </span>
                      )}
                    </div>

                    {/* Driver, Student Count & Freshness */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: textPrimary, fontWeight: 800 }}>👤 {b.driver_name || 'No driver assigned'}</span>
                      </div>
                      <div style={{ color: '#0284c7', fontWeight: 800 }}>
                        👥 {b.student_count || 0} Students
                      </div>
                    </div>

                    {/* Freshness Timestamp */}
                    <div style={{
                      fontSize: 10, color: textMuted, marginTop: 5,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} color={textMuted} />
                        <span>{formatGpsAge(b.live?.age_seconds)}</span>
                      </div>
                      {isOnline && (
                        <span style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669' }} />
                          Live Transmit
                        </span>
                      )}
                    </div>

                    {/* ── ACCORDION: ROUTE STOPS LIST FOR THIS SPECIFIC ROUTE ── */}
                    {b.route_id && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${cardBorder}` }}>
                        <button
                          type="button"
                          onClick={(e) => toggleExpandRouteStops(e, b)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isExpanded
                              ? (isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff')
                              : (isDark ? 'rgba(99, 102, 241, 0.12)' : '#f8fafc'),
                            border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.35)' : '#cbd5e1'}`,
                            color: '#4f46e5',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MapPin size={12} color="#4f46e5" />
                            <span>Route Stops ({b.stop_count != null ? b.stop_count : (stopsForBus.length || '...')})</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: textSecondary }}>
                            <span>{isExpanded ? 'Hide' : 'View Stops'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </span>
                        </button>

                        {/* Collapsible Stop Itinerary Sequence */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginTop: 8,
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f1f5f9',
                              border: `1px solid ${cardBorder}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              maxHeight: '230px',
                              overflowY: 'auto',
                            }}
                          >
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              fontSize: 10, color: textMuted, paddingBottom: 4, borderBottom: `1px solid ${cardBorder}`
                            }}>
                              <span>{driverShift === 'evening' ? '🌇 Evening Shift (School ➔ Drops)' : '🌅 Morning Shift (Stops ➔ School)'}</span>
                              <span style={{ fontWeight: 800, color: '#4f46e5' }}>{stopsForBus.length} Stops</span>
                            </div>

                            {isLoadingStops ? (
                              <div style={{ textAlign: 'center', padding: '12px', color: textMuted, fontSize: 11 }}>
                                <RefreshCw size={13} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} />
                                Loading stops sequence...
                              </div>
                            ) : stopsForBus.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '10px', color: textMuted, fontSize: 11 }}>
                                No stops mapped for this route yet.
                              </div>
                            ) : (
                              stopsForBus.map((stop, sIdx) => {
                                const isFocused = focusedStopId === stop.stop_id;
                                const scheduledTime = driverShift === 'evening'
                                  ? (stop.evening_time || stop.evening_drop_time || stop.morning_time)
                                  : (stop.morning_time || stop.morning_pickup_time);

                                return (
                                  <div
                                    key={stop.stop_id || sIdx}
                                    onClick={(e) => handleFocusStop(stop, b, e)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                      padding: '5px 8px',
                                      borderRadius: '8px',
                                      background: isFocused
                                        ? (isDark ? 'rgba(79, 70, 229, 0.3)' : '#e0e7ff')
                                        : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff'),
                                      border: isFocused ? '1px solid #4f46e5' : `1px solid ${cardBorder}`,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                      {/* Sequence Badge */}
                                      <span style={{
                                        width: 20, height: 20, borderRadius: '50%',
                                        background: stop.is_school_stop ? '#059669' : '#4f46e5',
                                        color: '#ffffff', fontSize: 10, fontWeight: 900,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                      }}>
                                        {stop.is_school_stop ? '🏫' : (stop.sequence_order || sIdx + 1)}
                                      </span>

                                      {/* Stop Name & Landmark */}
                                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 800, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {stop.stop_name}
                                        </div>
                                        {stop.landmark && (
                                          <div style={{ fontSize: 9.5, color: textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            📍 {stop.landmark}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Scheduled Time & Locate Crosshair */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                      {scheduledTime && (
                                        <span style={{
                                          fontSize: 9.5, fontWeight: 800, padding: '2px 5px', borderRadius: '5px',
                                          background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#f0f9ff',
                                          color: '#0284c7'
                                        }}>
                                          {formatStopTime(scheduledTime)}
                                        </span>
                                      )}
                                      <button
                                        title="Locate stop on map"
                                        onClick={(e) => handleFocusStop(stop, b, e)}
                                        style={{
                                          width: 22, height: 22, borderRadius: '6px',
                                          background: isFocused ? '#4f46e5' : elevatedBg,
                                          border: `1px solid ${isFocused ? '#4f46e5' : cardBorder}`,
                                          color: isFocused ? '#ffffff' : textSecondary,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <Crosshair size={11} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: INTERACTIVE LEAFLET LIVE MAP (CLEAN OPENSTREETMAP, NO WATERMARKS) ── */}
        <div style={{
          flex: 1,
          background: surfaceBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: shadowVal,
        }}>
          {/* Map Overlay Controls */}
          <div style={{
            position: 'absolute', top: 14, right: 14, zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {/* Stops Visibility Toggle */}
            <button
              onClick={() => setShowStops(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 13px', borderRadius: '10px',
                background: showStops ? '#4f46e5' : (isDark ? '#0f172a' : '#ffffff'),
                border: `1px solid ${showStops ? '#4f46e5' : cardBorder}`,
                color: showStops ? '#ffffff' : textPrimary,
                fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
              }}
            >
              <MapPin size={13} />
              <span>{showStops ? 'Stops Visible' : 'Hide Stops'}</span>
            </button>

            {/* Route Path Visibility Toggle */}
            <button
              onClick={() => setShowPolyline(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 13px', borderRadius: '10px',
                background: showPolyline ? '#4f46e5' : (isDark ? '#0f172a' : '#ffffff'),
                border: `1px solid ${showPolyline ? '#4f46e5' : cardBorder}`,
                color: showPolyline ? '#ffffff' : textPrimary,
                fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
              }}
            >
              <Route size={13} />
              <span>{showPolyline ? 'Path Visible' : 'Hide Path'}</span>
            </button>
          </div>

          {/* Leaflet Map Canvas (Standard Free OpenStreetMap — Zero API Key Required) */}
          <div style={{ flex: 1, width: '100%', position: 'relative' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
            >
              {/* Pure OpenStreetMap (Completely free, no watermarks, no API keys) */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              <InvalidateSizeOnMount />
              <MapRecenterController center={mapCenter} zoom={mapZoom} />
              {fitAllBounds && <MapBoundsFitController bounds={fitAllBounds} />}

              {/* 1. Selected Bus Route Polyline */}
              {showPolyline && selectedRoutePath.length > 1 && (
                <>
                  {/* Subtle Glow Under-Stroke */}
                  <Polyline
                    positions={selectedRoutePath}
                    pathOptions={{ color: '#4f46e5', weight: 8, opacity: 0.35, lineCap: 'round' }}
                  />
                  {/* Primary Crisp Route Path */}
                  <Polyline
                    positions={selectedRoutePath}
                    pathOptions={{ color: '#6366f1', weight: 4.5, opacity: 0.95, lineCap: 'round' }}
                  />
                </>
              )}

              {/* 2. Route Stops Markers */}
              {showStops && selectedRouteStops.map((s, idx) => {
                const lat = parseFloat(s.latitude);
                const lng = parseFloat(s.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                const isFocused = focusedStopId === s.stop_id;
                const scheduledTime = activeDriverShift === 'evening'
                  ? (s.evening_time || s.evening_drop_time || s.morning_time)
                  : (s.morning_time || s.morning_pickup_time);

                return (
                  <Marker
                    key={s.stop_id || idx}
                    position={[lat, lng]}
                    icon={createStopMarkerIcon(s.sequence_order || idx + 1, s.is_school_stop, isFocused)}
                    eventHandlers={{
                      click: () => {
                        setFocusedStopId(s.stop_id);
                      },
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a' }}>
                          Stop {s.sequence_order}: {s.stop_name}
                        </div>
                        {s.landmark && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            📍 {s.landmark}
                          </div>
                        )}
                        {scheduledTime && (
                          <div style={{ fontSize: 11, color: '#0284c7', marginTop: 4, fontWeight: 700 }}>
                            🕒 Scheduled: {formatStopTime(scheduledTime)}
                          </div>
                        )}
                        <div style={{ marginTop: 6, fontSize: 11.5, color: '#4f46e5', fontWeight: 800 }}>
                          👥 {s.student_count || 0} Students Assigned
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* 3. Real-time Bus Markers for All Fleet with 60fps Motion Interpolation */}
              {fleet.map(b => {
                const lat = parseFloat(b.live?.latitude);
                const lng = parseFloat(b.live?.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                const isSelected = selectedBusId === b.bus_id;

                return (
                  <SmoothBusMarker
                    key={b.bus_id}
                    bus={b}
                    isSelected={isSelected}
                    onSelect={handleSelectBus}
                  />
                );
              })}
            </MapContainer>
          </div>

          {/* ── BOTTOM DOCKED TELEMETRY & ACTIVITY PANEL (THEME AWARE) ──────── */}
          {selectedBus && (
            <div style={{
              background: surfaceBg,
              borderTop: `1px solid ${cardBorder}`,
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              boxShadow: isDark ? '0 -8px 24px rgba(0, 0, 0, 0.4)' : '0 -4px 16px rgba(15, 23, 42, 0.05)',
            }}>
              {/* Bus & Driver Identity + Driver-Controlled Shift Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: isDriverTripActive
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isDriverTripActive ? '0 0 16px rgba(5, 150, 105, 0.35)' : 'none',
                }}>
                  <SchoolBusBadgeIcon size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: textPrimary }}>
                      {selectedBus.vehicle_number}
                    </span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
                      background: isDark ? 'rgba(99, 102, 241, 0.25)' : '#eef2ff',
                      color: '#4f46e5',
                      border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.45)' : '#c7d2fe'}`,
                    }}>
                      {selectedBus.route_code || 'TRANSIT'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
                      background: isDriverTripActive
                        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5')
                        : (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb'),
                      color: isDriverTripActive
                        ? (isDark ? '#34d399' : '#047857')
                        : (isDark ? '#fbbf24' : '#b45309'),
                      border: `1px solid ${isDriverTripActive
                        ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0')
                        : (isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a')}`,
                    }}>
                      {isDriverTripActive
                        ? (activeDriverShift === 'evening' ? '🌇 Evening Trip Active' : '🌅 Morning Trip Active')
                        : '⏸️ Trip Standby'}
                    </span>
                    {isDriverTripActive && selectedBus?.route_id && (
                      <button
                        onClick={() => handleForceEndTrip(selectedBus.route_id, selectedBus.vehicle_number)}
                        disabled={endingTripRouteId === selectedBus.route_id}
                        title="End this trip and reset vehicle to Standby"
                        style={{
                          marginLeft: 6,
                          padding: '3px 10px',
                          borderRadius: 8,
                          background: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 10.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Square size={10} fill="#ffffff" />
                        <span>{endingTripRouteId === selectedBus.route_id ? 'Ending...' : 'End Trip'}</span>
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: textSecondary, marginTop: 3 }}>
                    Driver: <span style={{ color: textPrimary, fontWeight: 800 }}>{selectedBus.driver_name || 'No driver assigned'}</span>
                    {selectedBus.driver_phone && (
                      <a
                        href={`tel:${selectedBus.driver_phone}`}
                        style={{ marginLeft: 10, color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 800 }}
                      >
                        <Phone size={12} /> {selectedBus.driver_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Real-time Gauges: Speed, Heading, Capacity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  padding: '6px 14px', borderRadius: '10px',
                  background: elevatedBg, border: `1px solid ${cardBorder}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Gauge size={16} color="#0284c7" />
                  <div>
                    <div style={{ fontSize: 9.5, color: textSecondary, fontWeight: 700 }}>SPEED</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: textPrimary }}>
                      {Math.round(selectedBus.live?.speed_kmh || 0)} <span style={{ fontSize: 10, color: textSecondary }}>km/h</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 14px', borderRadius: '10px',
                  background: elevatedBg, border: `1px solid ${cardBorder}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Compass size={16} color="#7c3aed" />
                  <div>
                    <div style={{ fontSize: 9.5, color: textSecondary, fontWeight: 700 }}>HEADING</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: textPrimary }}>
                      {selectedBus.live?.heading_degrees || 0}° <span style={{ fontSize: 10, color: textSecondary }}>DIR</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 14px', borderRadius: '10px',
                  background: elevatedBg, border: `1px solid ${cardBorder}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Users size={16} color="#059669" />
                  <div>
                    <div style={{ fontSize: 9.5, color: textSecondary, fontWeight: 700 }}>PASSENGERS</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: textPrimary }}>
                      {selectedBus.student_count || 0} / {selectedBus.capacity || 40} <span style={{ fontSize: 10, color: textSecondary }}>SEATS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => onNavigate && onNavigate('bus-routes')}
                  style={{
                    padding: '8px 14px', borderRadius: '10px',
                    background: elevatedBg, border: `1px solid ${cardBorder}`,
                    color: textPrimary, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Route size={13} color="#4f46e5" />
                  <span>Route Manager</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('bus-passengers')}
                  style={{
                    padding: '8px 14px', borderRadius: '10px',
                    background: elevatedBg, border: `1px solid ${cardBorder}`,
                    color: textPrimary, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Users size={13} color="#0284c7" />
                  <span>Student Rosters</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
