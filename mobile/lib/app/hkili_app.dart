
import 'package:flutter/material.dart';

import '../screens/login_screen.dart';
import '../screens/main_shell.dart';
import '../screens/register_screen.dart';
import '../screens/welcome_screen.dart';
import '../services/api_client.dart';
import '../services/api_config.dart';
import '../services/auth_service.dart';
import '../services/chat_api_service.dart';
import '../services/token_storage.dart';
import '../theme/app_theme.dart';

class HkiliApp extends StatefulWidget {
  const HkiliApp({
    super.key,
    this.authService,
    this.chatApiService,
    this.restoreSessionOnStart = true,
  });

  final AuthService? authService;
  final ChatApiService? chatApiService;
  final bool restoreSessionOnStart;

  @override
  State<HkiliApp> createState() => _HkiliAppState();
}

class _HkiliAppState extends State<HkiliApp> {
  late final AuthService _authService;
  late final ChatApiService _chatApiService;

  bool _hasStarted = false;
  bool _isInitializing = true;
  bool _showRegister = false;
  bool _isGuestMode = false;

  @override
  void initState() {
    super.initState();

    final tokenStorage = SecureTokenStorage();

    final apiClient = ApiClient(
      baseUrl: ApiConfig().baseUrl,
      tokenStorage: tokenStorage,
    );

    _authService = widget.authService ??
        AuthService(
          apiClient: apiClient,
          tokenStorage: tokenStorage,
        );

    _chatApiService =
        widget.chatApiService ?? ChatApiService(apiClient: apiClient);

    if (widget.restoreSessionOnStart) {
      _restoreSession();
    } else {
      _isInitializing = false;
    }
  }

  Future<void> _restoreSession() async {
    await _authService.restoreSession();

    if (!mounted) return;

    setState(() {
      _isInitializing = false;
      _hasStarted = true;
    });
  }

  void _openRegister() {
    setState(() {
      _showRegister = true;
      _isGuestMode = false;
    });
  }

  void _openLogin() {
    setState(() {
      _showRegister = false;
      _isGuestMode = false;
    });
  }

  void _onAuthenticationSuccess() {
    setState(() {
      _showRegister = false;
      _isGuestMode = false;
    });
  }

  Future<void> _logout() async {
    await _authService.logout();
    if (!mounted) return;
    setState(() {
      _isGuestMode = false;
      _showRegister = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hkili',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: _isInitializing
          ? const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            )
          : !_hasStarted
              ? WelcomeScreen(
                  onGetStarted: () {
                    setState(() {
                      _hasStarted = true;
                    });
                  },
                )
              : _authService.isAuthenticated || _isGuestMode
                  ? MainShell(
                      chatApiService: _chatApiService,
                      authService: _authService,
                      onLogout: _logout,
                      isGuestMode: _isGuestMode,
                    )
                  : _showRegister
                      ? RegisterScreen(
                          authService: _authService,
                          onRegisterSuccess: _onAuthenticationSuccess,
                          onNavigateToLogin: _openLogin,
                        )
                      : LoginScreen(
                          authService: _authService,
                          onLoginSuccess: _onAuthenticationSuccess,
                          onNavigateToRegister: _openRegister,
                          onContinueAsGuest: () {
                            setState(() {
                              _isGuestMode = true;
                            });
                          },
                        ),
    );
  }
}
