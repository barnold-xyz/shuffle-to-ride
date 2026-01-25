const DEV_SERVER_URL = 'ws://localhost:1999';
const PROD_SERVER_URL = 'wss://shuffle-to-ride.barnold-xyz.partykit.dev';

// __DEV__ is provided by React Native/Expo
declare const __DEV__: boolean;

export const config = {
  serverUrl: __DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL,
};
