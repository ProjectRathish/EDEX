import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/auth_provider.dart';
import '../core/trip_provider.dart';

/// Shows a comprehensive, interactive Route Details & Stop Manifest modal sheet.
/// Orders all stops by Morning (Pickup to School) or Evening (School to Drops),
/// displaying the exact sequence and the number of students assigned to each stop.
void showRouteDetailsModal(BuildContext context, {String? initialShift}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => RouteDetailsModal(initialShift: initialShift),
  );
}

class RouteDetailsModal extends StatefulWidget {
  final String? initialShift;

  const RouteDetailsModal({super.key, this.initialShift});

  @override
  State<RouteDetailsModal> createState() => _RouteDetailsModalState();
}

class _RouteDetailsModalState extends State<RouteDetailsModal> {
  late String _selectedShift;
  String _searchQuery = '';
  List<Map<String, dynamic>> _students = [];
  final Set<String> _expandedStops = {};

  @override
  void initState() {
    super.initState();
    final trip = Provider.of<TripProvider>(context, listen: false);
    _selectedShift = widget.initialShift ?? trip.currentTripShift;
    _fetchStudents();
  }

  Future<void> _fetchStudents() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final routeId = auth.assignedRoute?['route_id'] ?? '';
    final token = auth.token ?? '';
    if (routeId.isEmpty || token.isEmpty) return;

    try {
      final list = await auth.apiService.getRouteStudents(routeId, token);
      if (mounted) {
        setState(() {
          _students = list;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trip = Provider.of<TripProvider>(context);
    final auth = Provider.of<AuthProvider>(context);

    final routeInfo = auth.assignedRoute;
    final routeCode = routeInfo?['route_code'] ?? 'RT01';
    final routeName = routeInfo?['route_name'] ?? 'Pulamanthole, Paloor';
    final vehicleNumber = routeInfo?['vehicle_number'] ?? 'Bus KL53H9219';

    final isMorning = _selectedShift == 'morning';

    // Retrieve all route stops
    // In TripProvider, _stops are ordered according to _currentTripShift.
    // To ensure exact order for the chosen tab here:
    List<Map<String, dynamic>> stops = List.from(trip.stops);
    if (stops.isEmpty) {
      stops = [
        {
          'stop_id': 's1',
          'stop_name': 'Kuruvambalam',
          'sequence_order': 1,
          'student_count': 2,
          'morning_time': '07:45:00',
          'evening_time': '16:55:00',
          'is_school_stop': false,
        },
        {
          'stop_id': 's2',
          'stop_name': 'Paloor',
          'sequence_order': 2,
          'student_count': 3,
          'morning_time': '07:50:00',
          'evening_time': '16:50:00',
          'is_school_stop': false,
        },
        {
          'stop_id': 's3',
          'stop_name': 'Pulamanthole-Bridge',
          'sequence_order': 3,
          'student_count': 4,
          'morning_time': '08:05:00',
          'evening_time': '16:40:00',
          'is_school_stop': false,
        },
        {
          'stop_id': 's4',
          'stop_name': 'ISS School Terminus',
          'sequence_order': 4,
          'student_count': 0,
          'morning_time': '09:00:00',
          'evening_time': '15:45:00',
          'is_school_stop': true,
        },
      ];
    }

    // Sort according to sequence_order ascending first (canonical morning route)
    stops.sort((a, b) {
      final seqA = int.tryParse(a['sequence_order']?.toString() ?? '0') ?? 0;
      final seqB = int.tryParse(b['sequence_order']?.toString() ?? '0') ?? 0;
      return seqA.compareTo(seqB);
    });

    // If Evening trip, reverse the order: School first, down to final home drop
    final orderedStops = isMorning ? stops : stops.reversed.toList();

    // Filter by search query if any
    final filteredStops = _searchQuery.isEmpty
        ? orderedStops
        : orderedStops.where((s) {
            final name = (s['stop_name'] ?? '').toString().toLowerCase();
            return name.contains(_searchQuery.toLowerCase());
          }).toList();

    // Calculate total students
    int totalAssignedStudents = 0;
    for (final s in stops) {
      totalAssignedStudents += int.tryParse(s['student_count']?.toString() ?? '0') ?? 0;
    }
    if (totalAssignedStudents == 0 && _students.isNotEmpty) {
      totalAssignedStudents = _students.length;
    }

    final surfaceColor = isDark ? AppConstants.surfaceDark : Colors.white;
    final elevatedColor = isDark ? AppConstants.surfaceElevated : const Color(0xFFF8FAFC);
    final textColor = isDark ? Colors.white : AppConstants.textPrimaryLight;
    final subtextColor = isDark ? AppConstants.textSecondary : AppConstants.textSecondaryLight;
    final borderColor = isDark ? AppConstants.borderDark : AppConstants.borderLight;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: surfaceColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: const [
              BoxShadow(
                color: Colors.black38,
                blurRadius: 20,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Drag Handle
              const SizedBox(height: 10),
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Header Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppConstants.primaryLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        routeCode,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Route Details & Stop Manifest',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            '$routeName • $vehicleNumber',
                            style: TextStyle(
                              color: subtextColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 22),
                      color: subtextColor,
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // ── Morning / Evening Shift Toggle ────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: elevatedColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    children: [
                      // Morning Tab
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedShift = 'morning'),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: isMorning
                                  ? (isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7))
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(9),
                              border: isMorning
                                  ? Border.all(color: AppConstants.accentAmberLight.withValues(alpha: 0.6))
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.wb_sunny_rounded,
                                  size: 15,
                                  color: isMorning ? AppConstants.accentAmberLight : subtextColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Morning Pickup (To School)',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: isMorning
                                        ? (isDark ? Colors.white : const Color(0xFF92400E))
                                        : subtextColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),

                      // Evening Tab
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedShift = 'evening'),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: !isMorning
                                  ? (isDark ? const Color(0xFF312E81) : const Color(0xFFEEF2FF))
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(9),
                              border: !isMorning
                                  ? Border.all(color: AppConstants.primaryLight.withValues(alpha: 0.6))
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.nights_stay_rounded,
                                  size: 15,
                                  color: !isMorning ? AppConstants.primaryLight : subtextColor,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Evening Drops (From School)',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: !isMorning
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
                ),
              ),

