import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import DashboardView from './views/DashboardView';
import StudentsView from './views/StudentsView';
import ClassesView from './views/ClassesView';
import StaffView from './views/StaffView';
import ModulesView from './views/ModulesView';
import RBACView from './views/RBACView';
import ModuleWorkspaceView from './views/ModuleWorkspaceView';
import SuperAdminView from './views/SuperAdminView';
import SchoolProfileView from './views/SchoolProfileView';

import {
  AuthService,
  SchoolService,
  AcademicYearService,
  ClassService,
  StudentService,
  StaffService,
  ModuleService
} from './services/api';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('saarthi_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('saarthi_token') || null);
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const u = localStorage.getItem('saarthi_user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed?.roles?.includes('super_admin') ? 'super-admin' : 'dashboard';
      }
    } catch {}
    return 'dashboard';
  });
  const [superAdminSubTab, setSuperAdminSubTab] = useState('schools');
  const [apiOnline, setApiOnline] = useState(true);
  const [loading, setLoading] = useState(false);

  // Theme State (Dark / Light) with LocalStorage persistence
  const [theme, setTheme] = useState(localStorage.getItem('saarthi_theme') || 'dark');

  // Core Data States
  const [school, setSchool] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [modulesStatus, setModulesStatus] = useState({});

  useEffect(() => {
    // Apply theme attribute to document root
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('saarthi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Check existing login on startup
    const savedUser = localStorage.getItem('saarthi_user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (!parsed.roles?.includes('super_admin')) {
          setCurrentTab('dashboard');
        } else {
          setCurrentTab('super-admin');
        }
        loadAppData();
      } catch (e) {
        console.error(e);
      }
    }
  }, [token]);

  const loadAppData = async (overrideSchool = null, forcedUser = null) => {
    setLoading(true);
    try {
      // 1. Check Me & API health
      let currentUser = forcedUser || user;
      try {
        const meRes = await AuthService.me();
        if (meRes.data?.data) {
          currentUser = meRes.data.data;
          setUser(currentUser);
        }
      } catch (e) {
        console.warn('Auth Me error:', e);
      }
      setApiOnline(true);

      // 2. Fetch School info
      const schoolsRes = await SchoolService.list();
      const schoolsList = schoolsRes.data?.data || [];
      
      let currentSchool = null;
      if (overrideSchool) {
        currentSchool = overrideSchool;
      } else if (currentUser?.school_id) {
        currentSchool = schoolsList.find((s) => s.school_id === currentUser.school_id) || schoolsList[0] || null;
      } else {
        currentSchool = schoolsList[0] || null;
      }
      setSchool(currentSchool);

      // 3. Fetch Academic Years & school specific data
      if (currentSchool) {
        const ayRes = await AcademicYearService.list();
        const ays = ayRes.data?.data || [];
        setAcademicYears(ays);
        const currentAy = ays.find((a) => a.is_current) || ays[0] || null;
        setAcademicYear(currentAy);

        // 4. Fetch Classes & Sections
        const clsRes = await ClassService.list(true);
        setClasses(clsRes.data?.data || []);

        // 5. Fetch Students
        const stuRes = await StudentService.list();
        setStudents(stuRes.data?.data?.students || []);

        // 6. Fetch Staff
        const stfRes = await StaffService.list();
        setStaff(stfRes.data?.data?.staff || []);

        // 7. Fetch Module activations
        const modRes = await ModuleService.list(currentSchool.school_id);
        const mods = modRes.data?.data || [];
        const modMap = {};
        mods.forEach((m) => {
          modMap[m.module_name] = m;
        });
        setModulesStatus(modMap);
      }
    } catch (err) {
      console.error('Error loading core data:', err);
      if (err.code === 'ERR_NETWORK') setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    if (userData.roles?.includes('super_admin')) {
      setCurrentTab('super-admin');
    } else {
      setCurrentTab('dashboard');
    }
    loadAppData(null, userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('saarthi_token');
    localStorage.removeItem('saarthi_user');
    setUser(null);
    setToken(null);
    setSchool(null);
    setAcademicYear(null);
    setAcademicYears([]);
    setClasses([]);
    setStudents([]);
    setStaff([]);
    setModulesStatus({});
  };

  const handleSelectSchoolFromSuperAdmin = (targetSchool) => {
    setSchool(targetSchool);
    setCurrentTab('dashboard');
    loadAppData(targetSchool);
  };

  if (!token || !user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Top Sticky Navbar with Global Module Switcher */}
      <Navbar
        user={user}
        school={school}
        academicYear={academicYear}
        onLogout={handleLogout}
        apiOnline={apiOnline}
        theme={theme}
        toggleTheme={toggleTheme}
        currentTab={currentTab}
        setTab={setCurrentTab}
        modulesStatus={modulesStatus}
      />

      {/* Main Content Layout with Sidebar */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          currentTab={currentTab}
          setTab={setCurrentTab}
          user={user}
          modulesStatus={modulesStatus}
          superAdminSubTab={superAdminSubTab}
          setSuperAdminSubTab={setSuperAdminSubTab}
          school={school}
          onSelectSchool={handleSelectSchoolFromSuperAdmin}
        />

        {/* Dynamic Workspace Container */}
        <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {currentTab === 'super-admin' && (
            <SuperAdminView
              currentUser={user}
              currentSchool={school}
              onSelectSchool={handleSelectSchoolFromSuperAdmin}
              refreshGlobalData={loadAppData}
              activeSubTab={superAdminSubTab}
              setActiveSubTab={setSuperAdminSubTab}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              students={students}
              staff={staff}
              classes={classes}
              academicYear={academicYear}
              school={school}
              setTab={setCurrentTab}
            />
          )}

          {currentTab === 'profile' && (
            <SchoolProfileView
              school={school}
              user={user}
              refreshData={loadAppData}
              academicYear={academicYear}
            />
          )}

          {currentTab === 'students' && (
            <StudentsView
              students={students}
              classes={classes}
              academicYear={academicYear}
              refreshData={loadAppData}
            />
          )}

          {currentTab === 'classes' && (
            <ClassesView
              classes={classes}
              academicYear={academicYear}
              academicYears={academicYears}
              refreshData={loadAppData}
            />
          )}

          {currentTab === 'staff' && (
            <StaffView
              staff={staff}
              refreshData={loadAppData}
            />
          )}

          {currentTab === 'guardians' && (
            <StudentsView
              students={students}
              classes={classes}
              academicYear={academicYear}
              refreshData={loadAppData}
            />
          )}

          {currentTab === 'rbac' && (
            <RBACView />
          )}

          {['id-card', 'voting', 'bus', 'canteen'].includes(currentTab) && (
            <ModuleWorkspaceView
              moduleId={currentTab}
              students={students}
              staff={staff}
              classes={classes}
              school={school}
              academicYear={academicYear}
            />
          )}
        </main>
      </div>
    </div>
  );
}
