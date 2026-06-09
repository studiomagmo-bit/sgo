import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ProducoesScreen extends StatefulWidget {
  final String? obraId;
  const ProducoesScreen({super.key, this.obraId});
  @override State<ProducoesScreen> createState() => _ProducoesScreenState();
}

class _ProducoesScreenState extends State<ProducoesScreen> {
  List<Map<String,dynamic>> _producoes = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); if (widget.obraId != null) _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await Supabase.instance.client.from('producoes').select('*').eq('obra_id', widget.obraId!).order('data', ascending: false);
    setState(() { _producoes = List<Map<String,dynamic>>.from(data); _loading = false; });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Produções'), actions: [IconButton(icon: const Icon(Icons.add), onPressed: () {})]),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : _producoes.isEmpty ? const Center(child: Text('Nenhuma produção registrada.', style: TextStyle(color: Colors.grey)))
      : ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _producoes.length,
          itemBuilder: (_, i) {
            final p = _producoes[i];
            return Card(child: ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFF059669), child: Icon(Icons.bar_chart, color: Colors.white, size: 20)),
              title: Text('${p['quantidade']} ${p['unidade'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${p['data']} · ${p['tipo']}'),
            ));
          },
        ),
  );
}
