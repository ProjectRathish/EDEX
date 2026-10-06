import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  ShieldCheck,
  Plus,
  Search,
  KeyRound,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Users,
  Layers,
  Sparkles,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Lock,
  User,
  Power,
  X,
  Send,
  Check,
  Compass
} from 'lucide-react';
import { SchoolService, EnquiryService, AuthService } from '../services/api';

export default function SuperAdminView({
  currentUser,
  currentSchool,
  onSelectSchool,
  refreshGlobalData,
  activeSubTab: propActiveSubTab,
  setActiveSubTab: propSetActiveSubTab
}) {
  const [localSubTab, setLocalSubTab] = useState('schools');
  const activeSubTab = propActiveSubTab || localSubTab;
  const setActiveSubTab = propSetActiveSubTab || setLocalSubTab;

  // Schools state
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // School Modals
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  // Form states
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    phone: '',
    email: '',
    timezone: 'Asia/Kolkata',
    admin_username: '',
    admin_password: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Password reset state
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [resetSuccessData, setResetSuccessData] = useState(null);

  // Enquiries state
  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('pending');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    custom_school_name: '',
    custom_school_code: '',
    admin_username: '',
    admin_password: 'AdminPass123!',
    admin_notes: '',
  });
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [provisionedData, setProvisionedData] = useState(null);

  // Super Admin Profile State
  const [profileForm, setProfileForm] = useState({
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);

  useEffect(() => {
    loadSchools();
    loadEnquiries();
  }, []);

  const loadSchools = async () => {
    setSchoolsLoading(true);
    try {
      const res = await SchoolService.list();
      setSchools(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadEnquiries = async () => {
    setEnquiriesLoading(true);
    try {
      const res = await EnquiryService.list();
      setEnquiries(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching enquiries:', err);
    } finally {
      setEnquiriesLoading(false);
    }
  };

  // ─── School Actions ────────────────────────────────────────────────────────
  const handleOpenCreateModal = async () => {
    let autoCode = 'SSA0001';
    try {
      const res = await SchoolService.getNextCode();
      if (res.data?.data?.code) {
        autoCode = res.data.data.code;
      }
    } catch (err) {
      console.error('Error getting next school code:', err);
    }

    setSchoolForm({
      name: '',
      code: autoCode,
      address: '',
      city: '',
      state: '',
      country: 'India',
      phone: '',
      email: '',
      timezone: 'Asia/Kolkata',
      admin_username: `admin_${autoCode.toLowerCase()}`,
      admin_password: 'AdminPass123!',
    });
    setModalError('');
    setModalSuccess('');
    setShowCreateSchoolModal(true);
  };

  const handleCreateSchoolSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const res = await SchoolService.create(schoolForm);
      setModalSuccess(res.data?.message || 'School created successfully!');
      setTimeout(() => {
        setShowCreateSchoolModal(false);
        loadSchools();
        if (refreshGlobalData) refreshGlobalData();
      }, 1200);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create school.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEditModal = (school) => {
    setSelectedSchool(school);
    setSchoolForm({
      name: school.name || '',
      code: school.code || '',
      address: school.address || '',
      city: school.city || '',
      state: school.state || '',
      country: school.country || 'India',
      phone: school.phone || '',
      email: school.email || '',
      timezone: school.timezone || 'Asia/Kolkata',
      is_active: Boolean(school.is_active),
    });
    setModalError('');
    setModalSuccess('');
    setShowEditSchoolModal(true);
  };

  const handleEditSchoolSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const res = await SchoolService.update(selectedSchool.school_id, schoolForm);
      setModalSuccess(res.data?.message || 'School details updated!');
      setTimeout(() => {
        setShowEditSchoolModal(false);
        loadSchools();
        if (refreshGlobalData) refreshGlobalData();
      }, 1000);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update school.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (school) => {
    try {
      await SchoolService.toggleStatus(school.school_id, !school.is_active);
      loadSchools();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteSchool = async (school) => {
    if (!window.confirm(`Are you sure you want to delete school "${school.name}"? This action will disable student and staff logins.`)) {
      return;
    }
    try {
      await SchoolService.delete(school.school_id);
      loadSchools();
      if (refreshGlobalData) refreshGlobalData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete school');
    }
  };

  const handleOpenResetPasswordModal = (school) => {
    setSelectedSchool(school);
    setNewAdminPassword('NewAdminPass123!');
    setResetSuccessData(null);
    setModalError('');
    setShowResetPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const res = await SchoolService.resetAdminPassword(
        selectedSchool.school_id,
        newAdminPassword,
        selectedSchool.admin_user_id
      );
      setResetSuccessData({
        username: selectedSchool.admin_username || 'admin',
        password: newAdminPassword,
      });
      loadSchools();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Enquiry Actions ───────────────────────────────────────────────────────
  const handleOpenApproveModal = async (enquiry) => {
    setSelectedEnquiry(enquiry);
    let suggestedCode = enquiry.proposed_code;
    if (!suggestedCode) {
      try {
        const res = await SchoolService.getNextCode();
        if (res.data?.data?.code) {
          suggestedCode = res.data.data.code;
        }
      } catch (err) {
        suggestedCode = 'SSA0001';
      }
    }
    if (!suggestedCode) suggestedCode = 'SSA0001';

    setApprovalForm({
      custom_school_name: enquiry.school_name,
      custom_school_code: suggestedCode,
      admin_username: `admin_${suggestedCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      admin_password: 'AdminPass123!',
      admin_notes: 'Approved by Super Admin',
    });
    setProvisionedData(null);
    setModalError('');
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const res = await EnquiryService.approve(selectedEnquiry.enquiry_id, approvalForm);
      setProvisionedData(res.data?.data);
      loadEnquiries();
      loadSchools();
      if (refreshGlobalData) refreshGlobalData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Approval failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenRejectModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setRejectionNotes('Requirements do not match platform scope currently.');
    setModalError('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      await EnquiryService.reject(selectedEnquiry.enquiry_id, { admin_notes: rejectionNotes });
      setShowRejectModal(false);
      loadEnquiries();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Profile & Security ────────────────────────────────────────────────────
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    try {
      await AuthService.updateProfile(profileForm);
      setProfileSuccess('Profile details updated successfully!');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      await AuthService.changePassword(passwordForm.current_password, passwordForm.new_password);
      setPasswordSuccess('Super Admin password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Password update failed. Verify current password.');
    }
  };

  // Safe array references
  const safeSchools = Array.isArray(schools) ? schools : [];
  const safeEnquiries = Array.isArray(enquiries) ? enquiries : [];

  // Filtered schools
  const filteredSchools = safeSchools.filter((s) => {
    if (!s) return false;
    const search = (schoolSearch || '').toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(search) ||
      (s.code || '').toLowerCase().includes(search) ||
      (s.city && s.city.toLowerCase().includes(search));

    if (statusFilter === 'active') return matchesSearch && !!s.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !s.is_active;
    return matchesSearch;
  });

  // Filtered enquiries
  const filteredEnquiries = safeEnquiries.filter((e) => {
    if (!e) return false;
    if (enquiryStatusFilter === 'all') return true;
    return e.status === enquiryStatusFilter;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner */}
      <div style={{
        padding: '24px 32px',
        borderRadius: 'var(--radius-xl)',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
          }}>
            <ShieldCheck size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Super Admin Command Center</h1>
              <span className="badge badge-primary">SYSTEM ROOT</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Platform-level multi-tenant control, school provisioning, enquiries approval & security.
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-subtle-box)', padding: '6px', borderRadius: 'var(--radius-lg)' }}>
          <button
            className={`btn btn-sm ${activeSubTab === 'schools' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('schools')}
          >
            <Building2 size={15} />
            <span>Schools Directory ({safeSchools.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'enquiries' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('enquiries')}
          >
            <Mail size={15} />
            <span>
              Enquiries ({safeEnquiries.filter((e) => e.status === 'pending').length} New)
            </span>
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('profile')}
          >
            <User size={15} />
            <span>Profile & Security</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SCHOOLS DIRECTORY                                                */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'schools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Metrics Cards */}
          <div className="grid-3">
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL SCHOOLS</div>
                <div style={{ fontSize: '26px', fontWeight: 800 }}>{safeSchools.length}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE TENANTS</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  {safeSchools.filter((s) => !!s.is_active).length}
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING ENQUIRIES</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  {safeEnquiries.filter((e) => e.status === 'pending').length}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar: Search, Filter, Add School Button */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by school name, code, or city..."
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'active', 'inactive'].map((st) => (
                  <button
                    key={st}
                    className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setStatusFilter(st)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={16} />
              <span>Register New School</span>
            </button>
          </div>

          {/* Schools Table */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>School Name & Code</th>
                    <th>Location & Contact</th>
                    <th>Administrator</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolsLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--primary)' }} />
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading registered institutions...</div>
                      </td>
                    </tr>
                  ) : filteredSchools.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No schools found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredSchools.map((s) => (
                      <tr key={s.school_id} style={{ cursor: 'pointer' }}>
                        <td onClick={() => handleOpenEditModal(s)}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                            {s.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="badge badge-primary" style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                              {s.code}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Joined {new Date(s.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td onClick={() => handleOpenEditModal(s)}>
                          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} color="var(--text-muted)" />
                            <span>{s.city ? `${s.city}, ${s.state || ''}` : 'Location Unset'}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {s.email || s.phone || 'No direct contact'}
                          </div>
                        </td>

                        <td onClick={() => handleOpenEditModal(s)}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} />
                            <span>{s.admin_username || 'No Admin Assigned'}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Role: school_admin
                          </div>
                        </td>

                        <td onClick={() => handleOpenEditModal(s)}>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                            <strong>{s.student_count || 0}</strong> Students
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {s.staff_count || 0} Staff Members
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge ${s.is_active ? 'badge-emerald' : 'badge-rose'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleStatus(s)}
                            title="Click to toggle status"
                          >
                            {s.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* Switch to School Workspace */}
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Enter and inspect School Workspace"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectSchool) onSelectSchool(s);
                              }}
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                            >
                              <ExternalLink size={13} color="var(--primary)" />
                              <span>Inspect</span>
                            </button>

                            {/* Dialogue Box / Edit Details */}
                            <button
                              className="btn-icon"
                              title="Edit School Details"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(s);
                              }}
                            >
                              <Edit size={15} color="var(--text-secondary)" />
                            </button>

                            {/* Reset Admin Password */}
                            <button
                              className="btn-icon"
                              title="Reset School Admin Password"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenResetPasswordModal(s);
                              }}
                            >
                              <KeyRound size={15} color="var(--accent-amber)" />
                            </button>

                            {/* Delete / Soft Delete */}
                            <button
                              className="btn-icon"
                              title="Delete School"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchool(s);
                              }}
                            >
                              <Trash2 size={15} color="var(--accent-rose)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ONBOARDING ENQUIRIES                                             */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'enquiries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>School Registration Enquiries</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Review onboarding requests from prospective schools and 1-click auto-provision their tenant & admin credentials.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['pending', 'approved', 'rejected', 'all'].map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${enquiryStatusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setEnquiryStatusFilter(st)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st} ({enquiries.filter((e) => st === 'all' || e.status === st).length})
                </button>
              ))}
            </div>
          </div>

          {enquiriesLoading ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--primary)' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading onboarding pipeline...</div>
            </div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No enquiries in <strong>{enquiryStatusFilter}</strong> state.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {filteredEnquiries.map((enq) => (
                <div key={enq.enquiry_id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <span className={`badge ${
                          enq.status === 'approved' ? 'badge-emerald' :
                          enq.status === 'rejected' ? 'badge-rose' : 'badge-amber'
                        }`} style={{ marginBottom: '8px', textTransform: 'uppercase' }}>
                          ● {enq.status}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{enq.school_name}</h3>
                        {enq.proposed_code && (
                          <span style={{ fontSize: '11px', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                            Proposed Code: {enq.proposed_code}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(enq.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: '14px 0', padding: '12px', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)' }}>
                      <div><strong>Contact:</strong> {enq.contact_person_name}</div>
                      <div><strong>Email:</strong> {enq.email}</div>
                      <div><strong>Phone:</strong> {enq.phone}</div>
                      <div><strong>Location:</strong> {enq.city ? `${enq.city}, ${enq.state || ''}` : 'Not Specified'}</div>
                      <div><strong>Est. Students:</strong> {enq.estimated_students || '500'}</div>
                      {enq.message && (
                        <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          "{enq.message}"
                        </div>
                      )}
                    </div>

                    {enq.status === 'approved' && enq.approved_school_name && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                        ✓ Provisioned as <strong>{enq.approved_school_name}</strong> ({enq.approved_school_code})
                      </div>
                    )}
                  </div>

                  {enq.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => handleOpenApproveModal(enq)}
                      >
                        <Check size={14} />
                        <span>1-Click Approve</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--accent-rose)' }}
                        onClick={() => handleOpenRejectModal(enq)}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: SUPER ADMIN PROFILE & SECURITY                                   */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', alignItems: 'start' }}>
          {/* Super Admin Info Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '22px',
                fontWeight: 800,
              }}>
                SA
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Super Administrator</h2>
                <span className="badge badge-primary">Platform Root Security</span>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              {profileSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: '13px', marginBottom: '14px' }}>
                  {profileSuccess}
                </div>
              )}
              {profileError && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '14px' }}>
                  {profileError}
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Root Username</label>
                <input
                  type="text"
                  className="input-field"
                  value={currentUser?.username || 'superadmin'}
                  disabled
                  style={{ opacity: 0.7, background: 'var(--bg-subtle-box)' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Super Admin Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="admin@edex.platform"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Emergency Contact Phone</label>
                <input
                  type="tel"
                  className="input-field"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 99999 00000"
                />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }}>
                Update Profile Info
              </button>
            </form>
          </div>

          {/* Password Reset Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Lock size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Change Root Password</h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Update the master login password for the SYSTEM Super Admin account.
            </p>

            <form onSubmit={handleChangePassword}>
              {passwordSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: '13px', marginBottom: '14px' }}>
                  {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '14px' }}>
                  {passwordError}
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Current Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordCurrent ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordCurrent(!showPasswordCurrent)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showPasswordCurrent ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                    title={showPasswordCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">New Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordNew ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordNew(!showPasswordNew)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showPasswordNew ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                    title={showPasswordNew ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Confirm New Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordNew ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                <KeyRound size={16} />
                <span>Save New Super Admin Password</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODALS SECTION (Rendered via React Portal directly to document.body)     */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}

      {/* 1. Register / Create School Modal with Unique Check */}
      {showCreateSchoolModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Register New School Tenant</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    School name & code must be globally unique.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowCreateSchoolModal(false)}>
                <X size={18} />
              </button>
            </div>

            {modalSuccess ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                <CheckCircle2 size={40} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>{modalSuccess}</h3>
              </div>
            ) : (
              <form onSubmit={handleCreateSchoolSubmit}>
                {modalError && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                    {modalError}
                  </div>
                )}

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Official School Name * (Unique)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Modern Academy Global"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">School Code *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. SSA0001"
                      value={schoolForm.code}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSchoolForm({
                          ...schoolForm,
                          code: val,
                          admin_username: !schoolForm.admin_username || schoolForm.admin_username.startsWith('admin_ssa')
                            ? `admin_${val.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                            : schoolForm.admin_username,
                        });
                      }}
                      required
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Official Email</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="info@modernacademy.edu"
                      value={schoolForm.email}
                      onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Contact Phone</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="+91 98765 43210"
                      value={schoolForm.phone}
                      onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">City</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Mumbai"
                      value={schoolForm.city}
                      onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">State</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Maharashtra"
                      value={schoolForm.state}
                      onChange={(e) => setSchoolForm({ ...schoolForm, state: e.target.value })}
                    />
                  </div>
                </div>

                {/* Provision Initial Admin Credentials */}
                <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', marginBottom: '10px' }}>
                    Initial School Administrator Account
                  </div>
                  <div className="grid-2">
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Admin Username</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. principal_mod"
                        value={schoolForm.admin_username}
                        onChange={(e) => setSchoolForm({ ...schoolForm, admin_username: e.target.value })}
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Temporary Password</label>
                      <input
                        type="text"
                        className="input-field"
                        value={schoolForm.admin_password}
                        onChange={(e) => setSchoolForm({ ...schoolForm, admin_password: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSchoolModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Creating...' : 'Register & Provision School'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 2. Interactive Dialogue Box: View & Edit School Details */}
      {showEditSchoolModal && selectedSchool && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800 }}>School Details & Settings</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Super Admin master control for {selectedSchool.name}
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowEditSchoolModal(false)}>
                <X size={18} />
              </button>
            </div>

            {modalSuccess ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                <CheckCircle2 size={40} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>{modalSuccess}</h3>
              </div>
            ) : (
              <form onSubmit={handleEditSchoolSubmit}>
                {modalError && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                    {modalError}
                  </div>
                )}

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Official School Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">School Code (Slug)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={schoolForm.code}
                      onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value.toUpperCase() })}
                      required
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Official Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={schoolForm.email}
                      onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Contact Phone</label>
                    <input
                      type="tel"
                      className="input-field"
                      value={schoolForm.phone}
                      onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">City</label>
                    <input
                      type="text"
                      className="input-field"
                      value={schoolForm.city}
                      onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">State</label>
                    <input
                      type="text"
                      className="input-field"
                      value={schoolForm.state}
                      onChange={(e) => setSchoolForm({ ...schoolForm, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Campus Address</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={schoolForm.address}
                    onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditSchoolModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Saving...' : 'Save School Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 3. Reset Admin Password Modal */}
      {showResetPasswordModal && selectedSchool && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="var(--accent-amber)" />
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Reset Administrator Password</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowResetPasswordModal(false)}>
                <X size={18} />
              </button>
            </div>

            {resetSuccessData ? (
              <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                <CheckCircle2 size={40} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  Password Reset Successful!
                </h3>
                <div style={{ margin: '14px 0', padding: '12px', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                  <div><strong>Username:</strong> {resetSuccessData.username}</div>
                  <div><strong>New Password:</strong> <code style={{ color: 'var(--primary)' }}>{resetSuccessData.password}</code></div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowResetPasswordModal(false)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Resetting credentials for school: <strong>{selectedSchool.name}</strong> ({selectedSchool.code}).
                </p>

                {modalError && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                    {modalError}
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">New Admin Password *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResetPasswordModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Resetting...' : 'Confirm Password Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 4. 1-Click Approve Enquiry & Provision School Modal */}
      {showApproveModal && selectedEnquiry && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '580px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={22} color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Approve & Provision School</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowApproveModal(false)}>
                <X size={18} />
              </button>
            </div>

            {provisionedData ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                <Sparkles size={44} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  School Provisioned Successfully!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Core tenant, default academic year & initial admin login are active.
                </p>

                <div style={{ margin: '16px 0', padding: '14px', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)', textAlign: 'left', fontSize: '13px' }}>
                  <div><strong>School:</strong> {provisionedData.school?.name} ({provisionedData.school?.code})</div>
                  <div><strong>Admin Username:</strong> <code style={{ color: 'var(--primary)' }}>{provisionedData.admin_credentials?.username}</code></div>
                  <div><strong>Temporary Password:</strong> <code style={{ color: 'var(--accent-emerald)' }}>{provisionedData.admin_credentials?.password}</code></div>
                  <div><strong>Login Email:</strong> {provisionedData.admin_credentials?.email}</div>
                </div>

                <button className="btn btn-primary" onClick={() => setShowApproveModal(false)}>
                  Close & View in Directory
                </button>
              </div>
            ) : (
              <form onSubmit={handleApproveSubmit}>
                <div style={{ padding: '12px', background: 'var(--bg-subtle-box)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                  <strong>Applicant:</strong> {selectedEnquiry.contact_person_name} ({selectedEnquiry.email} • {selectedEnquiry.phone})
                </div>

                {modalError && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                    {modalError}
                  </div>
                )}

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Approved School Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      value={approvalForm.custom_school_name}
                      onChange={(e) => setApprovalForm({ ...approvalForm, custom_school_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">School Code *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. SSA0001"
                      value={approvalForm.custom_school_code}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setApprovalForm({
                          ...approvalForm,
                          custom_school_code: val,
                          admin_username: !approvalForm.admin_username || approvalForm.admin_username.startsWith('admin_ssa')
                            ? `admin_${val.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                            : approvalForm.admin_username,
                        });
                      }}
                      required
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Admin Username</label>
                    <input
                      type="text"
                      className="input-field"
                      value={approvalForm.admin_username}
                      onChange={(e) => setApprovalForm({ ...approvalForm, admin_username: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Admin Initial Password</label>
                    <input
                      type="text"
                      className="input-field"
                      value={approvalForm.admin_password}
                      onChange={(e) => setApprovalForm({ ...approvalForm, admin_password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Admin Approval Notes</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={approvalForm.admin_notes}
                    onChange={(e) => setApprovalForm({ ...approvalForm, admin_notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? 'Provisioning...' : 'Confirm & Auto-Provision School'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 5. Reject Enquiry Modal */}
      {showRejectModal && selectedEnquiry && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '460px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <XCircle size={22} color="var(--accent-rose)" />
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Reject Onboarding Enquiry</h2>
              </div>
              <button className="btn-icon" onClick={() => setShowRejectModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Reject enquiry for <strong>{selectedEnquiry.school_name}</strong>.
              </p>

              {modalError && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                  {modalError}
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Reason / Internal Notes *</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-secondary" style={{ color: 'var(--accent-rose)' }} disabled={modalLoading}>
                  {modalLoading ? 'Rejecting...' : 'Reject Enquiry'}
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
