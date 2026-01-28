// Bow icon utilities - shared across all screens
import { ImageSourcePropType } from 'react-native';

// Import bow icons
export const longbowIcon = require('../assets/images/longbow-icon.png');
export const recurveIcon = require('../assets/images/recurve-icon.png');
export const compoundIcon = require('../assets/images/compound-icon.png');
export const otherIcon = require('../assets/images/other-icon.png');

export interface BowIconResult {
  type: 'image';
  value: ImageSourcePropType;
}

export const getBowIcon = (bowType: string): BowIconResult => {
  switch (bowType.toLowerCase()) {
    case 'compound':
      return { type: 'image', value: compoundIcon };
    case 'longbow':
      return { type: 'image', value: longbowIcon };
    case 'recurve':
      return { type: 'image', value: recurveIcon };
    default:
      return { type: 'image', value: otherIcon };
  }
};
