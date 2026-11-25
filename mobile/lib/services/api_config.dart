import 'package:flutter/foundation.dart';

class ApiConfig {
  ApiConfig({String? backendBaseUrl, String? soaBaseUrl})
    : backendBaseUrl = backendBaseUrl ?? _defaultBackendBaseUrl,
      soaBaseUrl = soaBaseUrl ?? _defaultSoaBaseUrl;

  final String backendBaseUrl;
  final String soaBaseUrl;

  static String get _defaultBackendBaseUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    if (configured.isNotEmpty) {
      return configured;
    }

    if (kIsWeb) {
      return 'http://192.168.100.116:3000/api/v1';
    }

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api/v1';
    }

    return 'http://127.0.0.1:3000/api/v1';
  }

  static String get _defaultSoaBaseUrl {
    const configured = String.fromEnvironment('SOA_API_BASE_URL');
    if (configured.isNotEmpty) {
      return configured;
    }

    if (kIsWeb) {
      return 'http://192.168.100.116:8081';
    }

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8081';
    }

    return 'http://127.0.0.1:8081';
  }
}
