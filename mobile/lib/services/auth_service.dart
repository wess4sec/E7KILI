import '../models/api_exception.dart';
import '../models/auth_response.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'token_storage.dart';

class AuthService {
  AuthService({
    required this.apiClient,
    required this.tokenStorage,
  });

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  User? _currentUser;
  User? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;

  Future<User> register({
    required String email,
    required String password,
    String? name,
  }) async {
    final body = <String, dynamic>{
      'email': email.trim(),
      'password': password,
      if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
    };

    final data = await apiClient.post('/auth/register', body: body);
    final authResponse = AuthResponse.fromJson(data as Map<String, dynamic>);

    await tokenStorage.saveToken(authResponse.token);
    _currentUser = authResponse.user;
    return authResponse.user;
  }

  Future<User> login({
    required String email,
    required String password,
  }) async {
    final body = <String, dynamic>{
      'email': email.trim(),
      'password': password,
    };

    final data = await apiClient.post('/auth/login', body: body);
    final authResponse = AuthResponse.fromJson(data as Map<String, dynamic>);

    await tokenStorage.saveToken(authResponse.token);
    _currentUser = authResponse.user;
    return authResponse.user;
  }

  Future<User?> restoreSession() async {
    final token = await tokenStorage.getToken();
    if (token == null || token.isEmpty) {
      _currentUser = null;
      return null;
    }

    try {
      final data = await apiClient.get('/auth/me');
      final userMap = (data as Map<String, dynamic>)['user'] as Map<String, dynamic>;
      _currentUser = User.fromJson(userMap);
      return _currentUser;
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        await tokenStorage.clearToken();
      }
      _currentUser = null;
      return null;
    } catch (_) {
      _currentUser = null;
      return null;
    }
  }

  Future<void> logout() async {
    await tokenStorage.clearToken();
    _currentUser = null;
  }
}
