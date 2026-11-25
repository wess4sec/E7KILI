import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:hkili_mobile/models/api_exception.dart';
import 'package:hkili_mobile/services/api_client.dart';
import 'package:hkili_mobile/services/token_storage.dart';

void main() {
  group('ApiClient', () {
    late TokenStorage tokenStorage;

    setUp(() {
      tokenStorage = InMemoryTokenStorage();
    });

    test('successful API request returns decoded JSON', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/v1/health');
        return http.Response(jsonEncode({'status': 'ok'}), 200);
      });

      final apiClient = ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        tokenStorage: tokenStorage,
        client: mockClient,
      );

      final response = await apiClient.get('/health');
      expect(response, equals({'status': 'ok'}));
    });

    test('HTTP error response throws ApiException with details', () async {
      final mockClient = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'error': {
              'code': 'SERVICE_UNAVAILABLE',
              'message': 'Gemini AI service is not configured',
            },
          }),
          503,
        );
      });

      final apiClient = ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        tokenStorage: tokenStorage,
        client: mockClient,
      );

      expect(
        () => apiClient.post('/conversations/123/messages', body: {
          'content': 'Test',
          'generateReply': true,
        }),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 503)
              .having((e) => e.code, 'code', 'SERVICE_UNAVAILABLE')
              .having(
                (e) => e.message,
                'message',
                'Gemini AI service is not configured',
              ),
        ),
      );
    });

    test('ClientException throws ApiException with NETWORK_ERROR', () async {
      final mockClient = MockClient((request) async {
        throw http.ClientException('Connection failed');
      });

      final apiClient = ApiClient(
        baseUrl: 'http://localhost:3000/api/v1',
        tokenStorage: tokenStorage,
        client: mockClient,
      );

      expect(
        () => apiClient.get('/health'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 0)
              .having((e) => e.code, 'code', 'NETWORK_ERROR'),
        ),
      );
    });
  });
}
