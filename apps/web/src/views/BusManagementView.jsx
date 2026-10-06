import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Edit2, Trash2, Truck, Shield, Search, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Clock, Users,
  FileText, Activity, UserCheck, UserCog, UserX, ChevronDown, ChevronUp,
  Bus, Settings, Route,
} from "lucide-react";
import { BusService, StaffService } from "../services/api";
import { createPortal } from "react-dom";

const VEHICLE_TYPES = [
  { value: "large_bus",       label: "Large Bus" },
  { value: "mini_bus",        label: "Mini Bus" },
  { value: "van",             label: "Van" },
  { value: "tempo_traveller", label: "Tempo Traveller" },
];

const STATUS_OPTIONS = [
  { value: "active",      label: "Active",      color: "#047857", bg: "#d1fae5", border: "#a7f3d0" },
  { value: "inactive",    label: "Inactive",    color: "#334155", bg: "#f1f5f9", border: "#cbd5e1" },
  { value: "maintenance", label: "Maintenance", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
];

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0)  return { label: "EXPIRED",        color: "#be123c", bg: "#ffe4e6", border: "#fecdd3", ok: false };
  if (days < 30) return { label: `${days}d left`,  color: "#b45309", bg: "#fef3c7", border: "#fde68a", ok: false };
  return               { label: fmtDate(dateStr),  color: "#047857", bg: "#d1fae5", border: "#a7f3d0", ok: true  };
}

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[1];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
      textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex",
      alignItems: "center", gap: 5, width: "fit-content"
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <Icon size={13} color="#f59e0b" />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f59e0b" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.2)" }} />
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, width = "660px", closeOnClickOutside = false }) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
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

  return createPortal(
    <div
      className="modal-overlay animate-fade-in"
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: width,
          width: "100%",
          padding: 0,
          transform: shake ? "scale(1.015)" : "scale(1)",
          transition: "transform 0.15s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)",
          position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1,
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bus size={18} color="#fff" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 6, borderRadius: 8, display: "flex", alignItems: "center"
            }}
          >
            <XCircle size={18} />
          </button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

const INIT_FORM = {
  vehicle_number: "", vehicle_name: "", vehicle_type: "large_bus",
  capacity: 40, make_model: "", manufacture_year: "",
  gps_device_id: "", insurance_expiry: "", fitness_expiry: "",
  permit_expiry: "", status: "active", notes: "",
  route_id: "",
};

function DocDateField({ label, value, onChange }) {
  const s = value ? expiryStatus(value) : null;
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input className="input-field" type="date" value={value} onChange={e => onChange(e.target.value)} />
      {s && (
        <div style={{ fontSize: 10, color: s.color, marginTop: 3, fontWeight: 600 }}>
          {s.ok ? `✓ ${s.label}` : `⚠ ${s.label}`}
        </div>
      )}
    </div>
  );
}

