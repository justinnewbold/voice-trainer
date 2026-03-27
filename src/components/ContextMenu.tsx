import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

export interface ContextMenuAction {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  children: React.ReactNode;
  actions: ContextMenuAction[];
  disabled?: boolean;
  previewBackgroundColor?: string;
}

export default function ContextMenu({
  children,
  actions,
  disabled = false,
  previewBackgroundColor,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const childRef = useRef<View>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const handleLongPress = useCallback(() => {
    if (disabled) return;

    // Measure child position to place menu near it
    childRef.current?.measureInWindow((x, y, width, height) => {
      // Place menu below or above the item depending on screen position
      const menuHeight = actions.length * 48 + 16; // rough estimate
      const menuWidth = 220;
      let menuX = Math.min(x, screenWidth - menuWidth - 16);
      let menuY = y + height + 8;

      if (menuY + menuHeight > screenHeight - 80) {
        menuY = y - menuHeight - 8;
      }
      menuX = Math.max(16, menuX);

      setMenuPosition({ x: menuX, y: Math.max(60, menuY) });
      setVisible(true);

      // Scale-in animation (iOS-like spring)
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 12,
      }).start();
    });

    // Haptic feedback on long press
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const Haptics = await import('expo-haptics');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      })();
    }
  }, [disabled, actions.length, screenWidth, screenHeight]);

  const dismiss = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, []);

  const handleAction = useCallback((action: ContextMenuAction) => {
    dismiss();
    // Delay action slightly for animation
    setTimeout(() => action.onPress(), 200);
  }, [dismiss]);

  return (
    <>
      <TouchableOpacity
        ref={childRef}
        onLongPress={handleLongPress}
        delayLongPress={400}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={styles.backdrop}>
            <Animated.View
              style={[
                styles.menu,
                {
                  left: menuPosition.x,
                  top: menuPosition.y,
                  transform: [
                    { scale: scaleAnim },
                    {
                      translateY: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnim,
                },
              ]}
            >
              {actions.map((action, i) => (
                <TouchableOpacity
                  key={action.label}
                  style={[
                    styles.menuItem,
                    i < actions.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => handleAction(action)}
                  activeOpacity={0.6}
                >
                  {action.icon && (
                    <Ionicons
                      name={action.icon}
                      size={18}
                      color={action.destructive ? COLORS.danger : COLORS.text}
                      style={styles.menuIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.menuLabel,
                      action.destructive && styles.menuLabelDestructive,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menu: {
    position: 'absolute',
    width: 220,
    backgroundColor: '#1E1E3A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A50',
    overflow: 'hidden',
    // iOS-like shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A5066',
  },
  menuIcon: {
    marginRight: 12,
    width: 20,
  },
  menuLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuLabelDestructive: {
    color: COLORS.danger,
  },
});
