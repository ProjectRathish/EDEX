import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService apiService = ApiService();

  bool _isLoading = false;
  String? _token;
  Map<String, dynamic>? _user;
  Map<String, dynamic>? _assignedRoute;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  Map<String, dynamic>? get assignedRoute => _assignedRoute;

  List<String> get roles {
    final list = <String>[];
    if (_user?['roles'] is List) {
      list.addAll((_user!['roles'] as List).map((e) => e.toString()));
    }
    if (_user?['role'] != null) {
      final r = _user!['role'].toString();
      if (!list.contains(r)) list.add(r);
    }
    return list;
  }

  List<String> get accessibleModules => List<String>.from(_user?['accessible_modules'] ?? []);

  bool get isDriver =>
      roles.contains('bus_driver') ||
      roles.contains('driver') ||
      _user?['role'] == 'bus_driver' ||
      _user?['driver_info'] != null;

  bool get isParent => roles.contains('parent') || _user?['role'] == 'parent';
  bool get isSchoolAdmin =>
      roles.contains('school_admin') ||
      roles.contains('super_admin') ||
      roles.contains('admin') ||
      _user?['role'] == 'school_admin';
  bool get isTeacher => roles.contains('teacher') || roles.contains('staff');

  String get displayName {
    if (_user?['staff_profile'] != null) {
      final sp = _user!['staff_profile'];
      final fullName = '${sp['first_name'] ?? ''} ${sp['last_name'] ?? ''}'.trim();
      if (fullName.isNotEmpty) return fullName;
    }
    if (_user?['name'] != null && _user!['name'].toString().trim().isNotEmpty) {
      return _user!['name'].toString().trim();
    }
    return _user?['username'] ?? 'User';
  }

  String get schoolName {
    if (_user?['school'] != null && _user!['school']['name'] != null) {
      return _user!['school']['name'].toString();
    }
    return _user?['school_name'] ?? 'EDEX Smart Campus';
  }

  String get schoolCode {
    if (_user?['school'] != null && _user!['school']['code'] != null) {
      return _user!['school']['code'].toString();
    }
    return _user?['school_code'] ?? 'DEMO';
  }

  String get primaryRoleTitle {
    if (isDriver) return 'Bus Driver';
    if (isParent) return 'Parent';
    if (isSchoolAdmin) return 'Administrator';
    if (isTeacher) return 'Faculty / Staff';
    return 'Campus User';
  }

  AuthProvider() {
    _loadSavedSession();
  }

  Future<void> _loadSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    final userStr = prefs.getString('auth_user');
    if (userStr != null) {
      _user = jsonDecode(userStr);
    }
    final routeStr = prefs.getString('auth_route');
    if (routeStr != null) {
      _assignedRoute = jsonDecode(routeStr);
    } else {
      _extractAssignedRoute();
    }
    notifyListeners();
  }

  void _extractAssignedRoute() {
    if (_user?['driver_info'] != null) {
      final dInfo = _user!['driver_info'];
      _assignedRoute = {
        'route_id': dInfo['route_id'],
        'route_code': dInfo['route_code'] ?? '',
        'route_name': dInfo['route_name'] ?? 'Assigned Route',
        'bus_id': dInfo['bus_id'] ?? '',
        'vehicle_number': dInfo['vehicle_number'] ?? 'Bus',
      };
    } else if (_user?['children'] is List) {
      final childrenList = _user!['children'] as List;
      for (final child in childrenList) {
        if (child is Map && child['route_id'] != null && child['route_id'].toString().isNotEmpty) {
          _assignedRoute = {
            'route_id': child['route_id'],
            'route_code': child['route_code'] ?? '',
            'route_name': child['route_name'] ?? 'School Bus',
            'bus_id': child['bus_id'] ?? '',
            'vehicle_number': child['vehicle_number'] ?? 'Bus',
            'vehicle_name': child['vehicle_name'] ?? '',
            'stop_id': child['stop_id'] ?? '',
            'stop_name': child['stop_name'] ?? '',
            'stop_lat': child['stop_lat'],
            'stop_lng': child['stop_lng'],
            'morning_time': child['morning_time'],
            'evening_time': child['evening_time'],
            'student_name': '${child['first_name'] ?? ''} ${child['last_name'] ?? ''}'.trim(),
            'class_name': '${child['class_name'] ?? ''} ${child['section_name'] ?? ''}'.trim(),
          };
          break;
        }
      }
    }
  }

  List<dynamic> get children => _user?['children'] as List? ?? [];
  bool get hasChildOnBus => isParent && _assignedRoute != null && (_assignedRoute!['route_id'] != null);

  Future<bool> login({
    required String schoolCode,
    required String username,
    required String password,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await apiService.login(
        schoolCode: schoolCode,
        username: username,
        password: password,
      );

      _token = res['token'] ?? '';
      _user = res['user'] ?? {};

      _extractAssignedRoute();

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token!);
      await prefs.setString('auth_user', jsonEncode(_user));
      if (_assignedRoute != null) {
        await prefs.setString('auth_route', jsonEncode(_assignedRoute));
      }

      // If driver and route not yet in driver_info, fallback to fetching
      if (_assignedRoute == null && isDriver) {
        try {
          await fetchAssignedRoute();
        } catch (_) {}
      }

      return true;
    } catch (e) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Mock/Demo driver login for instant local UI and map testing
  Future<void> loginAsDemoDriver({
    String routeId = "3bb012f3-2b5b-42f5-ac65-ae69493f157b",
    String routeCode = "RT01",
    String routeName = "Pulamanthole, Paloor",
    String busId = "660e0255-675d-4d32-89b9-9c31da3c5708",
    String vehicleNumber = "KL53H9219",
  }) async {
    _token = "demo_driver_token";
    _user = {
      'user_id': 'driver_demo_01',
      'username': 'driver_demo',
      'name': 'Rajesh Kumar',
      'role': 'bus_driver',
      'roles': ['bus_driver'],
      'school_name': 'Springfield International School',
      'school_code': 'DEMO',
      'staff_profile': {
        'first_name': 'Rajesh',
        'last_name': 'Kumar',
        'designation': 'Senior Transport Driver',
      },
      'driver_info': {
        'route_id': routeId,
        'route_code': routeCode,
        'route_name': routeName,
        'bus_id': busId,
        'vehicle_number': vehicleNumber,
      }
    };
    _assignedRoute = {
      'route_id': routeId,
      'route_code': routeCode,
      'route_name': routeName,
      'bus_id': busId,
      'vehicle_number': vehicleNumber,
    };

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', _token!);
    await prefs.setString('auth_user', jsonEncode(_user));
    await prefs.setString('auth_route', jsonEncode(_assignedRoute));

    notifyListeners();
  }

  /// Mock/Demo parent login for testing role-based links
  Future<void> loginAsDemoParent() async {
    _token = "demo_parent_token";
    _user = {
      'user_id': 'parent_demo_01',
      'username': 'parent_demo',
      'name': 'Priya Sharma',
      'role': 'parent',
      'roles': ['parent'],
      'accessible_modules': ['bus', 'attendance', 'canteen', 'fees'],
      'school_name': 'Springfield International School',
      'children': [
        {
          'student_id': 'student_demo_01',
          'first_name': 'Aarav',
          'last_name': 'Sharma',
          'class_name': 'Grade 1',
          'section_name': 'A',
          'route_id': '3bb012f3-2b5b-42f5-ac65-ae69493f157b',
          'route_code': 'RT01',
          'route_name': 'Pulamanthole, Paloor',
          'bus_id': '660e0255-675d-4d32-89b9-9c31da3c5708',
          'vehicle_number': 'KL53H9219',
          'vehicle_name': 'Bus 01',
          'stop_id': '15111b2b-a74d-4d99-bf1d-09e7c014eecd',
          'stop_name': 'Pulamanthole',
        }
      ],
    };
    _extractAssignedRoute();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', _token!);
    await prefs.setString('auth_user', jsonEncode(_user));
    if (_assignedRoute != null) {
      await prefs.setString('auth_route', jsonEncode(_assignedRoute));
    }

    notifyListeners();
  }

  /// Mock/Demo admin login for testing role-based links
  Future<void> loginAsDemoAdmin() async {
    _token = "demo_admin_token";
    _user = {
      'user_id': 'admin_demo_01',
      'username': 'admin_demo',
      'name': 'Dr. Alok Verma',
      'role': 'school_admin',
      'roles': ['school_admin'],
      'accessible_modules': ['core', 'bus', 'attendance', 'canteen', 'fees', 'id_card'],
      'school_name': 'Springfield International School',
      'school_code': 'DEMO',
    };
    _assignedRoute = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', _token!);
    await prefs.setString('auth_user', jsonEncode(_user));
    await prefs.remove('auth_route');

    notifyListeners();
  }

  Future<void> fetchAssignedRoute() async {
    if (_token == null) return;
    try {
      final routes = await apiService.getRoutes(_token!);
      if (routes.isNotEmpty) {
        final found = routes.firstWhere(
          (r) => r['assigned_bus_id'] != null,
          orElse: () => routes.first,
        );
        _assignedRoute = {
          'route_id': found['route_id'],
          'route_code': found['route_code'],
          'route_name': found['route_name'],
          'bus_id': found['assigned_bus_id'] ?? '',
          'vehicle_number': found['vehicle_number'] ?? 'Bus',
        };
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_route', jsonEncode(_assignedRoute));
        notifyListeners();
      }
    } catch (_) {}
  }

  void setCustomRoute(Map<String, dynamic> route) {
    _assignedRoute = route;
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _assignedRoute = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    await prefs.remove('auth_route');
    notifyListeners();
  }
}
