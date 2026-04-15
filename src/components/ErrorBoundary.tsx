import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console in dev — replace with Sentry/Bugsnag in production
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleToggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, showDetails } = this.state;
    const title = this.props.fallbackTitle ?? 'Something went wrong';

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={52} color="#EF4444" />
          </View>

          {/* Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>
            Voice Trainer hit an unexpected error. Your practice data is safe — tap below to reload.
          </Text>

          {/* Retry */}
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Reload App</Text>
          </TouchableOpacity>

          {/* Details toggle (dev-friendly) */}
          <TouchableOpacity style={styles.detailsToggle} onPress={this.handleToggleDetails}>
            <Text style={styles.detailsToggleText}>
              {showDetails ? 'Hide details' : 'Show error details'}
            </Text>
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#475569"
            />
          </TouchableOpacity>

          {showDetails && (
            <View style={styles.detailsBox}>
              <Text style={styles.detailsLabel}>Error</Text>
              <Text style={styles.detailsText}>{error?.toString() ?? 'Unknown error'}</Text>
              {errorInfo?.componentStack ? (
                <>
                  <Text style={[styles.detailsLabel, { marginTop: 12 }]}>Component stack</Text>
                  <Text style={styles.detailsText} numberOfLines={12}>
                    {errorInfo.componentStack.trim()}
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}

// ── Screen-level boundary (lighter, for individual screens) ──────────────────
interface ScreenBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends React.Component<Props, ScreenBoundaryState> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ScreenBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={screenStyles.container}>
        <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
        <Text style={screenStyles.title}>
          {this.props.fallbackTitle ?? 'Couldn\'t load this screen'}
        </Text>
        <Text style={screenStyles.body}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <TouchableOpacity style={screenStyles.btn} onPress={this.handleRetry}>
          <Text style={screenStyles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EF444422',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EF444444',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 13,
    color: '#475569',
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#13132A',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
});

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
