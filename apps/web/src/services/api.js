import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edex_token') || localStorage.getItem('saarthi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses for auth expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('edex_token');
        localStorage.removeItem('edex_user');
        localStorage.removeItem('saarthi_token');
        localStorage.removeItem('saarthi_user');
      }
    }
    return Promise.reject(error);
  }
);

// ── API Services ─────────────────────────────────────────────────────────────

export const AuthService = {
  login: (username, password, school_code = '') => api.post('/auth/login', { username, password, school_code }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  }),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const SchoolService = {
  list: () => api.get('/schools'),
  getNextCode: () => api.get('/schools/next-code'),
  get: (id) => api.get(`/schools/${id}`),
  create: (data) => api.post('/schools', data),
  update: (id, data) => api.put(`/schools/${id}`, data),
  toggleStatus: (id, isActive) => api.put(`/schools/${id}/status`, { is_active: isActive }),
  delete: (id) => api.delete(`/schools/${id}`),
  resetAdminPassword: (id, newPassword, userId = null) => api.post(`/schools/${id}/reset-admin-password`, {
    new_password: newPassword,
    user_id: userId,
  }),
};

export const EnquiryService = {
  list: (params = {}) => api.get('/enquiries', { params }),
  createPublic: (data) => api.post('/enquiries', data),
  approve: (id, data) => api.post(`/enquiries/${id}/approve`, data),
  reject: (id, data) => api.post(`/enquiries/${id}/reject`, data),
};

export const AcademicYearService = {
  list: () => api.get('/academic-years'),
  getCurrent: () => api.get('/academic-years/current'),
  create: (data) => api.post('/academic-years', data),
  setCurrent: (id) => api.patch(`/academic-years/${id}/set-current`),
};

export const ClassService = {
  list: (includeSections = true) => api.get(`/classes?include_sections=${includeSections}`),
  get: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  createSection: (classId, data) => api.post(`/classes/${classId}/sections`, data),
  updateSection: (classId, sectionId, data) => api.put(`/classes/${classId}/sections/${sectionId}`, data),
  deleteSection: (classId, sectionId) => api.delete(`/classes/${classId}/sections/${sectionId}`),
};

export const StudentService = {
  list: (params = {}) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  bulkDelete: (studentIds) => api.post('/students/bulk-delete', { student_ids: studentIds }),
  bulkUpload: (students, upsert = true) => api.post('/students/bulk-upload', { students, upsert }),
};

export const StudentAssignmentService = {
  list: (params = {}) => api.get('/student-assignments', { params }),
  create: (data) => api.post('/student-assignments', data),
};

export const StaffService = {
  list: (params = {}) => api.get('/staff', { params }),
  get: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  bulkDelete: (staffIds) => api.post('/staff/bulk-delete', { staff_ids: staffIds }),
  bulkUpload: (staff, upsert = true) => api.post('/staff/bulk-upload', { staff, upsert }),
  listAssignments: (params = {}) => api.get('/staff/assignments/all', { params }),
  saveClassAssignments: (data) => api.post('/staff/assignments/class-save', data),
  createAssignment: (staffId, data) => api.post(`/staff/${staffId}/assignments`, data),
  deleteAssignment: (assignmentId) => api.delete(`/staff/assignments/${assignmentId}`),
};

export const GuardianService = {
  getStats: () => api.get('/guardians/stats'),
  list: (params = {}) => api.get('/guardians', { params }),
  getOne: (id) => api.get(`/guardians/${id}`),
  create: (data) => api.post('/guardians', data),
  update: (id, data) => api.put(`/guardians/${id}`, data),
  delete: (id) => api.delete(`/guardians/${id}`),
  createAccount: (id, data) => api.post(`/guardians/${id}/account`, data),
  resetPassword: (id, data) => api.post(`/guardians/${id}/reset-password`, data),
  toggleAccountStatus: (id, data) => api.patch(`/guardians/${id}/account-status`, data),
  deleteAccount: (id) => api.delete(`/guardians/${id}/account`),
  bulkGenerate: (data) => api.post('/guardians/bulk-generate', data),
  bulkAction: (data) => api.post('/guardians/bulk-action', data),
  linkStudent: (id, data) => api.post(`/guardians/${id}/students`, data),
  unlinkStudent: (id, studentId) => api.delete(`/guardians/${id}/students/${studentId}`),
};

