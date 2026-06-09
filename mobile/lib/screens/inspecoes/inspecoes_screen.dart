import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class InspecoesScreen extends StatefulWidget {
  final String? obraId;
  const InspecoesScreen({super.key, this.obraId});
  @override State<InspecoesScreen> createState() => _InspecoesScreenState();
}

class _InspecoesScreenState extends State<InspecoesScreen> {
  List<Map<String,dynamic>> _inspecoes = [];
  bool _loading = false;

  @override
  void initState() { super.initState(); if (widget.obraId != null) _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final data = await Supabase.instance.client.from('inspecoes').select('*').eq('obra_id', widget.obraId!).order('data_solicitacao', ascending: false);
    setState(() { _inspecoes = List<Map<String,dynamic>>.from(data); _loading = false; });
  }

  Color _cor(String s) => switch(s) { 'aprovada' => Colors.green, 'reprovada' => Colors.red, 'aguardando' => Colors.orange, _ => Colors.blue };
  IconData _icon(String s) => switch(s) { 'aprovada' => Icons.check_circle, 'reprovada' => Icons.cancel, _ => Icons.schedule };

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Inspeções')),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : _inspecoes.isEmpty ? const Center(child: Text('Nenhuma inspeção encontrada.', style: TextStyle(color: Colors.grey)))
      : ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: _inspecoes.length,
          itemBuilder: (_, i) {
            final ins = _inspecoes[i];
            final status = ins['status'] as String? ?? '';
            return Card(child: ListTile(
              leading: CircleAvatar(backgroundColor: _cor(status).withOpacity(0.1), child: Icon(_icon(status), color: _cor(status))),
              title: Text(status.toUpperCase(), style: TextStyle(fontWeight: FontWeight.bold, color: _cor(status))),
              subtitle: Text(ins['data_solicitacao']?.toString().substring(0,10) ?? ''),
              trailing: ins['libera_medicao'] == true ? const Chip(label: Text('Libera Med.', style: TextStyle(fontSize: 10)), backgroundColor: Color(0xFFDCFCE7)) : null,
            ));
          },
        ),
  );
}
