import 'package:flutter/material.dart';

import '../models/chat_message.dart';
import '../theme/app_colors.dart';
import '../widgets/chat_bubble.dart';
import '../widgets/chat_composer.dart';
import '../widgets/hkili_mascot.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    required this.messages,
    required this.isResponding,
    required this.onSend,
    this.isMockMode = false,
    super.key,
  });

  final List<ChatMessage> messages;
  final bool isResponding;
  final Future<bool> Function(String) onSend;
  final bool isMockMode;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollController = ScrollController();

  @override
  void didUpdateWidget(covariant ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.messages.length != widget.messages.length ||
        oldWidget.isResponding != widget.isResponding) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final itemCount = widget.messages.length + (widget.isResponding ? 1 : 0);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 860),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
              child: Row(
                children: [
                  const HkiliMascot(size: 54),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hkili',
                          style: TextStyle(
                            color: AppColors.navy,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Assistant IA tunisien',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.cyan.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.circle, size: 7, color: Color(0xFF12A98C)),
                        SizedBox(width: 6),
                        Text(
                          'En ligne',
                          style: TextStyle(
                            color: AppColors.navy,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 18),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFEDE8FD),
                borderRadius: BorderRadius.circular(13),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.auto_awesome,
                    size: 16,
                    color: AppColors.violet,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.isMockMode
                          ? 'Démo locale · réponses simulées'
                          : 'Les réponses sont générées par Hkili AI',
                      style: const TextStyle(
                        color: AppColors.violet,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                key: const Key('conversation-list'),
                controller: _scrollController,
                padding: const EdgeInsets.fromLTRB(18, 20, 18, 14),
                itemCount: itemCount,
                itemBuilder: (context, index) {
                  if (index >= widget.messages.length) {
                    return const _TypingIndicator();
                  }
                  final message = widget.messages[index];
                  return ChatBubble(
                    key: ValueKey(message.id),
                    message: message,
                  );
                },
              ),
            ),
            ChatComposer(onSend: widget.onSend, isSending: widget.isResponding),
          ],
        ),
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(bottom: 14),
      child: Row(
        children: [
          HkiliMascot(size: 34),
          SizedBox(width: 9),
          DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.all(Radius.circular(18)),
              border: Border.fromBorderSide(
                BorderSide(color: AppColors.border),
              ),
            ),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 13, vertical: 11),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 15,
                    height: 15,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.violet,
                    ),
                  ),
                  SizedBox(width: 9),
                  Text(
                    'Hkili réfléchit...',
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
