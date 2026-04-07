import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { sipupColors, sipupImages, sipupShadow } from '@/constants/sipup-ui';

type Plan = 'monthly' | 'annual';

const premiumFeatures = [
  'Apple Health/Smartwatch Sync',
  'Adaptive Weather Algorithms',
  'Cellular Hydration Index',
];

function BottleArtwork() {
  return (
    <View style={styles.artworkShell}>
      <Svg height="100%" style={StyleSheet.absoluteFillObject} width="100%">
        <Defs>
          <LinearGradient id="premiumCardGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <Stop offset="0%" stopColor="#f47e8b" />
            <Stop offset="55%" stopColor="#f47d8a" />
            <Stop offset="100%" stopColor="#fff4f6" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#premiumCardGradient)" height="100%" rx={32} ry={32} width="100%" />
      </Svg>

      <View style={styles.artGlow} />
      <View style={styles.bottleWrap}>
        <View style={styles.bottleCap} />
        <View style={styles.bottleNeck} />
        <View style={styles.bottleBody}>
          <View style={styles.bottleHighlight} />
          <View style={styles.bottleLabel}>
            <Text style={styles.bottleLabelTitle}>LIQUID</Text>
            <Text style={styles.bottleLabelSubhead}>BLEND</Text>
            <Text style={styles.bottleLabelText}>hydration formula</Text>
          </View>
        </View>
      </View>

      <View style={styles.artOverlay}>
        <Text style={styles.artTitle}>Data-Driven Vitality</Text>
        <Text style={styles.artSubtitle}>
          Precision tracking for your biological baseline.
        </Text>
      </View>
    </View>
  );
}

function PriceCard({
  highlighted,
  label,
  price,
  period,
  badge,
  selected,
  onPress,
}: {
  highlighted: boolean;
  label: string;
  price: string;
  period: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.priceCard,
        highlighted && styles.priceCardHighlighted,
        selected && styles.priceCardSelected,
      ]}>
      {badge ? (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}

      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      <Text style={styles.planPeriod}>{period}</Text>
    </Pressable>
  );
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const trialText = useMemo(() => {
    return selectedPlan === 'annual'
      ? 'Annual plan selected. Your 7-day free trial is ready.'
      : 'Monthly plan selected. Your 7-day free trial is ready.';
  }, [selectedPlan]);

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + 148,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <View style={styles.avatarFrame}>
              <Image
                contentFit="cover"
                source={{ uri: sipupImages.premiumAvatar }}
                style={styles.avatarImage}
              />
            </View>
            <Text style={styles.brandText}>SipUp</Text>
          </View>

          <Pressable hitSlop={10} style={styles.iconButton}>
            <MaterialIcons color={sipupColors.textSoft} name="notifications" size={24} />
          </Pressable>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.heroBackdrop} />
          <Text style={styles.heroTitle}>Hydration,</Text>
          <Text style={styles.heroTitle}>Perfected.</Text>
          <Text style={styles.heroCopy}>
            Unlock personalized intake algorithms and deep health analytics.
          </Text>
        </View>

        <View style={styles.featureList}>
          {premiumFeatures.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.checkCircle}>
                <MaterialIcons color={sipupColors.primary} name="check" size={20} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingGrid}>
          <PriceCard
            highlighted={false}
            label="MONTHLY"
            onPress={() => setSelectedPlan('monthly')}
            period="/month"
            price="$9.99"
            selected={selectedPlan === 'monthly'}
          />
          <PriceCard
            badge="SAVE 30%"
            highlighted
            label="ANNUAL"
            onPress={() => setSelectedPlan('annual')}
            period="/year"
            price="$79.99"
            selected={selectedPlan === 'annual'}
          />
        </View>

        <Pressable
          onPress={() => setSnackbarVisible(true)}
          style={styles.ctaButton}>
          <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
        </Pressable>

        <View style={styles.securityRow}>
          <MaterialIcons color={sipupColors.textSoft} name="lock" size={18} />
          <Text style={styles.securityText}>Secure payment, cancel anytime</Text>
        </View>

        <BottleArtwork />
      </ScrollView>

      <Snackbar
        duration={2400}
        onDismiss={() => setSnackbarVisible(false)}
        style={styles.snackbar}
        visible={snackbarVisible}>
        <Text style={styles.snackbarText}>{trialText}</Text>
      </Snackbar>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#d7dde4',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  brandText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '800',
    color: sipupColors.primaryStrong,
    letterSpacing: -0.8,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    marginHorizontal: -28,
    paddingHorizontal: 28,
    paddingTop: 46,
    paddingBottom: 56,
    marginBottom: 26,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#d9ecff',
    opacity: 0.75,
    top: 0,
    height: 144,
  },
  heroTitle: {
    fontSize: 62,
    lineHeight: 64,
    fontWeight: '900',
    color: sipupColors.text,
    letterSpacing: -2.4,
  },
  heroCopy: {
    marginTop: 24,
    width: '92%',
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 19,
    lineHeight: 33,
    fontWeight: '500',
    color: '#283247',
  },
  featureList: {
    marginTop: 4,
    marginBottom: 30,
    gap: 26,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: sipupColors.successTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 31,
    fontWeight: '700',
    color: sipupColors.text,
  },
  pricingGrid: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 20,
    marginBottom: 30,
  },
  priceCard: {
    flex: 1,
    minHeight: 170,
    borderRadius: 34,
    backgroundColor: '#fffefd',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  priceCardHighlighted: {
    borderWidth: 2.5,
    borderColor: sipupColors.primary,
    ...sipupShadow,
  },
  priceCardSelected: {
    transform: [{ scale: 1.01 }],
  },
  planBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: sipupColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  planBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: '#253047',
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.1,
    color: sipupColors.text,
  },
  planPeriod: {
    marginTop: 6,
    fontSize: 16,
    color: '#263248',
  },
  ctaButton: {
    backgroundColor: '#1768da',
    borderRadius: 999,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    ...sipupShadow,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  securityRow: {
    marginTop: 28,
    marginBottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  securityText: {
    fontSize: 15,
    color: '#364055',
    fontWeight: '500',
  },
  artworkShell: {
    height: 292,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  artGlow: {
    position: 'absolute',
    bottom: -28,
    width: 320,
    height: 94,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    opacity: 0.86,
  },
  bottleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 14 }],
  },
  bottleCap: {
    width: 46,
    height: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#71d8d2',
  },
  bottleNeck: {
    width: 36,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  bottleBody: {
    width: 96,
    height: 178,
    borderRadius: 32,
    backgroundColor: 'rgba(215, 255, 255, 0.52)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bottleHighlight: {
    position: 'absolute',
    left: 12,
    top: 18,
    bottom: 22,
    width: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  bottleLabel: {
    width: 74,
    height: 102,
    borderRadius: 14,
    backgroundColor: 'rgba(242, 126, 136, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bottleLabelTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  bottleLabelSubhead: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff7f8',
    letterSpacing: 1.4,
  },
  bottleLabelText: {
    marginTop: 8,
    fontSize: 8,
    color: '#fff8f8',
    textAlign: 'center',
    lineHeight: 10,
  },
  artOverlay: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 74,
    alignItems: 'center',
  },
  artTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    color: sipupColors.text,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  artSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: '#243148',
    textAlign: 'center',
  },
  snackbar: {
    marginHorizontal: 18,
    marginBottom: 112,
    backgroundColor: '#16345e',
  },
  snackbarText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
