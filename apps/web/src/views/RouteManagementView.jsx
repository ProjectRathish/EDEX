import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Route, Plus, Edit2, Trash2, Search, RefreshCw, Bus,
  MapPin, Clock, Users, ArrowRight, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, DollarSign, Navigation, Shield, Compass,
  Milestone, Calendar, X, ArrowUpDown, Info, Truck,
  LocateFixed, Crosshair, Map, Sparkles
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { BusService } from "../services/api";

// ─── Fix Leaflet default marker icons (Vite asset path issue) ─────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Custom Icons for Stop Modal Map ─────────────────────────────────────────
const activeStopPinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:#4f46e5;border:3px solid #ffffff;
    box-shadow:0 0 0 4px rgba(79,70,229,0.35),0 4px 12px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
    color:#ffffff;font-size:18px;cursor:grab;
  ">📍</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -22],
});

function makeOtherStopIcon(seq, isSchool) {
  const color = isSchool ? "#166534" : "#4338ca";
  const bg = isSchool ? "#dcfce7" : "#e0e7ff";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${bg};border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;color:${color};
      font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.25);
    ">${seq}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  });
}

function ModalMapClickHandler({ onPick }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function ModalMapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

function InvalidateSizeEffect() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function StopPickerMap({ stopForm, existingStops, editingStop, onPick }) {
  const markerRef = useRef(null);

  const parsedLat = parseFloat(stopForm.latitude);
  const parsedLng = parseFloat(stopForm.longitude);
  const hasActiveCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

  const firstWithCoords = existingStops.find((s) => s.latitude && s.longitude);
  const defaultCenter = hasActiveCoords
    ? [parsedLat, parsedLng]
    : firstWithCoords
    ? [parseFloat(firstWithCoords.latitude), parseFloat(firstWithCoords.longitude)]
    : [13.0827, 80.2707];

  const markerEvents = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onPick(latLng.lat, latLng.lng);
        }
      },
    }),
    [onPick]
  );

  return (
    <MapContainer
      center={defaultCenter}
      zoom={hasActiveCoords ? 15 : 12}
      style={{ width: "100%", height: "100%", minHeight: 460 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <InvalidateSizeEffect />
      <ModalMapClickHandler onPick={onPick} />
      {hasActiveCoords && <ModalMapRecenter center={[parsedLat, parsedLng]} />}

      {existingStops.map((s, idx) => {
        if (!s.latitude || !s.longitude || (editingStop && s.stop_id === editingStop.stop_id)) return null;
        return (
          <Marker
            key={s.stop_id}
            position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
            icon={makeOtherStopIcon(s.sequence_order || idx + 1, s.is_school_stop)}
          >
            <Popup>
              <div style={{ fontSize: 12, fontWeight: 800 }}>
                #{s.sequence_order || idx + 1} {s.stop_name}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {s.is_school_stop ? "School Gate" : `Morning: ${fmtTime(s.morning_time)}`}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {hasActiveCoords && (
        <Marker
          ref={markerRef}
          draggable={true}
          eventHandlers={markerEvents}
          position={[parsedLat, parsedLng]}
          icon={activeStopPinIcon}
        >
          <Popup>
            <div style={{ fontSize: 12, fontWeight: 800 }}>
              {stopForm.stop_name || "New Stop Pin"}
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              Drag to adjust position or click anywhere on map
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

function StudioFitBounds({ positions, resetTrigger }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions, { padding: [60, 60], maxZoom: 16 });
    }
  }, [positions, resetTrigger, map]);
  return null;
}

function StudioFlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.flyTo(coords, 16, { duration: 0.9 });
    }
  }, [coords, map]);
  return null;
}

function makeStudioStopIcon(seq, isSchool, isSelected) {
  const stroke = isSchool ? "#16a34a" : isSelected ? "#4f46e5" : "#6366f1";
  const bg = isSchool ? "#dcfce7" : isSelected ? "#4f46e5" : "#ffffff";
  const textCol = isSchool ? "#166534" : isSelected ? "#ffffff" : "#4338ca";
  const shadow = isSelected
    ? "box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.4), 0 8px 18px rgba(0,0,0,0.35); transform: scale(1.2);"
    : "box-shadow: 0 2px 8px rgba(0,0,0,0.22);";

  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${bg}; border: 2.5px solid ${stroke};
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 900; color: ${textCol};
      font-family: system-ui, -apple-system, sans-serif;
      ${shadow} transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    ">${isSchool ? "🏫" : seq}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Calculate geographic distance along waypoints (or stops) in km using Haversine formula
function calculatePathDistanceKm(coords) {
  if (!coords || coords.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = parseFloat(coords[i].latitude !== undefined ? coords[i].latitude : coords[i][0]);
    const lon1 = parseFloat(coords[i].longitude !== undefined ? coords[i].longitude : coords[i][1]);
    const lat2 = parseFloat(coords[i + 1].latitude !== undefined ? coords[i + 1].latitude : coords[i + 1][0]);
    const lon2 = parseFloat(coords[i + 1].longitude !== undefined ? coords[i + 1].longitude : coords[i + 1][1]);
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) continue;

    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalMeters += R * c;
  }
  return Number((totalMeters / 1000).toFixed(1));
}

