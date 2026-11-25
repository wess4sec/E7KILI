import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../widgets/gradient_button.dart';
import '../widgets/hkili_mascot.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({required this.onGetStarted, super.key});

  final VoidCallback onGetStarted;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned(
            top: -105,
            right: -85,
            child: _SoftCircle(
              diameter: 250,
              color: AppColors.cyan.withValues(alpha: 0.11),
            ),
          ),
          Positioned(
            bottom: -130,
            left: -105,
            child: _SoftCircle(
              diameter: 290,
              color: AppColors.violet.withValues(alpha: 0.08),
            ),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 500),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(28, 28, 28, 32),
                          child: TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0, end: 1),
                            duration: const Duration(milliseconds: 850),
                            curve: Curves.easeOutCubic,
                            builder: (context, value, child) => Opacity(
                              opacity: value,
                              child: Transform.translate(
                                offset: Offset(0, (1 - value) * 18),
                                child: child,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const SizedBox(height: 18),
                                const HkiliMascot(size: 216),
                                const SizedBox(height: 4),
                                const Text(
                                  'Hkili',
                                  style: TextStyle(
                                    color: AppColors.navy,
                                    fontSize: 46,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -1.5,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Pose • Discute • Découvre',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppColors.violet,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.15,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Votre assistant IA tunisien',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 34),
                                GradientButton(
                                  label: 'Commencer',
                                  onPressed: onGetStarted,
                                ),
                                const SizedBox(height: 20),
                                const Text(
                                  'Une conversation qui te ressemble',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SoftCircle extends StatelessWidget {
  const _SoftCircle({
    required this.diameter,
    required this.color,
  });

  final double diameter;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: diameter,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
