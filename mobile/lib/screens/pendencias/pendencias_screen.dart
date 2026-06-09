import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PendenciasScreen extends StatefulWidget {
  final String? obraId;
  const PendenciasScreen({super.key, this.obraId});
  @override State<PendenciasScreen> createState() => _PendenciasScreenState();
}

class _PendenciasScreenState extends State<PendenciasScreen> {
  List<Map<String,dynamic>> _pendencias = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); if (widget.obraId != null) _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await Supabase.instance.client.from('pendencias').select('*').eq('obra_id', widget.obraId!).order('criado_em', ascending: false);
    setState(() { _pendencias = List<Map<String,dynamic>>.from(data); _loading = false; });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Pendências')),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : _pendencias.isEmpty ? const Center(child: Text('Sem pendências. 🎉', style: TextStyle(color: Colors.grey)))
      : ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _pendencias.length,
          itemBuilder: (_, i) {
            final p = _pendencias[i];
            return Card(child: ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFFEF3C7), child: Icon(Icons.warning_amber, color: Color(0xFFD97706))),
              title: Text(p['descricao'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(p['status'] ?? ''),
              trailing: p['prazo'] != null ? Text(p['prazo']!, style: const TextStyle(fontSize: 11, color: Colors.red)) : null,
            ));
          },
        ),
  );
}
