import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/auth_provider.dart';
import '../core/theme_provider.dart';
import '../core/trip_provider.dart';
import '../widgets/route_details_modal.dart';

class DriverTripScreen extends StatefulWidget {
  final bool autoStartTrip;
  final String tripShift; // 'morning' or 'evening'

  const DriverTripScreen({
    super.key,
    this.autoStartTrip = false,
    this.tripShift = 'morning',
  });

  @override
  State<DriverTripScreen> createState() => _DriverTripScreenState();
}

class _DriverTripScreenState extends State<DriverTripScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  LatLng? _lastCenteredPos;

  // Butter-smooth continuous interpolation controllers
  AnimationController? _posAnimController;
  LatLng _fromPos = const LatLng(10.9856, 76.2235);
  LatLng _targetPos = const LatLng(10.9856, 76.2235);
  LatLng _currentAnimatedPos = const LatLng(10.9856, 76.2235);
  double _fromHeading = 0.0;
  double _targetHeading = 0.0;
  double _currentAnimatedHeading = 0.0;

  @override
  void initState() {
    super.initState();

    _posAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 680),
    )..addListener(() {
        if (!mounted) return;
        final t = _posAnimController!.value;
        final lat = _fromPos.latitude + (_targetPos.latitude - _fromPos.latitude) * t;
        final lng = _fromPos.longitude + (_targetPos.longitude - _fromPos.longitude) * t;

        // Angular heading interpolation avoiding 360 wrap
        double diff = (_targetHeading - _fromHeading) % 360;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        final heading = (_fromHeading + diff * t + 360) % 360;

        setState(() {
          _currentAnimatedPos = LatLng(lat, lng);
          _currentAnimatedHeading = heading;
        });
      });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final trip = Provider.of<TripProvider>(context, listen: false);
      final routeId = auth.assignedRoute?['route_id'] ?? '';
      final token = auth.token ?? '';

      _fromPos = trip.currentBusPos;
      _targetPos = trip.currentBusPos;
      _currentAnimatedPos = trip.currentBusPos;
      _fromHeading = trip.currentHeading;
      _targetHeading = trip.currentHeading;
      _currentAnimatedHeading = trip.currentHeading;

      if (!trip.isTripActive) {
        trip.loadRouteData(
          apiService: auth.apiService,
          routeId: routeId,
          token: token,
          shift: widget.tripShift,
        ).then((_) {
          if (trip.routePoints.isNotEmpty) {
            _fromPos = trip.currentBusPos;
            _targetPos = trip.currentBusPos;
            _currentAnimatedPos = trip.currentBusPos;
            _mapController.move(trip.currentBusPos, 14.5);
          }
        });
      } else {
        // If returning from HomeScreen with an active trip, re-center immediately on the moving bus!
        _mapController.move(trip.currentBusPos, 15.0);
      }

      // If parent or viewer, ensure live GPS polling from backend is running
      if (!auth.isDriver && routeId.isNotEmpty && token.isNotEmpty) {
        trip.startParentLiveTracking(
          apiService: auth.apiService,
          routeId: routeId,
          token: token,
        );
      }
    });
  }

  @override
  void dispose() {
    _posAnimController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final trip = Provider.of<TripProvider>(context);
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    final routeInfo = auth.assignedRoute ?? {};
    final routeCode = routeInfo['route_code'] ?? 'RT01';
    final routeName = routeInfo['route_name'] ?? 'School Transit Route';
    final vehicleNumber = routeInfo['vehicle_number'] ?? 'Bus KL53H9219';

    // Smoothly animate bus transition on every position update from TripProvider
    if (trip.isTripActive && trip.currentBusPos != _targetPos) {
      _fromPos = _currentAnimatedPos;
      _targetPos = trip.currentBusPos;
      _fromHeading = _currentAnimatedHeading;
      _targetHeading = trip.currentHeading;
      _posAnimController?.forward(from: 0.0);
    }

    // Follow bus smoothly on map as coordinates update in TripProvider
    if (trip.isTripActive && _lastCenteredPos != trip.currentBusPos) {
      _lastCenteredPos = trip.currentBusPos;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _mapController.move(trip.currentBusPos, _mapController.camera.zoom);
        }
      });
    }

    // Theme Tokens matching SaaS Web design
    final hudBg = isDark
        ? AppConstants.surfaceDark.withValues(alpha: 0.94)
        : Colors.white.withValues(alpha: 0.96);
    final hudBorder = isDark ? Colors.white12 : AppConstants.borderLight;
    final textColor = isDark ? AppConstants.textPrimary : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.bgDark : AppConstants.bgLight,
      body: Stack(
        children: [
          // Route Loading Indicator
          if (trip.isLoadingRoute)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(AppConstants.primary),
                minHeight: 3,
              ),
            ),

          // ── 1. Interactive OpenStreetMap Canvas ───────────────────────
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: trip.currentBusPos,
              initialZoom: 14.5,
              maxZoom: 19.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.edex.saarthi.edex_mobile',
              ),

              // Road Polyline (Clear high-visibility road casing)
              if (trip.routePoints.length > 1)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: trip.routePoints,
                      strokeWidth: 8.0,
                      color: const Color(0xFF0F172A).withValues(alpha: 0.8),
                    ),
                    Polyline(
                      points: trip.routePoints,
                      strokeWidth: 4.5,
                      color: AppConstants.primaryLight,
                    ),
                  ],
                ),

              // Stop Markers along the route
              MarkerLayer(
                markers: [
                  for (int i = 0; i < trip.stops.length; i++) ...[
                    if (trip.stops[i]['latitude'] != null && trip.stops[i]['longitude'] != null)
                      Marker(
                        point: LatLng(
                          double.parse(trip.stops[i]['latitude'].toString()),
                          double.parse(trip.stops[i]['longitude'].toString()),
                        ),
                        width: 34,
                        height: 34,
                        child: Container(
                          decoration: BoxDecoration(
                            color: trip.stops[i]['is_school_stop'] == true
                                ? AppConstants.accentAmberLight
                                : Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: trip.stops[i]['is_school_stop'] == true
                                  ? AppConstants.accentAmberLight
                                  : AppConstants.primaryLight,
                              width: 2.2,
                            ),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2))
                            ],
                          ),
                          alignment: Alignment.center,
                          child: trip.stops[i]['is_school_stop'] == true
                              ? const Icon(Icons.school_rounded, color: Colors.white, size: 16)
                              : Text(
                                  '${i + 1}',
                                  style: const TextStyle(
                                    color: AppConstants.primaryLight,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                        ),
                      ),
                  ],

                  // ── 2. ISOMETRIC 3/4 TOP-SIDE PERSPECTIVE SCHOOL BUS ──────
                  Marker(
                    point: trip.isTripActive ? _currentAnimatedPos : trip.currentBusPos,
                    width: 84,
                    height: 96,
                    child: SchoolBus3DMarker(
                      heading: trip.isTripActive ? _currentAnimatedHeading : trip.currentHeading,
                      isTripActive: trip.isTripActive,
                      busNumber: vehicleNumber,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // ── 3. Top Floating Route Header HUD ──────────────────────────
          Positioned(
            top: 0,
            left: 16,
            right: 16,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: hudBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: hudBorder),
                      boxShadow: [
                        BoxShadow(
                          color: isDark ? Colors.black45 : Colors.black.withValues(alpha: 0.08),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        )
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Top Row: Back button, Route Badge, Name, Vehicle & Live Status
                        Row(
                          children: [
                            // Back to Home button (directly returns home, trip continues running)
                            IconButton(
                              icon: Icon(Icons.arrow_back_ios_new_rounded, color: textColor, size: 18),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                              tooltip: 'Back to Dashboard',
                              onPressed: () => Navigator.pop(context),
                            ),
                            const SizedBox(width: 6),

                            // Route Badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AppConstants.primaryLight, Color(0xFF4F46E5)],
                                ),
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppConstants.primaryLight.withValues(alpha: 0.3),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Text(
                                routeCode,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 12,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),

                            // Route Name & Vehicle Plate
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    routeName,
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    auth.isDriver
                                        ? vehicleNumber
                                        : '$vehicleNumber • ${trip.currentTripShift == 'evening' ? 'Evening Trip (From School)' : 'Morning Trip (To School)'}',
                                    style: TextStyle(
                                      color: subtextColor,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Live / Standby Status Chip
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: trip.isTripActive
                                    ? AppConstants.accentEmeraldLight.withValues(alpha: 0.15)
                                    : (isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.05)),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: trip.isTripActive
                                      ? AppConstants.accentEmeraldLight.withValues(alpha: 0.35)
                                      : (isDark ? Colors.white12 : Colors.black12),
                                  width: 0.8,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: trip.isTripActive ? AppConstants.accentEmeraldLight : subtextColor,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    trip.isTripActive ? 'LIVE' : 'STANDBY',
                                    style: TextStyle(
                                      color: trip.isTripActive ? AppConstants.accentEmeraldLight : subtextColor,
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        // Prominent, High-Visibility Trip Shift Switcher (Exclusively for Driver)
                        if (auth.isDriver) ...[
                          const SizedBox(height: 8),
                          Container(
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.6) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                                width: 0.8,
                              ),
                            ),
                            padding: const EdgeInsets.all(3),
                            child: Row(
                              children: [
                                // Morning Shift Segment
                                Expanded(
                                  child: _buildShiftButton(
                                    shiftKey: 'morning',
                                    label: 'Morning Trip',
                                    sublabel: 'To School',
                                    emoji: '🌅',
                                    isSelected: trip.currentTripShift == 'morning',
                                    isTripActive: trip.isTripActive,
                                    isDark: isDark,
                                    onTap: () {
                                      if (trip.isTripActive) {
                                        _showActiveTripShiftWarning(context);
                                        return;
                                      }
                                      if (trip.currentTripShift != 'morning') {
                                        trip.switchShift(
                                          newShift: 'morning',
                                          apiService: auth.apiService,
                                          routeId: auth.assignedRoute?['route_id'] ?? '',
                                          token: auth.token ?? '',
                                        );
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(width: 4),
                                // Evening Shift Segment
                                Expanded(
                                  child: _buildShiftButton(
                                    shiftKey: 'evening',
                                    label: 'Evening Trip',
                                    sublabel: 'From School',
                                    emoji: '🌇',
                                    isSelected: trip.currentTripShift == 'evening',
                                    isTripActive: trip.isTripActive,
                                    isDark: isDark,
                                    onTap: () {
                                      if (trip.isTripActive) {
                                        _showActiveTripShiftWarning(context);
                                        return;
                                      }
                                      if (trip.currentTripShift != 'evening') {
                                        trip.switchShift(
                                          newShift: 'evening',
                                          apiService: auth.apiService,
                                          routeId: auth.assignedRoute?['route_id'] ?? '',
                                          token: auth.token ?? '',
                                        );
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // ── 3B. LIVE NEXT STOP HUD (Exclusively at top for driver) ──
                  if (auth.isDriver && trip.stops.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _buildNextStopPassengerHud(context, trip, isDark, hudBg, hudBorder, textColor, subtextColor),
                  ],
                ],
              ),
            ),
          ),
        ),

          // ── 4. Bottom Section (Driver Controls OR Observer Next Stop HUD) ──
          if (auth.isDriver)
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: _buildDriverTripControls(
                context: context,
                trip: trip,
                auth: auth,
                isDark: isDark,
                hudBg: hudBg,
                hudBorder: hudBorder,
                textColor: textColor,
                subtextColor: subtextColor,
              ),
            )
          else
            Positioned(
              left: 16,
              right: 16,
              bottom: 24,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  FloatingActionButton.small(
                    heroTag: 'recenter_bus_fab',
                    backgroundColor: hudBg,
                    foregroundColor: AppConstants.primaryLight,
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: hudBorder),
                    ),
                    onPressed: () => _mapController.move(trip.currentBusPos, 15.0),
                    tooltip: 'Recenter on Bus',
                    child: const Icon(Icons.my_location_rounded, size: 20),
                  ),
                  if (trip.stops.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    _buildNextStopPassengerHud(context, trip, isDark, hudBg, hudBorder, textColor, subtextColor),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── Driver Trip Controls (Exclusively for Bus Driver on Map) ──────────────
  Widget _buildDriverTripControls({
    required BuildContext context,
    required TripProvider trip,
    required AuthProvider auth,
    required bool isDark,
    required Color hudBg,
    required Color hudBorder,
    required Color textColor,
    required Color subtextColor,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Floating Metrics Strip (Speed & Simulator toggle)
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: hudBg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: hudBorder),
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.black45 : Colors.black.withValues(alpha: 0.08),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Speed readout
              Row(
                children: [
                  const Icon(Icons.speed_rounded, color: AppConstants.accentAmberLight, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    '${trip.currentSpeedKmh.toStringAsFixed(0)} km/h',
                    style: TextStyle(
                      color: textColor,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),

              // Simulator mode toggle
              Row(
                children: [
                  Text(
                    trip.isSimulationMode ? 'Auto Simulator' : 'Device GPS',
                    style: TextStyle(color: subtextColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 4),
                  Switch(
                    value: trip.isSimulationMode,
                    activeTrackColor: AppConstants.primaryLight,
                    onChanged: (val) {
                      trip.toggleSimulationMode(
                        apiService: auth.apiService,
                        token: auth.token ?? '',
                        busId: auth.assignedRoute?['bus_id'] ?? '',
                        routeId: auth.assignedRoute?['route_id'] ?? '',
                      );
                    },
                  ),
                ],
              ),

              // Recenter button
              IconButton(
                icon: Icon(Icons.my_location_rounded, color: textColor, size: 20),
                tooltip: 'Recenter Bus',
                onPressed: () => _mapController.move(trip.currentBusPos, 15.0),
              ),
            ],
          ),
        ),

        // Main Driver Action Button (Start on Map / End on Map)
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: trip.isTripActive
                ? () => _showEndTripConfirmationDialog(context, trip, auth)
                : () {
                    trip.startTrip(
                      apiService: auth.apiService,
                      token: auth.token ?? '',
                      busId: auth.assignedRoute?['bus_id'] ?? '',
                      routeId: auth.assignedRoute?['route_id'] ?? '',
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: AppConstants.accentGreen,
                        behavior: SnackBarBehavior.floating,
                        content: Row(
                          children: [
                            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              trip.currentTripShift == 'morning'
                                  ? 'Morning Trip Started (Towards School)'
                                  : 'Evening Return Trip Started (From School)',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        duration: const Duration(seconds: 3),
                      ),
                    );
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: trip.isTripActive ? Colors.redAccent : AppConstants.primaryLight,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 6,
              shadowColor: (trip.isTripActive ? Colors.redAccent : AppConstants.primaryLight).withValues(alpha: 0.4),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  trip.isTripActive ? Icons.stop_circle_rounded : Icons.play_arrow_rounded,
                  size: 24,
                  color: Colors.white,
                ),
                const SizedBox(width: 8),
                Text(
                  trip.isTripActive ? 'END TRIP (CONFIRM)' : 'START TRIP (LIVE TRACK)',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }



  // ── End Trip Confirmation Dialog ──────────────────────────────────────────
  void _showEndTripConfirmationDialog(BuildContext context, TripProvider trip, AuthProvider auth) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 24),
            SizedBox(width: 8),
            Text('End Active Trip?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          ],
        ),
        content: const Text(
          'Are you sure you want to end this trip? Real-time GPS broadcasting will stop and terminus arrival will be finalized.',
          style: TextStyle(fontSize: 13.5, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Continue Trip'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              trip.endTrip(
                apiService: auth.apiService,
                token: auth.token ?? '',
                busId: auth.assignedRoute?['bus_id'] ?? '',
                routeId: auth.assignedRoute?['route_id'] ?? '',
              );
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Trip Completed Successfully! All stops reached.'),
                  backgroundColor: AppConstants.accentGreen,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: const Text('Yes, End Trip', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ── Shift Switcher Button Widget ──────────────────────────────────────────
  Widget _buildShiftButton({
    required String shiftKey,
    required String label,
    required String sublabel,
    required String emoji,
    required bool isSelected,
    required bool isTripActive,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    final isMorning = shiftKey == 'morning';
    final primaryAccent = isMorning ? const Color(0xFFD97706) : AppConstants.primaryLight;
    final activeBgLight = isMorning ? const Color(0xFFFEF3C7) : const Color(0xFFEEF2FF);
    final activeBgDark = isMorning
        ? const Color(0xFF78350F).withValues(alpha: 0.55)
        : AppConstants.primaryLight.withValues(alpha: 0.4);
    final activeBorder = isMorning ? const Color(0xFFF59E0B) : AppConstants.primaryLight;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? activeBgDark : activeBgLight)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: isSelected ? activeBorder : Colors.transparent,
            width: 1.2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: primaryAccent.withValues(alpha: 0.18),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: isSelected
                        ? (isDark
                            ? (isMorning ? const Color(0xFFFDE68A) : Colors.white)
                            : (isMorning ? const Color(0xFF92400E) : const Color(0xFF3730A3)))
                        : (isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight),
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                    height: 1.1,
                  ),
                ),
                Text(
                  sublabel,
                  style: TextStyle(
                    color: isSelected
                        ? (isDark
                            ? (isMorning ? const Color(0xFFFDE68A).withValues(alpha: 0.8) : Colors.white70)
                            : (isMorning ? const Color(0xFFB45309) : AppConstants.primaryLight))
                        : (isDark ? Colors.white38 : AppConstants.textSecondaryLight.withValues(alpha: 0.8)),
                    fontSize: 9.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    height: 1.1,
                  ),
                ),
              ],
            ),
            if (isSelected && isTripActive) ...[
              const SizedBox(width: 4),
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppConstants.accentEmeraldLight,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showActiveTripShiftWarning(BuildContext context) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.info_outline_rounded, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Trip currently running. End current trip before switching shift.',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.orange.shade800,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ── Next Stop & Passenger Boarding Live HUD ────────────────────────────────
  Widget _buildNextStopPassengerHud(
    BuildContext context,
    TripProvider trip,
    bool isDark,
    Color bg,
    Color border,
    Color textColor,
    Color subtextColor,
  ) {
    final nextStop = trip.nextStop;
    final stopName = nextStop?['stop_name'] ?? 'Final Campus Terminus';
    final isSchoolStop = nextStop?['is_school_stop'] == true ||
        nextStop?['is_school_stop'] == 1 ||
        nextStop?['is_school_stop'] == '1';
    final studentsThisStop = int.tryParse(nextStop?['student_count']?.toString() ?? '') ?? 5;
    final isLastStop = trip.isLastStop;

    final isMorning = trip.currentTripShift == 'morning';
    final distFormatted = trip.distToNextStopM >= 1000
        ? '${(trip.distToNextStopM / 1000).toStringAsFixed(1)} km'
        : '${trip.distToNextStopM.toStringAsFixed(0)} m';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black45 : Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row 1: Next Stop Title + Distance Pill
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isSchoolStop ? AppConstants.accentAmberLight : AppConstants.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(
                    isSchoolStop ? Icons.school_rounded : Icons.location_on_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isLastStop
                          ? 'FINAL STOP • STOP ${trip.nextStopIndex + 1} OF ${trip.stops.length}'
                          : 'NEXT STOP • STOP ${trip.nextStopIndex + 1} OF ${trip.stops.length}',
                      style: TextStyle(
                        color: subtextColor,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                      ),
                    ),
                    Text(
                      stopName,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.navigation_rounded, size: 12, color: AppConstants.primaryLight),
                    const SizedBox(width: 4),
                    Text(
                      '$distFormatted • ~${trip.etaMinutes} min',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),
          Divider(color: border, height: 1),
          const SizedBox(height: 8),

          // Row 2: Live Passenger Boarding Stats
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Students at next stop
              Row(
                children: [
                  Icon(
                    isMorning ? Icons.person_add_alt_1_rounded : Icons.person_remove_rounded,
                    size: 16,
                    color: isMorning ? AppConstants.accentEmeraldLight : AppConstants.accentAmberLight,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isMorning
                        ? '$studentsThisStop to board here'
                        : '$studentsThisStop dropping off here',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),

              // Total students on bus
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isMorning
                      ? AppConstants.accentEmeraldLight.withValues(alpha: 0.15)
                      : AppConstants.accentAmberLight.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isMorning
                      ? '${trip.boardedStudents} / ${trip.totalStudents} on bus'
                      : '${trip.boardedStudents} remaining on bus',
                  style: TextStyle(
                    color: isMorning ? AppConstants.accentEmeraldLight : AppConstants.accentAmberLight,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),
          // View all stops & students prompt
          GestureDetector(
            onTap: () => showRouteDetailsModal(context, initialShift: trip.currentTripShift),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 8),
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.format_list_bulleted_rounded, size: 13, color: AppConstants.primaryLight),
                  const SizedBox(width: 6),
                  Text(
                    'View All ${trip.stops.length} Stops & Student Manifest ➔',
                    style: TextStyle(
                      color: AppConstants.primaryLight,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),

        ],
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3/4 TOP-SIDE ISOMETRIC SCHOOL BUS MAP MARKER (REALISTIC 2.5D PERSPECTIVE)
// ═════════════════════════════════════════════════════════════════════════════
class SchoolBus3DMarker extends StatefulWidget {
  final double heading;
  final bool isTripActive;
  final String busNumber;

  const SchoolBus3DMarker({
    super.key,
    required this.heading,
    required this.isTripActive,
    required this.busNumber,
  });

  @override
  State<SchoolBus3DMarker> createState() => _SchoolBus3DMarkerState();
}

class _SchoolBus3DMarkerState extends State<SchoolBus3DMarker> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1300),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Transform.rotate(
          angle: widget.heading * math.pi / 180,
          alignment: Alignment.center,
          child: SizedBox(
            width: 84,
            height: 96,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Radar Pulse Aura when trip is actively moving
                if (widget.isTripActive)
                  Container(
                    width: 54 + (_pulseController.value * 28),
                    height: 54 + (_pulseController.value * 28),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppConstants.busYellow.withValues(
                        alpha: 0.25 * (1.0 - _pulseController.value),
                      ),
                    ),
                  ),

                // 3/4 Top-Side Isometric School Bus Custom Painter
                CustomPaint(
                  size: const Size(64, 88),
                  painter: SchoolBus3DIsometricPainter(
                    isTripActive: widget.isTripActive,
                    pulseValue: _pulseController.value,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SchoolBus3DIsometricPainter extends CustomPainter {
  final bool isTripActive;
  final double pulseValue;

  SchoolBus3DIsometricPainter({
    required this.isTripActive,
    this.pulseValue = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;

    // 1. Forward Headlight Projector Beams on Asphalt (when active)
    if (isTripActive) {
      final beamPaint = Paint()
        ..shader = const LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Color(0x70FEF08A),
            Color(0x30FEF08A),
            Color(0x00FEF08A),
          ],
        ).createShader(Rect.fromLTWH(cx - 24, 0, 48, 28));

      final beamPath = Path()
        ..moveTo(cx - 14, 24)
        ..lineTo(cx - 26, 0)
        ..lineTo(cx + 26, 0)
        ..lineTo(cx + 14, 24)
        ..close();
      canvas.drawPath(beamPath, beamPaint);
    }

    // 2. Realistic Ground Drop Shadow (offset for ground clearance)
    final shadowPaint = Paint()
      ..color = const Color(0x38000000)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);
    final shadowRect = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx + 3, h * 0.58 + 4), width: 34, height: 58),
      const Radius.circular(10),
    );
    canvas.drawRRect(shadowRect, shadowPaint);

    // 3. Black Rubber Wheels / Tires (with dark hubcaps)
    final tirePaint = Paint()..color = const Color(0xFF1E293B);
    final hubcapPaint = Paint()..color = const Color(0xFF64748B);
    final tires = [
      Rect.fromLTWH(cx - 20, 30, 4, 12), // Front-left
      Rect.fromLTWH(cx + 16, 30, 4, 12), // Front-right
      Rect.fromLTWH(cx - 20, 62, 4, 13), // Rear-left
      Rect.fromLTWH(cx + 16, 62, 4, 13), // Rear-right
    ];
    for (final tire in tires) {
      canvas.drawRRect(RRect.fromRectAndRadius(tire, const Radius.circular(2)), tirePaint);
      canvas.drawCircle(tire.center, 1.2, hubcapPaint);
    }

    // 4. 3D Body Extrusion / Shaded Flank (Right side / lower flank for 3D depth)
    final flankPaint = Paint()..color = const Color(0xFFD97706);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(cx - 16, 24, 34, 56), const Radius.circular(8)),
      flankPaint,
    );

    // Visible passenger windows on the 3D angled side
    final sideWindowPaint = Paint()..color = const Color(0xFF0F172A);
    for (int i = 0; i < 4; i++) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(cx + 14.5, 36.0 + (i * 10), 2.5, 7),
          const Radius.circular(1),
        ),
        sideWindowPaint,
      );
    }

    // 5. Main Upper Body (Vibrant School Bus Yellow)
    final bodyPaint = Paint()..color = const Color(0xFFFFB703);
    final bodyRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(cx - 15, 22, 30, 56),
      const Radius.circular(8),
    );
    canvas.drawRRect(bodyRect, bodyPaint);

    // Front Bumper / Radiator Grille
    final bumperPaint = Paint()..color = const Color(0xFF0F172A);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(cx - 13, 20, 26, 5), const Radius.circular(2)),
      bumperPaint,
    );
    // Silver chrome trim line
    final chromePaint = Paint()..color = const Color(0xFFE2E8F0);
    canvas.drawLine(Offset(cx - 11, 21), Offset(cx + 11, 21), chromePaint);

    // Dual Headlights
    final lightGlowPaint = Paint()..color = const Color(0xFFFEF08A);
    final lightCenterPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(cx - 9, 22), 2.5, lightGlowPaint);
    canvas.drawCircle(Offset(cx - 9, 22), 1.2, lightCenterPaint);
    canvas.drawCircle(Offset(cx + 9, 22), 2.5, lightGlowPaint);
    canvas.drawCircle(Offset(cx + 9, 22), 1.2, lightCenterPaint);

    // Side Mirrors on stalks
    final mirrorStalkPaint = Paint()..color = const Color(0xFF0F172A)..strokeWidth = 1.2;
    canvas.drawLine(Offset(cx - 15, 26), Offset(cx - 19, 24), mirrorStalkPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(cx - 21, 22, 3, 5), const Radius.circular(1)), Paint()..color = const Color(0xFFD97706));
    canvas.drawLine(Offset(cx + 15, 26), Offset(cx + 19, 24), mirrorStalkPaint);
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(cx + 18, 22, 3, 5), const Radius.circular(1)), Paint()..color = const Color(0xFFD97706));

    // 6. Raked Front Windshield (Glass with sky reflection)
    final windshieldPath = Path()
      ..moveTo(cx - 13, 25)
      ..lineTo(cx + 13, 25)
      ..lineTo(cx + 12, 34)
      ..lineTo(cx - 12, 34)
      ..close();
    final glassPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF38BDF8), Color(0xFF0F172A)],
      ).createShader(Rect.fromLTWH(cx - 13, 25, 26, 9));
    canvas.drawPath(windshieldPath, glassPaint);

    // Windshield diagonal reflection shine
    final reflectionPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.6)
      ..strokeWidth = 1.5;
    canvas.drawLine(Offset(cx - 5, 26), Offset(cx - 10, 33), reflectionPaint);
    canvas.drawLine(Offset(cx + 3, 26), Offset(cx - 1, 33), reflectionPaint);

    // 7. Roof Rails & Ribs (School Bus Signature)
    final ribPaint = Paint()
      ..color = const Color(0x33000000)
      ..strokeWidth = 1.2;
    canvas.drawLine(Offset(cx - 10, 40), Offset(cx - 10, 72), ribPaint);
    canvas.drawLine(Offset(cx, 40), Offset(cx, 72), ribPaint);
    canvas.drawLine(Offset(cx + 10, 40), Offset(cx + 10, 72), ribPaint);

    // 8. White Emergency Roof Hatch
    final hatchPaint = Paint()..color = const Color(0xFFF8FAFC);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(cx, 55), width: 14, height: 12), const Radius.circular(2)),
      hatchPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(cx, 55), width: 14, height: 12), const Radius.circular(2)),
      Paint()..color = const Color(0xFFCBD5E1)..style = PaintingStyle.stroke..strokeWidth = 0.8,
    );

    // 9. Black Roof School Bus Banner
    final bannerPaint = Paint()..color = const Color(0xFF0F172A);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(cx, 37), width: 22, height: 4), const Radius.circular(1)),
      bannerPaint,
    );

    // 10. Front and Rear Red Emergency Warning Flashers (pulsing)
    final flasherPaint = Paint()..color = isTripActive ? Colors.redAccent : Colors.red.shade800;
    canvas.drawCircle(Offset(cx - 12, 24), 2.2, flasherPaint);
    canvas.drawCircle(Offset(cx + 12, 24), 2.2, flasherPaint);
    canvas.drawCircle(Offset(cx - 12, 76), 2.2, flasherPaint);
    canvas.drawCircle(Offset(cx + 12, 76), 2.2, flasherPaint);

    // Tail lights (Rear Bumper)
    final tailPaint = Paint()..color = Colors.red;
    canvas.drawRect(Rect.fromLTWH(cx - 13, 77, 5, 2), tailPaint);
    canvas.drawRect(Rect.fromLTWH(cx + 8, 77, 5, 2), tailPaint);
  }

  @override
  bool shouldRepaint(covariant SchoolBus3DIsometricPainter oldDelegate) {
    return oldDelegate.isTripActive != isTripActive || oldDelegate.pulseValue != pulseValue;
  }
}
