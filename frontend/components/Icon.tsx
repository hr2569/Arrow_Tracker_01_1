import React from 'react';
import { Platform, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

// Custom SVG icon components for web
const AddCircleIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path d="M12 7v10M7 12h10" stroke={color === '#fff' ? '#8B0000' : '#1e1e1e'} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const TrophyIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M12 15V18M8 21H16M6 3H18V7C18 10.3137 15.3137 13 12 13C8.68629 13 6 10.3137 6 7V3Z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M6 5H3V7C3 8.65685 4.34315 10 6 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <Path d="M18 5H21V7C21 8.65685 19.6569 10 18 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const TimeIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path d="M12 7V12L15 15" stroke={color === '#8B0000' ? '#1e1e1e' : '#121212'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SettingsIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/>
    <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
);

const ArrowBackIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M19 12H5M12 19L5 12L12 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const ChevronForwardIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const AddIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
  </Svg>
);

const CloseIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
  </Svg>
);

const CheckmarkIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const TrashIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const GlobeIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <Path d="M2 12H22M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22C9.5 19.5 8 16 8 12C8 8 9.5 4.5 12 2Z" stroke={color} strokeWidth="2" fill="none"/>
  </Svg>
);

const CloudIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M18 10H16.74C15.67 6.38 12.16 4 8.5 4C4.36 4 1 7.36 1 11.5C1 15.64 4.36 19 8.5 19H18C20.76 19 23 16.76 23 14C23 11.24 20.76 9 18 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

const CloudUploadIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M16 16L12 12L8 16M12 12V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <Path d="M20.39 18.39C21.4 17.54 22 16.33 22 15C22 12.24 19.76 10 17 10H15.74C14.67 6.38 11.16 4 7.5 4C3.36 4 0 7.36 0 11.5C0 14.13 1.4 16.44 3.5 17.7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

// Map icon names to components
const SvgIconMap: Record<string, React.FC<{ size: number; color: string }>> = {
  'add-circle': AddCircleIcon,
  'trophy': TrophyIcon,
  'time': TimeIcon,
  'settings-outline': SettingsIcon,
  'arrow-back': ArrowBackIcon,
  'chevron-forward': ChevronForwardIcon,
  'add': AddIcon,
  'close': CloseIcon,
  'checkmark': CheckmarkIcon,
  'trash': TrashIcon,
  'globe': GlobeIcon,
  'cloud': CloudIcon,
  'cloud-upload': CloudUploadIcon,
};

// Fallback unicode/emoji for icons without SVG
const webIconsFallback: Record<string, string> = {
  'chevron-back': '‹',
  'checkmark-circle': '✓',
  'create': '✎',
  'download': '↓',
  'share': '↗',
  'camera': '📷',
  'document': '📄',
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
  'play': '▶',
  'pause': '⏸',
  'stop': '⏹',
  'ellipsis-horizontal': '⋯',
  'ellipsis-vertical': '⋮',
  'images': '🖼',
  'image': '🖼',
  'folder': '📁',
  'link': '🔗',
  'flash': '⚡',
  'moon': '🌙',
  'sunny': '☀',
};

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 24, color = '#fff', style }: IconProps) {
  // On web, use SVG icons for better display
  if (Platform.OS === 'web') {
    const iconName = name as string;
    
    // First try SVG icons (best quality)
    if (SvgIcons[iconName]) {
      return (
        <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
          {SvgIcons[iconName](size, color)}
        </View>
      );
    }
    
    // Fallback to unicode/emoji
    const iconChar = webIconsFallback[iconName] || '•';
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
