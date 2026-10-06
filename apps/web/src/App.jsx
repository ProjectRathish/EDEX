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
import IAMView from './views/IAMView';
import ModuleWorkspaceView from './views/ModuleWorkspaceView';
import SuperAdminView from './views/SuperAdminView';
import SchoolProfileView from './views/SchoolProfileView';
import BusView from './views/BusView';
import BusManagementView from './views/BusManagementView';
import RouteManagementView from './views/RouteManagementView';
import StudentRosterView from './views/StudentRosterView';
import LiveBusMapView from './views/LiveBusMapView';
import GuardiansView from './views/GuardiansView';

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
      const u = localStorage.getItem('edex_user') || localStorage.getItem('saarthi_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('edex_token') || localStorage.getItem('saarthi_token') || null);
  // Helper to determine initial tab from URL hash, localStorage, or user role
  const getInitialTab = () => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash) return hash;
      const savedTab = localStorage.getItem('edex_active_tab');
      if (savedTab) return savedTab;
      const u = localStorage.getItem('edex_user') || localStorage.getItem('saarthi_user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed?.roles?.includes('super_admin') ? 'super-admin' : 'dashboard';
      }
    } catch {}
    return 'dashboard';
  };

  const [currentTab, setCurrentTabState] = useState(getInitialTab);

  // Wrapper for setCurrentTab to keep state, localStorage, and URL hash in sync
  const setCurrentTab = (tab) => {
    setCurrentTabState(tab);
    if (tab) {
      localStorage.setItem('edex_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, '', `#${tab}`);
      }
    }
  };

  // Listen for browser Back/Forward navigation (hash changes)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && hash !== currentTab) {
        setCurrentTabState(hash);
        localStorage.setItem('edex_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentTab]);

  // Ensure current tab is mirrored in hash and localStorage on initial mount
  useEffect(() => {
    if (currentTab) {
      localStorage.setItem('edex_active_tab', currentTab);
      if (window.location.hash !== `#${currentTab}`) {
        window.history.replaceState(null, '', `#${currentTab}`);
      }
    }
  }, []);

  const [superAdminSubTab, setSuperAdminSubTab] = useState('schools');
  const [apiOnline, setApiOnline] = useState(true);
  const [loading, setLoading] = useState(false);

  // Theme State (Dark / Light) with LocalStorage persistence
  const [theme, setTheme] = useState(localStorage.getItem('edex_theme') || localStorage.getItem('saarthi_theme') || 'dark');

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
    localStorage.setItem('edex_theme', theme);
    localStorage.setItem('saarthi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Check existing login on startup
    const savedUser = localStorage.getItem('edex_user') || localStorage.getItem('saarthi_user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
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
        if (e.response?.status === 401) {
          handleLogout();
          return;
        }
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

        // 5. Fetch Students (Full Roster)
        const stuRes = await StudentService.list({ all: true });
        setStudents(stuRes.data?.data?.students || []);

        // 6. Fetch Staff (Full Roster)
        const stfRes = await StaffService.list({ all: true });
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
      if (err.response?.status === 401) {
        handleLogout();
        return;
      }
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
    localStorage.removeItem('edex_token');
    localStorage.removeItem('edex_user');
    localStorage.removeItem('saarthi_token');
    localStorage.removeItem('saarthi_user');
    localStorage.removeItem('edex_active_tab');
    window.history.replaceState(null, '', window.location.pathname);
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
        <main style={{ flex: 1, padding: '28px 36px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
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
              setTab={setCurrentTab}
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
              classes={classes}
              academicYear={academicYear}
              academicYears={academicYears}
              refreshData={loadAppData}
            />
          )}

          {currentTab === 'guardians' && (
            <GuardiansView
              school={school}
              classes={classes}
              academicYear={academicYear}
              setTab={setCurrentTab}
            />
          )}

          {['iam', 'rbac'].includes(currentTab) && (
            <IAMView
              school={school}
              staff={staff}
            />
          )}

          {['bus', 'bus-live-map'].includes(currentTab) && (
            <LiveBusMapView
              school={school}
              academicYear={academicYear}
              onNavigate={setCurrentTab}
              theme={theme}
            />
          )}

          {currentTab === 'bus-management' && (
            <BusManagementView
              staff={staff}
              academicYear={academicYear}
            />
          )}

          {['bus-routes', 'bus-stops', 'bus-map'].includes(currentTab) && (
            <RouteManagementView
              academicYear={academicYear}
              school={school}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'bus-passengers' && (
            <StudentRosterView
              students={students}
              staff={staff}
              classes={classes}
              school={school}
              academicYear={academicYear}
            />
          )}

          {['id-card', 'voting', 'canteen'].includes(currentTab) && (
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
