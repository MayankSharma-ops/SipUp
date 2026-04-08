import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sipupColors, sipupShadow } from '@/constants/sipup-ui';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useWaterStore } from '@/store/useWaterStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { logoutRemoteSession } from '@/utils/api';
import { maskEmail } from '@/utils/email';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const currentUserEmail = useProfileStore((state) => state.currentUserEmail);
  const currentUserId = useProfileStore((state) => state.currentUserId);
  const currentSessionToken = useProfileStore((state) => state.currentSessionToken);
  const profiles = useProfileStore((state) => state.profiles);
  const logout = useProfileStore((state) => state.logout);
  const history = useHistoryStore((state) => state.history);
  const streak = useHistoryStore((state) => state.streak);
  const intake = useWaterStore((state) => state.intake);
  const drinkLogs = useWaterStore((state) => state.drinkLogs);
  const goal = useWaterStore((state) => state.goal);
  const lifetimeXp = useWaterStore((state) => state.lifetimeXp);
  const schedule = useWorkoutStore((state) => state.schedule);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const profile = currentUserEmail ? profiles[currentUserEmail] : null;

  const stats = useMemo(() => {
    const trackedDays = history.length + (intake > 0 || drinkLogs.length > 0 ? 1 : 0);
    const totalIntake = history.reduce((sum, record) => sum + record.intake, intake);
    const activeWorkoutDays = Object.values(schedule).filter((day) => !day.isRest).length;

    return {
      activeWorkoutDays,
      trackedDays,
      totalIntake,
    };
  }, [drinkLogs.length, history, intake, schedule]);

  if (!profile) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>No active profile</Text>
        <Text style={styles.emptyCopy}>Sign in with an email address to store tracking data.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 148,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>Your Neon-backed account owns this tracking data.</Text>
        <Text style={styles.subtitle}>
          OTP emails are sent through Nodemailer and your hydration profile syncs to PostgreSQL.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.identityBadge}>
            <MaterialIcons color={sipupColors.primary} name="verified-user" size={22} />
            <Text style={styles.identityBadgeText}>Authenticated session</Text>
          </View>

          <Text style={styles.profileEmail}>{profile.email}</Text>
          <Text style={styles.profileMask}>Masked ID: {maskEmail(profile.email)}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaValue}>{format(profile.createdAt, 'MMM d, yyyy')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Last sync</Text>
              <Text style={styles.metaValue}>{format(profile.updatedAt, 'MMM d, h:mm a')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailPanel}>
          <Text style={styles.panelTitle}>Backend identity</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text numberOfLines={1} style={styles.detailValue}>
              {currentUserId ?? profile.id ?? 'Pending'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Login method</Text>
            <Text style={styles.detailValue}>Email OTP</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Database</Text>
            <Text style={styles.detailValue}>Neon PostgreSQL</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons color={sipupColors.primary} name="calendar-month" size={24} />
            <Text style={styles.statLabel}>Tracked days</Text>
            <Text style={styles.statValue}>{stats.trackedDays}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons color={sipupColors.teal} name="water-drop" size={24} />
            <Text style={styles.statLabel}>Saved intake</Text>
            <Text style={styles.statValue}>{stats.totalIntake.toLocaleString()} mL</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons color={sipupColors.primary} name="local-fire-department" size={24} />
            <Text style={styles.statLabel}>Current streak</Text>
            <Text style={styles.statValue}>{streak} days</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons color={sipupColors.teal} name="fitness-center" size={24} />
            <Text style={styles.statLabel}>Workout days</Text>
            <Text style={styles.statValue}>{stats.activeWorkoutDays} / 7</Text>
          </View>
        </View>

        <View style={styles.detailPanel}>
          <Text style={styles.panelTitle}>Profile snapshot</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Today&apos;s target</Text>
            <Text style={styles.detailValue}>{goal.toLocaleString()} mL</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Drink entries today</Text>
            <Text style={styles.detailValue}>{drinkLogs.length}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lifetime hydration XP</Text>
            <Text style={styles.detailValue}>{lifetimeXp.toLocaleString()}</Text>
          </View>
        </View>

        <Pressable
          onPress={async () => {
            setIsLoggingOut(true);

            try {
              if (currentSessionToken) {
                await logoutRemoteSession(currentSessionToken);
              }
            } catch (error) {
              console.warn('[profile] Remote logout failed. Clearing local session anyway.', error);
            } finally {
              logout();
              setIsLoggingOut(false);
            }
          }}
          style={styles.logoutButton}>
          <MaterialIcons color="#ffffff" name="logout" size={18} />
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Logging out...' : 'Log out and request a new OTP'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: sipupColors.background,
  },
  content: {
    paddingHorizontal: 28,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: '#8e92a2',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1.2,
    color: sipupColors.text,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: sipupColors.textSoft,
  },
  heroCard: {
    marginTop: 26,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    ...sipupShadow,
  },
  identityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: sipupColors.successTint,
  },
  identityBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: sipupColors.primary,
  },
  profileEmail: {
    marginTop: 22,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: sipupColors.text,
  },
  profileMask: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: sipupColors.textSoft,
  },
  metaRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#8b93a3',
  },
  metaValue: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: sipupColors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    minHeight: 138,
    borderRadius: 30,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#8f94a0',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: sipupColors.text,
  },
  detailPanel: {
    marginTop: 18,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    ...sipupShadow,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: sipupColors.text,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(157, 161, 177, 0.18)',
  },
  detailLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: sipupColors.textSoft,
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: sipupColors.text,
    textAlign: 'right',
  },
  logoutButton: {
    marginTop: 22,
    minHeight: 60,
    borderRadius: 24,
    backgroundColor: '#173e77',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...sipupShadow,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sipupColors.background,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    color: sipupColors.text,
  },
  emptyCopy: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: sipupColors.textSoft,
  },
});
