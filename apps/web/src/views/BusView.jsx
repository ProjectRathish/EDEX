import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bus, MapPin, Users, Truck, Plus, Edit2, Trash2, Search,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, AlertTriangle,
  X, ArrowRight, Car, UserCheck, UserX, Fuel, Shield,
  Clock, Navigation, Phone, Route, Layers, Hash,
  RefreshCw, Download, ChevronRight, Info, Sparkles,
  UserCog, CircleDot, Milestone, Map, Crosshair, LocateFixed
} from 'lucide-react';
import { BusService } from '../services/api';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Fix Leaflet default marker icons (Vite asset path issue) ─────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Custom numbered stop icon factory ───────────────────────────────────────
function makeStopIcon(number, isSchool = false) {
  const color = isSchool ? '#6366f1' : '#f59e0b';
  const bg    = isSchool ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.12)';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${bg};
      border:2.5px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;color:${color};
      font-family:Outfit,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    ">${number}</div>`,
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
    popupAnchor:[0, -18],
  });
}

// ─── Draggable pick marker (used inside modal map) ────────────────────────────
const pickIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:rgba(99,102,241,0.2);
    border:3px solid #6366f1;
    box-shadow:0 0 0 4px rgba(99,102,241,0.2),0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize:   [28, 28],
  iconAnchor: [14, 14],
});

// ─── Geocode helper (Nominatim / OpenStreetMap — free, no key) ───────────────
async function geocodeAddress(address) {
  const q = encodeURIComponent(address + ', India');
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  if (!data.length) throw new Error('Location not found');
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}

// ─── MapClickHandler — fires when user clicks inside the picker map ───────────
function MapClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ─── Auto-fit map to bounds of all stop coordinates ──────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