              const SizedBox(height: 12),

              // Summary KPI Strip (Total Stops, Total Students, Order Direction)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Total Stops
                      Row(
                        children: [
                          const Icon(Icons.alt_route_rounded, size: 16, color: AppConstants.primaryLight),
                          const SizedBox(width: 6),
                          Text(
                            '${orderedStops.length} Stops in Order',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      // Total Students
                      Row(
                        children: [
                          const Icon(Icons.people_alt_rounded, size: 16, color: AppConstants.accentEmeraldLight),
                          const SizedBox(width: 6),
                          Text(
                            '$totalAssignedStudents Students Total',
                            style: TextStyle(
                              color: textColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // Search Filter Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: TextStyle(color: textColor, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Search stop name or landmark...',
                    hintStyle: TextStyle(color: subtextColor, fontSize: 12.5),
                    prefixIcon: Icon(Icons.search_rounded, size: 18, color: subtextColor),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    filled: true,
                    fillColor: elevatedColor,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: borderColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: borderColor),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 10),
              Divider(color: borderColor, height: 1),

              // ── Stops Itinerary List ──────────────────────────────────
              Expanded(
                child: filteredStops.isEmpty
                    ? Center(
                        child: Text(
                          'No stops found matching "$_searchQuery"',
                          style: TextStyle(color: subtextColor, fontSize: 13),
                        ),
                      )
                    : ListView.separated(
                        controller: scrollController,
                        padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
                        itemCount: filteredStops.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final stop = filteredStops[index];
                          final stopId = stop['stop_id']?.toString() ?? '';
                          final stopName = stop['stop_name'] ?? 'Bus Stop';
                          final isSchoolStop = stop['is_school_stop'] == true ||
                              stopName.toString().toLowerCase().contains('school');
                          final scheduledTime = isMorning
                              ? (stop['morning_time'] ?? '08:00 AM')
                              : (stop['evening_time'] ?? '04:00 PM');
                          final landmark = stop['landmark']?.toString() ?? '';

                          // Calculate students at this stop
                          int studentCount = int.tryParse(stop['student_count']?.toString() ?? '') ?? 0;
                          final stopStudents = _students.where((st) => st['stop_id']?.toString() == stopId).toList();
                          if (studentCount == 0 && stopStudents.isNotEmpty) {
                            studentCount = stopStudents.length;
                          }

                          // If evening and school stop: all students board at school
                          final isBoardingOrigin = (!isMorning && isSchoolStop);
                          final isFinalSchoolTerminus = (isMorning && isSchoolStop);

                          // Active trip status
                          final isTripActiveThisShift = (trip.isTripActive && trip.currentTripShift == _selectedShift);
                          final isCompleted = isTripActiveThisShift && index < trip.nextStopIndex;
                          final isCurrentNext = isTripActiveThisShift && index == trip.nextStopIndex;

                          final isExpanded = _expandedStops.contains(stopId);

                          return Container(
                            decoration: BoxDecoration(
                              color: isCurrentNext
                                  ? (isDark
                                      ? AppConstants.accentAmber.withValues(alpha: 0.15)
                                      : AppConstants.accentAmberLight.withValues(alpha: 0.15))
                                  : elevatedColor,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isCurrentNext
                                    ? AppConstants.accentAmberLight
                                    : (isCompleted ? AppConstants.accentEmeraldLight.withValues(alpha: 0.4) : borderColor),
                                width: isCurrentNext ? 1.5 : 1.0,
                              ),
                            ),
                            child: Column(
                              children: [
                                ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  onTap: () {
                                    if (stopStudents.isNotEmpty) {
                                      setState(() {
                                        if (isExpanded) {
                                          _expandedStops.remove(stopId);
                                        } else {
                                          _expandedStops.add(stopId);
                                        }
                                      });
                                    }
                                  },
                                  leading: Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isCompleted
                                          ? AppConstants.accentEmeraldLight
                                          : (isCurrentNext
                                              ? AppConstants.accentAmberLight
                                              : (isSchoolStop
                                                  ? AppConstants.primaryLight
                                                  : (isDark ? Colors.white12 : Colors.grey.shade200))),
                                    ),
                                    child: Center(
                                      child: isCompleted
                                          ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
                                          : (isSchoolStop
                                              ? const Icon(Icons.school_rounded, color: Colors.white, size: 20)
                                              : Text(
                                                  '#${index + 1}',
                                                  style: TextStyle(
                                                    color: isCurrentNext ? Colors.black87 : textColor,
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 13,
                                                  ),
                                                )),
                                    ),
                                  ),
                                  title: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          stopName,
                                          style: TextStyle(
                                            color: textColor,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 14,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (isCurrentNext) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppConstants.accentAmberLight,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: const Text(
                                            'NEXT STOP',
                                            style: TextStyle(
                                              color: Colors.black87,
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  subtitle: Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      children: [
                                        Icon(Icons.access_time_rounded, size: 13, color: subtextColor),
                                        const SizedBox(width: 4),
                                        Text(
                                          scheduledTime,
                                          style: TextStyle(color: subtextColor, fontSize: 11.5, fontWeight: FontWeight.w600),
                                        ),
                                        if (landmark.isNotEmpty) ...[
                                          const SizedBox(width: 8),
                                          Text('•', style: TextStyle(color: subtextColor)),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              landmark,
                                              style: TextStyle(color: subtextColor, fontSize: 11.5),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      // Students Count Pill
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isSchoolStop
                                              ? AppConstants.primaryLight.withValues(alpha: 0.15)
                                              : (studentCount > 0
                                                  ? (isMorning
                                                      ? AppConstants.accentEmeraldLight.withValues(alpha: 0.15)
                                                      : Colors.amber.withValues(alpha: 0.15))
                                                  : Colors.grey.withValues(alpha: 0.1)),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(
                                            color: isSchoolStop
                                                ? AppConstants.primaryLight.withValues(alpha: 0.4)
                                                : (studentCount > 0
                                                    ? (isMorning
                                                        ? AppConstants.accentEmeraldLight.withValues(alpha: 0.4)
                                                        : Colors.amber.withValues(alpha: 0.4))
                                                    : Colors.grey.withValues(alpha: 0.2)),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isSchoolStop
                                                  ? Icons.school_rounded
                                                  : (isMorning
                                                      ? Icons.person_add_alt_1_rounded
                                                      : Icons.person_remove_rounded),
                                              size: 13,
                                              color: isSchoolStop
                                                  ? AppConstants.primaryLight
                                                  : (studentCount > 0
                                                      ? (isMorning ? AppConstants.accentEmeraldLight : Colors.amber.shade700)
                                                      : subtextColor),
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              isBoardingOrigin
                                                  ? '$totalAssignedStudents Boarding'
                                                  : (isFinalSchoolTerminus
                                                      ? 'Campus Drop'
                                                      : (isMorning
                                                          ? '$studentCount to Board'
                                                          : '$studentCount Drop Off')),
                                              style: TextStyle(
                                                color: isSchoolStop
                                                    ? AppConstants.primaryLight
                                                    : (studentCount > 0
                                                        ? (isMorning ? AppConstants.accentEmeraldLight : Colors.amber.shade700)
                                                        : subtextColor),
                                                fontWeight: FontWeight.w800,
                                                fontSize: 11,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (stopStudents.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          isExpanded ? 'Hide Names ▲' : 'View Names ▼',
                                          style: TextStyle(
                                            color: AppConstants.primaryLight,
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),

                                // Expanded Student Names List (if available)
                                if (isExpanded && stopStudents.isNotEmpty) ...[
                                  Divider(color: borderColor, height: 1),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    color: isDark ? Colors.black26 : Colors.grey.shade50,
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'STUDENTS AT THIS STOP (${stopStudents.length})',
                                          style: TextStyle(
                                            color: subtextColor,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        ...stopStudents.map((st) {
                                          final name = '${st['first_name'] ?? ''} ${st['last_name'] ?? ''}'.trim();
                                          final className = st['class_name'] ?? '';
                                          final sectionName = st['section_name'] ?? '';
                                          final classDisplay = (className.isNotEmpty || sectionName.isNotEmpty)
                                              ? 'Class $className-$sectionName'
                                              : '';
                                          return Padding(
                                            padding: const EdgeInsets.symmetric(vertical: 3),
                                            child: Row(
                                              children: [
                                                const Icon(Icons.person_rounded, size: 14, color: AppConstants.primaryLight),
                                                const SizedBox(width: 6),
                                                Text(
                                                  name.isNotEmpty ? name : 'Student',
                                                  style: TextStyle(
                                                    color: textColor,
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                                if (classDisplay.isNotEmpty) ...[
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    '($classDisplay)',
                                                    style: TextStyle(color: subtextColor, fontSize: 11),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          );
                                        }),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
