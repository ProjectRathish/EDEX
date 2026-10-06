import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:geolocator/geolocator.dart';
import 'api_service.dart';

class TripProvider extends ChangeNotifier {
  // Route & stops geometry
  List<LatLng> _routePoints = [];
  List<LatLng> _simWaypoints = [];
  List<Map<String, dynamic>> _stops = [];
  bool _isLoadingRoute = false;
  int _pingCounter = 0;

  // Active trip state
  bool _isTripActive = false;
  bool _isSimulationMode = true;
  bool _isParentTracking = false;
  bool _isLiveBusOnline = false;
  Map<String, dynamic>? _liveTelemetry;
  String _tripId = '';
  String _currentTripShift = 'morning'; // 'morning' or 'evening'
  Timer? _simTimer;
  Timer? _livePollingTimer;
  StreamSubscription<Position>? _gpsSubscription;

  // Bus live telemetry
  LatLng _currentBusPos = const LatLng(10.9856, 76.2235);
  double _currentHeading = 0.0;
  double _currentSpeedKmh = 0.0;
  int _currentWaypointIndex = 0;

  // Next stop & passengers
  int _nextStopIndex = 0;
  int _boardedStudents = 0;
  int _totalStudents = 0;
  double _distToNextStopM = 0;
  int _etaMinutes = 1;

  // Getters
  List<LatLng> get routePoints => _routePoints;
  List<Map<String, dynamic>> get stops => _stops;
  bool get isLoadingRoute => _isLoadingRoute;
  bool get isTripActive => _isTripActive;
  bool get isSimulationMode => _isSimulationMode;
  bool get isParentTracking => _isParentTracking;
  bool get isLiveBusOnline => _isLiveBusOnline;
  Map<String, dynamic>? get liveTelemetry => _liveTelemetry;
  String get tripId => _tripId;
  String get currentTripShift => _currentTripShift;
  LatLng get currentBusPos => _currentBusPos;
  double get currentHeading => _currentHeading;
  double get currentSpeedKmh => _currentSpeedKmh;
  int get currentWaypointIndex => _currentWaypointIndex;
  int get nextStopIndex => _nextStopIndex;
  int get boardedStudents => _boardedStudents;
  int get totalStudents => _totalStudents;
  double get distToNextStopM => _distToNextStopM;
  int get etaMinutes => _etaMinutes;

  bool get isLastStop => _stops.isNotEmpty && _nextStopIndex >= _stops.length - 1;
  Map<String, dynamic>? get nextStop =>
      (_stops.isNotEmpty && _nextStopIndex < _stops.length) ? _stops[_nextStopIndex] : null;

  // Haversine formula
  double calculateDistanceMeters(LatLng p1, LatLng p2) {
    const double earthRadius = 6371000;
    final dLat = (p2.latitude - p1.latitude) * math.pi / 180;
    final dLon = (p2.longitude - p1.longitude) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(p1.latitude * math.pi / 180) *
            math.cos(p2.latitude * math.pi / 180) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  // Bearing calculation
  double calculateBearing(LatLng start, LatLng end) {
    final lat1 = start.latitudeInRad;
    final lat2 = end.latitudeInRad;
    final dLon = end.longitudeInRad - start.longitudeInRad;

    final y = math.sin(dLon) * math.cos(lat2);
    final x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon);
    final radians = math.atan2(y, x);
    return (radians * 180 / math.pi + 360) % 360;
  }

