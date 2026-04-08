import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sipupColors, sipupShadow } from '@/constants/sipup-ui';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useWaterStore } from '@/store/useWaterStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { isValidEmail, normalizeEmail } from '@/utils/email';

export function EmailAuthGate() {
  const insets = useSafeAreaInsets();
  const hydrated = useProfileStore((state) => state.hydrated);
  const currentUserEmail = useProfileStore((state) => state.currentUserEmail);
  const loginWithEmail = useProfileStore((state) => state.loginWithEmail);

  const [emailAddress, setEmailAddress] = useState('');
  const [errorText, setErrorText] = useState('');

  const waterSnapshot = useWaterStore((state) => ({
    companionState: state.companionState,
    drinkLogs: state.drinkLogs,
    goal: state.goal,
    intake: state.intake,
    lastAppOpenDate: state.lastAppOpenDate,
    lastDrinkTimestamp: state.lastDrinkTimestamp,
    lastUpdatedDate: state.lastUpdatedDate,
    lifetimeXp: state.lifetimeXp,
    wakeUpTime: state.wakeUpTime,
  }));
  const historySnapshot = useHistoryStore((state) => ({
    history: state.history,
    streak: state.streak,
  }));
  const workoutSnapshot = useWorkoutStore((state) => ({
    schedule: state.schedule,
  }));

  const normalizedPreview = useMemo(() => {
    const normalizedEmail = normalizeEmail(emailAddress);
    return normalizedEmail || 'Enter your email address';
  }, [emailAddress]);

  if (!hydrated) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}>
        <ActivityIndicator color={sipupColors.primary} size="large" />
        <Text style={styles.loadingTitle}>Preparing your profile database</Text>
        <Text style={styles.loadingCopy}>
          SipUp is loading your saved accounts and hydration history on this device.
        </Text>
      </View>
    );
  }

  if (currentUserEmail) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.keyboardWrap,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 24,
          },
        ]}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Email Login</Text>
          <Text style={styles.title}>Use your email address to open your SipUp profile.</Text>
          <Text style={styles.copy}>
            This build stores accounts locally on the device. Your hydration logs, streak, and
            workout schedule stay attached to the email address you use here.
          </Text>

          <View style={styles.previewChip}>
            <Text style={styles.previewLabel}>Profile key</Text>
            <Text style={styles.previewValue}>{normalizedPreview}</Text>
          </View>

          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmailAddress(value);
              if (errorText) {
                setErrorText('');
              }
            }}
            placeholder="Enter email address"
            placeholderTextColor="#96a0b2"
            selectionColor={sipupColors.primary}
            style={styles.input}
            textContentType="emailAddress"
            value={emailAddress}
          />

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <Pressable
            onPress={() => {
              const normalizedEmail = normalizeEmail(emailAddress);

              if (!isValidEmail(normalizedEmail)) {
                setErrorText('Enter a valid email address.');
                return;
              }

              loginWithEmail(normalizedEmail, {
                history: historySnapshot,
                water: waterSnapshot,
                workout: workoutSnapshot,
              });
              setEmailAddress('');
            }}
            style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continue With Email</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: sipupColors.background,
    zIndex: 30,
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroCard: {
    borderRadius: 36,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    ...sipupShadow,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: sipupColors.primary,
  },
  title: {
    marginTop: 10,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
    color: sipupColors.text,
  },
  copy: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 24,
    color: sipupColors.textSoft,
  },
  previewChip: {
    marginTop: 22,
    borderRadius: 24,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8791a3',
  },
  previewValue: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: sipupColors.text,
  },
  input: {
    marginTop: 18,
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 18,
    fontSize: 20,
    fontWeight: '700',
    color: sipupColors.text,
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#c03d5f',
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 62,
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: sipupColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  loadingScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sipupColors.background,
    paddingHorizontal: 32,
    zIndex: 30,
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: sipupColors.text,
    textAlign: 'center',
  },
  loadingCopy: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: sipupColors.textSoft,
    textAlign: 'center',
  },
});