function RouteStudioModal({ route, stops, waypoints, loadingPath, onClose, onGeneratePath }) {
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [flyCoords, setFlyCoords] = useState(null);
  const [resetFitCount, setResetFitCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const markerRefs = useRef({});

  const stopPositions = stops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => [parseFloat(s.latitude), parseFloat(s.longitude)]);

  const pathPositions = (waypoints || []).map((wp) => [
    parseFloat(wp.latitude),
    parseFloat(wp.longitude),
  ]);

  const allPositions = pathPositions.length > 0 ? pathPositions : stopPositions;
  const defaultCenter = allPositions.length > 0 ? allPositions[0] : [13.0827, 80.2707];

  const calculatedDistance = useMemo(() => {
    if (route.total_distance_km && parseFloat(route.total_distance_km) > 0) {
      return `${parseFloat(route.total_distance_km).toFixed(1)} km`;
    }
    if (waypoints && waypoints.length > 1) {
      const d = calculatePathDistanceKm(waypoints);
      if (d > 0) return `${d} km`;
    }
    const withCoords = stops.filter((s) => s.latitude && s.longitude);
    if (withCoords.length > 1) {
      const d = calculatePathDistanceKm(withCoords);
      if (d > 0) return `~${d} km`;
    }
    return "—";
  }, [route.total_distance_km, waypoints, stops]);

  const estimatedDuration = useMemo(() => {
    const km = parseFloat(calculatedDistance);
    if (!isNaN(km) && km > 0) {
      const mins = Math.round((km / 25) * 60);
      if (mins < 60) return `~${mins} min`;
      return `~${Math.floor(mins / 60)}h ${mins % 60}m`;
    }
    return null;
  }, [calculatedDistance]);

  const handleSelectStop = (s) => {
    if (!s.latitude || !s.longitude) return;
    setSelectedStopId(s.stop_id);
    const coords = [parseFloat(s.latitude), parseFloat(s.longitude)];
    setFlyCoords(coords);
    const marker = markerRefs.current[s.stop_id];
    if (marker) {
      marker.openPopup();
    }
  };

  const handleResetView = () => {
    setSelectedStopId(null);
    setResetFitCount((c) => c + 1);
  };

  const filteredStops = useMemo(() => {
    if (!searchQuery.trim()) return stops;
    const q = searchQuery.toLowerCase();
    return stops.filter((s) =>
      (s.stop_name || "").toLowerCase().includes(q) ||
      (s.landmark || "").toLowerCase().includes(q)
    );
  }, [stops, searchQuery]);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      bottom: 0,
      right: 0,
      left: "260px",
      background: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1200,
      padding: 16
    }}>
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-xl)",
        width: "calc(100% - 32px)",
        maxWidth: "100%",
        height: "calc(100vh - 32px)",
        maxHeight: "96vh",
        border: "1.5px solid var(--border-subtle)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP HEADER BAR ────────────────────────────────────────────── */}
        <div style={{
          padding: "14px 24px", borderBottom: "1.5px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--bg-surface-elevated)", flexWrap: "wrap", gap: 14
        }}>
          {/* Route Identification */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260 }}>
            <span style={{
              fontSize: 13, fontWeight: 900, background: "#4f46e5",
              color: "#ffffff", padding: "5px 12px", borderRadius: 8,
              letterSpacing: "0.04em", boxShadow: "0 2px 8px rgba(79, 70, 229, 0.35)"
            }}>
              {route.route_code}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--text-heading)" }}>
                  {route.route_name}
                </h3>
                <span style={{
                  fontSize: 10, padding: "2px 7px", borderRadius: 4,
                  background: "rgba(99, 102, 241, 0.12)", color: "#6366f1",
                  fontWeight: 800, textTransform: "uppercase"
                }}>
                  Route Map
                </span>
              </div>
              {(route.start_point || route.end_point) && (
                <div style={{
                  fontSize: 11, color: "var(--text-secondary)", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6, marginTop: 2
                }}>
                  <span>{route.start_point || "Origin"}</span>
                  <ArrowRight size={11} style={{ color: "var(--text-muted)" }} />
                  <span>{route.end_point || "School"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Total Distance & Estimated Duration */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              padding: "5px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7
            }}>
              <Navigation size={13} style={{ color: "#10b981" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", lineHeight: 1 }}>
                  Route Distance
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-heading)", marginTop: 2 }}>
                  {calculatedDistance}
                  {estimatedDuration && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981", marginLeft: 4 }}>
                      ({estimatedDuration})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Stops Count */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              padding: "5px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7
            }}>
              <Milestone size={13} style={{ color: "#6366f1" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", lineHeight: 1 }}>
                  Total Stops
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-heading)", marginTop: 2 }}>
                  {stops.length} Stops
                </span>
              </div>
            </div>

            {/* Vehicle Assigned */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              padding: "5px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7
            }}>
              <Bus size={13} style={{ color: "#f59e0b" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", lineHeight: 1 }}>
                  Assigned Bus
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-heading)", marginTop: 2 }}>
                  {route.vehicle_number || "Unassigned"}
                </span>
              </div>
            </div>

            {/* Student Count */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              padding: "5px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 7
            }}>
              <Users size={13} style={{ color: "#38bdf8" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", lineHeight: 1 }}>
                  Commuters
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-heading)", marginTop: 2 }}>
                  {route.student_count || 0} Students
                </span>
              </div>
            </div>

            {/* Road Status Chip */}
            <div style={{
              background: pathPositions.length > 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              border: `1px solid ${pathPositions.length > 1 ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              padding: "5px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6
            }}>
              {pathPositions.length > 1 ? (
                <>
                  <CheckCircle2 size={13} style={{ color: "#10b981" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>Road Path Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>Direct Line</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onGeneratePath}
              disabled={loadingPath}
              className="btn btn-sm"
              style={{
                background: pathPositions.length <= 1 ? "var(--primary)" : "var(--bg-surface)",
                color: pathPositions.length <= 1 ? "#ffffff" : "var(--text-primary)",
                border: pathPositions.length <= 1 ? "none" : "1.5px solid var(--border-subtle)",
                fontWeight: 800, fontSize: 12, height: 34, padding: "0 14px",
                display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8
              }}
              title="Compute street-level driving route via OSRM"
            >
              {loadingPath ? (
                <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              ) : pathPositions.length <= 1 ? (
                <Sparkles size={13} />
              ) : (
                <RefreshCw size={13} />
              )}
              {loadingPath ? "Calculating Roads..." : pathPositions.length <= 1 ? "Sync Road Path (OSRM)" : "Re-calculate Roads"}
            </button>

            <button
              onClick={onClose}
              className="btn btn-sm btn-secondary"
              style={{ fontWeight: 700, height: 34 }}
            >
              Close
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none", color: "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", padding: 4,
                borderRadius: 6
              }}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── SIDE-BY-SIDE MAIN WORKSPACE ───────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "440px 1fr",
          flex: 1, minHeight: 0, overflow: "hidden"
        }}>
          {/* ── LEFT COLUMN: Details & Interactive Stops Timeline ───────── */}
          <div style={{
            borderRight: "1.5px solid var(--border-subtle)", background: "var(--bg-surface)",
            display: "flex", flexDirection: "column", height: "100%", minHeight: 0
          }}>
            {/* Shift & Fleet Information Card */}
            <div style={{
              padding: "16px 20px", borderBottom: "1.5px solid var(--border-subtle)",
              background: "var(--bg-surface-elevated)"
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10
              }}>
                <div style={{
                  background: "var(--bg-surface)", padding: "10px 12px",
                  borderRadius: 10, border: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#d97706", marginBottom: 3 }}>
                    <Clock size={12} />
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>Morning Pickup</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-heading)" }}>
                    {fmtTime(route.morning_start_time)}
                  </div>
                </div>

                <div style={{
                  background: "var(--bg-surface)", padding: "10px 12px",
                  borderRadius: 10, border: "1px solid var(--border-subtle)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#4f46e5", marginBottom: 3 }}>
                    <Clock size={12} />
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>Evening Drop</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-heading)" }}>
                    {fmtTime(route.evening_start_time)}
                  </div>
                </div>
              </div>

              {/* Road Sync Info Banner */}
              {pathPositions.length <= 1 && (
                <div style={{
                  marginTop: 12, padding: "10px 12px", borderRadius: 8,
                  background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)",
                  display: "flex", alignItems: "flex-start", gap: 8
                }}>
                  <Info size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Road polyline is not yet calculated. Click <strong>Sync Road Path (OSRM)</strong> in the top header to trace actual driving roads.
                  </div>
                </div>
              )}
            </div>

            {/* Stops Timeline Header & Search */}
            <div style={{
              padding: "14px 20px 10px", display: "flex", flexDirection: "column", gap: 10,
              borderBottom: "1px solid var(--border-subtle)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "var(--text-heading)" }}>
                    Route Stops Timeline
                  </h4>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Click any stop to focus & zoom map
                  </span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 20,
                  background: "rgba(99, 102, 241, 0.12)", color: "#6366f1"
                }}>
                  {filteredStops.length} of {stops.length} Stops
                </span>
              </div>

              {stops.length > 4 && (
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stops or landmarks…"
                    style={{
                      width: "100%", padding: "6px 10px 6px 30px", fontSize: 12,
                      borderRadius: 8, border: "1px solid var(--border-subtle)",
                      background: "var(--bg-main)", color: "var(--text-primary)",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Scrollable Stops Timeline List */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex",
              flexDirection: "column", gap: 10
            }}>
              {filteredStops.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
                  <Milestone size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <div style={{ fontSize: 13, fontWeight: 700 }}>No stops found</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Add stops to this route using the route manager.</div>
                </div>
              ) : (
                filteredStops.map((s, idx) => {
                  const isSelected = selectedStopId === s.stop_id;
                  const hasCoords = s.latitude && s.longitude;
                  const isLast = idx === filteredStops.length - 1;
                  const isSchool = s.is_school_stop || isLast;

                  return (
                    <div
                      key={s.stop_id}
                      onClick={() => handleSelectStop(s)}
                      style={{
                        padding: "12px 14px", borderRadius: 10,
                        border: isSelected ? "1.5px solid #6366f1" : "1px solid var(--border-subtle)",
                        background: isSelected ? "rgba(99, 102, 241, 0.08)" : "var(--bg-surface-elevated)",
                        cursor: hasCoords ? "pointer" : "default",
                        boxShadow: isSelected ? "0 4px 14px rgba(99, 102, 241, 0.15)" : "none",
                        transition: "all 0.18s ease",
                        display: "flex", flexDirection: "column", gap: 8
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && hasCoords) {
                          e.currentTarget.style.borderColor = "var(--border-strong)";
                          e.currentTarget.style.transform = "translateX(2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "var(--border-subtle)";
                          e.currentTarget.style.transform = "none";
                        }
                      }}
                    >
                      {/* Top Row: Sequence Badge, Stop Name & School Tag */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: isSchool ? "#16a34a" : isSelected ? "#4f46e5" : "var(--primary)",
                            color: "#ffffff", fontSize: 10, fontWeight: 900,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                          }}>
                            {isSchool ? "🏫" : (s.sequence_order || idx + 1)}
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 800,
                            color: isSelected ? "#4f46e5" : "var(--text-heading)",
                            lineHeight: 1.2
                          }}>
                            {s.stop_name}
                          </span>
                        </div>

                        {isSelected && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: "2px 6px",
                            borderRadius: 4, background: "#6366f1", color: "#ffffff"
                          }}>
                            Focused
                          </span>
                        )}
                      </div>

                      {/* Landmark if present */}
                      {s.landmark && (
                        <div style={{
                          fontSize: 11, color: "var(--text-secondary)", display: "flex",
                          alignItems: "center", gap: 4, paddingLeft: 30
                        }}>
                          <MapPin size={11} style={{ color: "#818cf8" }} />
                          <span>{s.landmark}</span>
                        </div>
                      )}

                      {/* Timing & Student Badges Row */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        paddingLeft: 30, fontSize: 11, flexWrap: "wrap", gap: 6
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#d97706", fontWeight: 700 }}>
                            🌅 {fmtTime(s.morning_time)}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>•</span>
                          <span style={{ color: "#4f46e5", fontWeight: 700 }}>
                            🌆 {fmtTime(s.evening_time)}
                          </span>
                        </div>

                        {s.student_count > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
                            background: "rgba(56, 189, 248, 0.12)", color: "#0284c7"
                          }}>
                            👥 {s.student_count} boarding
                          </span>
                        )}
                      </div>

                      {/* Coordinate Status warning if missing */}
                      {!hasCoords && (
                        <div style={{
                          paddingLeft: 30, fontSize: 10, color: "#d97706", fontWeight: 700
                        }}>
                          ⚠️ Coordinates missing — position not shown on map
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: High-Contrast Leaflet Map Studio View ──────── */}
          <div style={{ position: "relative", height: "100%", minHeight: 0, width: "100%" }}>
            {/* Floating Top Studio Control HUD */}
            <div style={{
              position: "absolute", top: 14, left: 16, right: 16, zIndex: 1000,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              pointerEvents: "none"
            }}>
              {/* Studio Canvas Status Pill */}
              <div style={{
                background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)",
                color: "#ffffff", padding: "6px 14px", borderRadius: 20, fontSize: 11,
                fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 6px 20px rgba(0,0,0,0.35)", pointerEvents: "auto",
                border: "1px solid rgba(255, 255, 255, 0.15)"
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#10b981",
                  boxShadow: "0 0 8px #10b981"
                }} />
                <span>
                  {pathPositions.length > 1 ? "Real-World OSRM Road Geometry" : "Stops Coordinate Network"}
                </span>
                <span style={{ color: "#94a3b8" }}>•</span>
                <span style={{ color: "#818cf8" }}>{stopPositions.length} Plotted Pins</span>
              </div>

              {/* View Reset Control */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="btn btn-sm"
                  style={{
                    background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)",
                    color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.35)", display: "flex",
                    alignItems: "center", gap: 6, cursor: "pointer"
                  }}
                  title="Fit whole route inside viewport"
                >
                  <LocateFixed size={12} style={{ color: "#818cf8" }} />
                  Fit Whole Route
                </button>
              </div>
            </div>

            {/* Map Container */}
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <InvalidateSizeEffect />
              {allPositions.length > 0 && (
                <StudioFitBounds positions={allPositions} resetTrigger={resetFitCount} />
              )}
              {flyCoords && <StudioFlyTo coords={flyCoords} />}

              {/* Outer Contrast Casing for Highlighted Route Line */}
              {pathPositions.length > 1 && (
                <Polyline
                  positions={pathPositions}
                  pathOptions={{
                    color: "#0f172a",
                    weight: 10,
                    opacity: 0.85,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}

              {/* Inner Vibrant High-Contrast Route Line */}
              {pathPositions.length > 1 && (
                <Polyline
                  positions={pathPositions}
                  pathOptions={{
                    color: "#6366f1",
                    weight: 5,
                    opacity: 1,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}

              {/* Fallback dashed connector if OSRM not yet generated */}
              {pathPositions.length <= 1 && stopPositions.length > 1 && (
                <Polyline
                  positions={stopPositions}
                  pathOptions={{
                    color: "#f59e0b",
                    weight: 4,
                    dashArray: "8, 10",
                    opacity: 0.9,
                  }}
                />
              )}

              {/* Sequential Stop Markers */}
              {stops.map((s, idx) => {
                if (!s.latitude || !s.longitude) return null;
                const isLast = idx === stops.length - 1;
                const isSchool = s.is_school_stop || isLast;
                const isSelected = selectedStopId === s.stop_id;

                return (
                  <Marker
                    key={s.stop_id}
                    ref={(ref) => {
                      if (ref) markerRefs.current[s.stop_id] = ref;
                    }}
                    position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
                    icon={makeStudioStopIcon(s.sequence_order || idx + 1, isSchool, isSelected)}
                    eventHandlers={{
                      click: () => {
                        setSelectedStopId(s.stop_id);
                        setFlyCoords([parseFloat(s.latitude), parseFloat(s.longitude)]);
                      }
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 170, padding: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 900, background: isSchool ? "#16a34a" : "#4f46e5",
                            color: "#ffffff", padding: "2px 6px", borderRadius: 4
                          }}>
                            {isSchool ? "School Gate" : `#${s.sequence_order || idx + 1}`}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>
                            {s.stop_name}
                          </span>
                        </div>

                        {s.landmark && (
                          <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>
                            📍 {s.landmark}
                          </div>
                        )}

                        <div style={{
                          background: "#f8fafc", padding: "6px 8px", borderRadius: 6,
                          display: "flex", flexDirection: "column", gap: 2, fontSize: 11
                        }}>
                          <div style={{ color: "#0f766e", fontWeight: 700 }}>
                            🌅 Pickup: {fmtTime(s.morning_time)}
                          </div>
                          <div style={{ color: "#4338ca", fontWeight: 700 }}>
                            🌆 Drop: {fmtTime(s.evening_time)}
                          </div>
                        </div>

                        {s.student_count > 0 && (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, fontWeight: 600 }}>
                            👥 {s.student_count} students boarding here
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Bottom Floating Legend Bar */}
            <div style={{
              position: "absolute", bottom: 16, right: 16, zIndex: 1000,
              background: "rgba(15, 23, 42, 0.88)", backdropFilter: "blur(8px)",
              color: "#ffffff", padding: "6px 14px", borderRadius: 20, fontSize: 11,
              fontWeight: 600, display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 4, borderRadius: 2, background: "#6366f1" }} />
                <span>Route Path</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", background: "#ffffff",
                  border: "2px solid #6366f1", display: "inline-block"
                }} />
                <span>Pickup Stop</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", background: "#dcfce7",
                  border: "2px solid #16a34a", display: "inline-block"
                }} />
                <span>School Terminus</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OpenStreetMap Nominatim Geocoder (Free, Open-Source, zero API key) ───────
