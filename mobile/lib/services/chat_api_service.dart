import '../models/chat_message.dart';
import '../models/conversation.dart';
import '../models/api_exception.dart';
import 'api_client.dart';

class ChatApiService {
  ChatApiService({required this.apiClient});

  final ApiClient apiClient;

  Future<List<Conversation>> listConversations({
    int page = 1,
    int limit = 20,
  }) async {
    final data = await apiClient.get(
      '/conversations',
      queryParams: {'page': '$page', 'limit': '$limit'},
    );
    final list = (data as Map<String, dynamic>)['conversations'] as List;
    return list
        .map((item) => Conversation.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<({Conversation conversation, List<ChatMessage> messages})>
  getConversationWithMessages(
    String conversationId, {
    int page = 1,
    int limit = 50,
  }) async {
    final data = await apiClient.get(
      '/conversations/$conversationId',
      queryParams: {'page': '$page', 'limit': '$limit'},
    );
    final map = data as Map<String, dynamic>;
    final conv = Conversation.fromJson(
      map['conversation'] as Map<String, dynamic>,
    );
    final msgList = (map['messages'] as List)
        .map(
          (item) => ChatMessage.fromBackendJson(item as Map<String, dynamic>),
        )
        .toList();

    return (conversation: conv, messages: msgList);
  }

  Future<Conversation> renameConversation(
    String conversationId,
    String newTitle,
  ) async {
    final data = await apiClient.patch(
      '/conversations/$conversationId',
      body: {'title': newTitle.trim()},
    );
    final convJson =
        (data as Map<String, dynamic>)['conversation'] as Map<String, dynamic>;
    return Conversation.fromJson(convJson);
  }

  Future<void> deleteConversation(String conversationId) async {
    await apiClient.delete('/conversations/$conversationId');
  }

  Future<
    ({
      String conversationId,
      ChatMessage userMessage,
      ChatMessage assistantMessage,
    })
  >
  sendMessage(String? conversationId, String content, {String? title}) async {
    final data = await apiClient.post(
      '/chat',
      body: {
        'message': content.trim(),
        'conversationId': ?conversationId,
        if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      },
    );
    final map = data as Map<String, dynamic>;

    ChatMessage assistantMsg;
    ChatMessage userMsg;
    final responseConversationId = map['conversationId'];

    if (responseConversationId is String &&
        map['userMessage'] is Map<String, dynamic> &&
        map['assistantMessage'] is Map<String, dynamic>) {
      userMsg = ChatMessage.fromBackendJson(
        map['userMessage'] as Map<String, dynamic>,
      );
      assistantMsg = ChatMessage.fromBackendJson(
        map['assistantMessage'] as Map<String, dynamic>,
      );
    } else {
      throw ApiException(
        statusCode: 502,
        code: 'INVALID_API_RESPONSE',
        message: 'Le serveur a retourné une réponse de chat invalide.',
      );
    }

    return (
      conversationId: responseConversationId,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    );
  }
}
