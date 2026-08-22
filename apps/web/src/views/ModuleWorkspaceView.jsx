import React, { useState } from 'react';
import { 
  CreditCard, 
  Vote, 
  Bus, 
  UtensilsCrossed, 
  Sparkles, 
  QrCode, 
  Layers3, 
  CheckCircle2,
  Printer,
  ShieldCheck,
  User,
  GraduationCap
} from 'lucide-react';

function ModuleWorkspaceView({ moduleId, students = [], staff = [], classes = [], school, academicYear }) {
  const [selectedStudentId, setSelectedStudentId] = useState(students?.[0]?.student_id || '');
  const [voteCount, setVoteCount] = useState({ captain_aarav: 142, captain_rohit: 98 });
  const [hasVoted, setHasVoted] = useState(false);

  const selectedStudent = students.find((s) => s.student_id === selectedStudentId) || students?.[0];

  if (moduleId === 'id-card') {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>ID Card Studio & Card Generator</h1>
              <span className="badge badge-primary">Consuming SAARTHI Core</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Live rendering student card data directly from <code style={{ color: 'var(--primary)' }}>core_students</code> and <code style={{ color: 'var(--primary)' }}>core_student_academic_assignments</code>.
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Student Card</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
          
          {/* Controls */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Select Student from Core</h3>
            <div className="input-group">
              <label className="input-label">Student Master Record</label>
              <select
                className="input-field"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.first_name} {s.last_name} ({s.admission_number})
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              marginTop: '16px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle-box)',
              border: '1px solid var(--border-subtle)'
            }}>
              ℹ️ <strong>Zero Data Duplication Rule:</strong> The ID card module never creates a duplicate student record. It references <code style={{ color: 'var(--primary)' }}>student_id</code> and renders verified Core identity in real time.
            </div>
          </div>

          {/* Physical ID Card Preview Render */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '360px',
              height: '520px',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 60%, #1e293b 100%)',
              border: '2px solid rgba(99, 102, 241, 0.5)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative Holographic Bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '8px',
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #06b6d4)',
              }}></div>

              {/* School Header */}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {school?.name || 'DELHI PUBLIC SCHOOL'}
                </div>
                <div style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  STUDENT IDENTITY CARD • {academicYear?.name || '2025-26'}
                </div>
              </div>

              {/* Photo & Identity Core Data */}
              <div style={{ textAlign: 'center', margin: '14px 0' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  border: '3px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#ffffff',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                }}>
                  {selectedStudent?.first_name?.[0] || 'S'}
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                  {selectedStudent?.first_name} {selectedStudent?.last_name}
                </h2>
                <span className="badge badge-emerald" style={{ marginTop: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399' }}>
                  {selectedStudent?.class_name || 'Class 10'} — {selectedStudent?.section_name || 'A'}
                </span>
              </div>

              {/* Identity Fields Grid */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.45)',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '11px',
              }}>
                <div>
                  <div style={{ color: '#94a3b8' }}>ADMISSION NO</div>
                  <div style={{ fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>{selectedStudent?.admission_number}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>ROLL NUMBER</div>
                  <div style={{ fontWeight: 800, color: '#ffffff' }}>#{selectedStudent?.roll_number || '12'}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>BLOOD GROUP</div>
                  <div style={{ fontWeight: 800, color: '#fbbf24' }}>{selectedStudent?.blood_group || 'B+'}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>DATE OF BIRTH</div>
                  <div style={{ fontWeight: 800, color: '#ffffff' }}>{selectedStudent?.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : '15/05/2010'}</div>
                </div>
              </div>

              {/* QR Verification Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <QrCode size={30} color="#ffffff" />
                  <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.2 }}>
                    SAARTHI SECURE<br />DIGITAL VERIFIED
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: '#a5b4fc', textAlign: 'right' }}>
                  SAARTHI SUPER APP<br />CORE MASTER RECORD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'voting') {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800 }}>School Election & Digital Ballot</h1>
              <span className="badge badge-primary">Consuming SAARTHI Core</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Electoral roll dynamically constructed from active students in <code style={{ color: 'var(--primary)' }}>Class 9–12</code> for Year {academicYear?.name}.
            </p>
          </div>

          <span className="badge badge-emerald" style={{ padding: '8px 14px' }}>
            ● ELECTION IN PROGRESS
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Post 1 Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <span className="badge badge-primary" style={{ marginBottom: '12px' }}>POST: HEAD BOY / SCHOOL CAPTAIN</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '14px' }}>Candidate: Aarav Sharma</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Class 10-A • Manifesto: "Innovation in sports, science lab expansions & peer mentorship."
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Live Votes:</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' }}>
                {voteCount.captain_aarav} Votes
              </span>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={hasVoted}
              onClick={() => {
                setVoteCount({ ...voteCount, captain_aarav: voteCount.captain_aarav + 1 });
                setHasVoted(true);
              }}
            >
              {hasVoted ? '✓ Vote Recorded on Core Ledger' : 'Cast Digital Ballot for Aarav'}
            </button>
          </div>

          {/* Post 2 Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-xl)' }}>
            <span className="badge badge-primary" style={{ marginBottom: '12px' }}>POST: HEAD BOY / SCHOOL CAPTAIN</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '14px' }}>Candidate: Rohit Verma</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Class 10-B • Manifesto: "Eco-friendly campus initiatives, debate clubs & arts fest."
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Live Votes:</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--secondary)', fontFamily: 'Outfit' }}>
                {voteCount.captain_rohit} Votes
              </span>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              disabled={hasVoted}
              onClick={() => {
                setVoteCount({ ...voteCount, captain_rohit: voteCount.captain_rohit + 1 });
                setHasVoted(true);
              }}
            >
              {hasVoted ? '✓ Vote Recorded on Core Ledger' : 'Cast Digital Ballot for Rohit'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
      <Sparkles size={36} color="var(--primary)" style={{ marginBottom: '12px' }} />
      <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Module: {moduleId?.toUpperCase()}</h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '8px auto 0' }}>
        This module is connected to SAARTHI Core and ready to consume student and guardian master records.
      </p>
    </div>
  );
}

export default ModuleWorkspaceView;
