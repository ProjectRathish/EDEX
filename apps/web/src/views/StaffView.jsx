import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users2, 
  Search, 
  Plus, 
  Upload,
  FileSpreadsheet,
  Edit2, 
  Trash2, 
  User, 
  Tag, 
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Crown,
  Shield,
  GraduationCap,
  Briefcase,
  Star,
  BookOpen,
  UserCheck,
  LayoutGrid,
  List,
  Award,
  Building2,
  Filter,
  Layers,
  Calendar,
  Sparkles,
  Clock,
  ArrowRight,
  Check,
  Settings2,
  Bookmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StaffService } from '../services/api';

// ─── Safe Date Helper Functions ───────────────────────────────────────────────
const toInputDate = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date) {
    try { return val.toISOString().split('T')[0]; } catch { return ''; }
  }
  return String(val).split('T')[0];
};

const formatDisplayDate = (val) => {
  if (!val) return '—';
  try {
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return String(val);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(val);
  }
};

// ─── Reusable Multi-Select Dropdown Component ─────────────────────────────────
function MultiSelectDropdown({ 
  label, 
  options = [], 
  selected = [], 
  onChange, 
  icon: Icon, 
  placeholder = 'All',
  alignRight = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!filterText.trim()) return options;
    const q = filterText.toLowerCase();
    return options.filter((o) => o.label?.toLowerCase().includes(q) || o.subLabel?.toLowerCase().includes(q));
  }, [options, filterText]);

  const handleToggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const match = options.find((o) => o.value === selected[0]);
      return match ? match.label : placeholder;
    }
    return `${label} (${selected.length})`;
  }, [selected, options, label, placeholder]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 100 : 1 }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '40px',
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          background: selected.length > 0 ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
          border: selected.length > 0 ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
          color: selected.length > 0 ? 'var(--primary)' : 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: selected.length > 0 ? 700 : 500,
          cursor: 'pointer',
          transition: 'var(--transition-fast)',
        }}
      >
        {Icon && <Icon size={14} color={selected.length > 0 ? 'var(--primary)' : 'var(--text-muted)'} />}
        <span>{displayText}</span>
        {selected.length > 0 && (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '10px',
              marginLeft: '2px',
            }}
            title="Clear filter"
          >
            ×
          </span>
        )}
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(alignRight ? { right: 0 } : { left: 0 }),
            zIndex: 99999,
            minWidth: '240px',
            maxWidth: '340px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(99, 102, 241, 0.2)',
            padding: '8px',
          }}
        >
          {/* Quick Filter Search */}
          {options.length > 6 && (
            <div style={{ marginBottom: '6px', position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder={`Search ${label}...`}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{ height: '30px', fontSize: '11px', padding: '4px 8px' }}
                autoFocus
              />
            </div>
          )}

          {/* Quick Actions (Select All / Clear) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '4px',
            fontSize: '11px',
          }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleSelectAll}
              style={{ fontSize: '11px', padding: '2px 4px', color: 'var(--primary)' }}
            >
              Select All
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClearAll}
              style={{ fontSize: '11px', padding: '2px 4px', color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          </div>

          {/* Options Checkbox List */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value);
                const ItemIcon = opt.icon;
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: isChecked ? 'var(--primary)' : 'var(--text-primary)',
                      background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      fontWeight: isChecked ? 600 : 400,
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    {ItemIcon && (
                      <ItemIcon size={13} color={opt.color || (isChecked ? 'var(--primary)' : 'var(--text-muted)')} style={{ flexShrink: 0 }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
                      {opt.subLabel && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{opt.subLabel}</span>}
                    </div>
                    {opt.count !== undefined && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isChecked ? 'var(--primary)' : 'var(--text-muted)',
                        background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        minWidth: '18px',
                        textAlign: 'center',
                        flexShrink: 0
                      }}>
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main StaffView Component ─────────────────────────────────────────────────
export default function StaffView({ 
  staff = [], 
  refreshData, 
  classes = [], 
  academicYear = null, 
  academicYears = [] 
}) {
  // Search & Multi-Select Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]); // 'Teaching', 'Non-Teaching', etc.
  const [selectedDepartments, setSelectedDepartments] = useState([]); // 'Academics', 'Administration', etc.
  const [selectedDesignations, setSelectedDesignations] = useState([]); // 'Mentor in English', etc.
  const [selectedRoles, setSelectedRoles] = useState([]); // 'Principal', 'Vice Principal', etc.
  const [selectedClasses, setSelectedClasses] = useState([]); // class_id
  const [selectedGenders, setSelectedGenders] = useState([]); // 'male', 'female', etc.
  const [selectedStatuses, setSelectedStatuses] = useState([]); // 'active', 'inactive', 'resigned'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  // ─── Main View Tab (Directory vs Teaching Assignments) ──────────────────────
  const [activeMainTab, setActiveMainTab] = useState('directory'); // 'directory' | 'teaching_assignments'

  // ─── Academic & Teaching Assignments State ─────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const [assignSelectedClass, setAssignSelectedClass] = useState('all');
  const [assignStatusFilter, setAssignStatusFilter] = useState('all'); // 'all', 'needs_in_charge', 'missing_asst', 'fully_assigned'
  const [assignViewMode, setAssignViewMode] = useState('by_class'); // 'by_class' | 'by_teacher'

  // Class Academic Assignment Modal State
  const [showClassAssignModal, setShowClassAssignModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null); // { class_id, section_id, class_name, section_name, key }
  const [modalClassTeacherId, setModalClassTeacherId] = useState('');
  const [modalAsstTeacherId, setModalAsstTeacherId] = useState('');
  const [modalSubjects, setModalSubjects] = useState([]); // [ { id, subject_name, staff_id } ]
  const [modalCustomSubject, setModalCustomSubject] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch Assignments
  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const res = await StaffService.listAssignments({ academic_year_id: academicYear?.academic_year_id });
      setAssignments(res.data?.data || []);
    } catch (err) {
      console.error('Error loading staff assignments:', err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [academicYear?.academic_year_id]);

  // Teaching staff members only
  const teachingStaff = useMemo(() => {
    return (staff || []).filter((s) => (s.category || 'Teaching') === 'Teaching');
  }, [staff]);

  // Flattened divisions from classes
  const allDivisions = useMemo(() => {
    const list = [];
    (classes || []).forEach((c) => {
      if (c.sections && c.sections.length > 0) {
        c.sections.forEach((sec) => {
          list.push({
            class_id: c.class_id,
            class_name: c.name,
            numeric_order: c.numeric_order || 0,
            section_id: sec.section_id,
            section_name: sec.name,
            max_strength: sec.max_strength,
            key: `${c.class_id}_${sec.section_id}`
          });
        });
      } else {
        list.push({
          class_id: c.class_id,
          class_name: c.name,
          numeric_order: c.numeric_order || 0,
          section_id: null,
          section_name: 'All',
          key: `${c.class_id}_null`
        });
      }
    });
    return list.sort((a, b) => (a.numeric_order - b.numeric_order) || a.class_name.localeCompare(b.class_name) || a.section_name.localeCompare(b.section_name));
  }, [classes]);

  // Grouped assignments map by class_id and section_id
  const assignmentsByDivision = useMemo(() => {
    const map = {};
    (assignments || []).forEach((asgn) => {
      const key = `${asgn.class_id}_${asgn.section_id || 'null'}`;
      if (!map[key]) {
        map[key] = {
          classTeacher: null,
          assistantTeacher: null,
          subjects: []
        };
      }
      if (asgn.role_in_class === 'class_teacher') {
        map[key].classTeacher = asgn;
      } else if (asgn.role_in_class === 'assistant_class_teacher') {
        map[key].assistantTeacher = asgn;
      } else if (asgn.role_in_class === 'subject_teacher' || asgn.subject_name) {
        map[key].subjects.push(asgn);
      }
    });
    return map;
  }, [assignments]);

  // Teacher Workload Map (teaching staff -> duties)
  const teacherWorkloads = useMemo(() => {
    const map = {};
    (teachingStaff || []).forEach((t) => {
      map[t.staff_id] = {
        teacher: t,
        classInCharge: [],
        assistantInCharge: [],
        subjects: []
      };
    });

    (assignments || []).forEach((asgn) => {
      if (map[asgn.staff_id]) {
        if (asgn.role_in_class === 'class_teacher') {
          map[asgn.staff_id].classInCharge.push(asgn);
        } else if (asgn.role_in_class === 'assistant_class_teacher') {
          map[asgn.staff_id].assistantInCharge.push(asgn);
        } else if (asgn.role_in_class === 'subject_teacher' || asgn.subject_name) {
          map[asgn.staff_id].subjects.push(asgn);
        }
      }
    });

    return Object.values(map);
  }, [teachingStaff, assignments]);

  // Filtered Divisions for Academic Assignments tab
  const filteredDivisions = useMemo(() => {
    return allDivisions.filter((div) => {
      const key = div.key;
      const data = assignmentsByDivision[key] || { classTeacher: null, assistantTeacher: null, subjects: [] };

      // 1. Search filter
      if (assignSearchTerm.trim()) {
        const q = assignSearchTerm.toLowerCase();
        const fullClassName = `${div.class_name} ${div.section_name}`.toLowerCase();
        const ctName = `${data.classTeacher?.first_name || ''} ${data.classTeacher?.last_name || ''} ${data.classTeacher?.short_name || ''}`.toLowerCase();
        const actName = `${data.assistantTeacher?.first_name || ''} ${data.assistantTeacher?.last_name || ''} ${data.assistantTeacher?.short_name || ''}`.toLowerCase();
        const subMatch = data.subjects.some((s) => 
          (s.subject_name || '').toLowerCase().includes(q) ||
          `${s.first_name || ''} ${s.last_name || ''} ${s.short_name || ''}`.toLowerCase().includes(q)
        );

        const matches = fullClassName.includes(q) || ctName.includes(q) || actName.includes(q) || subMatch;
        if (!matches) return false;
      }

      // 2. Class filter
      if (assignSelectedClass !== 'all' && div.class_id !== assignSelectedClass) {
        return false;
      }

      // 3. Status filter
      if (assignStatusFilter === 'needs_in_charge' && !!data.classTeacher) return false;
      if (assignStatusFilter === 'missing_asst' && !!data.assistantTeacher) return false;
      if (assignStatusFilter === 'fully_assigned' && (!data.classTeacher || !data.assistantTeacher || data.subjects.length === 0)) return false;

      return true;
    });
  }, [allDivisions, assignmentsByDivision, assignSearchTerm, assignSelectedClass, assignStatusFilter]);

  // Filtered Teacher Workloads
  const filteredTeacherWorkloads = useMemo(() => {
    if (!assignSearchTerm.trim()) return teacherWorkloads;
    const q = assignSearchTerm.toLowerCase();
    return teacherWorkloads.filter((item) => {
      const t = item.teacher;
      const name = `${t.first_name || ''} ${t.last_name || ''} ${t.short_name || ''} ${t.employee_id || ''} ${t.designation || ''}`.toLowerCase();
      const inCharge = item.classInCharge.some((c) => `${c.class_name || ''} ${c.section_name || ''}`.toLowerCase().includes(q));
      const subs = item.subjects.some((s) => `${s.subject_name || ''} ${s.class_name || ''}`.toLowerCase().includes(q));
      return name.includes(q) || inCharge || subs;
    });
  }, [teacherWorkloads, assignSearchTerm]);

  // Open Class Assignment Modal
  const handleOpenClassAssign = (div) => {
    setEditingDivision(div);
    const key = div.key;
    const current = assignmentsByDivision[key] || { classTeacher: null, assistantTeacher: null, subjects: [] };

    setModalClassTeacherId(current.classTeacher?.staff_id || '');
    setModalAsstTeacherId(current.assistantTeacher?.staff_id || '');
    setModalSubjects(
      (current.subjects || []).map((s) => ({
        id: s.assignment_id || `temp_${Math.random()}`,
        subject_name: s.subject_name || '',
        staff_id: s.staff_id || ''
      }))
    );
    setModalCustomSubject('');
    setModalError('');
    setShowClassAssignModal(true);
  };

  // Save Class Assignment Modal
  const handleSaveClassAssign = async (e) => {
    e.preventDefault();
    if (!editingDivision) return;
    setModalSaving(true);
    setModalError('');
    try {
      await StaffService.saveClassAssignments({
        academic_year_id: academicYear?.academic_year_id,
        class_id: editingDivision.class_id,
        section_id: editingDivision.section_id,
        class_teacher_id: modalClassTeacherId || null,
        assistant_class_teacher_id: modalAsstTeacherId || null,
        subject_assignments: modalSubjects.filter((s) => s.subject_name && s.staff_id)
      });
      setShowClassAssignModal(false);
      await fetchAssignments();
      refreshData();
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.message || 'Failed to save assignments.');
    } finally {
      setModalSaving(false);
    }
  };

  // Preset subject list for quick 1-click addition
  const PRESET_SUBJECTS = [
    'English',
    'Mathematics',
    'Science',
    'Social Science',
    'Arabic',
    'Malayalam',
    'Hindi',
    'IT & Computer Science',
    'Physical Education',
    'Moral Science',
    'Art & Craft',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Commerce'
  ];

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // 25, 50, 100, 250, 'all'

  // Batch Selection States
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Single Staff Add / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Single Staff Form Data
  const initialFormState = {
    employee_id: '',
    short_name: '',
    first_name: '',
    last_name: '',
    designation: 'Mentor in English',
    category: 'Teaching',
    leadership_role: '',
    department: 'Academics',
    date_of_birth: '',
    gender: 'female',
    blood_group: 'O+',
    date_of_joining: toInputDate(new Date()),
    phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    status: 'active',
    class_id: '',
    section_id: '',
    role_in_class: 'class_teacher',
    academic_year_id: academicYear?.academic_year_id || '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Bulk Upload Modal States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [upsertExisting, setUpsertExisting] = useState(true);
  const fileInputRef = useRef(null);

  // Single Delete Confirmation State
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detail View Drawer / Modal State
  const [viewingStaff, setViewingStaff] = useState(null);

  // Clear selections if staff list changes meaningfully
  useEffect(() => {
    setSelectedStaffIds((prev) => prev.filter((id) => staff.some((s) => s.staff_id === id)));
  }, [staff]);

  // Standardized Leadership / Role list
  const LEADERSHIP_ROLES = [
    { value: 'Principal', label: 'Principal', icon: Crown, color: '#f59e0b' },
    { value: 'Vice Principal', label: 'Vice Principal', icon: Shield, color: '#8b5cf6' },
    { value: 'Section Head LP', label: 'Section Head LP (Lower Primary)', icon: Star, color: '#10b981' },
    { value: 'Section Head UP', label: 'Section Head UP (Upper Primary)', icon: Star, color: '#06b6d4' },
    { value: 'Section Head HS', label: 'Section Head HS (High School)', icon: Star, color: '#3b82f6' },
    { value: 'Section Head HSS', label: 'Section Head HSS (Higher Secondary)', icon: Star, color: '#6366f1' },
    { value: 'Section Head KG', label: 'Section Head KG (Kindergarten)', icon: Star, color: '#ec4899' },
    { value: 'Class Teacher', label: 'Class Teacher', icon: GraduationCap, color: '#6366f1' },
    { value: 'Assistant Class Teacher', label: 'Assistant Class Teacher', icon: UserCheck, color: '#14b8a6' },
    { value: 'Subject Teacher', label: 'Subject Teacher', icon: BookOpen, color: '#64748b' },
    { value: 'Coordinator', label: 'Coordinator', icon: Award, color: '#f97316' },
  ];

  // ─── Dynamic Filter Options from Actual Staff Data ──────────────────────────
  const categoryOptions = useMemo(() => {
    const counts = {};
    (staff || []).forEach((s) => {
      const cat = s.category || 'Teaching';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const baseCats = ['Teaching', 'Non-Teaching', 'Administrative', 'Support'];
    const allKeys = Array.from(new Set([...baseCats, ...Object.keys(counts)]));
    return allKeys.map((c) => ({
      value: c,
      label: c === 'Teaching' ? 'Teaching Faculty' : (c === 'Non-Teaching' ? 'Non-Teaching Staff' : c),
      subLabel: c === 'Teaching' ? 'Teachers & Mentors' : (c === 'Non-Teaching' ? 'Admin, Drivers, Ayas' : undefined),
      count: counts[c] || 0,
    })).filter((opt) => opt.count > 0 || baseCats.includes(opt.value));
  }, [staff]);

  const departmentOptions = useMemo(() => {
    const counts = {};
    (staff || []).forEach((s) => {
      if (s.department && String(s.department).trim()) {
        const d = String(s.department).trim();
        counts[d] = (counts[d] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => ({
        value: dept,
        label: dept,
        count,
      }));
  }, [staff]);

  const designationOptions = useMemo(() => {
    const counts = {};
    (staff || []).forEach((s) => {
      if (s.designation && String(s.designation).trim()) {
        const des = String(s.designation).trim();
        counts[des] = (counts[des] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([des, count]) => ({
        value: des,
        label: des,
        count,
      }));
  }, [staff]);

  const roleOptions = useMemo(() => {
    const counts = {};
    (staff || []).forEach((s) => {
      const r = s.leadership_role || s.role_in_class || (s.class_id ? 'Class Teacher' : '');
      if (r) counts[r] = (counts[r] || 0) + 1;
    });
    return LEADERSHIP_ROLES.map((r) => ({
      value: r.value,
      label: r.label,
      icon: r.icon,
      color: r.color,
      count: counts[r.value] || 0,
    })).filter((opt) => opt.count > 0 || ['Principal', 'Vice Principal', 'Class Teacher', 'Assistant Class Teacher'].includes(opt.value));
  }, [staff]);

  const classOptions = useMemo(() => {
    const counts = {};
    (staff || []).forEach((s) => {
      if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1;
    });
    return (classes || []).map((c) => ({
      value: c.class_id,
      label: c.name,
      subLabel: `${c.sections?.length || 0} divisions`,
      count: counts[c.class_id] || 0,
    }));
  }, [classes, staff]);

  const genderOptions = useMemo(() => {
    let m = 0, f = 0, o = 0;
    (staff || []).forEach((s) => {
      const g = (s.gender || 'other').toLowerCase();
      if (g.startsWith('m')) m++;
      else if (g.startsWith('f')) f++;
      else o++;
    });
    return [
      { value: 'female', label: 'Female', count: f },
      { value: 'male', label: 'Male', count: m },
      ...(o > 0 ? [{ value: 'other', label: 'Other', count: o }] : [])
    ];
  }, [staff]);

  const statusOptions = useMemo(() => {
    let act = 0, inact = 0, res = 0;
    (staff || []).forEach((s) => {
      const st = (s.status || 'active').toLowerCase();
      if (st === 'active') act++;
      else if (st === 'inactive') inact++;
      else if (st === 'resigned') res++;
    });
    return [
      { value: 'active', label: 'Active', count: act },
      { value: 'inactive', label: 'Inactive', count: inact },
      { value: 'resigned', label: 'Resigned', count: res },
    ];
  }, [staff]);

  // Download Excel Template Function matching StaffList.xlsx structure
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Sl.No.': '1',
        'ShortName': 'SEJU',
        'Name': 'SEJJAD T',
        'Code': 'NT003/500',
        'Designation': 'Superintendent',
        'Categoty': 'Non-Teaching',
        'DOB': '30/May/1984',
        'Mobile No.': '9946701512',
        'Gender': 'M',
        'Phone No': '8075219023',
        'Department': 'Administration',
        'Leadership Role': ''
      },
      {
        'Sl.No.': '2',
        'ShortName': 'RK',
        'Name': 'RATHISH K',
        'Code': 'NT009/147',
        'Designation': 'IT Support',
        'Categoty': 'Non-Teaching',
        'DOB': '29/May/1982',
        'Mobile No.': '9037339764',
        'Gender': 'M',
        'Phone No': '7034702450',
        'Department': 'IT Department',
        'Leadership Role': ''
      },
      {
        'Sl.No.': '3',
        'ShortName': 'MK',
        'Name': 'MUBASHIRATH KARUVATHINGAL',
        'Code': 'TR0021/490922',
        'Designation': 'Mentor in English',
        'Categoty': 'Teaching',
        'DOB': '19/Nov/1985',
        'Mobile No.': '8075426686',
        'Gender': 'F',
        'Phone No': '9995235416',
        'Department': 'English',
        'Leadership Role': 'Class Teacher'
      },
      {
        'Sl.No.': '4',
        'ShortName': 'VP',
        'Name': 'ANIL KUMAR M',
        'Code': 'TR0010/100201',
        'Designation': 'Senior Mentor',
        'Categoty': 'Teaching',
        'DOB': '15/Jan/1978',
        'Mobile No.': '9847123456',
        'Gender': 'M',
        'Phone No': '9847654321',
        'Department': 'Academics',
        'Leadership Role': 'Vice Principal'
      },
      {
        'Sl.No.': '5',
        'ShortName': 'SH',
        'Name': 'SARITHA R',
        'Code': 'TR0050/300400',
        'Designation': 'Mentor in Science',
        'Categoty': 'Teaching',
        'DOB': '10/Mar/1986',
        'Mobile No.': '9447112233',
        'Gender': 'F',
        'Phone No': '9447332211',
        'Department': 'Science',
        'Leadership Role': 'Section Head UP'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff List');
    XLSX.writeFile(wb, 'Staff_Import_Template.xlsx');
  };

  // Export Staff Directory to Excel
  const handleExportStaff = (exportList = null) => {
    const dataToExport = exportList || filteredStaff;
    if (dataToExport.length === 0) {
      alert('No staff members available to export.');
      return;
    }

    const rows = dataToExport.map((st, idx) => ({
      'Sl.No.': idx + 1,
      'Employee Code': st.employee_id || '',
      'Short Name': st.short_name || '',
      'Full Name': `${st.first_name || ''} ${st.last_name || ''}`.trim(),
      'Designation': st.designation || '',
      'Category': st.category || 'Teaching',
      'Leadership Role': st.leadership_role || st.role_in_class || '',
      'Assigned Class': st.class_name ? `${st.class_name} - ${st.section_name || ''}` : '',
      'Department': st.department || '',
      'Gender': (st.gender || '').toUpperCase(),
      'Date of Birth': formatDisplayDate(st.date_of_birth),
      'Mobile No': st.phone || '',
      'Secondary Phone': st.secondary_phone || '',
      'Email': st.email || '',
      'Address': st.address || '',
      'Date of Joining': formatDisplayDate(st.date_of_joining),
      'Status': st.status || 'active'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty & Staff');
    XLSX.writeFile(wb, `Staff_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Comprehensive Filter Logic
  const filteredStaff = useMemo(() => {
    return (staff || []).filter((st) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const fullName = `${st.first_name || ''} ${st.last_name || ''}`.toLowerCase();
        const shortName = (st.short_name || '').toLowerCase();
        const empCode = (st.employee_id || '').toLowerCase();
        const desig = (st.designation || '').toLowerCase();
        const dept = (st.department || '').toLowerCase();
        const phone = (st.phone || '').toLowerCase();
        const secPhone = (st.secondary_phone || '').toLowerCase();
        const email = (st.email || '').toLowerCase();
        const role = (st.leadership_role || st.role_in_class || '').toLowerCase();
        const className = (st.class_name || '').toLowerCase();
        const address = (st.address || '').toLowerCase();

        const matchesSearch = 
          fullName.includes(q) ||
          shortName.includes(q) ||
          empCode.includes(q) ||
          desig.includes(q) ||
          dept.includes(q) ||
          phone.includes(q) ||
          secPhone.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          className.includes(q) ||
          address.includes(q);

        if (!matchesSearch) return false;
      }

      // 2. Category Filter
      if (selectedCategories.length > 0) {
        const cat = st.category || 'Teaching';
        if (!selectedCategories.includes(cat)) return false;
      }

      // 3. Department Filter
      if (selectedDepartments.length > 0) {
        const dept = (st.department || '').trim();
        if (!selectedDepartments.includes(dept)) return false;
      }

      // 4. Designation Filter
      if (selectedDesignations.length > 0) {
        const des = (st.designation || '').trim();
        if (!selectedDesignations.includes(des)) return false;
      }

      // 5. Leadership / Role Filter
      if (selectedRoles.length > 0) {
        const staffRole = st.leadership_role || st.role_in_class || '';
        const hasMatchingRole = selectedRoles.some((r) => {
          if (r === 'Class Teacher') {
            return staffRole.toLowerCase().includes('class_teacher') || staffRole === 'Class Teacher' || !!st.class_id;
          }
          if (r === 'Assistant Class Teacher') {
            return staffRole.toLowerCase().includes('assistant') || staffRole === 'Assistant Class Teacher';
          }
          return staffRole.toLowerCase().includes(r.toLowerCase());
        });
        if (!hasMatchingRole) return false;
      }

      // 6. Gender Filter
      if (selectedGenders.length > 0) {
        const g = (st.gender || 'other').toLowerCase();
        const normG = g.startsWith('m') ? 'male' : (g.startsWith('f') ? 'female' : 'other');
        if (!selectedGenders.includes(normG)) return false;
      }

      // 7. Status Filter
      if (selectedStatuses.length > 0) {
        const s = (st.status || 'active').toLowerCase();
        if (!selectedStatuses.includes(s)) return false;
      }

      // 8. Class Filter
      if (selectedClasses.length > 0) {
        if (!st.class_id || !selectedClasses.includes(st.class_id)) return false;
      }

      return true;
    });
  }, [
    staff, 
    searchTerm, 
    selectedCategories, 
    selectedDepartments, 
    selectedDesignations, 
    selectedRoles, 
    selectedGenders, 
    selectedStatuses, 
    selectedClasses
  ]);

  // KPI Calculations
  const stats = useMemo(() => {
    let teachingCount = 0;
    let nonTeachingCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let classTeacherCount = 0;
    let leadershipCount = 0;

    (staff || []).forEach((s) => {
      const cat = (s.category || 'Teaching').toLowerCase();
      if (cat.includes('non')) {
        nonTeachingCount++;
      } else {
        teachingCount++;
      }

      const g = (s.gender || '').toLowerCase();
      if (g.startsWith('m') || g === 'male') maleCount++;
      else if (g.startsWith('f') || g === 'female') femaleCount++;

      const role = (s.leadership_role || s.role_in_class || '').toLowerCase();
      if (role.includes('class_teacher') || role === 'class teacher' || !!s.class_id) {
        classTeacherCount++;
      }
      if (role.includes('principal') || role.includes('section head') || role.includes('coordinator')) {
        leadershipCount++;
      }
    });

    return {
      total: (staff || []).length,
      teaching: teachingCount,
      nonTeaching: nonTeachingCount,
      male: maleCount,
      female: femaleCount,
      classTeachers: classTeacherCount,
      leadership: leadershipCount
    };
  }, [staff]);

  // Pagination Logic
  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(filteredStaff.length / pageSize) || 1;
  }, [filteredStaff.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedStaff = useMemo(() => {
    if (pageSize === 'all') return filteredStaff;
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  // Batch Selection Handlers
  const isAllVisibleSelected = useMemo(() => {
    if (paginatedStaff.length === 0) return false;
    return paginatedStaff.every((st) => selectedStaffIds.includes(st.staff_id));
  }, [paginatedStaff, selectedStaffIds]);

  const isSomeVisibleSelected = useMemo(() => {
    if (paginatedStaff.length === 0) return false;
    return paginatedStaff.some((st) => selectedStaffIds.includes(st.staff_id)) && !isAllVisibleSelected;
  }, [paginatedStaff, selectedStaffIds, isAllVisibleSelected]);

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(paginatedStaff.map((s) => s.staff_id));
      setSelectedStaffIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = paginatedStaff.map((s) => s.staff_id);
      setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedStaffIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open Single Add / Edit Form Modal
  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setFormData({
      ...initialFormState,
      class_id: classes?.[0]?.class_id || '',
      section_id: classes?.[0]?.sections?.[0]?.section_id || '',
      academic_year_id: academicYear?.academic_year_id || '',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEditModal = (st) => {
    setEditingStaffId(st.staff_id);
    setFormData({
      employee_id: st.employee_id || '',
      short_name: st.short_name || '',
      first_name: st.first_name || '',
      last_name: st.last_name || '',
      designation: st.designation || 'Mentor in English',
      category: st.category || 'Teaching',
      leadership_role: st.leadership_role || '',
      department: st.department || 'Academics',
      date_of_birth: toInputDate(st.date_of_birth),
      gender: st.gender || 'female',
      blood_group: st.blood_group || 'O+',
      date_of_joining: toInputDate(st.date_of_joining) || toInputDate(new Date()),
      phone: st.phone || '',
      secondary_phone: st.secondary_phone || '',
      email: st.email || '',
      address: st.address || '',
      status: st.status || 'active',
      class_id: st.class_id || '',
      section_id: st.section_id || '',
      role_in_class: st.role_in_class || st.leadership_role || 'class_teacher',
      academic_year_id: st.academic_year_id || academicYear?.academic_year_id || '',
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Submit Add / Edit Form
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (editingStaffId) {
        await StaffService.update(editingStaffId, formData);
      } else {
        await StaffService.create(formData);
      }
      setShowFormModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save staff record. Please check employee code uniqueness.');
    } finally {
      setFormLoading(false);
    }
  };

  // Single Delete Execution
  const handleExecuteSingleDelete = async () => {
    if (!deletingStaff) return;
    setDeleteLoading(true);
    try {
      await StaffService.delete(deletingStaff.staff_id);
      setDeletingStaff(null);
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete staff member.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk Delete Execution
  const handleExecuteBulkDelete = async () => {
    if (selectedStaffIds.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      await StaffService.bulkDelete(selectedStaffIds);
      setSelectedStaffIds([]);
      setShowBulkDeleteModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to bulk delete staff members.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Bulk Upload File Handler (Excel / CSV)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkError('');
    setBulkSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          setBulkError('The uploaded sheet is empty.');
          setParsedRows([]);
          setBulkPreview([]);
          return;
        }

        setParsedRows(jsonData);
        setBulkPreview(jsonData.slice(0, 8));
      } catch (err) {
        console.error(err);
        setBulkError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Bulk Upload
  const handleExecuteBulkUpload = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      setBulkError('Please select a valid Excel file first.');
      return;
    }

    setBulkLoading(true);
    setBulkError('');
    setBulkSuccess(null);

    try {
      const res = await StaffService.bulkUpload(parsedRows, upsertExisting);
      setBulkSuccess(res.data?.message || `Successfully processed ${parsedRows.length} staff records.`);
      refreshData();
      setTimeout(() => {
        if (!bulkError) {
          setShowBulkModal(false);
          setBulkFile(null);
          setParsedRows([]);
          setBulkPreview([]);
        }
      }, 1800);
    } catch (err) {
      console.error(err);
      setBulkError(err.response?.data?.message || 'Failed to upload staff records. Please check the Excel format.');
    } finally {
      setBulkLoading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedDepartments([]);
    setSelectedDesignations([]);
    setSelectedRoles([]);
    setSelectedClasses([]);
    setSelectedGenders([]);
    setSelectedStatuses([]);
    setCurrentPage(1);
  };

  const totalActiveFilterCount = 
    (searchTerm.trim() ? 1 : 0) +
    selectedCategories.length +
    selectedDepartments.length +
    selectedDesignations.length +
    selectedRoles.length +
    selectedClasses.length +
    selectedGenders.length +
    selectedStatuses.length;

  const hasActiveFilters = totalActiveFilterCount > 0;

  // Render Role Badge Helper
  const renderRoleBadge = (st) => {
    const role = st.leadership_role || st.role_in_class;
    if (!role && !st.class_name) return null;

    if (role === 'Principal' || st.designation?.toLowerCase().includes('principal')) {
      return (
        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', gap: '4px' }}>
          <Crown size={12} />
          Principal
        </span>
      );
    }

    if (role === 'Vice Principal' || st.designation?.toLowerCase().includes('vice principal')) {
      return (
        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.3)', gap: '4px' }}>
          <Shield size={12} />
          Vice Principal
        </span>
      );
    }

    if (role && role.toLowerCase().includes('section head')) {
      return (
        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', gap: '4px' }}>
          <Star size={12} />
          {role}
        </span>
      );
    }

    if (st.class_name || role === 'Class Teacher' || role === 'class_teacher') {
      return (
        <span className="badge badge-primary" style={{ gap: '4px' }}>
          <GraduationCap size={12} />
          Class Teacher {st.class_name ? `(${st.class_name} - ${st.section_name || 'A'})` : ''}
        </span>
      );
    }

    if (role === 'Assistant Class Teacher' || role === 'assistant_class_teacher') {
      return (
        <span className="badge" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#0d9488', border: '1px solid rgba(20, 184, 166, 0.3)', gap: '4px' }}>
          <UserCheck size={12} />
          Asst. Class Teacher {st.class_name ? `(${st.class_name})` : ''}
        </span>
      );
    }

    if (role) {
      return (
        <span className="badge badge-secondary" style={{ gap: '4px' }}>
          <Tag size={12} />
          {role}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── Top Master Navigation: Directory vs Teaching & Academic Assignments ─── */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '6px 10px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('directory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeMainTab === 'directory' ? '1px solid var(--primary)' : '1px solid transparent',
              background: activeMainTab === 'directory' ? 'var(--primary)' : 'transparent',
              color: activeMainTab === 'directory' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              boxShadow: activeMainTab === 'directory' ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'
            }}
          >
            <Users2 size={16} />
            <span>Staff Directory</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '12px',
              background: activeMainTab === 'directory' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)',
              color: activeMainTab === 'directory' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {staff.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('teaching_assignments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: 'var(--radius-md)',
              border: activeMainTab === 'teaching_assignments' ? '1px solid var(--primary)' : '1px solid transparent',
              background: activeMainTab === 'teaching_assignments' ? 'var(--primary)' : 'transparent',
              color: activeMainTab === 'teaching_assignments' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              boxShadow: activeMainTab === 'teaching_assignments' ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'
            }}
          >
            <GraduationCap size={16} />
            <span>Teaching & Academic Assignments</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '12px',
              background: activeMainTab === 'teaching_assignments' ? 'rgba(255,255,255,0.25)' : 'rgba(99, 102, 241, 0.15)',
              color: activeMainTab === 'teaching_assignments' ? '#ffffff' : 'var(--primary)'
            }}>
              {teachingStaff.length} Faculty • {allDivisions.length} Divs
            </span>
          </button>
        </div>

        {academicYear && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Calendar size={14} color="var(--primary)" />
            <span>Academic Session: <strong style={{ color: 'var(--text-primary)' }}>{academicYear.name}</strong></span>
          </div>
        )}
      </div>

      {activeMainTab === 'directory' && (
        <>
          {/* ─── Top Header & Summary Stats ──────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)'
            }}>
              <Users2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>Faculty & Staff Directory</h1>
                <span className="badge badge-primary" style={{ fontSize: '12px', padding: '2px 8px' }}>
                  {filteredStaff.length} Members
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Manage teaching faculty, administrative staff, class teachers, section heads, and principal roles.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadTemplate}
            title="Download formatted Excel template for staff import"
          >
            <Download size={15} />
            <span>Download Template</span>
          </button>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowBulkModal(true)}
            title="Bulk import staff from Excel / CSV"
          >
            <Upload size={15} />
            <span>Bulk Upload (XLSX)</span>
          </button>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleExportStaff()}
            title="Export filtered directory to Excel"
          >
            <FileSpreadsheet size={15} />
            <span>Export</span>
          </button>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* ─── Metric KPI Badges Card ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
      }}>
        <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Staff</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Teaching Faculty</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)' }}>{stats.teaching}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Non-Teaching</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#06b6d4' }}>{stats.nonTeaching}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Leadership & Heads</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>{stats.leadership}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Gender (F / M)</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)' }}>{stats.female} / {stats.male}</div>
          </div>
        </div>
      </div>

      {/* ─── Search & Multi-Select Filters Bar ──────────────────────────────── */}
      <div className="glass-panel" style={{ position: 'relative', zIndex: 50, padding: '14px 18px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by name, short name, code, phone, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: '38px', height: '38px', fontSize: '13px' }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 1. Category Filter */}
          <MultiSelectDropdown
            label="Category"
            placeholder="All Categories"
            icon={Briefcase}
            options={categoryOptions}
            selected={selectedCategories}
            onChange={(val) => {
              setSelectedCategories(val);
              setCurrentPage(1);
            }}
          />

          {/* 2. Department Filter */}
          {departmentOptions.length > 0 && (
            <MultiSelectDropdown
              label="Department"
              placeholder="All Departments"
              icon={Building2}
              options={departmentOptions}
              selected={selectedDepartments}
              onChange={(val) => {
                setSelectedDepartments(val);
                setCurrentPage(1);
              }}
            />
          )}

          {/* 3. Designation Filter */}
          {designationOptions.length > 0 && (
            <MultiSelectDropdown
              label="Designation"
              placeholder="All Designations"
              icon={Tag}
              options={designationOptions}
              selected={selectedDesignations}
              onChange={(val) => {
                setSelectedDesignations(val);
                setCurrentPage(1);
              }}
            />
          )}

          {/* 4. Role & In-Charge Filter */}
          <MultiSelectDropdown
            label="Role & In-Charge"
            placeholder="All Roles"
            icon={Crown}
            options={roleOptions}
            selected={selectedRoles}
            onChange={(val) => {
              setSelectedRoles(val);
              setCurrentPage(1);
            }}
          />

          {/* 5. Assigned Class Filter */}
          {(classes || []).length > 0 && (
            <MultiSelectDropdown
              label="Assigned Class"
              placeholder="All Classes"
              icon={GraduationCap}
              options={classOptions}
              selected={selectedClasses}
              onChange={(val) => {
                setSelectedClasses(val);
                setCurrentPage(1);
              }}
            />
          )}

          {/* 6. Gender Filter */}
          <MultiSelectDropdown
            label="Gender"
            placeholder="All Genders"
            icon={User}
            options={genderOptions}
            selected={selectedGenders}
            onChange={(val) => {
              setSelectedGenders(val);
              setCurrentPage(1);
            }}
          />

          {/* 7. Status Filter */}
          <MultiSelectDropdown
            label="Status"
            placeholder="All Statuses"
            icon={ShieldCheck}
            options={statusOptions}
            selected={selectedStatuses}
            onChange={(val) => {
              setSelectedStatuses(val);
              setCurrentPage(1);
            }}
          />

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleResetFilters}
              style={{
                height: '38px',
                color: 'var(--accent-rose)',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '0 12px',
                borderRadius: 'var(--radius-md)',
              }}
              title="Reset all applied filters"
            >
              <X size={14} />
              <span>Reset ({totalActiveFilterCount})</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
              title="Card Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* ─── Active Filter Pills (Chips) ─────────────────────────────────── */}
        {hasActiveFilters && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            paddingTop: '8px',
            borderTop: '1px dashed var(--border-subtle)',
            fontSize: '12px'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Filtered by:
            </span>

            {searchTerm && (
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', border: '1px solid var(--primary)', gap: '6px', padding: '3px 8px' }}>
                <Search size={11} />
                <span>"{searchTerm}"</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
              </span>
            )}

            {selectedCategories.map((cat) => (
              <span key={cat} className="badge badge-secondary" style={{ gap: '6px', padding: '3px 8px' }}>
                <Briefcase size={11} />
                <span>{cat}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))} />
              </span>
            ))}

            {selectedDepartments.map((dept) => (
              <span key={dept} className="badge badge-secondary" style={{ gap: '6px', padding: '3px 8px' }}>
                <Building2 size={11} />
                <span>{dept}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedDepartments((prev) => prev.filter((d) => d !== dept))} />
              </span>
            ))}

            {selectedDesignations.map((des) => (
              <span key={des} className="badge badge-secondary" style={{ gap: '6px', padding: '3px 8px' }}>
                <Tag size={11} />
                <span>{des}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedDesignations((prev) => prev.filter((d) => d !== des))} />
              </span>
            ))}

            {selectedRoles.map((role) => (
              <span key={role} className="badge badge-primary" style={{ gap: '6px', padding: '3px 8px' }}>
                <Crown size={11} />
                <span>{role}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedRoles((prev) => prev.filter((r) => r !== role))} />
              </span>
            ))}

            {selectedClasses.map((cId) => {
              const cObj = (classes || []).find((c) => c.class_id === cId);
              return (
                <span key={cId} className="badge badge-secondary" style={{ gap: '6px', padding: '3px 8px' }}>
                  <GraduationCap size={11} />
                  <span>Class: {cObj?.name || cId}</span>
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedClasses((prev) => prev.filter((id) => id !== cId))} />
                </span>
              );
            })}

            {selectedGenders.map((g) => (
              <span key={g} className="badge badge-secondary" style={{ gap: '6px', padding: '3px 8px', textTransform: 'capitalize' }}>
                <User size={11} />
                <span>{g}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedGenders((prev) => prev.filter((item) => item !== g))} />
              </span>
            ))}

            {selectedStatuses.map((s) => (
              <span key={s} className="badge badge-secondary" style={{ gap: '6px', padding: '3px 8px', textTransform: 'capitalize' }}>
                <ShieldCheck size={11} />
                <span>{s}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatuses((prev) => prev.filter((item) => item !== s))} />
              </span>
            ))}

            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '11px',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginLeft: '6px',
                padding: '2px 4px'
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ─── Batch Operations Bar (When items are selected) ──────────────────── */}
      {selectedStaffIds.length > 0 && (
        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            padding: '10px 18px', 
            borderRadius: 'var(--radius-md)', 
            background: 'rgba(99, 102, 241, 0.1)', 
            border: '1px solid var(--primary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
              {selectedStaffIds.length} staff member{selectedStaffIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const selectedList = (staff || []).filter((s) => selectedStaffIds.includes(s.staff_id));
                handleExportStaff(selectedList);
              }}
            >
              <Download size={14} />
              <span>Export Selected ({selectedStaffIds.length})</span>
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedStaffIds.length})</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedStaffIds([])}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Content: Table View or Grid View ──────────────────────────── */}
      {filteredStaff.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users2 size={44} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No staff records found</h3>
          <p style={{ fontSize: '13px', maxWidth: '400px', margin: '4px auto 16px' }}>
            {hasActiveFilters 
              ? 'No staff members match the selected filters or search terms. Try clearing some filters.'
              : 'Enrol your faculty and non-teaching staff by clicking "Add Staff Member" or "Bulk Upload (XLSX)".'}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              Clear All Filters
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus size={15} /> Add First Staff Member
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* High-Density Modern Table View */
        <div className="glass-panel" style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle-box)', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ width: '40px', padding: '12px 14px' }}>
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeVisibleSelected; }}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px' }}>Staff Member & Code</th>
                  <th style={{ padding: '12px 14px' }}>Short Name</th>
                  <th style={{ padding: '12px 14px' }}>Category & Designation</th>
                  <th style={{ padding: '12px 14px' }}>Role / Class Assigned</th>
                  <th style={{ padding: '12px 14px' }}>Mobile & Contact</th>
                  <th style={{ padding: '12px 14px' }}>DOB / Gender</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((st) => {
                  const isSelected = selectedStaffIds.includes(st.staff_id);
                  return (
                    <tr 
                      key={st.staff_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                        transition: 'var(--transition-fast)',
                      }}
                      className="table-row-hover"
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(st.staff_id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Staff Avatar + Name + Employee Code */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: st.category === 'Non-Teaching' 
                              ? 'linear-gradient(135deg, #06b6d4, #0284c7)' 
                              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0
                          }}>
                            {st.short_name || st.first_name?.[0] || 'S'}
                          </div>
                          <div>
                            <div 
                              style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-heading)', cursor: 'pointer' }}
                              onClick={() => setViewingStaff(st)}
                            >
                              {st.first_name} {st.last_name}
                            </div>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {st.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Short Name */}
                      <td style={{ padding: '12px 14px' }}>
                        {st.short_name ? (
                          <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>
                            {st.short_name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      {/* Category & Designation */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {st.designation || 'Staff'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span className={`badge ${st.category === 'Non-Teaching' ? 'badge-cyan' : 'badge-emerald'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {st.category || 'Teaching'}
                          </span>
                          <span>{st.department || 'Academics'}</span>
                        </div>
                      </td>

                      {/* Role & Class Assignment */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {renderRoleBadge(st) || (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                          {st.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={12} color="var(--text-muted)" />
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{st.phone}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>No mobile</span>
                          )}
                          {st.secondary_phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700 }}>ALT:</span>
                              <span style={{ fontFamily: 'monospace' }}>{st.secondary_phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* DOB & Gender */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          {formatDisplayDate(st.date_of_birth)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {st.gender || 'Other'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${st.status === 'active' ? 'badge-emerald' : 'badge-secondary'}`} style={{ fontSize: '10px' }}>
                          {st.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => setViewingStaff(st)}
                            title="View Profile Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleOpenEditModal(st)}
                            title="Edit Staff Member"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ color: 'var(--accent-rose)' }}
                            onClick={() => setDeletingStaff(st)}
                            title="Delete Staff Member"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {paginatedStaff.map((st) => {
            const isSelected = selectedStaffIds.includes(st.staff_id);
            return (
              <div 
                key={st.staff_id}
                className="glass-panel animate-fade-in"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-surface)',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: st.category === 'Non-Teaching' 
                          ? 'linear-gradient(135deg, #06b6d4, #0284c7)' 
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '15px',
                        flexShrink: 0
                      }}>
                        {st.short_name || st.first_name?.[0] || 'S'}
                      </div>
                      <div>
                        <h3 
                          style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-heading)', cursor: 'pointer' }}
                          onClick={() => setViewingStaff(st)}
                        >
                          {st.first_name} {st.last_name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {st.employee_id}
                          </span>
                          {st.short_name && (
                            <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '0 4px', fontFamily: 'monospace' }}>
                              {st.short_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(st.staff_id)}
                      style={{ cursor: 'pointer', marginTop: '4px' }}
                    />
                  </div>

                  {/* Designation & Badges */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                      {st.designation || 'Staff Member'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span className={`badge ${st.category === 'Non-Teaching' ? 'badge-cyan' : 'badge-emerald'}`} style={{ fontSize: '10px' }}>
                        {st.category || 'Teaching'}
                      </span>
                      {renderRoleBadge(st)}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {st.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={13} color="var(--text-muted)" />
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{st.phone}</span>
                        {st.secondary_phone && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>/ {st.secondary_phone}</span>
                        )}
                      </div>
                    )}
                    {st.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={13} color="var(--text-muted)" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-muted)'
                }}>
                  <span>DOB: {formatDisplayDate(st.date_of_birth)}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setViewingStaff(st)}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleOpenEditModal(st)}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ color: 'var(--accent-rose)' }}
                      onClick={() => setDeletingStaff(st)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Pagination Controls ────────────────────────────────────────────── */}
      {filteredStaff.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', padding: '6px 0' }}>
          {/* Items per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Showing</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value="all">All ({filteredStaff.length})</option>
            </select>
            <span>of <strong>{filteredStaff.length}</strong> staff records</span>
          </div>

          {/* Page numbers navigation */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 8px', height: '32px' }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '12px', padding: '0 8px', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 8px', height: '32px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
      </>
    )}

    {/* ════════════════════════════════════════════════════════════════════════
        TAB 2: TEACHING & ACADEMIC ASSIGNMENTS VIEW
    ════════════════════════════════════════════════════════════════════════ */}
    {activeMainTab === 'teaching_assignments' && (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ─── Teaching Assignments Top Header ───────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
            }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>Teaching & Academic Assignments</h1>
                <span className="badge badge-primary" style={{ fontSize: '12px', padding: '2px 8px' }}>
                  {allDivisions.length} Divisions
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Assign Class In-Charge (Class Teacher), Assistant Class In-Charge, and Timetable Subject Teachers per class & division.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchAssignments}
              disabled={assignmentsLoading}
            >
              <Clock size={14} />
              <span>{assignmentsLoading ? 'Refreshing...' : 'Refresh Assignments'}</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (allDivisions.length > 0) handleOpenClassAssign(allDivisions[0]);
              }}
            >
              <Plus size={16} />
              <span>Assign Class Duties</span>
            </button>
          </div>
        </div>

        {/* ─── Academic KPI Summary Cards ───────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}>
          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Divisions</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)' }}>
                {allDivisions.length} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>({classes.length} Classes)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Class In-Charges</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
                {allDivisions.filter(d => !!assignmentsByDivision[d.key]?.classTeacher).length} / {allDivisions.length}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Asst. In-Charges</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#14b8a6' }}>
                {allDivisions.filter(d => !!assignmentsByDivision[d.key]?.assistantTeacher).length} / {allDivisions.length}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Subject Mappings</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6' }}>
                {assignments.filter(a => a.role_in_class === 'subject_teacher' || a.subject_name).length} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Subjects</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Teaching Faculty</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {teachingStaff.length} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Teachers</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Search & View Toolbar for Assignments ───────────────────────── */}
        <div className="glass-panel" style={{ position: 'relative', zIndex: 40, padding: '12px 18px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search class, section, teacher name, code, subject..."
                value={assignSearchTerm}
                onChange={(e) => setAssignSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              {assignSearchTerm && (
                <button
                  type="button"
                  onClick={() => setAssignSearchTerm('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter by Grade / Class */}
            <select
              className="input-field"
              value={assignSelectedClass}
              onChange={(e) => setAssignSelectedClass(e.target.value)}
              style={{ width: 'auto', minWidth: '150px', height: '38px', fontSize: '12px' }}
            >
              <option value="all">All Grades ({classes.length})</option>
              {(classes || []).map((c) => (
                <option key={c.class_id} value={c.class_id}>{c.name}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              className="input-field"
              value={assignStatusFilter}
              onChange={(e) => setAssignStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '160px', height: '38px', fontSize: '12px' }}
            >
              <option value="all">All Assignment Status</option>
              <option value="needs_in_charge">⚠️ Missing Class In-Charge</option>
              <option value="missing_asst">⚠️ Missing Asst. In-Charge</option>
              <option value="fully_assigned">✅ Fully Assigned</option>
            </select>
          </div>

          {/* View Mode Toggle: By Class vs By Teacher */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setAssignViewMode('by_class')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: assignViewMode === 'by_class' ? 'var(--primary)' : 'transparent',
                color: assignViewMode === 'by_class' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Layers size={14} />
              <span>By Class & Timetable</span>
            </button>
            <button
              type="button"
              onClick={() => setAssignViewMode('by_teacher')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: assignViewMode === 'by_teacher' ? 'var(--primary)' : 'transparent',
                color: assignViewMode === 'by_teacher' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Users2 size={14} />
              <span>By Teacher Workload</span>
            </button>
          </div>
        </div>

        {/* ─── View 1: By Class & Timetable Grid ────────────────────────────── */}
        {assignViewMode === 'by_class' && (
          filteredDivisions.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Layers size={44} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No classes match the filter</h3>
              <p style={{ fontSize: '13px', maxWidth: '400px', margin: '4px auto 16px' }}>
                Try clearing your search term or selecting another grade filter.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setAssignSearchTerm('');
                  setAssignSelectedClass('all');
                  setAssignStatusFilter('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '16px'
            }}>
              {filteredDivisions.map((div) => {
                const data = assignmentsByDivision[div.key] || { classTeacher: null, assistantTeacher: null, subjects: [] };
                const isFullyAssigned = !!data.classTeacher && !!data.assistantTeacher && data.subjects.length > 0;
                const hasNoInCharge = !data.classTeacher;

                return (
                  <div 
                    key={div.key} 
                    className="glass-panel animate-fade-in"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      border: hasNoInCharge ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-glass)',
                      background: hasNoInCharge ? 'rgba(245, 158, 11, 0.02)' : 'var(--bg-surface)'
                    }}
                  >
                    {/* Division Header */}
                    <div style={{
                      padding: '14px 16px',
                      background: 'var(--bg-subtle-box)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {div.class_name}
                        </span>
                        <span className="badge badge-primary" style={{ fontWeight: 800, fontSize: '12px' }}>
                          Division {div.section_name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isFullyAssigned ? (
                          <span className="badge badge-emerald" style={{ fontSize: '10px', gap: '4px' }}>
                            <Check size={11} /> Complete
                          </span>
                        ) : hasNoInCharge ? (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '10px' }}>
                            Needs In-Charge
                          </span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '10px' }}>
                            {data.subjects.length} Subjects
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenClassAssign(div)}
                          style={{ padding: '4px 8px', height: '28px', color: 'var(--primary)' }}
                          title="Edit Class Allocations"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* In-Charge Responsibilities */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      
                      {/* Class In-Charge (Class Teacher) */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: data.classTeacher ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                            color: data.classTeacher ? 'var(--primary)' : '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '11px',
                            flexShrink: 0
                          }}>
                            {data.classTeacher?.short_name || <Crown size={15} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Class In-Charge
                            </span>
                            {data.classTeacher ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {data.classTeacher.first_name} {data.classTeacher.last_name}
                                </strong>
                                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  {data.classTeacher.employee_id}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                                Not Assigned
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenClassAssign(div)}
                          style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--primary)', flexShrink: 0 }}
                        >
                          {data.classTeacher ? 'Change' : 'Assign'}
                        </button>
                      </div>

                      {/* Assistant Class In-Charge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: data.assistantTeacher ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: data.assistantTeacher ? '#14b8a6' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '11px',
                            flexShrink: 0
                          }}>
                            {data.assistantTeacher?.short_name || <UserCheck size={15} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Asst. Class In-Charge
                            </span>
                            {data.assistantTeacher ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {data.assistantTeacher.first_name} {data.assistantTeacher.last_name}
                                </strong>
                                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  {data.assistantTeacher.employee_id}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Not Assigned
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenClassAssign(div)}
                          style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--primary)', flexShrink: 0 }}
                        >
                          {data.assistantTeacher ? 'Change' : '+ Add'}
                        </button>
                      </div>

                    </div>

                    {/* Timetable Subject Allocations */}
                    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Timetable Subjects ({data.subjects.length})
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenClassAssign(div)}
                          style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--primary)' }}
                        >
                          + Add Subject
                        </button>
                      </div>

                      {data.subjects.length === 0 ? (
                        <div style={{
                          padding: '14px',
                          textAlign: 'center',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-subtle-box)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border-subtle)',
                          margin: 'auto 0'
                        }}>
                          No subject teachers assigned yet.
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenClassAssign(div)}
                              style={{ fontSize: '11px', padding: '3px 10px' }}
                            >
                              + Map Timetable Subjects
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                          {data.subjects.map((sub, idx) => (
                            <span 
                              key={sub.assignment_id || idx}
                              className="badge badge-secondary" 
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '11px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                              }}
                            >
                              <Bookmark size={11} color="var(--primary)" />
                              <strong>{sub.subject_name}:</strong>
                              <span>{sub.first_name} {sub.last_name}</span>
                              {sub.short_name && (
                                <span style={{ opacity: 0.7, fontFamily: 'monospace', fontSize: '9px' }}>
                                  ({sub.short_name})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div style={{
                      padding: '10px 16px',
                      background: 'var(--bg-subtle-box)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {div.max_strength ? `Max ${div.max_strength} students` : 'Standard Division'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenClassAssign(div)}
                        style={{ fontSize: '11px', padding: '4px 12px' }}
                      >
                        <Settings2 size={12} />
                        <span>Manage Class Duties</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ─── View 2: By Teacher Workload Matrix ───────────────────────────── */}
        {assignViewMode === 'by_teacher' && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px' }}>TEACHER & CODE</th>
                    <th style={{ minWidth: '100px' }}>INITIALS</th>
                    <th style={{ minWidth: '180px' }}>DESIGNATION & DEPT</th>
                    <th style={{ minWidth: '160px' }}>CLASS IN-CHARGE</th>
                    <th style={{ minWidth: '160px' }}>ASST. IN-CHARGE</th>
                    <th style={{ minWidth: '260px' }}>TIMETABLE SUBJECT ALLOCATIONS</th>
                    <th style={{ minWidth: '100px', textAlign: 'center' }}>TOTAL LOAD</th>
                    <th style={{ minWidth: '100px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeacherWorkloads.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No teaching faculty members match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTeacherWorkloads.map((item) => {
                      const t = item.teacher;
                      const totalDuties = item.classInCharge.length + item.assistantInCharge.length + item.subjects.length;

                      return (
                        <tr key={t.staff_id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '11px',
                                flexShrink: 0
                              }}>
                                {t.short_name || (t.first_name ? t.first_name[0] : 'T')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {t.first_name} {t.last_name}
                                </div>
                                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  {t.employee_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            {t.short_name ? (
                              <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>
                                {t.short_name}
                              </span>
                            ) : '—'}
                          </td>

                          <td>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--primary)' }}>
                              {t.designation || 'Teacher'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {t.department || 'Academics'}
                            </div>
                          </td>

                          <td>
                            {item.classInCharge.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {item.classInCharge.map((c) => (
                                  <span key={c.assignment_id} className="badge badge-primary" style={{ gap: '4px', fontSize: '11px' }}>
                                    <Crown size={11} />
                                    {c.class_name} {c.section_name ? `(${c.section_name})` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          <td>
                            {item.assistantInCharge.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {item.assistantInCharge.map((c) => (
                                  <span key={c.assignment_id} className="badge" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#0d9488', border: '1px solid rgba(20, 184, 166, 0.3)', gap: '4px', fontSize: '11px' }}>
                                    <UserCheck size={11} />
                                    {c.class_name} {c.section_name ? `(${c.section_name})` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          <td>
                            {item.subjects.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {item.subjects.map((sub) => (
                                  <span key={sub.assignment_id} className="badge badge-secondary" style={{ gap: '4px', fontSize: '11px' }}>
                                    <Bookmark size={10} color="var(--primary)" />
                                    <strong>{sub.subject_name}:</strong> {sub.class_name} {sub.section_name ? `(${sub.section_name})` : ''}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No subject classes assigned</span>
                            )}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${totalDuties > 0 ? 'badge-primary' : 'badge-secondary'}`} style={{ fontWeight: 800, fontSize: '12px' }}>
                              {totalDuties}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                if (allDivisions.length > 0) handleOpenClassAssign(allDivisions[0]);
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              Assign
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    )}

    {/* ════════════════════════════════════════════════════════════════════════
        MODALS & DRAWERS
    ════════════════════════════════════════════════════════════════════════ */}

    {/* ─── 0. Class Academic Assignment Modal ──────────────────────────────── */}
    {showClassAssignModal && editingDivision && createPortal(
      <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
        <div className="modal-content glass-panel" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          
          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}>
                <GraduationCap size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Academic & Timetable Assignment</h2>
                  <span className="badge badge-primary" style={{ fontSize: '12px', padding: '2px 8px' }}>
                    {editingDivision.class_name} • Division {editingDivision.section_name}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Assign Class Teacher, Assistant Class Teacher, and subject faculty for this division.
                </p>
              </div>
            </div>

            <button 
              type="button"
              className="btn-icon" 
              onClick={() => setShowClassAssignModal(false)}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {modalError && (
            <div className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-md)', width: '100%' }}>
              <AlertCircle size={16} />
              <span>{modalError}</span>
            </div>
          )}

          <form onSubmit={handleSaveClassAssign}>
            {/* ── Section 1: Class Leadership Responsibilities ── */}
            <div style={{
              background: 'var(--bg-subtle-box)',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={14} />
                <span>1. Class In-Charge & Leadership Duties</span>
              </div>

              <div className="grid-2" style={{ gap: '14px' }}>
                {/* Class In-Charge (Class Teacher) */}
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crown size={13} color="#f59e0b" />
                    <strong>Class In-Charge (Class Teacher)</strong>
                  </label>
                  <select
                    className="input-field"
                    value={modalClassTeacherId}
                    onChange={(e) => setModalClassTeacherId(e.target.value)}
                    style={{ height: '40px', fontSize: '13px' }}
                  >
                    <option value="">— Select Class Teacher —</option>
                    {teachingStaff.map((t) => (
                      <option key={t.staff_id} value={t.staff_id}>
                        {t.first_name} {t.last_name} ({t.short_name || t.employee_id}) — {t.designation || 'Teacher'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assistant Class In-Charge */}
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={13} color="#14b8a6" />
                    <strong>Assistant Class In-Charge</strong>
                  </label>
                  <select
                    className="input-field"
                    value={modalAsstTeacherId}
                    onChange={(e) => setModalAsstTeacherId(e.target.value)}
                    style={{ height: '40px', fontSize: '13px' }}
                  >
                    <option value="">— Optional Asst. Class Teacher —</option>
                    {teachingStaff.map((t) => (
                      <option key={t.staff_id} value={t.staff_id}>
                        {t.first_name} {t.last_name} ({t.short_name || t.employee_id}) — {t.designation || 'Teacher'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Timetable Subject Teacher Allocations ── */}
            <div style={{
              background: 'var(--bg-subtle-box)',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} />
                  <span>2. Timetable Subject Teachers ({modalSubjects.length} Assigned)</span>
                </div>
              </div>

              {/* Quick Add Preset Subject Buttons */}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  Quick Add Subjects from Timetable:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_SUBJECTS.map((subName) => {
                    const alreadyAdded = modalSubjects.some((s) => s.subject_name?.toLowerCase() === subName.toLowerCase());
                    return (
                      <button
                        key={subName}
                        type="button"
                        onClick={() => {
                          if (!alreadyAdded) {
                            // Smart auto-select teacher matching designation
                            const matchTeacher = teachingStaff.find((t) => 
                              t.designation?.toLowerCase().includes(subName.toLowerCase())
                            );
                            setModalSubjects([
                              ...modalSubjects,
                              {
                                id: `preset_${Math.random()}`,
                                subject_name: subName,
                                staff_id: matchTeacher?.staff_id || ''
                              }
                            ]);
                          }
                        }}
                        className={`badge ${alreadyAdded ? 'badge-primary' : 'badge-secondary'}`}
                        style={{
                          cursor: alreadyAdded ? 'default' : 'pointer',
                          padding: '5px 9px',
                          fontSize: '11px',
                          opacity: alreadyAdded ? 0.6 : 1,
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {alreadyAdded ? '✓' : '+'} {subName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Subject Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Or enter custom subject (e.g. Robotics, French, Accountancy)..."
                  value={modalCustomSubject}
                  onChange={(e) => setModalCustomSubject(e.target.value)}
                  style={{ height: '36px', fontSize: '12px', flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (modalCustomSubject.trim()) {
                      setModalSubjects([
                        ...modalSubjects,
                        {
                          id: `custom_${Math.random()}`,
                          subject_name: modalCustomSubject.trim(),
                          staff_id: ''
                        }
                      ]);
                      setModalCustomSubject('');
                    }
                  }}
                  disabled={!modalCustomSubject.trim()}
                  style={{ height: '36px', padding: '0 14px' }}
                >
                  <Plus size={14} /> Add Subject
                </button>
              </div>

              {/* Subject Allocations Table */}
              <div style={{ marginTop: '8px' }}>
                {modalSubjects.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                    No subjects added yet. Click any quick subject pill above or type a custom subject name.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {modalSubjects.map((sub, idx) => (
                      <div 
                        key={sub.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ width: '24px', textAlign: 'center', fontWeight: 700, fontSize: '11px', color: 'var(--text-muted)' }}>
                          #{idx + 1}
                        </div>

                        {/* Subject Name Input */}
                        <div style={{ width: '180px' }}>
                          <input
                            type="text"
                            className="input-field"
                            value={sub.subject_name}
                            onChange={(e) => {
                              const next = [...modalSubjects];
                              next[idx].subject_name = e.target.value;
                              setModalSubjects(next);
                            }}
                            placeholder="Subject Name"
                            style={{ height: '34px', fontSize: '12px', fontWeight: 700 }}
                          />
                        </div>

                        {/* Assigned Teacher Selector */}
                        <div style={{ flex: 1 }}>
                          <select
                            className="input-field"
                            value={sub.staff_id}
                            onChange={(e) => {
                              const next = [...modalSubjects];
                              next[idx].staff_id = e.target.value;
                              setModalSubjects(next);
                            }}
                            style={{ height: '34px', fontSize: '12px' }}
                            required
                          >
                            <option value="">— Select Subject Teacher —</option>
                            {teachingStaff.map((t) => {
                              const isRecommended = t.designation?.toLowerCase().includes(sub.subject_name.toLowerCase());
                              return (
                                <option key={t.staff_id} value={t.staff_id}>
                                  {isRecommended ? '⭐ ' : ''}{t.first_name} {t.last_name} ({t.short_name || t.employee_id}) — {t.designation || 'Teacher'}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Delete Subject Row Button */}
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => {
                            setModalSubjects(modalSubjects.filter((_, sIdx) => sIdx !== idx));
                          }}
                          style={{ color: 'var(--accent-rose)', padding: '6px' }}
                          title="Remove this subject"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowClassAssignModal(false)}
                disabled={modalSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={modalSaving}
              >
                {modalSaving ? 'Saving Allocations...' : 'Save Class Allocations'}
              </button>
            </div>
          </form>

        </div>
      </div>,
      document.body
    )}

      {/* ─── 1. Single Add / Edit Staff Modal ───────────────────────────────── */}
      {showFormModal && createPortal(
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
                  {editingStaffId ? 'Edit Staff Member' : 'Enrol Faculty & Staff Member'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Manage identity, designation, department, and leadership assignments.
                </p>
              </div>
              <button 
                type="button"
                className="btn-icon" 
                onClick={() => setShowFormModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff}>
              {/* Section 1: Basic Information */}
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                1. Basic Profile & Identity
              </div>
              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="input-group">
                  <label className="input-label">First Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="e.g. MUBASHIRATH"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Last Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="e.g. KARUVATHINGAL"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-3" style={{ marginBottom: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Employee Code / ID *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="e.g. TR0021/490922"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Short Name / Alias</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. MK, SEJU"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Gender</label>
                  <select
                    className="input-field"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: '20px' }}>
                <div className="input-group">
                  <label className="input-label">Date of Birth</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Blood Group</label>
                  <select
                    className="input-field"
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Employment & Category */}
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                2. Employment & Designation
              </div>
              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Category *</label>
                  <select
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Teaching">Teaching Faculty</option>
                    <option value="Non-Teaching">Non-Teaching Staff</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Support">Support Staff</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Designation *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="e.g. Mentor in English, Superintendent"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-3" style={{ marginBottom: '20px' }}>
                <div className="input-group">
                  <label className="input-label">Department</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. English, Science, IT"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Date of Joining</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.date_of_joining}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="resigned">Resigned</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Leadership & Class Teacher Role */}
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                3. Leadership & Academic Responsibilities
              </div>
              <div className="grid-2" style={{ marginBottom: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Role in School</label>
                  <select
                    className="input-field"
                    value={formData.leadership_role}
                    onChange={(e) => setFormData({ ...formData, leadership_role: e.target.value, role_in_class: e.target.value })}
                  >
                    <option value="">None (Standard Faculty / Staff)</option>
                    <option value="Principal">Principal</option>
                    <option value="Vice Principal">Vice Principal</option>
                    <option value="Section Head LP">Section Head LP (Lower Primary)</option>
                    <option value="Section Head UP">Section Head UP (Upper Primary)</option>
                    <option value="Section Head HS">Section Head HS (High School)</option>
                    <option value="Section Head HSS">Section Head HSS (Higher Secondary)</option>
                    <option value="Section Head KG">Section Head KG (Kindergarten)</option>
                    <option value="Class Teacher">Class Teacher</option>
                    <option value="Assistant Class Teacher">Assistant Class Teacher</option>
                    <option value="Subject Teacher">Subject Teacher</option>
                    <option value="Coordinator">Coordinator</option>
                  </select>
                </div>

                {/* Class Assignment (if Class Teacher or Assistant Class Teacher or Subject Teacher) */}
                <div className="input-group">
                  <label className="input-label">Assigned Class (Optional)</label>
                  <select
                    className="input-field"
                    value={formData.class_id}
                    onChange={(e) => {
                      const selectedC = (classes || []).find((c) => c.class_id === e.target.value);
                      setFormData({
                        ...formData,
                        class_id: e.target.value,
                        section_id: selectedC?.sections?.[0]?.section_id || ''
                      });
                    }}
                  >
                    <option value="">No Class Assignment</option>
                    {(classes || []).map((c) => (
                      <option key={c.class_id} value={c.class_id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.class_id && (
                <div className="grid-2" style={{ marginBottom: '20px' }}>
                  <div className="input-group">
                    <label className="input-label">Division / Section</label>
                    <select
                      className="input-field"
                      value={formData.section_id}
                      onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                    >
                      <option value="">All Divisions</option>
                      {(classes || []).find((c) => c.class_id === formData.class_id)?.sections?.map((sec) => (
                        <option key={sec.section_id} value={sec.section_id}>Division {sec.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Academic Year</label>
                    <select
                      className="input-field"
                      value={formData.academic_year_id}
                      onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                    >
                      {(academicYears || []).map((ay) => (
                        <option key={ay.academic_year_id} value={ay.academic_year_id}>
                          {ay.name} {ay.is_current ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Section 4: Contact & Communication */}
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                4. Contact & Address
              </div>
              <div className="grid-3" style={{ marginBottom: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="e.g. 9946701512"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Secondary / Phone No</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="e.g. 8075219023"
                    value={formData.secondary_phone}
                    onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="e.g. staff@school.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '24px' }}>
                <label className="input-label">Residential Address</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Full street address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFormModal(false)}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : editingStaffId ? 'Update Staff Member' : 'Enrol Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── 2. Bulk Upload Modal (Excel / CSV) ──────────────────────────────── */}
      {showBulkModal && createPortal(
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Bulk Import Faculty & Staff</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Upload StaffList.xlsx or CSV. Auto-maps ShortName, Code, Designation, DOB, Phone & Category.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                className="btn-icon" 
                onClick={() => setShowBulkModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {bulkError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{bulkError}</span>
              </div>
            )}

            {bulkSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{bulkSuccess}</span>
              </div>
            )}

            {/* Drag & Drop File Upload Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-glass)',
                borderRadius: 'var(--radius-lg)',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-subtle-box)',
                transition: 'var(--transition-fast)',
                marginBottom: '16px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={32} color="var(--primary)" style={{ margin: '0 auto 10px', opacity: 0.8 }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-heading)' }}>
                {bulkFile ? bulkFile.name : 'Click to select or drag & drop StaffList.xlsx'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Supports Excel (.xlsx, .xls) and CSV files.
              </div>
            </div>

            {/* Upsert Option */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={upsertExisting}
                  onChange={(e) => setUpsertExisting(e.target.checked)}
                />
                <span>Update existing staff records if Employee Code matches (Upsert)</span>
              </label>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDownloadTemplate}
                style={{ color: 'var(--primary)', fontSize: '12px' }}
              >
                <Download size={14} /> Download Sample Template
              </button>
            </div>

            {/* Live Preview Table */}
            {bulkPreview.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Parsed Preview (First {bulkPreview.length} of {parsedRows.length} rows)
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '200px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <table className="data-table" style={{ width: '100%', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle-box)' }}>
                        <th style={{ padding: '8px' }}>Code</th>
                        <th style={{ padding: '8px' }}>Short Name</th>
                        <th style={{ padding: '8px' }}>Name</th>
                        <th style={{ padding: '8px' }}>Designation</th>
                        <th style={{ padding: '8px' }}>Category</th>
                        <th style={{ padding: '8px' }}>DOB</th>
                        <th style={{ padding: '8px' }}>Mobile No</th>
                        <th style={{ padding: '8px' }}>Gender</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700 }}>{row.Code || row['Code'] || row.employee_id || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.ShortName || row['ShortName'] || row.short_name || '—'}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{row.Name || row['Name'] || row.name || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.Designation || row['Designation'] || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.Categoty || row.Category || row['Categoty'] || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.DOB || row['DOB'] || '—'}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{row['Mobile No.'] || row.mobile || row.phone || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.Gender || row['Gender'] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteBulkUpload}
                disabled={bulkLoading || parsedRows.length === 0}
              >
                {bulkLoading ? 'Importing Staff...' : `Import ${parsedRows.length} Staff Records`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── 3. Staff Details Drawer / Modal ─────────────────────────────────── */}
      {viewingStaff && createPortal(
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }} onClick={() => setViewingStaff(null)}>
          <div 
            className="modal-content glass-panel animate-slide-up" 
            style={{ maxWidth: '520px', width: '100%', borderRadius: 'var(--radius-xl)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header banner */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: viewingStaff.category === 'Non-Teaching' 
                    ? 'linear-gradient(135deg, #06b6d4, #0284c7)' 
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '18px',
                  boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)'
                }}>
                  {viewingStaff.short_name || viewingStaff.first_name?.[0] || 'S'}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)' }}>
                    {viewingStaff.first_name} {viewingStaff.last_name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '12px' }}>
                      {viewingStaff.employee_id}
                    </span>
                    {viewingStaff.short_name && (
                      <span className="badge badge-secondary" style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                        {viewingStaff.short_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="button"
                className="btn-icon" 
                onClick={() => setViewingStaff(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <span className={`badge ${viewingStaff.category === 'Non-Teaching' ? 'badge-cyan' : 'badge-emerald'}`}>
                {viewingStaff.category || 'Teaching'}
              </span>
              <span className="badge badge-secondary">
                {viewingStaff.designation || 'Staff'}
              </span>
              {renderRoleBadge(viewingStaff)}
              <span className={`badge ${viewingStaff.status === 'active' ? 'badge-emerald' : 'badge-secondary'}`}>
                {viewingStaff.status || 'Active'}
              </span>
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-subtle-box)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <span style={{ fontWeight: 600 }}>{viewingStaff.department || 'Academics'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Primary Mobile:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{viewingStaff.phone || '—'}</span>
              </div>

              {viewingStaff.secondary_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Secondary Phone:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{viewingStaff.secondary_phone}</span>
                </div>
              )}

              {viewingStaff.email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <span style={{ fontWeight: 600 }}>{viewingStaff.email}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span>
                <span style={{ fontWeight: 600 }}>
                  {formatDisplayDate(viewingStaff.date_of_birth)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gender:</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewingStaff.gender || '—'}</span>
              </div>

              {viewingStaff.blood_group && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Blood Group:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>{viewingStaff.blood_group}</span>
                </div>
              )}

              {viewingStaff.class_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Class Responsibility:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {viewingStaff.class_name} {viewingStaff.section_name ? `— Div ${viewingStaff.section_name}` : ''}
                  </span>
                </div>
              )}

              {viewingStaff.address && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                  <span style={{ fontSize: '12px' }}>{viewingStaff.address}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  const toEdit = viewingStaff;
                  setViewingStaff(null);
                  handleOpenEditModal(toEdit);
                }}
              >
                <Edit2 size={14} /> Edit Profile
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setViewingStaff(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── 4. Single Delete Confirmation Modal ─────────────────────────────── */}
      {deletingStaff && createPortal(
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--accent-rose)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
              Delete Staff Member?
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to remove <strong>{deletingStaff.first_name} {deletingStaff.last_name}</strong> ({deletingStaff.employee_id})? This will also remove any class assignments.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeletingStaff(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleExecuteSingleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Staff'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── 5. Bulk Delete Confirmation Modal ──────────────────────────────── */}
      {showBulkDeleteModal && createPortal(
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '460px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Confirm Bulk Deletion</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  This action will soft-delete {selectedStaffIds.length} staff records.
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-subtle-box)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              fontSize: '12px',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '10px' }}>
                Selected Preview (First 5 of {selectedStaffIds.length})
              </div>
              {selectedStaffIds.slice(0, 5).map((id) => {
                const match = (staff || []).find((s) => s.staff_id === id);
                return (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontWeight: 600 }}>{match ? `${match.first_name} ${match.last_name}` : id}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{match?.employee_id}</span>
                  </div>
                );
              })}
              {selectedStaffIds.length > 5 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                  + {selectedStaffIds.length - 5} more staff members...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleExecuteBulkDelete}
                disabled={bulkDeleteLoading}
              >
                {bulkDeleteLoading ? 'Deleting...' : `Confirm Delete (${selectedStaffIds.length})`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
