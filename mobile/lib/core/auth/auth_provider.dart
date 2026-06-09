import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _storage = FlutterSecureStorage();
const _tokenKey = 'sgo_token';
const _userKey  = 'sgo_user';

// ─── Provider do token ───────────────────────────────────────
final tokenProvider = StateProvider<String?>((ref) => null);

// ─── Provider do Supabase client ─────────────────────────────
final supabaseProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

// ─── AuthNotifier ────────────────────────────────────────────
class AuthState {
  final bool loading;
  final String? token;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({
    this.loading = false,
    this.token,
    this.user,
    this.error,
  });

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    bool? loading,
    String? token,
    Map<String, dynamic>? user,
    String? error,
  }) => AuthState(
    loading: loading ?? this.loading,
    token: token ?? this.token,
    user: user ?? this.user,
    error: error,
  );
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    final token = await _storage.read(key: _tokenKey);
    if (token != null) {
      state = state.copyWith(token: token);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final resp = await Supabase.instance.client.auth
          .signInWithPassword(email: email, password: password);
      final token = resp.session?.accessToken;
      if (token == null) throw Exception('Token não recebido');

      await _storage.write(key: _tokenKey, value: token);
      state = state.copyWith(loading: false, token: token);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await Supabase.instance.client.auth.signOut();
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(),
);
