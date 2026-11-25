class MockChatService {
  Future<String> replyTo(String message) async {
    await Future<void>.delayed(const Duration(milliseconds: 850));

    final normalizedMessage = message.toLowerCase();
    if (normalizedMessage.contains('tunisie') ||
        normalizedMessage.contains('tunis')) {
      return 'La Tunisie a tant de belles histoires à raconter ! '
          'Je suis en mode démo locale : mes réponses sont simulées pour '
          'le moment.';
    }

    if (normalizedMessage.contains('bonjour') ||
        normalizedMessage.contains('aaslema')) {
      return 'Aaslema ! Ravi de discuter avec toi. '
          'Je suis encore en mode démo locale.';
    }

    return 'Merci pour ton message ! Je suis en mode démo locale. '
        'Mon assistant IA sera connecté dans une prochaine étape.';
  }
}
