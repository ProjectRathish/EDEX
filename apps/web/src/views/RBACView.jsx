import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Lock, 
  Check, 
  Layers, 
  Sparkles, 
  CreditCard, 
  Vote, 
  Bus, 
  UtensilsCrossed 
} from 'lucide-react';
import { RoleService } from '../services/api';

export default function RBACView() {
  const [roles, setRoles] = useState([]);
  const [permissionsData, setPermissionsData] = useState({ total: 0, modules: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRBAC();
  }, []);

  const loadRBAC = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        RoleService.list(),
        RoleService.listPermissions(),
      ]);
      setRoles(rolesRes.data?.data || []);
      setPermissionsData(permsRes.data?.data || { total: 0, modules: {} });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const moduleColors = {
    core: '#6366f1',
    id_card: '#8b5cf6',
    voting: '#ec4899',
    bus: '#f59e0b',
    canteen: '#10b981',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Role-Based Access Control (RBAC)</h1>
          <span className="badge badge-primary">
            {permissionsData.total} Platform Permissions
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Platform-wide permission definitions using dot-notation (module.resource.action) across all SAARTHI services.
        </p>
      </div>

      {/* System Roles Row */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Platform Roles & Assigned Privileges</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}>
          {roles.map((r) => (
            <div
              key={r.role_id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle-box)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '15px' }}>
                  {r.name.replace('_', ' ').toUpperCase()}
                </span>
                <span className="badge badge-emerald">
                  {r.permissions_count} Perms
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {r.description || 'Standard role definition'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Catalog by Module */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Permission Catalog by Module</h3>
        
        {Object.entries(permissionsData.modules || {}).map(([modName, perms]) => {
          const color = moduleColors[modName] || '#6366f1';
          return (
            <div key={modName} className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: color,
                  }}></div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-heading)' }}>
                    Module: {modName.replace('_', ' ')}
                  </h4>
                </div>
                <span className="badge badge-primary">
                  {perms.length} Permissions
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '10px',
              }}>
                {perms.map((p) => (
                  <div
                    key={p.permission_id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle-box)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {p.description || `Allows ${p.action} on ${p.resource}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
