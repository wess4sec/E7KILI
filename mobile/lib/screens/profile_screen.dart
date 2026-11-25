import 'package:flutter/material.dart';

import '../models/user.dart';
import '../theme/app_colors.dart';
import '../widgets/hkili_mascot.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    this.user,
    this.onLogout,
    super.key,
  });

  final User? user;
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    final isGuest = user == null;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 32),
          children: [
            const Text(
              'Profil',
              style: TextStyle(
                color: AppColors.navy,
                fontSize: 28,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 22),
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  const HkiliMascot(size: 112),
                  const SizedBox(height: 10),
                  Text(
                    isGuest ? 'Profil invité' : user!.displayName,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    isGuest ? 'Mode invité' : user!.email,
                    style: const TextStyle(color: AppColors.muted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const _ProfileInfoTile(
              icon: Icons.translate_rounded,
              title: 'Langue',
              value: 'Français (Derja)',
              color: AppColors.violet,
            ),
            const SizedBox(height: 10),
            _ProfileInfoTile(
              icon: Icons.auto_awesome_rounded,
              title: 'Assistant',
              value: isGuest
                  ? 'Mode invité (démo locale)'
                  : 'Assistant IA Gemini',
              color: isGuest ? AppColors.red : AppColors.cyan,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                key: const Key('logout-button'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isGuest ? AppColors.violet : AppColors.red,
                  side: BorderSide(
                    color: isGuest ? AppColors.violet : AppColors.red,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                onPressed: onLogout,
                icon: Icon(
                  isGuest ? Icons.login_rounded : Icons.logout_rounded,
                ),
                label: Text(
                  isGuest
                      ? 'Se connecter / S’inscrire'
                      : 'Se déconnecter',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isGuest
                  ? 'En mode invité, tes messages sont conservés localement.'
                  : 'Connecté en tant que ${user!.email}.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 12,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileInfoTile extends StatelessWidget {
  const _ProfileInfoTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
