import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  Search,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Sparkles,
  ArrowRight,
  Phone,
  MapPin,
  Clock,
  Bus,
  Shield,
  User,
  Users,
  CheckSquare,
  Square,
  MinusSquare,
  RefreshCw,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Sunrise,
  Sunset,
  ArrowLeftRight,
  Printer,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Info,
  BadgePercent,
  CheckCircle,
  Hash,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BusService, StudentService } from '../services/api';

// ─── Modal Wrapper Component using Portal ─────────────────────────────────────
function Modal({ isOpen, onClose, title, subtitle, children, width = '560px', closeOnClickOutside = false }) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 16, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-glass)',
          boxShadow: shake
            ? '0 0 0 3px rgba(99, 102, 241, 0.45), var(--shadow-lg), 0 0 50px rgba(99, 102, 241, 0.25)'
            : 'var(--shadow-lg), 0 0 40px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
          transform: shake ? 'scale(1.008)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Time Formatter Helper ───────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return '—';
  try {
    const parts = t.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  } catch {
    return t;
  }
}

// ─── Direction Badge Component ───────────────────────────────────────────────
function DirectionBadge({ direction }) {
  if (direction === 'morning') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 20,
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(245, 158, 11, 0.12)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        <Sunrise size={12} /> Morning Only
      </span>
    );
  }
  if (direction === 'evening') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 20,
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(139, 92, 246, 0.12)',
          color: '#8b5cf6',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        <Sunset size={12} /> Evening Only
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px',
        borderRadius: 20,
        fontSize: '11px',
        fontWeight: 700,
        background: 'rgba(99, 102, 241, 0.12)',
        color: '#818cf8',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        whiteSpace: 'nowrap',
      }}
    >
      <ArrowLeftRight size={12} /> Both Ways
    </span>
  );
}

