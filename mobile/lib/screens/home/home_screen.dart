import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    final modules = [
      {'icon': Icons.apartment_rounded,       'label': 'Obras',       'route': '/obras',      'color': const Color(0xFF2563EB)},
      {'icon': Icons.account_tree_rounded,    'label': 'PCP',         'route': '/pcp',        'color': const Color(0xFF7C3AED)},
      {'icon': Icons.groups_rounded,          'label': 'Efetivo',     'route': '/efetivo',    'color': const Color(0xFF059669)},
      {'icon': Icons.bar_chart_rounded,       'label': 'Produções',   'route': '/producoes',  'color': const Color(0xFFD97706)},
      {'icon': Icons.check_circle_rounded,    'label': 'Inspeções',   'route': '/inspecoes',  'color': const Color(0xFF0891B2)},
      {'icon': Icons.warning_amber_rounded,   'label': 'Pendências',  'route': '/pendencias', 'color': const Color(0xFFDC2626)},
      {'icon': Icons.book_rounded,            'label': 'Diário',      'route': '/diario',     'color': const Color(0xFF7C3AED)},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('SGO', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF1E40AF), Color(0xFF2563EB)]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bem-vindo ao SGO!', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      auth.user?['nome'] ?? 'Usuário',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      (auth.user?['perfil'] ?? '').toString().toUpperCase(),
                      style: const TextStyle(color: Colors.white54, fontSize: 11, letterSpacing: 1.2),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              const Text('Módulos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 12),

              // Grid de módulos
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1,
                ),
                itemCount: modules.length,
                itemBuilder: (context, i) {
                  final m = modules[i];
                  return InkWell(
                    onTap: () => context.push(m['route'] as String),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: (m['color'] as Color).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(m['icon'] as IconData, color: m['color'] as Color, size: 24),
                          ),
                          const SizedBox(height: 8),
                          Text(m['label'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
