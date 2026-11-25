import 'package:flutter/material.dart';

import '../models/api_exception.dart';
import '../models/chat_message.dart';
import '../models/conversation.dart';
import '../services/auth_service.dart';
import '../services/chat_api_service.dart';
import '../services/mock_chat_service.dart';
import 'chat_screen.dart';
import 'history_screen.dart';
import 'profile_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({
    required this.chatApiService,
    this.authService,
    this.onLogout,
    this.isGuestMode = false,
    super.key,
  });

  final ChatApiService chatApiService;
  final AuthService? authService;
  final VoidCallback? onLogout;
  final bool isGuestMode;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late List<ChatMessage> _messages = [_welcomeMessage()];
  final MockChatService _mockChatService = MockChatService();

  String? _conversationId;
  int _selectedIndex = 0;
  bool _isResponding = false;
  int _historyRefreshKey = 0;

  ChatMessage _welcomeMessage() {
    return ChatMessage(
      id: 'welcome',
      text:
          'Aaslema ! Je suis Hkili, ton assistant IA tunisien. '
          'On peut discuter, explorer des idées ou découvrir la Tunisie.',
      author: MessageAuthor.assistant,
      createdAt: DateTime.now(),
    );
  }

  Future<bool> _sendMessage(String text) async {
    final content = text.trim();

    if (_isResponding || content.isEmpty) return false;

    setState(() => _isResponding = true);

    try {
      if (widget.isGuestMode) {
        final now = DateTime.now();
        setState(() {
          _messages.add(
            ChatMessage(
              id: 'guest-user-${now.microsecondsSinceEpoch}',
              text: content,
              author: MessageAuthor.user,
              createdAt: now,
            ),
          );
        });

        final reply = await _mockChatService.replyTo(content);
        if (!mounted) return false;

        setState(() {
          _messages.add(
            ChatMessage(
              id: 'guest-assistant-${DateTime.now().microsecondsSinceEpoch}',
              text: reply,
              author: MessageAuthor.assistant,
              createdAt: DateTime.now(),
            ),
          );
          _historyRefreshKey++;
        });
        return true;
      }

      final result = await widget.chatApiService.sendMessage(
        _conversationId,
        content,
      );

      if (!mounted) return false;

      setState(() {
        _conversationId = result.conversationId;
        _messages.add(result.userMessage);
        _messages.add(result.assistantMessage);
        _historyRefreshKey++;
      });
      return true;
    } catch (error) {
      if (!mounted) return false;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_chatErrorMessage(error)),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
      return false;
    } finally {
      if (mounted) {
        setState(() => _isResponding = false);
      }
    }
  }

  String _chatErrorMessage(Object error) {
    if (error is! ApiException) {
      return 'Impossible d’envoyer ton message. Réessaie.';
    }

    if (error.code == 'NETWORK_ERROR') {
      return 'Connexion impossible. Vérifie ta connexion internet et réessaie.';
    }
    if (error.statusCode == 429 || error.code == 'RATE_LIMIT_EXCEEDED') {
      return 'Hkili reçoit beaucoup de demandes. Réessaie dans quelques instants.';
    }
    if (error.code == 'TOKEN_EXPIRED' || error.statusCode == 401) {
      return 'Ta session a expiré. Reconnecte-toi pour continuer.';
    }
    if (error.statusCode == 502 ||
        error.statusCode == 503 ||
        error.statusCode == 504 ||
        error.code == 'GEMINI_API_KEY_INVALID' ||
        error.code == 'GEMINI_ACCESS_DENIED' ||
        error.code == 'GEMINI_MODEL_UNAVAILABLE') {
      return 'Le service Hkili est temporairement indisponible. Réessaie plus tard.';
    }

    return 'Impossible d’envoyer ton message. Vérifie-le puis réessaie.';
  }

  void _openConversation(
    Conversation conversation,
    List<ChatMessage> messages,
  ) {
    setState(() {
      _conversationId = conversation.id;
      _messages = messages.isEmpty ? [_welcomeMessage()] : messages;
      _selectedIndex = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(
          index: _selectedIndex,
          children: [
            ChatScreen(
              messages: _messages,
              isResponding: _isResponding,
              onSend: _sendMessage,
              isMockMode: widget.isGuestMode,
            ),
            HistoryScreen(
              key: ValueKey(_historyRefreshKey),
              chatApiService: widget.isGuestMode ? null : widget.chatApiService,
              onOpenConversation: _openConversation,
            ),
            ProfileScreen(
              user: widget.authService?.currentUser,
              onLogout: widget.onLogout,
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;

            if (index == 1) {
              _historyRefreshKey++;
            }
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Accueil',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_rounded),
            label: 'Historique',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}
