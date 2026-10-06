import 'package:flutter/material.dart';

class AppConstants {
  // Base URLs: localhost for USB reverse debugging (adb reverse tcp:5000 tcp:5000)
  // and Windows/Web; 10.0.2.2 for Android Studio Emulator.
  static const String defaultBaseUrl = 'http://localhost:5000/api';
  static const String emulatorBaseUrl = 'http://10.0.2.2:5000/api';


  // Light Theme Colors (Clean Slate SaaS Palette matching EDEX Web)
  static const Color bgLight = Color(0xFFF8FAFC); // Slate-50
  static const Color surfaceLight = Color(0xFFFFFFFF); // Pure white card
  static const Color surfaceElevatedLight = Color(0xFFF1F5F9); // Slate-100
  static const Color surfaceMutedLight = Color(0xFFE2E8F0); // Slate-200
  static const Color primaryLight = Color(0xFF4F46E5); // Indigo-600
  static const Color primaryHoverLight = Color(0xFF4338CA); // Indigo-700
  static const Color primarySubtleLight = Color(0xFFEEF2FF); // Indigo-50
  static const Color secondaryLight = Color(0xFF7C3AED); // Violet-600
  static const Color accentAmberLight = Color(0xFFD97706); // Amber-600
  static const Color accentEmeraldLight = Color(0xFF059669); // Emerald-600
  static const Color textPrimaryLight = Color(0xFF0F172A); // Slate-900 (deep navy black)
  static const Color textSecondaryLight = Color(0xFF475569); // Slate-600
  static const Color textMutedLight = Color(0xFF94A3B8); // Slate-400
  static const Color borderLight = Color(0xFFE2E8F0); // Subtle Slate-200 border
  static const Color borderHeroLight = Color(0xFFC7D2FE); // Indigo-200 border

  // Dark Theme Colors (Deep Midnight Palette)
  static const Color primary = Color(0xFF6366F1); // Indigo-500
  static const Color primaryDark = Color(0xFF4F46E5); // Indigo-600
  static const Color primarySubtleDark = Color(0x1F6366F1);
  static const Color secondary = Color(0xFF8B5CF6);
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentGreen = Color(0xFF10B981);
  static const Color accentRose = Color(0xFFF43F5E);
  static const Color bgDark = Color(0xFF090D16); // True deep dark
  static const Color surfaceDark = Color(0xFF0F172A); // Slate-900 surface
  static const Color surfaceElevated = Color(0xFF1E293B); // Slate-800 elevated card
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMutedDark = Color(0xFF64748B);
  static const Color borderDark = Color(0x1AFFFFFF); // 10% white subtle border

  // 3D Isometric School Bus Palette
  static const Color busYellow = Color(0xFFFFB703); // Authentic School Bus Yellow
  static const Color busYellowShade = Color(0xFFF59E0B); // Shaded body flank
  static const Color busAmberDark = Color(0xFFD97706); // Undercarriage / side depth
  static const Color busRoofWhite = Color(0xFFFAFAFA); // Roof escape hatch
  static const Color busGlass = Color(0xFF38BDF8); // Windshield blue glass
  static const Color busGlassReflection = Color(0xFFBAE6FD); // Sky reflection highlight
  static const Color busCockpit = Color(0xFF0F172A); // Interior cabin depth
  static const Color busTireBlack = Color(0xFF1E293B); // Rubber tire dark slate
  static const Color busBumperChrome = Color(0xFFE2E8F0); // Front bumper highlight
  static const Color busHeadlightBeam = Color(0x66FEF08A); // Warm light beam projection
}

