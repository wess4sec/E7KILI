import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class HkiliMascot extends StatelessWidget {
  const HkiliMascot({super.key, this.size = 144});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _HkiliMascotPainter(),
      ),
    );
  }
}

class _HkiliMascotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas
      ..save()
      ..scale(size.width / 100, size.height / 100);

    final whitePaint = Paint()..color = AppColors.white;
    final outlinePaint = Paint()
      ..color = const Color(0xFFDCE0EC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;
    final redPaint = Paint()..color = AppColors.red;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(30, 67, 40, 30),
        const Radius.circular(15),
      ),
      whitePaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(30, 67, 40, 30),
        const Radius.circular(15),
      ),
      outlinePaint,
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(5, 42, 13, 14),
        const Radius.circular(6),
      ),
      whitePaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(82, 42, 13, 14),
        const Radius.circular(6),
      ),
      whitePaint,
    );

    final head = RRect.fromRectAndRadius(
      const Rect.fromLTWH(12, 19, 76, 59),
      const Radius.circular(22),
    );
    canvas.drawRRect(
      head,
      Paint()
        ..color = AppColors.navy.withValues(alpha: 0.12)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );
    canvas.drawRRect(head, whitePaint);
    canvas.drawRRect(head, outlinePaint);

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(18, 32, 64, 34),
        const Radius.circular(14),
      ),
      Paint()..color = AppColors.navy,
    );

    final eyeGlow = Paint()
      ..color = AppColors.cyan.withValues(alpha: 0.25)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);
    final eyePaint = Paint()..color = AppColors.cyan;

    for (final center in const [Offset(37, 47), Offset(63, 47)]) {
      canvas
        ..drawCircle(center, 8, eyeGlow)
        ..drawCircle(center, 4.8, eyePaint);
    }

    final smilePaint = Paint()
      ..color = AppColors.cyan
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(
      Path()
        ..moveTo(44, 57)
        ..quadraticBezierTo(50, 62, 56, 57),
      smilePaint,
    );

    // Traditional Tunisian red chechia
    final chechiaPath = Path()
      ..moveTo(29, 23)
      ..lineTo(32, 9)
      ..quadraticBezierTo(32, 4, 39, 4)
      ..lineTo(61, 4)
      ..quadraticBezierTo(68, 4, 68, 9)
      ..lineTo(71, 23)
      ..close();

    canvas.drawPath(chechiaPath, redPaint);

    // Chechia lower rim
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(25, 20, 50, 6),
        const Radius.circular(3),
      ),
      redPaint,
    );

    final scarf = Path()
      ..moveTo(18, 68)
      ..quadraticBezierTo(50, 73, 82, 68)
      ..lineTo(79, 76)
      ..quadraticBezierTo(50, 81, 21, 76)
      ..close();

    canvas.drawPath(scarf, redPaint);
    canvas.drawPath(
      Path()
        ..moveTo(76, 74)
        ..lineTo(89, 78)
        ..lineTo(83, 91)
        ..lineTo(75, 82)
        ..close(),
      redPaint,
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}