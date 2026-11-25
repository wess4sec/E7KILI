class Conversation {
  const Conversation({
    required this.id,
    required this.title,
    required this.ownerId,
    this.lastMessageAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      title: (json['title'] as String?) ?? 'New conversation',
      ownerId: (json['ownerId'] as String?) ?? '',
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  final String id;
  final String title;
  final String ownerId;
  final DateTime? lastMessageAt;
  final DateTime createdAt;
  final DateTime updatedAt;
}
