import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parseISO, subDays } from 'date-fns';

import { useHistoryStore } from '@/store/useHistoryStore';
import { useWaterStore } from '@/store/useWaterStore';
import { sipupColors, sipupShadow } from '@/constants/sipup-ui';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const history = useHistoryStore((state) => state.history);
  const streak = useHistoryStore((state) => state.streak);
  const todayIntake = useWaterStore((state) => state.intake);
  const goal = useWaterStore((state) => state.goal);
  const drinkLogs = useWaterStore((state) => state.drinkLogs);

  const allRecords = useMemo(() => {
    return [...history]
      .reverse()
      .concat({
        date: format(new Date(), 'yyyy-MM-dd'),
        drinkLogs,
        goal,
        intake: todayIntake,
      });
  }, [drinkLogs, goal, history, todayIntake]);

  const averageIntake = useMemo(() => {
    if (!allRecords.length) return 0;
    const total = allRecords.reduce((sum, item) => sum + item.intake, 0);
    return Math.round(total / allRecords.length);
  }, [allRecords]);

  const consistency = useMemo(() => {
    if (!allRecords.length) return 0;
    const metGoalDays = allRecords.filter((item) => item.intake >= item.goal).length;
    return Math.round((metGoalDays / allRecords.length) * 100);
  }, [allRecords]);

  const daySeries = useMemo(() => {
    const map = new Map(history.map((record) => [record.date, record]));
    return Array.from({ length: 7 }, (_, index) => {
      const day = subDays(new Date(), 6 - index);
      const key = format(day, 'yyyy-MM-dd');
      const amount = index === 6 ? todayIntake : map.get(key)?.intake ?? 0;

      return {
        amount,
        isToday: index === 6,
        key,
        label: format(day, 'EEEEE'),
      };
    });
  }, [history, todayIntake]);

  const timeBreakdown = useMemo(() => {
    let morning = 0;
    let afternoon = 0;
    let evening = 0;

    for (const record of allRecords) {
      for (const log of record.drinkLogs ?? []) {
        const hour = new Date(log.timestamp).getHours();
        if (hour >= 5 && hour < 12) morning += log.amount;
        else if (hour < 18) afternoon += log.amount;
        else evening += log.amount;
      }
    }

    return [
      { amount: morning, label: 'Morning' },
      { amount: afternoon, label: 'Afternoon' },
      { amount: evening, label: 'Evening' },
    ];
  }, [allRecords]);

  const recentRecords = [...allRecords].reverse().slice(0, 5);

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 22,
            paddingBottom: insets.bottom + 148,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Analytics</Text>
          <Text style={styles.title}>Hydration patterns, simplified.</Text>
          <Text style={styles.subtitle}>
            A soft dashboard for your trends, streaks, and recent intake history.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <MaterialIcons color={sipupColors.primary} name="water-drop" size={24} />
            <Text style={styles.summaryLabel}>Average intake</Text>
            <Text style={styles.summaryValue}>{averageIntake.toLocaleString()} mL</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialIcons color={sipupColors.teal} name="bolt" size={24} />
            <Text style={styles.summaryLabel}>Consistency</Text>
            <Text style={styles.summaryValue}>{consistency}%</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <MaterialIcons color={sipupColors.primary} name="local-fire-department" size={24} />
            <Text style={styles.summaryLabel}>Current streak</Text>
            <Text style={styles.summaryValue}>{streak} days</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialIcons color={sipupColors.teal} name="flag" size={24} />
            <Text style={styles.summaryLabel}>Daily target</Text>
            <Text style={styles.summaryValue}>{goal.toLocaleString()} mL</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>7-day progress</Text>
          <View style={styles.chartRow}>
            {daySeries.map((item) => {
              const height = item.amount > 0 ? Math.max(24, (item.amount / Math.max(goal, 1)) * 120) : 12;
              return (
                <View key={item.key} style={styles.chartColumn}>
                  <View style={styles.chartTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        item.isToday ? styles.chartBarToday : null,
                        { height },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartLabel, item.isToday ? styles.chartLabelToday : null]}>
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Daily rhythm</Text>
          <View style={styles.rhythmList}>
            {timeBreakdown.map((slot) => {
              const width = Math.max(
                12,
                (slot.amount / Math.max(goal * Math.max(allRecords.length, 1), 1)) * 100
              );

              return (
                <View key={slot.label} style={styles.rhythmRow}>
                  <View style={styles.rhythmHeader}>
                    <Text style={styles.rhythmLabel}>{slot.label}</Text>
                    <Text style={styles.rhythmAmount}>{slot.amount.toLocaleString()} mL</Text>
                  </View>
                  <View style={styles.rhythmTrack}>
                    <View style={[styles.rhythmFill, { width: `${width}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent logs</Text>
          {recentRecords.length ? (
            recentRecords.map((record) => {
              const progress = record.goal > 0 ? Math.min(record.intake / record.goal, 1) : 0;
              const displayDate = format(parseISO(record.date), 'MMM d');

              return (
                <View key={record.date} style={styles.logRow}>
                  <View>
                    <Text style={styles.logDate}>{displayDate}</Text>
                    <Text style={styles.logDetail}>
                      {record.intake.toLocaleString()} / {record.goal.toLocaleString()} mL
                    </Text>
                  </View>
                  <View style={styles.logMeter}>
                    <View style={styles.logMeterTrack}>
                      <View style={[styles.logMeterFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyState}>No hydration history yet. Start with your first quick log.</Text>
          )}
        </View>
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
  header: {
    marginBottom: 28,
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
    letterSpacing: -1.3,
    color: sipupColors.text,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: sipupColors.textSoft,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 134,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
    ...sipupShadow,
  },
  summaryLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#8f94a0',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: sipupColors.text,
  },
  panel: {
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 34,
    backgroundColor: sipupColors.surfaceSoft,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    color: sipupColors.text,
    marginBottom: 18,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  chartColumn: {
    alignItems: 'center',
  },
  chartTrack: {
    width: 20,
    height: 124,
    borderRadius: 999,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: 10,
    borderRadius: 999,
    backgroundColor: '#d6d8e2',
  },
  chartBarToday: {
    width: 14,
    backgroundColor: sipupColors.primary,
    ...sipupShadow,
  },
  chartLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: '#989cab',
  },
  chartLabelToday: {
    color: sipupColors.primary,
  },
  rhythmList: {
    gap: 18,
  },
  rhythmRow: {
    gap: 8,
  },
  rhythmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rhythmLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: sipupColors.text,
  },
  rhythmAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: sipupColors.textSoft,
  },
  rhythmTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#dde5ef',
    overflow: 'hidden',
  },
  rhythmFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: sipupColors.primary,
  },
  logRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(157, 161, 177, 0.18)',
    gap: 12,
  },
  logDate: {
    fontSize: 16,
    fontWeight: '800',
    color: sipupColors.text,
  },
  logDetail: {
    marginTop: 4,
    fontSize: 14,
    color: sipupColors.textSoft,
  },
  logMeter: {
    marginTop: 4,
  },
  logMeterTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#dee3ed',
    overflow: 'hidden',
  },
  logMeterFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: sipupColors.teal,
  },
  emptyState: {
    fontSize: 15,
    lineHeight: 24,
    color: sipupColors.textSoft,
  },
});