function BusForm({ form, set, saving, onSave, onCancel, isEdit, editBus, routes = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <SectionHeader icon={Truck} label="Vehicle Identity" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="input-group">
          <label className="input-label">Registration Number *</label>
          <input className="input-field" placeholder="e.g. KA-01-AB-1234"
            value={form.vehicle_number}
            onChange={e => set("vehicle_number", e.target.value.toUpperCase())} />
        </div>
        <div className="input-group">
          <label className="input-label">Friendly Name</label>
          <input className="input-field" placeholder="e.g. Sunshine Express"
            value={form.vehicle_name} onChange={e => set("vehicle_name", e.target.value)} />
        </div>
      </div>

      {/* Assigned Route Selection */}
      <SectionHeader icon={Route} label="Assigned Route" />
      <div className="input-group">
        <label className="input-label">Assigned School Route</label>
        <select
          className="input-field"
          value={form.route_id || ""}
          onChange={e => set("route_id", e.target.value)}
        >
          <option value="">-- No Route Assigned (Unassigned) --</option>
          {routes.map(r => {
            const isAssignedToOtherBus = r.assigned_bus_id && r.assigned_bus_id !== editBus?.bus_id;
            return (
              <option
                key={r.route_id}
                value={r.route_id}
                disabled={isAssignedToOtherBus}
                style={isAssignedToOtherBus ? { color: "var(--text-muted)", background: "rgba(0,0,0,0.05)" } : {}}
              >
                [{r.route_code}] {r.route_name} {r.start_point ? `(${r.start_point})` : ""}
                {isAssignedToOtherBus ? ` — 🚫 (Already assigned to Bus ${r.vehicle_number || ''})` : ""}
              </option>
            );
          })}
        </select>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
          Each bus can only be assigned to a single route. Routes already assigned to another bus are disabled.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="input-group">
          <label className="input-label">Vehicle Type</label>
          <select className="input-field" value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)}>
            {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Seating Capacity</label>
          <input className="input-field" type="number" min="1" max="80"
            value={form.capacity} onChange={e => set("capacity", e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set("status", e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="input-group">
          <label className="input-label">Make / Model</label>
          <input className="input-field" placeholder="e.g. Tata Starbus Ultra"
            value={form.make_model} onChange={e => set("make_model", e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Manufacture Year</label>
          <input className="input-field" type="number" placeholder="2020" min="2000" max="2030"
            value={form.manufacture_year} onChange={e => set("manufacture_year", e.target.value)} />
        </div>
      </div>

      <SectionHeader icon={FileText} label="Document Expiry Dates" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <DocDateField label="Insurance Expiry"    value={form.insurance_expiry} onChange={v => set("insurance_expiry", v)} />
        <DocDateField label="Fitness Certificate" value={form.fitness_expiry}   onChange={v => set("fitness_expiry", v)} />
        <DocDateField label="Route Permit"        value={form.permit_expiry}    onChange={v => set("permit_expiry", v)} />
      </div>

      <SectionHeader icon={Activity} label="GPS Tracking" />
      <div className="input-group">
        <label className="input-label">GPS Device ID</label>
        <input className="input-field" placeholder="e.g. GPS-2024-001 (used for mobile tracking)"
          value={form.gps_device_id} onChange={e => set("gps_device_id", e.target.value)} />
      </div>

      <div className="input-group">
        <label className="input-label">Notes</label>
        <textarea className="input-field" rows={2} placeholder="Additional notes about this vehicle…"
          value={form.notes} onChange={e => set("notes", e.target.value)}
          style={{ resize: "vertical", minHeight: 60 }} />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4,
        paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onSave} disabled={saving} style={{ gap: 6 }}>
          {saving
            ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
            : (isEdit ? "Save Changes" : "Add Bus")}
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function CrewChip({ role, name, phone, isDriver }) {
  const isD = isDriver;
  const color = isD ? "#b45309" : "#4338ca";
  const bg = isD ? "#fef3c7" : "#eef2ff";
  const border = isD ? "#fde68a" : "#c7d2fe";
  return (
    <div style={{ padding: "8px 12px", borderRadius: 8, background: bg, border: `1.5px solid ${border}`, display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color, letterSpacing: "0.06em" }}>{role}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{name}</span>
      {phone && <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginTop: 1 }}>{phone}</span>}
    </div>
  );
}

function BusDetailPanel({ bus, onAssignCrew, onUnassignCrew, onEdit, onDelete }) {
  const docs = [
    { label: "Insurance", expiry: bus.insurance_expiry },
    { label: "Fitness",   expiry: bus.fitness_expiry },
    { label: "Permit",    expiry: bus.permit_expiry },
  ];
  return (
    <div style={{
      borderTop: "1.5px solid var(--border-subtle)",
      padding: "20px 24px",
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24,
      background: "var(--bg-surface-elevated)",
    }}>
      {/* Vehicle Details (including specs & documents) */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)", marginBottom: 10 }}>Vehicle Details</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {bus.make_model        && <InfoRow label="Make/Model"   value={bus.make_model} />}
          {bus.manufacture_year  && <InfoRow label="Year"         value={bus.manufacture_year} />}
          <InfoRow label="Capacity"   value={`${bus.capacity} seats`} />
          {bus.gps_device_id     && <InfoRow label="GPS Device"   value={bus.gps_device_id} />}

          <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

          {docs.map(({ label, expiry }) => {
            const s = expiryStatus(expiry);
            if (!expiry) return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Not set</span>
              </div>
            );
            return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: s.color, background: s.bg,
                  border: `1px solid ${s.border}`, padding: "1px 7px", borderRadius: 4
                }}>
                  {s.ok ? fmtDate(expiry) : s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assigned Route */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)", marginBottom: 10 }}>
          Assigned Route
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderRadius: 8, background: "#ecfdf5",
          border: "1.5px solid #a7f3d0"
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#065f46", letterSpacing: "0.06em" }}>
              Operational Route
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
              {bus.route_name ? (
                <>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#065f46",
                    color: "#ffffff", fontWeight: 800, marginRight: 6
                  }}>
                    {bus.route_code}
                  </span>
                  {bus.route_name}
                </>
              ) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 500 }}>
                  No route assigned
                </span>
              )}
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => onEdit(bus)}
            style={{
              padding: "4px 10px", fontSize: 11, height: 26, gap: 4, flexShrink: 0,
              background: "#ffffff", color: "#065f46", border: "1.5px solid #10b981", fontWeight: 700
            }}
          >
            <Route size={11} />
            {bus.route_id ? "Change" : "Assign"}
          </button>
        </div>
      </div>

      {/* Crew */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)", marginBottom: 10 }}>
          Bus Crew
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Driver slot */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 12px", borderRadius: 8, background: "#fffbeb",
            border: "1.5px solid #fde68a"
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#b45309", letterSpacing: "0.06em" }}>
                Bus Driver
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                {bus.driver_first_name
                  ? `${bus.driver_first_name} ${bus.driver_last_name}`
                  : <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 500 }}>Not assigned</span>}
              </div>
              {bus.driver_phone && <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{bus.driver_phone}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                className="btn btn-sm"
                onClick={() => onAssignCrew(bus, "driver")}
                style={{
                  padding: "4px 10px", fontSize: 11, height: 26, gap: 4,
                  background: "#fffbeb", color: "#78350f", border: "1.5px solid #d97706", fontWeight: 700
                }}
              >
                <UserCheck size={11} />
                {bus.driver_first_name ? "Change" : "Assign"}
              </button>
              {bus.driver_first_name && (
                <button
                  className="btn btn-sm"
                  onClick={() => onUnassignCrew && onUnassignCrew(bus, "driver")}
                  title={`Unassign driver ${bus.driver_first_name}`}
                  style={{
                    padding: "4px 7px", fontSize: 11, height: 26,
                    background: "#fff1f2", color: "#e11d48", border: "1.5px solid #fecdd3", fontWeight: 700
                  }}
                >
                  <UserX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Attender slot */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 12px", borderRadius: 8, background: "#eef2ff",
            border: "1.5px solid #c7d2fe"
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#312e81", letterSpacing: "0.06em" }}>
                Bus Attender
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                {bus.conductor_first_name
                  ? `${bus.conductor_first_name} ${bus.conductor_last_name}`
                  : <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: 500 }}>Not assigned</span>}
              </div>
              {bus.conductor_phone && <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>{bus.conductor_phone}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                className="btn btn-sm"
                onClick={() => onAssignCrew(bus, "conductor")}
                style={{
                  padding: "4px 10px", fontSize: 11, height: 26, gap: 4,
                  background: "#eef2ff", color: "#312e81", border: "1.5px solid #6366f1", fontWeight: 700
                }}
              >
                <UserCog size={11} />
                {bus.conductor_first_name ? "Change" : "Assign"}
              </button>
              {bus.conductor_first_name && (
                <button
                  className="btn btn-sm"
                  onClick={() => onUnassignCrew && onUnassignCrew(bus, "conductor")}
                  title={`Unassign attender ${bus.conductor_first_name}`}
                  style={{
                    padding: "4px 7px", fontSize: 11, height: 26,
                    background: "#fff1f2", color: "#e11d48", border: "1.5px solid #fecdd3", fontWeight: 700
                  }}
                >
                  <UserX size={12} />
                </button>
              )}
            </div>
          </div>

          {bus.assigned_students > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <Users size={12} /> {bus.assigned_students} students assigned
            </div>
          )}
        </div>
      </div>

      {/* Notes & Actions */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-primary)", marginBottom: 10 }}>Manage</div>
        {bus.notes && (
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 14, fontStyle: "italic" }}>
            "{bus.notes}"
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(bus)} style={{ gap: 5, fontSize: 12, fontWeight: 600, border: "1.5px solid var(--border-subtle)" }}>
            <Edit2 size={13} /> Edit Bus
          </button>
          <button
            className="btn btn-sm"
            onClick={() => onDelete(bus)}
            style={{ gap: 5, fontSize: 12, fontWeight: 700, background: "#fff1f2", color: "#e11d48", border: "1.5px solid #fecdd3" }}
          >
            <Trash2 size={13} /> Delete Bus
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function BusManagementView({ staff: propStaff = [], academicYear }) {
  const [vehicles, setVehicles]         = useState([]);
  const [routesList, setRoutesList]     = useState([]);
  const [staffList, setStaffList]       = useState(propStaff);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType]     = useState("");
  const [expanded, setExpanded]         = useState(null);
  const [showModal, setShowModal]       = useState(false);
  const [editBus, setEditBus]           = useState(null);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(null);
  const [form, setForm]                 = useState(INIT_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Crew Assignment state
  const [showAssignStaff, setShowAssignStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ staff_id: "", role: "driver" });
  const sst = (k, v) => setStaffForm(f => ({ ...f, [k]: v }));

  // Delete confirmation state (in-app modal)
  const [deleteConfirmBus, setDeleteConfirmBus] = useState(null);

  // Unassign confirmation state (in-app modal — zero system dialogs)
  const [unassignConfirm, setUnassignConfirm] = useState(null);

  // Strict filtering:
  // - Driver: strictly only staff with designation matching "driver" (e.g. "Bus Driver", "Bolero Driver")
  // - Attender: strictly ONLY staff with designation matching "Bus Attender"
  const eligibleStaff = useMemo(() => {
    const seen = new Set();
    return staffList.filter((s) => {
      if (!s.staff_id || seen.has(s.staff_id)) return false;
      const des = (s.designation || "").trim().toLowerCase();
      if (staffForm.role === "driver") {
        if (des.includes("bus driver") || (des.includes("driver") && !des.includes("office"))) {
          seen.add(s.staff_id);
          return true;
        }
        return false;
      } else {
        // Strictly only Bus Attenders (also handles cleaner if any cached client data remains)
        const isBusAttender =
          des === "bus attender" ||
          des.includes("bus attender") ||
          des.includes("cleaner");
        if (isBusAttender) {
          seen.add(s.staff_id);
          return true;
        }
        return false;
      }
    });
  }, [staffList, staffForm.role]);

  // Map of staff_id -> currently active bus assignment to prevent duplicate assignments
  const staffAssignmentsMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      if (v.driver_id) {
        map[v.driver_id] = {
          bus_id: v.bus_id,
          vehicle_number: v.vehicle_number,
          vehicle_name: v.vehicle_name,
          role: "driver",
          label: `Bus ${v.vehicle_number}${v.vehicle_name ? ` (${v.vehicle_name})` : ""}`,
        };
      }
      if (v.conductor_id) {
        map[v.conductor_id] = {
          bus_id: v.bus_id,
          vehicle_number: v.vehicle_number,
          vehicle_name: v.vehicle_name,
          role: "conductor",
          label: `Bus ${v.vehicle_number}${v.vehicle_name ? ` (${v.vehicle_name})` : ""}`,
        };
      }
    });
    return map;
  }, [vehicles]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, sRes, rRes] = await Promise.all([
        BusService.listVehicles(),
        StaffService.list({ all: true }).catch(() => null),
        BusService.listRoutes({ academic_year_id: academicYear?.academic_year_id }).catch(() => null),
      ]);
      setVehicles(vRes.data?.data || []);
      if (sRes?.data?.data?.staff?.length > 0) {
        setStaffList(sRes.data.data.staff);
      }
      if (rRes?.data?.data) {
        setRoutesList(rRes.data.data);
      }
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { load(); }, [load]);

  // Load fresh staff on mount or if propStaff updates
  useEffect(() => {
    StaffService.list({ all: true })
      .then(res => {
        if (res.data?.data?.staff?.length > 0) {
          setStaffList(res.data.data.staff);
        } else if (propStaff && propStaff.length > 0) {
          setStaffList(propStaff);
        }
      })
      .catch(() => {
        if (propStaff && propStaff.length > 0) setStaffList(propStaff);
      });
  }, [propStaff]);

  const openAdd = () => { setForm(INIT_FORM); setEditBus(null); setShowModal(true); };
  const openEdit = (v) => {
    setForm({
      vehicle_number:   v.vehicle_number   || "",
      vehicle_name:     v.vehicle_name     || "",
      vehicle_type:     v.vehicle_type     || "large_bus",
      capacity:         v.capacity         || 40,
      make_model:       v.make_model       || "",
      manufacture_year: v.manufacture_year || "",
      gps_device_id:    v.gps_device_id    || "",
      insurance_expiry: v.insurance_expiry ? v.insurance_expiry.split("T")[0] : "",
      fitness_expiry:   v.fitness_expiry   ? v.fitness_expiry.split("T")[0]   : "",
      permit_expiry:    v.permit_expiry    ? v.permit_expiry.split("T")[0]    : "",
      status:           v.status           || "active",
      notes:            v.notes            || "",
      route_id:         v.route_id         || "",
    });
    setEditBus(v);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.vehicle_number.trim()) { alert("Registration number is required"); return; }
    setSaving(true);
    try {
      if (editBus) await BusService.updateVehicle(editBus.bus_id, form);
      else         await BusService.createVehicle(form);
      setShowModal(false);
      load();
    } catch (e) { alert(e.response?.data?.message || "Failed to save vehicle"); }
    finally { setSaving(false); }
  };

  const requestDelete = (v) => {
    setDeleteConfirmBus(v);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmBus) return;
    setDeleting(deleteConfirmBus.bus_id);
    try {
      await BusService.deleteVehicle(deleteConfirmBus.bus_id);
      setDeleteConfirmBus(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete vehicle");
    } finally {
      setDeleting(null);
    }
  };

  const openAssignCrew = (v, defaultRole = "driver") => {
    setStaffForm({ staff_id: "", role: defaultRole });
    setShowAssignStaff(v);
  };

  const handleAssignCrew = async () => {
    if (!staffForm.staff_id) { alert("Please select a staff member"); return; }
    
    // Front-end duplicate guard
    const currentAssigned = staffAssignmentsMap[staffForm.staff_id];
    if (currentAssigned && currentAssigned.bus_id !== showAssignStaff?.bus_id) {
      alert(`Duplicate assignment not allowed: This staff member is already assigned as ${currentAssigned.role === 'conductor' ? 'Attender' : 'Driver'} to ${currentAssigned.label}. Please unassign them from that bus first.`);
      return;
    }

    setSaving(true);
    try {
      await BusService.assignStaff({
        bus_id: showAssignStaff.bus_id,
        staff_id: staffForm.staff_id,
        role: staffForm.role,
        academic_year_id: academicYear?.academic_year_id || null,
      });
      setShowAssignStaff(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to assign crew member");
    } finally {
      setSaving(false);
    }
  };

  // Trigger in-app confirmation modal (no system alert/confirm)
  const requestUnassignCrew = (bus, role) => {
    const staffName = role === "driver"
      ? `${bus.driver_first_name || ''} ${bus.driver_last_name || ''}`.trim()
      : `${bus.conductor_first_name || ''} ${bus.conductor_last_name || ''}`.trim();
    setUnassignConfirm({ bus, role, staffName });
  };

  const handleConfirmUnassignCrew = async () => {
    if (!unassignConfirm) return;
    const roleLabel = unassignConfirm.role === "driver" ? "Driver" : "Attender";
    setSaving(true);
    try {
      await BusService.unassignStaffByVehicle(unassignConfirm.bus.bus_id, unassignConfirm.role);
      const affectedBusId = unassignConfirm.bus.bus_id;
      setUnassignConfirm(null);
      if (showAssignStaff?.bus_id === affectedBusId) {
        setShowAssignStaff(null);
      }
      load();
    } catch (e) {
      alert(e.response?.data?.message || `Failed to unassign ${roleLabel}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.vehicle_number?.toLowerCase().includes(q)
      || v.vehicle_name?.toLowerCase().includes(q) || v.make_model?.toLowerCase().includes(q);
    return matchSearch && (!filterStatus || v.status === filterStatus) && (!filterType || v.vehicle_type === filterType);
  });

  const stats = {
    total:       vehicles.length,
    active:      vehicles.filter(v => v.status === "active").length,
    maintenance: vehicles.filter(v => v.status === "maintenance").length,
    expiring:    vehicles.filter(v => {
      const ins = expiryStatus(v.insurance_expiry);
      const fit = expiryStatus(v.fitness_expiry);
      return (ins && !ins.ok) || (fit && !fit.ok);
    }).length,
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.08))",
            border: "1px solid rgba(245,158,11,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={22} color="#f59e0b" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Bus Management</h1>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Fleet registry — add, edit, delete &amp; manage all school vehicles
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading} style={{ gap: 5 }}>
            <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : {}} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAdd} style={{ gap: 6 }}>
            <Plus size={15} /> Add Bus
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Total Fleet",    value: stats.total,       color: "#b45309", bg: "#fef3c7", border: "#fde68a", icon: Truck },
          { label: "Active",         value: stats.active,      color: "#047857", bg: "#d1fae5", border: "#a7f3d0", icon: CheckCircle },
          { label: "Maintenance",    value: stats.maintenance, color: "#d97706", bg: "#fef3c7", border: "#fde68a", icon: Settings },
          { label: "Docs Expiring",  value: stats.expiring,    color: "#be123c", bg: "#ffe4e6", border: "#fecdd3", icon: AlertTriangle },
        ].map(({ label, value, color, bg, border, icon: Icon }) => (
          <div key={label} className="glass-panel" style={{
            padding: "16px 20px", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", gap: 14,
            border: `1.5px solid var(--border-subtle)`, boxShadow: "var(--shadow-sm)"
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: "var(--text-primary)" }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{
        padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input className="input-field" placeholder="Search by number, name or model…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, height: 42, fontSize: 13.5 }} />
        </div>
        <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height: 42, flex: "0 1 160px", fontWeight: 600 }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ height: 42, flex: "0 1 170px", fontWeight: 600 }}>
          <option value="">All Types</option>
          {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} / {vehicles.length} vehicles
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
          <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", marginBottom: 12, color: "var(--primary)" }} />
          <div style={{ fontWeight: 600 }}>Loading fleet…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: "center", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--border-subtle)" }}>
          <Truck size={42} color="var(--accent-amber)" style={{ marginBottom: 12, opacity: 0.6 }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
            {vehicles.length === 0 ? "No vehicles in fleet" : "No results match your filters"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
            {vehicles.length === 0 ? 'Click "Add Bus" to register your first school vehicle' : "Clear the search or filters to see all vehicles"}
          </div>
          {vehicles.length === 0 && (
            <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 20, gap: 6 }}>
              <Plus size={15} /> Add Bus
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1.5px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}>
          {filtered.map((v, idx) => {
            const isLast = idx === filtered.length - 1;
            const isOpen = expanded === v.bus_id;
            const ins = expiryStatus(v.insurance_expiry);
            const fit = expiryStatus(v.fitness_expiry);
            const per = expiryStatus(v.permit_expiry);
            const hasAlert = (ins && !ins.ok) || (fit && !fit.ok);

            return (
              <div key={v.bus_id} style={{ borderBottom: isLast ? "none" : "1.5px solid var(--border-subtle)" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 22px",
                    cursor: "pointer", background: isOpen ? "rgba(245,158,11,0.05)" : "transparent",
                    transition: "background 0.15s" }}
                  onClick={() => setExpanded(isOpen ? null : v.bus_id)}
                >
                  {/* Icon */}
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: v.status === "active" ? "#fef3c7" : "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: hasAlert ? "2px solid #e11d48" : "1.5px solid rgba(217,119,6,0.3)" }}>
                    <Bus size={20} color={v.status === "active" ? "#b45309" : "#64748b"} />
                  </div>

                  {/* Name + reg (Bus Name Big, Bus No Small) */}
                  <div style={{ flex: "0 0 190px", minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.vehicle_name || VEHICLE_TYPES.find(t => t.value === v.vehicle_type)?.label || v.vehicle_number}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em", color: "var(--text-secondary)", marginTop: 2 }}>
                      {v.vehicle_number}
                    </div>
                  </div>

                  {/* Status + type */}
                  <div style={{ flex: "0 0 140px", display: "flex", flexDirection: "column", gap: 5 }}>
                    <StatusBadge status={v.status} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                      {VEHICLE_TYPES.find(t => t.value === v.vehicle_type)?.label} · {v.capacity} seats
                    </span>
                  </div>

                  {/* Assigned Route Column */}
                  <div style={{ flex: "0 0 180px", minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 4 }}>
                      Route
                    </div>
                    {v.route_id ? (
                      <div>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 4,
                          background: "#ecfdf5", color: "#065f46", border: "1.5px solid #10b981",
                          fontWeight: 800, letterSpacing: "0.04em", display: "inline-block"
                        }}>
                          {v.route_code}
                        </span>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={v.route_name}>
                          {v.route_name}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); openEdit(v); }}
                        title="Assign Route"
                        style={{
                          background: "none", border: "none", padding: 0,
                          fontSize: 16, fontWeight: 900, color: "var(--primary)",
                          cursor: "pointer", lineHeight: 1, textAlign: "left"
                        }}
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Crew Column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {/* Driver Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 5,
                          background: "#fef3c7", color: "#78350f", border: "1.5px solid #d97706",
                          fontWeight: 800, letterSpacing: "0.04em"
                        }}>
                          DRIVER
                        </span>
                        {v.driver_first_name ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); openAssignCrew(v, "driver"); }}
                              title="Click to change driver"
                              style={{
                                background: "none", border: "none", padding: 0,
                                fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                                textDecoration: "underline", textDecorationColor: "var(--border-subtle)"
                              }}
                            >
                              <span>{v.driver_first_name} {v.driver_last_name}</span>
                              <Edit2 size={11} color="var(--text-muted)" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                requestUnassignCrew(v, "driver");
                              }}
                              title={`Unassign driver ${v.driver_first_name} from Bus ${v.vehicle_number}`}
                              style={{
                                background: "#fff1f2",
                                border: "1px solid #fecdd3",
                                color: "#e11d48",
                                borderRadius: 5,
                                width: 20,
                                height: 20,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                padding: 0,
                                transition: "all 0.15s ease",
                              }}
                            >
                              <UserX size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); openAssignCrew(v, "driver"); }}
                            title="Assign Driver"
                            style={{
                              background: "none", border: "none", padding: 0,
                              fontSize: 16, fontWeight: 900, color: "#b45309",
                              cursor: "pointer", lineHeight: 1
                            }}
                          >
                            +
                          </button>
                        )}
                      </div>

                      {/* Attender Row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 5,
                          background: "#e0e7ff", color: "#312e81", border: "1.5px solid #6366f1",
                          fontWeight: 800, letterSpacing: "0.04em"
                        }}>
                          ATTENDER
                        </span>
                        {v.conductor_first_name ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); openAssignCrew(v, "conductor"); }}
                              title="Click to change attender"
                              style={{
                                background: "none", border: "none", padding: 0,
                                fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                                textDecoration: "underline", textDecorationColor: "var(--border-subtle)"
                              }}
                            >
                              <span>{v.conductor_first_name} {v.conductor_last_name}</span>
                              <Edit2 size={11} color="var(--text-muted)" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                requestUnassignCrew(v, "conductor");
                              }}
                              title={`Unassign attender ${v.conductor_first_name} from Bus ${v.vehicle_number}`}
                              style={{
                                background: "#fff1f2",
                                border: "1px solid #fecdd3",
                                color: "#e11d48",
                                borderRadius: 5,
                                width: 20,
                                height: 20,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                padding: 0,
                                transition: "all 0.15s ease",
                              }}
                            >
                              <UserX size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); openAssignCrew(v, "conductor"); }}
                            title="Assign Attender"
                            style={{
                              background: "none", border: "none", padding: 0,
                              fontSize: 16, fontWeight: 900, color: "#4338ca",
                              cursor: "pointer", lineHeight: 1
                            }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>

                    {v.assigned_students > 0 && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                        <Users size={12} /> {v.assigned_students} students
                      </div>
                    )}
                  </div>

                  {/* Doc badges */}
                  <div style={{ flexShrink: 0, display: "flex", gap: 5 }}>
                    {[{ key: "INS", s: ins }, { key: "FIT", s: fit }, { key: "PER", s: per }]
                      .filter(d => d.s)
                      .map(({ key, s }) => (
                        <span key={key} title={key === "INS" ? "Insurance" : key === "FIT" ? "Fitness" : "Permit"}
                          style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                            background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {key}
                        </span>
                      ))}
                  </div>

                  {/* Actions — Edit, Delete, Expand buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "6px 10px", border: "1.5px solid var(--border-subtle)", color: "var(--text-secondary)", borderRadius: 8 }}
                      title="Edit Bus"
                      onClick={() => openEdit(v)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        padding: "6px 10px", background: "#fff1f2", color: "#e11d48",
                        border: "1.5px solid #fecdd3", cursor: "pointer", borderRadius: 8
                      }}
                      title="Delete Bus"
                      onClick={() => requestDelete(v)}
                    >
                      <Trash2 size={14} />
                    </button>
                    {isOpen ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                  </div>
                </div>

                {/* Detail panel */}
                {isOpen && (
                  <BusDetailPanel
                    bus={v}
                    onAssignCrew={openAssignCrew}
                    onUnassignCrew={requestUnassignCrew}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bus Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editBus ? `Edit — ${editBus.vehicle_number}` : "Add New Bus"} width="660px">
        <BusForm form={form} set={set} saving={saving}
          onSave={handleSave} onCancel={() => setShowModal(false)} isEdit={!!editBus} editBus={editBus} routes={routesList} />
      </Modal>

      {/* Assign Crew Modal — Dedicated Driver & Attender Buttons + Strict Dropdown */}
      <Modal
        isOpen={!!showAssignStaff}
        onClose={() => setShowAssignStaff(null)}
        title={staffForm.role === "driver"
          ? `Assign Bus Driver — ${showAssignStaff?.vehicle_number || ''}`
          : `Assign Bus Attender — ${showAssignStaff?.vehicle_number || ''}`}
        width="520px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Quick Buttons for Driver and Attender */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Assignment Role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  sst("role", "driver");
                  sst("staff_id", "");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  border: staffForm.role === "driver" ? "2px solid #d97706" : "1.5px solid var(--border-subtle)",
                  background: staffForm.role === "driver" ? "#fffbeb" : "var(--bg-surface)",
                  color: staffForm.role === "driver" ? "#b45309" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: staffForm.role === "driver" ? "0 2px 8px rgba(217,119,6,0.15)" : "none",
                }}
              >
                <UserCheck size={18} color={staffForm.role === "driver" ? "#b45309" : "var(--text-secondary)"} /> Bus Driver
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  sst("role", "conductor");
                  sst("staff_id", "");
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  border: staffForm.role === "conductor" ? "2px solid #4f46e5" : "1.5px solid var(--border-subtle)",
                  background: staffForm.role === "conductor" ? "#eef2ff" : "var(--bg-surface)",
                  color: staffForm.role === "conductor" ? "#4338ca" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: staffForm.role === "conductor" ? "0 2px 8px rgba(79,70,229,0.15)" : "none",
                }}
              >
                <UserCog size={18} color={staffForm.role === "conductor" ? "#4338ca" : "var(--text-secondary)"} /> Bus Attender
              </button>
            </div>
          </div>

          {/* Current vehicle & crew status summary */}
          {showAssignStaff && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, background: "var(--bg-surface-elevated)",
              border: "1.5px solid var(--border-subtle)", fontSize: 12, color: "var(--text-secondary)",
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8
            }}>
              <span>Bus: <strong style={{ color: "var(--text-primary)" }}>{showAssignStaff.vehicle_number}</strong> {showAssignStaff.vehicle_name ? `(${showAssignStaff.vehicle_name})` : ''}</span>
              <span>Currently Assigned: <strong style={{ color: "var(--text-primary)" }}>
                {staffForm.role === "driver"
                  ? (showAssignStaff.driver_first_name ? `${showAssignStaff.driver_first_name} ${showAssignStaff.driver_last_name}` : "None")
                  : (showAssignStaff.conductor_first_name ? `${showAssignStaff.conductor_first_name} ${showAssignStaff.conductor_last_name}` : "None")}
              </strong></span>
            </div>
          )}

          {/* Dropdown strictly containing Bus Drivers or Bus Attenders */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="input-label" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {staffForm.role === "driver" ? "Select Bus Driver *" : "Select Bus Attender *"}
              </label>
              <span style={{ fontSize: 12, color: staffForm.role === "driver" ? "#b45309" : "#4338ca", fontWeight: 800 }}>
                {eligibleStaff.filter(s => {
                  const a = staffAssignmentsMap[s.staff_id];
                  return !a || a.bus_id === showAssignStaff?.bus_id;
                }).length} available / {eligibleStaff.length} total
              </span>
            </div>
            <select
              className="input-field"
              value={staffForm.staff_id}
              onChange={e => sst("staff_id", e.target.value)}
              style={{ height: 42, fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}
            >
              <option value="">
                {eligibleStaff.length === 0
                  ? `— No ${staffForm.role === "driver" ? "Bus Drivers" : "Bus Attenders"} found —`
                  : `— Select ${staffForm.role === "driver" ? "Bus Driver" : "Bus Attender"} —`}
              </option>
              {eligibleStaff.map(s => {
                const desLabel = (s.designation || "").toLowerCase().includes("cleaner")
                  ? "Bus Attender"
                  : (s.designation || (staffForm.role === "driver" ? "Bus Driver" : "Bus Attender"));
                
                const currentAssigned = staffAssignmentsMap[s.staff_id];
                const isAssignedToOtherBus = currentAssigned && currentAssigned.bus_id !== showAssignStaff?.bus_id;
                const isAssignedToThisBus = currentAssigned && currentAssigned.bus_id === showAssignStaff?.bus_id;

                let statusSuffix = "";
                if (isAssignedToThisBus) {
                  statusSuffix = " ✓ (Currently assigned to this bus)";
                } else if (isAssignedToOtherBus) {
                  statusSuffix = ` 🚫 (Already assigned to ${currentAssigned.label} as ${currentAssigned.role === 'conductor' ? 'Attender' : 'Driver'})`;
                }

                return (
                  <option
                    key={s.staff_id}
                    value={s.staff_id}
                    disabled={isAssignedToOtherBus}
                    style={isAssignedToOtherBus ? { color: "#94a3b8", background: "#f8fafc" } : {}}
                  >
                    {s.first_name} {s.last_name} {s.employee_id ? `[${s.employee_id}]` : ""} ({desLabel}){statusSuffix}
                  </option>
                );
              })}
            </select>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
              Staff members already assigned to other buses cannot be duplicate-assigned.
            </div>
          </div>

          <div style={{
            padding: "11px 14px", borderRadius: 10,
            background: "#fffbeb", border: "1.5px solid #fde68a",
            fontSize: 12, color: "#92400e", lineHeight: 1.5, fontWeight: 500
          }}>
            ℹ️ A crew member can only be assigned to <strong>one bus at a time</strong>. Assigning a new crew member to this bus will replace any existing assignment for this vehicle.
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <div>
              {/* Show Unassign button if the current bus has an assigned driver/attender */}
              {((staffForm.role === "driver" && showAssignStaff?.driver_first_name) ||
                (staffForm.role === "conductor" && showAssignStaff?.conductor_first_name)) && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => requestUnassignCrew(showAssignStaff, staffForm.role)}
                  disabled={saving}
                  style={{
                    background: "#fff1f2", color: "#e11d48", border: "1.5px solid #fecdd3",
                    fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8
                  }}
                  title={`Remove ${staffForm.role === "driver" ? "Driver" : "Attender"} from this bus`}
                >
                  <UserX size={14} /> Unassign {staffForm.role === "driver" ? "Driver" : "Attender"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAssignStaff(null)}
                style={{ border: "1.5px solid var(--border-subtle)", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAssignCrew}
                disabled={saving || !staffForm.staff_id}
                style={{ fontWeight: 700 }}
              >
                {saving ? "Assigning…" : `Assign ${staffForm.role === "driver" ? "Driver" : "Attender"}`}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Bus Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmBus}
        onClose={() => !deleting && setDeleteConfirmBus(null)}
        title="Confirm Vehicle Deletion"
        width="460px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <AlertTriangle size={22} color="#f43f5e" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Delete Bus {deleteConfirmBus?.vehicle_number}?
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                {deleteConfirmBus?.vehicle_name ? `Vehicle: "${deleteConfirmBus.vehicle_name}". ` : ""}
                Are you sure you want to remove this vehicle from the school fleet?
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)",
            fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5
          }}>
            ⚠️ <strong>Warning:</strong> This will permanently delete vehicle <strong>{deleteConfirmBus?.vehicle_number}</strong> and automatically unlink all staff assignments (Bus Driver & Bus Attender) and route allocations. This action cannot be undone.
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmBus(null)}
              disabled={!!deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleConfirmDelete}
              disabled={!!deleting}
              style={{ gap: 6 }}
            >
              {deleting
                ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Deleting…</>
                : <><Trash2 size={13} /> Yes, Delete Bus</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unassign Crew Confirmation Modal (In-App Modal — Zero system dialogs) */}
      <Modal
        isOpen={!!unassignConfirm}
        onClose={() => !saving && setUnassignConfirm(null)}
        title="Confirm Crew Unassignment"
        width="460px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.28)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <UserX size={22} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Unassign {unassignConfirm?.role === "driver" ? "Bus Driver" : "Bus Attender"}?
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                Are you sure you want to unassign <strong>{unassignConfirm?.staffName}</strong> as {unassignConfirm?.role === "driver" ? "Driver" : "Attender"} from <strong>Bus {unassignConfirm?.bus?.vehicle_number}</strong>?
              </div>
            </div>
          </div>

          <div style={{
            padding: "11px 14px", borderRadius: 10,
            background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.2)",
            fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5
          }}>
            ℹ️ This vehicle will have no active {unassignConfirm?.role === "driver" ? "driver" : "attender"} until a new crew member is assigned. {unassignConfirm?.staffName} will become available for assignment to any bus.
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setUnassignConfirm(null)}
              disabled={saving}
              style={{ border: "1.5px solid var(--border-subtle)", fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmUnassignCrew}
              disabled={saving}
              style={{ fontWeight: 700, gap: 6 }}
            >
              {saving
                ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Unassigning…</>
                : <><UserX size={14} /> Yes, Unassign {unassignConfirm?.role === "driver" ? "Driver" : "Attender"}</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