  // Densify waypoints so simulation glides in smooth, micro-increments (~10 meters each)
  List<LatLng> _densifyRoute(List<LatLng> points, {double maxStepMeters = 10.0}) {
    if (points.length < 2) return points;
    final List<LatLng> dense = [points.first];
    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];
      final dist = calculateDistanceMeters(p1, p2);
      if (dist <= maxStepMeters) {
        dense.add(p2);
      } else {
        final steps = (dist / maxStepMeters).ceil();
        for (int s = 1; s <= steps; s++) {
          final frac = s / steps;
          final lat = p1.latitude + (p2.latitude - p1.latitude) * frac;
          final lng = p1.longitude + (p2.longitude - p1.longitude) * frac;
          dense.add(LatLng(lat, lng));
        }
      }
    }
    return dense;
  }

  // Load route coordinates and stops from backend
  Future<void> loadRouteData({
    required ApiService apiService,
    required String routeId,
    required String token,
    String? shift,
    bool force = false,
  }) async {
    if (_isTripActive && !force && !_isParentTracking) return; // Keep live tracking state intact

    if (shift != null) {
      _currentTripShift = shift;
    }
    _isLoadingRoute = true;
    notifyListeners();

    try {
      List<Map<String, dynamic>> waypoints = [];
      List<Map<String, dynamic>> stopsData = [];

      if (routeId.isNotEmpty) {
        waypoints = await apiService.getRoutePath(routeId, token);
        stopsData = await apiService.getRouteStops(routeId, token);
      }

      List<LatLng> points = [];
      for (final wp in waypoints) {
        final lat = double.tryParse(wp['latitude'].toString());
        final lng = double.tryParse(wp['longitude'].toString());
        if (lat != null && lng != null) {
          points.add(LatLng(lat, lng));
        }
      }

      // Filter out invalid stops
      stopsData = stopsData.where((s) {
        final lat = double.tryParse(s['latitude']?.toString() ?? '');
        final lng = double.tryParse(s['longitude']?.toString() ?? '');
        return lat != null && lng != null && lat != 0 && lng != 0;
      }).toList();

      // If no waypoints yet, fallback to stop coordinates
      if (points.isEmpty && stopsData.isNotEmpty) {
        for (final s in stopsData) {
          final lat = double.tryParse(s['latitude']?.toString() ?? '');
          final lng = double.tryParse(s['longitude']?.toString() ?? '');
          if (lat != null && lng != null) {
            points.add(LatLng(lat, lng));
          }
        }
      }

      // Realistic default route & stops if backend has none
      if (points.isEmpty) {
        points = const [
          LatLng(10.9856, 76.2235), // Stop 1 (Green Valley Origin)
          LatLng(10.9902, 76.2268),
          LatLng(10.9950, 76.2312), // Stop 2 (Sunflower Jn)
          LatLng(10.9985, 76.2345),
          LatLng(11.0020, 76.2380), // Stop 3 (North Hill)
          LatLng(11.0055, 76.2410),
          LatLng(11.0090, 76.2440), // Stop 4 (EDEX Central Campus / School)
        ];
      }

      if (stopsData.isEmpty) {
        stopsData = [
          {
            'stop_name': 'Green Valley Junction',
            'sequence_order': 1,
            'student_count': 6,
            'is_school_stop': false,
            'latitude': 10.9856,
            'longitude': 76.2235,
          },
          {
            'stop_name': 'Sunflower Colony',
            'sequence_order': 2,
            'student_count': 7,
            'is_school_stop': false,
            'latitude': 10.9950,
            'longitude': 76.2312,
          },
          {
            'stop_name': 'North Hill Avenue',
            'sequence_order': 3,
            'student_count': 5,
            'is_school_stop': false,
            'latitude': 11.0020,
            'longitude': 76.2380,
          },
          {
            'stop_name': 'EDEX Central Campus (School)',
            'sequence_order': 4,
            'student_count': 10,
            'is_school_stop': true,
            'latitude': 11.0090,
            'longitude': 76.2440,
          },
        ];
      }

      // Evening return trip starts from the school
      if (_currentTripShift == 'evening') {
        points = points.reversed.toList();
        stopsData = stopsData.reversed.toList();
      }

      int total = 0;
      for (final s in stopsData) {
        total += int.tryParse(s['student_count']?.toString() ?? '') ?? 5;
      }

      _routePoints = points;
      _simWaypoints = _densifyRoute(points, maxStepMeters: 10.0);
      _stops = stopsData;
      if (!_isParentTracking || (_currentBusPos.latitude == 10.9856 && _currentBusPos.longitude == 76.2235)) {
        _currentBusPos = _simWaypoints.isNotEmpty ? _simWaypoints.first : (points.isNotEmpty ? points.first : const LatLng(10.9856, 76.2235));
      }
      _totalStudents = total;
      _boardedStudents = _currentTripShift == 'morning' ? 0 : total;
      _currentWaypointIndex = 0;
      _nextStopIndex = 0;
      _isLoadingRoute = false;

      _updateLiveTripStatus();
      notifyListeners();
    } catch (_) {
      _isLoadingRoute = false;
      notifyListeners();
    }
  }

  void switchShift({
    required String newShift,
    required ApiService apiService,
    required String routeId,
    required String token,
  }) {
    if (_isTripActive) return;
    _currentTripShift = newShift;
    loadRouteData(apiService: apiService, routeId: routeId, token: token, shift: newShift);
  }

  void startTrip({
    required ApiService apiService,
    required String token,
    required String busId,
    required String routeId,
  }) {
    if (_isTripActive) return;

    int initialNextStop = 0;
    int initialBoarded = _currentTripShift == 'morning' ? 0 : _totalStudents;

    if (_stops.length > 1) {
      if (_currentTripShift == 'morning') {
        final firstCount = int.tryParse(_stops.first['student_count']?.toString() ?? '') ?? 5;
        initialBoarded = math.min(_totalStudents, firstCount);
        initialNextStop = 1;
      } else {
        initialNextStop = 1;
      }
    }

    _isTripActive = true;
    _tripId = 'trip_${_currentTripShift}_${DateTime.now().millisecondsSinceEpoch}';
    _currentWaypointIndex = 0;
    _pingCounter = 0;
    _currentSpeedKmh = 36.0;
    _nextStopIndex = initialNextStop;
    _boardedStudents = initialBoarded;

    _updateLiveTripStatus();
    notifyListeners();

    if (_isSimulationMode) {
      _startSimulation(apiService: apiService, token: token, busId: busId, routeId: routeId);
    } else {
      _startLiveGpsTracking(apiService: apiService, token: token, busId: busId, routeId: routeId);
    }

    _sendPing(apiService: apiService, token: token, busId: busId, routeId: routeId);
  }

  void endTrip({
    required ApiService apiService,
    required String token,
    required String busId,
    required String routeId,
  }) {
    _simTimer?.cancel();
    _gpsSubscription?.cancel();

    _isTripActive = false;
    _currentSpeedKmh = 0.0;
    notifyListeners();

    apiService.sendGpsPing(
      token: token,
      busId: busId,
      routeId: routeId,
      tripId: _tripId,
      latitude: _currentBusPos.latitude,
      longitude: _currentBusPos.longitude,
      speedKmh: 0.0,
      headingDegrees: _currentHeading,
      isTripActive: false,
    );
  }

  void toggleSimulationMode({
    required ApiService apiService,
    required String token,
    required String busId,
    required String routeId,
  }) {
    _isSimulationMode = !_isSimulationMode;
    if (_isTripActive) {
      _simTimer?.cancel();
      _gpsSubscription?.cancel();
      if (_isSimulationMode) {
        _startSimulation(apiService: apiService, token: token, busId: busId, routeId: routeId);
      } else {
        _startLiveGpsTracking(apiService: apiService, token: token, busId: busId, routeId: routeId);
      }
    }
    notifyListeners();
  }

  void manuallyAdvanceNextStop() {
    if (_stops.isEmpty) return;
    if (_nextStopIndex >= _stops.length) return;

    final stop = _stops[_nextStopIndex];
    final count = int.tryParse(stop['student_count']?.toString() ?? '') ?? 5;

    if (_currentTripShift == 'morning') {
      _boardedStudents = math.min(_totalStudents, _boardedStudents + count);
    } else {
      _boardedStudents = math.max(0, _boardedStudents - count);
    }
    if (_nextStopIndex < _stops.length - 1) {
      _nextStopIndex++;
    }

    _updateLiveTripStatus();
    notifyListeners();
  }

  void _updateLiveTripStatus() {
    if (_stops.isEmpty) return;

    if (_isParentTracking && _routePoints.isNotEmpty) {
      _syncProgressFromLivePosition();
      return;
    }

    while (_nextStopIndex < _stops.length - 1) {
      final s = _stops[_nextStopIndex];
      final lat = double.tryParse(s['latitude']?.toString() ?? '');
      final lng = double.tryParse(s['longitude']?.toString() ?? '');
      if (lat != null && lng != null && lat != 0 && lng != 0) break;
      _nextStopIndex++;
    }

    if (_nextStopIndex >= _stops.length) return;

    final targetStop = _stops[_nextStopIndex];
    final stopLat = double.tryParse(targetStop['latitude']?.toString() ?? '');
    final stopLng = double.tryParse(targetStop['longitude']?.toString() ?? '');

    if (stopLat == null || stopLng == null) return;

    final stopPos = LatLng(stopLat, stopLng);
    final dist = calculateDistanceMeters(_currentBusPos, stopPos);

    bool arrived = _isTripActive && (dist < 90);

    if (!arrived && _isTripActive && _nextStopIndex < _stops.length - 1) {
      final nextNextStop = _stops[_nextStopIndex + 1];
      final nextLat = double.tryParse(nextNextStop['latitude']?.toString() ?? '');
      final nextLng = double.tryParse(nextNextStop['longitude']?.toString() ?? '');
      if (nextLat != null && nextLng != null) {
        final distToNextNext = calculateDistanceMeters(_currentBusPos, LatLng(nextLat, nextLng));
        if (distToNextNext < dist && dist < 350) {
          arrived = true;
        }
      }
    }

    if (arrived) {
      final count = int.tryParse(targetStop['student_count']?.toString() ?? '') ?? 5;
      if (_currentTripShift == 'morning') {
        _boardedStudents = math.min(_totalStudents, _boardedStudents + count);
      } else {
        _boardedStudents = math.max(0, _boardedStudents - count);
      }
      if (_nextStopIndex < _stops.length - 1) {
        _nextStopIndex++;
        final newTarget = _stops[_nextStopIndex];
        final nLat = double.tryParse(newTarget['latitude']?.toString() ?? '');
        final nLng = double.tryParse(newTarget['longitude']?.toString() ?? '');
        if (nLat != null && nLng != null) {
          final newDist = calculateDistanceMeters(_currentBusPos, LatLng(nLat, nLng));
          final speed = _currentSpeedKmh > 5 ? _currentSpeedKmh : 32.0;
          final speedMs = speed * 1000 / 3600;
          final seconds = (newDist / speedMs).round();
          _distToNextStopM = newDist;
          _etaMinutes = math.max(1, (seconds / 60).ceil());
          return;
        }
      }
    }

    final speed = _currentSpeedKmh > 5 ? _currentSpeedKmh : 32.0;
    final speedMs = speed * 1000 / 3600;
    final seconds = (dist / speedMs).round();
    _distToNextStopM = dist;
    _etaMinutes = math.max(1, (seconds / 60).ceil());
  }

  void _syncProgressFromLivePosition() {
    if (_stops.isEmpty) return;

    // Find closest route point to bus position
    int busRouteIndex = 0;
    double minBusDist = double.infinity;
    for (int i = 0; i < _routePoints.length; i++) {
      final d = calculateDistanceMeters(_currentBusPos, _routePoints[i]);
      if (d < minBusDist) {
        minBusDist = d;
        busRouteIndex = i;
      }
    }

    // Determine upcoming next stop along the route
    int bestNextStop = _stops.length - 1;
    for (int i = 0; i < _stops.length; i++) {
      final s = _stops[i];
      final sLat = double.tryParse(s['latitude']?.toString() ?? '');
      final sLng = double.tryParse(s['longitude']?.toString() ?? '');
      if (sLat == null || sLng == null) continue;

      final stopPos = LatLng(sLat, sLng);
      final directDist = calculateDistanceMeters(_currentBusPos, stopPos);

      // Find closest route point for this stop
      int stopRouteIndex = 0;
      double minStopDist = double.infinity;
      for (int r = 0; r < _routePoints.length; r++) {
        final d = calculateDistanceMeters(stopPos, _routePoints[r]);
        if (d < minStopDist) {
          minStopDist = d;
          stopRouteIndex = r;
        }
      }

      // If stop is ahead on the route or bus is within 70m of it
      if (stopRouteIndex >= busRouteIndex || directDist < 70) {
        bestNextStop = i;
        break;
      }
    }

    _nextStopIndex = bestNextStop.clamp(0, _stops.length - 1);

    // Compute boarded / remaining students based on passed stops
    int visitedStudents = 0;
    for (int i = 0; i < _nextStopIndex; i++) {
      final c = int.tryParse(_stops[i]['student_count']?.toString() ?? '') ?? 5;
      visitedStudents += c;
    }

    if (_currentTripShift == 'morning') {
      _boardedStudents = math.min(_totalStudents, visitedStudents);
    } else {
      _boardedStudents = math.max(0, _totalStudents - visitedStudents);
    }

    // Calculate distance and ETA to the next stop
    final targetStop = _stops[_nextStopIndex];
    final tLat = double.tryParse(targetStop['latitude']?.toString() ?? '');
    final tLng = double.tryParse(targetStop['longitude']?.toString() ?? '');
    if (tLat != null && tLng != null) {
      final dist = calculateDistanceMeters(_currentBusPos, LatLng(tLat, tLng));
      _distToNextStopM = dist;
      final speed = _currentSpeedKmh > 5 ? _currentSpeedKmh : 32.0;
      final speedMs = speed * 1000 / 3600;
      final seconds = (dist / speedMs).round();
      _etaMinutes = math.max(1, (seconds / 60).ceil());
    }
  }

  void _startSimulation({
    required ApiService apiService,
    required String token,
    required String busId,
    required String routeId,
  }) {
    _simTimer?.cancel();
    if (_simWaypoints.length < 2) {
      if (_routePoints.length >= 2) {
        _simWaypoints = _densifyRoute(_routePoints, maxStepMeters: 10.0);
      }
      if (_simWaypoints.length < 2) return;
    }

    _simTimer = Timer.periodic(const Duration(milliseconds: 700), (timer) {
      if (!_isTripActive || _simWaypoints.isEmpty) {
        timer.cancel();
        return;
      }

      if (_currentWaypointIndex < _simWaypoints.length - 1) {
        final nextPos = _simWaypoints[_currentWaypointIndex + 1];
        _currentHeading = calculateBearing(_currentBusPos, nextPos);
        _currentBusPos = nextPos;
        _currentWaypointIndex++;
        _currentSpeedKmh = 34.0 + (math.Random().nextDouble() * 6.0);
      } else {
        endTrip(apiService: apiService, token: token, busId: busId, routeId: routeId);
        return;
      }

      _updateLiveTripStatus();
      notifyListeners();

      _pingCounter++;
      // Sync GPS to backend every 3 ticks (~2.1 seconds)
      if (_pingCounter % 3 == 0) {
        _sendPing(apiService: apiService, token: token, busId: busId, routeId: routeId);
      }
    });
  }

  Future<void> _startLiveGpsTracking({
    required ApiService apiService,
    required String token,
    required String busId,
    required String routeId,
  }) async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    _gpsSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position pos) {
      if (!_isTripActive) return;

      _currentHeading = pos.heading;
      _currentSpeedKmh = (pos.speed * 3.6).clamp(0.0, 100.0);
      _currentBusPos = LatLng(pos.latitude, pos.longitude);

      _updateLiveTripStatus();
      notifyListeners();

      _sendPing(apiService: apiService, token: token, busId: busId, routeId: routeId);
    });
  }

  void _sendPing({
    required ApiService apiService,
    required String token,
    required String busId,
    required String routeId,
  }) {
    apiService.sendGpsPing(
      token: token,
      busId: busId,
      routeId: routeId,
      tripId: _tripId,
      latitude: _currentBusPos.latitude,
      longitude: _currentBusPos.longitude,
      speedKmh: _currentSpeedKmh,
      headingDegrees: _currentHeading,
      isTripActive: _isTripActive,
    );
  }

  /// Start background polling of live GPS telemetry for parents & guardians
  void startParentLiveTracking({
    required ApiService apiService,
    required String routeId,
    required String token,
  }) {
    if (routeId.isEmpty) return;
    _isParentTracking = true;

    _livePollingTimer?.cancel();
    _fetchLiveTelemetry(apiService: apiService, routeId: routeId, token: token).then((_) {
      if (_routePoints.isEmpty) {
        loadRouteData(
          apiService: apiService,
          routeId: routeId,
          token: token,
          shift: _currentTripShift,
          force: true,
        );
      }
    });

    _livePollingTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      _fetchLiveTelemetry(apiService: apiService, routeId: routeId, token: token);
    });
  }

  void stopParentLiveTracking() {
    _isParentTracking = false;
    _livePollingTimer?.cancel();
    _livePollingTimer = null;
  }

  Future<void> _fetchLiveTelemetry({
    required ApiService apiService,
    required String routeId,
    required String token,
  }) async {
    try {
      final res = await apiService.getLiveRoutePosition(routeId, token);
      if (res != null) {
        final live = res['live'];
        if (live is Map<String, dynamic>) {
          final lat = double.tryParse(live['latitude']?.toString() ?? '');
          final lng = double.tryParse(live['longitude']?.toString() ?? '');
          final speed = double.tryParse(live['speed_kmh']?.toString() ?? '0.0') ?? 0.0;
          final heading = double.tryParse(live['heading_degrees']?.toString() ?? '0.0') ?? 0.0;
          final isActive = (live['is_trip_active'] == 1 || live['is_trip_active'] == true);
          final online = live['is_online'] == true;

          _liveTelemetry = live;
          _isLiveBusOnline = online;

          // Dynamically detect server shift from driver's active trip
          String serverShift = live['shift']?.toString().toLowerCase() ?? '';
          if (serverShift != 'morning' && serverShift != 'evening') {
            final tid = live['trip_id']?.toString().toLowerCase() ?? '';
            if (tid.contains('evening')) {
              serverShift = 'evening';
            } else if (tid.contains('morning')) {
              serverShift = 'morning';
            }
          }

          if (serverShift.isNotEmpty &&
              (serverShift == 'morning' || serverShift == 'evening') &&
              serverShift != _currentTripShift) {
            _currentTripShift = serverShift;
            await loadRouteData(
              apiService: apiService,
              routeId: routeId,
              token: token,
              shift: serverShift,
              force: true,
            );
          }

          if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
            _currentBusPos = LatLng(lat, lng);
            _currentHeading = heading;
            _currentSpeedKmh = speed;
            _isTripActive = isActive || online;

            _updateLiveTripStatus();
            notifyListeners();
          }
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _simTimer?.cancel();
    _livePollingTimer?.cancel();
    _gpsSubscription?.cancel();
    super.dispose();
  }
}
