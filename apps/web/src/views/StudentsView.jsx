import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Upload,
  FileSpreadsheet,
  Edit2, 
  Trash2, 
  Filter, 
  User, 
  Calendar, 
  Award, 
  Tag, 
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StudentService, StudentAssignmentService, GuardianService } from '../services/api';

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

  // Close when clicking outside
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
            minWidth: '220px',
            maxWidth: '320px',
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
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value);
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{opt.label}</span>
                      {opt.subLabel && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{opt.subLabel}</span>}
                    </div>
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

// ─── Main StudentsView Component ──────────────────────────────────────────────
export default function StudentsView({ students = [], refreshData, classes = [], academicYear, setTab }) {
  // Search & Multi-Select Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]); // array of class_ids
  const [selectedSections, setSelectedSections] = useState([]); // array of section_ids
  const [selectedGenders, setSelectedGenders] = useState([]); // array of 'male', 'female', etc.
  const [selectedStatuses, setSelectedStatuses] = useState([]); // array of 'active', 'inactive', etc.

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // 25, 50, 100, 250, 'all'

  // Batch Selection States (Multiple Student Selection)
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Bulk Parent Account Creation States
  const [showBulkParentModal, setShowBulkParentModal] = useState(false);
  const [bulkParentPassword, setBulkParentPassword] = useState('Parent@123');
  const [bulkParentUsernameFormat, setBulkParentUsernameFormat] = useState('phone');
  const [bulkParentMergeSiblings, setBulkParentMergeSiblings] = useState(true);
  const [bulkParentLoading, setBulkParentLoading] = useState(false);
  const [bulkParentResult, setBulkParentResult] = useState(null);

  const handleBulkCreateParents = async () => {
    if (selectedStudentIds.length === 0) return;
    setBulkParentLoading(true);
    try {
      const res = await GuardianService.bulkGenerate({
        student_ids: selectedStudentIds,
        default_password: bulkParentPassword,
        username_format: bulkParentUsernameFormat,
        merge_siblings: bulkParentMergeSiblings,
      });
      setBulkParentResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate parent accounts');
    } finally {
      setBulkParentLoading(false);
    }
  };

  // Single Student Add / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Single Student Form Data
  const initialFormState = {
    admission_number: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: 'male',
    blood_group: 'O+',
    address: '',
    area: '',
    pincode: '',
    phone: '',
    father_name: '',
    guardian_relation: 'Father',
    guardian_phone: '',
    admission_date: new Date().toISOString().split('T')[0],
    status: 'active',
    class_id: classes?.[0]?.class_id || '',
    section_id: classes?.[0]?.sections?.[0]?.section_id || '',
    roll_number: '',
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
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detail View Drawer / Modal State
  const [viewingStudent, setViewingStudent] = useState(null);

  // Clear selections if students list changes meaningfully
  useEffect(() => {
    setSelectedStudentIds((prev) => prev.filter((id) => students.some((s) => s.student_id === id)));
  }, [students]);

  // Options for Multi-Select Filters
  const classOptions = useMemo(() => {
    return classes.map((c) => ({
      value: c.class_id,
      label: c.name,
      subLabel: `${c.sections?.length || 0} divisions`
    }));
  }, [classes]);

  const sectionOptions = useMemo(() => {
    // If classes are filtered, show only sections from those classes, else show all
    const relevantClasses = selectedClasses.length > 0
      ? classes.filter((c) => selectedClasses.includes(c.class_id))
      : classes;

    const opts = [];
    relevantClasses.forEach((c) => {
      c.sections?.forEach((sec) => {
        opts.push({
          value: sec.section_id,
          label: `${c.name} — Div ${sec.name}`,
          subLabel: c.name
        });
      });
    });
    return opts;
  }, [classes, selectedClasses]);

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'graduated', label: 'Graduated' },
  ];

  // Download Excel Template Function
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Sl.No.': '1',
        'Adm. No': 'S/1001',
        'Name': 'Aarav Sharma',
        'Class No': '1',
        'Course': 'Grade 1',
        'Division': 'A',
        'DOB': '15/May/2018',
        'Gender': 'M',
        'Admit Address': 'Flat 402, Green Valley Apartments, MG Road, New Delhi',
        'Area': 'R.K. Puram',
        'Fathers Name': 'Rajesh Sharma',
        'Guardian Relation': 'Father',
        'Guardian MobileNo': '9876543210',
        'Phone': '9876543211'
      },
      {
        'Sl.No.': '2',
        'Adm. No': 'S/1002',
        'Name': 'Ananya Verma',
        'Class No': '2',
        'Course': 'Grade 1',
        'Division': 'A',
        'DOB': '22/Aug/2018',
        'Gender': 'F',
        'Admit Address': 'House #12, Palm Street, Sector 14, New Delhi',
        'Area': 'Vasant Kunj',
        'Fathers Name': 'Suresh Verma',
        'Guardian Relation': 'Father',
        'Guardian MobileNo': '9811122233',
        'Phone': '9811122234'
      },
      {
        'Sl.No.': '3',
        'Adm. No': 'K/2001',
        'Name': 'Kabir Patel',
        'Class No': '1',
        'Course': 'LKG',
        'Division': 'B',
        'DOB': '10/Jan/2021',
        'Gender': 'M',
        'Admit Address': 'Plot 88, Sunrise Enclave, Delhi',
        'Area': 'Civil Lines',
        'Fathers Name': 'Deepak Patel',
        'Guardian Relation': 'Father',
        'Guardian MobileNo': '9988776655',
        'Phone': '9988776655'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');

    ws['!cols'] = [
      { wch: 8 },  // Sl.No.
      { wch: 14 }, // Adm. No
      { wch: 24 }, // Name
      { wch: 12 }, // Class No
      { wch: 14 }, // Course
      { wch: 10 }, // Division
      { wch: 14 }, // DOB
      { wch: 8 },  // Gender
      { wch: 40 }, // Admit Address
      { wch: 18 }, // Area
      { wch: 22 }, // Fathers Name
      { wch: 18 }, // Guardian Relation
      { wch: 18 }, // Guardian MobileNo
      { wch: 16 }  // Phone
    ];

    XLSX.writeFile(wb, 'EDEX_Student_Upload_Template.xlsx');
  };

  // Filter students based on all active criteria
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || (
        (s.first_name && s.first_name.toLowerCase().includes(term)) ||
        (s.last_name && s.last_name.toLowerCase().includes(term)) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(term)) ||
        (s.father_name && s.father_name.toLowerCase().includes(term)) ||
        (s.phone && s.phone.toLowerCase().includes(term)) ||
        (s.area && s.area.toLowerCase().includes(term)) ||
        (s.class_name && s.class_name.toLowerCase().includes(term))
      );

      const matchClass = selectedClasses.length === 0 || selectedClasses.includes(s.class_id);
      const matchSection = selectedSections.length === 0 || selectedSections.includes(s.section_id);
      const matchGender = selectedGenders.length === 0 || selectedGenders.includes(s.gender);
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(s.status);

      return matchSearch && matchClass && matchSection && matchGender && matchStatus;
    });
  }, [students, searchTerm, selectedClasses, selectedSections, selectedGenders, selectedStatuses]);

  // Paginated students slice
  const paginatedStudents = useMemo(() => {
    if (pageSize === 'all') return filteredStudents;
    const size = parseInt(pageSize, 10);
    const start = (currentPage - 1) * size;
    return filteredStudents.slice(start, start + size);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredStudents.length / parseInt(pageSize, 10)));
  }, [filteredStudents.length, pageSize]);

  // ─── Batch Row Selection Handlers ───────────────────────────────────────────
  const isAllOnPageSelected = useMemo(() => {
    if (paginatedStudents.length === 0) return false;
    return paginatedStudents.every((s) => selectedStudentIds.includes(s.student_id));
  }, [paginatedStudents, selectedStudentIds]);

  const isSomeOnPageSelected = useMemo(() => {
    return paginatedStudents.some((s) => selectedStudentIds.includes(s.student_id)) && !isAllOnPageSelected;
  }, [paginatedStudents, selectedStudentIds, isAllOnPageSelected]);

  const handleToggleSelectAllPage = () => {
    if (isAllOnPageSelected) {
      // Uncheck all students on current page
      const pageIds = new Set(paginatedStudents.map((s) => s.student_id));
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      // Check all students on current page
      const pageIds = paginatedStudents.map((s) => s.student_id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map((s) => s.student_id);
    setSelectedStudentIds(allFilteredIds);
  };

  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) => 
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // ─── Bulk Delete Execution ───────────────────────────────────────────────────
  const handleExecuteBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      await StudentService.bulkDelete(selectedStudentIds);
      setShowBulkDeleteModal(false);
      setSelectedStudentIds([]);
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete selected students.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Handle open Add Student modal
  const handleOpenAddModal = () => {
    setEditingStudentId(null);
    setFormError('');
    setFormData({
      ...initialFormState,
      class_id: classes?.[0]?.class_id || '',
      section_id: classes?.[0]?.sections?.[0]?.section_id || '',
    });
    setShowFormModal(true);
  };

  // Handle open Edit Student modal
  const handleOpenEditModal = (student) => {
    setEditingStudentId(student.student_id);
    setFormError('');

    let dobFormatted = '';
    if (student.date_of_birth) {
      const d = new Date(student.date_of_birth);
      if (!isNaN(d.getTime())) {
        dobFormatted = d.toISOString().split('T')[0];
      }
    }

    setFormData({
      admission_number: student.admission_number || '',
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      middle_name: student.middle_name || '',
      date_of_birth: dobFormatted,
      gender: student.gender || 'male',
      blood_group: student.blood_group || 'O+',
      address: student.address || '',
      area: student.area || '',
      pincode: student.pincode || '',
      phone: student.phone || '',
      father_name: student.father_name || '',
      guardian_relation: student.guardian_relation || 'Father',
      guardian_phone: student.guardian_phone || '',
      admission_date: student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: student.status || 'active',
      class_id: student.class_id || classes?.[0]?.class_id || '',
      section_id: student.section_id || classes?.[0]?.sections?.[0]?.section_id || '',
      roll_number: student.roll_number || '',
    });
    setShowFormModal(true);
  };

  // Handle Add / Edit Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (editingStudentId) {
        await StudentService.update(editingStudentId, {
          ...formData,
          academic_year_id: academicYear?.academic_year_id,
        });
      } else {
        await StudentService.create({
          ...formData,
          academic_year_id: academicYear?.academic_year_id,
        });
      }

      setShowFormModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        setFormError(`Conflict: ${err.response?.data?.message || 'Admission number already exists.'}`);
      } else {
        setFormError(err.response?.data?.message || 'Failed to save student record.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Single Delete Student
  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setDeleteLoading(true);
    try {
      await StudentService.delete(deletingStudent.student_id);
      setDeletingStudent(null);
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete student.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Bulk Upload Logic ──────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkError('');
    setBulkSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          setBulkError('No rows found in the selected Excel file.');
          setParsedRows([]);
          setBulkPreview([]);
          return;
        }

        // Universal normalization for every row
        const normalizeStudentRow = (rawRow) => {
          const norm = {};
          for (const [key, val] of Object.entries(rawRow)) {
            if (val === undefined || val === null || String(val).trim() === '') continue;
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanVal = String(val).trim();

            if (['admno', 'admissionno', 'admissionnumber', 'admnumber', 'admission'].includes(cleanKey)) {
              norm.admission_number = cleanVal;
            } else if (['name', 'studentname', 'fullname', 'firstname'].includes(cleanKey)) {
              norm.name = cleanVal;
            } else if (['classno', 'rollno', 'rollnumber', 'classnumber', 'roll', 'classrollno', 'classroll', 'rno', 'cno', 'classrollnumber'].includes(cleanKey)) {
              norm.roll_number = cleanVal;
            } else if (['course', 'class', 'classname', 'grade', 'standard', 'std'].includes(cleanKey)) {
              norm.course = cleanVal;
            } else if (['division', 'section', 'sec', 'div', 'sectionname'].includes(cleanKey)) {
              norm.division = cleanVal;
            } else if (['dob', 'dateofbirth', 'birthdate'].includes(cleanKey)) {
              norm.dob = cleanVal;
            } else if (['gender', 'sex'].includes(cleanKey)) {
              norm.gender = cleanVal;
            } else if (['fathersname', 'fathername', 'parentname', 'father', 'guardianname'].includes(cleanKey)) {
              norm.father_name = cleanVal;
            } else if (['guardianrelation', 'relation', 'relationship'].includes(cleanKey)) {
              norm.guardian_relation = cleanVal;
            } else if (['guardianmobileno', 'guardianmobile', 'guardianphone', 'parentphone', 'parentmobile', 'mobile', 'mobileno', 'contact'].includes(cleanKey)) {
              norm.guardian_mobile = cleanVal;
            } else if (['phone', 'phoneno', 'secondaryphone', 'altphone', 'telephone'].includes(cleanKey)) {
              norm.phone = cleanVal;
            } else if (['admitaddress', 'address', 'residentialaddress', 'fulladdress'].includes(cleanKey)) {
              norm.admit_address = cleanVal;
            } else if (['area', 'locality', 'place', 'city'].includes(cleanKey)) {
              norm.area = cleanVal;
            } else if (['pincode', 'pin', 'postalcode', 'zip'].includes(cleanKey)) {
              norm.pincode = cleanVal;
            }
          }
          if (!norm.admission_number && rawRow.admission_number) norm.admission_number = String(rawRow.admission_number).trim();
          if (!norm.name && (rawRow.name || rawRow.first_name)) norm.name = String(rawRow.name || rawRow.first_name).trim();
          if (!norm.roll_number && rawRow.roll_number) norm.roll_number = String(rawRow.roll_number).trim();
          if (!norm.course && (rawRow.course || rawRow.class_name)) norm.course = String(rawRow.course || rawRow.class_name).trim();
          if (!norm.division && (rawRow.division || rawRow.section_name)) norm.division = String(rawRow.division || rawRow.section_name).trim();
          return norm;
        };

        const normalizedRows = rawJson.map(normalizeStudentRow);

        // Check for duplicate admission numbers within the file
        const admMap = new Map();
        const fileDuplicates = [];

        normalizedRows.forEach((r, idx) => {
          const adm = String(r.admission_number || '').trim();
          if (adm) {
            if (admMap.has(adm.toLowerCase())) {
              fileDuplicates.push({ adm, row: idx + 2, prevRow: admMap.get(adm.toLowerCase()) });
            } else {
              admMap.set(adm.toLowerCase(), idx + 2);
            }
          }
        });

        if (fileDuplicates.length > 0) {
          setBulkError(`Found ${fileDuplicates.length} duplicate admission numbers inside this file (e.g. "${fileDuplicates[0].adm}" at row ${fileDuplicates[0].row}). Admission numbers must be unique.`);
        }

        setParsedRows(normalizedRows);
        setBulkPreview(normalizedRows.slice(0, 5));
      } catch (err) {
        console.error('File parsing error:', err);
        setBulkError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv document.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteBulkUpload = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      setBulkError('Please select an Excel file with valid student records first.');
      return;
    }

    setBulkLoading(true);
    setBulkError('');
    setBulkSuccess(null);

    try {
      const res = await StudentService.bulkUpload(parsedRows, upsertExisting);
      setBulkSuccess(res.data?.data || res.data?.message || 'Bulk upload completed successfully!');
      refreshData();
    } catch (err) {
      console.error('Bulk upload error:', err);
      setBulkError(err.response?.data?.message || 'Bulk import failed. Please verify the columns and admission number uniqueness.');
    } finally {
      setBulkLoading(false);
    }
  };

  // Helper for available sections in the single form
  const currentClassSections = useMemo(() => {
    const selected = classes.find((c) => c.class_id === formData.class_id);
    return selected?.sections || [];
  }, [classes, formData.class_id]);

  const hasActiveFilters = searchTerm || selectedClasses.length > 0 || selectedSections.length > 0 || selectedGenders.length > 0 || selectedStatuses.length > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Top Header & Action Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Student Master Directory</h1>
            <span className="badge badge-primary" style={{ fontSize: '13px', padding: '4px 10px' }}>
              {filteredStudents.length} / {students.length} Enrolled
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Master student identity records, guardian links, contact details & class placements in EDEX Core.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Link to Parent & Guardian Management */}
          {setTab && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTab('guardians')}
              title="Manage Parent & Guardian Logins"
              style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserCheck size={15} color="var(--primary)" />
              <span>Parent Accounts & Logins</span>
            </button>
          )}

          {/* Download Excel Template */}
          <button 
            className="btn btn-ghost"
            onClick={handleDownloadTemplate}
            title="Download Excel Template for student data upload"
            style={{ fontWeight: 600, border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle-box)' }}
          >
            <Download size={15} color="var(--accent-emerald)" />
            <span>Download Template</span>
          </button>

          {/* Bulk Upload Button */}
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setBulkFile(null);
              setParsedRows([]);
              setBulkPreview([]);
              setBulkError('');
              setBulkSuccess(null);
              setShowBulkModal(true);
            }}
            style={{ fontWeight: 600 }}
          >
            <Upload size={16} color="var(--primary)" />
            <span>Bulk Upload (Excel)</span>
          </button>

          {/* Enrol Single Student Button */}
          <button 
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ fontWeight: 600 }}
          >
            <Plus size={16} />
            <span>Enrol New Student</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar & Multi-Select Filters ── */}
      <div className="glass-panel" style={{
        position: 'relative',
        zIndex: 50,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by name, admission #, father's name, phone, area..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ paddingLeft: '38px', height: '40px' }}
          />
          <Search size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Multi-Select Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Multi-Select Class Filter */}
          <MultiSelectDropdown
            label="Class"
            placeholder="All Classes"
            options={classOptions}
            selected={selectedClasses}
            onChange={(newVal) => {
              setSelectedClasses(newVal);
              setCurrentPage(1);
            }}
            icon={GraduationCap}
          />

          {/* Multi-Select Division Filter */}
          <MultiSelectDropdown
            label="Division"
            placeholder="All Divisions"
            options={sectionOptions}
            selected={selectedSections}
            onChange={(newVal) => {
              setSelectedSections(newVal);
              setCurrentPage(1);
            }}
            icon={Tag}
          />

          {/* Multi-Select Gender Filter */}
          <MultiSelectDropdown
            label="Gender"
            placeholder="All Genders"
            options={genderOptions}
            selected={selectedGenders}
            onChange={(newVal) => {
              setSelectedGenders(newVal);
              setCurrentPage(1);
            }}
            icon={User}
          />

          {/* Multi-Select Status Filter */}
          <MultiSelectDropdown
            label="Status"
            placeholder="All Statuses"
            options={statusOptions}
            selected={selectedStatuses}
            onChange={(newVal) => {
              setSelectedStatuses(newVal);
              setCurrentPage(1);
            }}
            icon={Award}
            alignRight={true}
          />

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedClasses([]);
                setSelectedSections([]);
                setSelectedGenders([]);
                setSelectedStatuses([]);
                setCurrentPage(1);
              }}
              style={{ fontSize: '12px', color: 'var(--accent-rose)', padding: '6px 10px' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Batch Selection Floating Action Bar ── */}
      {selectedStudentIds.length > 0 && (
        <div 
          className="glass-panel animate-fade-in"
          style={{
            position: 'relative',
            zIndex: 40,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
            }}>
              {selectedStudentIds.length} Selected
            </span>
            
            {selectedStudentIds.length < filteredStudents.length && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSelectAllFiltered}
                style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}
              >
                Select all {filteredStudents.length} matching students
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedStudentIds([])}
              style={{ fontSize: '12px', color: 'var(--text-muted)' }}
            >
              Deselect All
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setBulkParentResult(null);
                setShowBulkParentModal(true);
              }}
              style={{
                fontWeight: 700,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Sparkles size={15} />
              <span>Create Parent Accounts ({selectedStudentIds.length})</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setShowBulkDeleteModal(true)}
              style={{ fontWeight: 700, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={15} />
              <span>Delete Selected ({selectedStudentIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Student Directory Table ── */}
      <div className="glass-panel" style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)', position: 'relative', zIndex: 1 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                {/* Select All Checkbox Header */}
                <th style={{ padding: '14px 14px', width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllOnPageSelected}
                    ref={(el) => { if (el) el.indeterminate = isSomeOnPageSelected; }}
                    onChange={handleToggleSelectAllPage}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    title="Select/Deselect all on this page"
                  />
                </th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>STUDENT</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>ADMISSION NO</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>CLASS & DIVISION</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>ROLL NO</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>PARENT / GUARDIAN</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>CONTACT & AREA</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
                <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                      <GraduationCap size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        No students found
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Try modifying your search or filters, or use "Bulk Upload (Excel)" to import student records.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.student_id);
                  return (
                    <tr 
                      key={s.student_id}
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)', 
                        transition: 'var(--transition-fast)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'transparent'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--table-row-hover)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Row Checkbox */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(s.student_id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>

                      {/* Student Name & DOB */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: s.gender === 'female' 
                              ? 'linear-gradient(135deg, #ec4899, #f43f5e)' 
                              : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                            color: '#ffffff',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          }}>
                            {s.first_name?.[0] || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                              {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>DOB: {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                              <span>•</span>
                              <span style={{ textTransform: 'capitalize' }}>{s.gender}</span>
                              {s.blood_group && (
                                <>
                                  <span>•</span>
                                  <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{s.blood_group}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          display: 'inline-block',
                        }}>
                          {s.admission_number}
                        </span>
                      </td>

                      {/* Class & Division */}
                      <td style={{ padding: '12px 14px' }}>
                        {s.class_name ? (
                          <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                            {s.class_name} — {s.section_name || 'A'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Roll No */}
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.roll_number ? `#${s.roll_number}` : '—'}
                      </td>

                      {/* Parent / Guardian */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {s.father_name || '—'}
                        </div>
                        {s.guardian_relation && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {s.guardian_relation}
                          </div>
                        )}
                      </td>

                      {/* Contact & Area */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                          <Phone size={12} color="var(--accent-emerald)" />
                          <span>{s.phone || s.guardian_phone || '—'}</span>
                        </div>
                        {s.area && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <MapPin size={11} />
                            <span>{s.area}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${s.status === 'active' ? 'badge-emerald' : 'badge-amber'}`} style={{ textTransform: 'capitalize' }}>
                          {s.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn-icon"
                            onClick={() => setViewingStudent(s)}
                            title="View Details"
                            style={{ width: '30px', height: '30px' }}
                          >
                            <Eye size={14} color="var(--text-secondary)" />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenEditModal(s)}
                            title="Edit Student"
                            style={{ width: '30px', height: '30px' }}
                          >
                            <Edit2 size={14} color="var(--primary)" />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => setDeletingStudent(s)}
                            title="Delete Student"
                            style={{ width: '30px', height: '30px' }}
                          >
                            <Trash2 size={14} color="var(--accent-rose)" />
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

        {/* ── Table Footer & Pagination Controls ── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--table-header-bg)',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Showing {filteredStudents.length === 0 ? 0 : (pageSize === 'all' ? 1 : (currentPage - 1) * parseInt(pageSize, 10) + 1)} - {pageSize === 'all' ? filteredStudents.length : Math.min(currentPage * parseInt(pageSize, 10), filteredStudents.length)} of <strong>{filteredStudents.length}</strong> students
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Page Size:</span>
              <select
                className="input-field"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '80px', height: '30px', padding: '2px 6px', fontSize: '11px' }}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 8px' }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span style={{ padding: '0 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 8px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 1: SINGLE STUDENT ENROL / EDIT
      ════════════════════════════════════════════════════════════════════════ */}
      {showFormModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}>
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800 }}>
                    {editingStudentId ? 'Edit Student Profile' : 'Enrol New Student'}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {editingStudentId ? 'Update master records and academic assignment' : 'Create master student record with unique admission number'}
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowFormModal(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-rose-light)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--accent-rose)',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              {/* Section 1: Basic Identity */}
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '10px' }}>
                1. Student Identity
              </div>
              
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Admission Number * (Unique)</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="e.g. S/7757 or 6408"
                    value={formData.admission_number}
                    onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Date of Birth *</label>
                  <input
                    type="date"
                    className="input-field"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">First Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Last Name / Surname *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
                    placeholder="Last Name or Initial"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="input-group">
                  <label className="input-label">Gender *</label>
                  <select
                    className="input-field"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
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
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="transferred">Transferred</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Academic Placement */}
              <div style={{
                marginTop: '10px',
                marginBottom: '16px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle-box)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '10px' }}>
                  2. Academic Placement (Year: {academicYear?.name || '2025-26'})
                </div>
                <div className="grid-3">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Class / Grade *</label>
                    <select
                      className="input-field"
                      value={formData.class_id}
                      onChange={(e) => {
                        const selectedCls = classes.find((c) => c.class_id === e.target.value);
                        setFormData({
                          ...formData,
                          class_id: e.target.value,
                          section_id: selectedCls?.sections?.[0]?.section_id || '',
                        });
                      }}
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c.class_id} value={c.class_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Division / Section *</label>
                    <select
                      className="input-field"
                      value={formData.section_id}
                      onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                    >
                      <option value="">Select Division</option>
                      {currentClassSections.map((sec) => (
                        <option key={sec.section_id} value={sec.section_id}>Division {sec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Roll Number (Class No)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 1"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Parent & Contact Details */}
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '10px' }}>
                3. Parent & Contact Details
              </div>

              <div className="grid-3">
                <div className="input-group">
                  <label className="input-label">Father / Guardian Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Father / Guardian Name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Relation</label>
                  <select
                    className="input-field"
                    value={formData.guardian_relation}
                    onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Primary Mobile No</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="10-digit Mobile"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Secondary / Student Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Alternative Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Area / Locality</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. KAKKOOTH"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Full Residential Address</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="House name, street, post office, PIN code..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowFormModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : (editingStudentId ? 'Update Student' : 'Enrol Student')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 2: BULK EXCEL UPLOAD
      ════════════════════════════════════════════════════════════════════════ */}
      {showBulkModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Bulk Student Upload (Excel)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Upload Excel file (.xlsx, .csv) with Class No (Roll #), Course, Division & Student data.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowBulkModal(false)}>
                <X size={18} />
              </button>
            </div>

            {bulkError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-rose-light)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--accent-rose)',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{bulkError}</span>
              </div>
            )}

            {bulkSuccess && (
              <div style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-emerald)',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>Import Completed Successfully!</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {typeof bulkSuccess === 'string' 
                      ? bulkSuccess 
                      : `Total: ${bulkSuccess.total} rows | Enrolled: ${bulkSuccess.imported} | Updated: ${bulkSuccess.updated} | Skipped: ${bulkSuccess.skipped}`}
                  </div>
                </div>
              </div>
            )}

            {/* Template Download Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-subtle-box)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Need the sample format? Download pre-formatted Excel template.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadTemplate}
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                <Download size={13} color="var(--accent-emerald)" />
                <span>Download Sample Template (.xlsx)</span>
              </button>
            </div>

            {/* Drag & Drop / File Input Box */}
            <div 
              style={{
                border: '2px dashed var(--border-glass)',
                borderRadius: 'var(--radius-lg)',
                padding: '30px 20px',
                textAlign: 'center',
                background: 'var(--bg-subtle-box)',
                cursor: 'pointer',
                transition: 'var(--transition-normal)',
                marginBottom: '20px',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Upload size={36} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {bulkFile ? bulkFile.name : 'Click to select or drop student data.xlsx here'}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Supports Microsoft Excel (.xlsx, .xls) and CSV files with standard headers.
              </p>
            </div>

            {/* Preview Section */}
            {parsedRows.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Dataset Preview ({parsedRows.length} records detected)
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                    Admission numbers verified unique
                  </span>
                </div>

                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '8px 10px' }}>Adm #</th>
                        <th style={{ padding: '8px 10px' }}>Name</th>
                        <th style={{ padding: '8px 10px' }}>Class</th>
                        <th style={{ padding: '8px 10px' }}>Division</th>
                        <th style={{ padding: '8px 10px' }}>Roll # (Class No)</th>
                        <th style={{ padding: '8px 10px' }}>DOB</th>
                        <th style={{ padding: '8px 10px' }}>Gender</th>
                        <th style={{ padding: '8px 10px' }}>Father</th>
                        <th style={{ padding: '8px 10px' }}>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            {row.admission_number || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                            {row.name || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.course || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.division || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            {row.roll_number ? `#${row.roll_number}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.dob || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>
                            {row.gender || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.father_name || '—'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {row.guardian_mobile || row.phone || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="upsertCheckbox"
                    checked={upsertExisting}
                    onChange={(e) => setUpsertExisting(e.target.checked)}
                  />
                  <label htmlFor="upsertCheckbox" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Update existing students and roll numbers if admission number is already enrolled (Recommended)
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBulkModal(false)}
              >
                {bulkSuccess ? 'Close' : 'Cancel'}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={bulkLoading || parsedRows.length === 0}
                onClick={handleExecuteBulkUpload}
              >
                {bulkLoading ? (
                  'Importing & Provisioning...'
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Import {parsedRows.length > 0 ? `${parsedRows.length} Students` : 'File'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 3: STUDENT PROFILE VIEW DRAWER / MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {viewingStudent && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '580px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: viewingStudent.gender === 'female'
                    ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                    : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '18px',
                }}>
                  {viewingStudent.first_name?.[0] || 'S'}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
                    {viewingStudent.first_name} {viewingStudent.last_name}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                    Adm #: {viewingStudent.admission_number}
                  </div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setViewingStudent(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div className="glass-panel" style={{ padding: '14px', background: 'var(--bg-subtle-box)' }}>
                <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Academic Info
                </div>
                <div className="grid-2" style={{ gap: '8px' }}>
                  <div><strong>Class:</strong> {viewingStudent.class_name || 'Unassigned'}</div>
                  <div><strong>Division:</strong> {viewingStudent.section_name || '—'}</div>
                  <div><strong>Roll Number:</strong> #{viewingStudent.roll_number || '—'}</div>
                  <div><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{viewingStudent.status}</span></div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', background: 'var(--bg-subtle-box)' }}>
                <div style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Personal & Guardian Info
                </div>
                <div className="grid-2" style={{ gap: '8px' }}>
                  <div><strong>Gender:</strong> <span style={{ textTransform: 'capitalize' }}>{viewingStudent.gender}</span></div>
                  <div><strong>DOB:</strong> {viewingStudent.date_of_birth ? new Date(viewingStudent.date_of_birth).toLocaleDateString() : 'N/A'}</div>
                  <div><strong>Blood Group:</strong> {viewingStudent.blood_group || 'O+'}</div>
                  <div><strong>Parent:</strong> {viewingStudent.father_name || '—'} ({viewingStudent.guardian_relation || 'Parent'})</div>
                  <div><strong>Mobile:</strong> {viewingStudent.guardian_phone || viewingStudent.phone || '—'}</div>
                  <div><strong>Area:</strong> {viewingStudent.area || '—'}</div>
                </div>
                {viewingStudent.address && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Address:</strong> {viewingStudent.address}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingStudent(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const s = viewingStudent;
                  setViewingStudent(null);
                  handleOpenEditModal(s);
                }}
              >
                <Edit2 size={14} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 4: SINGLE DELETE CONFIRMATION
      ════════════════════════════════════════════════════════════════════════ */}
      {deletingStudent && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
                marginBottom: '12px',
              }}>
                <Trash2 size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Remove Student?</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Are you sure you want to deactivate <strong>{deletingStudent.first_name} {deletingStudent.last_name}</strong> (Adm: <code>{deletingStudent.admission_number}</code>)?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeletingStudent(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: BULK CREATE PARENT ACCOUNTS FOR SELECTED STUDENTS
      ════════════════════════════════════════════════════════════════════════ */}
      {showBulkParentModal && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkParentLoading) {
              setShowBulkParentModal(false);
              setBulkParentResult(null);
            }
          }}
        >
          <div className="modal-content animate-scale-in" style={{ maxWidth: '540px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Create Parent Accounts</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Generating logins for {selectedStudentIds.length} selected student(s)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowBulkParentModal(false); setBulkParentResult(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {bulkParentResult ? (
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span>Parent Accounts Created!</span>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  <div>• <strong>{bulkParentResult.students_processed}</strong> students evaluated</div>
                  <div>• <strong>{bulkParentResult.guardians_created}</strong> new guardian profiles created</div>
                  <div>• <strong>{bulkParentResult.accounts_created}</strong> login accounts generated</div>
                  <div>• <strong>{bulkParentResult.siblings_merged}</strong> sibling pairs merged</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowBulkParentModal(false); setBulkParentResult(null); setSelectedStudentIds([]); }}
                    style={{ flex: 1, fontSize: '13px' }}
                  >
                    Done & Close
                  </button>
                  {setTab && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setShowBulkParentModal(false);
                        setBulkParentResult(null);
                        setSelectedStudentIds([]);
                        setTab('guardians');
                      }}
                      style={{ flex: 1, fontSize: '13px' }}
                    >
                      Open Guardians View
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Options */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>Login Username Format</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${bulkParentUsernameFormat === 'phone' ? 'var(--primary)' : 'var(--border-glass)'}`,
                        background: bulkParentUsernameFormat === 'phone' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="bp_username_format"
                          checked={bulkParentUsernameFormat === 'phone'}
                          onChange={() => setBulkParentUsernameFormat('phone')}
                        />
                        <span>Mobile Number</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '18px' }}>
                        e.g. 9947535373
                      </div>
                    </label>

                    <label
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${bulkParentUsernameFormat === 'adm_no' ? 'var(--primary)' : 'var(--border-glass)'}`,
                        background: bulkParentUsernameFormat === 'adm_no' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="bp_username_format"
                          checked={bulkParentUsernameFormat === 'adm_no'}
                          onChange={() => setBulkParentUsernameFormat('adm_no')}
                        />
                        <span>Admission No.</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '18px' }}>
                        e.g. p_6005
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>Default Initial Password</label>
                  <input
                    type="text"
                    className="input-field"
                    value={bulkParentPassword}
                    onChange={(e) => setBulkParentPassword(e.target.value)}
                    style={{ fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Parents can change this password after first login in the mobile app.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={bulkParentMergeSiblings}
                      onChange={(e) => setBulkParentMergeSiblings(e.target.checked)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Automatically Merge Sibling Households</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        If selected students share the same parent mobile number, merge under single account.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBulkParentModal(false)}
                    disabled={bulkParentLoading}
                    style={{ fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBulkCreateParents}
                    disabled={bulkParentLoading}
                    style={{ fontSize: '13px', fontWeight: 700 }}
                  >
                    {bulkParentLoading ? 'Processing…' : `Create ${selectedStudentIds.length} Accounts`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

            {/* ════════════════════════════════════════════════════════════════════════
          MODAL 5: BULK DELETE CONFIRMATION (MULTIPLE STUDENTS)
      ════════════════════════════════════════════════════════════════════════ */}
      {showBulkDeleteModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.12)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
                marginBottom: '14px',
              }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-rose)' }}>
                Delete {selectedStudentIds.length} Selected Students?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                This action will soft-delete and deactivate all <strong>{selectedStudentIds.length}</strong> selected student records and withdraw their active academic assignments.
              </p>
            </div>

            {/* Quick Preview of selected students */}
            <div style={{
              maxHeight: '140px',
              overflowY: 'auto',
              background: 'var(--bg-subtle-box)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              fontSize: '12px',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '10px' }}>
                Selected Preview (First 5 of {selectedStudentIds.length})
              </div>
              {selectedStudentIds.slice(0, 5).map((id) => {
                const match = students.find((s) => s.student_id === id);
                return (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontWeight: 600 }}>{match ? `${match.first_name} ${match.last_name}` : id}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{match?.admission_number}</span>
                  </div>
                );
              })}
              {selectedStudentIds.length > 5 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                  + {selectedStudentIds.length - 5} more students...
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
                {bulkDeleteLoading ? 'Deleting...' : `Confirm Delete (${selectedStudentIds.length})`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
