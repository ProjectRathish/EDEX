import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Clock, 
  ShieldCheck, 
  KeyRound, 
  Upload, 
  Image as ImageIcon, 
  Crop, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Eye, 
  Lock, 
  Sparkles,
  CreditCard
} from 'lucide-react';
import { SchoolService, AuthService } from '../services/api';

export default function SchoolProfileView({ school, user, refreshData, academicYear }) {
  const [activeSubTab, setActiveSubTab] = useState('general'); // 'general' | 'logo' | 'security'
  
  // School Form state
  const [formData, setFormData] = useState({
    name: school?.name || '',
    code: school?.code || '',
    address: school?.address || '',
    city: school?.city || '',
    state: school?.state || '',
    country: school?.country || 'India',
    phone: school?.phone || '',
    email: school?.email || '',
    timezone: school?.timezone || 'Asia/Kolkata',
    logo_url: school?.logo_url || '',
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        code: school.code || '',
        address: school.address || '',
        city: school.city || '',
        state: school.state || '',
        country: school.country || 'India',
        phone: school.phone || '',
        email: school.email || '',
        timezone: school.timezone || 'Asia/Kolkata',
        logo_url: school.logo_url || '',
      });
    }
  }, [school]);

  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState('');
  const [detailsError, setDetailsError] = useState('');

  // Password Reset state
  const [passData, setPassData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Image Upload & Crop state
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [savingLogo, setSavingLogo] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState('');
  const [logoError, setLogoError] = useState('');

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageObjRef = useRef(null);

  const isSuperAdmin = user?.roles?.includes('super_admin');

  // Handle Save School Details
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setDetailsError('');
    setDetailsSuccess('');
    setSavingDetails(true);
    try {
      if (!school?.school_id) throw new Error('No school selected');
      await SchoolService.update(school.school_id, {
        name: formData.name,
        code: formData.code,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
        timezone: formData.timezone,
        logo_url: formData.logo_url,
      });
      setDetailsSuccess('Institutional details updated successfully!');
      refreshData();
    } catch (err) {
      console.error(err);
      setDetailsError(err.response?.data?.message || 'Failed to update school details.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (passData.new_password !== passData.confirm_password) {
      setPassError('New password and confirm password do not match.');
      return;
    }
    if (passData.new_password.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }

    setSavingPass(true);
    try {
      await AuthService.changePassword(passData.current_password, passData.new_password);
      setPassSuccess('Administrator password changed successfully!');
      setPassData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error(err);
      setPassError(err.response?.data?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setSavingPass(false);
    }
  };

  // Image Selection for Crop
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setLogoError('');
    setLogoSuccess('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target.result;
      setRawImageSrc(src);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });

      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageObjRef.current = img;
        drawCroppedPreview(img, 1, { x: 0, y: 0 });
      };
    };
    reader.readAsDataURL(file);
  };

  // Render cropped preview to canvas
  const drawCroppedPreview = (img, zoom, offset) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const size = 260;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate scaling to fill canvas
    const imgAspect = img.width / img.height;
    let drawW, drawH;

    if (imgAspect > 1) {
      drawH = size * zoom;
      drawW = size * imgAspect * zoom;
    } else {
      drawW = size * zoom;
      drawH = (size / imgAspect) * zoom;
    }

    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  };

  // Update canvas when zoom or offset changes
  useEffect(() => {
    if (imageObjRef.current) {
      drawCroppedPreview(imageObjRef.current, cropZoom, cropOffset);
    }
  }, [cropZoom, cropOffset]);

  // Handle canvas mouse drag for panning
  const handleMouseDown = (e) => {
    if (!rawImageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setCropOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Apply Cropped Logo
  const handleApplyCroppedLogo = async () => {
    if (!canvasRef.current || !school?.school_id) return;
    setSavingLogo(true);
    setLogoError('');
    setLogoSuccess('');
    try {
      const croppedDataUrl = canvasRef.current.toDataURL('image/png', 0.92);
      
      // Save directly to school profile
      await SchoolService.update(school.school_id, {
        logo_url: croppedDataUrl,
      });

      setFormData((prev) => ({ ...prev, logo_url: croppedDataUrl }));
      setLogoSuccess('School logo cropped & saved to institutional profile successfully!');
      refreshData();
    } catch (err) {
      console.error(err);
      setLogoError(err.response?.data?.message || 'Failed to save cropped logo.');
    } finally {
      setSavingLogo(false);
    }
  };

  // Remove Logo
  const handleRemoveLogo = async () => {
    if (!school?.school_id) return;
    if (!window.confirm('Are you sure you want to remove the school logo?')) return;
    setSavingLogo(true);
    try {
      await SchoolService.update(school.school_id, {
        logo_url: null,
      });
      setFormData((prev) => ({ ...prev, logo_url: '' }));
      setRawImageSrc(null);
      imageObjRef.current = null;
      setLogoSuccess('Logo removed.');
      refreshData();
    } catch (err) {
      console.error(err);
      setLogoError('Failed to remove logo.');
    } finally {
      setSavingLogo(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Page Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 30px',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-hero)',
        border: '1px solid var(--border-hero)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: formData.logo_url 
              ? `url(${formData.logo_url}) center/cover no-repeat` 
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
            border: '2px solid rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            boxShadow: 'var(--shadow-md)',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {!formData.logo_url && <Building2 size={32} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-heading)' }}>
                {formData.name || 'Institutional Profile'}
              </h1>
              <span className="badge badge-primary" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                CODE: {formData.code || 'SSA0001'}
              </span>
              <span className="badge badge-emerald">
                <ShieldCheck size={13} />
                Verified Institution
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Manage school campus contact details, official crest/logo with cropping, and administrator security.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>
            <Clock size={14} />
            Timezone: {formData.timezone}
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeSubTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('general')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Building2 size={16} />
          <span>General Information & Campus</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'logo' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('logo')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Crop size={16} />
          <span>Logo & Branding Photo (Crop Tool)</span>
        </button>

        <button
          className={`btn ${activeSubTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('security')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <KeyRound size={16} />
          <span>Admin Security & Password Reset</span>
        </button>
      </div>

      {/* TAB 1: General Institutional Details */}
      {activeSubTab === 'general' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Institutional Details</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Official campus address, contact numbers, and platform operational metadata.
              </p>
            </div>
            {isSuperAdmin && (
              <span className="badge badge-amber">Super Admin Master Mode</span>
            )}
          </div>

          {detailsSuccess && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{detailsSuccess}</span>
            </div>
          )}

          {detailsError && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{detailsError}</span>
            </div>
          )}

          <form onSubmit={handleSaveDetails}>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">
                  Official School Name {isSuperAdmin ? '*' : '(Protected)'}
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isSuperAdmin}
                  style={!isSuperAdmin ? { opacity: 0.8, cursor: 'not-allowed' } : {}}
                  required
                />
                {!isSuperAdmin && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    School name is protected. Contact Platform Super Admin to alter registered legal name.
                  </span>
                )}
              </div>

              <div className="input-group">
                <label className="input-label">School Code (Tenant Slug)</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!isSuperAdmin}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700, opacity: isSuperAdmin ? 1 : 0.8, cursor: isSuperAdmin ? 'text' : 'not-allowed' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Campus Address</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="e.g. Ponniakurssi PO, Main Campus"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid-3">
              <div className="input-group">
                <label className="input-label">City</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Perinthalmanna"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">State</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Kerala"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Country</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="input-group">
                <label className="input-label">Official Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="info@school.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Contact Phone</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">System Timezone</label>
                <select
                  className="input-field"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={savingDetails}>
                <Save size={16} />
                <span>{savingDetails ? 'Saving Changes...' : 'Save School Details'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: School Logo & Profile Photo with Interactive Crop Tool */}
      {activeSubTab === 'logo' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Institutional Logo & Crest (Crop Studio)</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Upload and crop your official school crest or logo. Rendered automatically on Student ID Cards, Certificates & Navbars.
            </p>
          </div>

          {logoSuccess && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{logoSuccess}</span>
            </div>
          )}

          {logoError && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{logoError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', alignItems: 'start' }}>
            
            {/* Left: Upload & Crop Canvas Studio */}
            <div style={{
              background: 'var(--bg-subtle-box)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Choose Photo / Logo</span>
                </button>
                {formData.logo_url && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRemoveLogo}
                    title="Remove Logo"
                  >
                    <Trash2 size={16} color="var(--accent-rose)" />
                  </button>
                )}
              </div>

              {/* Crop Canvas Workspace */}
              <div style={{
                width: '260px',
                height: '260px',
                borderRadius: '16px',
                border: '2px dashed var(--primary)',
                background: 'rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
                cursor: rawImageSrc ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => { if (!rawImageSrc) fileInputRef.current?.click(); }}
              >
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '14px', display: rawImageSrc ? 'block' : 'none' }} />
                
                {!rawImageSrc && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    <ImageIcon size={36} style={{ margin: '0 auto 8px', opacity: 0.7 }} />
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Click to select photo</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>Drag & Zoom to crop 1:1</div>
                  </div>
                )}

                {/* Circular Crop Overlay Guide */}
                {rawImageSrc && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>

              {/* Crop Zoom & Pan Controls */}
              {rawImageSrc && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ZoomIn size={14} /> Zoom & Scale
                    </span>
                    <span>{Math.round(cropZoom * 100)}%</span>
                  </div>

                  <input
                    type="range"
                    min="0.6"
                    max="3"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => { setCropZoom(1); setCropOffset({ x: 0, y: 0 }); }}
                    >
                      Reset View
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 2 }}
                      onClick={handleApplyCroppedLogo}
                      disabled={savingLogo}
                    >
                      <Crop size={14} />
                      <span>{savingLogo ? 'Saving...' : 'Crop & Save Logo'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Preview in Application Components */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Live Component Previews</h3>

              {/* Preview 1: Header / Navbar Badge */}
              <div style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: formData.logo_url ? `url(${formData.logo_url}) center/cover no-repeat` : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {!formData.logo_url && <Building2 size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>
                    {formData.name || 'Your School Name'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Top Navigation Header Appearance
                  </div>
                </div>
              </div>

              {/* Preview 2: ID Card Header */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: formData.logo_url ? `url(${formData.logo_url}) center/cover no-repeat` : 'linear-gradient(135deg, #6366f1, #a855f7)',
                  border: '2px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {!formData.logo_url && <Sparkles size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {formData.name || 'DELHI PUBLIC SCHOOL'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    STUDENT IDENTITY CARD • {academicYear?.name || '2025-26'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: Administrator Security & Password Reset */}
      {activeSubTab === 'security' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', borderRadius: 'var(--radius-xl)', maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)',
            }}>
              <KeyRound size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Admin Security & Password Reset</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Update your login credentials for account: <strong>{user?.username}</strong>
              </p>
            </div>
          </div>

          {passSuccess && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', color: 'var(--accent-rose)', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div className="input-group">
              <label className="input-label">Current Password *</label>
              <input
                type="password"
                className="input-field"
                required
                placeholder="Enter current password"
                value={passData.current_password}
                onChange={(e) => setPassData({ ...passData, current_password: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">New Password *</label>
              <input
                type="password"
                className="input-field"
                required
                placeholder="At least 6 characters"
                value={passData.new_password}
                onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm New Password *</label>
              <input
                type="password"
                className="input-field"
                required
                placeholder="Re-enter new password"
                value={passData.confirm_password}
                onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" disabled={savingPass}>
                <Lock size={16} />
                <span>{savingPass ? 'Updating Password...' : 'Update Admin Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
