import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Icon mapping for web fallback using Unicode/Emoji
const webIcons: Record<string, string> = {
  'add-circle': '+',
  'trophy': '🏆',
  'time': '⏱',
  'settings-outline': '⚙',
  'arrow-back': '←',
  'chevron-forward': '›',
  'chevron-back': '‹',
  'close': '✕',
  'checkmark': '✓',
  'checkmark-circle': '✓',
  'trash': '🗑',
  'create': '✎',
  'download': '↓',
  'share': '↗',
  'camera': '📷',
  'document': '📄',
  'add': '+',
  'remove': '−',
  'information-circle': 'ℹ',
  'alert-circle': '⚠',
  'calendar': '📅',
  'stats-chart': '📊',
  'list': '☰',
  'refresh': '↻',
  'save': '💾',
  'search': '🔍',
  'eye': '👁',
  'eye-off': '👁',
  'lock-closed': '🔒',
  'person': '👤',
  'people': '👥',
  'home': '🏠',
  'help-circle': '?',
  'warning': '⚠',
  'language': '🌐',
  'globe': '🌐',
  'play': '▶',
  'pause': '⏸',
  'stop': '⏹',
  'skip-forward': '⏭',
  'skip-back': '⏮',
  'volume-high': '🔊',
  'volume-low': '🔉',
  'volume-mute': '🔇',
  'location': '📍',
  'map': '🗺',
  'mail': '✉',
  'call': '📞',
  'star': '★',
  'star-outline': '☆',
  'heart': '❤',
  'heart-outline': '♡',
};

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 24, color = '#fff', style }: IconProps) {
  // Always try to use Ionicons first
  // If that fails on web, fall back to text
  const [useFallback, setUseFallback] = React.useState(false);

  // Check if Ionicons font is loaded by examining if the component renders properly
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      // Give Ionicons a chance to load, then check
      const timer = setTimeout(() => {
        // If the icon font isn't loaded, the character will render as a box
        // We can't easily detect this, so we'll use the fallback for web
        setUseFallback(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  if (Platform.OS === 'web' && useFallback) {
    const iconChar = webIcons[name as string] || '•';
    const isEmoji = iconChar.length > 1 || /[\u{1F300}-\u{1F9FF}]/u.test(iconChar);
    
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Text style={{ 
          fontSize: isEmoji ? size * 0.75 : size * 0.9, 
          color: isEmoji ? undefined : color,
          lineHeight: size,
          textAlign: 'center',
          fontWeight: 'bold',
        }}>
          {iconChar}
        </Text>
      </View>
    );
  }

  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export default Icon;
