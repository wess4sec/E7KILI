import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hkili_mobile/services/api_client.dart';
import 'package:hkili_mobile/services/chat_api_service.dart';
import 'package:hkili_mobile/services/token_storage.dart';

void main() {
  test(
    'sends a new chat through Spring and maps persisted responses',
    () async {
      final tokenStorage = InMemoryTokenStorage('signed-token');
      final client = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/chat');
        expect(request.headers['authorization'], 'Bearer signed-token');
        expect(jsonDecode(request.body), {'message': 'Aaslema Hkili'});
        return http.Response(
          jsonEncode({
            'conversationId': '6740b02a38e91d0e12345679',
            'conversationTitle': 'Aaslema Hkili',
            'userMessage': {
              'id': 'user-id',
              'conversationId': '6740b02a38e91d0e12345679',
              'role': 'user',
              'content': 'Aaslema Hkili',
              'createdAt': '2026-11-25T16:30:00.000Z',
            },
            'assistantMessage': {
              'id': 'assistant-id',
              'conversationId': '6740b02a38e91d0e12345679',
              'role': 'assistant',
              'content': 'Aaslema !',
              'createdAt': '2026-11-25T16:30:01.000Z',
            },
          }),
          201,
        );
      });
      final service = ChatApiService(
        apiClient: ApiClient(
          baseUrl: 'http://localhost:8081',
          tokenStorage: tokenStorage,
          client: client,
        ),
      );

      final result = await service.sendMessage(null, ' Aaslema Hkili ');

      expect(result.conversationId, '6740b02a38e91d0e12345679');
      expect(result.userMessage.text, 'Aaslema Hkili');
      expect(result.userMessage.isFromUser, isTrue);
      expect(result.assistantMessage.text, 'Aaslema !');
      expect(result.assistantMessage.isFromUser, isFalse);
    },
  );

  test('includes the active conversation id when continuing a chat', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/chat');
      expect(jsonDecode(request.body), {
        'message': 'Continue',
        'conversationId': '6740b02a38e91d0e12345679',
      });
      return http.Response(
        jsonEncode({
          'conversationId': '6740b02a38e91d0e12345679',
          'userMessage': {
            'id': 'user-id',
            'content': 'Continue',
            'role': 'user',
            'createdAt': '2026-11-25T16:30:00.000Z',
          },
          'assistantMessage': {
            'id': 'assistant-id',
            'content': 'Of course.',
            'role': 'assistant',
            'createdAt': '2026-11-25T16:30:01.000Z',
          },
        }),
        201,
      );
    });
    final service = ChatApiService(
      apiClient: ApiClient(
        baseUrl: 'http://localhost:8081',
        tokenStorage: InMemoryTokenStorage(),
        client: client,
      ),
    );

    final result = await service.sendMessage(
      '6740b02a38e91d0e12345679',
      'Continue',
    );

    expect(result.conversationId, '6740b02a38e91d0e12345679');
  });
}
