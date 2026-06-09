import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class EfetivoScreen extends StatefulWidget {
  final String? obraId;
  const EfetivoScreen({super.key, this.obraId});
  @override State<EfetivoScreen> createState() => _EfetivoScreenState();
}

class _EfetivoScreenState extends State<EfetivoScreen> {
  List<Map<String,dynamic>> _efetivos = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); if (widget.obraId != null) _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await Supabase.instance.client.from('efetivo_diario').select('*, efetivo_colaboradores(*)').eq('obra_id', widget.obraId!).order('data', ascending: false);
    setState(() { _efetivos = List<Map<String,dynamic>>.from(data); _loading = false; });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Efetivo Diário')),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : _efetivos.isEmpty ? const Center(child: Text('Nenhum efetivo registrado.', style: TextStyle(color: Colors.grey)))
      : ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _efetivos.length,
          itemBuilder: (_, i) {
            final e = _efetivos[i];
            final colabs = e['efetivo_colaboradores'] as List? ?? [];
            final pres = colabs.where((c) => c['presente'] == true).length;
            return Card(child: ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFF2563EB), child: Icon(Icons.groups, color: Colors.white, size: 20)),
              title: Text(e['data'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${pres} presentes · ${colabs.length - pres} ausentes'),
              trailing: Text('${colabs.length}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
            ));
          },
        ),
  );
}
