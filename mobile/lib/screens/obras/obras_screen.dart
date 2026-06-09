import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/auth/auth_provider.dart';

// ─── Provider de obras ────────────────────────────────────────
final obrasProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final client = Supabase.instance.client;
  final resp = await client.from('obras').select('*').eq('ativa', true).order('criado_em', ascending: false);
  return List<Map<String, dynamic>>.from(resp);
});

// ─── Tela de Obras ───────────────────────────────────────────
class ObrasScreen extends ConsumerWidget {
  const ObrasScreen({super.key});

  Color _statusColor(String status) {
    switch (status) {
      case 'em_andamento': return const Color(0xFF2563EB);
      case 'concluida':    return const Color(0xFF059669);
      case 'pausada':      return const Color(0xFF6B7280);
      case 'cancelada':    return const Color(0xFFDC2626);
      default:             return const Color(0xFFD97706);
    }
  }

  String _statusLabel(String status) {
    const m = {
      'planejamento': 'Planejamento', 'em_andamento': 'Em Andamento',
      'pausada': 'Pausada', 'concluida': 'Concluída', 'cancelada': 'Cancelada',
    };
    return m[status] ?? status;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final obrasAsync = ref.watch(obrasProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Obras'), actions: [
        IconButton(icon: const Icon(Icons.add), onPressed: () {}),
      ]),
      body: obrasAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error:   (e, _) => Center(child: Text('Erro: $e')),
        data: (obras) {
          if (obras.isEmpty) {
            return const Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.apartment_outlined, size: 64, color: Colors.grey),
                SizedBox(height: 12),
                Text('Nenhuma obra encontrada', style: TextStyle(color: Colors.grey)),
              ],
            ));
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(obrasProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: obras.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final obra = obras[i];
                final perc = (obra['percentual_geral'] ?? 0.0) as num;
                final status = obra['status'] as String? ?? '';
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(child: Text(obra['nome'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _statusColor(status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: _statusColor(status).withOpacity(0.3)),
                            ),
                            child: Text(_statusLabel(status), style: TextStyle(fontSize: 11, color: _statusColor(status), fontWeight: FontWeight.w600)),
                          ),
                        ]),
                        if (obra['cidade'] != null) ...[
                          const SizedBox(height: 4),
                          Text('${obra['cidade']}${obra['estado'] != null ? " — ${obra['estado']}" : ""}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        ],
                        const SizedBox(height: 10),
                        Row(children: [
                          Expanded(child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: perc / 100,
                              backgroundColor: const Color(0xFFE2E8F0),
                              color: const Color(0xFF2563EB),
                              minHeight: 6,
                            ),
                          )),
                          const SizedBox(width: 8),
                          Text('${perc.toStringAsFixed(0)}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
                        ]),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