// ─── Route Map Panel — shown in the Stops Manager below the stop list ─────────
// routePath = [{latitude, longitude}] from bus_route_paths (OSRM waypoints)
function RouteMapPanel({ stops, routePath = [] }) {
  const hasCoords = stops.some(s => s.latitude && s.longitude);
  const stopPositions = stops
    .filter(s => s.latitude && s.longitude)
    .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)]);
  const pathPositions = routePath.map(wp => [parseFloat(wp.latitude), parseFloat(wp.longitude)]);

  // Default center: India centroid
  const center = stopPositions.length > 0 ? stopPositions[0] : [20.5937, 78.9629];

  return (
    <div style={{
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      border: '1px solid rgba(245,158,11,0.25)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Map Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        background: 'rgba(245,158,11,0.08)',
        borderBottom: '1px solid rgba(245,158,11,0.15)',
      }}>
        <Map size={15} color="#f59e0b" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>Route Map</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          {pathPositions.length > 0
            ? <span style={{ color: 'var(--accent-emerald)' }}>✓ Road path ({pathPositions.length} waypoints)</span>
            : hasCoords
              ? `${stopPositions.length} of ${stops.length} stops placed — click Generate Path for road-following line`
              : 'No stop coordinates yet — add lat/lng when creating stops'}
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '380px', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* OSRM road-following path (solid) — shown when path is generated */}
        {pathPositions.length > 1 && (
          <Polyline
            positions={pathPositions}
            pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.85 }}
          />
        )}

        {/* Fallback: dashed straight lines between stops — when no OSRM path yet */}
        {pathPositions.length === 0 && stopPositions.length > 1 && (
          <Polyline
            positions={stopPositions}
            pathOptions={{ color: '#f59e0b', weight: 3.5, opacity: 0.5, dashArray: '8 4' }}
          />
        )}

        {/* Stop markers */}
        {stops.filter(s => s.latitude && s.longitude).map(s => (
          <Marker
            key={s.stop_id}
            position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
            icon={makeStopIcon(s.sequence_order, s.is_school_stop)}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {s.sequence_order}. {s.stop_name}
                  {s.is_school_stop && <span style={{ marginLeft: 6, fontSize: 10, background: '#6366f1', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>SCHOOL</span>}
                </div>
                {s.stop_address && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{s.stop_address}</div>}
                {s.morning_time && <div style={{ fontSize: 11 }}>🌅 {s.morning_time}</div>}
                {s.evening_time && <div style={{ fontSize: 11 }}>🌆 {s.evening_time}</div>}
                {s.student_count > 0 && <div style={{ fontSize: 11, marginTop: 3 }}>👦 {s.student_count} students</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Auto-fit bounds */}
        {stopPositions.length > 0 && <FitBounds positions={stopPositions} />}
      </MapContainer>
    </div>
  );
}

// ─── Inline mini-map inside the Add/Edit Stop modal ──────────────────────────
function StopPickerMap({ lat, lng, onPick, existingStops = [] }) {
  const center = lat && lng ? [parseFloat(lat), parseFloat(lng)] : [20.5937, 78.9629];
  const zoom   = lat && lng ? 15 : 5;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
      <div style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.08)', fontSize: 11, color: 'var(--text-muted)' }}>
        📍 Click on the map to drop a pin, or use the auto-locate button above
      </div>
      <MapContainer center={center} zoom={zoom} style={{ height: '260px' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          maxZoom={19}
        />
        <MapClickHandler onPick={onPick} />

        {/* Existing route stops (faded) */}
        {existingStops.filter(s => s.latitude && s.longitude).map(s => (
          <Marker
            key={s.stop_id}
            position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
            icon={makeStopIcon(s.sequence_order, s.is_school_stop)}
            opacity={0.5}
          >
            <Popup><div style={{ fontSize: 12 }}>{s.sequence_order}. {s.stop_name}</div></Popup>
          </Marker>
        ))}

        {/* Selected pin */}
        {lat && lng && (
          <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={pickIcon}>
            <Popup><div style={{ fontSize: 12 }}>New stop location<br/><span style={{ fontSize: 10, color: '#64748b' }}>{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</span></div></Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => v || '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0)  return 'expired';
  if (diff < 30) return 'warning';
  return 'ok';
}

const DIRECTION_LABELS = { morning: 'Morning Only', evening: 'Evening Only', both: 'Both Ways' };
const VEHICLE_TYPE_LABELS = { mini_bus: 'Mini Bus', large_bus: 'Large Bus', van: 'Van', tempo_traveller: 'Tempo' };

// ─── Reusable Modal ───────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children, width = '560px', closeOnClickOutside = false }) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (closeOnClickOutside) {
        onClose();
      } else {
        // Prevent accidental closing: subtly animate to signal the modal is active
        setShake(true);
        setTimeout(() => setShake(false), 250);
      }
    }
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: width,
          width: '100%',
          padding: 0,
          transform: shake ? 'scale(1.015)' : 'scale(1)',
          transition: 'transform 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `rgba(${color}, 0.12)`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={`rgb(${color})`} />
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1, color: 'var(--text-heading)' }}>{value ?? '—'}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Route Endpoint Picker Map ───────────────────────────────────────────────
// Shows a single interactive map where the user can:
//   • Click to set START (green) or END (red) pin
//   • Toggle which pin they're placing via a button bar
const startIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:rgba(16,185,129,0.2);border:3px solid #10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.2),0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#10b981;font-family:Outfit,sans-serif;">S</div>`,
  iconSize: [26,26], iconAnchor: [13,13], popupAnchor: [0,-16],
});
const endIcon = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:rgba(244,63,94,0.2);border:3px solid #f43f5e;box-shadow:0 0 0 3px rgba(244,63,94,0.2),0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#f43f5e;font-family:Outfit,sans-serif;">E</div>`,
  iconSize: [26,26], iconAnchor: [13,13], popupAnchor: [0,-16],
});

