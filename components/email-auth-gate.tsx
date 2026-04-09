import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InitialAccessScreen } from '@/components/initial-access-screen';
import { sipupColors, sipupShadow } from '@/constants/sipup-ui';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useWaterStore } from '@/store/useWaterStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  loginWithPassword,
  requestEmailOtp,
  saveRemoteProfile,
  verifyEmailOtp,
} from '@/utils/api';
import { isValidEmail, normalizeEmail } from '@/utils/email';

type AuthMode = 'signup' | 'login';
type EntryStage = 'initial-access' | 'auth';

const AUTH_ARTWORK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBm3VDp3oIT0KJB3EnXz38VhijOsBIhv5ab11vxIgz6xMcDPhO9ha6mPDHexz_mVys5bfrklYUv6ofgLipqcJFFZL42i1iVR3ZEh5XXnff8exrvAbPhzBQtSXGcuvPVRthnRRTXzCwEG1RiDvpEeIiudZctJ0xY6E3yDY3DPf9jftwynYpEDhMLbn48Aca1oS1RlwlEz4QMQepsWmOXZuPjYttd9xYgy70181oYEP-qliLInun3DTMPc1YGrQMo1ZqS9PJHwRz3cve7';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function AuthField({
  autoCapitalize,
  autoComplete,
  editable = true,
  icon,
  keyboardType,
  label,
  maxLength,
  onChangeText,
  placeholder,
  rightAction,
  secureTextEntry,
  textContentType,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  editable?: boolean;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  label: string;
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  rightAction?: React.ReactNode;
  secureTextEntry?: boolean;
  textContentType?: React.ComponentProps<typeof TextInput>['textContentType'];
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldShell, !editable ? styles.fieldShellLocked : null]}>
        <MaterialIcons color="#a5a8b3" name={icon} size={28} style={styles.fieldIcon} />
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#b8bcc9"
          secureTextEntry={secureTextEntry}
          selectionColor={sipupColors.primary}
          style={styles.fieldInput}
          textContentType={textContentType}
          value={value}
        />
        {rightAction ? <View style={styles.fieldRightAction}>{rightAction}</View> : null}
      </View>
    </View>
  );
}

