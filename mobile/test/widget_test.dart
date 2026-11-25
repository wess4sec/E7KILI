import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:hkili_mobile/app/hkili_app.dart';
import 'package:hkili_mobile/models/api_exception.dart';
import 'package:hkili_mobile/models/chat_message.dart';
import 'package:hkili_mobile/models/conversation.dart';
import 'package:hkili_mobile/models/user.dart';
import 'package:hkili_mobile/services/api_client.dart';
import 'package:hkili_mobile/services/auth_service.dart';
import 'package:hkili_mobile/services/chat_api_service.dart';
import 'package:hkili_mobile/services/token_storage.dart';

class FakeAuthService extends AuthService {
  FakeAuthService()
    : super(
        apiClient: ApiClient(
          baseUrl: 'http://localhost:3000/api/v1',
          tokenStorage: InMemoryTokenStorage(),
        ),
        tokenStorage: InMemoryTokenStorage(),
      );

  User? _currentUser;
  @override
  User? get currentUser => _currentUser;

  bool _authenticated = false;

  @override
  bool get isAuthenticated => _authenticated;

  @override
  Future<User> login({required String email, required String password}) async {
    _authenticated = true;

    _currentUser = User(id: 'test-user-id', email: email, name: 'Test User');
    return _currentUser!;
  }

  @override
  Future<void> logout() async {
    _authenticated = false;
    _currentUser = null;
  }
}

class FakeChatApiService extends ChatApiService {
  FakeChatApiService()
    : super(
        apiClient: ApiClient(
          baseUrl: 'http://localhost:3000/api/v1',
          tokenStorage: InMemoryTokenStorage(),
        ),
      );

  int sendMessageCalls = 0;
  Object? sendMessageFailure;

  @override
  Future<List<Conversation>> listConversations({
    int page = 1,
    int limit = 20,
  }) async {
    return [];
  }

  @override
  Future<({Conversation conversation, List<ChatMessage> messages})>
  getConversationWithMessages(
    String conversationId, {
    int page = 1,
    int limit = 50,
  }) async {
    final now = DateTime.now();
    return (
      conversation: Conversation(
        id: conversationId,
        title: 'Test conversation',
        ownerId: 'test-user-id',
        createdAt: now,
        updatedAt: now,
      ),
      messages: <ChatMessage>[],
    );
  }

  @override
  Future<
    ({
      String conversationId,
      ChatMessage userMessage,
      ChatMessage assistantMessage,
    })
  >
  sendMessage(String? conversationId, String content, {String? title}) async {
    sendMessageCalls++;
    if (sendMessageFailure != null) {
      throw sendMessageFailure!;
    }

    final now = DateTime.now();

    return (
      conversationId: conversationId ?? 'test-conversation-id',
      userMessage: ChatMessage(
        id: 'user-message-id',
        text: content,
        author: MessageAuthor.user,
        createdAt: now,
      ),
      assistantMessage: ChatMessage(
        id: 'assistant-message-id',
        text: 'Aaslema ! Je suis la vraie réponse simulée de Hkili.',
        author: MessageAuthor.assistant,
        createdAt: now,
      ),
    );
  }
}

