import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/auth_provider.dart';
import '../core/theme_provider.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _schoolCodeCtrl = TextEditingController(text: 'EDX0001');
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _schoolCodeCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final schoolCode = _schoolCodeCtrl.text.trim();
    final username = _usernameCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your username and password');
      return;
    }

    setState(() => _errorMessage = null);
    final auth = Provider.of<AuthProvider>(context, listen: false);

    try {
      final success = await auth.login(
        schoolCode: schoolCode,
        username: username,
        password: password,
      );

      if (success && mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceAll('Exception: ', ''));
    }
  }

  void _fillDriverCredentials() {
    setState(() {
      _schoolCodeCtrl.text = 'EDX0001';
      _usernameCtrl.text = 'driver_drvr14';
      _passwordCtrl.text = 'Edex@123';
      _errorMessage = null;
    });
  }

  void _fillAdminCredentials() {
    setState(() {
      _schoolCodeCtrl.text = 'EDX0001';
      _usernameCtrl.text = 'admin';
      _passwordCtrl.text = 'Edex@123';
      _errorMessage = null;
    });
  }

  void _handleDemoDriverLogin() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.loginAsDemoDriver();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    }
  }

  void _handleDemoParentLogin() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.loginAsDemoParent();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    }
  }

  void _handleDemoAdminLogin() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.loginAsDemoAdmin();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    }
  }

  void _showServerSettings() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final urlCtrl = TextEditingController(text: auth.apiService.baseUrl);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Backend API URL',
            style: TextStyle(
              color: isDark ? Colors.white : AppConstants.textPrimaryLight,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Select a preset or enter your backend server URL:',
                  style: TextStyle(
                    color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ActionChip(
                      backgroundColor: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                      label: const Text('Wi-Fi: 192.168.1.161', style: TextStyle(color: Colors.cyan, fontSize: 11)),
                      onPressed: () {
                        setDialogState(() {
                          urlCtrl.text = 'http://192.168.1.161:5000/api';
                        });
                      },
                    ),
                    ActionChip(
                      backgroundColor: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                      label: const Text('USB: localhost:5000', style: TextStyle(color: AppConstants.accentAmber, fontSize: 11)),
                      onPressed: () {
                        setDialogState(() {
                          urlCtrl.text = 'http://localhost:5000/api';
                        });
                      },
                    ),
                    ActionChip(
                      backgroundColor: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                      label: const Text('Emulator: 10.0.2.2', style: TextStyle(color: AppConstants.primary, fontSize: 11)),
                      onPressed: () {
                        setDialogState(() {
                          urlCtrl.text = 'http://10.0.2.2:5000/api';
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: urlCtrl,
                  style: TextStyle(color: isDark ? Colors.white : AppConstants.textPrimaryLight),
                  decoration: InputDecoration(
                    labelText: 'API Base URL',
                    labelStyle: TextStyle(color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight),
                    hintText: 'http://192.168.1.161:5000/api',
                    filled: true,
                    fillColor: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Cancel',
                style: TextStyle(color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primary),
              onPressed: () {
                final newUrl = urlCtrl.text.trim();
                auth.apiService.setBaseUrl(newUrl);
                Navigator.pop(ctx);
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                    content: Text(
                      'API URL updated to: $newUrl',
                      style: TextStyle(color: isDark ? Colors.white : AppConstants.textPrimaryLight),
                    ),
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
              child: const Text('Save', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;

    final bgColor = isDark ? AppConstants.bgDark : AppConstants.bgLight;
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final elevatedColor = isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;
    final borderColor = isDark ? Colors.white10 : AppConstants.borderLight;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // App Logo
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppConstants.primary, AppConstants.primaryDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppConstants.primary.withValues(alpha: 0.35),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          )
                        ],
                      ),
                      child: const Icon(Icons.school_rounded, color: Colors.white, size: 38),
                    ),
                    const SizedBox(height: 18),

                    Text(
                      'EDEX Unified Login',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Common Access Portal for Drivers, Staff & Parents',
                      style: TextStyle(color: subtextColor, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),

                    // Common Login Form Card
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: borderColor),
                        boxShadow: [
                          BoxShadow(
                            color: isDark ? Colors.black45 : Colors.black.withValues(alpha: 0.06),
                            blurRadius: 18,
                            offset: const Offset(0, 8),
                          )
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // School Code
                          TextField(
                            controller: _schoolCodeCtrl,
                            textCapitalization: TextCapitalization.characters,
                            style: TextStyle(color: textColor, fontWeight: FontWeight.bold),
                            decoration: InputDecoration(
                              labelText: 'School Code',
                              labelStyle: TextStyle(color: subtextColor),
                              prefixIcon: const Icon(Icons.domain_rounded, color: AppConstants.primary),
                              filled: true,
                              fillColor: elevatedColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Username / Identifier
                          TextField(
                            controller: _usernameCtrl,
                            style: TextStyle(color: textColor),
                            decoration: InputDecoration(
                              labelText: 'Username / Phone / Employee ID',
                              labelStyle: TextStyle(color: subtextColor),
                              prefixIcon: const Icon(Icons.person_outline_rounded, color: AppConstants.primary),
                              filled: true,
                              fillColor: elevatedColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Password
                          TextField(
                            controller: _passwordCtrl,
                            obscureText: _obscurePassword,
                            style: TextStyle(color: textColor),
                            decoration: InputDecoration(
                              labelText: 'Password',
                              labelStyle: TextStyle(color: subtextColor),
                              prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppConstants.primary),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                                  color: subtextColor,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: elevatedColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                          // Quick autofill chips for real backend database accounts
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              ActionChip(
                                avatar: const Icon(Icons.directions_bus_rounded, size: 14, color: AppConstants.accentAmber),
                                label: const Text('Fill Driver (drvr14)', style: TextStyle(fontSize: 11)),
                                backgroundColor: elevatedColor,
                                onPressed: _fillDriverCredentials,
                              ),
                              ActionChip(
                                avatar: const Icon(Icons.admin_panel_settings_rounded, size: 14, color: AppConstants.primary),
                                label: const Text('Fill Admin', style: TextStyle(fontSize: 11)),
                                backgroundColor: elevatedColor,
                                onPressed: _fillAdminCredentials,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.redAccent.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Sign in button
                          SizedBox(
                            height: 52,
                            child: ElevatedButton(
                              onPressed: auth.isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppConstants.primary,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 4,
                              ),
                              child: auth.isLoading
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                                    )
                                  : const Text(
                                      'SIGN IN TO EDEX',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick Demo Testing Section for Instant Verification
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: borderColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.touch_app_rounded, color: AppConstants.accentAmber, size: 16),
                              const SizedBox(width: 8),
                              Text(
                                'QUICK DEMO LOGINS',
                                style: TextStyle(
                                  color: subtextColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Driver Demo Button
                          OutlinedButton.icon(
                            onPressed: _handleDemoDriverLogin,
                            icon: const Icon(Icons.directions_bus_rounded, color: AppConstants.accentAmber, size: 18),
                            label: const Text(
                              'Test Driver Login (Bus KL53H9219)',
                              style: TextStyle(color: AppConstants.accentAmber, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppConstants.accentAmber, width: 1.2),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Parent & Admin Demo Buttons
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _handleDemoParentLogin,
                                  icon: const Icon(Icons.family_restroom_rounded, color: Colors.cyan, size: 16),
                                  label: const Text(
                                    'Parent Demo',
                                    style: TextStyle(color: Colors.cyan, fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Colors.cyan, width: 1.0),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _handleDemoAdminLogin,
                                  icon: const Icon(Icons.admin_panel_settings_rounded, color: AppConstants.primary, size: 16),
                                  label: const Text(
                                    'Admin Demo',
                                    style: TextStyle(color: AppConstants.primary, fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: AppConstants.primary, width: 1.0),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton.icon(
                          onPressed: _showServerSettings,
                          icon: Icon(Icons.settings_rounded, size: 15, color: subtextColor),
                          label: Text(
                            'Server Configuration',
                            style: TextStyle(color: subtextColor, fontSize: 12),
                          ),
                        ),
                        Container(
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: subtextColor.withValues(alpha: 0.5)),
                        ),
                        Flexible(
                          child: Text(
                            auth.apiService.baseUrl.replaceAll('http://', ''),
                            style: TextStyle(color: subtextColor.withValues(alpha: 0.7), fontSize: 11),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
      ),
    );
  }
}
