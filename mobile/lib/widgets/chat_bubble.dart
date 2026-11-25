import 'package:flutter/material.dart';

import '../models/chat_message.dart';
import '../theme/app_colors.dart';
import 'hkili_mascot.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({required this.message, super.key});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isFromUser = message.isFromUser;
    final bubble = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        color: isFromUser ? null : AppColors.white,
        gradient: isFromUser
            ? const LinearGradient(
                colors: [AppColors.violet, Color(0xFF8060E4)],
              )
            : null,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(20),
          topRight: const Radius.circular(20),
          bottomLeft: Radius.circular(isFromUser ? 20 : 6),
          bottomRight: Radius.circular(isFromUser ? 6 : 20),
        ),
        border: isFromUser ? null : Border.all(color: AppColors.border),
      ),
      child: Text(
        message.text,
        style: TextStyle(
          color: isFromUser ? AppColors.white : AppColors.navy,
          fontSize: 15,
          height: 1.45,
        ),
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        mainAxisAlignment:
            isFromUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isFromUser) ...[
            const HkiliMascot(size: 34),
            const SizedBox(width: 9),
          ],
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.sizeOf(context).width * 0.78,
              ),
              child: bubble,
            ),
          ),
        ],
      ),
    );
  }
}
