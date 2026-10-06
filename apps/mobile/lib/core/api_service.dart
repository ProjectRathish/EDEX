import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform, SocketException, HttpException;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';

class ApiService {
  static const Duration requestTimeout = Duration(seconds: 8);

  String _baseUrl = (!kIsWeb && Platform.isAndroid)
      ? AppConstants.emulatorBaseUrl
      : AppConstants.defaultBaseUrl;

  bool _initialized = false;

  ApiService() {
    _initBaseUrl();
  }

  Future<void> _initBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString('custom_base_url');
      if (savedUrl != null && savedUrl.trim().isNotEmpty) {
        _baseUrl = savedUrl.trim();
      } else if (!kIsWeb && Platform.isAndroid) {
        _baseUrl = AppConstants.emulatorBaseUrl;
      }
    } catch (_) {}
    _initialized = true;
  }

  String get baseUrl => _baseUrl;

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url.trim();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('custom_base_url', _baseUrl);
    } catch (_) {}
  }

  Map<String, String> _headers([String? token]) => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
  };

  /// Authenticate driver / user with timeout and network fallback
  Future<Map<String, dynamic>> login({
    required String schoolCode,
    required String username,
    required String password,
  }) async {
    if (!_initialized) {
      await _initBaseUrl();
    }

    final body = jsonEncode({
      'school_code': schoolCode.trim().toUpperCase(),
      'username': username.trim(),
      'password': password.trim(),
    });

    try {
      return await _postLoginWithUrl(_baseUrl, body);
    } catch (e) {
      // If running on Android and using 10.0.2.2 failed, try localhost (adb reverse)
      if (!kIsWeb && Platform.isAndroid) {
        if (_baseUrl.contains('10.0.2.2')) {
          final altUrl = _baseUrl.replaceAll('10.0.2.2', '127.0.0.1');
          try {
            final res = await _postLoginWithUrl(altUrl, body);
            // Save successful fallback URL
            _baseUrl = altUrl;
            setBaseUrl(altUrl);
            return res;
          } catch (_) {}
        } else if (_baseUrl.contains('127.0.0.1') || _baseUrl.contains('localhost')) {
          final altUrl = _baseUrl.replaceAll('127.0.0.1', '10.0.2.2').replaceAll('localhost', '10.0.2.2');
          try {
            final res = await _postLoginWithUrl(altUrl, body);
            _baseUrl = altUrl;
            setBaseUrl(altUrl);
            return res;
          } catch (_) {}
        }
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _postLoginWithUrl(String targetBaseUrl, String body) async {
    final url = Uri.parse('$targetBaseUrl/auth/login');
    http.Response response;
    try {
      response = await http
          .post(url, headers: _headers(), body: body)
          .timeout(requestTimeout);
    } on TimeoutException {
      throw Exception('Connection timed out to server at $targetBaseUrl. Please check your network or Server Settings.');
    } on SocketException catch (se) {
      throw Exception('Cannot connect to server at $targetBaseUrl (${se.message}). Is backend running?');
    } on HttpException catch (he) {
      throw Exception('HTTP error connecting to $targetBaseUrl (${he.message}).');
    } catch (e) {
      throw Exception('Network request failed: $e');
    }

    Map<String, dynamic> data;
    try {
      data = jsonDecode(response.body);
    } catch (_) {
      throw Exception('Server returned unexpected response (status ${response.statusCode}).');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (data['data'] is Map<String, dynamic>) {
        return data['data'] as Map<String, dynamic>;
      }
      return data;
    } else {
      throw Exception(data['message'] ?? 'Authentication failed (${response.statusCode})');
    }
  }

  /// Fetch road path geometry (OSRM waypoints) for a route
  Future<List<Map<String, dynamic>>> getRoutePath(String routeId, String token) async {
    try {
      final url = Uri.parse('$_baseUrl/bus/routes/$routeId/path');
      final response = await http
          .get(url, headers: _headers(token))
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final list = json['data']?['waypoints'] as List? ?? [];
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetch stops for a route
  Future<List<Map<String, dynamic>>> getRouteStops(String routeId, String token) async {
    try {
      final url = Uri.parse('$_baseUrl/bus/routes/$routeId/stops');
      final response = await http
          .get(url, headers: _headers(token))
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final list = json['data'] as List? ?? [];
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetch students assigned to a route
  Future<List<Map<String, dynamic>>> getRouteStudents(String routeId, String token) async {
    try {
      final url = Uri.parse('$_baseUrl/bus/assignments/students?route_id=$routeId&limit=150');
      final response = await http
          .get(url, headers: _headers(token))
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final list = json['data'] as List? ?? [];
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetch all active routes
  Future<List<Map<String, dynamic>>> getRoutes(String token) async {
    try {
      final url = Uri.parse('$_baseUrl/bus/routes');
      final response = await http
          .get(url, headers: _headers(token))
          .timeout(requestTimeout);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final list = json['data'] as List? ?? [];
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Send live GPS ping to backend
  Future<bool> sendGpsPing({
    required String token,
    required String busId,
    required String routeId,
    required String tripId,
    required double latitude,
    required double longitude,
    double? speedKmh,
    double? headingDegrees,
    bool isTripActive = true,
  }) async {
    try {
      final url = Uri.parse('$_baseUrl/bus/tracking/ping');
      final response = await http
          .post(
            url,
            headers: _headers(token),
            body: jsonEncode({
              'bus_id': busId,
              'route_id': routeId,
              'trip_id': tripId,
              'latitude': latitude,
              'longitude': longitude,
              'speed_kmh': speedKmh ?? 30.0,
              'heading_degrees': headingDegrees ?? 0.0,
              'is_trip_active': isTripActive,
              'recorded_at': DateTime.now().toUtc().toIso8601String(),
            }),
          )
          .timeout(const Duration(seconds: 4));
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  /// Fetch live position for a route (called by parent & fleet monitoring)
  Future<Map<String, dynamic>?> getLiveRoutePosition(String routeId, String token) async {
    try {
      final url = Uri.parse('$_baseUrl/bus/tracking/$routeId/live');
      final response = await http
          .get(url, headers: _headers(token))
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        if (json['data'] is Map<String, dynamic>) {
          return json['data'] as Map<String, dynamic>;
        }
      }
    } catch (_) {}
    return null;
  }
}
