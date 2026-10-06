import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:edex_mobile/main.dart';
import 'package:edex_mobile/core/auth_provider.dart';
import 'package:edex_mobile/core/theme_provider.dart';
import 'package:edex_mobile/core/trip_provider.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => ThemeProvider()),
          ChangeNotifierProvider(create: (_) => TripProvider()),
        ],
        child: const EdexMobileApp(),
      ),
    );
    await tester.pump();
    expect(find.text('EDEX'), findsOneWidget);
  });
}
