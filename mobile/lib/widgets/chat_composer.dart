import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class ChatComposer extends StatefulWidget {
  const ChatComposer({
    required this.onSend,
    required this.isSending,
    super.key,
  });

  final Future<bool> Function(String) onSend;
  final bool isSending;

  @override
  State<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<ChatComposer> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final message = _controller.text.trim();
    if (message.isEmpty || widget.isSending) {
      return;
    }

    final sent = await widget.onSend(message);
    if (mounted && sent) {
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 820),
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 5, 7, 5),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: AppColors.navy.withValues(alpha: 0.04),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    key: const Key('chat-input'),
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(
                      hintText: 'Écris ton message...',
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  key: const Key('send-button'),
                  onPressed: widget.isSending ? null : _submit,
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.violet,
                    disabledBackgroundColor: AppColors.violet.withValues(
                      alpha: 0.45,
                    ),
                    foregroundColor: AppColors.white,
                    fixedSize: const Size(46, 46),
                  ),
                  tooltip: 'Envoyer',
                  icon: const Icon(Icons.arrow_upward_rounded, size: 21),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
