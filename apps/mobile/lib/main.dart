import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/auth_provider.dart';
import 'core/constants.dart';
import 'core/theme_provider.dart';
import 'screens/driver_trip_screen.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';

import 'core/trip_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI styling for seamless mobile experience
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppConstants.bgDark,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => TripProvider()),
      ],
      child: const EdexMobileApp(),
    ),
  );
}

class EdexMobileApp extends StatelessWidget {
  const EdexMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return MaterialApp(
      title: 'EDEX',
      debugShowCheckedModeBanner: false,
      themeMode: themeProvider.themeMode,
      theme: _buildLightTheme(),
      darkTheme: _buildDarkTheme(),
      home: const SplashScreen(),
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/driver-trip': (context) => const DriverTripScreen(),
      },
    );
  }

  ThemeData _buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppConstants.bgLight,
      colorScheme: const ColorScheme.light(
        primary: AppConstants.primaryLight,
        secondary: AppConstants.secondaryLight,
        surface: AppConstants.surfaceLight,
        error: Colors.redAccent,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppConstants.textPrimaryLight,
      ),
      cardTheme: CardThemeData(
        color: AppConstants.surfaceLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppConstants.borderLight, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppConstants.bgLight,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppConstants.textPrimaryLight),
        titleTextStyle: TextStyle(
          color: AppConstants.textPrimaryLight,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      dividerColor: AppConstants.borderLight,
    );
  }

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppConstants.bgDark,
      colorScheme: const ColorScheme.dark(
        primary: AppConstants.primary,
        secondary: AppConstants.secondary,
        surface: AppConstants.surfaceDark,
        error: AppConstants.accentRose,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppConstants.textPrimary,
      ),
      cardTheme: CardThemeData(
        color: AppConstants.surfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppConstants.borderDark, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppConstants.bgDark,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppConstants.textPrimary),
        titleTextStyle: TextStyle(
          color: AppConstants.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      dividerColor: AppConstants.borderDark,
    );
  }
}