function RouteEndpointPickerMap({ startLat, startLng, endLat, endLng, activePinMode, onStartPick, onEndPick }) {
  const hasStart = startLat && startLng;
  const hasEnd   = endLat   && endLng;

  // Determine map centre priority: active pin > existing start > existing end > India
  let center = [20.5937, 78.9629];
  let zoom   = 5;
  if (activePinMode === 'start' && hasStart) { center = [parseFloat(startLat), parseFloat(startLng)]; zoom = 13; }
  else if (activePinMode === 'end' && hasEnd) { center = [parseFloat(endLat), parseFloat(endLng)]; zoom = 13; }
  else if (hasStart) { center = [parseFloat(startLat), parseFloat(startLng)]; zoom = 12; }
  else if (hasEnd)   { center = [parseFloat(endLat),   parseFloat(endLng)];   zoom = 12; }

  // Draw a line between start and end if both exist
  const line = hasStart && hasEnd
    ? [[parseFloat(startLat), parseFloat(startLng)], [parseFloat(endLat), parseFloat(endLng)]]
    : null;

  function ClickHandler() {
    useMapEvents({
      click: (e) => {
        if (activePinMode === 'start') onStartPick(e.latlng.lat, e.latlng.lng);
        else                           onEndPick(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
      {/* Instruction bar */}
      <div style={{
        padding: '7px 14px', fontSize: 11, color: 'var(--text-muted)',
        background: activePinMode === 'start' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
        borderBottom: `1px solid ${activePinMode === 'start' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontWeight: 700, color: activePinMode === 'start' ? '#10b981' : '#f43f5e' }}>
          {activePinMode === 'start' ? '🟢 Placing START point' : '🔴 Placing END point'}
        </span>
        <span>— Click anywhere on the map to pin the location</span>
      </div>
      <MapContainer center={center} zoom={zoom} style={{ height: '280px' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          maxZoom={19}
        />
        <ClickHandler />
        {/* Route line */}
        {line && <Polyline positions={line} pathOptions={{ color: '#f59e0b', weight: 2.5, dashArray: '6 4', opacity: 0.7 }} />}
        {/* Start pin */}
        {hasStart && (
          <Marker position={[parseFloat(startLat), parseFloat(startLng)]} icon={startIcon}>
            <Popup><div style={{ fontSize: 12, fontWeight: 700 }}>🟢 Start Point</div></Popup>
          </Marker>
        )}
        {/* End pin */}
        {hasEnd && (
          <Marker position={[parseFloat(endLat), parseFloat(endLng)]} icon={endIcon}>
            <Popup><div style={{ fontSize: 12, fontWeight: 700 }}>🔴 End Point</div></Popup>
          </Marker>
        )}
        {/* Auto-fit when both pins are placed */}
        {hasStart && hasEnd && (
          <FitBounds positions={[[parseFloat(startLat), parseFloat(startLng)], [parseFloat(endLat), parseFloat(endLng)]]} />
        )}
      </MapContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Routes & Fleet Overview
// ═══════════════════════════════════════════════════════════════════════════════
function RoutesTab({ routes, vehicles, staff, academicYear, onRefresh, loading }) {
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [deleting, setDeleting]           = useState(null);
  const [search, setSearch]               = useState('');

  const handleDelete = async (r) => {
    if (!confirm(`Delete route "${r.route_name}"? This cannot be undone.`)) return;
    setDeleting(r.route_id);
    try { await BusService.deleteRoute(r.route_id); onRefresh(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to delete route'); }
    finally { setDeleting(null); }
  };

  const filtered = routes.filter(r =>
    r.route_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.route_code?.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" placeholder="Search routes…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px' }} />
        </div>
      </div>


      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading routes…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <Route size={36} color="var(--accent-amber)" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700 }}>No routes found</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Routes will appear here once added</div>
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(r => {
            const isExpanded = expandedRoute === r.route_id;
            const ins = expiryStatus(r.insurance_expiry);
            return (
              <div key={r.route_id} className="glass-panel" style={{
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                border: r.status === 'active' ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border-subtle)',
              }}>
                {/* Route Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', cursor: 'pointer',
                  background: isExpanded ? 'rgba(245,158,11,0.05)' : 'transparent',
                }} onClick={() => setExpandedRoute(isExpanded ? null : r.route_id)}>
                  {/* Color dot */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'rgba(245,158,11,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Bus size={20} color="#f59e0b" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{r.route_name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontFamily: 'monospace',
                      }}>{r.route_code}</span>
                      <span className={`badge ${r.status === 'active' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                        {r.status?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Milestone size={12} /> {r.stop_count || 0} stops
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} /> {r.student_count || 0} students
                      </span>
                      {r.vehicle_number && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Truck size={12} /> {r.vehicle_number}
                        </span>
                      )}
                      {r.driver_first_name && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={12} /> {r.driver_first_name} {r.driver_last_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="btn btn-danger btn-sm"
                      style={{ padding: '5px 10px', opacity: deleting === r.route_id ? 0.5 : 1 }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                      disabled={deleting === r.route_id}>
                      <Trash2 size={13} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                  </div>

                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    padding: '16px 20px',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
                  }}>
                    {[
                      { label: 'Start Point', value: fmt(r.start_point), icon: Navigation },
                      { label: 'End Point',   value: fmt(r.end_point), icon: MapPin },
                      { label: 'Morning Departure', value: fmtTime(r.morning_start_time), icon: Clock },
                      { label: 'Evening Departure', value: fmtTime(r.evening_start_time), icon: Clock },
                      { label: 'Distance', value: r.total_distance_km ? `${r.total_distance_km} km` : '—', icon: Route },
                      { label: 'Monthly Fee', value: r.monthly_fee ? `₹${r.monthly_fee}` : '—', icon: Hash },
                      { label: 'Annual Fee',  value: r.annual_fee ? `₹${r.annual_fee}` : '—', icon: Hash },
                      { label: 'Vehicle', value: r.vehicle_name || r.vehicle_number || '—', icon: Truck },
                      { label: 'Bus Driver', value: r.driver_first_name ? `${r.driver_first_name} ${r.driver_last_name}` : '—', icon: UserCheck },
                      { label: 'Bus Attender', value: r.conductor_first_name ? `${r.conductor_first_name} ${r.conductor_last_name}` : '—', icon: UserCog },
                    ].map(({ label, value, icon: Ic }) => (
                      <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Ic size={13} color="var(--accent-amber)" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>{value}</div>
                        </div>
                      </div>
                    ))}
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


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Stops Manager (with map)
// ═══════════════════════════════════════════════════════════════════════════════
function StopsTab({ routes, academicYear }) {
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [stops, setStops]  = useState([]);
  const [routePath, setRoutePath] = useState([]); // OSRM waypoints
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editStop, setEditStop] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [generatingPath, setGeneratingPath] = useState(false);
  const [mapView, setMapView] = useState('split'); // 'split' | 'map' | 'list'

  const initForm = {
    stop_name: '', stop_address: '', morning_time: '', evening_time: '',
    landmark: '', is_school_stop: false, latitude: '', longitude: '',
  };
  const [form, setForm] = useState(initForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadStops = useCallback(async (rid) => {
    if (!rid) { setStops([]); return; }
    setLoading(true);
    try {
      const res = await BusService.listStops(rid);
      setStops(res.data?.data || []);
    } catch { setStops([]); }
    finally { setLoading(false); }
  }, []);

  const loadRoutePath = useCallback(async (rid) => {
    if (!rid) { setRoutePath([]); return; }
    try {
      const res = await BusService.getRoutePath(rid);
      setRoutePath(res.data?.data?.waypoints || []);
    } catch { setRoutePath([]); }
  }, []);

  useEffect(() => {
    setRoutePath([]);
    loadStops(selectedRouteId);
    loadRoutePath(selectedRouteId);
  }, [selectedRouteId]);


  const openAdd = () => { setForm(initForm); setEditStop(null); setShowModal(true); };
  const openEdit = (s) => {
    setForm({
      stop_name: s.stop_name, stop_address: s.stop_address || '',
      morning_time: s.morning_time || '', evening_time: s.evening_time || '',
      landmark: s.landmark || '', is_school_stop: !!s.is_school_stop,
      latitude:  s.latitude  ? String(s.latitude)  : '',
      longitude: s.longitude ? String(s.longitude) : '',
    });
    setEditStop(s);
    setShowModal(true);
  };

  // ── Auto-geocode from address ─────────────────────────────────────────────
  const handleGeocode = async () => {
    const addr = form.stop_address || form.stop_name;
    if (!addr) { alert('Enter an address or stop name first'); return; }
    setGeocoding(true);
    try {
      const { lat, lng, display } = await geocodeAddress(addr);
      set('latitude',  String(lat));
      set('longitude', String(lng));
      // If no address was set, fill it from the geocoder result
      if (!form.stop_address) set('stop_address', display.split(',').slice(0, 3).join(', '));
    } catch (e) {
      alert('Could not find this location. Try a more specific address.');
    } finally {
      setGeocoding(false);
    }
  };

  // ── Handle map pin click in modal ─────────────────────────────────────────
  const handleMapPick = (lat, lng) => {
    set('latitude',  String(lat.toFixed(6)));
    set('longitude', String(lng.toFixed(6)));
  };

  const handleSave = async () => {
    if (!form.stop_name) { alert('Stop name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      if (editStop) await BusService.updateStop(editStop.stop_id, payload);
      else          await BusService.createStop(selectedRouteId, payload);
      setShowModal(false);
      loadStops(selectedRouteId);
    } catch (e) { alert(e.response?.data?.message || 'Failed to save stop'); }
    finally { setSaving(false); }
  };

  const handleMove = async (stop, direction) => {
    const idx = stops.findIndex(s => s.stop_id === stop.stop_id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stops.length) return;
    const swapStop = stops[swapIdx];
    try {
      await Promise.all([
        BusService.updateStop(stop.stop_id, { sequence_order: swapStop.sequence_order }),
        BusService.updateStop(swapStop.stop_id, { sequence_order: stop.sequence_order }),
      ]);
      loadStops(selectedRouteId);
    } catch (e) { alert('Failed to reorder stops'); }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete stop "${s.stop_name}"?`)) return;
    setDeleting(s.stop_id);
    try {
      await BusService.deleteStop(s.stop_id);
      loadStops(selectedRouteId);
      // Clear route path since stop layout changed
      setRoutePath([]);
    }
    catch (e) { alert(e.response?.data?.message || 'Failed to delete stop'); }
    finally { setDeleting(null); }
  };

  // ── Generate OSRM road-following path ──────────────────────────────────────
  const handleGeneratePath = async () => {
    const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
    if (stopsWithCoords.length < 2) {
      alert(`Need at least 2 stops with coordinates to generate a road path.\nCurrently ${stopsWithCoords.length} stop(s) have lat/lng set.\nOpen each stop and use Auto-locate or click the map to add coordinates.`);
      return;
    }
    if (!confirm(`Generate road-following path for this route using OpenStreetMap?\nThis will call the free OSRM routing service and save the path.`)) return;
    setGeneratingPath(true);
    try {
      const res = await BusService.generateRoutePath(selectedRouteId);
      const info = res.data?.data;
      alert(`✅ Path generated!\n${info?.waypoint_count} waypoints · ${(info?.distance_m / 1000).toFixed(1)} km · Est. ${Math.round(info?.duration_s / 60)} min`);
      await loadRoutePath(selectedRouteId);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to generate path. Check that the server has internet access (needed to reach OSRM).');
    } finally {
      setGeneratingPath(false);
    }
  };

  const activeRoutes = routes.filter(r => r.status === 'active');
  const selectedRoute = routes.find(r => r.route_id === selectedRouteId);
  const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ flex: 1, minWidth: '280px', marginBottom: 0 }}>
          <select className="input-field" value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}>
            <option value="">— Select a Route to manage stops —</option>
            {activeRoutes.map(r => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_code} — {r.route_name} ({r.stop_count || 0} stops, {r.student_count || 0} students)
              </option>
            ))}
          </select>
        </div>

        {selectedRouteId && (
          <>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
              {[['split', '⊞ Both'], ['list', '☰ List'], ['map', '🗺 Map']].map(([v, label]) => (
                <button key={v} onClick={() => setMapView(v)} style={{
                  padding: '6px 14px', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: mapView === v ? 'var(--primary)' : 'transparent',
                  color: mapView === v ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Generate OSRM path button */}
            <button
              onClick={handleGeneratePath}
              disabled={generatingPath}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: routePath.length > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: routePath.length > 0 ? '#10b981' : '#f59e0b',
                opacity: generatingPath ? 0.6 : 1,
              }}
              title="Generate road-following path using OpenStreetMap OSRM (free, no API key)"
            >
              <Navigation size={12} style={generatingPath ? { animation: 'spin 1s linear infinite' } : {}} />
              {generatingPath ? 'Generating…' : routePath.length > 0 ? '✓ Path Ready' : 'Generate Path'}
            </button>

            <button className="btn btn-primary" onClick={openAdd} style={{ gap: '6px' }}>
              <Plus size={16} /> Add Stop
            </button>
          </>
        )}
      </div>

      {!selectedRouteId ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Map size={40} color="var(--accent-amber)" style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 16, fontWeight: 700 }}>Select a Route</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Choose a route above to view its stop timeline and route map
          </div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading stops…</div>
        </div>
      ) : (
        <>
          {/* Route info banner */}
          <div style={{
            padding: '10px 16px', borderRadius: 'var(--radius-md)',
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
            display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>🚌 {selectedRoute?.route_name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stops.length} stops total</span>
            <span style={{ fontSize: 12, color: stopsWithCoords.length === stops.length ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              📍 {stopsWithCoords.length}/{stops.length} mapped
            </span>
            {selectedRoute?.vehicle_number && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🚐 {selectedRoute.vehicle_number}</span>}
            {selectedRoute?.morning_start_time && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🌅 {fmtTime(selectedRoute.morning_start_time)}</span>}
            {selectedRoute?.evening_start_time && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🌆 {fmtTime(selectedRoute.evening_start_time)}</span>}
          </div>

          {/* ── Layout: split / list / map ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: mapView === 'split' ? '380px 1fr'
              : mapView === 'list' ? '1fr'
              : '1fr',
            gap: '20px',
            alignItems: 'start',
          }}>

            {/* ── Stop Timeline (list) ── */}
            {mapView !== 'map' && (
              <div>
                {stops.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
                    <MapPin size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No stops yet. Click "Add Stop" to begin.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {stops.map((s, idx) => (
                      <div key={s.stop_id} style={{ display: 'flex', gap: '14px', alignItems: 'stretch' }}>
                        {/* Timeline dot + connector */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34, flexShrink: 0 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: s.is_school_stop ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.15)',
                            border: `2px solid ${s.is_school_stop ? '#6366f1' : '#f59e0b'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: s.is_school_stop ? '#6366f1' : '#f59e0b',
                          }}>{s.sequence_order}</div>
                          {idx < stops.length - 1 && (
                            <div style={{ width: 2, flex: 1, minHeight: 18, background: 'rgba(245,158,11,0.2)', margin: '3px 0' }} />
                          )}
                        </div>

                        {/* Stop card */}
                        <div className="glass-panel" style={{
                          flex: 1, padding: '12px 14px', marginBottom: 6,
                          border: s.is_school_stop ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.stop_name}</span>
                                {s.is_school_stop && <span className="badge badge-primary" style={{ fontSize: 9 }}>SCHOOL</span>}
                                {s.student_count > 0 && (
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>👦 {s.student_count}</span>
                                )}
                                {/* Mapped indicator */}
                                {s.latitude && s.longitude ? (
                                  <span style={{ fontSize: 10, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <LocateFixed size={10} /> Mapped
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Crosshair size={10} /> No coords
                                  </span>
                                )}
                              </div>
                              {s.stop_address && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.stop_address}</div>}
                              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {s.morning_time && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🌅 {fmtTime(s.morning_time)}</span>}
                                {s.evening_time && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🌆 {fmtTime(s.evening_time)}</span>}
                                {s.landmark && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📍 {s.landmark}</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '3px 7px' }}
                                onClick={() => handleMove(s, 'up')} disabled={idx === 0}><ChevronUp size={12} /></button>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '3px 7px' }}
                                onClick={() => handleMove(s, 'down')} disabled={idx === stops.length - 1}><ChevronDown size={12} /></button>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '3px 7px' }} onClick={() => openEdit(s)}><Edit2 size={12} /></button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '3px 7px', opacity: deleting === s.stop_id ? 0.5 : 1 }}
                                onClick={() => handleDelete(s)} disabled={deleting === s.stop_id}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Route Map ── */}
            {mapView !== 'list' && (
              <RouteMapPanel stops={stops} routePath={routePath} />
            )}
          </div>
        </>
      )}

      {/* ── Add / Edit Stop Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editStop ? `Edit Stop: ${editStop.stop_name}` : 'Add Stop to Route'}
        width="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Stop Name *</label>
              <input className="input-field" placeholder="e.g. City Park Gate" value={form.stop_name} onChange={e => set('stop_name', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Nearby Landmark</label>
              <input className="input-field" placeholder="e.g. Near Petrol Pump" value={form.landmark} onChange={e => set('landmark', e.target.value)} />
            </div>
          </div>

          {/* Address + geocode button */}
          <div className="input-group">
            <label className="input-label">Address</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input-field"
                placeholder="Type full address to auto-locate on map…"
                value={form.stop_address}
                onChange={e => set('stop_address', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGeocode()}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-secondary"
                onClick={handleGeocode}
                disabled={geocoding}
                title="Auto-locate from address (uses OpenStreetMap)"
                style={{ gap: 5, flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                <LocateFixed size={14} />
                {geocoding ? 'Locating…' : 'Auto-locate 📍'}
              </button>
            </div>
          </div>

          {/* Lat / Lng manual fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Latitude</label>
              <input className="input-field" placeholder="e.g. 28.6139" value={form.latitude}
                onChange={e => set('latitude', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Longitude</label>
              <input className="input-field" placeholder="e.g. 77.2090" value={form.longitude}
                onChange={e => set('longitude', e.target.value)} />
            </div>
          </div>

          {/* Inline map picker */}
          <StopPickerMap
            lat={form.latitude}
            lng={form.longitude}
            onPick={handleMapPick}
            existingStops={stops.filter(s => !editStop || s.stop_id !== editStop.stop_id)}
          />

          {/* Timings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Morning Pickup Time</label>
              <input className="input-field" type="time" value={form.morning_time} onChange={e => set('morning_time', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Evening Drop Time</label>
              <input className="input-field" type="time" value={form.evening_time} onChange={e => set('evening_time', e.target.value)} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_school_stop} onChange={e => set('is_school_stop', e.target.checked)} />
            This is the School Gate stop (shown in blue on the map)
          </label>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : (editStop ? 'Save Changes' : 'Add Stop')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Student Assignments
// ═══════════════════════════════════════════════════════════════════════════════
function StudentAssignmentsTab({ routes, academicYear, students }) {
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination]   = useState({});
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [stops, setStops]             = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const page = 1;

  const initForm = { student_id: '', route_id: '', stop_id: '', direction: 'both', fee_amount: '', fee_type: 'monthly', is_free: false, notes: '' };
  const [form, setForm] = useState(initForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const res = await BusService.listStudentAssignments({
        academic_year_id: academicYear.academic_year_id,
        route_id: filterRoute || undefined,
        status: filterStatus || undefined,
        search: search || undefined,
        all: true,
      });
      setAssignments(res.data?.data?.assignments || []);
      setPagination(res.data?.data?.pagination || {});
    } catch { setAssignments([]); }
    finally { setLoading(false); }
  }, [academicYear, filterRoute, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  const loadStops = async (routeId) => {
    if (!routeId) { setStops([]); return; }
    try {
      const res = await BusService.listStops(routeId);
      setStops(res.data?.data || []);
    } catch { setStops([]); }
  };

  const handleAssign = async () => {
    if (!form.student_id || !form.route_id || !form.stop_id) {
      alert('Student, route, and stop are required'); return;
    }
    setSaving(true);
    try {
      await BusService.assignStudent({ ...form, academic_year_id: academicYear.academic_year_id });
      setShowModal(false);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed to assign student'); }
    finally { setSaving(false); }
  };

  const handleUnassign = async (id) => {
    if (!confirm('Unassign this student from the bus route?')) return;
    try { await BusService.unassignStudent(id); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed to unassign'); }
  };

  const exportXLSX = () => {
    const rows = assignments.map(a => ({
      'Admission No':  a.admission_number,
      'Student Name':  `${a.first_name} ${a.last_name}`,
      'Class':         `${a.class_name || ''} ${a.section_name || ''}`.trim(),
      'Route':         a.route_name,
      'Stop':          a.stop_name,
      'Direction':     DIRECTION_LABELS[a.direction] || a.direction,
      'Fee':           a.is_free ? 'Free' : (a.fee_amount ? `₹${a.fee_amount}` : '—'),
      'Fee Type':      a.fee_type || '—',
      'Status':        a.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bus Assignments');
    XLSX.writeFile(wb, `bus_assignments_${academicYear?.name || 'export'}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" placeholder="Search by name or admission no…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, height: 38 }} />
        </div>
        <select className="input-field" value={filterRoute} onChange={e => setFilterRoute(e.target.value)} style={{ height: 38, flex: '0 1 200px' }}>
          <option value="">All Routes</option>
          {routes.map(r => <option key={r.route_id} value={r.route_id}>{r.route_code} — {r.route_name}</option>)}
        </select>
        <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height: 38, flex: '0 1 140px' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn btn-secondary" onClick={exportXLSX} style={{ gap: 6, height: 38 }}>
          <Download size={14} /> Export
        </button>
        <button className="btn btn-primary" onClick={() => { setForm(initForm); setStops([]); setShowModal(true); }} style={{ gap: 6, height: 38 }}>
          <Plus size={14} /> Assign Student
        </button>
      </div>

      {/* Count banner */}
      {!loading && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Showing <strong>{assignments.length}</strong> assignment{assignments.length !== 1 ? 's' : ''}
          {filterStatus === 'active' ? ' (active)' : ''}
        </div>
      )}

      {/* Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Student', 'Adm. No', 'Class', 'Route', 'Stop', 'Direction', 'Fee', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} /><br />Loading…
                </td></tr>
              ) : assignments.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <UserX size={28} style={{ marginBottom: 8 }} /><br />No assignments found
                </td></tr>
              ) : assignments.map(a => (
                <tr key={a.assignment_id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--table-row-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.first_name} {a.last_name}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{a.admission_number}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{a.class_name} {a.section_name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>{a.route_code}</span>
                    <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-secondary)' }}>{a.route_name}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CircleDot size={10} color="var(--accent-amber)" />
                      {a.stop_name}
                    </div>
                    {a.morning_time && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtTime(a.morning_time)}</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className={`badge ${a.direction === 'both' ? 'badge-primary' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                      {DIRECTION_LABELS[a.direction] || a.direction}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {a.is_free ? <span style={{ color: 'var(--accent-emerald)', fontSize: 12 }}>Free</span>
                      : a.fee_amount ? `₹${a.fee_amount}` : '—'}
                    {a.fee_type && !a.is_free && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.fee_type}</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className={`badge ${a.status === 'active' ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                      {a.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleUnassign(a.assignment_id)} title="Unassign">
                      <UserX size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Assign Student to Bus Route" width="560px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="input-group">
            <label className="input-label">Student *</label>
            <select className="input-field" value={form.student_id} onChange={e => set('student_id', e.target.value)}>
              <option value="">— Select Student —</option>
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>
                  {s.first_name} {s.last_name} ({s.admission_number}) {s.class_name ? `• ${s.class_name}${s.section_name ? ' ' + s.section_name : ''}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Route *</label>
            <select className="input-field" value={form.route_id} onChange={e => { set('route_id', e.target.value); set('stop_id', ''); loadStops(e.target.value); }}>
              <option value="">— Select Route —</option>
              {routes.filter(r => r.status === 'active').map(r => (
                <option key={r.route_id} value={r.route_id}>{r.route_code} — {r.route_name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Boarding Stop *</label>
            <select className="input-field" value={form.stop_id} onChange={e => set('stop_id', e.target.value)} disabled={!form.route_id}>
              <option value="">— Select Stop —</option>
              {stops.map(s => <option key={s.stop_id} value={s.stop_id}>{s.sequence_order}. {s.stop_name}{s.morning_time ? ` (${fmtTime(s.morning_time)})` : ''}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Direction</label>
            <select className="input-field" value={form.direction} onChange={e => set('direction', e.target.value)}>
              <option value="both">Both Ways (Morning pickup + Evening drop)</option>
              <option value="morning">Morning Only (pickup)</option>
              <option value="evening">Evening Only (drop)</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Fee Amount (₹)</label>
              <input className="input-field" type="number" placeholder="0" value={form.fee_amount}
                onChange={e => set('fee_amount', e.target.value)} disabled={form.is_free} />
            </div>
            <div className="input-group">
              <label className="input-label">Fee Type</label>
              <select className="input-field" value={form.fee_type} onChange={e => set('fee_type', e.target.value)} disabled={form.is_free}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} />
            Fee Waiver / Scholarship (no charge)
          </label>
          <div className="input-group">
            <label className="input-label">Notes</label>
            <input className="input-field" placeholder="Optional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>
              {saving ? 'Assigning…' : 'Assign Student'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function BusView({ students = [], staff = [], classes = [], school, academicYear, initialTab = 'routes' }) {
  const normalizeTab = (t) => (t === 'fleet' ? 'bus-management' : t || 'routes');
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));
  const [summary, setSummary]   = useState({});
  const [routes, setRoutes]     = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(normalizeTab(initialTab));
  }, [initialTab]);

  const loadAll = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const [sumRes, routeRes, vehicleRes] = await Promise.all([
        BusService.getSummary({ academic_year_id: academicYear.academic_year_id }),
        BusService.listRoutes({ academic_year_id: academicYear.academic_year_id }),
        BusService.listVehicles(),
      ]);
      setSummary(sumRes.data?.data || {});
      setRoutes(routeRes.data?.data || []);
      setVehicles(vehicleRes.data?.data || []);
    } catch (err) {
      console.error('Bus module load error:', err);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const TABS = [
    { id: 'routes',          label: 'Routes & Overview',    icon: Route },
    { id: 'stops',           label: 'Stops Manager',        icon: MapPin },
    { id: 'students',        label: 'Student Assignments',  icon: Users },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bus size={22} color="#f59e0b" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>Bus Transportation</h1>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
                Fleet, routes & student pickups · {academicYear?.name}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-amber" style={{ padding: '6px 12px' }}>
            <Sparkles size={12} /> Zero Data Duplication
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading} style={{ gap: 5 }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <StatCard icon={Route}       label="Active Routes"        value={summary.total_routes}   color="245,158,11" />
        <StatCard icon={Truck}       label="Fleet Vehicles"       value={summary.total_vehicles} color="99,102,241" />
        <StatCard icon={Users}       label="Students on Bus"      value={summary.total_assigned} color="16,185,129" />
        <StatCard icon={AlertTriangle} label="Documents Expiring" value={summary.expiring_soon}  color="244,63,94"
          sub={summary.expiring_soon > 0 ? 'Attention required' : 'All clear'} />
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '4px', padding: '4px',
        background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)', flexWrap: 'wrap',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', padding: '8px 16px', borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: isActive ? 700 : 500,
              background: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
              color: isActive ? '#f59e0b' : 'var(--text-secondary)',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'routes' && (
          <RoutesTab routes={routes} vehicles={vehicles} staff={staff}
            academicYear={academicYear} onRefresh={loadAll} loading={loading} />
        )}
        {activeTab === 'stops' && (
          <StopsTab routes={routes} academicYear={academicYear} />
        )}
        {activeTab === 'students' && (
          <StudentAssignmentsTab routes={routes} academicYear={academicYear} students={students} />
        )}
      </div>
    </div>
  );
}

export default BusView;
