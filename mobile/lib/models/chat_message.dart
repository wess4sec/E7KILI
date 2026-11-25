enum MessageAuthor { assistant, user }

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.text,
    required this.author,
    required this.createdAt,
  });

  final String id;
  final String text;
  final MessageAuthor author;
  final DateTime createdAt;

  factory ChatMessage.fromBackendJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      text: (json['content'] as String?) ?? '',
      author: (json['role'] as String?) == 'assistant'
          ? MessageAuthor.assistant
          : MessageAuthor.user,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  bool get isFromUser => author == MessageAuthor.user;
}
