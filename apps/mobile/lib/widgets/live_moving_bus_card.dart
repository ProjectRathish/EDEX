import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../core/trip_provider.dart';

class LiveMovingBusCard extends StatefulWidget {
  final TripProvider trip;
  final VoidCallback onOpenMap;

  const LiveMovingBusCard({
    super.key,
    required this.trip,
    required this.onOpenMap,
  });

  @override
  State<LiveMovingBusCard> createState() => _LiveMovingBusCardState();
}

class _LiveMovingBusCardState extends State<LiveMovingBusCard> with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trip = widget.trip;

    final nextStopName = trip.nextStop?['stop_name'] ?? 'Campus Terminus';
    final distFormatted = trip.distToNextStopM >= 1000
        ? '${(trip.distToNextStopM / 1000).toStringAsFixed(1)} km'
        : '${trip.distToNextStopM.toStringAsFixed(0)} m';

    return GestureDetector(
      onTap: widget.onOpenMap,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: isDark
                ? [
                    const Color(0xFF0F172A),
                    const Color(0xFF1E293B),
                    const Color(0xFF1E1B4B),
                  ]
                : [
                    const Color(0xFFEEF2FF),
                    const Color(0xFFE0E7FF),
                    const Color(0xFFFEF3C7),
                  ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(
            color: isDark ? AppConstants.primary.withValues(alpha: 0.5) : AppConstants.primaryLight.withValues(alpha: 0.4),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: AppConstants.primaryLight.withValues(alpha: isDark ? 0.35 : 0.2),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Status Ribbon
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.3)
                      : Colors.white.withValues(alpha: 0.6),
                  border: Border(
                    bottom: BorderSide(
                      color: isDark ? Colors.white12 : AppConstants.borderLight,
                      width: 1,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          // Pulsing Green Live Beacon
                          AnimatedBuilder(
                            animation: _animCtrl,
                            builder: (context, child) {
                              final scale = 1.0 + (math.sin(_animCtrl.value * 2 * math.pi) * 0.25);
                              return Transform.scale(
                                scale: scale,
                                child: Container(
                                  width: 9,
                                  height: 9,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppConstants.accentEmeraldLight,
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppConstants.accentEmeraldLight.withValues(alpha: 0.8),
                                        blurRadius: 8,
                                        spreadRadius: 1.5,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                'TRIP IN TRANSIT • BUS MOVING',
                                style: TextStyle(
                                  color: isDark ? AppConstants.accentEmeraldLight : const Color(0xFF047857),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.8,
                                ),
                                maxLines: 1,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Live Speed Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppConstants.busYellow.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppConstants.accentAmberLight.withValues(alpha: 0.5)),
                      ),
                      child: Text(
                        '${trip.currentSpeedKmh.toStringAsFixed(0)} KM/H',
                        style: const TextStyle(
                          color: AppConstants.accentAmberLight,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Animated Moving Bus Scene
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                child: SizedBox(
                  height: 68,
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      // Animated Dashed Roadway in background
                      Positioned(
                        bottom: 12,
                        left: 0,
                        right: 0,
                        child: AnimatedBuilder(
                          animation: _animCtrl,
                          builder: (context, child) {
                            return CustomPaint(
                              size: const Size(double.infinity, 10),
                              painter: _MovingRoadPainter(
                                progress: _animCtrl.value,
                                isDark: isDark,
                              ),
                            );
                          },
                        ),
                      ),

                      // Animated Driving Bus (Gently swaying and cruising horizontally)
                      AnimatedBuilder(
                        animation: _animCtrl,
                        builder: (context, child) {
                          // Gentle horizontal bobbing motion
                          final offsetPercent = (_animCtrl.value);
                          final bounce = math.sin(_animCtrl.value * 4 * math.pi) * 2.0;

                          return LayoutBuilder(
                            builder: (context, constraints) {
                              final availableWidth = constraints.maxWidth - 72;
                              // Bus loops smoothly across card
                              final busX = (offsetPercent * availableWidth);

                              return Positioned(
                                left: busX,
                                bottom: 12 + bounce,
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppConstants.busYellow,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.25),
                                        blurRadius: 8,
                                        offset: const Offset(0, 4),
                                      ),
                                      BoxShadow(
                                        color: AppConstants.accentAmber.withValues(alpha: 0.4),
                                        blurRadius: 10,
                                        offset: const Offset(4, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.directions_bus_filled_rounded,
                                        color: Colors.black87,
                                        size: 26,
                                      ),
                                      SizedBox(width: 4),
                                      Icon(
                                        Icons.fast_forward_rounded,
                                        color: Colors.black54,
                                        size: 14,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Live Telemetry Details
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark ? Colors.white10 : AppConstants.borderLight,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Target Stop
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: AppConstants.primaryLight.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.location_on_rounded,
                          color: AppConstants.primaryLight,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'NEXT STOP • STOP ${trip.nextStopIndex + 1} OF ${trip.stops.length}',
                              style: TextStyle(
                                color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            Text(
                              nextStopName,
                              style: TextStyle(
                                color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      // Distance & ETA badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? AppConstants.surfaceDark : Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isDark ? Colors.white12 : AppConstants.borderLight,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              distFormatted,
                              style: TextStyle(
                                color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              '~${trip.etaMinutes} min ETA',
                              style: const TextStyle(
                                color: AppConstants.accentAmberLight,
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Action CTA Button
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                child: Container(
                  width: double.infinity,
                  height: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(
                      colors: [AppConstants.primaryLight, Color(0xFF4338CA)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppConstants.primaryLight.withValues(alpha: 0.4),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.map_rounded, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        const Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'OPEN LIVE MAP (CURRENT LOCATION) ➔',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                              maxLines: 1,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MovingRoadPainter extends CustomPainter {
  final double progress;
  final bool isDark;

  _MovingRoadPainter({required this.progress, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    // Road Surface
    final roadPaint = Paint()
      ..color = isDark ? const Color(0xFF334155).withValues(alpha: 0.5) : const Color(0xFFE2E8F0);
    final roadRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(5),
    );
    canvas.drawRRect(roadRect, roadPaint);

    // Dashed White Lane Lines (Moving backwards to give illusion of forward bus cruising)
    final dashPaint = Paint()
      ..color = isDark ? Colors.white38 : Colors.white70
      ..strokeWidth = 2.0;

    const dashWidth = 12.0;
    const dashSpace = 8.0;
    final totalDash = dashWidth + dashSpace;
    final offset = (progress * totalDash);

    for (double x = -totalDash + offset; x < size.width + totalDash; x += totalDash) {
      final startX = x.clamp(0.0, size.width);
      final endX = (x + dashWidth).clamp(0.0, size.width);
      if (endX > startX) {
        canvas.drawLine(
          Offset(startX, size.height / 2),
          Offset(endX, size.height / 2),
          dashPaint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _MovingRoadPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
