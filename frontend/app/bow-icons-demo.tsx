import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';

// Option 1: Classic Recurve Bow
const BowIcon1 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 2C2 5 1 9 1 12C1 15 2 19 5 22"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
    />
    <Line x1="5" y1="2" x2="5" y2="22" stroke={color} strokeWidth={1.2} />
    <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={1.8} />
    <Path d="M20 9L23 12L20 15Z" fill={color} />
  </Svg>
);

// Option 2: Compound Bow Style
const BowIcon2 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 3L4 21"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    <Circle cx="4" cy="3" r="2" stroke={color} strokeWidth={1.5} fill="none" />
    <Circle cx="4" cy="21" r="2" stroke={color} strokeWidth={1.5} fill="none" />
    <Path d="M6 3L8 12L6 21" stroke={color} strokeWidth={1} />
    <Line x1="4" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} />
    <Path d="M19 9L22 12L19 15Z" fill={color} />
  </Svg>
);

// Option 3: Longbow with Arrow
const BowIcon3 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 1C3 4 2 8 2 12C2 16 3 20 6 23"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
    <Line x1="6" y1="1" x2="6" y2="23" stroke={color} strokeWidth={1} />
    <Line x1="3" y1="12" x2="23" y2="12" stroke={color} strokeWidth={2} />
    <Path d="M21 10L23 12L21 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 10L3 12L5 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Option 4: Modern Minimal Bow
const BowIcon4 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 2C4 5 3 8 3 12C3 16 4 19 7 22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    <Line x1="7" y1="2" x2="7" y2="22" stroke={color} strokeWidth={1.5} />
    <Line x1="7" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Circle cx="21" cy="12" r="2" fill={color} />
  </Svg>
);

// Option 5: Target & Bow Combo
const BowIcon5 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="16" cy="12" r="6" stroke={color} strokeWidth={1.5} fill="none" />
    <Circle cx="16" cy="12" r="3" stroke={color} strokeWidth={1.5} fill="none" />
    <Circle cx="16" cy="12" r="1" fill={color} />
    <Path
      d="M4 4C2 6 1 9 1 12C1 15 2 18 4 20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    <Line x1="4" y1="4" x2="4" y2="20" stroke={color} strokeWidth={1} />
    <Line x1="4" y1="12" x2="10" y2="12" stroke={color} strokeWidth={1.5} />
  </Svg>
);

// Option 6: Crossed Arrows
const BowIcon6 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="2" y1="22" x2="22" y2="2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M19 2L22 2L22 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 19L2 22L5 22" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="22" y1="22" x2="2" y2="2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M22 19L22 22L19 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 2L2 2L2 5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Option 7: Bow Silhouette
const BowIcon7 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 2C8 2 3 6 3 12C3 18 8 22 8 22L8 2Z"
      fill={color}
      opacity={0.3}
    />
    <Path
      d="M8 2C8 2 3 6 3 12C3 18 8 22 8 22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    <Line x1="8" y1="2" x2="8" y2="22" stroke={color} strokeWidth={1.5} />
    <Line x1="8" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
    <Path d="M20 9L23 12L20 15Z" fill={color} />
  </Svg>
);

// Option 8: Elegant Bow
const BowIcon8 = ({ size = 60, color = '#8B0000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 1C6 1 1 5 1 12C1 19 6 23 6 23"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M6 1C7 2 7 3 6 4"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Path
      d="M6 23C7 22 7 21 6 20"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Path d="M6 1L9 12L6 23" stroke={color} strokeWidth={1} />
    <Line x1="6" y1="12" x2="23" y2="12" stroke={color} strokeWidth={2} />
    <Path d="M21 9L23 12L21 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function BowIconsDemo() {
  const icons = [
    { component: BowIcon1, name: 'Option 1: Classic Recurve' },
    { component: BowIcon2, name: 'Option 2: Compound Style' },
    { component: BowIcon3, name: 'Option 3: Longbow' },
    { component: BowIcon4, name: 'Option 4: Modern Minimal' },
    { component: BowIcon5, name: 'Option 5: Target & Bow' },
    { component: BowIcon6, name: 'Option 6: Crossed Arrows' },
    { component: BowIcon7, name: 'Option 7: Bow Silhouette' },
    { component: BowIcon8, name: 'Option 8: Elegant Bow' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Bow Icon Proposals</Text>
        <Text style={styles.subtitle}>Choose your favorite for the Bows button</Text>
        
        <View style={styles.grid}>
          {icons.map((icon, index) => {
            const IconComponent = icon.component;
            return (
              <View key={index} style={styles.iconCard}>
                <View style={styles.iconContainer}>
                  <IconComponent size={60} color="#8B0000" />
                </View>
                <Text style={styles.iconName}>{icon.name}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconCard: {
    width: '48%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconName: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
});
