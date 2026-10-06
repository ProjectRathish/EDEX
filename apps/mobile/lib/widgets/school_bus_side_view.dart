import 'dart:math' as math;
import 'package:flutter/material.dart';

/// An authentic, detailed side-view illustration of a classic yellow school bus.
/// Features characteristic sloped hood, tinted passenger windows, black rub rails,
/// emergency roof flashers, and realistic dual wheels.
class SchoolBusSideView extends StatefulWidget {
  final double width;
  final double height;
  final bool isMoving;
  final bool facingLeft;
  final String? label;

  const SchoolBusSideView({
    super.key,
    this.width = 86,
    this.height = 38,
    this.isMoving = true,
    this.facingLeft = false,
    this.label,
  });

  @override
  State<SchoolBusSideView> createState() => _SchoolBusSideViewState();
}

class _SchoolBusSideViewState extends State<SchoolBusSideView> with SingleTickerProviderStateMixin {
  late AnimationController _wheelCtrl;

  @override
  void initState() {
    super.initState();
    _wheelCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    if (widget.isMoving) {
      _wheelCtrl.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant SchoolBusSideView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isMoving != oldWidget.isMoving) {
      if (widget.isMoving) {
        _wheelCtrl.repeat();
      } else {
        _wheelCtrl.stop();
      }
    }
  }

  @override
  void dispose() {
    _wheelCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Widget bus = AnimatedBuilder(
      animation: _wheelCtrl,
      builder: (context, child) {
        return CustomPaint(
          size: Size(widget.width, widget.height),
          painter: _SchoolBusSidePainter(
            wheelRotation: widget.isMoving ? _wheelCtrl.value * 2 * math.pi : 0.0,
            isMoving: widget.isMoving,
            label: widget.label ?? 'SCHOOL BUS',
          ),
        );
      },
    );

    if (widget.facingLeft) {
      bus = Transform(
        alignment: Alignment.center,
        transform: Matrix4.diagonal3Values(-1.0, 1.0, 1.0),
        child: bus,
      );
    }

    return bus;
  }
}

class _SchoolBusSidePainter extends CustomPainter {
  final double wheelRotation;
  final bool isMoving;
  final String label;

