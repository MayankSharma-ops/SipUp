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
import {
  requestEmailOtp,
  saveRemoteProfile,
  verifyEmailOtp,
} from '@/utils/api';
import { isValidEmail, normalizeEmail } from '@/utils/email';

type AuthStep = 'email' | 'otp';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export function EmailAuthGate() {
  const insets = useSafeAreaInsets();
  const hydrated = useProfileStore((state) => state.hydrated);
  const currentUserEmail = useProfileStore((state) => state.currentUserEmail);
  const setAuthenticatedSession = useProfileStore((state) => state.setAuthenticatedSession);

  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const localProfileSnapshot = useMemo(
    () => ({
      history: historySnapshot,
      water: waterSnapshot,
      workout: workoutSnapshot,
    }),
    [historySnapshot, waterSnapshot, workoutSnapshot]
  );

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
        <Text style={styles.loadingTitle}>Connecting your account</Text>
        <Text style={styles.loadingCopy}>
          SipUp is loading your saved session and profile cache.
        </Text>
      </View>
    );
  }

  if (currentUserEmail) {
    return null;
  }

  const handleRequestOtp = async () => {
    const normalizedEmail = normalizeEmail(emailAddress);

    if (!isValidEmail(normalizedEmail)) {
      setErrorText('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    setInfoText('');

    try {
      const response = await requestEmailOtp(normalizedEmail);
      setAuthStep('otp');
      setInfoText(response.message);
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedEmail = normalizeEmail(emailAddress);
    const normalizedOtp = otpCode.replace(/\D/g, '').slice(0, 6);

    if (!isValidEmail(normalizedEmail)) {
      setErrorText('Enter a valid email address.');
      setAuthStep('email');
      return;
    }

    if (normalizedOtp.length !== 6) {
      setErrorText('Enter the 6-digit OTP from your email.');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    setInfoText('');

    try {
      const response = await verifyEmailOtp(normalizedEmail, normalizedOtp);
      let profile = response.profile;
      let profileUpdatedAt = response.profileUpdatedAt;

      if (response.isNewUser) {
        try {
          const seededProfile = await saveRemoteProfile(response.sessionToken, localProfileSnapshot);
          profile = seededProfile.profile;
          profileUpdatedAt = seededProfile.profileUpdatedAt;
        } catch (seedError) {
          console.warn('[auth] Initial Neon profile seed failed. The app will retry on sync.', seedError);
        }
      }

      setAuthenticatedSession({
        profile,
        profileUpdatedAt,
        sessionToken: response.sessionToken,
        user: response.user,
      });

      setAuthStep('email');
      setEmailAddress('');
      setOtpCode('');
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Text style={styles.eyebrow}>Neon Email Login</Text>
          <Text style={styles.title}>
            {authStep === 'email'
              ? 'Send a one-time password to your email.'
              : 'Enter the OTP from your inbox to finish signing in.'}
          </Text>
          <Text style={styles.copy}>
            SipUp now authenticates through your backend. We send OTP emails with Nodemailer and
            store your profile data in Neon PostgreSQL.
          </Text>

          <View style={styles.previewChip}>
            <Text style={styles.previewLabel}>Email address</Text>
            <Text style={styles.previewValue}>{normalizedPreview}</Text>
          </View>

          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting && authStep === 'email'}
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
            style={[
              styles.input,
              authStep === 'otp' ? styles.inputLocked : null,
            ]}
            textContentType="emailAddress"
            value={emailAddress}
          />

          {authStep === 'otp' ? (
            <>
              <TextInput
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => {
                  setOtpCode(value.replace(/\D/g, '').slice(0, 6));
                  if (errorText) {
                    setErrorText('');
                  }
                }}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#96a0b2"
                selectionColor={sipupColors.primary}
                style={styles.input}
                textContentType="oneTimeCode"
                value={otpCode}
              />
              <Text style={styles.helperText}>
                We sent a verification code to {normalizedPreview}. It expires in a few minutes.
              </Text>
            </>
          ) : null}

          {infoText ? <Text style={styles.infoText}>{infoText}</Text> : null}
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={authStep === 'email' ? handleRequestOtp : handleVerifyOtp}
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? 'Please wait...'
                : authStep === 'email'
                  ? 'Send OTP'
                  : 'Verify OTP'}
            </Text>
          </Pressable>

          {authStep === 'otp' ? (
            <View style={styles.secondaryActions}>
              <Pressable
                disabled={isSubmitting}
                onPress={() => {
                  setAuthStep('email');
                  setOtpCode('');
                  setInfoText('');
                  setErrorText('');
                }}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Change Email</Text>
              </Pressable>

              <Pressable
                disabled={isSubmitting}
                onPress={handleRequestOtp}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Resend OTP</Text>
              </Pressable>
            </View>
          ) : null}
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
  inputLocked: {
    color: '#758095',
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: sipupColors.textSoft,
  },
  infoText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#27528e',
    fontWeight: '600',
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
  buttonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: sipupColors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: sipupColors.textSoft,
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