// ─── Status Badge Component ──────────────────────────────────────────────────
function AssignmentStatusBadge({ status }) {
  if (status === 'active') {
    return (
      <span className="badge badge-emerald" style={{ fontSize: '11px', padding: '3px 9px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
        Active
      </span>
    );
  }
  if (status === 'on_leave') {
    return (
      <span className="badge badge-amber" style={{ fontSize: '11px', padding: '3px 9px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
        On Leave
      </span>
    );
  }
  return (
    <span className="badge badge-rose" style={{ fontSize: '11px', padding: '3px 9px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e' }} />
      Inactive
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN STUDENT ROSTER VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function StudentRosterView({
  students = [],
  staff = [],
  classes = [],
  school,
  academicYear
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [routeStopsMap, setRouteStopsMap] = useState({}); // { [routeId]: stops[] }
  const [loading, setLoading] = useState(true);
  const [unassignedList, setUnassignedList] = useState([]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState([]);

  // Selected student for Info Card Drawer
  const [activeStudent, setActiveStudent] = useState(null);
  const [showTransitPass, setShowTransitPass] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterStop, setFilterStop] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterFee, setFilterFee] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Add / Edit form state
  const initForm = {
    student_id: '',
    route_id: '',
    stop_id: '',
    direction: 'both',
    fee_amount: '',
    fee_type: 'monthly',
    is_free: false,
    status: 'active',
    notes: '',
  };
  const [form, setForm] = useState(initForm);
  const [modalStops, setModalStops] = useState([]);
  const [saving, setSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Batch move form state
  const [batchMoveRoute, setBatchMoveRoute] = useState('');
  const [batchMoveStop, setBatchMoveStop] = useState('');
  const [batchMoveStops, setBatchMoveStops] = useState([]);

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkParsedRows, setBulkParsedRows] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkStats, setBulkStats] = useState(null);
  const fileInputRef = useRef(null);

  // ── Admission Lookup State for Add Modal ────────────────────────────────────
  const [admissionInput, setAdmissionInput] = useState('');
  const [lookedUpStudent, setLookedUpStudent] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // ── Load All Data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!academicYear?.academic_year_id) return;
    setLoading(true);
    try {
      const [assignRes, routesRes] = await Promise.all([
        BusService.listStudentAssignments({
          academic_year_id: academicYear.academic_year_id,
          limit: 1000,
        }),
        BusService.listRoutes({
          academic_year_id: academicYear.academic_year_id,
        }),
      ]);

      const assignData = assignRes.data?.data?.assignments || [];
      const routeData = routesRes.data?.data || [];
      setAssignments(assignData);
      setRoutes(routeData);

      // Load stops for all routes for filter & lookup
      const stopsMap = {};
      await Promise.all(
        routeData.map(async (r) => {
          try {
            const stopRes = await BusService.listStops(r.route_id);
            stopsMap[r.route_id] = stopRes.data?.data || [];
          } catch (e) {
            stopsMap[r.route_id] = [];
          }
        })
      );
      setRouteStopsMap(stopsMap);

      // Fetch unassigned students for quick enrollment
      try {
        const unassignRes = await BusService.listUnassignedStudents({
          academic_year_id: academicYear.academic_year_id,
        });
        setUnassignedList(unassignRes.data?.data || []);
      } catch (err) {
        // fallback
      }
    } catch (err) {
      console.error('Failed to load roster data:', err);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Notice banner auto-dismiss
  useEffect(() => {
    if (actionNotice) {
      const timer = setTimeout(() => setActionNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionNotice]);

  // Dynamic stops for the selected route in Add/Edit modal
  const handleModalRouteChange = async (routeId) => {
    setForm((prev) => ({ ...prev, route_id: routeId, stop_id: '' }));
    if (!routeId) {
      setModalStops([]);
      return;
    }
    if (routeStopsMap[routeId]) {
      setModalStops(routeStopsMap[routeId]);
    } else {
      try {
        const res = await BusService.listStops(routeId);
        const stops = res.data?.data || [];
        setModalStops(stops);
        setRouteStopsMap((prev) => ({ ...prev, [routeId]: stops }));
      } catch (err) {
        setModalStops([]);
      }
    }

    // Auto-populate default route fee
    const r = routes.find((x) => x.route_id === routeId);
    if (r && !form.fee_amount && !form.is_free) {
      setForm((prev) => ({
        ...prev,
        fee_amount: r.monthly_fee ? String(r.monthly_fee) : '',
        fee_type: 'monthly',
      }));
    }
  };

  // Dynamic stops for Batch Move modal
  const handleBatchMoveRouteChange = async (routeId) => {
    setBatchMoveRoute(routeId);
    setBatchMoveStop('');
    if (!routeId) {
      setBatchMoveStops([]);
      return;
    }
    if (routeStopsMap[routeId]) {
      setBatchMoveStops(routeStopsMap[routeId]);
    } else {
      try {
        const res = await BusService.listStops(routeId);
        const stops = res.data?.data || [];
        setBatchMoveStops(stops);
        setRouteStopsMap((prev) => ({ ...prev, [routeId]: stops }));
      } catch (err) {
        setBatchMoveStops([]);
      }
    }
  };

  // Stops available for the current filter selection
  const filterAvailableStops = useMemo(() => {
    if (filterRoute && routeStopsMap[filterRoute]) {
      return routeStopsMap[filterRoute];
    }
    // If no route selected, aggregate unique stops across all routes
    const all = [];
    const seen = new Set();
    Object.values(routeStopsMap).forEach((stList) => {
      stList.forEach((st) => {
        if (!seen.has(st.stop_name)) {
          seen.add(st.stop_name);
          all.push(st);
        }
      });
    });
    return all;
  }, [filterRoute, routeStopsMap]);

  // ── Filtered Assignments ───────────────────────────────────────────────────
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const studentName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
        const admNo = (item.admission_number || '').toLowerCase();
        const parentName = (item.father_name || '').toLowerCase();
        const studentPhone = (item.phone || '').toLowerCase();
        const guardianPhone = (item.guardian_phone || '').toLowerCase();
        const routeName = (item.route_name || '').toLowerCase();
        const routeCode = (item.route_code || '').toLowerCase();
        const stopName = (item.stop_name || '').toLowerCase();

        const matches =
          studentName.includes(q) ||
          admNo.includes(q) ||
          parentName.includes(q) ||
          studentPhone.includes(q) ||
          guardianPhone.includes(q) ||
          routeName.includes(q) ||
          routeCode.includes(q) ||
          stopName.includes(q);

        if (!matches) return false;
      }

      // Route filter
      if (filterRoute && item.route_id !== filterRoute) return false;

      // Stop filter
      if (filterStop) {
        if (item.stop_id !== filterStop && item.stop_name !== filterStop) return false;
      }

      // Class filter
      if (filterClass) {
        const classKey = `${item.class_name || ''} ${item.section_name || ''}`.trim().toLowerCase();
        if (!classKey.includes(filterClass.toLowerCase())) return false;
      }

      // Direction filter
      if (filterDirection && item.direction !== filterDirection) return false;

      // Status filter
      if (filterStatus && item.status !== filterStatus) return false;

      // Fee filter
      if (filterFee === 'free' && !item.is_free) return false;
      if (filterFee === 'paid' && item.is_free) return false;

      return true;
    });
  }, [assignments, search, filterRoute, filterStop, filterClass, filterDirection, filterStatus, filterFee]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (search.trim()) c++;
    if (filterRoute) c++;
    if (filterStop) c++;
    if (filterClass) c++;
    if (filterDirection) c++;
    if (filterStatus && filterStatus !== 'all') c++;
    if (filterFee) c++;
    return c;
  }, [search, filterRoute, filterStop, filterClass, filterDirection, filterStatus, filterFee]);

  const clearAllFilters = () => {
    setSearch('');
    setFilterRoute('');
    setFilterStop('');
    setFilterClass('');
    setFilterDirection('');
    setFilterStatus('all');
    setFilterFee('');
  };

  // ── Stats Calculations ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.status === 'active').length;
    const morningRiders = assignments.filter(
      (a) => a.status === 'active' && (a.direction === 'both' || a.direction === 'morning')
    ).length;
    const eveningRiders = assignments.filter(
      (a) => a.status === 'active' && (a.direction === 'both' || a.direction === 'evening')
    ).length;
    const bothWays = assignments.filter((a) => a.status === 'active' && a.direction === 'both').length;
    const freeWaivers = assignments.filter((a) => a.status === 'active' && a.is_free).length;
    const activeRoutes = new Set(assignments.filter((a) => a.status === 'active').map((a) => a.route_id)).size;

    return {
      total,
      active,
      morningRiders,
      eveningRiders,
      bothWays,
      freeWaivers,
      activeRoutes,
    };
  }, [assignments]);

  // ── Multi-select Handlers ──────────────────────────────────────────────────
  const isAllSelected = useMemo(() => {
    if (filteredAssignments.length === 0) return false;
    return filteredAssignments.every((a) => selectedIds.includes(a.assignment_id));
  }, [filteredAssignments, selectedIds]);

  const isIndeterminate = useMemo(() => {
    const matched = filteredAssignments.filter((a) => selectedIds.includes(a.assignment_id)).length;
    return matched > 0 && matched < filteredAssignments.length;
  }, [filteredAssignments, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Uncheck all filtered
      const currentFilteredIds = new Set(filteredAssignments.map((a) => a.assignment_id));
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.has(id)));
    } else {
      // Select all filtered
      const toAdd = filteredAssignments.map((a) => a.assignment_id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...toAdd])));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ── Single Student Add Modal Helpers ────────────────────────────────────────
  const handleOpenAddModal = () => {
    setForm(initForm);
    setAdmissionInput('');
    setLookedUpStudent(null);
    setLookupError(null);
    setLookupLoading(false);
    setModalStops([]);
    setShowAddModal(true);
  };

  const handleLookupAdmission = async (admNo) => {
    const raw = admNo !== undefined ? admNo : admissionInput;
    const query = String(raw || '').trim();
    if (!query) {
      setLookupError('Please enter a student admission number.');
      setLookedUpStudent(null);
      setForm((prev) => ({ ...prev, student_id: '' }));
      return null;
    }

    setLookupLoading(true);
    setLookupError(null);

    try {
      const qLower = query.toLowerCase();

      // 1. Search in local students array
      let matched = students.find(
        (s) => s.admission_number && String(s.admission_number).toLowerCase().trim() === qLower
      );

      // 2. Search in unassigned list
      if (!matched) {
        matched = unassignedList.find(
          (s) => s.admission_number && String(s.admission_number).toLowerCase().trim() === qLower
        );
      }

      // 3. Fallback to API search if not in local memory
      if (!matched) {
        try {
          const res = await StudentService.list({ search: query, limit: 10 });
          const list = res.data?.data?.students || [];
          matched = list.find(
            (s) => s.admission_number && String(s.admission_number).toLowerCase().trim() === qLower
          ) || (list.length === 1 ? list[0] : null);
        } catch (apiErr) {
          // ignore API error, rely on local check
        }
      }

      if (matched) {
        setLookedUpStudent(matched);
        setLookupError(null);
        setAdmissionInput(matched.admission_number || query);
        setForm((prev) => ({ ...prev, student_id: matched.student_id }));
        return matched;
      } else {
        setLookedUpStudent(null);
        setLookupError(`No student found with admission number "${query}". Please verify the number and try again.`);
        setForm((prev) => ({ ...prev, student_id: '' }));
        return null;
      }
    } catch (err) {
      console.error('Admission lookup error:', err);
      setLookupError('Failed to lookup student. Please try again.');
      return null;
    } finally {
      setLookupLoading(false);
    }
  };

  const existingAssignmentNotice = useMemo(() => {
    if (!lookedUpStudent) return null;
    return assignments.find((a) => a.student_id === lookedUpStudent.student_id && a.status === 'active');
  }, [lookedUpStudent, assignments]);

  // ── Single Student Add Submission ──────────────────────────────────────────
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    let targetStudentId = form.student_id;

    // Auto-resolve if user typed admission number but didn't press Enter or Find
    if (!targetStudentId && admissionInput.trim()) {
      const resolved = await handleLookupAdmission(admissionInput.trim());
      if (resolved) {
        targetStudentId = resolved.student_id;
      }
    }

    if (!targetStudentId) {
      setLookupError('Please enter a valid admission number and search for the student first.');
      return;
    }
    if (!form.route_id) {
      alert('Please select a bus route.');
      return;
    }
    if (!form.stop_id) {
      alert('Please select a boarding stop.');
      return;
    }

    setSaving(true);
    try {
      await BusService.assignStudent({
        academic_year_id: academicYear.academic_year_id,
        student_id: targetStudentId,
        route_id: form.route_id,
        stop_id: form.stop_id,
        direction: form.direction,
        fee_amount: form.is_free ? null : form.fee_amount || null,
        fee_type: form.is_free ? null : form.fee_type || null,
        is_free: form.is_free,
        notes: form.notes,
      });

      setShowAddModal(false);
      setForm(initForm);
      setActionNotice({ type: 'success', message: 'Student added to transport roster successfully!' });
      loadData();
    } catch (err) {
      console.error('Failed to assign student:', err);
      alert(err.response?.data?.message || 'Failed to assign student. Please verify they are not already assigned.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Student Submission ────────────────────────────────────────────────
  const handleOpenEdit = (assignment, e) => {
    if (e) e.stopPropagation();
    setEditingAssignment(assignment);
    setForm({
      student_id: assignment.student_id,
      route_id: assignment.route_id,
      stop_id: assignment.stop_id,
      direction: assignment.direction || 'both',
      fee_amount: assignment.fee_amount ? String(assignment.fee_amount) : '',
      fee_type: assignment.fee_type || 'monthly',
      is_free: !!assignment.is_free,
      status: assignment.status || 'active',
      notes: assignment.notes || '',
    });

    // Populate modal stops for the route
    if (routeStopsMap[assignment.route_id]) {
      setModalStops(routeStopsMap[assignment.route_id]);
    } else {
      BusService.listStops(assignment.route_id).then((res) => {
        setModalStops(res.data?.data || []);
      });
    }

    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setSaving(true);
    try {
      await BusService.updateStudentAssignment(editingAssignment.assignment_id, {
        route_id: form.route_id,
        stop_id: form.stop_id,
        direction: form.direction,
        fee_amount: form.is_free ? null : form.fee_amount || null,
        fee_type: form.is_free ? null : form.fee_type || null,
        is_free: form.is_free,
        status: form.status,
        notes: form.notes,
      });

      setShowEditModal(false);
      setEditingAssignment(null);
      setActionNotice({ type: 'success', message: 'Student transport plan updated successfully!' });
      loadData();

      // If active student in drawer was edited, update view
      if (activeStudent && activeStudent.assignment_id === editingAssignment.assignment_id) {
        setActiveStudent(null);
      }
    } catch (err) {
      console.error('Failed to update student assignment:', err);
      alert(err.response?.data?.message || 'Failed to update student assignment.');
    } finally {
      setSaving(false);
    }
  };

  // ── Unassign Single Student ────────────────────────────────────────────────
  const handleUnassignSingle = async (assignmentId, permanent = false, e) => {
    if (e) e.stopPropagation();
    const promptMsg = permanent
      ? 'Are you sure you want to permanently delete this student assignment?'
      : 'Unassign this student from the bus route? (Status will be set to inactive)';
    if (!window.confirm(promptMsg)) return;

    try {
      await BusService.unassignStudent(assignmentId, { permanent });
      setActionNotice({
        type: 'success',
        message: permanent ? 'Student assignment permanently removed.' : 'Student marked as inactive / unassigned.',
      });
      if (activeStudent?.assignment_id === assignmentId) {
        setActiveStudent(null);
      }
      loadData();
    } catch (err) {
      console.error('Failed to unassign student:', err);
      alert('Failed to remove assignment.');
    }
  };

  // ── Batch Actions Execution ────────────────────────────────────────────────
  const handleBatchStatus = async (status) => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Set status to "${status}" for ${selectedIds.length} selected student(s)?`)) return;

    try {
      await BusService.bulkActionStudentAssignments({
        action: 'change_status',
        assignment_ids: selectedIds,
        data: { status },
      });
      setActionNotice({ type: 'success', message: `Updated status to "${status}" for ${selectedIds.length} student(s)` });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error('Batch status update failed:', err);
      alert('Failed to update batch status.');
    }
  };

  const handleBatchUnassign = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Unassign ${selectedIds.length} selected student(s) from bus routes?`)) return;

    try {
      await BusService.bulkActionStudentAssignments({
        action: 'unassign',
        assignment_ids: selectedIds,
      });
      setActionNotice({ type: 'success', message: `Unassigned ${selectedIds.length} student(s) from routes.` });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error('Batch unassign failed:', err);
      alert('Failed to batch unassign.');
    }
  };

  const handleBatchDeletePermanent = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`⚠️ Permanently remove ${selectedIds.length} student bus assignments from the database?`)) return;

    try {
      await BusService.bulkActionStudentAssignments({
        action: 'delete_permanent',
        assignment_ids: selectedIds,
      });
      setActionNotice({ type: 'success', message: `Permanently removed ${selectedIds.length} assignments.` });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error('Batch permanent delete failed:', err);
      alert('Failed to delete assignments.');
    }
  };

  const handleBatchMoveSubmit = async (e) => {
    e.preventDefault();
    if (!batchMoveRoute || !batchMoveStop) {
      alert('Please select both a Route and a Boarding Stop.');
      return;
    }
    setSaving(true);
    try {
      await BusService.bulkActionStudentAssignments({
        action: 'change_route_stop',
        assignment_ids: selectedIds,
        data: { route_id: batchMoveRoute, stop_id: batchMoveStop },
      });
      setShowBatchMoveModal(false);
      setActionNotice({ type: 'success', message: `Reassigned ${selectedIds.length} student(s) to the new route and stop!` });
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error('Batch move failed:', err);
      alert('Failed to reassign selected students.');
    } finally {
      setSaving(false);
    }
  };

  // ── Export to Excel (.xlsx) ────────────────────────────────────────────────
  const handleExport = (exportSelected = false) => {
    const listToExport = exportSelected
      ? assignments.filter((a) => selectedIds.includes(a.assignment_id))
      : filteredAssignments;

    if (listToExport.length === 0) {
      alert('No students to export.');
      return;
    }

    const rows = listToExport.map((a) => ({
      'Admission Number': a.admission_number,
      'Student Name': `${a.first_name || ''} ${a.last_name || ''}`.trim(),
      'Gender': a.gender ? a.gender.toUpperCase() : '',
      'Class': `${a.class_name || ''} ${a.section_name || ''}`.trim(),
      'Route Code': a.route_code,
      'Route Name': a.route_name,
      'Boarding Stop': a.stop_name,
      'Stop Sequence': a.stop_sequence || '',
      'Morning Pickup': fmtTime(a.morning_time),
      'Evening Drop': fmtTime(a.evening_time),
      'Direction': a.direction === 'both' ? 'Both Ways' : a.direction === 'morning' ? 'Morning Only' : 'Evening Only',
      'Fee Amount': a.is_free ? 'FREE / WAIVER' : a.fee_amount ? `₹${a.fee_amount}` : '—',
      'Fee Type': a.fee_type || '—',
      'Status': (a.status || 'active').toUpperCase(),
      'Father / Guardian': a.father_name || '',
      'Guardian Phone': a.guardian_phone || a.phone || '',
      'Student Address': a.address || a.area || '',
      'Vehicle Number': a.vehicle_number || '—',
      'Driver Name': a.driver_first_name ? `${a.driver_first_name} ${a.driver_last_name || ''}`.trim() : '—',
      'Driver Phone': a.driver_phone || '—',
      'Notes': a.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Roster');
    const filename = `student_bus_roster_${academicYear?.name?.replace(/\s+/g, '_') || 'export'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // ── Download Sample Excel Template ─────────────────────────────────────────
  const handleDownloadSampleTemplate = () => {
    // 1. Template sheet
    const templateData = [
      {
        'Admission Number': 'ADM-001',
        'Student Name (Ref)': 'Rohan Sharma',
        'Route Code': routes[0]?.route_code || 'R01',
        'Stop Name': (routeStopsMap[routes[0]?.route_id]?.[0]?.stop_name) || 'City Center Mall',
        'Direction (both/morning/evening)': 'both',
        'Fee Amount': '1500',
        'Fee Type (monthly/annual)': 'monthly',
        'Is Free (yes/no)': 'no',
        'Notes': 'Morning pickup front gate',
      },
      {
        'Admission Number': 'ADM-002',
        'Student Name (Ref)': 'Priya Patel',
        'Route Code': routes[0]?.route_code || 'R01',
        'Stop Name': (routeStopsMap[routes[0]?.route_id]?.[1]?.stop_name) || 'North Square',
        'Direction (both/morning/evening)': 'morning',
        'Fee Amount': '0',
        'Fee Type (monthly/annual)': 'monthly',
        'Is Free (yes/no)': 'yes',
        'Notes': 'Fee scholarship recipient',
      },
    ];

    // 2. Reference list of valid routes & stops
    const refData = [];
    routes.forEach((r) => {
      const stops = routeStopsMap[r.route_id] || [];
      if (stops.length === 0) {
        refData.push({
          'Route Code': r.route_code,
          'Route Name': r.route_name,
          'Stop Name': '— No stops created yet —',
          'Morning Time': '—',
          'Evening Time': '—',
        });
      } else {
        stops.forEach((s) => {
          refData.push({
            'Route Code': r.route_code,
            'Route Name': r.route_name,
            'Stop Name': s.stop_name,
            'Morning Time': s.morning_time || '—',
            'Evening Time': s.evening_time || '—',
          });
        });
      }
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(templateData);
    const ws2 = XLSX.utils.json_to_sheet(refData);

    XLSX.utils.book_append_sheet(wb, ws1, 'Upload Template');
    XLSX.utils.book_append_sheet(wb, ws2, 'Valid Routes & Stops Reference');

    XLSX.writeFile(wb, 'student_bus_roster_upload_template.xlsx');
  };

  // ── Parse Bulk File ────────────────────────────────────────────────────────
  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws);

        // Pre-validate rows against current student & route list
        const studentMap = {};
        students.forEach((s) => {
          studentMap[String(s.admission_number).trim().toUpperCase()] = s;
        });

        const routeCodeMap = {};
        routes.forEach((r) => {
          routeCodeMap[String(r.route_code).trim().toUpperCase()] = r;
        });

        const validated = rawJson.map((row, idx) => {
          // Normalize column names
          const admNo = String(row['Admission Number'] || row['Admission No'] || row['admission_number'] || '').trim();
          const rCode = String(row['Route Code'] || row['route_code'] || '').trim();
          const sName = String(row['Stop Name'] || row['stop_name'] || '').trim();
          const rawDir = String(row['Direction (both/morning/evening)'] || row['Direction'] || 'both').toLowerCase().trim();
          const dir = ['morning', 'evening', 'both'].includes(rawDir) ? rawDir : 'both';
          const isFreeRaw = String(row['Is Free (yes/no)'] || row['Is Free'] || row['is_free'] || '').toLowerCase().trim();
          const isFree = isFreeRaw === 'yes' || isFreeRaw === 'true' || isFreeRaw === '1';
          const feeAmt = row['Fee Amount'] || row['fee_amount'] || '';
          const feeType = String(row['Fee Type (monthly/annual)'] || row['Fee Type'] || 'monthly').toLowerCase().trim();
          const notes = row['Notes'] || row['notes'] || '';

          const student = studentMap[admNo.toUpperCase()];
          const route = routeCodeMap[rCode.toUpperCase()];
          let stop = null;

          if (route && routeStopsMap[route.route_id]) {
            stop = routeStopsMap[route.route_id].find(
              (st) => st.stop_name.toLowerCase().trim() === sName.toLowerCase().trim()
            );
          }

          const errors = [];
          if (!admNo) errors.push('Missing Admission Number');
          else if (!student) errors.push(`Student "${admNo}" not found`);

          if (!rCode) errors.push('Missing Route Code');
          else if (!route) errors.push(`Route "${rCode}" not found`);

          if (!sName) errors.push('Missing Stop Name');
          else if (route && !stop) errors.push(`Stop "${sName}" not found on Route ${rCode}`);

          return {
            rowIndex: idx + 1,
            admission_number: admNo,
            student_name: student ? `${student.first_name} ${student.last_name || ''}`.trim() : (row['Student Name (Ref)'] || '—'),
            class_name: student?.class_name ? `${student.class_name} ${student.section_name || ''}` : '—',
            student_id: student?.student_id || null,
            route_code: rCode,
            route_name: route?.route_name || '',
            route_id: route?.route_id || null,
            stop_name: sName,
            stop_id: stop?.stop_id || null,
            direction: dir,
            fee_amount: feeAmt,
            fee_type: feeType === 'annual' ? 'annual' : 'monthly',
            is_free: isFree,
            notes: notes,
            isValid: errors.length === 0,
            errors,
          };
        });

        setBulkParsedRows(validated);
        const validCount = validated.filter((v) => v.isValid).length;
        const errCount = validated.length - validCount;
        setBulkStats({ total: validated.length, valid: validCount, invalid: errCount });
      } catch (parseErr) {
        console.error('File parsing failed:', parseErr);
        alert('Failed to parse file. Please upload a valid .xlsx, .xls, or .csv spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkUploadConfirm = async () => {
    const validItems = bulkParsedRows.filter((r) => r.isValid);
    if (validItems.length === 0) {
      alert('No valid rows found to import.');
      return;
    }
    setBulkUploading(true);
    try {
      const payload = validItems.map((item) => ({
        student_id: item.student_id,
        admission_number: item.admission_number,
        route_id: item.route_id,
        route_code: item.route_code,
        stop_id: item.stop_id,
        stop_name: item.stop_name,
        direction: item.direction,
        fee_amount: item.is_free ? null : item.fee_amount || null,
        fee_type: item.is_free ? null : item.fee_type || null,
        is_free: item.is_free,
        notes: item.notes,
      }));

      const res = await BusService.bulkAssignStudents({
        academic_year_id: academicYear.academic_year_id,
        assignments: payload,
      });

      const { insertedCount, updatedCount, errors } = res.data?.data || {};
      setShowBulkModal(false);
      setBulkFile(null);
      setBulkParsedRows([]);
      setBulkStats(null);

      setActionNotice({
        type: 'success',
        message: `Bulk import completed! ${insertedCount || 0} students assigned, ${updatedCount || 0} updated.${
          errors?.length ? ` (${errors.length} failed)` : ''
        }`,
      });
      loadData();
    } catch (err) {
      console.error('Bulk upload submission failed:', err);
      alert(err.response?.data?.message || 'Failed to complete bulk assignment import.');
    } finally {
      setBulkUploading(false);
    }
  };

  // ── Render Component ───────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* ── Notification Banner ────────────────────────────────────────────── */}
      {actionNotice && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: actionNotice.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${actionNotice.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: actionNotice.type === 'success' ? '#10b981' : '#f43f5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)',
            }}
          >
            <GraduationCap size={24} color="#818cf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Student Transport Roster
              </h1>
              <span className="badge badge-primary" style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                {academicYear?.name || 'Academic Session'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              Manage bus ridership rosters, assign boarding stops, and track pickup timings.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
            title="Reload Roster"
            style={{ height: '40px', gap: '6px' }}
          >
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => handleExport(false)}
            disabled={loading || assignments.length === 0}
            style={{ height: '40px', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export Roster</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setBulkFile(null);
              setBulkParsedRows([]);
              setBulkStats(null);
              setShowBulkModal(true);
            }}
            style={{ height: '40px', gap: '6px', borderColor: 'rgba(99, 102, 241, 0.35)', color: 'var(--primary)' }}
          >
            <Upload size={14} />
            <span>Bulk Upload</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ height: '40px', gap: '6px', boxShadow: 'var(--shadow-glow)' }}
          >
            <Plus size={16} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* ── Top Stats Cards Grid ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Total Rostered */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{stats.active}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Active Riders ({stats.total} total)
            </div>
          </div>
        </div>

        {/* Morning Riders */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sunrise size={20} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{stats.morningRiders}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Morning Pickup
            </div>
          </div>
        </div>

        {/* Evening Drop */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sunset size={20} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{stats.eveningRiders}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Evening Drop
            </div>
          </div>
        </div>

        {/* Two-Way Riders */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeftRight size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{stats.bothWays}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Two-Way Commuters
            </div>
          </div>
        </div>

        {/* Fee Waivers */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BadgePercent size={20} color="#06b6d4" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{stats.freeWaivers}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Fee Waivers / Free
            </div>
          </div>
        </div>

        {/* Active Routes */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bus size={20} color="#f43f5e" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{stats.activeRoutes} / {routes.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
              Active Bus Routes
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Quick Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="input-field"
              placeholder="Search by student, adm no, phone, parent…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Route Filter */}
          <select
            className="input-field"
            value={filterRoute}
            onChange={(e) => {
              setFilterRoute(e.target.value);
              setFilterStop(''); // Reset stop filter when route changes
            }}
            style={{ height: '38px', flex: '0 1 180px', fontSize: '13px' }}
          >
            <option value="">All Routes ({routes.length})</option>
            {routes.map((r) => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_code} — {r.route_name}
              </option>
            ))}
          </select>

          {/* Stop Filter (Dynamic) */}
          <select
            className="input-field"
            value={filterStop}
            onChange={(e) => setFilterStop(e.target.value)}
            style={{ height: '38px', flex: '0 1 180px', fontSize: '13px' }}
          >
            <option value="">All Stops</option>
            {filterAvailableStops.map((s, idx) => (
              <option key={s.stop_id || idx} value={s.stop_id}>
                {s.sequence_order ? `${s.sequence_order}. ` : ''}{s.stop_name}
              </option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            className="input-field"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{ height: '38px', flex: '0 1 150px', fontSize: '13px' }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.class_id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Direction Filter */}
          <select
            className="input-field"
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            style={{ height: '38px', flex: '0 1 140px', fontSize: '13px' }}
          >
            <option value="">All Directions</option>
            <option value="both">Both Ways</option>
            <option value="morning">Morning Only</option>
            <option value="evening">Evening Only</option>
          </select>

          {/* Status Filter */}
          <select
            className="input-field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ height: '38px', flex: '0 1 130px', fontSize: '13px' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="on_leave">On Leave Only</option>
          </select>

          {/* Fee / Scholarship Filter */}
          <select
            className="input-field"
            value={filterFee}
            onChange={(e) => setFilterFee(e.target.value)}
            style={{ height: '38px', flex: '0 1 140px', fontSize: '13px' }}
          >
            <option value="">All Fees</option>
            <option value="paid">Paid Riders</option>
            <option value="free">Fee Waiver / Free</option>
          </select>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              className="btn btn-ghost"
              onClick={clearAllFilters}
              style={{
                height: '38px',
                fontSize: '12px',
                color: 'var(--accent-rose)',
                padding: '0 10px',
                gap: '4px',
              }}
            >
              <X size={14} /> Clear ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Multi-Select Batch Actions Floating Bar ────────────────────────── */}
      {selectedIds.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(30, 41, 59, 0.95) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            animation: 'slideUp 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              {selectedIds.length}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                {selectedIds.length} student{selectedIds.length !== 1 ? 's' : ''} selected
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Apply actions to all selected passengers
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Batch Move Route/Stop */}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setBatchMoveRoute('');
                setBatchMoveStop('');
                setBatchMoveStops([]);
                setShowBatchMoveModal(true);
              }}
              style={{ gap: '6px' }}
            >
              <Bus size={13} /> Change Route & Stop
            </button>

            {/* Set Active */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleBatchStatus('active')}
              style={{ gap: '5px', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}
            >
              <CheckCircle size={13} /> Set Active
            </button>

            {/* Set Inactive */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleBatchStatus('inactive')}
              style={{ gap: '5px', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
            >
              <UserX size={13} /> Set Inactive
            </button>

            {/* Unassign */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleBatchUnassign}
              style={{ gap: '5px' }}
            >
              <UserX size={13} /> Unassign
            </button>

            {/* Permanent Delete */}
            <button
              className="btn btn-danger btn-sm"
              onClick={handleBatchDeletePermanent}
              style={{ gap: '5px' }}
            >
              <Trash2 size={13} /> Remove
            </button>

            {/* Export Selected */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport(true)}
              style={{ gap: '5px' }}
            >
              <Download size={13} /> Export Selected
            </button>

            {/* Deselect All */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds([])}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} /> Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ── Table & Passenger Roster ────────────────────────────────────────── */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        
        {/* Table count banner */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--text-muted)',
            background: 'var(--table-header-bg)',
          }}
        >
          <div>
            Showing <strong>{filteredAssignments.length}</strong> of <strong>{assignments.length}</strong> total passenger{assignments.length !== 1 ? 's' : ''}
            {activeFiltersCount > 0 && <span style={{ color: 'var(--primary)', marginLeft: 6 }}>• Filtered</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px' }}>
            <span>Click any student row to view complete travel profile</span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                {/* Select All Checkbox */}
                <th style={{ width: '44px', padding: '12px 14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--primary)' }}
                  >
                    {isAllSelected ? (
                      <CheckSquare size={17} color="var(--primary)" />
                    ) : isIndeterminate ? (
                      <MinusSquare size={17} color="var(--primary)" />
                    ) : (
                      <Square size={17} color="var(--text-muted)" />
                    )}
                  </button>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Student
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Class
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Route
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Boarding Stop & Timings
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Direction
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Parent / Phone
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Transport Fee
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading student transport roster…</div>
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <UserX size={32} style={{ marginBottom: '12px', opacity: 0.6 }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      No rostered students found
                    </div>
                    <p style={{ fontSize: '12px', marginTop: '4px', maxWidth: '380px', margin: '6px auto 16px' }}>
                      {activeFiltersCount > 0
                        ? 'Try loosening your filter criteria or search query to find students.'
                        : 'No students have been assigned to bus routes for this academic year yet.'}
                    </p>
                    {activeFiltersCount > 0 ? (
                      <button className="btn btn-secondary btn-sm" onClick={clearAllFilters}>
                        Clear All Filters
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddModal}
                      >
                        <Plus size={14} /> Assign First Student
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const isSelected = selectedIds.includes(a.assignment_id);
                  const fullName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                  const initials = `${a.first_name?.[0] || ''}${a.last_name?.[0] || ''}`.toUpperCase() || 'ST';

                  return (
                    <tr
                      key={a.assignment_id}
                      onClick={() => setActiveStudent(a)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--table-row-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Checkbox */}
                      <td
                        style={{ padding: '12px 14px', textAlign: 'center' }}
                        onClick={(e) => toggleSelectRow(a.assignment_id, e)}
                      >
                        {isSelected ? (
                          <CheckSquare size={17} color="var(--primary)" />
                        ) : (
                          <Square size={17} color="var(--text-muted)" />
                        )}
                      </td>

                      {/* Student Info */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800,
                              color: 'var(--primary)',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {a.admission_number}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600 }}>{a.class_name || '—'}</span>{' '}
                        <span style={{ color: 'var(--text-muted)' }}>{a.section_name || ''}</span>
                      </td>

                      {/* Route */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                            }}
                          >
                            {a.route_code}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {a.route_name}
                          </span>
                        </div>
                      </td>

                      {/* Boarding Stop & Timings */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <MapPin size={13} color="var(--primary)" />
                          <span>{a.stop_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {a.morning_time && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Sunrise size={10} color="#f59e0b" /> {fmtTime(a.morning_time)}
                            </span>
                          )}
                          {a.evening_time && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Sunset size={10} color="#a78bfa" /> {fmtTime(a.evening_time)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Direction */}
                      <td style={{ padding: '12px 14px' }}>
                        <DirectionBadge direction={a.direction} />
                      </td>

                      {/* Parent Phone */}
                      <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {a.father_name || 'Parent / Guardian'}
                        </div>
                        {a.guardian_phone || a.phone ? (
                          <a
                            href={`tel:${a.guardian_phone || a.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              marginTop: '2px',
                            }}
                          >
                            <Phone size={11} /> {a.guardian_phone || a.phone}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No phone</span>
                        )}
                      </td>

                      {/* Transport Fee */}
                      <td style={{ padding: '12px 14px' }}>
                        {a.is_free ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            FREE / WAIVER
                          </span>
                        ) : a.fee_amount ? (
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{a.fee_amount}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '3px' }}>
                              /{a.fee_type === 'annual' ? 'yr' : 'mo'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <AssignmentStatusBadge status={a.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}
                            title="View Student Details"
                            onClick={() => setActiveStudent(a)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', color: 'var(--primary)' }}
                            title="Edit Assignment"
                            onClick={(e) => handleOpenEdit(a, e)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', color: 'var(--accent-rose)' }}
                            title="Unassign / Deactivate"
                            onClick={(e) => handleUnassignSingle(a.assignment_id, false, e)}
                          >
                            <UserX size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STUDENT INFO CARD DRAWER / MODAL (WHEN CLICKING ON ANY ROW)
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeStudent && (
        <Modal
          isOpen={!!activeStudent}
          onClose={() => {
            setActiveStudent(null);
            setShowTransitPass(false);
          }}
          title="Passenger Travel Profile"
          subtitle={`Admission No: ${activeStudent.admission_number}`}
          width="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Student Top Summary Card */}
            <div
              className="glass-card"
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(30, 41, 59, 0.7) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {`${activeStudent.first_name?.[0] || ''}${activeStudent.last_name?.[0] || ''}`.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                    {activeStudent.first_name} {activeStudent.last_name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                      {activeStudent.class_name ? `Class ${activeStudent.class_name} ${activeStudent.section_name || ''}` : 'No Class Assigned'}
                    </span>
                    {activeStudent.gender && (
                      <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                        {activeStudent.gender.toUpperCase()}
                      </span>
                    )}
                    {activeStudent.blood_group && (
                      <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                        🩸 {activeStudent.blood_group}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <AssignmentStatusBadge status={activeStudent.status} />
              </div>
            </div>

            {/* Travel Route & Stop Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
                🚌 Bus & Route Details
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* Route Info */}
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Route</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                      }}
                    >
                      {activeStudent.route_code}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {activeStudent.route_name}
                    </span>
                  </div>
                </div>

                {/* Boarding Stop */}
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Boarding Stop</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: 700, fontSize: '13px' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span>{activeStudent.stop_name}</span>
                  </div>
                  {activeStudent.landmark && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Near {activeStudent.landmark}
                    </div>
                  )}
                </div>

                {/* Pickup & Drop Times */}
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timings & Service</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Sunrise size={11} color="#f59e0b" /> Morning Pickup
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                        {fmtTime(activeStudent.morning_time)}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 26, background: 'var(--border-subtle)' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Sunset size={11} color="#a78bfa" /> Evening Drop
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px' }}>
                        {fmtTime(activeStudent.evening_time)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direction */}
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Travel Direction</div>
                  <div style={{ marginTop: '6px' }}>
                    <DirectionBadge direction={activeStudent.direction} />
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle & Driver Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-amber)' }}>
                🚐 Fleet & Driver Contact
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* Vehicle */}
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Bus</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '4px', color: 'var(--text-primary)' }}>
                    {activeStudent.vehicle_number || 'Vehicle not assigned'}
                  </div>
                  {activeStudent.vehicle_name && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {activeStudent.vehicle_name} {activeStudent.vehicle_type ? `(${activeStudent.vehicle_type.replace('_', ' ')})` : ''}
                    </div>
                  )}
                </div>

                {/* Driver Contact with Call Link */}
                <div className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bus Driver</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '4px' }}>
                    {activeStudent.driver_first_name ? `${activeStudent.driver_first_name} ${activeStudent.driver_last_name || ''}` : 'Driver not assigned'}
                  </div>
                  {activeStudent.driver_phone ? (
                    <a
                      href={`tel:${activeStudent.driver_phone}`}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '8px', gap: '6px', fontSize: '11px', width: 'fit-content' }}
                    >
                      <Phone size={12} color="#10b981" /> Call Driver ({activeStudent.driver_phone})
                    </a>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>No phone recorded</div>
                  )}
                </div>
              </div>
            </div>

            {/* Parent & Emergency Contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-emerald)' }}>
                👨‍👩‍👧 Guardian & Residence Contact
              </div>
              <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Guardian / Parent</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                      {activeStudent.father_name || 'Primary Guardian'}
                      {activeStudent.guardian_relation && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
                          ({activeStudent.guardian_relation})
                        </span>
                      )}
                    </div>
                  </div>

                  {activeStudent.guardian_phone || activeStudent.phone ? (
                    <a
                      href={`tel:${activeStudent.guardian_phone || activeStudent.phone}`}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '6px', fontSize: '12px' }}
                    >
                      <Phone size={13} /> Call Parent ({activeStudent.guardian_phone || activeStudent.phone})
                    </a>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No parent phone on file</span>
                  )}
                </div>

                {(activeStudent.address || activeStudent.area) && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>Home Address:</strong> {activeStudent.address || ''} {activeStudent.area ? `(${activeStudent.area})` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Transport Fee Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-cyan)' }}>
                💳 Transport Billing
              </div>
              <div className="glass-card" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agreed Transport Fee</div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {activeStudent.is_free ? (
                      <span style={{ color: '#10b981' }}>Fee Waiver (Scholarship / 100% Free)</span>
                    ) : activeStudent.fee_amount ? (
                      `₹${activeStudent.fee_amount} (${activeStudent.fee_type === 'annual' ? 'Annual Fee' : 'Monthly Fee'})`
                    ) : (
                      'No fee assigned'
                    )}
                  </div>
                </div>

                {activeStudent.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    <strong>Notes:</strong> {activeStudent.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Transit Pass Toggle */}
            {showTransitPass && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                  border: '2px dashed rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bus size={18} color="#818cf8" />
                    <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em', color: '#fff' }}>
                      {school?.name?.toUpperCase() || 'SAARTHI EDEX'} · TRANSIT PASS
                    </span>
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '10px' }}>VALID FOR {academicYear?.name}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                      {activeStudent.first_name} {activeStudent.last_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Adm: {activeStudent.admission_number} • Class: {activeStudent.class_name} {activeStudent.section_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>
                      Route: {activeStudent.route_code} — Stop: {activeStudent.stop_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pickup: {fmtTime(activeStudent.morning_time)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Drop: {fmtTime(activeStudent.evening_time)}</div>
                    <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700, marginTop: '4px' }}>
                      Bus: {activeStudent.vehicle_number || 'FLEET'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Action Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px',
                marginTop: '4px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowTransitPass(!showTransitPass)}
                  style={{ gap: '6px' }}
                >
                  <Printer size={13} /> {showTransitPass ? 'Hide Pass' : 'Transit Pass'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => handleOpenEdit(activeStudent, e)}
                  style={{ gap: '6px', color: 'var(--primary)' }}
                >
                  <Edit2 size={13} /> Edit Plan
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => handleUnassignSingle(activeStudent.assignment_id, false, e)}
                  style={{ gap: '6px' }}
                >
                  <UserX size={13} /> Unassign
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setActiveStudent(null);
                    setShowTransitPass(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD SINGLE STUDENT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Assign Student to Bus Route"
        subtitle={`Academic Year: ${academicYear?.name}`}
        width="600px"
      >
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ── Admission Number Based Student Lookup ── */}
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={14} color="var(--primary)" />
                Student Admission Number *
              </span>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                Press [Enter ↵] to search
              </span>
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  className="input-field"
                  placeholder="Enter admission number (e.g. ADM-001) & press Enter…"
                  value={admissionInput}
                  onChange={(e) => {
                    setAdmissionInput(e.target.value);
                    if (!e.target.value.trim()) {
                      setLookedUpStudent(null);
                      setLookupError(null);
                      setForm((prev) => ({ ...prev, student_id: '' }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupAdmission();
                    }
                  }}
                  autoFocus
                  style={{
                    paddingLeft: '36px',
                    height: '42px',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                />
                {admissionInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdmissionInput('');
                      setLookedUpStudent(null);
                      setLookupError(null);
                      setForm((prev) => ({ ...prev, student_id: '' }));
                    }}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleLookupAdmission()}
                disabled={lookupLoading || !admissionInput.trim()}
                style={{ height: '42px', padding: '0 16px', gap: '6px', whiteSpace: 'nowrap', fontWeight: 700 }}
              >
                {lookupLoading ? (
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Search size={14} />
                )}
                <span>Find Student</span>
              </button>
            </div>

            <div
              style={{
                marginTop: '4px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Type admission number and press Enter to instantly fetch student profile
            </div>
          </div>

          {/* Lookup Error Alert */}
          {lookupError && (
            <div
              className="animate-fade-in"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Student Basic Details Confirmation Card (When Found) */}
          {lookedUpStudent && (
            <div
              className="animate-fade-in"
              style={{
                padding: '16px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-glass)',
                borderLeft: '4px solid var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: 'var(--shadow-sm), 0 4px 16px rgba(0, 0, 0, 0.06)',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {`${lookedUpStudent.first_name?.[0] || ''}${lookedUpStudent.last_name?.[0] || ''}`.toUpperCase() || 'ST'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
                      {lookedUpStudent.first_name} {lookedUpStudent.last_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: 'var(--primary)',
                          fontWeight: 700,
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          padding: '1px 7px',
                          borderRadius: '5px',
                        }}
                      >
                        Adm: {lookedUpStudent.admission_number}
                      </span>
                      {lookedUpStudent.gender && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-subtle-box)',
                            border: '1px solid var(--border-subtle)',
                            padding: '1px 6px',
                            borderRadius: '5px',
                          }}
                        >
                          {lookedUpStudent.gender}
                        </span>
                      )}
                      {lookedUpStudent.blood_group && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#e11d48',
                            background: 'rgba(225, 29, 72, 0.08)',
                            border: '1px solid rgba(225, 29, 72, 0.2)',
                            padding: '1px 6px',
                            borderRadius: '5px',
                          }}
                        >
                          🩸 {lookedUpStudent.blood_group}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#059669',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '3px 10px',
                      borderRadius: '20px',
                    }}
                  >
                    <CheckCircle2 size={13} /> Student Verified
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLookedUpStudent(null);
                      setAdmissionInput('');
                      setForm((prev) => ({ ...prev, student_id: '' }));
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                    title="Clear and search another student"
                  >
                    ✕ Change
                  </button>
                </div>
              </div>

              {/* 4 Details in a Clean Unboxed Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '14px 20px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                {/* 1. Class & Division */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <BookOpen size={12} color="var(--primary)" /> Class & Division
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                    {lookedUpStudent.class_name
                      ? `${lookedUpStudent.class_name} ${lookedUpStudent.section_name ? '(Div ' + lookedUpStudent.section_name + ')' : ''}`
                      : '—'}
                  </div>
                </div>

                {/* 2. Place / Locality */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <MapPin size={12} color="#f59e0b" /> Place / Locality
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px' }}>
                    {lookedUpStudent.area || lookedUpStudent.address || '—'}
                  </div>
                </div>

                {/* 3. Guardian Name */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <User size={12} color="#10b981" /> Guardian Name
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px' }}>
                    {lookedUpStudent.father_name || '—'}
                    {lookedUpStudent.guardian_relation && (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: 5, fontWeight: 500 }}>
                        ({lookedUpStudent.guardian_relation})
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Contact Phone */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Phone size={12} color="#06b6d4" /> Contact Phone
                  </div>
                  <div style={{ marginTop: '3px' }}>
                    {lookedUpStudent.guardian_phone || lookedUpStudent.phone ? (
                      <a
                        href={`tel:${lookedUpStudent.guardian_phone || lookedUpStudent.phone}`}
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {lookedUpStudent.guardian_phone || lookedUpStudent.phone}
                      </a>
                    ) : (
                      <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Already Assigned Alert */}
              {existingAssignmentNotice && (
                <div
                  style={{
                    padding: '9px 13px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.09)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '12px',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Currently Assigned:</strong> Already on Route <strong>{existingAssignmentNotice.route_code}</strong> at Stop <strong>"{existingAssignmentNotice.stop_name}"</strong>. Submitting will update their transport route.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Route & Stop Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Bus Route *</label>
              <select
                className="input-field"
                value={form.route_id}
                onChange={(e) => handleModalRouteChange(e.target.value)}
                required
              >
                <option value="">— Select Route —</option>
                {routes
                  .filter((r) => r.status === 'active')
                  .map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.route_code} — {r.route_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Boarding Stop *</label>
              <select
                className="input-field"
                value={form.stop_id}
                onChange={(e) => setForm({ ...form, stop_id: e.target.value })}
                disabled={!form.route_id}
                required
              >
                <option value="">{form.route_id ? '— Select Boarding Stop —' : 'Select a route first'}</option>
                {modalStops.map((st) => (
                  <option key={st.stop_id} value={st.stop_id}>
                    {st.sequence_order}. {st.stop_name}
                    {st.morning_time ? ` (${fmtTime(st.morning_time)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Stop Times Preview */}
          {form.stop_id && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
              }}
            >
              {(() => {
                const s = modalStops.find((x) => x.stop_id === form.stop_id);
                return s ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sunrise size={13} color="#f59e0b" /> Morning Pickup: <strong>{fmtTime(s.morning_time)}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sunset size={13} color="#a78bfa" /> Evening Drop: <strong>{fmtTime(s.evening_time)}</strong>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
          )}

          {/* Direction Selector */}
          <div className="input-group">
            <label className="input-label">Service Direction</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { id: 'both', label: 'Both Ways', sub: 'Pickup + Drop' },
                { id: 'morning', label: 'Morning Only', sub: 'Pickup Only' },
                { id: 'evening', label: 'Evening Only', sub: 'Drop Only' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setForm({ ...form, direction: d.id })}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: form.direction === d.id ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                    background: form.direction === d.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                    color: form.direction === d.id ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>{d.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fee & Waiver Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Transport Fee (₹)</label>
              <input
                className="input-field"
                type="number"
                placeholder="0"
                value={form.fee_amount}
                onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                disabled={form.is_free}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Fee Billing Schedule</label>
              <select
                className="input-field"
                value={form.fee_type}
                onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                disabled={form.is_free}
              >
                <option value="monthly">Monthly Fee</option>
                <option value="annual">Annual Fee</option>
              </select>
            </div>
          </div>

          {/* Fee Waiver Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 0',
            }}
          >
            <input
              type="checkbox"
              checked={form.is_free}
              onChange={(e) =>
                setForm({
                  ...form,
                  is_free: e.target.checked,
                  fee_amount: e.target.checked ? '' : form.fee_amount,
                })
              }
            />
            <span style={{ fontWeight: 600 }}>Fee Waiver / Transport Scholarship (No Charge)</span>
          </label>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">Notes & Instructions</label>
            <input
              className="input-field"
              placeholder="e.g. Needs front seat, parent will wait at gate"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddModal(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ gap: '6px' }}
            >
              {saving ? 'Assigning…' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          EDIT ASSIGNMENT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAssignment(null);
        }}
        title="Edit Transport Assignment"
        subtitle={editingAssignment ? `${editingAssignment.first_name} ${editingAssignment.last_name} (${editingAssignment.admission_number})` : ''}
        width="580px"
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Route & Stop */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Route *</label>
              <select
                className="input-field"
                value={form.route_id}
                onChange={(e) => handleModalRouteChange(e.target.value)}
                required
              >
                {routes.map((r) => (
                  <option key={r.route_id} value={r.route_id}>
                    {r.route_code} — {r.route_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Boarding Stop *</label>
              <select
                className="input-field"
                value={form.stop_id}
                onChange={(e) => setForm({ ...form, stop_id: e.target.value })}
                required
              >
                {modalStops.map((st) => (
                  <option key={st.stop_id} value={st.stop_id}>
                    {st.sequence_order}. {st.stop_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Direction */}
          <div className="input-group">
            <label className="input-label">Service Direction</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { id: 'both', label: 'Both Ways' },
                { id: 'morning', label: 'Morning Only' },
                { id: 'evening', label: 'Evening Only' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setForm({ ...form, direction: d.id })}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: form.direction === d.id ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                    background: form.direction === d.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                    color: form.direction === d.id ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fee & Waiver */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Transport Fee (₹)</label>
              <input
                className="input-field"
                type="number"
                value={form.fee_amount}
                onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                disabled={form.is_free}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Fee Billing Schedule</label>
              <select
                className="input-field"
                value={form.fee_type}
                onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                disabled={form.is_free}
              >
                <option value="monthly">Monthly Fee</option>
                <option value="annual">Annual Fee</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_free}
              onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
            />
            <span style={{ fontWeight: 600 }}>Fee Waiver / Transport Scholarship</span>
          </label>

          {/* Status */}
          <div className="input-group">
            <label className="input-label">Roster Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          {/* Notes */}
          <div className="input-group">
            <label className="input-label">Notes</label>
            <input
              className="input-field"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowEditModal(false);
                setEditingAssignment(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          BATCH REASSIGN ROUTE & STOP MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showBatchMoveModal}
        onClose={() => setShowBatchMoveModal(false)}
        title="Batch Reassign Route & Stop"
        subtitle={`Moving ${selectedIds.length} selected student(s)`}
        width="520px"
      >
        <form onSubmit={handleBatchMoveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Choose the target route and boarding stop to move all <strong>{selectedIds.length}</strong> selected students simultaneously.
          </p>

          <div className="input-group">
            <label className="input-label">Target Route *</label>
            <select
              className="input-field"
              value={batchMoveRoute}
              onChange={(e) => handleBatchMoveRouteChange(e.target.value)}
              required
            >
              <option value="">— Select Target Route —</option>
              {routes
                .filter((r) => r.status === 'active')
                .map((r) => (
                  <option key={r.route_id} value={r.route_id}>
                    {r.route_code} — {r.route_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Target Boarding Stop *</label>
            <select
              className="input-field"
              value={batchMoveStop}
              onChange={(e) => setBatchMoveStop(e.target.value)}
              disabled={!batchMoveRoute}
              required
            >
              <option value="">{batchMoveRoute ? '— Select Target Stop —' : 'Select a route first'}</option>
              {batchMoveStops.map((st) => (
                <option key={st.stop_id} value={st.stop_id}>
                  {st.sequence_order}. {st.stop_name}
                  {st.morning_time ? ` (${fmtTime(st.morning_time)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowBatchMoveModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !batchMoveRoute || !batchMoveStop}
            >
              {saving ? 'Reassigning…' : `Reassign ${selectedIds.length} Students`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          BULK UPLOAD MODAL WITH EXCEL PARSER & VALIDATION PREVIEW
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkFile(null);
          setBulkParsedRows([]);
          setBulkStats(null);
        }}
        title="Bulk Upload Passenger Roster"
        subtitle="Import students to bus routes using an Excel or CSV spreadsheet"
        width="760px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Top Instructions & Sample Download */}
          <div
            className="glass-card"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                Download Formatted Excel Template
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Pre-filled with existing Route Codes and Stop Names for easy copy-pasting.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadSampleTemplate}
              style={{ gap: '6px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              <Download size={13} /> Download Template (.xlsx)
            </button>
          </div>

          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--border-glass)',
              background: 'var(--bg-subtle-box)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-glass)')}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              onChange={handleBulkFileChange}
            />
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
              {bulkFile ? bulkFile.name : 'Click to select or drag & drop spreadsheet'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Supports .xlsx, .xls, and .csv files up to 10MB
            </div>
          </div>

          {/* Validation Summary Bar */}
          {bulkStats && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: bulkStats.invalid > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${bulkStats.invalid > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span>Total Rows: <strong>{bulkStats.total}</strong></span>
              <span>•</span>
              <span style={{ color: '#10b981' }}>Valid to Import: <strong>{bulkStats.valid}</strong></span>
              {bulkStats.invalid > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: '#f43f5e' }}>Invalid / Errors: <strong>{bulkStats.invalid}</strong> (will be skipped)</span>
                </>
              )}
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {bulkParsedRows.length > 0 && (
            <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface-elevated)', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Row</th>
                    <th style={{ padding: '8px 10px' }}>Student</th>
                    <th style={{ padding: '8px 10px' }}>Adm No</th>
                    <th style={{ padding: '8px 10px' }}>Route</th>
                    <th style={{ padding: '8px 10px' }}>Stop</th>
                    <th style={{ padding: '8px 10px' }}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkParsedRows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: row.isValid ? 'transparent' : 'rgba(244, 63, 94, 0.05)',
                      }}
                    >
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>#{row.rowIndex}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.student_name}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{row.admission_number}</td>
                      <td style={{ padding: '8px 10px' }}>{row.route_code || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>{row.stop_name || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {row.isValid ? (
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>✓ Ready</span>
                        ) : (
                          <span className="badge badge-rose" style={{ fontSize: '10px' }} title={row.errors.join(', ')}>
                            ⚠ {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Footer */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowBulkModal(false);
                setBulkFile(null);
                setBulkParsedRows([]);
              }}
              disabled={bulkUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBulkUploadConfirm}
              disabled={bulkUploading || !bulkStats || bulkStats.valid === 0}
              style={{ gap: '6px' }}
            >
              {bulkUploading ? 'Importing…' : `Confirm & Import ${bulkStats ? bulkStats.valid : 0} Students`}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
