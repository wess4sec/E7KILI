import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppTheme {
  static final light = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.violet,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.violet,
      secondary: AppColors.cyan,
      error: AppColors.red,
      surface: AppColors.white,
      onPrimary: AppColors.white,
      onSecondary: AppColors.navy,
      onSurface: AppColors.navy,
    ),
    scaffoldBackgroundColor: AppColors.background,
    textTheme: const TextTheme().apply(
      bodyColor: AppColors.navy,
      displayColor: AppColors.navy,
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: AppColors.white,
      indicatorColor: Color(0xFFEDE8FD),
      labelTextStyle: WidgetStatePropertyAll(
        TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
