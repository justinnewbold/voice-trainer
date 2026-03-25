// This screen is never actually rendered — the More tab opens a drawer instead.
// It exists so Expo Router registers the tab route.
import { View } from 'react-native';
export default function MorePlaceholder() { return <View />; }
