import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hkili_mobile/services/api_config.dart';

void main() {
  test('keeps Android emulator API addresses unchanged', () {
    final previousPlatform = debugDefaultTargetPlatformOverride;
    debugDefaultTargetPlatformOverride = TargetPlatform.android;

    try {
      final config = ApiConfig();

      expect(config.backendBaseUrl, 'http://10.0.2.2:3000/api/v1');
      expect(config.soaBaseUrl, 'http://10.0.2.2:8081');
    } finally {
      debugDefaultTargetPlatformOverride = previousPlatform;
    }
  });
}
