import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCheck,
  Users,
  Search,
  Plus,
  Filter,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  Phone,
  Mail,
  GraduationCap,
  Bus,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Lock,
  Unlock,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  UserPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GuardianService, StudentService, ClassService } from '../services/api';

export default function GuardiansView({ school, classes = [], academicYear, setTab }) {
  const [internalClasses, setInternalClasses] = useState(classes || []);

  useEffect(() => {
    if (classes && classes.length > 0) {
      setInternalClasses(classes);
    } else {
      ClassService.list(true)
        .then((res) => {
          const list = res.data?.classes || (Array.isArray(res.data) ? res.data : []);
          setInternalClasses(list);
        })
        .catch(console.error);
    }
  }, [classes]);

  const activeClasses = (classes && classes.length > 0) ? classes : internalClasses;
  // ─── Data States ───────────────────────────────────────────────────────────
  const [guardians, setGuardians] = useState([]);
  const [stats, setStats] = useState({
    total_guardians: 0,
    total_with_account: 0,
    active_accounts: 0,
    inactive_accounts: 0,
    without_account: 0,
    total_students: 0,
    covered_students: 0,
    pending_students: 0,
    sibling_guardians: 0,
  });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error' | 'info', message }

  // ─── Filter & Pagination States ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [accountFilter, setAccountFilter] = useState('all'); // 'all' | 'has_account' | 'no_account' | 'active' | 'inactive'
  const [busFilter, setBusFilter] = useState('all'); // 'all' | 'bus' | 'non_bus'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // ─── Selection States ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);

  // ─── Modal States ──────────────────────────────────────────────────────────
  const [showBulkGenModal, setShowBulkGenModal] = useState(false);
  const [bulkGenScope, setBulkGenScope] = useState('all'); // 'all' | 'classes' | 'selected'
  const [bulkGenClassIds, setBulkGenClassIds] = useState([]);
  const [bulkGenUsernameFormat, setBulkGenUsernameFormat] = useState('phone'); // 'phone' | 'adm_no'
  const [bulkGenDefaultPassword, setBulkGenDefaultPassword] = useState('Parent@123');
  const [bulkGenMergeSiblings, setBulkGenMergeSiblings] = useState(true);
  const [bulkGenLoading, setBulkGenLoading] = useState(false);
  const [bulkGenResult, setBulkGenResult] = useState(null);

  // Single Guardian Add/Edit Modal
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState(null);
  const [guardianForm, setGuardianForm] = useState({
    first_name: '',
    last_name: '',
    relationship_type: 'father',
    phone: '',
    email: '',
    address: '',
    occupation: '',
    create_account: false,
    username: '',
    password: 'Parent@123',
  });
  const [guardianFormLoading, setGuardianFormLoading] = useState(false);

  // Account Management Modal (Create login / Reset password)
  const [accountModalGuardian, setAccountModalGuardian] = useState(null);
  const [accountModalMode, setAccountModalMode] = useState('create'); // 'create' | 'reset_password'
  const [accountForm, setAccountForm] = useState({ username: '', password: 'Parent@123' });
  const [accountModalLoading, setAccountModalLoading] = useState(false);

  // Link Student Modal
  const [linkModalGuardian, setLinkModalGuardian] = useState(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [linkingStudentLoading, setLinkingStudentLoading] = useState(false);

  // Delete Confirmations
  const [deletingGuardian, setDeletingGuardian] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // ─── Load Stats & List ─────────────────────────────────────────────────────
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await GuardianService.getStats();
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load guardian stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadData = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedClass) params.class_id = selectedClass;
      if (selectedSection) params.section_id = selectedSection;

      if (accountFilter === 'has_account') params.has_account = 'true';
      else if (accountFilter === 'no_account') params.has_account = 'false';
      else if (accountFilter === 'active') params.account_status = 'active';
      else if (accountFilter === 'inactive') params.account_status = 'inactive';

      if (busFilter === 'bus') params.is_bus_rider = 'true';
      else if (busFilter === 'non_bus') params.is_bus_rider = 'false';

      const res = await GuardianService.list(params);
      const listData = res.data?.data?.guardians || [];
      const meta = res.data?.data?.pagination || { total: listData.length, totalPages: 1 };

      setGuardians(listData);
      setPagination(meta);
    } catch (e) {
      console.error('Failed to load guardians:', e);
      setNotice({ type: 'error', message: 'Failed to load parent and guardian directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadData(1);
    setPage(1);
  }, [search, selectedClass, selectedSection, accountFilter, busFilter, pageSize]);

  useEffect(() => {
    if (page > 1) {
      loadData(page);
    }
  }, [page]);

  // Notice auto-dismiss
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  // Available sections based on selected class
  const availableSections = useMemo(() => {
    if (!selectedClass) return [];
    const cl = activeClasses.find((c) => c.class_id === selectedClass);
    return cl?.sections || [];
  }, [activeClasses, selectedClass]);

  // ─── Selection Helpers ─────────────────────────────────────────────────────
  const isAllSelected = guardians.length > 0 && guardians.every((g) => selectedIds.includes(g.guardian_id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(guardians.map((g) => g.guardian_id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // ─── Student Search for Linking Sibling ────────────────────────────────────
  useEffect(() => {
    if (!linkModalGuardian || !studentSearchTerm.trim()) {
      setStudentSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setStudentSearchLoading(true);
        const res = await StudentService.list({ search: studentSearchTerm.trim(), limit: 10 });
        const list = res.data?.data?.students || res.data?.data || [];
        // Filter out already linked students
        const currentLinkedIds = new Set((linkModalGuardian.students || []).map((s) => s.student_id));
        setStudentSearchResults(list.filter((s) => !currentLinkedIds.has(s.student_id)));
      } catch (e) {
        console.error(e);
      } finally {
        setStudentSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearchTerm, linkModalGuardian]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleBulkGenerateSubmit = async () => {
    setBulkGenLoading(true);
    setBulkGenResult(null);
    try {
      const payload = {
        username_format: bulkGenUsernameFormat,
        default_password: bulkGenDefaultPassword,
        merge_siblings_by_phone: bulkGenMergeSiblings,
        create_login_accounts: true,
      };

      if (bulkGenScope === 'selected' && selectedIds.length > 0) {
        // Collect student IDs from selected guardians
        const studentIdSet = new Set();
        guardians
          .filter((g) => selectedIds.includes(g.guardian_id))
          .forEach((g) => {
            (g.students || []).forEach((s) => studentIdSet.add(s.student_id));
          });
        payload.student_ids = Array.from(studentIdSet);
      } else if (bulkGenScope === 'classes' && bulkGenClassIds.length > 0) {
        payload.class_ids = bulkGenClassIds;
      }

      const res = await GuardianService.bulkGenerate(payload);
      const data = res.data?.data || {};

      setBulkGenResult(data);
      setNotice({
        type: 'success',
        message: `Successfully processed ${data.students_processed || 0} students! Created ${data.guardians_created || 0} guardians and ${data.accounts_created || 0} parent login accounts.`,
      });

      loadStats();
      loadData();
    } catch (e) {
      console.error(e);
      setNotice({
        type: 'error',
        message: e.response?.data?.message || 'Failed to complete bulk parent account generation.',
      });
    } finally {
      setBulkGenLoading(false);
    }
  };

  const handleSaveGuardian = async (e) => {
    e.preventDefault();
    setGuardianFormLoading(true);
    try {
      if (editingGuardian) {
        await GuardianService.update(editingGuardian.guardian_id, guardianForm);
        setNotice({ type: 'success', message: `Guardian "${guardianForm.first_name}" updated successfully.` });
      } else {
        await GuardianService.create(guardianForm);
        setNotice({ type: 'success', message: `New parent profile created successfully.` });
      }
      setShowGuardianModal(false);
      setEditingGuardian(null);
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save guardian.');
    } finally {
      setGuardianFormLoading(false);
    }
  };

  const handleAccountModalSubmit = async (e) => {
    e.preventDefault();
    if (!accountModalGuardian) return;
    setAccountModalLoading(true);
    try {
      if (accountModalMode === 'create') {
        await GuardianService.createAccount(accountModalGuardian.guardian_id, accountForm);
        setNotice({ type: 'success', message: `Login account created for ${accountModalGuardian.full_name}.` });
      } else {
        await GuardianService.resetPassword(accountModalGuardian.guardian_id, {
          new_password: accountForm.password,
        });
        setNotice({ type: 'success', message: `Password reset successfully for ${accountModalGuardian.full_name}.` });
      }
      setAccountModalGuardian(null);
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setAccountModalLoading(false);
    }
  };

  const handleToggleAccountStatus = async (guardian) => {
    if (!guardian.user_account) return;
    const newStatus = !guardian.user_account.is_active;
    try {
      await GuardianService.toggleAccountStatus(guardian.guardian_id, { is_active: newStatus });
      setNotice({
        type: 'success',
        message: `Account for ${guardian.full_name} is now ${newStatus ? 'Active' : 'Inactive'}.`,
      });
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDeleteAccountOnly = async (guardian) => {
    if (!window.confirm(`⚠️ Revoke login access for "${guardian.full_name}" (${guardian.user_account?.username})?\n\nThe guardian profile and student linkages will remain intact.`)) return;
    try {
      await GuardianService.deleteAccount(guardian.guardian_id);
      setNotice({ type: 'success', message: `Login account for "${guardian.full_name}" revoked.` });
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to revoke login.');
    }
  };

  const handleDeleteGuardianSubmit = async () => {
    if (!deletingGuardian) return;
    setDeleteLoading(true);
    try {
      await GuardianService.delete(deletingGuardian.guardian_id);
      setNotice({ type: 'success', message: `Guardian "${deletingGuardian.full_name}" deleted.` });
      setDeletingGuardian(null);
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete guardian.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLinkStudent = async (student) => {
    if (!linkModalGuardian) return;
    setLinkingStudentLoading(true);
    try {
      await GuardianService.linkStudent(linkModalGuardian.guardian_id, {
        student_id: student.student_id,
        is_primary_contact: true,
        can_pickup: true,
      });
      setNotice({ type: 'success', message: `Linked student ${student.first_name} to ${linkModalGuardian.full_name}.` });
      setLinkModalGuardian(null);
      setStudentSearchTerm('');
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to link student.');
    } finally {
      setLinkingStudentLoading(false);
    }
  };

  const handleUnlinkStudent = async (guardian, student) => {
    if (!window.confirm(`Unlink student "${student.first_name} ${student.last_name || ''}" from ${guardian.full_name}?`)) return;
    try {
      await GuardianService.unlinkStudent(guardian.guardian_id, student.student_id);
      setNotice({ type: 'success', message: `Student unlinked.` });
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to unlink student.');
    }
  };

  const handleBulkAction = async (action, data = {}) => {
    if (selectedIds.length === 0) return;
    let confirmMsg = `Apply bulk action "${action}" to ${selectedIds.length} selected guardians?`;
    if (action === 'delete_guardians') {
      confirmMsg = `⚠️ PERMANENT WARNING: Delete ${selectedIds.length} selected guardians and revoke their user logins?`;
    } else if (action === 'delete_accounts') {
      confirmMsg = `Revoke portal/app login accounts for ${selectedIds.length} selected guardians?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      await GuardianService.bulkAction({ action, guardian_ids: selectedIds, data });
      setNotice({ type: 'success', message: `Bulk action "${action}" applied to ${selectedIds.length} records.` });
      setSelectedIds([]);
      loadStats();
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Bulk action failed.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = guardians.map((g, idx) => ({
      'Sl No': idx + 1,
      'Guardian Full Name': g.full_name,
      'Relationship': g.relationship_type,
      'Phone': g.phone || '—',
      'Email': g.email || '—',
      'Login Username': g.user_account?.username || 'No Account',
      'Account Status': g.user_account ? (g.user_account.is_active ? 'Active' : 'Inactive') : 'No Account',
      'Children Count': g.student_count,
      'Linked Students': (g.students || []).map((s) => `${s.first_name} (${s.admission_number || 'N/A'}) - ${s.class_name || 'N/A'}`).join(', '),
      'Bus Passenger': (g.students || []).some((s) => s.route_code) ? 'Yes' : 'No',
      'Address': g.address || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parent Directory');
    XLSX.writeFile(wb, `EDEX_Parent_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="view-container animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* ─── Breadcrumbs & Switcher Header ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>EDEX Core</span>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Guardians & Parents</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={26} color="var(--primary)" />
            Parent & Guardian Management
          </h1>
        </div>

        {/* View Toggle / Link back to Student Master */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setTab && setTab('students')}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GraduationCap size={15} />
            <span>Student Master Directory</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { loadStats(); loadData(); }}
            disabled={loading}
            title="Refresh Directory"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={guardians.length === 0}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setBulkGenScope('all');
              setBulkGenClassIds([]);
              setShowBulkGenModal(true);
            }}
            style={{
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            }}
          >
            <Sparkles size={16} />
            <span>Bulk Create Parent Accounts</span>
          </button>
        </div>
      </div>

      {/* ─── Notification Banner ─────────────────────────────────────────────── */}
      {notice && (
        <div
          className="animate-fade-in"
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              notice.type === 'success'
                ? 'rgba(16, 185, 129, 0.12)'
                : notice.type === 'error'
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(99, 102, 241, 0.12)',
            border: `1px solid ${
              notice.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : notice.type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(99, 102, 241, 0.3)'
            }`,
            color:
              notice.type === 'success'
                ? '#10b981'
                : notice.type === 'error'
                ? '#ef4444'
                : 'var(--primary)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>
      )}

      {/* ─── Quick Setup Banner (if pending students exist) ──────────────────── */}
      {stats.pending_students > 0 && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)',
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
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <UserPlus size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                {stats.pending_students} Students Without Active Parent Profiles
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Automatically generate official parent guardian records and login credentials using student admission files.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setBulkGenScope('all');
              setBulkGenClassIds([]);
              setShowBulkGenModal(true);
            }}
            style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={15} />
            <span>Generate Parent Logins ({stats.pending_students})</span>
          </button>
        </div>
      )}

      {/* ─── KPI Stats Row ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Total Guardians */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL GUARDIANS</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800 }}>{stats.total_guardians}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Covering {stats.covered_students} of {stats.total_students} students ({stats.total_students > 0 ? Math.round((stats.covered_students / stats.total_students) * 100) : 0}%)
          </div>
        </div>

        {/* Active Accounts */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>PORTAL LOGINS ACTIVE</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }}>{stats.active_accounts}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Parents enabled for Mobile App & Web
          </div>
        </div>

        {/* Pending / No Account */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>WITHOUT LOGIN ACCOUNT</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: stats.without_account > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {stats.without_account}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Guardians without portal credentials
          </div>
        </div>

        {/* Sibling Households */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>SIBLING HOUSEHOLDS</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <UserCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#a855f7' }}>{stats.sibling_guardians}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Parents with 2+ children enrolled
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search parent name, student, admission no, mobile, username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', fontSize: '13px', height: '38px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Class Filter */}
          <select
            className="input-field"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedSection('');
            }}
            style={{ width: '160px', height: '38px', fontSize: '13px' }}
          >
            <option value="">All Classes</option>
            {activeClasses.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          {availableSections.length > 0 && (
            <select
              className="input-field"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={{ width: '140px', height: '38px', fontSize: '13px' }}
            >
              <option value="">All Divisions</option>
              {availableSections.map((sec) => (
                <option key={sec.section_id} value={sec.section_id}>
                  Div {sec.name}
                </option>
              ))}
            </select>
          )}

          {/* Account Filter */}
          <select
            className="input-field"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            style={{ width: '170px', height: '38px', fontSize: '13px' }}
          >
            <option value="all">All Accounts</option>
            <option value="has_account">Has Login Account</option>
            <option value="no_account">No Login Account</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Bus Filter */}
          <select
            className="input-field"
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            style={{ width: '140px', height: '38px', fontSize: '13px' }}
          >
            <option value="all">All Riders</option>
            <option value="bus">Bus Riders</option>
            <option value="non_bus">Non-Bus</option>
          </select>
        </div>

        {/* Action: Add Parent */}
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditingGuardian(null);
              setGuardianForm({
                first_name: '',
                last_name: '',
                relationship_type: 'father',
                phone: '',
                email: '',
                address: '',
                occupation: '',
                create_account: true,
                username: '',
                password: 'Parent@123',
              });
              setShowGuardianModal(true);
            }}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add Single Guardian</span>
          </button>
        </div>
      </div>

      {/* ─── Batch Action Toolbar (When rows selected) ───────────────────────── */}
      {selectedIds.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            padding: '12px 18px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--primary)',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--primary)',
                color: '#fff',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {selectedIds.length}
            </span>
            <span style={{ fontWeight: 600, fontSize: '13.5px' }}>Guardians Selected</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSelectedIds([])}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              Deselect All
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setBulkGenScope('selected');
                setShowBulkGenModal(true);
              }}
              style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <KeyRound size={14} />
              <span>Generate / Refresh Logins</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleBulkAction('activate')}
              style={{ fontSize: '12.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Lock size={14} />
              <span>Activate</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleBulkAction('deactivate')}
              style={{ fontSize: '12.5px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Unlock size={14} />
              <span>Deactivate</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const newPw = window.prompt('Enter new default password for selected guardians:', 'Parent@123');
                if (newPw) handleBulkAction('reset_password', { default_password: newPw });
              }}
              style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <RefreshCw size={14} />
              <span>Reset Passwords</span>
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleBulkAction('delete_guardians')}
              style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Trash2 size={14} />
              <span>Delete Guardians</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Guardians Data Table ────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ width: '40px', padding: '14px 14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isAllSelected ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {isAllSelected ? <CheckSquare size={16} /> : isSomeSelected ? <MinusSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>GUARDIAN / PARENT</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>CONTACT INFO</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>LINKED STUDENT(S)</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>PORTAL LOGIN</th>
                <th style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Loading parent & guardian directory…</span>
                    </div>
                  </td>
                </tr>
              ) : guardians.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                      <UserCheck size={36} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        No Parent / Guardian Records Found
                      </div>
                      <div style={{ fontSize: '12.5px', marginBottom: '16px' }}>
                        {search || selectedClass
                          ? 'No guardians match the selected filters.'
                          : 'You haven’t generated official guardian profiles yet. Click below to generate them from your student files.'}
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setBulkGenScope('all');
                          setShowBulkGenModal(true);
                        }}
                        style={{ fontSize: '13px' }}
                      >
                        <Sparkles size={15} style={{ marginRight: '6px' }} />
                        Bulk Create Parent Accounts
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                guardians.map((g) => {
                  const isSelected = selectedIds.includes(g.guardian_id);
                  const hasLogin = Boolean(g.user_account);
                  const isActive = hasLogin && g.user_account.is_active;

                  return (
                    <tr
                      key={g.guardian_id}
                      style={{
                        borderBottom: '1px solid var(--border-glass)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(g.guardian_id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>

                      {/* Guardian Name & Relationship */}
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                            }}
                          >
                            {g.first_name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {g.full_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  textTransform: 'capitalize',
                                  background:
                                    g.relationship_type === 'father'
                                      ? 'rgba(59, 130, 246, 0.1)'
                                      : g.relationship_type === 'mother'
                                      ? 'rgba(236, 72, 153, 0.1)'
                                      : 'rgba(107, 114, 128, 0.1)',
                                  color:
                                    g.relationship_type === 'father'
                                      ? '#3b82f6'
                                      : g.relationship_type === 'mother'
                                      ? '#ec4899'
                                      : 'var(--text-secondary)',
                                  fontWeight: 600,
                                }}
                              >
                                {g.relationship_type === 'legal_guardian' ? 'Guardian' : g.relationship_type}
                              </span>
                              {g.student_count > 1 && (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: '#a855f7',
                                    fontWeight: 700,
                                  }}
                                  title={`${g.student_count} children linked`}
                                >
                                  {g.student_count} Children
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {g.phone ? (
                            <a
                              href={`tel:${g.phone}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}
                            >
                              <Phone size={12} color="var(--primary)" />
                              <span>{g.phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No phone</span>
                          )}
                          {g.email && (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={11} />
                              <span>{g.email}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Linked Children / Students */}
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '320px' }}>
                          {g.students && g.students.length > 0 ? (
                            g.students.map((s) => (
                              <div
                                key={s.student_id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-glass)',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <GraduationCap size={12} color="var(--text-muted)" />
                                  <strong style={{ color: 'var(--text-primary)' }}>{s.first_name} {s.last_name || ''}</strong>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({s.admission_number || '—'})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {s.class_name && (
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                      {s.class_name} {s.section_name ? `- ${s.section_name}` : ''}
                                    </span>
                                  )}
                                  {s.route_code && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        color: '#f59e0b',
                                        fontWeight: 700,
                                      }}
                                      title={`Bus ${s.route_code} — ${s.stop_name || ''}`}
                                    >
                                      {s.route_code}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleUnlinkStudent(g, s)}
                                    title="Unlink child"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      cursor: 'pointer',
                                      padding: '1px',
                                      marginLeft: '2px',
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No linked student</span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setLinkModalGuardian(g);
                              setStudentSearchTerm('');
                              setStudentSearchResults([]);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 0',
                              alignSelf: 'flex-start',
                            }}
                          >
                            <LinkIcon size={11} />
                            <span>+ Link Child</span>
                          </button>
                        </div>
                      </td>

                      {/* Portal Login Account */}
                      <td style={{ padding: '14px 14px' }}>
                        {hasLogin ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {g.user_account.username}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: isActive ? '#10b981' : '#ef4444',
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isActive ? '#10b981' : '#ef4444',
                                  }}
                                />
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {g.user_account.last_login_at
                                ? `Last login: ${new Date(g.user_account.last_login_at).toLocaleDateString()}`
                                : 'Never logged in'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                              }}
                            >
                              No Login Account
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAccountModalGuardian(g);
                                setAccountModalMode('create');
                                setAccountForm({
                                  username: g.phone || `p_${g.first_name.toLowerCase()}`,
                                  password: 'Parent@123',
                                });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Create
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Login Account Management Menu */}
                          {hasLogin && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleToggleAccountStatus(g)}
                                title={isActive ? 'Deactivate Login' : 'Activate Login'}
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                              >
                                {isActive ? <Unlock size={13} color="#10b981" /> : <Lock size={13} color="#f59e0b" />}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                  setAccountModalGuardian(g);
                                  setAccountModalMode('reset_password');
                                  setAccountForm({ username: g.user_account.username, password: 'Parent@123' });
                                }}
                                title="Reset Password"
                                style={{ padding: '6px 8px', fontSize: '12px' }}
                              >
                                <KeyRound size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleDeleteAccountOnly(g)}
                                title="Revoke Login Account"
                                style={{ padding: '6px 8px', fontSize: '12px', color: '#ef4444' }}
                              >
                                <ShieldAlert size={13} />
                              </button>
                            </>
                          )}

                          {/* Edit Guardian */}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingGuardian(g);
                              setGuardianForm({
                                first_name: g.first_name || '',
                                last_name: g.last_name || '',
                                relationship_type: g.relationship_type || 'father',
                                phone: g.phone || '',
                                email: g.email || '',
                                address: g.address || '',
                                occupation: g.occupation || '',
                                create_account: false,
                                username: '',
                                password: '',
                              });
                              setShowGuardianModal(true);
                            }}
                            title="Edit Details"
                            style={{ padding: '6px 8px', fontSize: '12px' }}
                          >
                            <Edit size={13} />
                          </button>

                          {/* Delete Guardian */}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setDeletingGuardian(g)}
                            title="Delete Guardian Record"
                            style={{ padding: '6px 8px', fontSize: '12px', color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
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

        {/* ─── Pagination Footer ──────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Showing <strong>{guardians.length}</strong> of <strong>{pagination.total}</strong> guardians
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginRight: '6px' }}>
              Page {pagination.page || 1} of {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (pagination.totalPages || 1) || loading}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: BULK GENERATE PARENT ACCOUNTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {showBulkGenModal && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !bulkGenLoading) {
              setShowBulkGenModal(false);
              setBulkGenResult(null);
            }
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '560px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Bulk Create Parent Accounts</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generate official guardian logins from student records</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowBulkGenModal(false); setBulkGenResult(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {bulkGenResult ? (
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span>Bulk Generation Complete!</span>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  <div>• <strong>{bulkGenResult.students_processed}</strong> students evaluated</div>
                  <div>• <strong>{bulkGenResult.guardians_created}</strong> new guardian profiles created</div>
                  <div>• <strong>{bulkGenResult.accounts_created}</strong> parent login accounts generated</div>
                  <div>• <strong>{bulkGenResult.siblings_merged}</strong> sibling pairs merged under single household account</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setShowBulkGenModal(false); setBulkGenResult(null); }}
                  style={{ marginTop: '14px', width: '100%', fontSize: '13px' }}
                >
                  Done & Refresh Directory
                </button>
              </div>
            ) : (
              <div>
                {/* 1. Target Scope Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>1. Target Scope</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${bulkGenScope === 'all' ? 'var(--primary)' : 'var(--border-glass)'}`,
                        background: bulkGenScope === 'all' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={bulkGenScope === 'all'}
                        onChange={() => setBulkGenScope('all')}
                      />
                      <span>All Students ({stats.total_students})</span>
                    </label>

                    <label
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${bulkGenScope === 'classes' ? 'var(--primary)' : 'var(--border-glass)'}`,
                        background: bulkGenScope === 'classes' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                      }}
                    >
                      <input
                        type="radio"
                        name="scope"
                        checked={bulkGenScope === 'classes'}
                        onChange={() => setBulkGenScope('classes')}
                      />
                      <span>By Specific Classes</span>
                    </label>
                  </div>
                </div>

                {/* Class Multi-Select checkboxes when scope === 'classes' */}
                {bulkGenScope === 'classes' && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Select Classes to Process:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                      {activeClasses.map((c) => {
                        const isChecked = bulkGenClassIds.includes(c.class_id);
                        return (
                          <label
                            key={c.class_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12.5px',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) setBulkGenClassIds((prev) => [...prev, c.class_id]);
                                else setBulkGenClassIds((prev) => prev.filter((id) => id !== c.class_id));
                              }}
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Username Strategy */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>2. Login Username Format</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${bulkGenUsernameFormat === 'phone' ? 'var(--primary)' : 'var(--border-glass)'}`,
                        background: bulkGenUsernameFormat === 'phone' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="username_format"
                          checked={bulkGenUsernameFormat === 'phone'}
                          onChange={() => setBulkGenUsernameFormat('phone')}
                        />
                        <span>Mobile Number</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '18px' }}>
                        e.g. 9947535373 (Recommended for SMS login)
                      </div>
                    </label>

                    <label
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${bulkGenUsernameFormat === 'adm_no' ? 'var(--primary)' : 'var(--border-glass)'}`,
                        background: bulkGenUsernameFormat === 'adm_no' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="username_format"
                          checked={bulkGenUsernameFormat === 'adm_no'}
                          onChange={() => setBulkGenUsernameFormat('adm_no')}
                        />
                        <span>Admission No.</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '18px' }}>
                        e.g. p_6005
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Default Password */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>3. Default Initial Password</label>
                  <input
                    type="text"
                    className="input-field"
                    value={bulkGenDefaultPassword}
                    onChange={(e) => setBulkGenDefaultPassword(e.target.value)}
                    style={{ fontSize: '13px' }}
                    placeholder="e.g. Parent@123"
                  />
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Parents can change this password upon first login in the mobile app.
                  </div>
                </div>

                {/* 4. Sibling Merge Toggle */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={bulkGenMergeSiblings}
                      onChange={(e) => setBulkGenMergeSiblings(e.target.checked)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Automatically Merge Sibling Households</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        If two or more students share the same parent mobile number, group them into a single parent account so parents have 1 login.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBulkGenModal(false)}
                    disabled={bulkGenLoading}
                    style={{ fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBulkGenerateSubmit}
                    disabled={bulkGenLoading || (bulkGenScope === 'classes' && bulkGenClassIds.length === 0)}
                    style={{ fontSize: '13px', fontWeight: 700 }}
                  >
                    {bulkGenLoading ? 'Processing Accounts…' : 'Start Bulk Generation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: ADD / EDIT GUARDIAN
      ═══════════════════════════════════════════════════════════════════════ */}
      {showGuardianModal && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !guardianFormLoading) {
              setShowGuardianModal(false);
            }
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '540px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                {editingGuardian ? 'Edit Guardian Details' : 'Add New Guardian Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuardianModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveGuardian}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="input-label">First Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={guardianForm.first_name}
                    onChange={(e) => setGuardianForm({ ...guardianForm, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Last Name / Initial</label>
                  <input
                    type="text"
                    className="input-field"
                    value={guardianForm.last_name}
                    onChange={(e) => setGuardianForm({ ...guardianForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="input-label">Relationship *</label>
                  <select
                    className="input-field"
                    value={guardianForm.relationship_type}
                    onChange={(e) => setGuardianForm({ ...guardianForm, relationship_type: e.target.value })}
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="legal_guardian">Legal Guardian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Mobile Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={guardianForm.phone}
                    onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="input-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="input-field"
                  value={guardianForm.email}
                  onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="input-label">Residential Address</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={guardianForm.address}
                  onChange={(e) => setGuardianForm({ ...guardianForm, address: e.target.value })}
                />
              </div>

              {!editingGuardian && (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={guardianForm.create_account}
                      onChange={(e) => setGuardianForm({ ...guardianForm, create_account: e.target.checked })}
                    />
                    <span>Create Portal / App Login Account</span>
                  </label>
                  {guardianForm.create_account && (
                    <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label className="input-label" style={{ fontSize: '11px' }}>Username (Defaults to Phone)</label>
                        <input
                          type="text"
                          className="input-field"
                          value={guardianForm.username}
                          onChange={(e) => setGuardianForm({ ...guardianForm, username: e.target.value })}
                          placeholder={guardianForm.phone || 'username'}
                        />
                      </div>
                      <div>
                        <label className="input-label" style={{ fontSize: '11px' }}>Password</label>
                        <input
                          type="text"
                          className="input-field"
                          value={guardianForm.password}
                          onChange={(e) => setGuardianForm({ ...guardianForm, password: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowGuardianModal(false)}
                  disabled={guardianFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={guardianFormLoading}
                >
                  {guardianFormLoading ? 'Saving…' : editingGuardian ? 'Update Guardian' : 'Create Guardian'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: ACCOUNT CREATION / PASSWORD RESET
      ═══════════════════════════════════════════════════════════════════════ */}
      {accountModalGuardian && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !accountModalLoading) {
              setAccountModalGuardian(null);
            }
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '460px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  {accountModalMode === 'create' ? 'Create Login Account' : 'Reset Password'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalGuardian(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Guardian: <strong>{accountModalGuardian.full_name}</strong>
              {accountModalGuardian.phone && <div>Mobile: {accountModalGuardian.phone}</div>}
            </div>

            <form onSubmit={handleAccountModalSubmit}>
              {accountModalMode === 'create' && (
                <div style={{ marginBottom: '12px' }}>
                  <label className="input-label">Login Username *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Defaults to guardian's primary phone number.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label className="input-label">
                  {accountModalMode === 'create' ? 'Initial Password *' : 'New Password *'}
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAccountModalGuardian(null)}
                  disabled={accountModalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={accountModalLoading}
                >
                  {accountModalLoading ? 'Saving…' : accountModalMode === 'create' ? 'Create Account' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: LINK SIBLING / STUDENT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {linkModalGuardian && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLinkModalGuardian(null);
            }
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '540px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Link Child to {linkModalGuardian.full_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalGuardian(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Search Student by Name or Admission No</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Type admission number or name…"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Results list */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px' }}>
              {studentSearchLoading ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  Searching students…
                </div>
              ) : studentSearchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  {studentSearchTerm ? 'No matching unlinked students found.' : 'Search for a student above to link.'}
                </div>
              ) : (
                studentSearchResults.map((st) => (
                  <div
                    key={st.student_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-glass)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      marginBottom: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{st.first_name} {st.last_name || ''}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Adm No: {st.admission_number} • Class: {st.class_name || 'N/A'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleLinkStudent(st)}
                      disabled={linkingStudentLoading}
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                    >
                      Link
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLinkModalGuardian(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 5: DELETE GUARDIAN CONFIRMATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {deletingGuardian && createPortal(
        <div
          className="modal-overlay animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteLoading) {
              setDeletingGuardian(null);
            }
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '440px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '14px' }}>
              <AlertCircle size={22} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Confirm Guardian Deletion</h3>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Are you sure you want to delete guardian <strong>{deletingGuardian.full_name}</strong>?
              {deletingGuardian.has_login && (
                <span style={{ display: 'block', marginTop: '6px', color: '#ef4444', fontWeight: 600 }}>
                  Their login account ({deletingGuardian.user_account?.username}) will also be revoked.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingGuardian(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteGuardianSubmit}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting…' : 'Delete Guardian'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
