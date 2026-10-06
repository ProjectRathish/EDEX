import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/auth_provider.dart';
import '../core/theme_provider.dart';
import '../core/trip_provider.dart';
import '../widgets/live_moving_bus_card.dart';
import '../widgets/route_details_modal.dart';
import 'driver_trip_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late String _tripShift;
  late final PageController _posterPageController;
  int _currentPosterIndex = 0;
  Timer? _posterAutoScrollTimer;
  int _currentBottomNavIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final ScrollController _mainScrollController = ScrollController();

  // Campus Announcement Posters
  final List<Map<String, dynamic>> _announcements = [
    {
      'id': 'ANN-01',
      'tag': 'CAMPUS EVENT',
      'tagColor': const Color(0xFFEF4444),
      'date': 'Oct 15, 2026',
      'title': 'Annual Inter-School Sports Meet 2026',
      'desc': 'Track & field events and inter-house football trials open this Friday. Register via Physical Education dept.',
      'gradient': [const Color(0xFF7F1D1D), const Color(0xFFB91C1C)],
      'icon': Icons.emoji_events_rounded,
    },
    {
      'id': 'ANN-02',
      'tag': 'FLEET SAFETY',
      'tagColor': const Color(0xFFF59E0B),
      'date': 'Active Advisory',
      'title': 'Monsoon Transit & Fleet Pre-Trip Checks',
      'desc': 'All bus drivers are requested to complete the mandatory 10-point wiper, brake, and emergency beacon checklist.',
      'gradient': [const Color(0xFF78350F), const Color(0xFFD97706)],
      'icon': Icons.security_rounded,
    },
    {
      'id': 'ANN-03',
      'tag': 'ROUTE NOTICE',
      'tagColor': const Color(0xFF3B82F6),
      'date': 'Updated Today',
      'title': 'Route RT01 & RT04 Morning Schedule Tuning',
      'desc': 'Morning pickup timings have been calibrated by +5 mins at Palm Grove and Highway Junction for smoother transit.',
      'gradient': [const Color(0xFF1E3A8A), const Color(0xFF2563EB)],
      'icon': Icons.alt_route_rounded,
    },
    {
      'id': 'ANN-04',
      'tag': 'ACADEMICS',
      'tagColor': const Color(0xFF10B981),
      'date': 'Oct 20, 2026',
      'title': 'Term 1 Examination Timetable Released',
      'desc': 'Examination timetable for Grades 6 through 12 is published. Download digital syllabus and hall tickets.',
      'gradient': [const Color(0xFF064E3B), const Color(0xFF059669)],
      'icon': Icons.assignment_turned_in_rounded,
    },
    {
      'id': 'ANN-05',
      'tag': 'PARENT CONNECT',
      'tagColor': const Color(0xFF8B5CF6),
      'date': 'Next Saturday',
      'title': 'Parent-Teacher Interaction Session',
      'desc': 'Schedule one-on-one progress discussions with class teachers and academic mentors through the student portal.',
      'gradient': [const Color(0xFF4C1D95), const Color(0xFF7C3AED)],
      'icon': Icons.groups_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tripShift = DateTime.now().hour < 12 ? 'morning' : 'evening';
    _posterPageController = PageController(viewportFraction: 0.92);

    _posterAutoScrollTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_posterPageController.hasClients) {
        final nextIndex = (_currentPosterIndex + 1) % _announcements.length;
        _posterPageController.animateToPage(
          nextIndex,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOut,
        );
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final trip = Provider.of<TripProvider>(context, listen: false);
      final routeId = auth.assignedRoute?['route_id'] ?? '';
      final token = auth.token ?? '';
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
    _posterAutoScrollTimer?.cancel();
    _posterPageController.dispose();
    _mainScrollController.dispose();
    super.dispose();
  }

  void _showAnnouncementModal(BuildContext context, Map<String, dynamic> item) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;
    final borderColor = isDark ? AppConstants.borderDark : AppConstants.borderLight;

    showModalBottomSheet(
      context: context,
      backgroundColor: surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: (item['tagColor'] as Color).withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: (item['tagColor'] as Color).withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    item['tag'],
                    style: TextStyle(
                      color: item['tagColor'],
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const Spacer(),
                Icon(Icons.calendar_today_rounded, size: 14, color: subtextColor),
                const SizedBox(width: 5),
                Text(
                  item['date'],
                  style: TextStyle(color: subtextColor, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              item['title'],
              style: TextStyle(
                color: textColor,
                fontSize: 19,
                fontWeight: FontWeight.w800,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                children: [
                  Icon(item['icon'] as IconData, color: item['tagColor'], size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item['desc'],
                      style: TextStyle(
                        color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                        fontSize: 13.5,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Official notice issued by EDEX Campus Administration & Directorate of Student Transit.',
              style: TextStyle(color: subtextColor, fontSize: 11.5, fontStyle: FontStyle.italic),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primaryLight,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close Announcement', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showAllAnnouncementsSheet(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;
    final borderColor = isDark ? AppConstants.borderDark : AppConstants.borderLight;

    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, scrollCtrl) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.campaign_rounded, color: AppConstants.primary, size: 24),
                  const SizedBox(width: 10),
                  Text(
                    'Campus Notice Board',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppConstants.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${_announcements.length} Notices',
                      style: const TextStyle(
                        color: AppConstants.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: ListView.separated(
                  controller: scrollCtrl,
                  itemCount: _announcements.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (ctx, i) {
                    final item = _announcements[i];
                    return InkWell(
                      onTap: () {
                        Navigator.pop(ctx);
                        _showAnnouncementModal(context, item);
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: borderColor),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: (item['tagColor'] as Color).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(item['icon'] as IconData, color: item['tagColor'], size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        item['tag'],
                                        style: TextStyle(
                                          color: item['tagColor'],
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const Spacer(),
                                      Text(
                                        item['date'],
                                        style: TextStyle(color: subtextColor, fontSize: 10.5),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item['title'],
                                    style: TextStyle(
                                      color: textColor,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    item['desc'],
                                    style: TextStyle(color: subtextColor, fontSize: 11.5),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.chevron_right_rounded, color: subtextColor, size: 20),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            const Icon(Icons.logout_rounded, color: Colors.redAccent, size: 22),
            const SizedBox(width: 10),
            Text(
              'Sign Out',
              style: TextStyle(
                color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to end your current session and sign out?',
          style: TextStyle(
            color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final auth = Provider.of<AuthProvider>(context, listen: false);
              await auth.logout();
              if (context.mounted) {
                Navigator.pop(ctx);
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
            child: const Text('Sign Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showRoleSwitcher(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.swap_horiz_rounded, color: AppConstants.primary, size: 24),
                const SizedBox(width: 8),
                Text(
                  'Switch Demo Role',
                  style: TextStyle(
                    color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Select role to test adaptive home screen modules and driver one-tap dispatch.',
              style: TextStyle(
                color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 18),
            ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              tileColor: auth.isDriver
                  ? AppConstants.primary.withValues(alpha: 0.15)
                  : (isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight),
              leading: const CircleAvatar(
                backgroundColor: AppConstants.accentAmber,
                child: Icon(Icons.directions_bus_rounded, color: Colors.black),
              ),
              title: Text(
                'Bus Driver Mode',
                style: TextStyle(
                  color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                'Transport module highlighted • Start trip on live map console',
                style: TextStyle(
                  color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
                  fontSize: 12,
                ),
              ),
              trailing: auth.isDriver ? const Icon(Icons.check_circle_rounded, color: AppConstants.accentAmber) : null,
              onTap: () async {
                await auth.loginAsDemoDriver();
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
            const SizedBox(height: 10),
            ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              tileColor: auth.isParent
                  ? AppConstants.primary.withValues(alpha: 0.15)
                  : (isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight),
              leading: const CircleAvatar(
                backgroundColor: Colors.cyan,
                child: Icon(Icons.family_restroom_rounded, color: Colors.black),
              ),
              title: Text(
                'Parent Mode',
                style: TextStyle(
                  color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                'Live bus tracking, attendance, fees & notices',
                style: TextStyle(
                  color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
                  fontSize: 12,
                ),
              ),
              trailing: auth.isParent ? const Icon(Icons.check_circle_rounded, color: Colors.cyan) : null,
              onTap: () async {
                await auth.loginAsDemoParent();
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
            const SizedBox(height: 10),
            ListTile(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              tileColor: auth.isSchoolAdmin
                  ? AppConstants.primary.withValues(alpha: 0.15)
                  : (isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight),
              leading: const CircleAvatar(
                backgroundColor: AppConstants.primary,
                child: Icon(Icons.admin_panel_settings_rounded, color: Colors.white),
              ),
              title: Text(
                'Administrator Mode',
                style: TextStyle(
                  color: isDark ? Colors.white : AppConstants.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                'Full campus fleet control, reports and safety consoles',
                style: TextStyle(
                  color: isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight,
                  fontSize: 12,
                ),
              ),
              trailing: auth.isSchoolAdmin ? const Icon(Icons.check_circle_rounded, color: AppConstants.primary) : null,
              onTap: () async {
                await auth.loginAsDemoAdmin();
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showServerSettings(BuildContext context) {
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
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(
                      label: const Text('localhost:5000', style: TextStyle(fontSize: 11)),
                      onPressed: () => setDialogState(() => urlCtrl.text = 'http://localhost:5000/api'),
                    ),
                    ActionChip(
                      label: const Text('10.0.2.2 (Emulator)', style: TextStyle(fontSize: 11)),
                      onPressed: () => setDialogState(() => urlCtrl.text = 'http://10.0.2.2:5000/api'),
                    ),
                    ActionChip(
                      label: const Text('Local IP: 192.168.1.161', style: TextStyle(fontSize: 11)),
                      onPressed: () => setDialogState(() => urlCtrl.text = 'http://192.168.1.161:5000/api'),
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
                auth.apiService.setBaseUrl(urlCtrl.text.trim());
                Navigator.pop(ctx);
              },
              child: const Text('Save', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DRAWER MENU: USER NAME & PROFILE AT THE TOP OF THE DRAWER MENU
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildDrawer(BuildContext context, AuthProvider auth, ThemeProvider themeProvider, bool isDark) {
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final elevatedColor = isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;
    final borderColor = isDark ? AppConstants.borderDark : AppConstants.borderLight;

    final roleColor = auth.isDriver
        ? AppConstants.accentAmber
        : (auth.isParent ? Colors.cyan : AppConstants.primaryLight);

    return Drawer(
      backgroundColor: surfaceColor,
      child: SafeArea(
        child: Column(
          children: [
            // Top Profile Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                      : [const Color(0xFFEEF2FF), Colors.white],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border(bottom: BorderSide(color: borderColor)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: auth.isDriver
                                ? [AppConstants.accentAmber, const Color(0xFFD97706)]
                                : [AppConstants.primary, AppConstants.primaryDark],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: roleColor.withValues(alpha: 0.35),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Icon(
                            auth.isDriver
                                ? Icons.directions_bus_rounded
                                : (auth.isParent ? Icons.family_restroom_rounded : Icons.admin_panel_settings_rounded),
                            color: Colors.white,
                            size: 30,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.displayName,
                              style: TextStyle(
                                color: textColor,
                                fontSize: 17,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: roleColor.withValues(alpha: 0.16),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: roleColor.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                auth.primaryRoleTitle.toUpperCase(),
                                style: TextStyle(
                                  color: roleColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.black.withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.school_rounded, size: 14, color: subtextColor),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                auth.schoolName,
                                style: TextStyle(
                                  color: textColor,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        if (auth.isDriver) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.directions_bus_filled_rounded, size: 13, color: AppConstants.accentAmber),
                              const SizedBox(width: 6),
                              Text(
                                'Bus: KL53H9219 • Route RT01',
                                style: TextStyle(
                                  color: isDark ? AppConstants.accentAmber : AppConstants.accentAmberLight,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Navigation Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                children: [
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    leading: const Icon(Icons.dashboard_rounded, color: AppConstants.primaryLight),
                    title: Text('Home Dashboard', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14)),
                    onTap: () => Navigator.pop(context),
                  ),
                  if (auth.isDriver) ...[
                    Consumer<TripProvider>(
                      builder: (ctx, tripProv, _) => ListTile(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        leading: Icon(
                          Icons.navigation_rounded,
                          color: tripProv.isTripActive ? Colors.amber : AppConstants.accentAmber,
                        ),
                        title: Text(
                          tripProv.isTripActive ? 'Live Trip Console (Active)' : 'Start Trip Console',
                          style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        subtitle: tripProv.isTripActive
                            ? const Text('Bus moving in real time', style: TextStyle(color: Colors.amber, fontSize: 11))
                            : null,
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DriverTripScreen(
                                autoStartTrip: false,
                                tripShift: _tripShift,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    ListTile(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      leading: const Icon(Icons.format_list_bulleted_rounded, color: AppConstants.primaryLight),
                      title: Text('Route Stops & Students', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14)),
                      onTap: () {
                        Navigator.pop(context);
                        showRouteDetailsModal(context, initialShift: _tripShift);
                      },
                    ),
                  ],
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    leading: const Icon(Icons.campaign_rounded, color: Colors.indigoAccent),
                    title: Text('Campus Announcements', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14)),
                    onTap: () {
                      Navigator.pop(context);
                      _showAllAnnouncementsSheet(context);
                    },
                  ),
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    leading: const Icon(Icons.swap_horiz_rounded, color: Colors.cyan),
                    title: Text('Switch Demo Role', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14)),
                    onTap: () {
                      Navigator.pop(context);
                      _showRoleSwitcher(context);
                    },
                  ),
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    leading: Icon(Icons.settings_ethernet_rounded, color: subtextColor),
                    title: Text('Server Configuration', style: TextStyle(color: textColor, fontWeight: FontWeight.w600, fontSize: 14)),
                    onTap: () {
                      Navigator.pop(context);
                      _showServerSettings(context);
                    },
                  ),
                  const SizedBox(height: 10),
                  Divider(color: borderColor),
                  const SizedBox(height: 10),

                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: elevatedColor,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                              color: isDark ? AppConstants.accentAmber : AppConstants.primaryLight,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'APPEARANCE',
                              style: TextStyle(
                                color: subtextColor,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            isDark ? 'Dark Theme' : 'Light Theme',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            isDark ? 'Night-friendly midnight' : 'Crisp day palette',
                            style: TextStyle(color: subtextColor, fontSize: 11),
                          ),
                          activeThumbColor: AppConstants.accentAmber,
                          value: isDark,
                          onChanged: (val) {
                            themeProvider.setDarkMode(val);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Logout Tile
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: borderColor)),
              ),
              child: ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                title: const Text(
                  'Sign Out',
                  style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showLogoutDialog(context);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ULTRA-MODERN TOP APP BAR (NO USER NAME, PRO SQUIRCLE ACTIONS & BRANDING)
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildModernTopBar(BuildContext context, AuthProvider auth, bool isDark, Color surfaceColor, Color borderColor, Color textColor, Color subtextColor) {
    final roleColor = auth.isDriver
        ? AppConstants.accentAmber
        : (auth.isParent ? Colors.cyan : AppConstants.primaryLight);

    final roleLabel = auth.isDriver
        ? 'Driver'
        : (auth.isParent ? 'Parent' : 'Admin');

    final roleIcon = auth.isDriver
        ? Icons.directions_bus_rounded
        : (auth.isParent ? Icons.family_restroom_rounded : Icons.admin_panel_settings_rounded);

    final squircleBg = isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9);
    final squircleBorder = isDark ? Colors.white10 : const Color(0xFFE2E8F0);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: BoxDecoration(
        color: surfaceColor,
        border: Border(bottom: BorderSide(color: borderColor, width: 0.8)),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black54 : Colors.black.withValues(alpha: 0.03),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // 1. Tactile Squircle Drawer Button
          Builder(
            builder: (btnCtx) => InkWell(
              onTap: () => Scaffold.of(btnCtx).openDrawer(),
              borderRadius: BorderRadius.circular(13),
              child: Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: squircleBg,
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(color: squircleBorder),
                ),
                child: Center(
                  child: Icon(Icons.menu_rounded, color: textColor, size: 22),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // 2. High-Tech Brand Icon & Logotype
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(13),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF4F46E5).withValues(alpha: 0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Center(
              child: Icon(Icons.navigation_rounded, color: Colors.white, size: 22),
            ),
          ),
          const SizedBox(width: 12),

          // 3. Brand Identity & Live Hub Tag
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      'SAARTHI',
                      style: TextStyle(
                        color: textColor,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryLight.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: const Text(
                        'EDEX',
                        style: TextStyle(
                          color: AppConstants.primaryLight,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        auth.isDriver ? 'RT01 Live Fleet Console' : 'Connected Campus Hub',
                        style: TextStyle(
                          color: subtextColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 4. Notification Bell in Glass Squircle
          InkWell(
            onTap: () => _showAllAnnouncementsSheet(context),
            borderRadius: BorderRadius.circular(13),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: squircleBg,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: squircleBorder),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(Icons.notifications_none_rounded, color: textColor, size: 21),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF4444),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 5. Active Role Pill Button (Tap to Switch)
          InkWell(
            onTap: () => _showRoleSwitcher(context),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: roleColor.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: roleColor.withValues(alpha: 0.35)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(roleIcon, size: 14, color: roleColor),
                  const SizedBox(width: 5),
                  Text(
                    roleLabel,
                    style: TextStyle(
                      color: roleColor,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(width: 3),
                  Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: roleColor),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STUNNING, CINEMATIC HERO SECTION
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildCampusHeroImage(BuildContext context, bool isDark, Color textColor, Color subtextColor) {
    return Container(
      width: double.infinity,
      height: 220,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black54 : Colors.black.withValues(alpha: 0.12),
            blurRadius: 22,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Background Artwork
            Image.asset(
              'assets/images/campus_hero.jpg',
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (ctx, err, stack) {
                return Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: const Center(
                    child: Icon(Icons.school_rounded, color: Colors.white24, size: 80),
                  ),
                );
              },
            ),

            // Cinematic Gradient Vignette (Light top, rich dark bottom)
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.black.withValues(alpha: 0.18),
                    Colors.black.withValues(alpha: 0.12),
                    Colors.black.withValues(alpha: 0.82),
                  ],
                  stops: const [0.0, 0.45, 1.0],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),

            // Top Status & Date Pill Row
            Positioned(
              top: 14,
              left: 14,
              right: 14,
              child: Row(
                children: [
                  // Frosted Telematics Capsule
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.52),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'LIVE TELEMATICS • RT01',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Shift / Date Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.52),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _tripShift == 'morning' ? Icons.wb_sunny_rounded : Icons.nights_stay_rounded,
                          size: 12,
                          color: _tripShift == 'morning' ? AppConstants.accentAmber : const Color(0xFF818CF8),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          _tripShift == 'morning' ? 'Morning Shift' : 'Evening Shift',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bottom Content Area: Title & Modern Telematics Bar
            Positioned(
              left: 16,
              right: 16,
              bottom: 14,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Welcome to SAARTHI',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    'Safe student transit & real-time campus mobility platform',
                    style: TextStyle(
                      color: Color(0xFFE2E8F0),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),

                  // Integrated Modern Telematics Glass Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildHeroStatItem(Icons.directions_bus_rounded, '12 Fleet Buses'),
                        Container(width: 1, height: 12, color: Colors.white24),
                        _buildHeroStatItem(Icons.verified_outlined, '99.4% On-Time'),
                        Container(width: 1, height: 12, color: Colors.white24),
                        _buildHeroStatItem(Icons.alt_route_rounded, 'OSRM GPS Live'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroStatItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white, size: 13),
        const SizedBox(width: 5),
        Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMMON ANNOUNCEMENT POSTER CAROUSEL
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildAnnouncementCarousel(BuildContext context, bool isDark, Color textColor, Color subtextColor, Color borderColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Refined Carousel Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: AppConstants.primaryLight.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(Icons.campaign_outlined, color: AppConstants.primaryLight, size: 16),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'LATEST CIRCULARS & NOTICES',
                  style: TextStyle(
                    color: subtextColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.9,
                  ),
                ),
              ],
            ),
            GestureDetector(
              onTap: () => _showAllAnnouncementsSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppConstants.primaryLight.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'View All (${_announcements.length})',
                      style: const TextStyle(
                        color: AppConstants.primaryLight,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_rounded, size: 12, color: AppConstants.primaryLight),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Modern Poster Carousel
        SizedBox(
          height: 148,
          child: PageView.builder(
            controller: _posterPageController,
            itemCount: _announcements.length,
            onPageChanged: (idx) {
              setState(() => _currentPosterIndex = idx);
            },
            itemBuilder: (ctx, i) {
              final item = _announcements[i];
              final gradient = item['gradient'] as List<Color>;

              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: GestureDetector(
                  onTap: () => _showAnnouncementModal(context, item),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: LinearGradient(
                        colors: gradient,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: gradient.first.withValues(alpha: 0.32),
                          blurRadius: 12,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          right: -10,
                          bottom: -15,
                          child: Icon(
                            item['icon'] as IconData,
                            size: 110,
                            color: Colors.white.withValues(alpha: 0.12),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(15),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.22),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                                    ),
                                    child: Text(
                                      item['tag'],
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    item['date'],
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['title'],
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14.5,
                                      fontWeight: FontWeight.w900,
                                      height: 1.25,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    item['desc'],
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 11.5,
                                      height: 1.3,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: const [
                                  Text(
                                    'Read Notice',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  SizedBox(width: 4),
                                  Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 13),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 8),

        // Sleek Capsule Pagination Dots
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            _announcements.length,
            (dotIdx) => AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: _currentPosterIndex == dotIdx ? 22 : 6,
              height: 5,
              decoration: BoxDecoration(
                color: _currentPosterIndex == dotIdx
                    ? AppConstants.primaryLight
                    : (isDark ? Colors.white24 : Colors.black12),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUS DRIVER FEATURED TRANSPORT TILE: BENTO CARD STYLE
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildDriverTransportFeaturedTile({
    required BuildContext context,
    required AuthProvider auth,
    required TripProvider trip,
    required bool isDark,
    required Color surfaceColor,
    required Color elevatedColor,
    required Color textColor,
    required Color subtextColor,
    required Color borderColor,
  }) {
    final routeInfo = auth.assignedRoute;
    final routeCode = routeInfo?['route_code'] ?? 'RT01';
    final routeName = routeInfo?['route_name'] ?? 'Green Valley Campus Link';
    final vehicleNumber = routeInfo?['vehicle_number'] ?? 'Bus KL53H9219';

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: trip.isTripActive
              ? Colors.amber.withValues(alpha: 0.7)
              : AppConstants.accentAmber.withValues(alpha: 0.5),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppConstants.accentAmber.withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Tag & Icon Row
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: AppConstants.busYellow.withValues(alpha: 0.22),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppConstants.busYellow.withValues(alpha: 0.5)),
                  ),
                  child: const Icon(
                    Icons.directions_bus_filled_rounded,
                    color: AppConstants.accentAmberLight,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: AppConstants.accentAmber.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Text(
                              'DRIVER CONSOLE',
                              style: TextStyle(
                                color: AppConstants.accentAmberLight,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        vehicleNumber,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
                // Live Status Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: trip.isTripActive
                        ? Colors.amber.withValues(alpha: 0.15)
                        : AppConstants.accentGreen.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: trip.isTripActive
                          ? Colors.amber.withValues(alpha: 0.5)
                          : AppConstants.accentGreen.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.fiber_manual_record_rounded,
                        color: trip.isTripActive ? Colors.amber : AppConstants.accentGreen,
                        size: 8,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        trip.isTripActive ? 'IN TRANSIT' : 'STANDBY',
                        style: TextStyle(
                          color: trip.isTripActive ? Colors.amber : AppConstants.accentGreen,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Route Details & Direction Badge
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: elevatedColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: AppConstants.primaryLight,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          routeCode,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          routeName,
                          style: TextStyle(
                            color: textColor,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: borderColor),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _tripShift == 'morning' ? Icons.login_rounded : Icons.logout_rounded,
                          size: 15,
                          color: _tripShift == 'morning' ? AppConstants.accentEmeraldLight : AppConstants.primaryLight,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _tripShift == 'morning'
                                ? 'Morning Route: Home Stops ➔ Campus'
                                : 'Evening Route: Campus ➔ Home Stops',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Shift Selector Toggle
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _tripShift = 'morning'),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _tripShift == 'morning'
                            ? (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7))
                            : elevatedColor,
                        borderRadius: BorderRadius.circular(12),
                        border: _tripShift == 'morning'
                            ? Border.all(color: AppConstants.accentAmberLight.withValues(alpha: 0.6))
                            : Border.all(color: borderColor),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.wb_sunny_rounded,
                            size: 15,
                            color: _tripShift == 'morning' ? AppConstants.accentAmberLight : subtextColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Morning Pickup',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: _tripShift == 'morning'
                                  ? (isDark ? Colors.white : const Color(0xFF92400E))
                                  : subtextColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _tripShift = 'evening'),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: _tripShift == 'evening'
                            ? (isDark ? const Color(0xFF312E81) : const Color(0xFFEEF2FF))
                            : elevatedColor,
                        borderRadius: BorderRadius.circular(12),
                        border: _tripShift == 'evening'
                            ? Border.all(color: AppConstants.primaryLight.withValues(alpha: 0.6))
                            : Border.all(color: borderColor),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.nights_stay_rounded,
                            size: 15,
                            color: _tripShift == 'evening' ? AppConstants.primaryLight : subtextColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Evening Drop',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: _tripShift == 'evening'
                                  ? (isDark ? Colors.white : AppConstants.primaryHoverLight)
                                  : subtextColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Primary Map Navigation Button
            if (trip.isTripActive) ...[
              LiveMovingBusCard(
                trip: trip,
                onOpenMap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DriverTripScreen(
                        autoStartTrip: false,
                        tripShift: _tripShift,
                      ),
                    ),
                  );
                },
              ),
            ] else ...[
              Container(
                width: double.infinity,
                height: 52,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [AppConstants.primaryLight, Color(0xFF4338CA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppConstants.primaryLight.withValues(alpha: 0.35),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DriverTripScreen(
                          autoStartTrip: false,
                          tripShift: _tripShift,
                        ),
                      ),
                    );
                  },
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.map_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        _tripShift == 'morning' ? 'OPEN TRIP MAP (MORNING)' : 'OPEN TRIP MAP (EVENING)',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.4,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_forward_rounded, color: Colors.white70, size: 16),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Driver starts and ends the trip exclusively on the live map screen',
                  style: TextStyle(color: subtextColor, fontSize: 11, fontStyle: FontStyle.italic),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── Parent Live Bus Transport Featured Tile ───────────────────────────────
  Widget _buildParentTransportFeaturedTile({
    required BuildContext context,
    required AuthProvider auth,
    required TripProvider trip,
    required bool isDark,
    required Color surfaceColor,
    required Color elevatedColor,
    required Color textColor,
    required Color subtextColor,
    required Color borderColor,
  }) {
    final routeInfo = auth.assignedRoute;
    final studentName = routeInfo?['student_name'] ?? 'Your Child';
    final className = routeInfo?['class_name'] ?? '';
    final routeCode = routeInfo?['route_code'] ?? 'RT01';
    final routeName = routeInfo?['route_name'] ?? 'Assigned School Bus';
    final vehicleNumber = routeInfo?['vehicle_number'] ?? 'School Bus';
    final stopName = routeInfo?['stop_name'] ?? '';
    final morningTime = routeInfo?['morning_time'] ?? '';
    final isLive = trip.isTripActive || trip.isLiveBusOnline;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isLive
              ? Colors.cyan.withValues(alpha: 0.8)
              : AppConstants.accentAmber.withValues(alpha: 0.5),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (isLive ? Colors.cyan : AppConstants.accentAmber).withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Tag & Icon Row
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.cyan.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.cyan.withValues(alpha: 0.4)),
                  ),
                  child: const Icon(
                    Icons.directions_bus_filled_rounded,
                    color: Colors.cyan,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: Colors.cyan.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Text(
                              'STUDENT BUS LIVE',
                              style: TextStyle(
                                color: Colors.cyan,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$studentName${className.isNotEmpty ? " • $className" : ""}',
                        style: TextStyle(
                          color: textColor,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w900,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Live Status Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isLive
                        ? AppConstants.accentGreen.withValues(alpha: 0.18)
                        : Colors.grey.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isLive
                          ? AppConstants.accentGreen.withValues(alpha: 0.6)
                          : Colors.grey.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.fiber_manual_record_rounded,
                        size: 9,
                        color: isLive ? AppConstants.accentGreen : Colors.grey,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        isLive ? 'LIVE' : 'STANDBY',
                        style: TextStyle(
                          color: isLive ? AppConstants.accentGreen : subtextColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Route & Stop details
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: elevatedColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderColor),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.alt_route_rounded, size: 15, color: Colors.cyan),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '$routeCode • $routeName',
                          style: TextStyle(
                            color: textColor,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppConstants.accentAmber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          vehicleNumber,
                          style: const TextStyle(
                            color: AppConstants.accentAmberLight,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (stopName.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on_rounded, size: 15, color: Colors.amber),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Child\'s Stop: $stopName ${morningTime.isNotEmpty ? "($morningTime)" : ""}',
                            style: TextStyle(
                              color: subtextColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Live Moving Bus Card or Live Map Button
            if (isLive) ...[
              LiveMovingBusCard(
                trip: trip,
                onOpenMap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DriverTripScreen(
                        autoStartTrip: false,
                        tripShift: _tripShift,
                      ),
                    ),
                  );
                },
              ),
            ] else ...[
              Container(
                width: double.infinity,
                height: 48,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DriverTripScreen(
                          autoStartTrip: false,
                          tripShift: _tripShift,
                        ),
                      ),
                    );
                  },
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.map_rounded, color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'OPEN LIVE BUS MAP',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.4,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_forward_rounded, color: Colors.white70, size: 16),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODERN MODULE TILES (3-IN-A-ROW COMPACT BENTO SYSTEM)
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildModernModuleTile({
    required BuildContext context,
    required bool isDark,
    required IconData icon,
    required Color accentColor,
    required String title,
    required String subtitle,
    required String badge,
    required VoidCallback onTap,
    bool isHighlighted = false,
  }) {
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        splashColor: accentColor.withValues(alpha: 0.12),
        highlightColor: accentColor.withValues(alpha: 0.06),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isHighlighted
                  ? accentColor.withValues(alpha: isDark ? 0.7 : 0.6)
                  : (isDark
                      ? Colors.white.withValues(alpha: 0.09)
                      : Colors.black.withValues(alpha: 0.06)),
              width: isHighlighted ? 1.5 : 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: isHighlighted
                    ? accentColor.withValues(alpha: isDark ? 0.22 : 0.12)
                    : (isDark
                        ? Colors.black.withValues(alpha: 0.25)
                        : accentColor.withValues(alpha: 0.05)),
                blurRadius: isHighlighted ? 10 : 7,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Top Row: Squircle Glowing Icon + Micro Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          accentColor.withValues(alpha: isDark ? 0.25 : 0.16),
                          accentColor.withValues(alpha: isDark ? 0.12 : 0.06),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: accentColor.withValues(alpha: isDark ? 0.38 : 0.22),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: accentColor.withValues(alpha: isDark ? 0.25 : 0.15),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(icon, color: accentColor, size: 20),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5.5, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: isDark ? 0.20 : 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: accentColor.withValues(alpha: isDark ? 0.35 : 0.20),
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Bottom Text: Title & Subtitle
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.2,
                      height: 1.15,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2.5),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: subtextColor,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w500,
                      height: 1.15,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showModuleModal(BuildContext context, String title, String description, IconData icon, Color color) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;

    return showModalBottomSheet(
      context: context,
      backgroundColor: surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: color, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(color: textColor, fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'EDEX Campus Enterprise Module',
                        style: TextStyle(color: AppConstants.primaryLight, fontSize: 11.5, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              description,
              style: TextStyle(color: subtextColor, fontSize: 13.5, height: 1.45),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: color,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      backgroundColor: isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight,
                      behavior: SnackBarBehavior.floating,
                      content: Text('$title is synced with cloud campus server.', style: TextStyle(color: textColor)),
                    ),
                  );
                },
                child: const Text('Open Module Data', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showPreTripInspectionDialog(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;

    final items = [
      'Brake pedals & emergency air pressure: Verified',
      'Windshield wipers & washer fluid: OK',
      'Tire tread & pneumatic pressure: 34 PSI',
      'First aid kit & fire extinguisher: Inspected',
      'CCTV cameras & GPS Telemetry beacon: Active',
    ];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(Icons.verified_rounded, color: AppConstants.accentGreen, size: 22),
            SizedBox(width: 8),
            Text('Pre-Trip Inspection', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: items.map((e) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: AppConstants.accentGreen, size: 16),
                const SizedBox(width: 8),
                Expanded(child: Text(e, style: TextStyle(color: textColor, fontSize: 12.5))),
              ],
            ),
          )).toList(),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryLight,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Checklist Approved', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showEmergencySosDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF7F1D1D),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 26),
            SizedBox(width: 8),
            Text('EMERGENCY SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Emergency telematics beacon broadcast to campus security, transport head, and local police dispatch.\n\nHelpline: +91 94470 12345\nCampus Control Room: +91 484 220011',
          style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel Alert', style: TextStyle(color: Colors.white)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Emergency SOS broadcast triggered to campus control room!'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            child: const Text('Call Dispatch', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ULTRA-MODERN FLOATING BOTTOM NAVIGATION BAR
  // ══════════════════════════════════════════════════════════════════════════
  Widget _buildModernBottomNavigationBar({
    required BuildContext context,
    required AuthProvider auth,
    required bool isDark,
    required Color surfaceColor,
    required Color borderColor,
    required Color textColor,
    required Color subtextColor,
  }) {
    final isDriver = auth.isDriver;

    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.10)
                : Colors.black.withValues(alpha: 0.08),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: isDark
                  ? Colors.black.withValues(alpha: 0.45)
                  : Colors.black.withValues(alpha: 0.08),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // 0: Home Tab
            _buildBottomNavItem(
              index: 0,
              icon: Icons.home_rounded,
              label: 'Home',
              isDark: isDark,
              textColor: textColor,
              subtextColor: subtextColor,
              onTap: () {
                setState(() => _currentBottomNavIndex = 0);
                if (_mainScrollController.hasClients) {
                  _mainScrollController.animateTo(
                    0,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                  );
                }
              },
            ),

            // 1: Live Transit / Map Tab
            _buildBottomNavItem(
              index: 1,
              icon: Icons.directions_bus_rounded,
              label: isDriver ? 'Trip Map' : 'Live Bus',
              hasLiveDot: true,
              isDark: isDark,
              textColor: textColor,
              subtextColor: subtextColor,
              onTap: () {
                setState(() => _currentBottomNavIndex = 1);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const DriverTripScreen(autoStartTrip: false),
                  ),
                ).then((_) {
                  if (mounted) setState(() => _currentBottomNavIndex = 0);
                });
              },
            ),

            // 2: Circulars & Notices Tab
            _buildBottomNavItem(
              index: 2,
              icon: Icons.campaign_rounded,
              label: 'Notices',
              badgeText: '${_announcements.length}',
              isDark: isDark,
              textColor: textColor,
              subtextColor: subtextColor,
              onTap: () {
                setState(() => _currentBottomNavIndex = 2);
                _showAllAnnouncementsSheet(context).then((_) {
                  if (mounted) setState(() => _currentBottomNavIndex = 0);
                });
              },
            ),

            // 3: Bus Pass / Driver Manifest Tab
            _buildBottomNavItem(
              index: 3,
              icon: isDriver ? Icons.format_list_bulleted_rounded : Icons.badge_rounded,
              label: isDriver ? 'Manifest' : 'Bus Pass',
              isDark: isDark,
              textColor: textColor,
              subtextColor: subtextColor,
              onTap: () {
                setState(() => _currentBottomNavIndex = 3);
                if (isDriver) {
                  showRouteDetailsModal(context, initialShift: _tripShift);
                  if (mounted) setState(() => _currentBottomNavIndex = 0);
                } else {
                  _showModuleModal(
                    context,
                    'Digital Student Bus Pass',
                    'Smart NFC pass valid for Route RT01 until May 2027. RFID Tap Card UID: 04:A2:89:BC:71.\nCard Status: Active & Synced.',
                    Icons.badge_rounded,
                    Colors.pinkAccent,
                  ).then((_) {
                    if (mounted) setState(() => _currentBottomNavIndex = 0);
                  });
                }
              },
            ),

            // 4: Profile / Drawer Menu Tab
            _buildBottomNavItem(
              index: 4,
              icon: Icons.account_circle_rounded,
              label: 'Menu',
              isDark: isDark,
              textColor: textColor,
              subtextColor: subtextColor,
              onTap: () {
                setState(() => _currentBottomNavIndex = 4);
                _scaffoldKey.currentState?.openDrawer();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNavItem({
    required int index,
    required IconData icon,
    required String label,
    required bool isDark,
    required Color textColor,
    required Color subtextColor,
    required VoidCallback onTap,
    bool hasLiveDot = false,
    String? badgeText,
  }) {
    final isSelected = _currentBottomNavIndex == index;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: AppConstants.primaryLight.withValues(alpha: 0.15),
        highlightColor: AppConstants.primaryLight.withValues(alpha: 0.08),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: EdgeInsets.symmetric(
            horizontal: isSelected ? 12 : 8,
            vertical: 6,
          ),
          decoration: BoxDecoration(
            color: isSelected
                ? AppConstants.primaryLight.withValues(alpha: isDark ? 0.22 : 0.12)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            border: isSelected
                ? Border.all(
                    color: AppConstants.primaryLight.withValues(alpha: isDark ? 0.45 : 0.25),
                    width: 1,
                  )
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  Icon(
                    icon,
                    size: 21,
                    color: isSelected ? AppConstants.primaryLight : subtextColor,
                  ),
                  if (hasLiveDot && !isSelected)
                    Positioned(
                      right: -3,
                      top: -3,
                      child: Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF10B981).withValues(alpha: 0.6),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (badgeText != null && !isSelected)
                    Positioned(
                      right: -7,
                      top: -5,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          badgeText,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              if (isSelected) ...[
                const SizedBox(width: 6),
                Text(
                  label,
                  style: const TextStyle(
                    color: AppConstants.primaryLight,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN BUILD METHOD
  // ══════════════════════════════════════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final trip = Provider.of<TripProvider>(context);
    final isDark = themeProvider.isDarkMode;

    final isDriver = auth.isDriver;

    // Palette tokens
    final bgColor = isDark ? AppConstants.bgDark : AppConstants.bgLight;
    final surfaceColor = isDark ? AppConstants.surfaceDark : AppConstants.surfaceLight;
    final elevatedColor = isDark ? AppConstants.surfaceElevated : AppConstants.surfaceElevatedLight;
    final textColor = isDark ? AppConstants.textPrimary : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;
    final borderColor = isDark ? AppConstants.borderDark : AppConstants.borderLight;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: bgColor,
      drawer: _buildDrawer(context, auth, themeProvider, isDark),
      onDrawerChanged: (isOpen) {
        if (!isOpen && mounted) {
          setState(() => _currentBottomNavIndex = 0);
        }
      },
      bottomNavigationBar: _buildModernBottomNavigationBar(
        context: context,
        auth: auth,
        isDark: isDark,
        surfaceColor: surfaceColor,
        borderColor: borderColor,
        textColor: textColor,
        subtextColor: subtextColor,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 1. ULTRA-MODERN TOP APP BAR
            _buildModernTopBar(context, auth, isDark, surfaceColor, borderColor, textColor, subtextColor),

            // 2. MAIN BODY CONTENT (SCROLLABLE)
            Expanded(
              child: SingleChildScrollView(
                controller: _mainScrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. HERO IMAGE IN HOME SCREEN
                    _buildCampusHeroImage(context, isDark, textColor, subtextColor),
                    const SizedBox(height: 20),

                    // 2. COMMON ANNOUNCEMENT AREA POSTER CAROUSEL
                    _buildAnnouncementCarousel(context, isDark, textColor, subtextColor, borderColor),
                    const SizedBox(height: 24),

                    // 3. AVAILABLE MODULES SECTION TITLE
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: AppConstants.primaryLight.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Center(
                                child: Icon(Icons.grid_view_rounded, color: AppConstants.primaryLight, size: 16),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'EXPLORE SERVICES',
                              style: TextStyle(
                                color: subtextColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.9,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: elevatedColor,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: borderColor),
                          ),
                          child: Text(
                            isDriver ? 'Driver Console Active' : '9 Services Active',
                            style: TextStyle(
                              color: isDriver ? AppConstants.accentAmber : AppConstants.primaryLight,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // ══════════════════════════════════════════════════════════
                    // 4. IN CASE OF BUS DRIVER: TRANSPORT MODULE READY TO TAP
                    // ══════════════════════════════════════════════════════════
                    if (isDriver) ...[
                      _buildDriverTransportFeaturedTile(
                        context: context,
                        auth: auth,
                        trip: trip,
                        isDark: isDark,
                        surfaceColor: surfaceColor,
                        elevatedColor: elevatedColor,
                        textColor: textColor,
                        subtextColor: subtextColor,
                        borderColor: borderColor,
                      ),
                      const SizedBox(height: 16),

                      // Driver Companion Module Tiles Grid (3-in-a-row)
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 3,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: 0.95,
                        children: [
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.format_list_bulleted_rounded,
                            accentColor: AppConstants.primaryLight,
                            title: 'Route Manifest',
                            subtitle: 'Stops & students',
                            badge: 'STOPS',
                            onTap: () => showRouteDetailsModal(context, initialShift: _tripShift),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.checklist_rounded,
                            accentColor: AppConstants.accentGreen,
                            title: 'Pre-Trip Check',
                            subtitle: 'Safety status',
                            badge: 'READY',
                            onTap: () => _showPreTripInspectionDialog(context),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.how_to_reg_rounded,
                            accentColor: Colors.teal,
                            title: 'Student Roster',
                            subtitle: 'Tap-in check-in',
                            badge: 'ROSTER',
                            onTap: () => _showModuleModal(
                              context,
                              'Student Roster & NFC Tap-in',
                              'Morning Shift: 42 Students Assigned, 38 Boarded, 4 Absent notified by parents via Edex app.',
                              Icons.how_to_reg_rounded,
                              Colors.teal,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.warning_amber_rounded,
                            accentColor: Colors.redAccent,
                            title: 'Emergency SOS',
                            subtitle: 'Security alert',
                            badge: 'SOS',
                            isHighlighted: true,
                            onTap: () => _showEmergencySosDialog(context),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.local_gas_station_rounded,
                            accentColor: AppConstants.accentAmber,
                            title: 'Fuel & Telemetry',
                            subtitle: '82% • 48k km',
                            badge: 'DIAG',
                            onTap: () => _showModuleModal(
                              context,
                              'Vehicle Telemetry & Fuel',
                              'Bus KL53H9219: Odometer 48,210 km, Fuel Level 82%, Battery Health 98%, GPS Signal 4/4 bars.',
                              Icons.local_gas_station_rounded,
                              AppConstants.accentAmber,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.headset_mic_rounded,
                            accentColor: Colors.blueAccent,
                            title: 'Control Room',
                            subtitle: 'Dispatch line',
                            badge: 'HOTLINE',
                            onTap: () => _showModuleModal(
                              context,
                              'Transport Control Room',
                              'Central Edex Dispatch: +91 94000 99999. Incident Command & Real-time Route Operations active.',
                              Icons.headset_mic_rounded,
                              Colors.blueAccent,
                            ),
                          ),
                        ],
                      ),
                    ]

                    // ══════════════════════════════════════════════════════════
                    // 5. PARENT / ADMIN / GENERAL USER MODULE TILES GRID (3x3)
                    // ══════════════════════════════════════════════════════════
                    else ...[
                      if (auth.isParent && auth.hasChildOnBus) ...[
                        _buildParentTransportFeaturedTile(
                          context: context,
                          auth: auth,
                          trip: trip,
                          isDark: isDark,
                          surfaceColor: surfaceColor,
                          elevatedColor: elevatedColor,
                          textColor: textColor,
                          subtextColor: subtextColor,
                          borderColor: borderColor,
                        ),
                        const SizedBox(height: 16),
                      ],
                      GridView.count(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 3,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: 0.95,
                        children: [
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.directions_bus_rounded,
                            accentColor: AppConstants.accentAmber,
                            title: 'Bus Tracking',
                            subtitle: 'Live GPS & ETA',
                            badge: 'LIVE',
                            isHighlighted: true,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const DriverTripScreen(autoStartTrip: false),
                                ),
                              );
                            },
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.how_to_reg_rounded,
                            accentColor: Colors.cyan,
                            title: 'Attendance',
                            subtitle: 'Daily check-ins',
                            badge: '98%',
                            onTap: () => _showModuleModal(
                              context,
                              'Student Attendance',
                              'Current academic attendance rate is 98.2%. Zero unauthorized leaves registered this semester.',
                              Icons.how_to_reg_rounded,
                              Colors.cyan,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.campaign_rounded,
                            accentColor: AppConstants.primaryLight,
                            title: 'Circulars',
                            subtitle: 'School notices',
                            badge: '5 NEW',
                            onTap: () => _showAllAnnouncementsSheet(context),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.receipt_long_rounded,
                            accentColor: AppConstants.accentGreen,
                            title: 'Fee Payments',
                            subtitle: 'Receipts & dues',
                            badge: 'PAID',
                            onTap: () => _showModuleModal(
                              context,
                              'Fee Payments & Accounts',
                              'Term 2 Tuition and Transport fees are fully settled. Receipt #EDX-REC-88402 generated.',
                              Icons.receipt_long_rounded,
                              AppConstants.accentGreen,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.calendar_month_rounded,
                            accentColor: Colors.indigoAccent,
                            title: 'Timetable',
                            subtitle: 'Class schedule',
                            badge: 'UPDATE',
                            onTap: () => _showModuleModal(
                              context,
                              'Class Timetable',
                              'Today schedule: Physics (9:00), Mathematics (10:15), Computer Science Lab (11:30), Sports (14:00).',
                              Icons.calendar_month_rounded,
                              Colors.indigoAccent,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.grade_rounded,
                            accentColor: Colors.deepPurpleAccent,
                            title: 'Exams & Marks',
                            subtitle: 'Report cards',
                            badge: 'TERM 1',
                            onTap: () => _showModuleModal(
                              context,
                              'Exams & Academic Marks',
                              'Term 1 progress report cards available for download. Overall aggregate Grade: A+ (94.6%).',
                              Icons.grade_rounded,
                              Colors.deepPurpleAccent,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.badge_rounded,
                            accentColor: Colors.pinkAccent,
                            title: 'Bus Pass',
                            subtitle: 'RFID & NFC tap',
                            badge: 'RFID',
                            onTap: () => _showModuleModal(
                              context,
                              'Digital Student Bus Pass',
                              'Smart NFC pass valid for Route RT01 until May 2027. RFID Tap Card UID: 04:A2:89:BC:71.',
                              Icons.badge_rounded,
                              Colors.pinkAccent,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.local_hospital_rounded,
                            accentColor: Colors.teal,
                            title: 'Campus Clinic',
                            subtitle: 'Medical wing',
                            badge: 'CLINIC',
                            onTap: () => _showModuleModal(
                              context,
                              'Campus Clinic & Health Wing',
                              'Campus Medical Centre Room 102. Dr. Ramesh (MD) available on duty. Emergency nurse line active.',
                              Icons.local_hospital_rounded,
                              Colors.teal,
                            ),
                          ),
                          _buildModernModuleTile(
                            context: context,
                            isDark: isDark,
                            icon: Icons.support_agent_rounded,
                            accentColor: Colors.orangeAccent,
                            title: 'Help & Support',
                            subtitle: '24x7 Edex care',
                            badge: '24x7',
                            onTap: () => _showModuleModal(
                              context,
                              'Campus Helpdesk & Care',
                              'Direct 24x7 Edex Helpline: +91 94000 12345. Transport supervisor on-duty. Instant query assistance.',
                              Icons.support_agent_rounded,
                              Colors.orangeAccent,
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
