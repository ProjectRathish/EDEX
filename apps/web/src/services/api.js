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
  const token = localStorage.getItem('saarthi_token');
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
        localStorage.removeItem('saarthi_token');
        localStorage.removeItem('saarthi_user');
      }
    }
    return Promise.reject(error);
  }
);

// ── API Services ─────────────────────────────────────────────────────────────

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
};

export const StudentAssignmentService = {
  list: (params = {}) => api.get('/student-assignments', { params }),
  create: (data) => api.post('/student-assignments', data),
};

export const StaffService = {
  list: (params = {}) => api.get('/staff', { params }),
  create: (data) => api.post('/staff', data),
};

export const GuardianService = {
  list: (params = {}) => api.get('/guardians', { params }),
  create: (data) => api.post('/guardians', data),
};

export const ModuleService = {
  list: (schoolId) => api.get('/modules', { params: { school_id: schoolId } }),
  toggle: (moduleName, data) => api.patch(`/modules/${moduleName}/toggle`, data),
};

export const RoleService = {
  list: () => api.get('/roles'),
  listPermissions: () => api.get('/roles/permissions'),
};
