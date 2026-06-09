import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PCPScreen extends StatefulWidget {
  final String? obraId;
  const PCPScreen({super.key, this.obraId});
  @override State<PCPScreen> createState() => _PCPScreenState();
}

class _PCPScreenState extends State<PCPScreen> {
  List<Map<String,dynamic>> _atividades = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); if (widget.obraId != null) _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await Supabase.instance.client.from('atividades').select('*').eq('obra_id', widget.obraId!).order('data_inicio_prev');
    setState(() { _atividades = List<Map<String,dynamic>>.from(data); _loading = false; });
  }

  Color _statusColor(String s) => switch(s) { 'concluida' => Colors.green, 'em_andamento' => Colors.blue, 'bloqueada' => Colors.red, _ => Colors.orange };

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.obraId == null ? 'PCP — Atividades' : 'PCP')),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : ListView.separated(
          padding: const EdgeInsets.all(12),
          itemCount: _atividades.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final a = _atividades[i];
            final perc = (a['percentual_exec'] ?? 0) as num;
            return Card(child: ListTile(
              title: Text(a['nome'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SizedBox(height: 4),
                LinearProgressIndicator(value: perc/100, color: _statusColor(a['status'] ?? ''), backgroundColor: Colors.grey.shade200),
                const SizedBox(height: 2),
                Text('${perc.toStringAsFixed(0)}% · ${a['status']}', style: const TextStyle(fontSize: 11)),
              ]),
              trailing: a['bloqueada'] == true ? const Icon(Icons.lock, color: Colors.red, size: 18) : null,
            ));
          },
        ),
  );
}
