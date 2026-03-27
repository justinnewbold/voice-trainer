import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  onDelete?: () => void;
  onShare?: () => void;
  deleteLabel?: string;
  enabled?: boolean;
  confirmDelete?: boolean;
  confirmMessage?: string;
}

const SWIPE_THRESHOLD = -80;
const ACTION_WIDTH = 80;

export default function SwipeableRow({
  children,
  onDelete,
  onShare,
  deleteLabel = 'Delete',
  enabled = true,
  confirmDelete = true,
  confirmMessage = 'Are you sure you want to delete this?',
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      Alert.alert('Delete', confirmMessage, [
        { text: 'Cancel', style: 'cancel', onPress: () => resetPosition() },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Animate off-screen then delete
            Animated.timing(translateX, {
              toValue: -400,
              duration: 250,
              useNativeDriver: true,
            }).start(() => onDelete?.());
          },
        },
      ]);
    } else {
      Animated.timing(translateX, {
        toValue: -400,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onDelete?.());
    }
  }, [confirmDelete, confirmMessage, onDelete]);

  const resetPosition = useCallback(() => {
    lastOffset.current = 0;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, []);

  if (!enabled || Platform.OS === 'web') {
    // On web, just render children directly
    return <View>{children}</View>;
  }

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      if (translationX < SWIPE_THRESHOLD) {
        // Snap open
        lastOffset.current = -ACTION_WIDTH;
        Animated.spring(translateX, {
          toValue: -ACTION_WIDTH,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      } else {
        // Snap closed
        resetPosition();
      }
    }
  };

  const deleteOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background action buttons */}
      <Animated.View style={[styles.actionsContainer, { opacity: deleteOpacity }]}>
        {onShare && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => {
              resetPosition();
              onShare();
            }}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionText}>{deleteLabel}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable content */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-15, 15]}
        failOffsetY={[-10, 10]}
      >
        <Animated.View
          style={[
            styles.rowContent,
            {
              transform: [{
                translateX: translateX.interpolate({
                  inputRange: [-200, 0],
                  outputRange: [-200, 0],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  shareButton: {
    backgroundColor: COLORS.accent,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  rowContent: {
    backgroundColor: COLORS.surface,
  },
});
