import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  Users2, 
  UserCheck, 
  ShieldAlert, 
  CreditCard, 
  Vote, 
  Bus, 
  UtensilsCrossed, 
  Layers3, 
  Sparkles,
  ChevronLeft,
  Printer,
  Sliders,
  History,
  QrCode,
  FileCheck,
  BarChart3,
  Building2,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function Sidebar({
  currentTab,
  setTab,
  user,
  superAdminSubTab = 'schools',
  setSuperAdminSubTab,
  school,
  onSelectSchool
}) {
  const isSuperAdmin = user?.roles?.includes('super_admin');
  const isSuperAdminView = currentTab === 'super-admin';

  // Navigation for Super Admin Mode
  const superAdminNavItems = [
    {
      id: 'schools',
      label: 'Schools & Tenants',
      icon: Building2,
      badge: 'Platform',
      badgeClass: 'badge-primary'
    },
    {
      id: 'enquiries',
      label: 'Onboarding Enquiries',
      icon: Mail,
      badge: 'Pipeline',
      badgeClass: 'badge-amber'
    },
    {
      id: 'profile',
      label: 'Security & Root Profile',
      icon: ShieldCheck,
      badge: 'Root',
      badgeClass: 'badge-emerald'
    },
  ];

  // Navigation for SAARTHI Core Foundation (School Admin view)
  const coreNavItems = [
    ...(isSuperAdmin ? [{ id: 'super-admin', label: 'Super Admin Portal', icon: ShieldAlert, badge: 'SYSTEM' }] : []),
    { id: 'dashboard', label: 'School Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Master', icon: GraduationCap, badge: 'Core' },
    { id: 'classes', label: 'Classes & Sections', icon: BookOpen },
    { id: 'staff', label: 'Staff Directory', icon: Users2 },
    { id: 'guardians', label: 'Guardians & Parents', icon: UserCheck },
    { id: 'rbac', label: 'Roles & RBAC', icon: ShieldAlert },
  ];

  // Contextual Navigation when in ID Card Module
  const idCardNavItems = [
    { id: 'id-card', label: 'ID Card Studio', icon: CreditCard },
    { id: 'id-card-templates', label: 'Template Designer', icon: Sliders, badge: 'Studio' },
    { id: 'id-card-batch', label: 'Bulk Batch Print', icon: Printer },
    { id: 'id-card-logs', label: 'Issuance History', icon: History },
  ];

  // Contextual Navigation when in Voting Module
  const votingNavItems = [
    { id: 'voting', label: 'Live Ballot & Posts', icon: Vote },
    { id: 'voting-candidates', label: 'Candidates Roster', icon: Users2 },
    { id: 'voting-results', label: 'Live Tally & Results', icon: BarChart3, badge: 'Live' },
    { id: 'voting-roll', label: 'Electoral Roll', icon: FileCheck },
  ];

  // Contextual Navigation when in Bus Module
  const busNavItems = [
    { id: 'bus', label: 'Routes & Fleet', icon: Bus },
    { id: 'bus-stops', label: 'Stops & Geofencing', icon: QrCode },
    { id: 'bus-passengers', label: 'Student Rosters', icon: GraduationCap },
  ];

  // Contextual Navigation when in Canteen Module
  const canteenNavItems = [
    { id: 'canteen', label: 'Menu & POS', icon: UtensilsCrossed },
    { id: 'canteen-wallets', label: 'Student Wallets', icon: CreditCard },
    { id: 'canteen-transactions', label: 'Transaction Ledger', icon: History },
  ];

  // Determine section details
  let navItems = coreNavItems;
  let sectionTitle = 'School Workspace';
  let isModuleView = false;
  let moduleName = 'Core';

  if (isSuperAdminView) {
    sectionTitle = 'Super Admin Control';
  } else if (currentTab.startsWith('id-card')) {
    navItems = idCardNavItems;
    sectionTitle = 'ID Card Suite';
    isModuleView = true;
    moduleName = 'ID Card Module';
  } else if (currentTab.startsWith('voting')) {
    navItems = votingNavItems;
    sectionTitle = 'School Election Suite';
    isModuleView = true;
    moduleName = 'Voting Module';
  } else if (currentTab.startsWith('bus')) {
    navItems = busNavItems;
    sectionTitle = 'Bus Transportation';
    isModuleView = true;
    moduleName = 'Bus Module';
  } else if (currentTab.startsWith('canteen')) {
    navItems = canteenNavItems;
    sectionTitle = 'Canteen & Wallet';
    isModuleView = true;
    moduleName = 'Canteen Module';
  }

  return (
    <aside style={{
      width: '260px',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '22px 14px',
      height: 'calc(100vh - 68px)',
      overflowY: 'auto',
      position: 'sticky',
      top: '68px',
      zIndex: 30,
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* If Super Admin is currently inspecting a School Workspace */}
        {isSuperAdmin && !isSuperAdminView && (
          <button
            onClick={() => setTab('super-admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <ShieldAlert size={15} color="var(--primary)" />
              <span>← Super Admin Portal</span>
            </div>
            <span className="badge badge-primary" style={{ fontSize: '9px' }}>ROOT</span>
          </button>
        )}

        {/* Module Back Button if inside a specific module */}
        {isModuleView && (
          <button
            onClick={() => setTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#818cf8',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              fontFamily: 'inherit',
            }}
          >
            <ChevronLeft size={16} />
            <span>Back to School Core</span>
          </button>
        )}

        {/* Navigation Section */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            padding: '0 12px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{sectionTitle}</span>
            {isSuperAdminView && <Sparkles size={12} color="#a855f7" />}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {isSuperAdminView ? (
              // ── Dedicated Super Admin Navigation items ────────────────────────
              superAdminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = superAdminSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (setSuperAdminSubTab) setSuperAdminSubTab(item.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isActive ? 'rgba(99, 102, 241, 0.5)' : 'transparent',
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(139, 92, 246, 0.18) 100%)' 
                        : 'transparent',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                      fontFamily: 'inherit',
                      boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.2)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#cbd5e1';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <Icon size={18} color={isActive ? '#818cf8' : '#94a3b8'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`badge ${item.badgeClass}`} style={{ fontSize: '9px' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              // ── School Workspace Navigation items ───────────────────────────────
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isActive ? 'rgba(99, 102, 241, 0.5)' : 'transparent',
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(139, 92, 246, 0.18) 100%)' 
                        : 'transparent',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                      fontFamily: 'inherit',
                      boxShadow: isActive ? '0 4px 14px rgba(99, 102, 241, 0.2)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#cbd5e1';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <Icon size={18} color={isActive ? '#818cf8' : '#94a3b8'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="badge badge-primary" style={{ fontSize: '9px' }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quick School Workspace Switcher inside Super Admin Mode */}
        {isSuperAdminView && school && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Inspect School Tenant
            </div>
            <button
              onClick={() => setTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: '#a5b4fc',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <Building2 size={14} color="var(--primary)" />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {school.name}
                </span>
              </div>
              <ExternalLink size={12} />
            </button>
          </div>
        )}

      </div>

      {/* Bottom Pinned Box: School Settings */}
      <div 
        onClick={() => setTab('profile')}
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          background: currentTab === 'profile' 
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))' 
            : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${currentTab === 'profile' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)'}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: currentTab === 'profile' ? '0 0 16px rgba(99, 102, 241, 0.3)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (currentTab !== 'profile') {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
          }
        }}
        onMouseLeave={(e) => {
          if (currentTab !== 'profile') {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {school?.logo_url ? (
              <img 
                src={school.logo_url} 
                alt="Logo" 
                style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <Building2 size={16} color={currentTab === 'profile' ? '#c084fc' : '#818cf8'} />
            )}
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              School Settings
            </span>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 5px' }}>
            Settings
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
          Profile, Logo Crop & Security
        </div>
      </div>
    </aside>
  );
}
