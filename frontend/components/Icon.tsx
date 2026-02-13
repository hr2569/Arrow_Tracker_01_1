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
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74486 20.1656 6.23582 20.3766 5.705 20.3766C5.17418 20.3766 4.66514 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95226 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87226 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74486 3.62343 6.23582 3.62343 5.705C3.62343 5.17418 3.83445 4.66514 4.21 4.29C4.58514 3.91445 5.09418 3.70343 5.625 3.70343C6.15582 3.70343 6.66486 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95226 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87226 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58514 20.2966 5.09418 20.2966 5.625C20.2966 6.15582 20.0856 6.66486 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
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
    
    // First try SVG icon components (best quality)
    const SvgIconComponent = SvgIconMap[iconName];
    if (SvgIconComponent) {
      return (
        <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
          <SvgIconComponent size={size} color={color} />
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