async function geocodeAddress(address) {
  const q = encodeURIComponent(address + ', India');
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  if (!data || data.length === 0) throw new Error('Location not found on OpenStreetMap');
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name,
  };
}

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmtTime = (t) => {
  if (!t) return "—";
  const parts = t.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m} ${ampm}`;
};

const fmtCurrency = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
};

const STATUS_CONFIG = {
  active:    { label: "Active",    bg: "#dcfce7", color: "#15803d", border: "#86efac" },
  inactive:  { label: "Inactive",  bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  suspended: { label: "Suspended", bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      letterSpacing: "0.03em", display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ─── Occupancy Bar ─────────────────────────────────────────────────────────────
function OccupancyGauge({ filled = 0, capacity = 0 }) {
  if (!capacity || capacity <= 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Users size={14} style={{ color: filled > 0 ? "var(--primary)" : "var(--text-muted)" }} />
          <span style={{ fontSize: 13, fontWeight: 900, color: filled > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
            {filled} {filled === 1 ? "student" : "students"}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
          No bus assigned
        </span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((filled / capacity) * 100));
  let barColor = "#10b981"; // Emerald
  let badgeColor = "#047857";
  let badgeBg = "#d1fae5";
  if (pct >= 100) {
    barColor = "#e11d48"; // Rose
    badgeColor = "#b91c1c";
    badgeBg = "#ffe4e6";
  } else if (pct >= 85) {
    barColor = "#f59e0b"; // Amber
    badgeColor = "#b45309";
    badgeBg = "#fef3c7";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: 170 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 5 }}>
          <Users size={13} style={{ color: "var(--primary)" }} />
          <span>
            {filled} <span style={{ fontWeight: 600, fontSize: 11, color: "var(--text-secondary)" }}>/ {capacity} seats</span>
          </span>
        </span>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
          background: badgeBg, color: badgeColor
        }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(100, 116, 139, 0.2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

// ─── Custom Time Picker Input with Explicit OK Button ─────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function TimePickerInput({ value, onChange, placeholder = "Select time", align = "left" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parseVal = (v) => {
    if (!v) return { h: "07", m: "30", p: "AM" };
    const parts = v.split(":");
    let h24 = parseInt(parts[0], 10);
    if (isNaN(h24)) h24 = 7;
    const m = parts[1] ? parts[1].slice(0, 2) : "00";
    const p = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h: String(h12).padStart(2, "0"), m: String(m).padStart(2, "0"), p };
  };

  const parsed = parseVal(value);
  const [tempH, setTempH] = useState(parsed.h);
  const [tempM, setTempM] = useState(parsed.m);
  const [tempP, setTempP] = useState(parsed.p);

  const handleOpen = () => {
    const p = parseVal(value);
    setTempH(p.h);
    setTempM(p.m);
    setTempP(p.p);
    setOpen(true);
  };

  const handleConfirm = (e) => {
    if (e) e.stopPropagation();
    let h = parseInt(tempH, 10);
    if (tempP === "PM" && h < 12) h += 12;
    if (tempP === "AM" && h === 12) h = 0;
    const val24 = `${String(h).padStart(2, "0")}:${String(tempM).padStart(2, "0")}`;
    onChange(val24);
    setOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayStr = value ? `${parsed.h}:${parsed.m} ${parsed.p}` : "";

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger display */}
      <div
        className="input-field"
        onClick={handleOpen}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", height: 42, padding: "0 12px", userSelect: "none",
          fontWeight: 700, fontSize: 13.5
        }}
      >
        <span style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
          {displayStr || placeholder}
        </span>
        <Clock size={15} color="var(--primary)" style={{ opacity: 0.8 }} />
      </div>

      {/* Popover with explicit OK button */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          ...(align === "right" ? { right: 0 } : { left: 0 }),
          zIndex: 3000,
          background: "var(--bg-surface)",
          borderRadius: 12,
          padding: "14px 16px",
          border: "1.5px solid var(--border-subtle)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
          width: 260
        }}>
          {/* Header Preview */}
          <div style={{
            textAlign: "center", paddingBottom: 10, marginBottom: 12,
            borderBottom: "1px solid var(--border-subtle)", fontSize: 18,
            fontWeight: 900, fontFamily: "monospace", color: "var(--text-heading)",
            letterSpacing: "0.05em"
          }}>
            {tempH} : {tempM} <span style={{ color: "var(--primary)", fontSize: 14 }}>{tempP}</span>
          </div>

          {/* 3 Column Controls: Hour, Minute, AM/PM */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 4 }}>
                Hour
              </div>
              <select
                className="input-field"
                value={tempH}
                onChange={(e) => setTempH(e.target.value)}
                style={{ height: 36, padding: "0 6px", fontSize: 13, fontWeight: 700 }}
              >
                {HOURS.map((hr) => (
                  <option key={hr} value={hr}>{hr}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 4 }}>
                Min
              </div>
              <select
                className="input-field"
                value={tempM}
                onChange={(e) => setTempM(e.target.value)}
                style={{ height: 36, padding: "0 6px", fontSize: 13, fontWeight: 700 }}
              >
                {MINUTES.map((mn) => (
                  <option key={mn} value={mn}>{mn}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 4 }}>
                Period
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setTempP("AM")}
                  style={{
                    height: 22, fontSize: 11, fontWeight: 800, borderRadius: 4, border: "none", cursor: "pointer",
                    background: tempP === "AM" ? "var(--primary)" : "var(--bg-main)",
                    color: tempP === "AM" ? "#ffffff" : "var(--text-secondary)"
                  }}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setTempP("PM")}
                  style={{
                    height: 22, fontSize: 11, fontWeight: 800, borderRadius: 4, border: "none", cursor: "pointer",
                    background: tempP === "PM" ? "var(--primary)" : "var(--bg-main)",
                    color: tempP === "PM" ? "#ffffff" : "var(--text-secondary)"
                  }}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Action Row with Explicit OK Button */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setOpen(false)}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleConfirm}
              style={{ padding: "4px 18px", fontSize: 12, fontWeight: 800 }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form Initial State ────────────────────────────────────────────────────────
const INIT_ROUTE_FORM = {
  route_name: "",
  route_code: "",
  description: "",
  assigned_bus_id: "",
  start_point: "",
  end_point: "School Campus",
  morning_start_time: "07:15",
  evening_start_time: "15:45",
  total_distance_km: "",
  monthly_fee: "",
  annual_fee: "",
  status: "active",
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export default function RouteManagementView({ academicYear, school, onNavigate }) {
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals & Panels
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [routeStops, setRouteStops] = useState({});
  const [loadingStops, setLoadingStops] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [form, setForm] = useState(INIT_ROUTE_FORM);
  const [saving, setSaving] = useState(false);

  // Strict 1-to-1: map of which bus is already assigned to which route in current academic year
  const busRouteAssignmentMap = useMemo(() => {
    const map = {};
    (routes || []).forEach((r) => {
      if (r.assigned_bus_id) {
        map[r.assigned_bus_id] = r;
      }
    });
    return map;
  }, [routes]);

  // Stop Modal (Add & Edit)
  const [showStopModal, setShowStopModal] = useState(null); // route object
  const [editingStop, setEditingStop] = useState(null);     // stop object if editing
  const [stopForm, setStopForm] = useState({
    stop_name: "",
    stop_address: "",
    sequence_order: 1,
    morning_time: "07:30",
    evening_time: "16:00",
    landmark: "",
    is_school_stop: false,
    latitude: "",
    longitude: "",
  });
  const [savingStop, setSavingStop] = useState(false);
  const [geocodingStop, setGeocodingStop] = useState(false);
  const [generatingPathRouteId, setGeneratingPathRouteId] = useState(null);

  // Route Map Studio Modal (Focused single-route highlighted map)
  const [mapStudioRoute, setMapStudioRoute] = useState(null);
  const [mapStudioPath, setMapStudioPath] = useState([]);
  const [loadingMapStudioPath, setLoadingMapStudioPath] = useState(false);

  // Route Delete Confirm Modal
  const [deleteConfirmRoute, setDeleteConfirmRoute] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Stop Delete Confirm Modal
  const [deleteConfirmStop, setDeleteConfirmStop] = useState(null); // { routeId, stop }
  const [deletingStop, setDeletingStop] = useState(false);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // ── Load All Data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, vRes] = await Promise.all([
        BusService.listRoutes({ academic_year_id: academicYear?.academic_year_id }),
        BusService.listVehicles()
      ]);
      setRoutes(rRes.data?.data || []);
      setVehicles(vRes.data?.data || []);
    } catch (err) {
      console.error("Failed to load route data:", err);
    } finally {
      setLoading(false);
    }
  }, [academicYear?.academic_year_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Load Stops for Expanded Route ────────────────────────────────────────────
  const toggleExpand = async (routeId) => {
    if (expandedRoute === routeId) {
      setExpandedRoute(null);
      return;
    }
    setExpandedRoute(routeId);
    if (!routeStops[routeId]) {
      setLoadingStops((prev) => ({ ...prev, [routeId]: true }));
      try {
        const res = await BusService.listStops(routeId);
        setRouteStops((prev) => ({ ...prev, [routeId]: res.data?.data || [] }));
      } catch (e) {
        console.error("Failed to load stops for route:", e);
      } finally {
        setLoadingStops((prev) => ({ ...prev, [routeId]: false }));
      }
    }
  };

  // ── Refresh Stops for a Route ────────────────────────────────────────────────
  const refreshStops = async (routeId) => {
    setLoadingStops((prev) => ({ ...prev, [routeId]: true }));
    try {
      const res = await BusService.listStops(routeId);
      setRouteStops((prev) => ({ ...prev, [routeId]: res.data?.data || [] }));
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStops((prev) => ({ ...prev, [routeId]: false }));
    }
  };

  // ── Create or Edit Route ─────────────────────────────────────────────────────
  const openAdd = () => {
    setEditRoute(null);
    setForm({
      ...INIT_ROUTE_FORM,
      route_code: `R${String(routes.length + 1).padStart(2, "0")}`,
    });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditRoute(r);
    setForm({
      route_name: r.route_name || "",
      route_code: r.route_code || "",
      description: r.description || "",
      assigned_bus_id: r.assigned_bus_id || "",
      start_point: r.start_point || "",
      end_point: r.end_point || "School Campus",
      morning_start_time: r.morning_start_time?.slice(0, 5) || "07:15",
      evening_start_time: r.evening_start_time?.slice(0, 5) || "15:45",
      total_distance_km: r.total_distance_km ?? "",
      monthly_fee: r.monthly_fee ?? "",
      annual_fee: r.annual_fee ?? "",
      status: r.status || "active",
    });
    setShowModal(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!form.route_name.trim() || !form.route_code.trim()) {
      alert("Route Name and Route Code are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        academic_year_id: academicYear?.academic_year_id,
        route_code: form.route_code.trim().toUpperCase(),
        total_distance_km: form.total_distance_km ? parseFloat(form.total_distance_km) : null,
        monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
        annual_fee: form.annual_fee ? parseFloat(form.annual_fee) : null,
        assigned_bus_id: form.assigned_bus_id || null,
      };

      if (editRoute) {
        await BusService.updateRoute(editRoute.route_id, payload);
      } else {
        await BusService.createRoute(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Route ─────────────────────────────────────────────────────────────
  const handleDeleteRoute = async () => {
    if (!deleteConfirmRoute) return;
    setDeleting(true);
    try {
      await BusService.deleteRoute(deleteConfirmRoute.route_id);
      setDeleteConfirmRoute(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete route");
    } finally {
      setDeleting(false);
    }
  };

  // ── OpenStreetMap Geocoding & OSRM Path Helpers ─────────────────────────────
  const handleGeocodeStop = async () => {
    const query = stopForm.stop_address.trim() || stopForm.stop_name.trim();
    if (!query) {
      alert("Please enter a stop name or address first to locate on OpenStreetMap");
      return;
    }
    setGeocodingStop(true);
    try {
      const { lat, lng, display } = await geocodeAddress(query);
      setStopForm((prev) => ({
        ...prev,
        latitude: String(lat.toFixed(6)),
        longitude: String(lng.toFixed(6)),
        stop_address: prev.stop_address || display.split(',').slice(0, 3).join(', '),
      }));
    } catch {
      alert("Could not locate this location on OpenStreetMap. Try typing the nearby village, street, or town name.");
    } finally {
      setGeocodingStop(false);
    }
  };

  const handleGenerateRoadPath = async (routeId) => {
    const stops = routeStops[routeId] || [];
    const withCoords = stops.filter((s) => s.latitude && s.longitude);
    if (withCoords.length < 2) {
      alert(
        `Need at least 2 stops with OpenStreetMap coordinates to calculate the road network path.\n\nCurrently ${withCoords.length} stop(s) have coordinates.\nClick "Edit" on stops and use "Auto-locate (OSM)" to sync coordinates.`
      );
      return;
    }
    setGeneratingPathRouteId(routeId);
    try {
      const res = await BusService.generateRoutePath(routeId);
      const data = res.data?.data;
      alert(`✅ Road path synchronized with OpenStreetMap!\n\n• Waypoints: ${data?.waypoint_count} road points\n• Distance: ${(data?.distance_m / 1000).toFixed(1)} km\n• Estimated Travel: ~${Math.round(data?.duration_s / 60)} min\n\nThis road-following polyline is saved and ready for mobile app map view!`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate road path via OSRM");
    } finally {
      setGeneratingPathRouteId(null);
    }
  };

  // ── Route Map Studio Handlers ────────────────────────────────────────────────
  const openMapStudio = async (r) => {
    setMapStudioRoute(r);
    setLoadingMapStudioPath(true);
    try {
      if (!routeStops[r.route_id]) {
        const res = await BusService.listStops(r.route_id);
        setRouteStops((prev) => ({ ...prev, [r.route_id]: res.data?.data || [] }));
      }
      const pathRes = await BusService.getRoutePath(r.route_id);
      setMapStudioPath(pathRes.data?.data?.waypoints || []);
    } catch (err) {
      console.error("Failed to load map studio path:", err);
      setMapStudioPath([]);
    } finally {
      setLoadingMapStudioPath(false);
    }
  };

  const handleStudioGeneratePath = async () => {
    if (!mapStudioRoute) return;
    const stops = routeStops[mapStudioRoute.route_id] || [];
    const withCoords = stops.filter((s) => s.latitude && s.longitude);
    if (withCoords.length < 2) {
      alert("Need at least 2 stops with coordinates to generate a road-following path.");
      return;
    }
    setLoadingMapStudioPath(true);
    try {
      const res = await BusService.generateRoutePath(mapStudioRoute.route_id);
      const distM = res.data?.data?.distance_m;
      const distKm = distM ? Number((distM / 1000).toFixed(1)) : null;
      if (distKm) {
        setMapStudioRoute((prev) => ({
          ...prev,
          total_distance_km: distKm,
        }));
      }
      const pathRes = await BusService.getRoutePath(mapStudioRoute.route_id);
      setMapStudioPath(pathRes.data?.data?.waypoints || []);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate road path");
    } finally {
      setLoadingMapStudioPath(false);
    }
  };

  // ── Add / Edit Stop Handlers ─────────────────────────────────────────────────
  const openAddStop = (route) => {
    const existing = routeStops[route.route_id] || [];
    setEditingStop(null);
    setStopForm({
      stop_name: "",
      stop_address: "",
      sequence_order: existing.length + 1,
      morning_time: "07:30",
      evening_time: "16:00",
      landmark: "",
      is_school_stop: false,
      latitude: "",
      longitude: "",
    });
    setShowStopModal(route);
  };

  const openEditStop = (route, stop) => {
    setEditingStop(stop);
    setStopForm({
      stop_name: stop.stop_name || "",
      stop_address: stop.stop_address || "",
      sequence_order: stop.sequence_order || 1,
      morning_time: stop.morning_time ? stop.morning_time.slice(0, 5) : "07:30",
      evening_time: stop.evening_time ? stop.evening_time.slice(0, 5) : "16:00",
      landmark: stop.landmark || "",
      is_school_stop: Boolean(stop.is_school_stop),
      latitude: stop.latitude ? String(stop.latitude) : "",
      longitude: stop.longitude ? String(stop.longitude) : "",
    });
    setShowStopModal(route);
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    if (!stopForm.stop_name.trim()) return;

    setSavingStop(true);
    try {
      const payload = {
        stop_name: stopForm.stop_name.trim(),
        stop_address: stopForm.stop_address?.trim() || null,
        sequence_order: parseInt(stopForm.sequence_order, 10) || 1,
        morning_time: stopForm.morning_time || null,
        evening_time: stopForm.evening_time || null,
        landmark: stopForm.landmark?.trim() || null,
        is_school_stop: Boolean(stopForm.is_school_stop),
        latitude: stopForm.latitude ? parseFloat(stopForm.latitude) : null,
        longitude: stopForm.longitude ? parseFloat(stopForm.longitude) : null,
      };
      const targetRouteId = showStopModal?.route_id || editingStop?.route_id;
      if (editingStop) {
        await BusService.updateStop(editingStop.stop_id, payload);
      } else {
        await BusService.createStop(targetRouteId, payload);
      }
      setShowStopModal(null);
      setEditingStop(null);
      if (targetRouteId) {
        await refreshStops(targetRouteId);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save stop");
    } finally {
      setSavingStop(false);
    }
  };

  const handleDeleteStopConfirm = async () => {
    if (!deleteConfirmStop) return;
    setDeletingStop(true);
    try {
      await BusService.deleteStop(deleteConfirmStop.stop.stop_id);
      const rid = deleteConfirmStop.routeId;
      setDeleteConfirmStop(null);
      await refreshStops(rid);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete stop");
    } finally {
      setDeletingStop(false);
    }
  };

  // ── Filters & Metrics ────────────────────────────────────────────────────────
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.route_name?.toLowerCase().includes(q) ||
        r.route_code?.toLowerCase().includes(q) ||
        r.start_point?.toLowerCase().includes(q) ||
        r.end_point?.toLowerCase().includes(q) ||
        r.vehicle_number?.toLowerCase().includes(q) ||
        r.vehicle_name?.toLowerCase().includes(q);

      const matchStatus = !filterStatus || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [routes, search, filterStatus]);

  const metrics = useMemo(() => {
    const total = routes.length;
    const active = routes.filter((r) => r.status === "active").length;
    const totalStops = routes.reduce((acc, r) => acc + (parseInt(r.stop_count, 10) || 0), 0);
    const totalStudents = routes.reduce((acc, r) => acc + (parseInt(r.student_count, 10) || 0), 0);
    const totalSeats = routes.reduce((acc, r) => acc + (parseInt(r.capacity, 10) || 0), 0);
    return { total, active, totalStops, totalStudents, totalSeats };
  }, [routes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: "rgba(99, 102, 241, 0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)"
            }}>
              <Route size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-heading)", margin: 0, letterSpacing: "-0.02em" }}>
                Route Management
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                Manage bus lines, pickup sequences, timetables, and seat allocations
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ height: 40, padding: "0 14px", gap: 6, fontWeight: 700 }}
          >
            <RefreshCw size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={openAdd}
            style={{ height: 40, padding: "0 18px", gap: 7, fontWeight: 800 }}
          >
            <Plus size={16} />
            Add Route
          </button>
        </div>
      </div>

      {/* ── Top Metrics Stats ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Routes</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-heading)", marginTop: 4 }}>{metrics.total}</div>
          <div style={{ fontSize: 12, color: "#15803d", fontWeight: 700, marginTop: 4 }}>{metrics.active} Active lines</div>
        </div>

        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Stops</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-heading)", marginTop: 4 }}>{metrics.totalStops}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>Network pick-up points</div>
        </div>

        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Student Commuters</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-heading)", marginTop: 4 }}>{metrics.totalStudents}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>Assigned to transport</div>
        </div>

        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fleet Capacity</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-heading)", marginTop: 4 }}>{metrics.totalSeats}</div>
          <div style={{ fontSize: 12, color: "#b45309", fontWeight: 700, marginTop: 4 }}>Available bus seats</div>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ──────────────────────────────────────────── */}
      <div className="glass-panel" style={{
        padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input
            className="input-field"
            placeholder="Search by route name, code, origin, or bus…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40, height: 42, fontSize: 13.5 }}
          />
        </div>

        <select
          className="input-field"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ height: 42, flex: "0 1 160px", fontWeight: 600 }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filteredRoutes.length} of {routes.length} routes
        </span>
      </div>

      {/* ── Routes List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
          <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", marginBottom: 12, color: "var(--primary)" }} />
          <div style={{ fontWeight: 600 }}>Loading school routes…</div>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: "center", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)" }}>
          <Route size={44} color="var(--primary)" style={{ marginBottom: 14, opacity: 0.6 }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
            {routes.length === 0 ? "No routes configured yet" : "No routes match your search filters"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
            {routes.length === 0 ? 'Click "Add Route" to define your first school bus line and schedule' : "Try resetting your search or status filter"}
          </div>
          {routes.length === 0 && (
            <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 20, gap: 6, fontWeight: 800 }}>
              <Plus size={15} /> Add First Route
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1.5px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}>
          {filteredRoutes.map((r, idx) => {
            const isLast = idx === filteredRoutes.length - 1;
            const isOpen = expandedRoute === r.route_id;
            const stops = routeStops[r.route_id] || [];
            const isStopsLoading = loadingStops[r.route_id];

            return (
              <div key={r.route_id} style={{ borderBottom: isLast ? "none" : "1.5px solid var(--border-subtle)" }}>
                {/* ── Route Row ── */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 18, padding: "18px 24px",
                    cursor: "pointer", background: isOpen ? "rgba(99, 102, 241, 0.04)" : "transparent",
                    transition: "background 0.15s"
                  }}
                  onClick={() => toggleExpand(r.route_id)}
                >
                  {/* Route Code Badge */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "1.5px solid rgba(99, 102, 241, 0.3)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.06em" }}>
                      ROUTE
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: "var(--text-heading)", fontFamily: "monospace" }}>
                      {r.route_code}
                    </span>
                  </div>

                  {/* Route Name & Origin/Terminus */}
                  <div style={{ flex: "0 0 240px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.route_name}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginTop: 4, fontWeight: 600 }}>
                      <MapPin size={13} style={{ flexShrink: 0, color: "#10b981" }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.start_point || "Origin"}
                      </span>
                      <ArrowRight size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.end_point || "School"}
                      </span>
                    </div>
                  </div>

                  {/* Timetable Pillar */}
                  <div style={{ flex: "0 0 160px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>
                      <Clock size={13} color="#f59e0b" />
                      <span>🌅 {fmtTime(r.morning_start_time)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>
                      <Clock size={13} color="#6366f1" />
                      <span>🌆 {fmtTime(r.evening_start_time)}</span>
                    </div>
                  </div>

                  {/* Assigned Bus (Bus Name Big, Bus No Small - matching exact convention) */}
                  <div style={{ flex: "0 0 200px", minWidth: 0 }}>
                    {r.assigned_bus_id ? (
                      <div>
                        {/* Bus Name Big */}
                        <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.vehicle_name || "School Bus"}
                        </div>
                        {/* Bus No Small */}
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em", color: "var(--text-secondary)", marginTop: 2 }}>
                          {r.vehicle_number}
                        </div>
                        {/* Crew tags */}
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          {r.driver_first_name && (
                            <span style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 4,
                              background: "#fef3c7", color: "#78350f", border: "1px solid #d97706",
                              fontWeight: 800
                            }}>
                              DRIVER: {r.driver_first_name}
                            </span>
                          )}
                          {r.conductor_first_name && (
                            <span style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 4,
                              background: "#e0e7ff", color: "#312e81", border: "1px solid #6366f1",
                              fontWeight: 800
                            }}>
                              ATTENDER: {r.conductor_first_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-muted)", fontWeight: 600 }}>
                        No vehicle assigned
                      </span>
                    )}
                  </div>

                  {/* Occupancy / Students */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <OccupancyGauge filled={parseInt(r.student_count, 10) || 0} capacity={parseInt(r.capacity, 10) || 0} />
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, fontWeight: 600 }}>
                      {r.stop_count || 0} stops configured
                    </div>
                  </div>

                  {/* Fees & Distance */}
                  <div style={{ flex: "0 0 120px", textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>
                      {fmtCurrency(r.monthly_fee)}
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>/mo</span>
                    </div>
                    {r.total_distance_km && (
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginTop: 2 }}>
                        {r.total_distance_km} km
                      </div>
                    )}
                  </div>

                  {/* Action Icons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-sm"
                      onClick={() => openMapStudio(r)}
                      title="View Route Map (Highlighted Route & Details)"
                      style={{
                        padding: "6px 12px", background: "rgba(99, 102, 241, 0.08)", border: "1.5px solid rgba(99, 102, 241, 0.25)",
                        borderRadius: 8, color: "var(--primary)", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 5
                      }}
                    >
                      <Map size={13} /> Route Map
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => openEdit(r)}
                      title="Edit Route"
                      style={{
                        padding: "6px 10px", background: "var(--bg-surface)", border: "1.5px solid var(--border-subtle)",
                        borderRadius: 8, color: "var(--text-primary)", fontWeight: 600
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setDeleteConfirmRoute(r)}
                      title="Delete Route"
                      style={{
                        padding: "6px 10px", background: "#fff1f2", border: "1.5px solid #fecdd3",
                        borderRadius: 8, color: "#e11d48", fontWeight: 700
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => toggleExpand(r.route_id)}
                      title="View Stops Timeline"
                      style={{
                        padding: "6px 10px", background: "var(--bg-surface)", border: "1.5px solid var(--border-subtle)",
                        borderRadius: 8, color: "var(--text-secondary)"
                      }}
                    >
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* ── Expanded Detail Panel: Stops Timeline & Actions ── */}
                {isOpen && (
                  <div style={{
                    padding: "20px 24px", background: "var(--bg-surface-elevated)",
                    borderTop: "1.5px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 16
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)" }}>
                          Stops Timeline ({stops.length} Stops)
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 12,
                          background: "rgba(99, 102, 241, 0.12)", color: "var(--primary)",
                          border: "1px solid rgba(99, 102, 241, 0.25)",
                          display: "inline-flex", alignItems: "center", gap: 5
                        }}>
                          <Users size={12} />
                          <span>{r.student_count || 0} Total Students</span>
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                          Morning pickup order from #1 to School Terminus
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleGenerateRoadPath(r.route_id)}
                          disabled={generatingPathRouteId === r.route_id}
                          title="Generate and synchronize road-following polyline with OpenStreetMap for mobile app navigation"
                          style={{
                            gap: 6, fontWeight: 700, padding: "5px 12px", height: 30, fontSize: 12,
                            background: "rgba(99, 102, 241, 0.08)", color: "var(--primary)",
                            border: "1.5px solid rgba(99, 102, 241, 0.25)", borderRadius: 6
                          }}
                        >
                          {generatingPathRouteId === r.route_id ? (
                            <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          {generatingPathRouteId === r.route_id ? "Syncing Road..." : "Sync Road Path (OSRM)"}
                        </button>

                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openAddStop(r)}
                          style={{ gap: 6, fontWeight: 800, padding: "5px 12px", height: 30 }}
                        >
                          <Plus size={13} /> Add Stop to Route
                        </button>
                      </div>
                    </div>

                    {isStopsLoading ? (
                      <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>
                        <RefreshCw size={18} style={{ animation: "spin 1s linear infinite", marginBottom: 6 }} />
                        <div style={{ fontSize: 12 }}>Loading stops timeline…</div>
                      </div>
                    ) : stops.length === 0 ? (
                      <div style={{
                        padding: "24px", textAlign: "center", background: "var(--bg-main)",
                        borderRadius: 10, border: "1.5px dashed var(--border-subtle)"
                      }}>
                        <Milestone size={24} style={{ opacity: 0.5, marginBottom: 6, color: "var(--primary)" }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>No stops defined for this route</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Click "+ Add Stop to Route" to create the boarding sequence</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {stops.map((s, sIdx) => {
                          const isFirst = sIdx === 0;
                          const isLastStop = sIdx === stops.length - 1;

                          return (
                            <div
                              key={s.stop_id}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "10px 14px", borderRadius: 8, background: "var(--bg-main)",
                                border: "1px solid var(--border-subtle)", gap: 12
                              }}
                            >
                              {/* Sequence Badge */}
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: isFirst ? "#dcfce7" : isLastStop ? "#fee2e2" : "rgba(99, 102, 241, 0.12)",
                                color: isFirst ? "#15803d" : isLastStop ? "#b91c1c" : "var(--primary)",
                                border: `1.5px solid ${isFirst ? "#86efac" : isLastStop ? "#fca5a5" : "rgba(99,102,241,0.3)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 900, flexShrink: 0
                              }}>
                                {s.sequence_order || sIdx + 1}
                              </div>

                              {/* Stop Details */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                                    {s.stop_name}
                                  </span>
                                  {s.is_school_stop && (
                                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#e0e7ff", color: "#312e81", fontWeight: 800 }}>
                                      SCHOOL GATE
                                    </span>
                                  )}
                                  {s.latitude && s.longitude ? (
                                    <span
                                      title={`OSM Coordinates: ${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}`}
                                      style={{
                                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                        background: "#dcfce7", color: "#15803d", fontWeight: 800,
                                        display: "inline-flex", alignItems: "center", gap: 3
                                      }}
                                    >
                                      <MapPin size={9} /> OSM Mapped
                                    </span>
                                  ) : (
                                    <span
                                      title="No GPS coordinates set yet. Edit stop and click 'Auto-locate (OSM)'"
                                      style={{
                                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                        background: "#fef3c7", color: "#92400e", fontWeight: 800,
                                        display: "inline-flex", alignItems: "center", gap: 3
                                      }}
                                    >
                                      <AlertTriangle size={9} /> No GPS
                                    </span>
                                  )}
                                </div>
                                {(s.stop_address || s.landmark) && (
                                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, fontWeight: 500 }}>
                                    {s.stop_address ? s.stop_address : `Landmark: ${s.landmark}`}
                                  </div>
                                )}
                              </div>

                              {/* Morning Time */}
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", display: "flex", alignItems: "center", gap: 4 }}>
                                <span>🌅</span> {fmtTime(s.morning_time)}
                              </div>

                              {/* Evening Time */}
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", display: "flex", alignItems: "center", gap: 4 }}>
                                <span>🌆</span> {fmtTime(s.evening_time)}
                              </div>

                              {/* Students boarding */}
                              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", minWidth: 90, textAlign: "right" }}>
                                <Users size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                                {s.student_count || 0} students
                              </div>

                              {/* Actions: Edit & Delete Stop */}
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => openEditStop(r, s)}
                                  title="Edit Stop"
                                  style={{
                                    padding: "4px 10px", height: 28, fontSize: 11,
                                    background: "var(--bg-surface)", border: "1.5px solid var(--border-subtle)",
                                    borderRadius: 6, color: "var(--text-primary)", fontWeight: 700, gap: 4,
                                    display: "inline-flex", alignItems: "center"
                                  }}
                                >
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => setDeleteConfirmStop({ routeId: r.route_id, stop: s })}
                                  title="Delete Stop"
                                  style={{
                                    padding: "4px 10px", height: 28, fontSize: 11,
                                    background: "#fff1f2", border: "1.5px solid #fecdd3",
                                    borderRadius: 6, color: "#e11d48", fontWeight: 700, gap: 4,
                                    display: "inline-flex", alignItems: "center"
                                  }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Route Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: "var(--bg-surface)", borderRadius: "var(--radius-xl)",
            width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
            border: "1.5px solid var(--border-subtle)", boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: "1.5px solid var(--border-subtle)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--text-heading)" }}>
                  {editRoute ? `Edit Route (${editRoute.route_code})` : "Create New School Route"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Define route code, assigned bus, origin, schedule, and fees
                </p>
              </div>
              <button
                className="btn btn-sm"
                onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Route Code & Route Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Route Code *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. R01"
                    required
                    value={form.route_code}
                    onChange={(e) => setField("route_code", e.target.value.toUpperCase())}
                    style={{ fontWeight: 800, fontFamily: "monospace" }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Route Name *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. North Zone Express"
                    required
                    value={form.route_name}
                    onChange={(e) => setField("route_name", e.target.value)}
                    style={{ fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Assigned Bus Selector */}
              <div className="input-group">
                <label className="input-label">Assigned Vehicle (Fleet Bus)</label>
                <select
                  className="input-field"
                  value={form.assigned_bus_id}
                  onChange={(e) => setField("assigned_bus_id", e.target.value)}
                  style={{ height: 42, fontSize: 13.5, fontWeight: 700 }}
                >
                  <option value="">— No Bus Assigned (Unassigned) —</option>
                  {vehicles.map((v) => {
                    const assignedRoute = busRouteAssignmentMap[v.bus_id];
                    const isAssignedToOtherRoute = assignedRoute && assignedRoute.route_id !== editRoute?.route_id;
                    return (
                      <option
                        key={v.bus_id}
                        value={v.bus_id}
                        disabled={isAssignedToOtherRoute}
                        style={isAssignedToOtherRoute ? { color: "var(--text-muted)", background: "rgba(0,0,0,0.05)" } : {}}
                      >
                        {v.vehicle_name || "Bus"} · {v.vehicle_number} ({v.capacity} seats)
                        {isAssignedToOtherRoute ? ` — 🚫 (Already assigned to [${assignedRoute.route_code}] ${assignedRoute.route_name})` : ""}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                  Each bus can only be assigned to a single route. Buses already assigned to another route are disabled.
                </div>
              </div>

              {/* Origin & Terminus */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Origin / Start Point</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Manjeri Town Junction"
                    value={form.start_point}
                    onChange={(e) => setField("start_point", e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Terminus / Destination</label>
                  <input
                    className="input-field"
                    placeholder="e.g. School Main Gate"
                    value={form.end_point}
                    onChange={(e) => setField("end_point", e.target.value)}
                  />
                </div>
              </div>

              {/* Shifts: Morning Departure & Evening Departure with Custom TimePickerInput */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Morning Departure (1st Stop)</label>
                  <TimePickerInput
                    value={form.morning_start_time}
                    onChange={(val) => setField("morning_start_time", val)}
                    placeholder="Morning departure"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Evening Departure (School Gate)</label>
                  <TimePickerInput
                    value={form.evening_start_time}
                    onChange={(val) => setField("evening_start_time", val)}
                    placeholder="Evening departure"
                    align="right"
                  />
                </div>
              </div>

              {/* Distance & Fees */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Total Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 18.5"
                    className="input-field"
                    value={form.total_distance_km}
                    onChange={(e) => setField("total_distance_km", e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1200"
                    className="input-field"
                    value={form.monthly_fee}
                    onChange={(e) => setField("monthly_fee", e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ gap: 6, fontWeight: 800 }}
                >
                  {saving && <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />}
                  {editRoute ? "Update Route" : "Create Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit Stop Modal with Interactive Map on Right Side ────────── */}
      {showStopModal && (
        <div style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          right: 0,
          left: "260px",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1050,
          padding: 16
        }}>
          <div style={{
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-xl)",
            width: "calc(100% - 32px)",
            maxWidth: "100%",
            height: "calc(100vh - 32px)",
            maxHeight: "96vh",
            border: "1.5px solid var(--border-subtle)",
            boxShadow: "0 28px 80px rgba(0, 0, 0, 0.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "16px 24px", borderBottom: "1.5px solid var(--border-subtle)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--bg-surface-elevated)"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--text-heading)" }}>
                    {editingStop ? `Edit Stop: ${editingStop.stop_name}` : `Add Stop to ${showStopModal.route_code}`}
                  </h3>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    background: "rgba(99, 102, 241, 0.12)", color: "var(--primary)",
                    fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4
                  }}>
                    <Map size={11} /> OpenStreetMap Sync
                  </span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  {showStopModal.route_name} • Click anywhere on the map or type address to locate
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => { setShowStopModal(null); setEditingStop(null); }}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 2-Column Dialog Body */}
            <div style={{
              display: "grid", gridTemplateColumns: "440px 1fr",
              flex: 1, minHeight: 0, overflow: "hidden"
            }}>
              {/* LEFT COLUMN: Form Fields */}
              <form
                onSubmit={handleSaveStop}
                style={{
                  padding: "20px 22px", display: "flex", flexDirection: "column", gap: 13,
                  overflowY: "auto", borderRight: "1.5px solid var(--border-subtle)",
                  maxHeight: "calc(96vh - 65px)",
                  position: "relative", zIndex: 30
                }}
              >
                <div className="input-group">
                  <label className="input-label">Stop Name / Boarding Point *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. City Hospital Junction"
                    required
                    value={stopForm.stop_name}
                    onChange={(e) => setStopForm((f) => ({ ...f, stop_name: e.target.value }))}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div className="input-group">
                    <label className="input-label">Sequence #</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={stopForm.sequence_order}
                      onChange={(e) => setStopForm((f) => ({ ...f, sequence_order: parseInt(e.target.value, 10) || 1 }))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Morning (Pick)</label>
                    <TimePickerInput
                      value={stopForm.morning_time}
                      onChange={(val) => setStopForm((f) => ({ ...f, morning_time: val }))}
                      placeholder="Pick time"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Evening (Drop)</label>
                    <TimePickerInput
                      value={stopForm.evening_time}
                      onChange={(val) => setStopForm((f) => ({ ...f, evening_time: val }))}
                      placeholder="Drop time"
                      align="right"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Landmark / Reference</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Opposite State Bank ATM"
                    value={stopForm.landmark}
                    onChange={(e) => setStopForm((f) => ({ ...f, landmark: e.target.value }))}
                  />
                </div>

                {/* OpenStreetMap Address & Auto-Locate */}
                <div className="input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label className="input-label" style={{ margin: 0 }}>
                      Address / Area (OpenStreetMap)
                    </label>
                    <button
                      type="button"
                      onClick={handleGeocodeStop}
                      disabled={geocodingStop}
                      className="btn btn-sm"
                      style={{
                        padding: "2px 8px", height: 24, fontSize: 11, fontWeight: 700,
                        background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)",
                        border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 4,
                        display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer"
                      }}
                    >
                      {geocodingStop ? (
                        <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <LocateFixed size={11} />
                      )}
                      {geocodingStop ? "Locating…" : "Auto-locate 📍"}
                    </button>
                  </div>
                  <input
                    className="input-field"
                    placeholder="e.g. T. Nagar, Chennai or street / junction name"
                    value={stopForm.stop_address}
                    onChange={(e) => setStopForm((f) => ({ ...f, stop_address: e.target.value }))}
                  />
                </div>

                {/* Coordinates Preview & Storage */}
                <div style={{
                  background: "var(--bg-main)", padding: "10px 12px",
                  borderRadius: 8, border: "1px solid var(--border-subtle)",
                  display: "flex", flexDirection: "column", gap: 8
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                      GPS Coordinates (Mobile App View)
                    </span>
                    {stopForm.latitude && stopForm.longitude ? (
                      <span style={{ fontSize: 11, color: "#166534", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        <CheckCircle2 size={12} /> Plotted on Map
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#b45309", fontWeight: 600 }}>
                        Click map on right to place pin
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>LATITUDE</label>
                      <input
                        className="input-field"
                        style={{ height: 32, fontSize: 12 }}
                        placeholder="e.g. 13.0405"
                        value={stopForm.latitude}
                        onChange={(e) => setStopForm((f) => ({ ...f, latitude: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>LONGITUDE</label>
                      <input
                        className="input-field"
                        style={{ height: 32, fontSize: 12 }}
                        placeholder="e.g. 80.2337"
                        value={stopForm.longitude}
                        onChange={(e) => setStopForm((f) => ({ ...f, longitude: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* School Stop Checkbox */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  <input
                    type="checkbox"
                    checked={stopForm.is_school_stop}
                    onChange={(e) => setStopForm((f) => ({ ...f, is_school_stop: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  Mark as School Gate / Terminus Stop
                </label>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowStopModal(null); setEditingStop(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingStop}
                    style={{ gap: 6, fontWeight: 800 }}
                  >
                    {savingStop && <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />}
                    {editingStop ? "Update Stop" : "Save Stop"}
                  </button>
                </div>
              </form>

              {/* RIGHT COLUMN: Interactive OpenStreetMap View */}
              <div style={{
                position: "relative", display: "flex", flexDirection: "column",
                background: "var(--bg-main)", minHeight: 460, zIndex: 1
              }}>
                {/* Floating Map Helper Bar */}
                <div style={{
                  position: "absolute", top: 12, left: 12, right: 12, zIndex: 1000,
                  background: "rgba(15, 23, 42, 0.88)", backdropFilter: "blur(6px)",
                  color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12,
                  fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.3)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} style={{ color: "#818cf8" }} />
                    <span>Click anywhere on map or drag pin to position stop</span>
                  </div>
                  {stopForm.latitude && stopForm.longitude ? (
                    <span style={{ color: "#34d399", fontSize: 11, fontWeight: 800, background: "rgba(52, 211, 153, 0.15)", padding: "2px 8px", borderRadius: 4 }}>
                      📍 {parseFloat(stopForm.latitude).toFixed(4)}, {parseFloat(stopForm.longitude).toFixed(4)}
                    </span>
                  ) : (
                    <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>
                      No pin placed yet
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, width: "100%", height: "100%", minHeight: 460 }}>
                  <StopPickerMap
                    stopForm={stopForm}
                    existingStops={(showStopModal && routeStops[showStopModal.route_id]) || []}
                    editingStop={editingStop}
                    onPick={(lat, lng) => {
                      setStopForm((prev) => ({
                        ...prev,
                        latitude: String(lat.toFixed(6)),
                        longitude: String(lng.toFixed(6)),
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── In-App Delete Route Confirmation Modal ────────────────────────────── */}
      {deleteConfirmRoute && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: 16
        }}>
          <div style={{
            background: "var(--bg-surface)", borderRadius: "var(--radius-xl)",
            width: "100%", maxWidth: 460, border: "2px solid #fecdd3",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)", overflow: "hidden"
          }}>
            <div style={{ padding: "24px 28px", textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#fff1f2",
                color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", border: "2px solid #fecdd3"
              }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 900, color: "var(--text-heading)" }}>
                Delete Route {deleteConfirmRoute.route_code}?
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>{deleteConfirmRoute.route_name}</strong>?
                This route and its assigned stops will be permanently removed.
              </p>

              {deleteConfirmRoute.student_count > 0 && (
                <div style={{
                  margin: "16px 0 0", padding: "10px 14px", borderRadius: 8,
                  background: "#fffbeb", border: "1.5px solid #fde68a",
                  fontSize: 12, color: "#92400e", fontWeight: 700, textAlign: "left"
                }}>
                  ⚠️ Notice: This route has {deleteConfirmRoute.student_count} active students assigned.
                  You must unassign students before deleting.
                </div>
              )}
            </div>

            <div style={{
              display: "flex", gap: 12, padding: "16px 24px",
              background: "var(--bg-surface-elevated)", borderTop: "1.5px solid var(--border-subtle)",
              justifyContent: "flex-end"
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmRoute(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDeleteRoute}
                disabled={deleting}
                style={{
                  background: "#e11d48", color: "#ffffff", border: "none",
                  fontWeight: 800, padding: "0 18px", height: 38, borderRadius: 8
                }}
              >
                {deleting ? "Deleting…" : "Yes, Delete Route"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-App Delete Stop Confirmation Modal ────────────────────────────── */}
      {deleteConfirmStop && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: 16
        }}>
          <div style={{
            background: "var(--bg-surface)", borderRadius: "var(--radius-xl)",
            width: "100%", maxWidth: 440, border: "2px solid #fecdd3",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)", overflow: "hidden"
          }}>
            <div style={{ padding: "24px 28px", textAlign: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: "#fff1f2",
                color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", border: "2px solid #fecdd3"
              }}>
                <Trash2 size={26} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 900, color: "var(--text-heading)" }}>
                Delete Stop "{deleteConfirmStop.stop.stop_name}"?
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Are you sure you want to remove stop #{deleteConfirmStop.stop.sequence_order} from this route?
              </p>

              {deleteConfirmStop.stop.student_count > 0 && (
                <div style={{
                  margin: "16px 0 0", padding: "10px 14px", borderRadius: 8,
                  background: "#fffbeb", border: "1.5px solid #fde68a",
                  fontSize: 12, color: "#92400e", fontWeight: 700, textAlign: "left"
                }}>
                  ⚠️ Notice: {deleteConfirmStop.stop.student_count} student(s) currently board at this stop.
                  You must reassign them to another stop before deleting.
                </div>
              )}
            </div>

            <div style={{
              display: "flex", gap: 12, padding: "16px 24px",
              background: "var(--bg-surface-elevated)", borderTop: "1.5px solid var(--border-subtle)",
              justifyContent: "flex-end"
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmStop(null)}
                disabled={deletingStop}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDeleteStopConfirm}
                disabled={deletingStop}
                style={{
                  background: "#e11d48", color: "#ffffff", border: "none",
                  fontWeight: 800, padding: "0 18px", height: 38, borderRadius: 8
                }}
              >
                {deletingStop ? "Deleting…" : "Yes, Delete Stop"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Route Map Studio Modal (Focused single-route highlighted map) ──── */}
      {mapStudioRoute && (
        <RouteStudioModal
          route={mapStudioRoute}
          stops={routeStops[mapStudioRoute.route_id] || []}
          waypoints={mapStudioPath}
          loadingPath={loadingMapStudioPath}
          onClose={() => setMapStudioRoute(null)}
          onGeneratePath={handleStudioGeneratePath}
        />
      )}
    </div>
  );
}
