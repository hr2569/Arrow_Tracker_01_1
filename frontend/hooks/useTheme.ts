import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { themes, ThemeColors } from '../constants/theme';

export function useTheme(): ThemeColors {
  const { theme } = useSettingsStore();
  const systemColorScheme = useColorScheme();

  // Determine which theme to use
  if (theme === 'system') {
    return systemColorScheme === 'light' ? themes.light : themes.dark;
  }
  
  return themes[theme] || themes.dark;
}
