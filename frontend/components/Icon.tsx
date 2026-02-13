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
  'ellipsis-horizontal': '⋯',
  'ellipsis-vertical': '⋮',
  'images': '🖼',
  'image': '🖼',
  'folder': '📁',
  'folder-open': '📂',
  'clipboard': '📋',
  'copy': '📋',
  'cut': '✂',
  'link': '🔗',
  'unlink': '⛓',
  'print': '🖨',
  'battery-full': '🔋',
  'wifi': '📶',
  'bluetooth': '🔵',
  'cloud': '☁',
  'cloud-upload': '☁↑',
  'cloud-download': '☁↓',
  'sync': '🔄',
  'flash': '⚡',
  'moon': '🌙',
  'sunny': '☀',
  'partly-sunny': '⛅',
  'rainy': '🌧',
  'snow': '❄',
  'thunderstorm': '⛈',
};

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 24, color = '#fff', style }: IconProps) {
  // On web, always use the fallback emoji/unicode characters
  // since Ionicons font loading is broken in Expo SDK 54
  if (Platform.OS === 'web') {
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

  // On native platforms, use Ionicons normally
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export default Icon;
