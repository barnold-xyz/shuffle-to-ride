import { ImageSourcePropType } from 'react-native';
import { CardColor } from './types';

// Card images - replace placeholder with actual generated images
// Expected file names in assets/cards/:
//   red.png, orange.png, yellow.png, green.png,
//   blue.png, purple.png, black.png, white.png, locomotive.png

export const CARD_IMAGES: Record<CardColor, ImageSourcePropType> = {
  red: require('../assets/cards/red.png'),
  orange: require('../assets/cards/orange.png'),
  yellow: require('../assets/cards/yellow.png'),
  green: require('../assets/cards/green.png'),
  blue: require('../assets/cards/blue.png'),
  purple: require('../assets/cards/purple.png'),
  black: require('../assets/cards/black.png'),
  white: require('../assets/cards/white.png'),
  locomotive: require('../assets/cards/locomotive.png'),
};
