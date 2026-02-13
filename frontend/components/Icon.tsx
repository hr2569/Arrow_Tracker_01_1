import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, G } from 'react-native-svg';

// SVG Icons for better web display - matching Ionicons style
const SvgIcons: Record<string, (size: number, color: string) => React.ReactNode> = {
  'add-circle': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M12 7v10M7 12h10" stroke={color === '#fff' ? '#8B0000' : '#121212'} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  ),
  'trophy': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M400 80H112c-8.84 0-16 7.16-16 16v32c0 61.86 44.63 113.2 104 124.25V320H144c-17.67 0-32 14.33-32 32v32h288v-32c0-17.67-14.33-32-32-32h-56v-67.75c59.37-11.05 104-62.39 104-124.25V96c0-8.84-7.16-16-16-16zM64 96c0-8.84-7.16-16-16-16H16c-8.84 0-16 7.16-16 16v32c0 44.18 35.82 80 80 80h16v-32H80c-26.47 0-48-21.53-48-48V96h32zm432-16h-32c-8.84 0-16 7.16-16 16v32c0 26.47-21.53 48-48 48h-16v32h16c44.18 0 80-35.82 80-80V96c0-8.84-7.16-16-16-16z" 
        fill="none" 
        stroke={color} 
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  'time': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M12 7v5l3 3" stroke={color === '#8B0000' ? '#1e1e1e' : '#121212'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  'settings-outline': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75A164.48 164.48 0 01325 400.8a15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54a11.11 11.11 0 01-10.69-8.87l-6.72-47.82a16.07 16.07 0 00-9-12.22 155.3 155.3 0 01-21.46-12.57 16 16 0 00-15.11-1.71l-44.89 18.07a10.81 10.81 0 01-13.14-4.58l-42.77-74a10.8 10.8 0 012.45-13.75l38.21-30a16.05 16.05 0 006-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 00-6.07-13.94l-38.19-30A10.81 10.81 0 0149.48 186l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0015.17-1.75A164.48 164.48 0 01187 111.2a15.94 15.94 0 008.82-12.14l6.73-47.89A11.08 11.08 0 01213.23 42h85.54a11.11 11.11 0 0110.69 8.87l6.72 47.82a16.07 16.07 0 009 12.22 155.3 155.3 0 0121.46 12.57 16 16 0 0015.11 1.71l44.89-18.07a10.81 10.81 0 0113.14 4.58l42.77 74a10.8 10.8 0 01-2.45 13.75l-38.21 30a16.05 16.05 0 00-6.05 14.08c.33 4.14.55 8.3.55 12.47z"
        fill="none"
        stroke={color}
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  'arrow-back': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M244 400L100 256l144-144M120 256h292" 
        fill="none" 
        stroke={color} 
        strokeWidth="48" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </Svg>
  ),
  'chevron-forward': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M184 112l144 144-144 144" 
        fill="none" 
        stroke={color} 
        strokeWidth="48" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </Svg>
  ),
  'add': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M256 112v288M400 256H112" 
        fill="none" 
        stroke={color} 
        strokeWidth="48" 
        strokeLinecap="round" 
      />
    </Svg>
  ),
  'close': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M368 368L144 144M368 144L144 368" 
        fill="none" 
        stroke={color} 
        strokeWidth="48" 
        strokeLinecap="round" 
      />
    </Svg>
  ),
  'checkmark': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M416 128L192 384l-96-96" 
        fill="none" 
        stroke={color} 
        strokeWidth="48" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </Svg>
  ),
  'trash': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d="M112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320" fill="none" stroke={color} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M80 112h352M192 112V72h0a23.93 23.93 0 0124-24h80a23.93 23.93 0 0124 24h0v40" fill="none" stroke={color} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  ),
  'globe': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z" fill="none" stroke={color} strokeWidth="32" strokeMiterlimit="10"/>
      <Path d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z" fill="none" stroke={color} strokeWidth="32" strokeMiterlimit="10"/>
      <Path d="M117.33 117.33c38.24 27.15 86.38 43.34 138.67 43.34s100.43-16.19 138.67-43.34M394.67 394.67c-38.24-27.15-86.38-43.34-138.67-43.34s-100.43 16.19-138.67 43.34" fill="none" stroke={color} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M256 48v416M464 256H48" fill="none" stroke={color} strokeWidth="32" strokeMiterlimit="10"/>
    </Svg>
  ),
  'cloud': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path 
        d="M400 240c-8.89-89.54-71-144-144-144-69 0-113.44 48.2-128 96-60 6-112 43.59-112 112 0 66 54 112 120 112h260c55 0 100-27.44 100-88 0-59.82-53-85.76-96-88z" 
        fill="none" 
        stroke={color} 
        strokeWidth="32" 
        strokeLinejoin="round" 
      />
    </Svg>
  ),
  'cloud-upload': (size, color) => (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8-69 0-113.44 45.79-128 91.2-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56" fill="none" stroke={color} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M320 255.79l-64-64-64 64M256 448.21V207.79" fill="none" stroke={color} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  ),
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
