import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  Plus, 
  Layers, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Sparkles,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Save,
  Layers3
} from 'lucide-react';
import { ClassService, AcademicYearService } from '../services/api';

export default function ClassesView({ classes, academicYear, academicYears, refreshData }) {
  // Modal states
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [deletingSection, setDeletingSection] = useState(null);

  // Form states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [className, setClassName] = useState('');
  const [numericOrder, setNumericOrder] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [maxStrength, setMaxStrength] = useState('40');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Create Class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ClassService.create({ name: className, numeric_order: parseInt(numericOrder) });
      setClassName('');
      setNumericOrder('');
      setShowAddClassModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Class
  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;
    setError('');
    setLoading(true);
    try {
      await ClassService.update(editingClass.class_id, {
        name: className,
        numeric_order: parseInt(numericOrder),
      });
      setEditingClass(null);
      setClassName('');
      setNumericOrder('');
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Class
  const handleDeleteClass = async () => {
    if (!deletingClass) return;
    setError('');
    setLoading(true);
    try {
      await ClassService.delete(deletingClass.class_id);
      setDeletingClass(null);
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete class');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Section
  const handleCreateSection = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await ClassService.createSection(selectedClassId, {
        name: sectionName,
        max_strength: maxStrength ? parseInt(maxStrength) : null,
      });
      setSectionName('');
      setMaxStrength('40');
      setShowAddSectionModal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Section
  const handleUpdateSection = async (e) => {
    e.preventDefault();
    if (!editingSection) return;
    setError('');
    setLoading(true);
    try {
      await ClassService.updateSection(editingSection.classId, editingSection.section.section_id, {
        name: sectionName,
        max_strength: maxStrength ? parseInt(maxStrength) : null,
      });
      setEditingSection(null);
      setSectionName('');
      setMaxStrength('40');
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update section');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Section
  const handleDeleteSection = async () => {
    if (!deletingSection) return;
    setError('');
    setLoading(true);
    try {
      await ClassService.deleteSection(deletingSection.classId, deletingSection.section.section_id);
      setDeletingSection(null);
      refreshData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete section');
    } finally {
      setLoading(false);
    }
  };

  // Handle Set Current Academic Year
  const handleSetCurrentYear = async (yearId) => {
    try {
      await AcademicYearService.setCurrent(yearId);
      refreshData();
    } catch (err) {
      console.error('Failed to change academic year:', err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Classes, Sections & Academic Years</h1>
            <span className="badge badge-primary">
              {classes.length} Classes Configured
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Persistent class levels and divisions. Student placement changes per academic year.
          </p>
        </div>
      </div>

      {/* Academic Year Management Strip */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Academic Year Schedule</h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Single active year per school rule
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {academicYears.map((ay) => (
            <div
              key={ay.academic_year_id}
              style={{
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                background: ay.is_current ? 'var(--accent-emerald-light)' : 'var(--bg-subtle-box)',
                border: `1px solid ${ay.is_current ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: ay.is_current ? 'var(--accent-emerald)' : 'var(--text-heading)' }}>
                  {ay.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(ay.start_date).toLocaleDateString()} — {new Date(ay.end_date).toLocaleDateString()}
                </div>
              </div>
              {ay.is_current ? (
                <span className="badge badge-emerald">ACTIVE</span>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => handleSetCurrentYear(ay.academic_year_id)}
                >
                  Set Active
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Classes Section Header with Add New Class Level Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginTop: '4px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)' }}>
            Class Levels & Section Divisions
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Structure student grades, divisions, and maximum seating capacity. Click Edit or Delete on any item to manage.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => {
            setClassName('');
            setNumericOrder('');
            setError('');
            setShowAddClassModal(true);
          }}
        >
          <Plus size={16} />
          <span>Add New Class Level</span>
        </button>
      </div>

      {/* Classes & Sections Visual Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
      }}>
        {classes.map((cls) => (
          <div 
            key={cls.class_id}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}>
                    {cls.numeric_order}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)' }}>{cls.name}</h3>
                </div>

                {/* Class Action Buttons: Add Section, Edit Class, Delete Class */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedClassId(cls.class_id);
                      setSectionName('');
                      setMaxStrength('40');
                      setError('');
                      setShowAddSectionModal(true);
                    }}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                    title="Add Division / Section to this Class"
                  >
                    <Plus size={12} />
                    <span>Add Div</span>
                  </button>

                  <button
                    className="btn-icon"
                    onClick={() => {
                      setEditingClass(cls);
                      setClassName(cls.name);
                      setNumericOrder(cls.numeric_order?.toString() || '');
                      setError('');
                    }}
                    style={{ width: '28px', height: '28px' }}
                    title="Edit Class Name & Level"
                  >
                    <Edit2 size={13} color="var(--primary)" />
                  </button>

                  <button
                    className="btn-icon"
                    onClick={() => {
                      setDeletingClass(cls);
                      setError('');
                    }}
                    style={{ width: '28px', height: '28px' }}
                    title="Delete Class"
                  >
                    <Trash2 size={13} color="var(--accent-rose)" />
                  </button>
                </div>
              </div>

              {/* Sections List */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Configured Divisions ({cls.sections?.length || 0})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {cls.sections?.length > 0 ? (
                    cls.sections.map((sec) => (
                      <div
                        key={sec.section_id}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-subtle-box)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Div {sec.name}</span>
                          {sec.max_strength && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                              ({sec.max_strength})
                            </span>
                          )}
                        </div>

                        {/* Division Edit and Delete quick buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
                          <button
                            onClick={() => {
                              setEditingSection({ classId: cls.class_id, section: sec });
                              setSectionName(sec.name);
                              setMaxStrength(sec.max_strength?.toString() || '40');
                              setError('');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--primary)', display: 'flex' }}
                            title="Edit Division"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingSection({ classId: cls.class_id, section: sec });
                              setError('');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--accent-rose)', display: 'flex' }}
                            title="Delete Division"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      No divisions yet. Click "Add Div" above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Numeric Level: {cls.numeric_order}</span>
              <span>{cls.sections?.length || 0} Division(s)</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── MODAL 1: Add Class Modal ────────────────────────────────────────── */}
      {showAddClassModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Add Class Level</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Create a new class tier in SAARTHI Core
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowAddClassModal(false)} title="Close modal">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateClass}>
              <div className="input-group">
                <label className="input-label">Class Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Class 11, Grade 12"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Numeric Order (1-12) *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 11"
                  required
                  value={numericOrder}
                  onChange={(e) => setNumericOrder(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddClassModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: Edit Class Modal ───────────────────────────────────────── */}
      {editingClass && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Edit Class Level</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Update name and numeric sorting order
                </p>
              </div>
              <button className="btn-icon" onClick={() => setEditingClass(null)} title="Close modal">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateClass}>
              <div className="input-group">
                <label className="input-label">Class Name *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Numeric Order (1-12) *</label>
                <input
                  type="number"
                  className="input-field"
                  required
                  value={numericOrder}
                  onChange={(e) => setNumericOrder(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingClass(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  <Save size={15} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 3: Delete Class Confirmation Modal ────────────────────────── */}
      {deletingClass && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Delete Class Level?</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  This action will soft-delete the class and all its divisions.
                </p>
              </div>
            </div>

            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle-box)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              Are you sure you want to delete <strong>{deletingClass.name}</strong> (Level {deletingClass.numeric_order})?
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingClass(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDeleteClass}
                disabled={loading}
              >
                <Trash2 size={15} />
                <span>{loading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 4: Add Section Modal ──────────────────────────────────────── */}
      {showAddSectionModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Add Section Division</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Add a new division for the selected class
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowAddSectionModal(false)} title="Close modal">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSection}>
              <div className="input-group">
                <label className="input-label">Division Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. A, B, C, Rose, Lotus"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Max Student Capacity</label>
                <input
                  type="number"
                  className="input-field"
                  value={maxStrength}
                  onChange={(e) => setMaxStrength(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddSectionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Adding...' : 'Add Division'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 5: Edit Section Modal ─────────────────────────────────────── */}
      {editingSection && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Edit Division</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Update division name and student seating capacity
                </p>
              </div>
              <button className="btn-icon" onClick={() => setEditingSection(null)} title="Close modal">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateSection}>
              <div className="input-group">
                <label className="input-label">Division Name *</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Max Student Capacity</label>
                <input
                  type="number"
                  className="input-field"
                  value={maxStrength}
                  onChange={(e) => setMaxStrength(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingSection(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  <Save size={15} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 6: Delete Section Confirmation Modal ──────────────────────── */}
      {deletingSection && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Delete Division?</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  This will remove the selected division section.
                </p>
              </div>
            </div>

            <div style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle-box)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              Are you sure you want to delete <strong>Division {deletingSection.section.name}</strong>?
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingSection(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDeleteSection}
                disabled={loading}
              >
                <Trash2 size={15} />
                <span>{loading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
