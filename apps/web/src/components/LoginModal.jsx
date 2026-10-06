import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Layers,
  ShieldCheck,
  KeyRound,
  User,
  ArrowRight,
  Sparkles,
  Building2,
  Sun,
  Moon,
  Send,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Compass,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { AuthService, EnquiryService } from '../services/api';

export default function LoginModal({ onLoginSuccess, theme, toggleTheme }) {
  // Login States
  const [schoolCode, setSchoolCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Enquiry Modal Dialog State
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);

  // Enquiry Registration States
  const [enquiryForm, setEnquiryForm] = useState({
    school_name: '',
    proposed_code: '',
    contact_person_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    estimated_students: 500,
    message: '',
  });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState('');
  const [enquiryError, setEnquiryError] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await AuthService.login(username, password, schoolCode);
      if (res.data && res.data.data) {
        const { token, user } = res.data.data;
        localStorage.setItem('edex_token', token);
        localStorage.setItem('edex_user', JSON.stringify(user));
        // Keep legacy keys synced for safety
        localStorage.setItem('saarthi_token', token);
        localStorage.setItem('saarthi_user', JSON.stringify(user));
        onLoginSuccess(user, token);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setLoginError('Cannot reach Backend API (http://localhost:5000). Please ensure MySQL & backend server are running.');
      } else {
        setLoginError(err.response?.data?.message || 'Invalid login credentials. Please check your school code, username, and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (code, u, p) => {
    setSchoolCode(code);
    setUsername(u);
    setPassword(p);
  };

  const handleOpenEnquiryModal = () => {
    setEnquiryError('');
    setEnquirySuccess('');
    setShowEnquiryModal(true);
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquiryError('');
    setEnquirySuccess('');
    setEnquiryLoading(true);
    try {
      const res = await EnquiryService.createPublic(enquiryForm);
      setEnquirySuccess(res.data?.message || 'School onboarding enquiry submitted successfully! Our team will review and approve.');
      setEnquiryForm({
        school_name: '',
        proposed_code: '',
        contact_person_name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        estimated_students: 500,
        message: '',
      });
    } catch (err) {
      setEnquiryError(err.response?.data?.message || 'Failed to submit enquiry. Please verify your details.');
    } finally {
      setEnquiryLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '36px 20px',
      background: 'var(--bg-main)',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Top Floating Theme Switcher */}
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
        </button>
      </div>

      {/* ── Main Sign In Card ── */}
      <div style={{
        maxWidth: '460px',
        width: '100%',
      }}>
        <div className="glass-panel animate-fade-in glow-box" style={{
          padding: '36px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            {/* Header Logo */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '58px',
                height: '58px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
                marginBottom: '12px',
              }}>
                <Layers size={30} color="#fff" />
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                EDEX
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Unified Multi-School Super App Platform
              </p>
            </div>

            {loginError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-rose-light)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--accent-rose)',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* School Code */}
              <div className="input-group">
                <label className="input-label">School Code / Tenant</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. SSA0001 or DPS-DELHI"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    style={{ paddingLeft: '38px', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.04em' }}
                  />
                  <Building2 size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Username / Login ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <User size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '38px', paddingRight: '40px' }}
                  />
                  <KeyRound size={17} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: showPassword ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '10px' }}
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Sign In to EDEX</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Actions & Quick Credentials */}
          <div style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center' }}>
              Quick Demo Credentials
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '11px', padding: '8px' }}
                onClick={() => quickLogin('SYSTEM', 'superadmin', 'AdminPassword123!')}
              >
                <ShieldCheck size={13} color="var(--secondary)" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '11px', padding: '8px' }}
                onClick={() => quickLogin('DPS-DELHI', 'principal_dps', 'PrincipalPass123!')}
              >
                <Building2 size={13} color="var(--primary)" />
                <span>School Admin (DPS)</span>
              </button>
            </div>

            {/* Trigger Button to Open the Registration Modal Dialog */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: '12px',
                  color: 'var(--primary)',
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle-box)',
                  fontWeight: 600,
                }}
                onClick={handleOpenEnquiryModal}
              >
                <Compass size={14} style={{ marginRight: '6px' }} />
                <span>New Institution? Register School / Submit Enquiry</span>
                <ArrowRight size={14} style={{ marginLeft: '6px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL DIALOG: NEW SCHOOL REGISTRATION / ENQUIRY ═════════════════ */}
      {showEnquiryModal && createPortal(
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '640px', width: '100%' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '13px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}>
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800 }}>New School Registration Enquiry</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Submit an enquiry for Super Admin review and tenant provisioning.
                  </p>
                </div>
              </div>

              <button
                className="btn-icon"
                onClick={() => setShowEnquiryModal(false)}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {enquirySuccess ? (
              <div style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-lg)',
                margin: '10px 0',
              }}>
                <CheckCircle2 size={46} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  Enquiry Submitted Successfully!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '420px', margin: '8px auto 20px' }}>
                  {enquirySuccess}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEnquirySuccess('')}
                  >
                    Submit Another Enquiry
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowEnquiryModal(false)}
                  >
                    Done & Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit}>
                {enquiryError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-rose-light)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: 'var(--accent-rose)',
                    fontSize: '12px',
                    marginBottom: '14px',
                  }}>
                    {enquiryError}
                  </div>
                )}

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Official School Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. St. Xavier's Academy"
                      value={enquiryForm.school_name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, school_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Contact / Principal Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Dr. Rajesh Khanna"
                      value={enquiryForm.contact_person_name}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, contact_person_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">Official Email *</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="principal@school.edu"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Contact Phone *</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="+91 98765 43210"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="input-group">
                    <label className="input-label">City</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. New Delhi"
                      value={enquiryForm.city}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, city: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">State</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Delhi"
                      value={enquiryForm.state}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, state: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Est. Students</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="500"
                      value={enquiryForm.estimated_students}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, estimated_students: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Special Requirements / Message</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Modules interested in (ID Card, Bus Tracking, Voting, Canteen)..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  />
                </div>

                <div style={{
                  padding: '10px 14px',
                  background: 'var(--bg-subtle-box)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span>The platform auto-assigns a unique system school code (SSAXXXX) upon approval.</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEnquiryModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={enquiryLoading}
                  >
                    <Send size={15} />
                    <span>{enquiryLoading ? 'Submitting Enquiry...' : 'Submit Registration Enquiry'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