void main() {
  late FakeAuthService authService;
  late FakeChatApiService chatApiService;

  Future<void> openAuthenticatedChat(WidgetTester tester) async {
    authService = FakeAuthService();
    chatApiService = FakeChatApiService();

    await tester.pumpWidget(
      HkiliApp(
        authService: authService,
        chatApiService: chatApiService,
        restoreSessionOnStart: false,
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('get-started-button')));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('login-email-input')),
      'test@example.com',
    );

    await tester.enterText(
      find.byKey(const Key('login-password-input')),
      'password123',
    );

    final loginButton = find.byKey(const Key('login-submit-button'));

    await tester.ensureVisible(loginButton);
    await tester.pumpAndSettle();
    await tester.tap(loginButton);
    await tester.pumpAndSettle();
  }

  testWidgets('Welcome screen navigates to login', (tester) async {
    authService = FakeAuthService();
    chatApiService = FakeChatApiService();

    await tester.pumpWidget(
      HkiliApp(
        authService: authService,
        chatApiService: chatApiService,
        restoreSessionOnStart: false,
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Hkili'), findsOneWidget);
    expect(find.byKey(const Key('get-started-button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('get-started-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-email-input')), findsOneWidget);
    expect(find.byKey(const Key('login-password-input')), findsOneWidget);
  });

  testWidgets('Successful login opens the main application', (tester) async {
    await openAuthenticatedChat(tester);

    expect(authService.isAuthenticated, isTrue);
    expect(find.text('Accueil'), findsOneWidget);
    expect(find.byKey(const Key('chat-input')), findsOneWidget);
  });

  testWidgets('Continuing as guest opens the main application', (tester) async {
    authService = FakeAuthService();
    chatApiService = FakeChatApiService();

    await tester.pumpWidget(
      HkiliApp(
        authService: authService,
        chatApiService: chatApiService,
        restoreSessionOnStart: false,
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('get-started-button')));
    await tester.pumpAndSettle();

    final guestButton = find.text('Continuer en invité');
    expect(guestButton, findsOneWidget);

    await tester.ensureVisible(guestButton);
    await tester.pumpAndSettle();
    await tester.tap(guestButton);
    await tester.pumpAndSettle();

    expect(find.text('Accueil'), findsOneWidget);
    expect(find.byKey(const Key('chat-input')), findsOneWidget);
  });

  testWidgets('Sending a message uses the chat API service', (tester) async {
    await openAuthenticatedChat(tester);

    await tester.enterText(
      find.byKey(const Key('chat-input')),
      'Aaslema Hkili',
    );

    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pumpAndSettle();

    expect(chatApiService.sendMessageCalls, 1);

    expect(find.text('Aaslema Hkili'), findsOneWidget);

    expect(
      find.text('Aaslema ! Je suis la vraie réponse simulée de Hkili.'),
      findsOneWidget,
    );
  });

  testWidgets('Shows a friendly message when the AI service is unavailable', (
    tester,
  ) async {
    await openAuthenticatedChat(tester);
    chatApiService.sendMessageFailure = const ApiException(
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Gemini is not configured. Set GEMINI_API_KEY in backend/.env.',
    );

    await tester.enterText(
      find.byKey(const Key('chat-input')),
      'Aaslema Hkili',
    );
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Le service Hkili est temporairement indisponible. Réessaie plus tard.',
      ),
      findsOneWidget,
    );
    expect(find.textContaining('GEMINI_API_KEY'), findsNothing);
    expect(find.textContaining('ApiException'), findsNothing);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('chat-input')))
          .controller!
          .text,
      'Aaslema Hkili',
    );

    final chatContext = tester.element(find.byKey(const Key('chat-input')));
    ScaffoldMessenger.of(chatContext).hideCurrentSnackBar();
    await tester.pumpAndSettle();
    expect(
      tester.widget<IconButton>(find.byKey(const Key('send-button'))).onPressed,
      isNotNull,
    );

    chatApiService.sendMessageFailure = null;
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pumpAndSettle();

    expect(
      tester
          .widget<TextField>(find.byKey(const Key('chat-input')))
          .controller!
          .text,
      isEmpty,
    );
    expect(find.text('Aaslema Hkili'), findsOneWidget);
  });

  testWidgets('Shows a friendly message for ordinary chat errors', (
    tester,
  ) async {
    await openAuthenticatedChat(tester);
    chatApiService.sendMessageFailure = const ApiException(
      statusCode: 400,
      code: 'INVALID_MESSAGE',
      message: 'Sensitive internal error details',
    );

    await tester.enterText(
      find.byKey(const Key('chat-input')),
      'Aaslema Hkili',
    );
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pumpAndSettle();

    expect(
      find.text('Impossible d’envoyer ton message. Vérifie-le puis réessaie.'),
      findsOneWidget,
    );
    expect(
      find.textContaining('Sensitive internal error details'),
      findsNothing,
    );
  });

  testWidgets('Shows a friendly message when the AI service is rate limited', (
    tester,
  ) async {
    await openAuthenticatedChat(tester);
    chatApiService.sendMessageFailure = const ApiException(
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Sensitive provider quota details',
    );

    await tester.enterText(
      find.byKey(const Key('chat-input')),
      'Aaslema Hkili',
    );
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pumpAndSettle();

    expect(
      find.text('Hkili reçoit beaucoup de demandes. Réessaie dans quelques instants.'),
      findsOneWidget,
    );
    expect(find.textContaining('Sensitive provider quota details'), findsNothing);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('chat-input')))
          .controller!
          .text,
      'Aaslema Hkili',
    );
  });

  testWidgets('Profile screen displays user info and supports logout', (
    tester,
  ) async {
    await openAuthenticatedChat(tester);

    final profileTab = find.text('Profil');
    await tester.tap(profileTab);
    await tester.pumpAndSettle();

    expect(find.text('Test User'), findsOneWidget);
    expect(find.text('test@example.com'), findsOneWidget);

    final logoutBtn = find.byKey(const Key('logout-button'));
    expect(logoutBtn, findsOneWidget);

    await tester.ensureVisible(logoutBtn);
    await tester.pumpAndSettle();
    await tester.tap(logoutBtn);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-email-input')), findsOneWidget);
  });
}
