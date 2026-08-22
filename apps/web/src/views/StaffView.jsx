import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  UserCheck, 
  X
} from 'lucide-react';
import { StaffService } from '../services/api';

export default function StaffView({ staff, refreshData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    designation: 'Senior Teacher',
    department: 'Science & Mathematics',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredStaff = staff.filter((st) => {
    const term = searchTerm.toLowerCase();
    return (
      st.first_name?.toLowerCase().includes(term) ||
      st.last_name?.toLowerCase().includes(term) ||
      st.employee_id?.toLowerCase().includes(term) ||
      st.designation?.toLowerCase().includes(term) ||
      st.department?.toLowerCase().includes(term)
    );
  });

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await StaffService.create(formData);
      setShowAddStaffModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to add staff member. Check employee ID uniqueness.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Faculty & Staff Directory</h1>
            <span className="badge badge-primary">
              {filteredStaff.length} Members
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Central employee registry used across ID Cards, Election Officers, Bus Conductors & Canteen Accounts.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setShowAddStaffModal(true)}
        >
          <Plus size={16} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ position: 'relative', maxWidth: '440px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by name, employee code, designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Staff Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
      }}>
        {filteredStaff.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            No staff records found. Click "Add Staff Member" to enrol faculty.
          </div>
        ) : (
          filteredStaff.map((st) => (
            <div 
              key={st.staff_id}
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '16px',
                    color: '#ffffff',
                  }}>
                    {st.first_name?.[0] || 'T'}
                  </div>
                  <span className="badge badge-emerald">
                    {st.status || 'Active'}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)' }}>
                  {st.first_name} {st.last_name}
                </h3>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  {st.designation || 'Faculty Member'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {st.department || 'General'}
                </div>

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{st.employee_id}</span>
                  </div>
                  {st.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={14} color="var(--text-muted)" />
                      <span>{st.email}</span>
                    </div>
                  )}
                  {st.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color="var(--text-muted)" />
                      <span>{st.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Joined: {st.date_of_joining ? new Date(st.date_of_joining).toLocaleDateString() : 'Active'}</span>
                <span className="badge badge-primary" style={{ fontSize: '10px' }}>Faculty</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '540px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Add Faculty / Staff Member</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Create master staff record in SAARTHI Core
                </p>
              </div>
              <button 
                className="btn-icon" 
                onClick={() => setShowAddStaffModal(false)}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddStaff}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">First Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    required
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
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Employee ID *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. EMP-2025-01"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Designation</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Head of Science"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Department</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Mathematics"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="faculty@school.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddStaffModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Adding...' : 'Add Staff Member'}
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