export function EmailAuthGate() {
  const insets = useSafeAreaInsets();
  const hydrated = useProfileStore((state) => state.hydrated);
  const currentUserEmail = useProfileStore((state) => state.currentUserEmail);
  const setAuthenticatedSession = useProfileStore((state) => state.setAuthenticatedSession);

  const [entryStage, setEntryStage] = useState<EntryStage>('initial-access');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [hasRequestedOtp, setHasRequestedOtp] = useState(false);
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

  const normalizedEmail = useMemo(() => normalizeEmail(emailAddress), [emailAddress]);
  const otpActionLabel = hasRequestedOtp ? 'RESEND' : 'SEND';
  const heading = authMode === 'signup' ? 'Create Account' : 'Log In';
  const subheading =
    authMode === 'signup'
      ? 'Enter your credentials to begin your hydration journey.'
      : 'Enter your email and password to access your hydration dashboard.';

  const clearFeedback = () => {
    if (errorText) {
      setErrorText('');
    }

    if (infoText) {
      setInfoText('');
    }
  };

  useEffect(() => {
    setOtpCode('');
    setHasRequestedOtp(false);
    setErrorText('');
    setInfoText('');
    setPassword('');
    setConfirmPassword('');
  }, [authMode]);

  useEffect(() => {
    if (!currentUserEmail) {
      setEntryStage('initial-access');
      setAuthMode('login');
    }
  }, [currentUserEmail]);

  if (!hydrated) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}>
        <ActivityIndicator color={sipupColors.primary} size="large" />
        <Text style={styles.loadingTitle}>Loading secure access</Text>
        <Text style={styles.loadingCopy}>
          Preparing your SipUp session and profile cache.
        </Text>
      </View>
    );
  }

  if (currentUserEmail) {
    return null;
  }

  const handleContinueToAuth = () => {
    clearFeedback();
    setAuthMode('login');
    setEntryStage('auth');
  };

  if (entryStage === 'initial-access') {
    return <InitialAccessScreen onContinue={handleContinueToAuth} />;
  }

  const validateSignupFields = () => {
    if (password.length < 8) {
      setErrorText('Create a password with at least 8 characters.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorText('Passwords do not match yet.');
      return false;
    }

    return true;
  };

  const handleEmailChange = (value: string) => {
    if (authMode === 'signup' && hasRequestedOtp) {
      setHasRequestedOtp(false);
      setOtpCode('');
    }

    clearFeedback();
    setEmailAddress(value);
  };

  const handlePasswordChange = (value: string) => {
    clearFeedback();
    setPassword(value);
  };

  const handleConfirmPasswordChange = (value: string) => {
    clearFeedback();
    setConfirmPassword(value);
  };

  const handleOtpChange = (value: string) => {
    clearFeedback();
    setOtpCode(value.replace(/\D/g, '').slice(0, 6));
  };

  const handleSendOtp = async () => {
    if (!isValidEmail(normalizedEmail)) {
      setErrorText('Enter a valid email address.');
      return;
    }

    if (!validateSignupFields()) {
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    setInfoText('');

    try {
      const response = await requestEmailOtp(normalizedEmail);
      setHasRequestedOtp(true);
      setInfoText(response.message);
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeAuthentication = (response: {
    profile: typeof localProfileSnapshot;
    profileUpdatedAt: string | null;
    sessionToken: string;
    user: {
      id: string;
      email: string;
      createdAt: string;
      lastLoginAt: string | null;
    };
  }) => {
    setAuthenticatedSession({
      profile: response.profile,
      profileUpdatedAt: response.profileUpdatedAt,
      sessionToken: response.sessionToken,
      user: response.user,
    });

    setEmailAddress('');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setHasRequestedOtp(false);
  };

  const handleFinalize = async () => {
    if (!isValidEmail(normalizedEmail)) {
      setErrorText('Enter a valid email address.');
      return;
    }

    if (authMode === 'login') {
      if (!password) {
        setErrorText('Enter your password.');
        return;
      }

      setIsSubmitting(true);
      setErrorText('');
      setInfoText('');

      try {
        const response = await loginWithPassword(normalizedEmail, password);
        completeAuthentication(response);
      } catch (error) {
        setErrorText(getErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!validateSignupFields()) {
      return;
    }

    if (!hasRequestedOtp) {
      setErrorText('Send the OTP first, then enter the 6-digit code.');
      return;
    }

    const normalizedOtp = otpCode.replace(/\D/g, '').slice(0, 6);
    if (normalizedOtp.length !== 6) {
      setErrorText('Enter the 6-digit OTP from your email.');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    setInfoText('');

    try {
      const response = await verifyEmailOtp(normalizedEmail, normalizedOtp, password);
      let profile = response.profile;
      let profileUpdatedAt = response.profileUpdatedAt;

      if (response.isNewUser) {
        try {
          const seededProfile = await saveRemoteProfile(response.sessionToken, localProfileSnapshot);
          profile = seededProfile.profile;
          profileUpdatedAt = seededProfile.profileUpdatedAt;
        } catch (seedError) {
          console.warn(
            '[auth] Initial Neon profile seed failed. The app will retry on sync.',
            seedError
          );
        }
      }

      completeAuthentication({
        profile,
        profileUpdatedAt,
        sessionToken: response.sessionToken,
        user: response.user,
      });
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.backgroundGradientTopLeft} />
      <View style={styles.backgroundGradientBottomLeft} />
      <View style={styles.backgroundGradientRight} />
      <Image contentFit="cover" source={{ uri: AUTH_ARTWORK }} style={styles.backgroundArtwork} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}>
        <ScrollView
          bounces={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}>
          <View style={styles.authCard}>
            <View style={styles.modeSwitch}>
              <Pressable
                onPress={() => setAuthMode('signup')}
                style={[
                  styles.modeChip,
                  authMode === 'signup' ? styles.modeChipActive : null,
                ]}>
                <Text
                  style={[
                    styles.modeChipText,
                    authMode === 'signup' ? styles.modeChipTextActive : null,
                  ]}>
                  Sign Up
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAuthMode('login')}
                style={[
                  styles.modeChip,
                  authMode === 'login' ? styles.modeChipActive : null,
                ]}>
                <Text
                  style={[
                    styles.modeChipText,
                    authMode === 'login' ? styles.modeChipTextActive : null,
                  ]}>
                  Log In
                </Text>
              </Pressable>
            </View>

            <Text style={styles.eyebrow}>SipUp Clinical</Text>
            <Text style={styles.title}>{heading}</Text>
            <Text style={styles.subtitle}>{subheading}</Text>

            <View style={styles.form}>
              <AuthField
                autoCapitalize="none"
                autoComplete="email"
                icon="mail"
                keyboardType="email-address"
                label="Email Address"
                onChangeText={handleEmailChange}
                placeholder="name@medical.com"
                textContentType="emailAddress"
                value={emailAddress}
              />

              {authMode === 'signup' ? (
                <>
                  <AuthField
                    autoComplete="password-new"
                    icon="lock"
                    label="Create Password"
                    onChangeText={handlePasswordChange}
                    placeholder="Create a strong password"
                    secureTextEntry
                    textContentType="newPassword"
                    value={password}
                  />
                  <AuthField
                    autoComplete="password-new"
                    icon="enhanced-encryption"
                    label="Retype Password"
                    onChangeText={handleConfirmPasswordChange}
                    placeholder="Retype your password"
                    secureTextEntry
                    textContentType="password"
                    value={confirmPassword}
                  />
                  <AuthField
                    icon="verified-user"
                    keyboardType="number-pad"
                    label="Secure Verification Code (OTP)"
                    maxLength={6}
                    onChangeText={handleOtpChange}
                    placeholder="6-digit code"
                    rightAction={
                      <Pressable disabled={isSubmitting} onPress={handleSendOtp}>
                        <Text style={styles.otpActionText}>{otpActionLabel}</Text>
                      </Pressable>
                    }
                    textContentType="oneTimeCode"
                    value={otpCode}
                  />
                </>
              ) : (
                <AuthField
                  autoComplete="password"
                  icon="lock"
                  label="Password"
                  onChangeText={handlePasswordChange}
                  placeholder="Enter your password"
                  secureTextEntry
                  textContentType="password"
                  value={password}
                />
              )}

              {infoText ? <Text style={styles.infoText}>{infoText}</Text> : null}
              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

              <Pressable
                disabled={isSubmitting}
                onPress={handleFinalize}
                style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}>
                <Text style={styles.primaryButtonText}>
                  {isSubmitting
                    ? 'Please wait...'
                    : authMode === 'signup'
                      ? 'Finalize & Access Premium Tools'
                      : 'Log In & Access Premium Tools'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {authMode === 'signup' ? 'Already have an account?' : 'Need a fresh account?'}
              </Text>
              <Pressable onPress={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}>
                <Text style={styles.footerLink}>
                  {authMode === 'signup' ? 'Log In' : 'Create Account'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.footerIcons}>
              <MaterialIcons color="#b6b8bf" name="security" size={22} />
              <MaterialIcons color="#b6b8bf" name="medical-services" size={22} />
              <MaterialIcons color="#b6b8bf" name="monitor-heart" size={22} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#eef1fb',
    zIndex: 30,
  },
  backgroundArtwork: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  backgroundGradientTopLeft: {
    position: 'absolute',
    top: -80,
    left: -110,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(176, 197, 255, 0.85)',
  },
  backgroundGradientBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(173, 198, 255, 0.72)',
  },
  backgroundGradientRight: {
    position: 'absolute',
    top: 0,
    right: -90,
    width: 280,
    height: '100%',
    backgroundColor: 'rgba(165, 238, 255, 0.55)',
  },
  keyboardWrap: {
    flex: 1,
  },
  authCard: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: '#15243c',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  modeSwitch: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    backgroundColor: '#eef1fb',
    borderRadius: 999,
    padding: 6,
  },
  modeChip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: '#ffffff',
    ...sipupShadow,
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#727a8c',
  },
  modeChipTextActive: {
    color: sipupColors.primary,
  },
  eyebrow: {
    textAlign: 'center',
    color: sipupColors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 50,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: -2,
    color: '#16171c',
  },
  subtitle: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 30,
    color: '#394256',
    paddingHorizontal: 10,
  },
  form: {
    marginTop: 34,
    gap: 18,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: '#323a4c',
    paddingLeft: 6,
  },
  fieldShell: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: '#f1eef2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 14,
  },
  fieldShellLocked: {
    opacity: 0.78,
  },
  fieldIcon: {
    marginRight: 14,
  },
  fieldInput: {
    flex: 1,
    minHeight: 72,
    fontSize: 18,
    fontWeight: '600',
    color: '#222633',
    letterSpacing: 0.2,
  },
  fieldRightAction: {
    marginLeft: 12,
  },
  otpActionText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: sipupColors.primary,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#21559b',
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#b2284c',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  primaryButton: {
    minHeight: 82,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: sipupColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f4eaa',
    shadowOpacity: 0.26,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.76,
  },
  primaryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
    paddingHorizontal: 18,
  },
  footer: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 16,
    color: '#2f384a',
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '900',
    color: sipupColors.primary,
  },
  footerIcons: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    opacity: 0.82,
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
