import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Calendar, 
  LogOut, 
  User, 
  Layers, 
  Sun, 
  Moon,
  ChevronDown,
  LayoutGrid,
  CreditCard,
  Vote,
  Bus,
  UtensilsCrossed,
  Check,
  Sparkles,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
  user, 
  school, 
  academicYear, 
  onLogout, 
  apiOnline, 
  theme, 
  toggleTheme,
  currentTab,
  setTab,
  modulesStatus = {}
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modulesList = [
    {
      id: 'dashboard',
      tabTarget: 'dashboard',
      name: 'EDEX Core',
      desc: 'Master Students, Classes, Staff & RBAC',
      icon: GraduationCap,
      color: '#6366f1',
      badge: 'Core Engine',
      badgeClass: 'badge-primary',
      isActive: ['dashboard', 'students', 'classes', 'staff', 'guardians', 'rbac'].includes(currentTab),
    },
    {
      id: 'id-card',
      tabTarget: 'id-card',
      name: 'ID Card Suite',
      desc: 'Smart Card Issuance & Templates',
      icon: CreditCard,
      color: '#818cf8',
      badge: modulesStatus?.id_card?.is_enabled ?? true ? 'Active' : 'Add-on',
      badgeClass: modulesStatus?.id_card?.is_enabled ?? true ? 'badge-emerald' : 'badge-amber',
      isActive: currentTab === 'id-card',
    },
    {
      id: 'voting',
      tabTarget: 'voting',
      name: 'School Voting',
      desc: 'Digital Elections & Student Ballots',
      icon: Vote,
      color: '#c084fc',
      badge: modulesStatus?.voting?.is_enabled ?? true ? 'Active' : 'Add-on',
      badgeClass: modulesStatus?.voting?.is_enabled ?? true ? 'badge-emerald' : 'badge-amber',
      isActive: currentTab === 'voting',
    },
    {
      id: 'bus',
      tabTarget: 'bus',
      name: 'Bus Transportation',
      desc: 'Live Route Planner & Student Pickups',
      icon: Bus,
      color: '#fbbf24',
      badge: modulesStatus?.bus?.is_enabled ?? false ? 'Active' : 'Add-on',
      badgeClass: modulesStatus?.bus?.is_enabled ?? false ? 'badge-emerald' : 'badge-amber',
      isActive: currentTab === 'bus' || (typeof currentTab === 'string' && currentTab.startsWith('bus')),
    },
    {
      id: 'canteen',
      tabTarget: 'canteen',
      name: 'Canteen & Wallet',
      desc: 'Cashless Campus & Parent Top-ups',
      icon: UtensilsCrossed,
      color: '#34d399',
      badge: modulesStatus?.canteen?.is_enabled ?? false ? 'Active' : 'Add-on',
      badgeClass: modulesStatus?.canteen?.is_enabled ?? false ? 'badge-emerald' : 'badge-amber',
      isActive: currentTab === 'canteen',
    },
  ];

  // Active module label for the button
  const currentActiveModule = modulesList.find(m => m.isActive) || modulesList[0];
  const CurrentIcon = currentActiveModule.icon;

  return (
    <header style={{
      height: '68px',
      borderBottom: '1px solid var(--border-glass)',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Left: Brand Logo + Module Switcher Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div 
          onClick={() => setTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          }}>
            <Layers size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                EDEX
              </span>
              <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                SUPER APP
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
              Multi-School SaaS Platform
            </span>
          </div>
        </div>

        {/* ── TOP MODULE SWITCHER DROPDOWN BUTTON ── */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: `1px solid ${dropdownOpen ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              boxShadow: dropdownOpen ? '0 0 0 3px var(--primary-light)' : 'var(--shadow-sm)',
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: `${currentActiveModule.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CurrentIcon size={14} color={currentActiveModule.color} />
            </div>
            <span style={{ color: 'var(--text-primary)' }}>
              {currentActiveModule.name}
            </span>
            <ChevronDown 
              size={15} 
              color="var(--text-muted)" 
              style={{
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {/* Floating Dropdown Modal Menu */}
          {dropdownOpen && (
            <div 
              className="glass-panel animate-fade-in"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '340px',
                padding: '12px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                padding: '4px 10px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>Switch Super App Module</span>
                <Sparkles size={13} color="var(--primary)" />
              </div>

              {modulesList.map((mod) => {
                const ModIcon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setTab(mod.tabTarget);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: mod.isActive ? 'var(--primary-light)' : 'transparent',
                      border: '1px solid',
                      borderColor: mod.isActive ? 'var(--border-focus)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (!mod.isActive) e.currentTarget.style.background = 'var(--bg-subtle-box)';
                    }}
                    onMouseLeave={(e) => {
                      if (!mod.isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: `${mod.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <ModIcon size={18} color={mod.color} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-heading)' }}>
                            {mod.name}
                          </span>
                          <span className={`badge ${mod.badgeClass}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {mod.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {mod.desc}
                        </div>
                      </div>
                    </div>

                    {mod.isActive && (
                      <Check size={16} color="var(--primary)" style={{ flexShrink: 0, marginLeft: '8px' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* School Tenant or System Root Badge */}
        {currentTab === 'super-admin' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}>
            <ShieldCheck size={15} color="var(--primary)" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              SYSTEM TENANT
            </span>
            <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 6px' }}>
              ROOT MASTER
            </span>
          </div>
        ) : (
          school && (
            <div 
              onClick={() => setTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: currentTab === 'profile' ? 'var(--primary-light)' : 'var(--bg-surface-elevated)',
                border: `1px solid ${currentTab === 'profile' ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
              title="Click to view & edit Institutional Profile"
            >
              {school.logo_url ? (
                <img 
                  src={school.logo_url} 
                  alt="Logo" 
                  style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <Building2 size={15} color="var(--primary)" />
              )}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {school.name || 'School Workspace'}
              </span>
              {school.code && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ({school.code})
                </span>
              )}
            </div>
          )
        )}

        {/* Current Academic Year Pill */}
        {academicYear && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent-emerald-light)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <Calendar size={13} color="var(--accent-emerald)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              {academicYear.name || '2025-26'}
            </span>
            <span style={{ fontSize: '10px', background: 'var(--accent-emerald)', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
              ACTIVE
            </span>
          </div>
        )}
      </div>

      {/* Right controls: Theme Switcher, API Health, Super Admin Shortcut, User Role, Profile & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Super Admin Command Center Quick Button */}
        {user?.roles?.includes('super_admin') && (
          <button
            className={`btn btn-sm ${currentTab === 'super-admin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('super-admin')}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <ShieldCheck size={14} color={currentTab === 'super-admin' ? '#fff' : 'var(--secondary)'} />
            <span>Super Admin Portal</span>
          </button>
        )}

        {/* Dark / Light Theme Toggle Button */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
        </button>

        {/* API Status Ping */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: 'var(--radius-full)',
          background: apiOnline ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)',
          border: `1px solid ${apiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: apiOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'inline-block',
          }} className="pulse-circle"></span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: apiOnline ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            API {apiOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* User Role Pill */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <User size={14} color="#fff" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)' }}>
                {user.username}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>
                {user.roles?.[0]?.replace('_', ' ') || 'USER'}
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {user && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onLogout}
            title="Sign out of EDEX"
            style={{ padding: '8px 12px' }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
