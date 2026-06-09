import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/theme/app_theme.dart';
import 'core/auth/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/obras/obras_screen.dart';
import 'screens/pcp/pcp_screen.dart';
import 'screens/efetivo/efetivo_screen.dart';
import 'screens/producoes/producoes_screen.dart';
import 'screens/inspecoes/inspecoes_screen.dart';
import 'screens/pendencias/pendencias_screen.dart';
import 'screens/diario/diario_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load();

  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  runApp(const ProviderScope(child: SGOApp()));
}

// ─── Router ─────────────────────────────────────────────────
final _router = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isAuth  = state.matchedLocation.startsWith('/login');
    if (session == null && !isAuth) return '/login';
    if (session != null && isAuth) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/login',     builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/home',      builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/obras',     builder: (_, __) => const ObrasScreen()),
    GoRoute(path: '/pcp',       builder: (_, s) => PCPScreen(obraId: s.uri.queryParameters['obra_id'])),
    GoRoute(path: '/efetivo',   builder: (_, s) => EfetivoScreen(obraId: s.uri.queryParameters['obra_id'])),
    GoRoute(path: '/producoes', builder: (_, s) => ProducoesScreen(obraId: s.uri.queryParameters['obra_id'])),
    GoRoute(path: '/inspecoes', builder: (_, s) => InspecoesScreen(obraId: s.uri.queryParameters['obra_id'])),
    GoRoute(path: '/pendencias',builder: (_, s) => PendenciasScreen(obraId: s.uri.queryParameters['obra_id'])),
    GoRoute(path: '/diario',    builder: (_, s) => DiarioScreen(obraId: s.uri.queryParameters['obra_id'])),
  ],
);

// ─── App ─────────────────────────────────────────────────────
class SGOApp extends ConsumerWidget {
  const SGOApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'SGO',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.light,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
