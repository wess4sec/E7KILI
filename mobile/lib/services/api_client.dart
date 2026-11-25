import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/api_exception.dart';
import 'token_storage.dart';

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokenStorage,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final TokenStorage tokenStorage;
  final http.Client _client;

  Uri _buildUri(String path, [Map<String, String>? queryParams]) {
    final sanitizedBase = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final sanitizedPath = path.startsWith('/') ? path : '/$path';
    final urlString = '$sanitizedBase$sanitizedPath';

    final uri = Uri.parse(urlString);
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  Future<Map<String, String>> _headers({bool hasBody = false}) async {
    final headers = <String, String>{
      'accept': 'application/json',
    };
    if (hasBody) {
      headers['content-type'] = 'application/json';
    }

    final token = await tokenStorage.getToken();
    if (token != null && token.isNotEmpty) {
      headers['authorization'] = 'Bearer $token';
    }
    return headers;
  }

  dynamic _handleResponse(
    http.Response response, {
    required String method,
    required Uri uri,
  }) {
    debugPrint('[ApiClient] $method $uri -> Status ${response.statusCode}');

    dynamic decoded;
    if (response.body.isNotEmpty) {
      try {
        decoded = jsonDecode(response.body);
      } catch (_) {
        decoded = null;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    String message = 'Une erreur est survenue';
    String code = 'UNKNOWN_ERROR';

    if (decoded is Map<String, dynamic>) {
      if (decoded['error'] is Map) {
        final errorMap = decoded['error'] as Map<String, dynamic>;
        code = (errorMap['code'] as String?) ?? code;
        message = (errorMap['message'] as String?) ?? message;
      } else if (decoded['error'] is String) {
        message = decoded['error'] as String;
      } else if (decoded['message'] is String) {
        message = decoded['message'] as String;
      }
    }

    debugPrint(
      '[ApiClient] Error [${response.statusCode}] $code',
    );

    throw ApiException(
      statusCode: response.statusCode,
      code: code,
      message: message,
    );
  }

  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    final uri = _buildUri(path, queryParams);
    try {
      final headers = await _headers();
      final response = await _client.get(uri, headers: headers);
      return _handleResponse(response, method: 'GET', uri: uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException GET $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      );
    } on http.ClientException catch (e) {
      debugPrint('[ApiClient] ClientException GET $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Erreur réseau lors de la communication avec le serveur.',
      );
    }
  }

  Future<dynamic> post(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    try {
      final headers = await _headers(hasBody: body != null);
      final response = await _client.post(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response, method: 'POST', uri: uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException POST $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      );
    } on http.ClientException catch (e) {
      debugPrint('[ApiClient] ClientException POST $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Erreur réseau lors de la communication avec le serveur.',
      );
    }
  }

  Future<dynamic> patch(String path, {dynamic body}) async {
    final uri = _buildUri(path);
    try {
      final headers = await _headers(hasBody: body != null);
      final response = await _client.patch(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response, method: 'PATCH', uri: uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException PATCH $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      );
    } on http.ClientException catch (e) {
      debugPrint('[ApiClient] ClientException PATCH $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Erreur réseau lors de la communication avec le serveur.',
      );
    }
  }

  Future<dynamic> delete(String path) async {
    final uri = _buildUri(path);
    try {
      final headers = await _headers();
      final response = await _client.delete(uri, headers: headers);
      return _handleResponse(response, method: 'DELETE', uri: uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException DELETE $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      );
    } on http.ClientException catch (e) {
      debugPrint('[ApiClient] ClientException DELETE $uri: $e');
      throw const ApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Erreur réseau lors de la communication avec le serveur.',
      );
    }
  }

  void close() {
    _client.close();
  }
}
