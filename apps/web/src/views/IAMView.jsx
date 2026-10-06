import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  UserPlus,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Copy,
  Check,
  RefreshCw,
  Bus,
  UtensilsCrossed,
  GraduationCap,
  UserCheck,
  Sparkles,
  Smartphone,
  Laptop,
  Layers,
  ChevronDown,
  X,
  AlertCircle,
  HelpCircle,
  UserCheck2,
  ArrowRight
} from 'lucide-react';
import { UserService, RoleService, StaffService, GuardianService } from '../services/api';

export default function IAMView({ school, staff: initialStaff = [] }) {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'roles' | 'simulation'

  // Data State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionsData, setPermissionsData] = useState({ total: 0, modules: {} });
  const [staffList, setStaffList] = useState(initialStaff);
  const [guardiansList, setGuardiansList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text: '' }

  // Filter State (Accounts Tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null); // user obj
  const [showEditModal, setShowEditModal] = useState(null); // user obj
  const [createError, setCreateError] = useState(null);
  const [resetError, setResetError] = useState(null);
  const [editError, setEditError] = useState(null);

  // Form State: Create User
  const [createSource, setCreateSource] = useState('staff'); // 'staff' | 'guardian' | 'direct'
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role_names: ['bus_driver'],
    is_active: true,
  });

  // Selected Role for Permission Matrix
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [rolePermSelection, setRolePermSelection] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState(false);

  // Simulator State
  const [simulatedRole, setSimulatedRole] = useState('bus_driver');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        UserService.list({ limit: 300 }),
        RoleService.list(),
        RoleService.listPermissions(),
      ]);

      setUsers(usersRes.data?.data?.users || []);
      const roleItems = rolesRes.data?.data || [];
      setRoles(roleItems);
      if (roleItems.length > 0 && !selectedRoleId) {
        setSelectedRoleId(roleItems[0].role_id);
      }
      setPermissionsData(permsRes.data?.data || { total: 0, modules: {} });

      // Fetch staff if not provided
      if (!initialStaff || initialStaff.length === 0) {
        try {
          const staffRes = await StaffService.list({ limit: 300 });
          setStaffList(staffRes.data?.data?.staff || staffRes.data?.data || []);
        } catch (e) {
          console.error('Failed to load staff list', e);
        }
      }

      // Fetch guardians
      try {
        const guardiansRes = await GuardianService.list({ limit: 100 });
        setGuardiansList(guardiansRes.data?.data?.guardians || guardiansRes.data?.data || []);
      } catch (e) {
        console.error('Failed to load guardians list', e);
      }
    } catch (err) {
      console.error('Failed to load IAM data:', err);
      showFeedback('error', 'Failed to load IAM records. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ─── Generate strong random password ───────────────────────────────────────
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = 'Edex@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // ─── Handle Staff Selection for Credential Generator ───────────────────────
  const handleSelectStaff = (staffId) => {
    setSelectedStaffId(staffId);
    setCreateError(null);
    const st = staffList.find((s) => s.staff_id === staffId);
    if (!st) return;

    const baseName = (st.first_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    const desig = (st.designation || '').toLowerCase();
    let suggestedRole = 'non_teaching_staff';

    if (desig.includes('driver')) {
      suggestedRole = 'bus_driver';
    } else if (desig.includes('canteen')) {
      suggestedRole = 'canteen_operator';
    } else if (desig.includes('mentor') || desig.includes('teacher')) {
      suggestedRole = 'teacher';
    } else if (desig.includes('principal') || desig.includes('admin')) {
      suggestedRole = 'school_admin';
    }

    const empCode = (st.employee_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const genUsername = empCode
      ? `${suggestedRole === 'bus_driver' ? 'driver_' : ''}${empCode}`
      : `${baseName}_${Math.floor(100 + Math.random() * 900)}`;

    setFormData((prev) => ({
      ...prev,
      username: genUsername,
      email: st.email || '',
      phone: st.phone || '',
      password: prev.password || generatePassword(),
      role_names: [suggestedRole],
    }));
  };

  // ─── Handle Guardian Selection ─────────────────────────────────────────────
  const handleSelectGuardian = (guardianId) => {
    setSelectedGuardianId(guardianId);
    setCreateError(null);
    const g = guardiansList.find((item) => item.guardian_id === guardianId);
    if (!g) return;

    const baseName = (g.first_name || 'parent').toLowerCase().replace(/[^a-z0-9]/g, '');
    const genUsername = `parent_${baseName}_${Math.floor(100 + Math.random() * 900)}`;

    setFormData((prev) => ({
      ...prev,
      username: genUsername,
      email: g.email || '',
      phone: g.phone || '',
      password: prev.password || generatePassword(),
      role_names: ['parent'],
    }));
  };

  // ─── Create User ───────────────────────────────────────────────────────────
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError(null);

    const trimmedUsername = (formData.username || '').trim();
    if (!trimmedUsername || !formData.password) {
      setCreateError('Username and password are required');
      return;
    }
    if (formData.role_names.length === 0) {
      setCreateError('Please assign at least one role to the user');
      return;
    }

    // Proactive check: staff member already has an account
    if (createSource === 'staff' && selectedStaffId) {
      const existingUser = users.find((u) => u.staff_profile && u.staff_profile.staff_id === selectedStaffId);
      if (existingUser) {
        setCreateError(`This staff member already has an active login account (Username: "${existingUser.username}"). You can reset their password or edit their account instead.`);
        return;
      }
    }

    // Proactive check: guardian already has an account
    if (createSource === 'guardian' && selectedGuardianId) {
      const existingUser = users.find((u) => u.guardian_profile && u.guardian_profile.guardian_id === selectedGuardianId);
      if (existingUser) {
        setCreateError(`This guardian already has an active login account (Username: "${existingUser.username}").`);
        return;
      }
    }

    // Proactive check: username taken locally
    const usernameTaken = users.find((u) => u.username?.toLowerCase() === trimmedUsername.toLowerCase());
    if (usernameTaken) {
      setCreateError(`Username "${trimmedUsername}" is already taken. Please choose a different username.`);
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        username: trimmedUsername,
        password: formData.password,
        email: formData.email ? formData.email.trim() : null,
        phone: formData.phone ? formData.phone.trim() : null,
        role_names: formData.role_names,
        staff_id: createSource === 'staff' ? selectedStaffId || null : null,
        guardian_id: createSource === 'guardian' ? selectedGuardianId || null : null,
      };

      await UserService.create(payload);
      showFeedback('success', `Login account for "${trimmedUsername}" created successfully!`);
      setShowCreateModal(false);
      resetCreateForm();
      await loadAllData();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to create user account';
      setCreateError(errMsg);
      showFeedback('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateSource('staff');
    setSelectedStaffId('');
    setSelectedGuardianId('');
    setCreateError(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: generatePassword(),
      role_names: ['bus_driver'],
      is_active: true,
    });
  };

  // ─── Reset Password ────────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!showResetModal) return;
    setResetError(null);

    setActionLoading(true);
    try {
      const newPwd = showResetModal.temp_password || generatePassword();
      const res = await UserService.resetPassword(showResetModal.user_id, {
        new_password: newPwd,
      });
      const temp = res.data?.data?.temporary_password || newPwd;
      showFeedback('success', `Password for ${showResetModal.username} reset to: ${temp}`);
      setShowResetModal(null);
      setResetError(null);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to reset password';
      setResetError(errMsg);
      showFeedback('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Update User (Edit Modal) ──────────────────────────────────────────────
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!showEditModal) return;
    setEditError(null);

    setActionLoading(true);
    try {
      await UserService.update(showEditModal.user_id, {
        email: showEditModal.email || null,
        phone: showEditModal.phone || null,
        is_active: showEditModal.is_active,
        role_names: showEditModal.roles,
        staff_id: showEditModal.staff_id || null,
        guardian_id: showEditModal.guardian_id || null,
      });

      showFeedback('success', `Account for "${showEditModal.username}" updated!`);
      setShowEditModal(null);
      setEditError(null);
      await loadAllData();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to update user';
      setEditError(errMsg);
      showFeedback('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Toggle User Active ────────────────────────────────────────────────────
  const handleToggleUserActive = async (user) => {
    setActionLoading(true);
    try {
      const nextState = !user.is_active;
      await UserService.update(user.user_id, { is_active: nextState });
      showFeedback('success', `Account ${user.username} is now ${nextState ? 'ACTIVE' : 'DEACTIVATED'}`);
      setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, is_active: nextState } : u)));
    } catch (err) {
      console.error(err);
      showFeedback('error', 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Delete User ───────────────────────────────────────────────────────────
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove login account "${user.username}"?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await UserService.delete(user.user_id);
      showFeedback('success', `User account ${user.username} removed.`);
      await loadAllData();
    } catch (err) {
      console.error(err);
      showFeedback('error', err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Load Role Permissions for Selected Role ───────────────────────────────
  useEffect(() => {
    if (!selectedRoleId) return;
    RoleService.getOne(selectedRoleId)
      .then((res) => {
        const perms = res.data?.data?.permissions || [];
        setRolePermSelection(new Set(perms.map((p) => p.permission_id)));
      })
      .catch((err) => {
        console.error('Error fetching role permissions', err);
      });
  }, [selectedRoleId]);

  const handleTogglePerm = (permId) => {
    setRolePermSelection((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleToggleModulePerms = (permsInModule) => {
    const allSelected = permsInModule.every((p) => rolePermSelection.has(p.permission_id));
    setRolePermSelection((prev) => {
      const next = new Set(prev);
      permsInModule.forEach((p) => {
        if (allSelected) next.delete(p.permission_id);
        else next.add(p.permission_id);
      });
      return next;
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) return;
    const currentRole = roles.find((r) => r.role_id === selectedRoleId);
    if (!currentRole) return;

    setActionLoading(true);
    try {
      await RoleService.updatePermissions(selectedRoleId, Array.from(rolePermSelection));
      showFeedback('success', `Permissions updated for role: ${currentRole.name.toUpperCase()}`);
      await loadAllData();
    } catch (err) {
      console.error(err);
      showFeedback('error', err.response?.data?.message || 'System roles cannot be altered directly or update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Filter Users ──────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const staffName = u.staff_profile
          ? `${u.staff_profile.first_name} ${u.staff_profile.last_name} ${u.staff_profile.employee_id} ${u.staff_profile.designation}`.toLowerCase()
          : '';
        const guardianName = u.guardian_profile
          ? `${u.guardian_profile.first_name} ${u.guardian_profile.last_name}`.toLowerCase()
          : '';
        const matchesUsername = (u.username || '').toLowerCase().includes(term);
        const matchesEmail = (u.email || '').toLowerCase().includes(term);
        const matchesPhone = (u.phone || '').toLowerCase().includes(term);
        if (!matchesUsername && !matchesEmail && !matchesPhone && !staffName.includes(term) && !guardianName.includes(term)) {
          return false;
        }
      }

      if (roleFilter !== 'ALL') {
        if (!u.roles.includes(roleFilter)) return false;
      }

      if (statusFilter !== 'ALL') {
        const isActive = statusFilter === 'ACTIVE';
        if (u.is_active !== isActive) return false;
      }

      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // ─── Role badge styling ────────────────────────────────────────────────────
  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'super_admin':
        return { label: 'SUPER ADMIN', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)', icon: ShieldAlert };
      case 'school_admin':
        return { label: 'SCHOOL ADMIN', bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.25)', icon: ShieldCheck };
      case 'bus_driver':
        return { label: 'BUS DRIVER', bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)', icon: Bus };
      case 'canteen_operator':
        return { label: 'CANTEEN POS', bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)', icon: UtensilsCrossed };
      case 'teacher':
        return { label: 'TEACHER', bg: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: 'rgba(14, 165, 233, 0.25)', icon: GraduationCap };
      case 'parent':
        return { label: 'PARENT', bg: 'rgba(20, 184, 166, 0.12)', color: '#0d9488', border: 'rgba(20, 184, 166, 0.25)', icon: UserCheck };
      default:
        return { label: roleName.toUpperCase().replace('_', ' '), bg: 'rgba(148, 163, 184, 0.12)', color: '#64748b', border: 'rgba(148, 163, 184, 0.25)', icon: Users };
    }
  };

  const currentSelectedRole = roles.find((r) => r.role_id === selectedRoleId);
  const activeSelectedStaff = staffList.find((s) => s.staff_id === selectedStaffId);
  const existingUserForStaff = selectedStaffId
    ? users.find((u) => u.staff_profile && u.staff_profile.staff_id === selectedStaffId)
    : null;
  const existingUserForGuardian = selectedGuardianId
    ? users.find((u) => u.guardian_profile && u.guardian_profile.guardian_id === selectedGuardianId)
    : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* Floating Feedback Notification */}
      {feedback && createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000001,
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'modalIn 0.2s ease',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {feedback.text}
        </div>,
        document.body
      )}

      {/* ─── Top Header Section ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1.5px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-heading)', margin: 0 }}>
              Identity & Access Management (IAM)
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
              Single identity directory, login credentials generator, and dynamic role-based access control.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Primary Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('accounts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                background: activeTab === 'accounts' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'accounts' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={16} />
              User Accounts ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                background: activeTab === 'roles' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'roles' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={16} />
              Roles & Permissions ({roles.length})
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                background: activeTab === 'simulation' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'simulation' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={16} />
              Role Simulator
            </button>
          </div>

          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '13.5px',
              fontWeight: 700,
              gap: '8px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
            }}
          >
            <UserPlus size={16} />
            Issue Credentials
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 1: ACCOUNTS & CREDENTIAL DIRECTORY
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* KPI Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            
            {/* Card 1: Total Users */}
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Total Identities
                </div>
                <div style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-heading)', marginTop: '4px' }}>
                  {users.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Registered platform logins
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} />
              </div>
            </div>

            {/* Card 2: Active Logins */}
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Logins
                </div>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {users.filter((u) => u.is_active).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {users.filter((u) => !u.is_active).length} deactivated accounts
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={20} />
              </div>
            </div>

            {/* Card 3: Transport Drivers */}
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Transport Drivers
                </div>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {users.filter((u) => u.roles.includes('bus_driver')).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Mobile GPS trip access
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bus size={20} />
              </div>
            </div>

            {/* Card 4: Staff Directory Linked */}
            <div
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Staff Linked
                </div>
                <div style={{ fontSize: '30px', fontWeight: 800, color: '#06b6d4', marginTop: '4px' }}>
                  {users.filter((u) => u.staff_profile).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Tied to HR employment
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  color: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck2 size={20} />
              </div>
            </div>

          </div>

          {/* Search & Filter Toolbar */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Search Input Box */}
            <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search username, staff name, employee ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="iam-input"
                style={{ paddingLeft: '38px', height: '40px', minHeight: '40px' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
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

            {/* Filters on Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="iam-select"
                  style={{ width: '170px', height: '40px', minHeight: '40px', fontSize: '13px' }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="bus_driver">Bus Driver</option>
                  <option value="canteen_operator">Canteen Operator</option>
                  <option value="teacher">Teacher</option>
                  <option value="school_admin">School Admin</option>
                  <option value="parent">Parent</option>
                  <option value="non_teaching_staff">Non-Teaching</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="iam-select"
                  style={{ width: '130px', height: '40px', minHeight: '40px', fontSize: '13px' }}
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Deactivated</option>
                </select>
              </div>

              <button
                onClick={loadAllData}
                className="btn btn-secondary"
                title="Refresh user accounts"
                style={{ height: '40px', width: '40px', padding: 0, borderRadius: '10px' }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* User Logins Table */}
          <div
            className="glass-panel"
            style={{
              padding: 0,
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '1020px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ width: '25%', padding: '14px 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      ACCOUNT IDENTITY
                    </th>
                    <th style={{ width: '18%', padding: '14px 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      ASSIGNED ROLE
                    </th>
                    <th style={{ width: '21%', padding: '14px 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      LINKED PROFILE
                    </th>
                    <th style={{ width: '11%', padding: '14px 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      LOGIN STATUS
                    </th>
                    <th style={{ width: '13%', padding: '14px 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      LAST LOGIN
                    </th>
                    <th style={{ width: '220px', minWidth: '220px', padding: '14px 20px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'right' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Users size={36} style={{ opacity: 0.3 }} />
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>No accounts match the current filter criteria</span>
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setRoleFilter('ALL');
                              setStatusFilter('ALL');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: '4px' }}
                          >
                            Clear Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      return (
                        <tr
                          key={u.user_id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--table-row-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {/* Account Identity */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '12px',
                                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '14px',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  flexShrink: 0,
                                }}
                              >
                                {u.username.substring(0, 2).toUpperCase()}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '14px' }}>
                                  {u.username}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {u.email || u.phone || 'No direct phone/email'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Assigned Roles */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {u.roles.map((r) => {
                                const badge = getRoleBadge(r);
                                const Icon = badge.icon;
                                return (
                                  <span
                                    key={r}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '4px 9px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      background: badge.bg,
                                      color: badge.color,
                                      border: `1px solid ${badge.border}`,
                                    }}
                                  >
                                    <Icon size={12} />
                                    {badge.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Linked Profile */}
                          <td style={{ padding: '14px 20px' }}>
                            {u.staff_profile ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '13px' }}>
                                    {u.staff_profile.first_name} {u.staff_profile.last_name}
                                  </span>
                                  {u.staff_profile.employee_id && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        background: 'var(--bg-surface-elevated)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-subtle)',
                                      }}
                                    >
                                      {u.staff_profile.employee_id}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {u.staff_profile.designation}
                                </div>
                              </div>
                            ) : u.guardian_profile ? (
                              <div>
                                <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '13px' }}>
                                  {u.guardian_profile.first_name} {u.guardian_profile.last_name}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Guardian ({u.guardian_profile.relationship_type || 'Parent'})
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                System Direct Account
                              </span>
                            )}
                          </td>

                          {/* Login Status */}
                          <td style={{ padding: '14px 20px' }}>
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              disabled={actionLoading}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                background: u.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: u.is_active ? '#10b981' : '#ef4444',
                              }}
                              title="Click to toggle active status"
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: u.is_active ? '#10b981' : '#ef4444',
                                }}
                              />
                              {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                            </button>
                          </td>

                          {/* Last Login */}
                          <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never logged in'}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '12px 20px', textAlign: 'right', width: '220px', minWidth: '220px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexShrink: 0 }}>
                              <button
                                onClick={() => {
                                  setResetError(null);
                                  setShowResetModal({ ...u, temp_password: generatePassword() });
                                }}
                                style={{
                                  padding: '0 12px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  height: '32px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  whiteSpace: 'nowrap',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.28)',
                                  color: '#d97706',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                                  e.currentTarget.style.borderColor = '#f59e0b';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.28)';
                                }}
                                title="Reset account password"
                              >
                                <Key size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                                <span>Reset Pwd</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditError(null);
                                  setShowEditModal({ ...u });
                                }}
                                style={{
                                  height: '32px',
                                  width: '32px',
                                  minWidth: '32px',
                                  padding: 0,
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  border: '1px solid rgba(99, 102, 241, 0.28)',
                                  color: 'var(--primary)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)';
                                  e.currentTarget.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.28)';
                                }}
                                title="Edit user roles & profile"
                              >
                                <Edit3 size={14} style={{ flexShrink: 0 }} />
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u)}
                                style={{
                                  height: '32px',
                                  width: '32px',
                                  minWidth: '32px',
                                  padding: 0,
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(244, 63, 94, 0.1)',
                                  border: '1px solid rgba(244, 63, 94, 0.28)',
                                  color: 'var(--accent-rose)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.22)';
                                  e.currentTarget.style.borderColor = 'var(--accent-rose)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.28)';
                                }}
                                title="Deactivate & remove account"
                              >
                                <Trash2 size={14} style={{ flexShrink: 0 }} />
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

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 2: DYNAMIC ROLES & PERMISSION MATRIX
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Roles Roster Sidebar */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Platform Roles</h3>
              <span className="badge badge-primary">{roles.length} Roles</span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Select a role to inspect and configure its capabilities across all EDEX modules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {roles.map((r) => {
                const isSelected = r.role_id === selectedRoleId;
                const badge = getRoleBadge(r.name);
                const Icon = badge.icon;
                return (
                  <div
                    key={r.role_id}
                    onClick={() => setSelectedRoleId(r.role_id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-elevated)',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={16} color={badge.color} />
                        <span style={{ fontWeight: 800, fontSize: '13px', color: isSelected ? 'var(--text-heading)' : 'var(--text-primary)' }}>
                          {r.name.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: r.is_system_role ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: r.is_system_role ? 'var(--primary)' : '#10b981',
                        }}
                      >
                        {r.is_system_role ? 'SYSTEM' : 'CUSTOM'}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {r.description || 'Standard role definition'}
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      🔒 {r.permissions_count || 0} permissions assigned
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Area: Permission Matrix for Selected Role */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentSelectedRole ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                        Role: {currentSelectedRole.name.replace('_', ' ').toUpperCase()}
                      </h2>
                      <span className="badge badge-emerald">
                        {rolePermSelection.size} Permissions Granted
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                      {currentSelectedRole.description}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveRolePermissions}
                    disabled={actionLoading || currentSelectedRole.is_system_role}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: currentSelectedRole.is_system_role ? 0.6 : 1,
                      cursor: currentSelectedRole.is_system_role ? 'not-allowed' : 'pointer',
                    }}
                    title={currentSelectedRole.is_system_role ? 'System core roles are protected from direct modification' : 'Save changes to database'}
                  >
                    <Check size={16} />
                    {currentSelectedRole.is_system_role ? 'System Role (Protected)' : 'Save Role Permissions'}
                  </button>
                </div>

                {/* Module Permission Groups */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {Object.entries(permissionsData.modules || {}).map(([moduleName, perms]) => {
                    const modulePermCount = perms.filter((p) => rolePermSelection.has(p.permission_id)).length;
                    const allInMod = perms.every((p) => rolePermSelection.has(p.permission_id));

                    return (
                      <div
                        key={moduleName}
                        style={{
                          borderRadius: '14px',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface-elevated)',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Module Header */}
                        <div
                          style={{
                            padding: '12px 18px',
                            background: 'var(--table-header-bg)',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-heading)' }}>
                              Module: {moduleName.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ({modulePermCount} of {perms.length} active)
                            </span>
                          </div>

                          {!currentSelectedRole.is_system_role && (
                            <button
                              type="button"
                              onClick={() => handleToggleModulePerms(perms)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {allInMod ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>

                        {/* Permissions Grid */}
                        <div
                          style={{
                            padding: '14px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {perms.map((p) => {
                            const isChecked = rolePermSelection.has(p.permission_id);
                            return (
                              <label
                                key={p.permission_id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
                                  border: isChecked ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                                  cursor: currentSelectedRole.is_system_role ? 'default' : 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={currentSelectedRole.is_system_role}
                                  onChange={() => handleTogglePerm(p.permission_id)}
                                  style={{ marginTop: '2px', accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: isChecked ? 'var(--text-heading)' : 'var(--text-secondary)' }}>
                                    {p.name}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: '2px' }}>
                                    {p.description}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Select a role from the left roster to view and configure its permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 3: EXPERIENCE & ROLE SIMULATOR
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'simulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            className="glass-panel"
            style={{
              padding: '20px 24px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Role Experience Simulator</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Test and verify exactly what each role sees across both the <strong>Flutter Mobile App</strong> and the <strong>Web Dashboard</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Simulate Experience As:</span>
              <select
                value={simulatedRole}
                onChange={(e) => setSimulatedRole(e.target.value)}
                className="iam-select"
                style={{ width: '220px', height: '42px', fontWeight: 800 }}
              >
                <option value="bus_driver">🚌 Bus Driver</option>
                <option value="canteen_operator">🍲 Canteen Operator</option>
                <option value="parent">👨‍👩‍👧 Parent / Guardian</option>
                <option value="teacher">👩‍🏫 Teacher</option>
                <option value="school_admin">🏛️ School Administrator</option>
              </select>
            </div>
          </div>

          {/* Simulator Visualizer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '24px' }}>
            
            {/* Mobile App Device Frame */}
            <div
              style={{
                borderRadius: '36px',
                border: '10px solid #1e293b',
                background: '#090d16',
                boxShadow: 'var(--shadow-lg)',
                padding: '24px 18px',
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <div style={{ width: '60px', height: '5px', background: '#334155', borderRadius: '4px', margin: '0 auto 16px auto' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 800, letterSpacing: '0.05em' }}>EDEX MOBILE APP</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    {simulatedRole === 'bus_driver' && 'Driver Trip Console'}
                    {simulatedRole === 'canteen_operator' && 'Canteen POS & Orders'}
                    {simulatedRole === 'parent' && 'Parent Guardian Hub'}
                    {simulatedRole === 'teacher' && 'Teacher Class Roll'}
                    {simulatedRole === 'school_admin' && 'Admin Executive View'}
                  </div>
                </div>
                <Smartphone size={20} color="#818cf8" />
              </div>

              {simulatedRole === 'bus_driver' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bus size={16} /> LIVE ROUTE NAVIGATION
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Assigned to Route #04 (Morning Trip). GPS live broadcasting active.
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                      Passenger Attendance
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      32 students assigned along 8 stops. Tap to mark onboard/alighted.
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
                      🚫 STRICT ACCESS CONTROL
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      Driver has ZERO access to student records, grades, canteen, or finance modules.
                    </div>
                  </div>
                </div>
              )}

              {simulatedRole === 'parent' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bus size={16} /> LIVE BUS TRACKER
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Live GPS map of Child's bus: ETA to your stop is 6 mins.
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                      Canteen Wallet
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Balance: ₹ 450.00 • Top-up & dietary limits.
                    </div>
                  </div>
                </div>
              )}

              {simulatedRole === 'canteen_operator' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UtensilsCrossed size={16} /> POS COUNTER SCANNER
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Scan student RFID/Barcode to debit wallet & fulfill orders.
                    </div>
                  </div>
                </div>
              )}

              {simulatedRole === 'school_admin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#818cf8' }}>
                      FULL ACCESS CONTROL
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Access to all school modules, analytics, and staff administration.
                    </div>
                  </div>
                </div>
              )}

              {simulatedRole === 'teacher' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>
                      ACADEMIC ROSTER
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                      Attendance marking, subject grading, and class announcements.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Web ERP Navigation & Security Analysis */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Laptop size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Web ERP Module Visibility Breakdown</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                
                {/* Module 1: Transport */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px' }}>Transport / Bus</span>
                    {['bus_driver', 'school_admin', 'parent'].includes(simulatedRole) ? (
                      <span className="badge badge-emerald">ALLOWED</span>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}>BLOCKED</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                    {simulatedRole === 'bus_driver'
                      ? 'Full trip & passenger route access'
                      : simulatedRole === 'parent'
                      ? 'Child bus tracking only'
                      : simulatedRole === 'school_admin'
                      ? 'Full fleet & route management'
                      : 'No access granted'}
                  </p>
                </div>

                {/* Module 2: Canteen */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px' }}>Canteen & POS</span>
                    {['canteen_operator', 'school_admin', 'parent'].includes(simulatedRole) ? (
                      <span className="badge badge-emerald">ALLOWED</span>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}>BLOCKED</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                    {simulatedRole === 'canteen_operator'
                      ? 'POS register & order dispatch'
                      : simulatedRole === 'parent'
                      ? 'Child wallet balance & topup'
                      : simulatedRole === 'school_admin'
                      ? 'Menu & transactions ledger'
                      : 'No access granted'}
                  </p>
                </div>

                {/* Module 3: Core Foundation */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px' }}>Core Foundation</span>
                    {['school_admin', 'teacher'].includes(simulatedRole) ? (
                      <span className="badge badge-emerald">ALLOWED</span>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}>BLOCKED</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                    {simulatedRole === 'school_admin'
                      ? 'Students, classes, staff directory'
                      : simulatedRole === 'teacher'
                      ? 'Assigned classes and students'
                      : 'Drivers & Parents cannot view ERP foundation'}
                  </p>
                </div>

                {/* Module 4: IAM Security */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px' }}>IAM & RBAC</span>
                    {['school_admin'].includes(simulatedRole) ? (
                      <span className="badge badge-emerald">ADMIN ONLY</span>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)' }}>BLOCKED</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                    Only school administrators can issue credentials, reset passwords, and manage roles.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: ISSUE NEW LOGIN CREDENTIALS
      ────────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: '620px',
              padding: '28px 32px',
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                    border: '1.5px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                    Issue Login Credentials
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                    Generate an authenticated account for staff (driver, teacher) or parent.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inline Error Alert Banner */}
            {createError && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '18px',
                  lineHeight: 1.5,
                  animation: 'modalIn 0.2s ease',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
                <div style={{ flex: 1 }}>{createError}</div>
                <button
                  type="button"
                  onClick={() => setCreateError(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: 0,
                    opacity: 0.7,
                  }}
                  title="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Source Type Selector Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setCreateSource('staff');
                  setSelectedGuardianId('');
                }}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: createSource === 'staff' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: createSource === 'staff' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-elevated)',
                  color: createSource === 'staff' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Users size={18} />
                <span>From Staff</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateSource('guardian');
                  setSelectedStaffId('');
                  setFormData((prev) => ({ ...prev, role_names: ['parent'] }));
                }}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: createSource === 'guardian' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: createSource === 'guardian' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-elevated)',
                  color: createSource === 'guardian' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <UserCheck size={18} />
                <span>From Guardian</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateSource('direct');
                  setSelectedStaffId('');
                  setSelectedGuardianId('');
                  setFormData((prev) => ({ ...prev, role_names: ['school_admin'] }));
                }}
                style={{
                  padding: '12px 10px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: createSource === 'direct' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: createSource === 'direct' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-elevated)',
                  color: createSource === 'direct' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShieldCheck size={18} />
                <span>Direct Admin</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Staff Selector */}
              {createSource === 'staff' && (
                <div>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Select Staff Member *
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => handleSelectStaff(e.target.value)}
                    className="iam-select"
                    required
                  >
                    <option value="">-- Choose Staff Member (Drivers, Teachers, Staff) --</option>
                    {staffList.map((s) => (
                      <option key={s.staff_id} value={s.staff_id}>
                        {s.first_name} {s.last_name} ({s.employee_id || 'No ID'}) — {s.designation}
                      </option>
                    ))}
                  </select>

                  {/* Staff Info preview chip & Duplicate Warning */}
                  {activeSelectedStaff && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong>{activeSelectedStaff.first_name} {activeSelectedStaff.last_name}</strong>
                          <span style={{ color: 'var(--text-muted)' }}> • {activeSelectedStaff.designation}</span>
                        </div>
                        <span className="badge badge-primary">{activeSelectedStaff.employee_id || 'STAFF'}</span>
                      </div>

                      {existingUserForStaff && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#d97706',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <AlertCircle size={15} style={{ flexShrink: 0 }} />
                          <span>
                            Account already exists (<strong>{existingUserForStaff.username}</strong>). Reset password or edit instead.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Guardian Selector */}
              {createSource === 'guardian' && (
                <div>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Select Guardian / Parent *
                  </label>
                  <select
                    value={selectedGuardianId}
                    onChange={(e) => handleSelectGuardian(e.target.value)}
                    className="iam-select"
                    required
                  >
                    <option value="">-- Choose Guardian --</option>
                    {guardiansList.map((g) => (
                      <option key={g.guardian_id} value={g.guardian_id}>
                        {g.first_name} {g.last_name} ({g.relationship_type || 'Parent'}) — {g.phone || 'No Phone'}
                      </option>
                    ))}
                  </select>

                  {existingUserForGuardian && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: '#d97706',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>
                        Account already exists for this guardian (<strong>{existingUserForGuardian.username}</strong>).
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Username Field */}
              <div>
                <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                  Login Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g. driver_drvr14 or rajesh_kumar"
                  className="iam-input"
                  required
                />
              </div>

              {/* Email & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@school.com"
                    className="iam-input"
                  />
                </div>
                <div>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="iam-input"
                  />
                </div>
              </div>

              {/* Role Selection Tiles */}
              <div>
                <label className="input-label" style={{ fontWeight: 700, marginBottom: '8px' }}>
                  Assigned Roles *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {roles.map((r) => {
                    const isChecked = formData.role_names.includes(r.name);
                    const badge = getRoleBadge(r.name);
                    const Icon = badge.icon;
                    return (
                      <div
                        key={r.role_id}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            role_names: isChecked
                              ? prev.role_names.filter((rn) => rn !== r.name)
                              : [...prev.role_names, r.name],
                          }));
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-elevated)',
                          border: isChecked ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            border: isChecked ? 'none' : '1.5px solid var(--border-subtle)',
                            background: isChecked ? 'var(--primary)' : 'transparent',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <Icon size={16} color={badge.color} />
                        <span style={{ fontSize: '12.5px', fontWeight: isChecked ? 800 : 600, color: isChecked ? 'var(--text-heading)' : 'var(--text-primary)' }}>
                          {r.name.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Password Setting Card */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ fontWeight: 700, margin: 0 }}>
                    Initial Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: generatePassword() })}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🎲 Regenerate
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="iam-input"
                    style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Username: ${formData.username}\nPassword: ${formData.password}`);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="btn btn-secondary"
                    style={{ height: '42px', padding: '0 16px', borderRadius: '10px', whiteSpace: 'nowrap', gap: '6px' }}
                  >
                    {copiedKey ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ borderRadius: '10px', padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{
                    borderRadius: '10px',
                    padding: '10px 22px',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                    gap: '8px',
                  }}
                >
                  <Check size={16} />
                  {actionLoading ? 'Creating...' : 'Create & Issue Credentials'}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: RESET PASSWORD
      ────────────────────────────────────────────────────────────────────────── */}
      {showResetModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '26px',
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                    Reset Password
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    User: <strong>{showResetModal.username}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowResetModal(null)}
                className="btn btn-ghost"
                style={{ width: '30px', height: '30px', padding: 0, borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {resetError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>
                  New Temporary Password
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={showResetModal.temp_password || ''}
                    onChange={(e) => setShowResetModal({ ...showResetModal, temp_password: e.target.value })}
                    className="iam-input"
                    style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetModal({ ...showResetModal, temp_password: generatePassword() })}
                    className="btn btn-secondary"
                    title="Generate new password"
                    style={{ width: '42px', height: '42px', padding: 0, borderRadius: '10px' }}
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(null)}
                  className="btn btn-secondary"
                  style={{ borderRadius: '10px', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ borderRadius: '10px', padding: '8px 18px', gap: '6px' }}
                >
                  <Check size={15} />
                  {actionLoading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: EDIT USER & ROLES
      ────────────────────────────────────────────────────────────────────────── */}
      {showEditModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '26px',
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                  Edit User: {showEditModal.username}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Update user roles, contact information, and active status.
                </p>
              </div>

              <button
                onClick={() => setShowEditModal(null)}
                className="btn btn-ghost"
                style={{ width: '30px', height: '30px', padding: 0, borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>Email</label>
                  <input
                    type="email"
                    value={showEditModal.email || ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, email: e.target.value })}
                    className="iam-input"
                  />
                </div>
                <div>
                  <label className="input-label" style={{ fontWeight: 700, marginBottom: '6px' }}>Phone</label>
                  <input
                    type="tel"
                    value={showEditModal.phone || ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, phone: e.target.value })}
                    className="iam-input"
                  />
                </div>
              </div>

              {/* Roles */}
              <div>
                <label className="input-label" style={{ fontWeight: 700, marginBottom: '8px' }}>Assigned Roles</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {roles.map((r) => {
                    const isChecked = (showEditModal.roles || []).includes(r.name);
                    const badge = getRoleBadge(r.name);
                    const Icon = badge.icon;
                    return (
                      <div
                        key={r.role_id}
                        onClick={() => {
                          setShowEditModal((prev) => ({
                            ...prev,
                            roles: isChecked
                              ? (prev.roles || []).filter((rn) => rn !== r.name)
                              : [...(prev.roles || []), r.name],
                          }));
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface-elevated)',
                          border: isChecked ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            border: isChecked ? 'none' : '1.5px solid var(--border-subtle)',
                            background: isChecked ? 'var(--primary)' : 'transparent',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <Icon size={16} color={badge.color} />
                        <span style={{ fontSize: '12.5px', fontWeight: isChecked ? 800 : 600 }}>
                          {r.name.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle Switch */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showEditModal.is_active}
                  onChange={(e) => setShowEditModal({ ...showEditModal, is_active: e.target.checked })}
                  style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Account Active & Allowed to Sign In</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="btn btn-secondary"
                  style={{ borderRadius: '10px', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ borderRadius: '10px', padding: '8px 18px', gap: '6px' }}
                >
                  <Check size={15} />
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
