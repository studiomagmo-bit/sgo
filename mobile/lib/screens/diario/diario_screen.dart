import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DiarioScreen extends StatefulWidget {
  final String? obraId;
  const DiarioScreen({super.key, this.obraId});
  @override State<DiarioScreen> createState() => _DiarioScreenState();
}

class _DiarioScreenState extends State<DiarioScreen> {
  List<Map<String,dynamic>> _diarios = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); if (widget.obraId != null) _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await Supabase.instance.client.from('diario_obra').select('*').eq('obra_id', widget.obraId!).order('data', ascending: false);
    setState(() { _diarios = List<Map<String,dynamic>>.from(data); _loading = false; });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Diário de Obra')),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : _diarios.isEmpty ? const Center(child: Text('Nenhum diário encontrado.', style: TextStyle(color: Colors.grey)))
      : ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _diarios.length,
          itemBuilder: (_, i) {
            final d = _diarios[i];
            return Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.calendar_today, size: 16, color: Color(0xFF2563EB)),
                const SizedBox(width: 6),
                Text(d['data'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                const Spacer(),
                if (d['publicado'] == true) const Chip(label: Text('Publicado', style: TextStyle(fontSize: 10)), backgroundColor: Color(0xFFDCFCE7)),
              ]),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                _stat('Efetivo', '${d['efetivo_presente']}/${d['efetivo_previsto']}'),
                _stat('Produções', '${d['total_producoes']}'),
                _stat('Pendências', '${d['total_pendencias']}'),
                _stat('Fotos', '${d['total_fotos']}'),
              ]),
            ])));
          },
        ),
  );

  Widget _stat(String label, String value) => Column(children: [
    Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
    Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
  ]);
}