export const ModuleService = {
  list: (schoolId) => api.get('/modules', { params: { school_id: schoolId } }),
  toggle: (moduleName, data) => api.patch(`/modules/${moduleName}/toggle`, data),
};

export const BusService = {
  // Summary
  getSummary: (params = {}) => api.get('/bus/summary', { params }),

  // Vehicles
  listVehicles: (params = {}) => api.get('/bus/vehicles', { params }),
  createVehicle: (data) => api.post('/bus/vehicles', data),
  updateVehicle: (id, data) => api.put(`/bus/vehicles/${id}`, data),
  deleteVehicle: (id) => api.delete(`/bus/vehicles/${id}`),

  // Routes
  listRoutes: (params = {}) => api.get('/bus/routes', { params }),
  getRoute: (id) => api.get(`/bus/routes/${id}`),
  createRoute: (data) => api.post('/bus/routes', data),
  updateRoute: (id, data) => api.put(`/bus/routes/${id}`, data),
  deleteRoute: (id) => api.delete(`/bus/routes/${id}`),

  // Stops
  listStops: (routeId) => api.get(`/bus/routes/${routeId}/stops`),
  createStop: (routeId, data) => api.post(`/bus/routes/${routeId}/stops`, data),
  updateStop: (stopId, data) => api.put(`/bus/stops/${stopId}`, data),
  deleteStop: (stopId) => api.delete(`/bus/stops/${stopId}`),

  // Student Assignments
  listStudentAssignments: (params = {}) => api.get('/bus/assignments/students', { params }),
  listUnassignedStudents: (params = {}) => api.get('/bus/assignments/students/unassigned', { params }),
  assignStudent: (data) => api.post('/bus/assignments/students', data),
  bulkAssignStudents: (data) => api.post('/bus/assignments/students/bulk', data),
  bulkActionStudentAssignments: (data) => api.post('/bus/assignments/students/bulk-action', data),
  updateStudentAssignment: (id, data) => api.patch(`/bus/assignments/students/${id}`, data),
  unassignStudent: (id, params = {}) => api.delete(`/bus/assignments/students/${id}`, { params }),

  // Staff Assignments
  listStaffAssignments: (params = {}) => api.get('/bus/assignments/staff', { params }),
  assignStaff: (data) => api.post('/bus/assignments/staff', data),
  unassignStaff: (id) => api.delete(`/bus/assignments/staff/${id}`),
  unassignStaffByVehicle: (busId, role) => api.delete(`/bus/assignments/staff/vehicle/${busId}/${role}`),

  // Route Path (OSRM)
  getRoutePath: (routeId) => api.get(`/bus/routes/${routeId}/path`),
  generateRoutePath: (routeId) => api.post(`/bus/routes/${routeId}/path/generate`),
  deleteRoutePath: (routeId) => api.delete(`/bus/routes/${routeId}/path`),

  // GPS Tracking
  recordGpsPing: (data) => api.post('/bus/tracking/ping', data),
  endTrip: (routeId) => api.post(`/bus/tracking/${routeId}/end-trip`),
  getLivePosition: (routeId) => api.get(`/bus/tracking/${routeId}/live`),
  getFleetLivePositions: () => api.get('/bus/tracking/fleet/live'),
  getTripHistory: (routeId, tripId) => api.get(`/bus/tracking/${routeId}/trip/${tripId}`),
};

export const UserService = {
  list: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const RoleService = {
  list: () => api.get('/roles'),
  getOne: (id) => api.get(`/roles/${id}`),
  listPermissions: () => api.get('/roles/permissions'),
  create: (data) => api.post('/roles', data),
  updatePermissions: (id, permission_ids) => api.put(`/roles/${id}/permissions`, { permission_ids }),
};


