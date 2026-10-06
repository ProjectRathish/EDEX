import React from 'react';
import { 
  GraduationCap, 
  Users2, 
  BookOpen, 
  Layers3, 
  ArrowUpRight, 
  CreditCard, 
  Vote, 
  Bus, 
  UtensilsCrossed, 
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Building2,
  MapPin,
  Mail,
  Phone,
  Clock
} from 'lucide-react';

export default function DashboardView({ 
  students = [], 
  staff = [], 
  classes = [], 
  academicYear = null, 
  school = null, 
  setTab 
}) {
  const statCards = [
    {
      title: 'Master Students',
      value: (students?.length) || 0,
      change: '1 Record Source',
      icon: GraduationCap,
      color: '#6366f1',
      action: () => setTab('students'),
    },
    {
      title: 'Active Faculty & Staff',
      value: (staff?.length) || 0,
      change: 'Assigned across classes',
      icon: Users2,
      color: '#06b6d4',
      action: () => setTab('staff'),
    },
    {
      title: 'Configured Classes',
      value: (classes?.length) || 0,
      change: 'Persistent Levels',
      icon: BookOpen,
      color: '#8b5cf6',
      action: () => setTab('classes'),
    },
    {
      title: 'Active Academic Year',
      value: academicYear?.name || '2025-26',
      change: 'Single Active Tenant Year',
      icon: Calendar,
      color: '#10b981',
      action: () => setTab('classes'),
    },
  ];

  const modules = [
    {
      id: 'id-card',
      title: 'ID Card Suite',
      desc: 'Automatic student & staff card generation with dynamic templates and instant QR/Barcode rendering.',
      icon: CreditCard,
      status: 'Active & Linked',
      color: '#6366f1',
      bgGlow: 'var(--primary-light)',
    },
    {
      id: 'voting',
      title: 'School Election & Voting',
      desc: 'Democracy in schools. Voter lists dynamically generated from Core Class/Section eligibility rules.',
      icon: Vote,
      status: 'Active & Linked',
      color: '#8b5cf6',
      bgGlow: 'var(--secondary-light)',
    },
    {
      id: 'bus',
      title: 'Bus Transportation',
      desc: 'Real-time GPS tracking, stop management, and authorized pickup validation with Core Guardians.',
      icon: Bus,
      status: 'Optional Module',
      color: '#f59e0b',
      bgGlow: 'var(--accent-amber-light)',
    },
    {
      id: 'canteen',
      title: 'Canteen & Digital Wallet',
      desc: 'Cashless meal orders, student wallet top-ups, and dietary tracking linked to Core student identity.',
      icon: UtensilsCrossed,
      status: 'Optional Module',
      color: '#10b981',
      bgGlow: 'var(--accent-emerald-light)',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Hero Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-hero)',
        border: '1px solid var(--border-hero)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-primary">
              <Sparkles size={12} />
              EDEX CORE PLATFORM
            </span>
            <span className="badge badge-emerald">
              <CheckCircle2 size={12} />
              MULTI-TENANT SAAS ISOLATED
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>
            Welcome to {school?.name || 'EDEX Super App'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '640px' }}>
            The central foundation for school identity, academic placements, and integrated multi-module operations. One master student record powering every service.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setTab('students')}
          style={{ padding: '12px 20px', fontSize: '14px' }}
        >
          <GraduationCap size={18} />
          <span>Manage Students</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
      }}>
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div 
              key={i} 
              className="glass-panel" 
              onClick={c.action}
              style={{
                padding: '22px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'var(--transition-normal)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'var(--border-focus)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-glass)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {c.title}
                </span>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${c.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} color={c.color} />
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-heading)', marginBottom: '4px' }}>
                {c.value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {c.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Super App Modules Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Super App Modules</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Connected application modules consuming EDEX Core data
            </p>
          </div>
          <span className="badge badge-primary" style={{ padding: '6px 12px' }}>
            Unified Backend (Node.js + MySQL)
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px',
        }}>
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div 
                key={m.id}
                className="glass-panel"
                onClick={() => setTab(m.id)}
                style={{
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'var(--transition-normal)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--border-focus)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: m.bgGlow,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={22} color={m.color} />
                    </div>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      {m.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>
                    {m.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {m.desc}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                }}>
                  <span>Launch Module Studio</span>
                  <ArrowUpRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
