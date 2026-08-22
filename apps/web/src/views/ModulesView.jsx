import React, { useState } from 'react';
import { 
  CreditCard, 
  Vote, 
  Bus, 
  UtensilsCrossed, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  QrCode, 
  Sliders, 
  TrendingUp, 
  Clock, 
  Users,
  Building2,
  Lock
} from 'lucide-react';
import { ModuleService } from '../services/api';

export default function ModulesView({ modulesStatus, school, user, refreshData }) {
  const [loadingModule, setLoadingModule] = useState(null);
  const isSuperAdmin = user?.roles?.includes('super_admin');

  const toggleModule = async (modName, currentStatus) => {
    if (!isSuperAdmin) {
      alert('Only Super Administrators can activate or deactivate modules per school.');
      return;
    }
    setLoadingModule(modName);
    try {
      await ModuleService.toggle(modName, {
        target_school_id: school?.school_id,
        is_enabled: !currentStatus,
      });
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to toggle module.');
    } finally {
      setLoadingModule(null);
    }
  };

  const moduleDefinitions = [
    {
      id: 'id_card',
      title: 'ID Card Management Suite',
      subtitle: 'Dynamic Template Studio & Smart Issuance',
      desc: 'Seamlessly reads student name, DOB, blood group, and class placement directly from SAARTHI Core to print or download tamper-proof ID cards with QR codes.',
      icon: CreditCard,
      color: '#6366f1',
      bgGlow: 'var(--primary-light)',
      features: [
        'Zero duplicate student records — dynamic Core joins',
        'Custom visual template layout builder per school',
        'Auto-generated QR code linking to verified student identity',
        'Bulk batch printing for entire classrooms',
      ],
      previewSnippet: 'idcard_cards -> FK to core_students(student_id)',
    },
    {
      id: 'voting',
      title: 'School Election & Digital Voting',
      subtitle: 'Transparent Student Council Elections',
      desc: 'Create school leadership elections. Eligible voters are automatically verified from Core Student Academic Placements. Eliminates voter fraud with single-vote cryptographic hashes.',
      icon: Vote,
      color: '#8b5cf6',
      bgGlow: 'var(--secondary-light)',
      features: [
        'Eligibility gate based on class level (e.g. Class 9+)',
        'Candidate nominations linked to Core Student ID',
        'Real-time live tabulation & audit log',
        'Supervised by Core Staff Election Officers',
      ],
      previewSnippet: 'voting_votes -> UNIQUE(election_id, post_id, voter_student_id)',
    },
    {
      id: 'bus',
      title: 'Bus Transportation & Live GPS',
      subtitle: 'Fleet Safety, Route Planner & Guardian Pickups',
      desc: 'Plan bus routes, geofence stops, and manage vehicle rosters. Drivers and conductors use mobile logs while parents receive live arrival pings.',
      icon: Bus,
      color: '#f59e0b',
      bgGlow: 'var(--accent-amber-light)',
      features: [
        'Route stops & student assignment per academic year',
        'Authorized pickup security using Core Guardians (can_pickup flag)',
        'Live boarding/alighting attendance tracking',
        'Emergency SMS/Push dispatch to emergency contacts',
      ],
      previewSnippet: 'bus_assignments -> references core_students & core_routes',
    },
    {
      id: 'canteen',
      title: 'Canteen & Digital Parent Wallet',
      subtitle: 'Cashless Campus Food Ordering',
      desc: 'Digital canteen menu catalog with student prepaid wallets. Parents can top up balances and set daily spend limits directly from the parent app.',
      icon: UtensilsCrossed,
      color: '#10b981',
      bgGlow: 'var(--accent-emerald-light)',
      features: [
        'Individual student & staff wallet balances in Core currency',
        'Daily menu scheduling with live inventory counters',
        'Instant transaction ledger with debit/credit integrity',
        'Dietary restriction alerts during point-of-sale checkout',
      ],
      previewSnippet: 'canteen_wallets -> UNIQUE(school_id, entity_id)',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Super App Modules Hub</h1>
            <span className="badge badge-primary">
              Multi-Module SaaS Architecture
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            All modules read from SAARTHI Core data. Individual modules can be activated or deactivated per school.
          </p>
        </div>

        {isSuperAdmin ? (
          <span className="badge badge-emerald" style={{ padding: '6px 12px' }}>
            <Sparkles size={13} />
            Super Admin Controls Enabled
          </span>
        ) : (
          <span className="badge badge-amber" style={{ padding: '6px 12px' }}>
            <Lock size={13} />
            Managed by Platform Admin
          </span>
        )}
      </div>

      {/* Module Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
      }}>
        {moduleDefinitions.map((m) => {
          const Icon = m.icon;
          const isEnabled = modulesStatus?.[m.id]?.is_enabled ?? false;

          return (
            <div 
              key={m.id}
              className="glass-panel"
              style={{
                padding: '28px',
                borderRadius: 'var(--radius-xl)',
                border: `1px solid ${isEnabled ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)'}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
                position: 'relative',
              }}
            >
              <div>
                {/* Header with Icon & Status Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: m.bgGlow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={26} color={m.color} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${isEnabled ? 'badge-emerald' : 'badge-amber'}`}>
                      {isEnabled ? 'ACTIVATED' : 'DISABLED'}
                    </span>
                    {isSuperAdmin && (
                      <button
                        className={`btn ${isEnabled ? 'btn-danger' : 'btn-primary'} btn-sm`}
                        onClick={() => toggleModule(m.id, isEnabled)}
                        disabled={loadingModule === m.id}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        {loadingModule === m.id ? 'Updating...' : (isEnabled ? 'Deactivate' : 'Activate')}
                      </button>
                    )}
                  </div>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {m.title}
                </h2>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  {m.subtitle}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                  {m.desc}
                </p>

                {/* Key Features List */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {m.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={14} color="var(--accent-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Integrity Footnote */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle-box)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Sparkles size={14} color="var(--primary)" />
                <span>{m.previewSnippet}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
