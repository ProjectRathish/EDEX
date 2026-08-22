import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Filter, 
  User, 
  Calendar, 
  Award, 
  Tag, 
  CheckCircle2,
  X
} from 'lucide-react';
import { StudentService, StudentAssignmentService } from '../services/api';

export default function StudentsView({ students, refreshData, classes, academicYear }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrolModal, setShowEnrolModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states for new student
  const [formData, setFormData] = useState({
    admission_number: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: 'male',
    blood_group: 'B+',
    admission_date: new Date().toISOString().split('T')[0],
    class_id: classes?.[0]?.class_id || '',
    section_id: classes?.[0]?.sections?.[0]?.section_id || '',
    roll_number: '',
  });

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(term) ||
      s.last_name?.toLowerCase().includes(term) ||
      s.admission_number?.toLowerCase().includes(term) ||
      s.class_name?.toLowerCase().includes(term)
    );
  });

  const handleEnrolSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Create student in core_students
      const studentRes = await StudentService.create({
        admission_number: formData.admission_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        blood_group: formData.blood_group,
        admission_date: formData.admission_date,
      });

      const studentId = studentRes.data?.data?.student_id;

      // 2. If class and section provided, assign academic year placement
      if (studentId && formData.class_id && formData.section_id && academicYear?.academic_year_id) {
        await StudentAssignmentService.create({
          student_id: studentId,
          academic_year_id: academicYear.academic_year_id,
          class_id: formData.class_id,
          section_id: formData.section_id,
          roll_number: formData.roll_number || null,
        });
      }

      setShowEnrolModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to enrol student. Make sure admission number is unique.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Student Master Directory</h1>
            <span className="badge badge-primary">
              {filteredStudents.length} Students Enrolled
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Single master student records in SAARTHI Core. Referenced across ID Card, Voting, Bus & Canteen.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => {
            setFormData({
              ...formData,
              class_id: classes?.[0]?.class_id || '',
              section_id: classes?.[0]?.sections?.[0]?.section_id || '',
            });
            setShowEnrolModal(true);
          }}
        >
          <Plus size={16} />
          <span>Enrol New Student</span>
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '480px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by student name, admission number, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Active Year: <strong style={{ color: 'var(--accent-emerald)' }}>{academicYear?.name || '2025-26'}</strong>
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>STUDENT</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>ADMISSION NO</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>CLASS & SECTION</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>ROLL NO</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>BLOOD GRP</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students found matching your criteria. Click "Enrol New Student" to add.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => (
                <tr 
                  key={s.student_id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'var(--transition-fast)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--table-row-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#ffffff',
                      }}>
                        {s.first_name?.[0] || 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                          {s.first_name} {s.last_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          DOB: {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : 'N/A'} • {s.gender}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                    {s.admission_number}
                  </td>

                  <td style={{ padding: '14px 20px' }}>
                    {s.class_name ? (
                      <span className="badge badge-primary">
                        {s.class_name} — {s.section_name || 'A'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Not Placed
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {s.roll_number ? `#${s.roll_number}` : '—'}
                  </td>

                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                      {s.blood_group || 'O+'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-emerald">
                      {s.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Enrol Student Modal */}
      {showEnrolModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Enrol New Student</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Create master student record in SAARTHI Core
                </p>
              </div>
              <button 
                className="btn-icon"
                onClick={() => setShowEnrolModal(false)}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-rose-light)',
                color: 'var(--accent-rose)',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEnrolSubmit}>
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
                  <label className="input-label">Admission Number *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. DPS-2025-042"
                    required
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
                  <label className="input-label">Gender</label>
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
              </div>

              {/* Placement Section */}
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle-box)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', color: 'var(--primary)' }}>
                  Academic Placement (Year: {academicYear?.name || '2025-26'})
                </div>
                <div className="grid-3">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Class</label>
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
                      {classes.map((c) => (
                        <option key={c.class_id} value={c.class_id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Section</label>
                    <select
                      className="input-field"
                      value={formData.section_id}
                      onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                    >
                      {classes.find((c) => c.class_id === formData.class_id)?.sections?.map((sec) => (
                        <option key={sec.section_id} value={sec.section_id}>{sec.name}</option>
                      )) || <option value="">No Sections</option>}
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Roll No</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 15"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowEnrolModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? 'Enrolling...' : 'Enrol Student'}
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