  _SchoolBusSidePainter({
    required this.wheelRotation,
    required this.isMoving,
    required this.label,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Palette
    const schoolBusYellow = Color(0xFFFFB703); // Official National School Bus Chrome
    const schoolBusShadow = Color(0xFFD97706); // Darker amber under-carriage/side shading
    const schoolBusRoof = Color(0xFFFBBF24); // Highlight roof
    const chassisDark = Color(0xFF1E293B);
    const windowBlue = Color(0xFF0284C7);
    const windowGlint = Color(0x99BAE6FD);
    const tireBlack = Color(0xFF0F172A);
    const rimSilver = Color(0xFF94A3B8);
    const chromeSilver = Color(0xFFE2E8F0);
    const flasherRed = Color(0xFFEF4444);
    const flasherAmber = Color(0xFFF59E0B);

    // Coordinate Anchors
    final groundY = h * 0.88;
    final wheelRadius = h * 0.22;
    final bodyBottomY = groundY - (wheelRadius * 0.7);
    final bodyTopY = h * 0.16;
    final roofPeakY = h * 0.11;

    // Wheel Centers (Standard School Bus Stance: Hood on Right, Tail on Left)
    final rearWheelX = w * 0.24;
    final frontWheelX = w * 0.78;
    final wheelCenterY = groundY - (wheelRadius * 0.85);

    // ── 1. Ground Drop Shadow ──────────────────────────────────────────
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.25)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.5);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * 0.5, groundY + 1), width: w * 0.92, height: h * 0.16),
      shadowPaint,
    );

    // ── 2. Exhaust Pipe & Undercarriage Frame ───────────────────────────
    final chassisPaint = Paint()..color = chassisDark;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTRB(w * 0.05, bodyBottomY - 1, w * 0.95, bodyBottomY + 3),
        const Radius.circular(1.5),
      ),
      chassisPaint,
    );

    // ── 3. Main School Bus Yellow Body Profile ─────────────────────────
    // Conventional School Bus: Square rear, long passenger body, front sloped hood
    final hoodStartX = w * 0.82;
    final hoodEndY = bodyBottomY - (h * 0.28);
    final bumperFrontX = w * 0.97;

    final bodyPath = Path()
      // Rear bumper bottom-left
      ..moveTo(w * 0.04, bodyBottomY)
      // Rear wall going straight up
      ..lineTo(w * 0.04, bodyTopY + (h * 0.06))
      // Rear roof curve
      ..quadraticBezierTo(w * 0.04, roofPeakY, w * 0.10, roofPeakY)
      // Long roof line
      ..lineTo(hoodStartX - (w * 0.06), roofPeakY)
      // Front windshield slope down to hood
      ..lineTo(hoodStartX, hoodEndY)
      // Front hood extending forward
      ..lineTo(bumperFrontX - (w * 0.02), hoodEndY)
      // Front grille drop
      ..lineTo(bumperFrontX - (w * 0.02), bodyBottomY)
      // Bottom chassis line back to start
      ..lineTo(w * 0.04, bodyBottomY)
      ..close();

    // Body Gradient (Vibrant 3D lighting)
    final bodyPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          schoolBusRoof,
          schoolBusYellow,
          schoolBusYellow,
          schoolBusShadow,
        ],
        stops: [0.0, 0.2, 0.75, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, w, h));
    canvas.drawPath(bodyPath, bodyPaint);

    // ── 4. Wheel Wells (Arches above wheels) ───────────────────────────
    final wheelWellRadius = wheelRadius * 1.25;
    final wheelWellPaint = Paint()..color = chassisDark;
    canvas.drawArc(
      Rect.fromCircle(center: Offset(rearWheelX, wheelCenterY), radius: wheelWellRadius),
      math.pi,
      math.pi,
      true,
      wheelWellPaint,
    );
    canvas.drawArc(
      Rect.fromCircle(center: Offset(frontWheelX, wheelCenterY), radius: wheelWellRadius),
      math.pi,
      math.pi,
      true,
      wheelWellPaint,
    );

    // ── 5. Front Hood Detail & Grille Trim ─────────────────────────────
    final hoodSeamPaint = Paint()
      ..color = Colors.black26
      ..strokeWidth = 1.0;
    canvas.drawLine(Offset(hoodStartX, hoodEndY), Offset(hoodStartX, bodyBottomY), hoodSeamPaint);

    // Chrome front headlight
    final lightPaint = Paint()..color = const Color(0xFFFEF08A);
    canvas.drawCircle(Offset(bumperFrontX - (w * 0.035), hoodEndY + (h * 0.08)), h * 0.07, lightPaint);
    canvas.drawCircle(Offset(bumperFrontX - (w * 0.035), hoodEndY + (h * 0.08)), h * 0.035, Paint()..color = Colors.white);

    // Front Black Bumper
    final bumperPaint = Paint()..color = chassisDark;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTRB(bumperFrontX - (w * 0.03), bodyBottomY - 2, bumperFrontX + (w * 0.02), bodyBottomY + 3.5),
        const Radius.circular(2),
      ),
      bumperPaint,
    );

    // Rear Black Bumper
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTRB(w * 0.015, bodyBottomY - 2, w * 0.065, bodyBottomY + 3.5),
        const Radius.circular(2),
      ),
      bumperPaint,
    );

    // ── 6. Characteristic Black Rub Rails (School Bus Signatures) ─────
    final railPaint = Paint()
      ..color = chassisDark
      ..strokeWidth = 1.2;
    // Lower rub rail
    canvas.drawLine(Offset(w * 0.05, bodyBottomY - (h * 0.08)), Offset(hoodStartX - (w * 0.01), bodyBottomY - (h * 0.08)), railPaint);
    // Middle rub rail (below windows)
    canvas.drawLine(Offset(w * 0.05, bodyBottomY - (h * 0.28)), Offset(hoodStartX + (w * 0.12), bodyBottomY - (h * 0.28)), railPaint);

    // ── 7. Passenger Windows Row & Windshield ──────────────────────────
    final windowFramePaint = Paint()..color = const Color(0xFF0F172A);
    final windowGlassPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [windowBlue, Color(0xFF0369A1)],
      ).createShader(Rect.fromLTWH(0, 0, w, h));

    // Passenger windows (4 distinct square windows)
    final windowTopY = roofPeakY + (h * 0.08);
    final windowHeight = h * 0.28;
    final numWindows = 4;
    final windowSpanStart = w * 0.08;
    final windowSpanEnd = w * 0.68;
    final totalWindowWidth = (windowSpanEnd - windowSpanStart);
    final singleWindowWidth = (totalWindowWidth / numWindows) - (w * 0.015);

    for (int i = 0; i < numWindows; i++) {
      final wx = windowSpanStart + (i * (singleWindowWidth + (w * 0.015)));
      final winRect = Rect.fromLTWH(wx, windowTopY, singleWindowWidth, windowHeight);

      // Black Frame
      canvas.drawRRect(RRect.fromRectAndRadius(winRect.inflate(0.8), const Radius.circular(1.5)), windowFramePaint);
      // Blue Glass
      canvas.drawRRect(RRect.fromRectAndRadius(winRect, const Radius.circular(1)), windowGlassPaint);

      // Diagonal Glint
      final glintPaint = Paint()
        ..color = windowGlint
        ..strokeWidth = 1.0;
      canvas.drawLine(Offset(wx + 2, windowTopY + 2), Offset(wx + singleWindowWidth - 2, windowTopY + windowHeight - 2), glintPaint);
    }

    // Driver / Passenger Front Door Windshield Glass (Angled)
    final windshieldPath = Path()
      ..moveTo(w * 0.71, windowTopY)
      ..lineTo(hoodStartX - (w * 0.01), windowTopY)
      ..lineTo(hoodStartX, hoodEndY - 1)
      ..lineTo(w * 0.71, hoodEndY - 1)
      ..close();
    canvas.drawPath(windshieldPath, windowFramePaint);
    canvas.drawPath(windshieldPath, windowGlassPaint);

    // ── 8. Red & Amber Roof Emergency Warning Flashers ─────────────────
    // Rear Flashers (Amber & Red)
    canvas.drawCircle(Offset(w * 0.06, roofPeakY + 2), 2.0, Paint()..color = flasherRed);
    canvas.drawCircle(Offset(w * 0.09, roofPeakY + 2), 1.8, Paint()..color = flasherAmber);

    // Front Flashers (Amber & Red above windshield)
    canvas.drawCircle(Offset(hoodStartX - (w * 0.06), roofPeakY + 2), 1.8, Paint()..color = flasherAmber);
    canvas.drawCircle(Offset(hoodStartX - (w * 0.03), roofPeakY + 2), 2.0, Paint()..color = flasherRed);

    // ── 9. Characteristic Black "SCHOOL BUS" Beltline Banner ───────────
    final bannerRect = Rect.fromLTWH(w * 0.12, bodyBottomY - (h * 0.24), w * 0.52, h * 0.13);
    final bannerPaint = Paint()..color = Colors.black.withValues(alpha: 0.85);
    canvas.drawRRect(RRect.fromRectAndRadius(bannerRect, const Radius.circular(1.5)), bannerPaint);

    final textPainter = TextPainter(
      text: TextSpan(
        text: label.toUpperCase(),
        style: TextStyle(
          color: schoolBusYellow,
          fontSize: (h * 0.09).clamp(5.0, 9.0),
          fontWeight: FontWeight.w900,
          letterSpacing: 0.8,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: bannerRect.width);
    textPainter.paint(
      canvas,
      Offset(
        bannerRect.center.dx - (textPainter.width / 2),
        bannerRect.center.dy - (textPainter.height / 2),
      ),
    );

    // ── 10. Heavy Duty Black Rubber Wheels with Rotating Hubcaps ──────
    void drawWheel(double cx, double cy) {
      // Outer Black Tire
      canvas.drawCircle(Offset(cx, cy), wheelRadius, Paint()..color = tireBlack);

      // Deep Rim
      canvas.drawCircle(Offset(cx, cy), wheelRadius * 0.65, Paint()..color = const Color(0xFF334155));

      // Silver Hubcap
      canvas.drawCircle(Offset(cx, cy), wheelRadius * 0.42, Paint()..color = rimSilver);

      // Center Axle Nut
      canvas.drawCircle(Offset(cx, cy), wheelRadius * 0.16, Paint()..color = chromeSilver);

      // Rotating Lug Nuts / Spokes
      final spokePaint = Paint()
        ..color = Colors.black87
        ..strokeWidth = 1.0;
      for (int i = 0; i < 4; i++) {
        final angle = wheelRotation + (i * math.pi / 2);
        final sx = cx + (math.cos(angle) * (wheelRadius * 0.32));
        final sy = cy + (math.sin(angle) * (wheelRadius * 0.32));
        canvas.drawCircle(Offset(sx, sy), 0.8, spokePaint);
      }
    }

    drawWheel(rearWheelX, wheelCenterY);
    drawWheel(frontWheelX, wheelCenterY);
  }

  @override
  bool shouldRepaint(covariant _SchoolBusSidePainter oldDelegate) {
    return oldDelegate.wheelRotation != wheelRotation ||
        oldDelegate.isMoving != isMoving ||
        oldDelegate.label != label;
  }
}
