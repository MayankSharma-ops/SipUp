import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { sipupColors, sipupShadow } from "@/constants/sipup-ui";

const INITIAL_ACCESS_ARTWORK =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB6jFu6gubooxZgz9-_nQcY75yhnXL8ft__3h-RZ3NHT2bVbswINfUOCmOViT8Wgz8l4-8Z36QWe15rKcfw3K2jlN_CuFv7lLACAL6TaR9oBh3_OND6AkKXJ98UzeFgtLzRHhYg-vj3lQiL9nA9P0IiJP4vrR2NnD3-86OpYA-1224KQk0PU-F2RX3AqS_MUCFt6PoHvDzNtly2X7DkYyDG9Gb0DhMZEmYTBCtPGQBXfDmwJgKyZ2mj4x3ZA_WLnXxWQERAjZ7n5YcO";

const FEATURE_ITEMS: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
}[] = [
  { icon: "sync", label: "Apple Health Sync" },
  { icon: "track-changes", label: "Adaptive Goals" },
  { icon: "biotech", label: "Cellular Index" },
];

export function InitialAccessScreen({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const heroSize = Math.min(width - 28, 398, Math.max(288, height * 0.37));
  const heroHaloSize = heroSize + 27;

  return (
    <View style={styles.overlay}>
      <View style={styles.topGlow} />
      <View style={styles.sideGlow} />

      <View style={styles.bottomArtworkWrap}>
        <Image
          contentFit="cover"
          source={{ uri: INITIAL_ACCESS_ARTWORK }}
          style={styles.bottomArtwork}
        />
        <View style={styles.bottomArtworkFade} />
      </View>

      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: insets.top + 34,
            paddingBottom: insets.bottom + 18,
          },
        ]}
      >
        <Text style={styles.eyebrow}>WELCOME TO SIPUP | INITIAL ACCESS</Text>

        <View style={styles.mainSection}>
          <View style={styles.heroWrap}>
            <View
              style={[
                styles.heroHalo,
                { width: heroHaloSize, height: heroHaloSize },
              ]}
            />
            <View
              style={[styles.heroCircle, { width: heroSize, height: heroSize }]}
            >
              <Svg
                height="100%"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFillObject}
                viewBox="0 0 100 100"
                width="100%"
              >
                <Defs>
                  <LinearGradient
                    id="heroGlass"
                    x1="5%"
                    x2="95%"
                    y1="0%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                    <Stop offset="50%" stopColor="rgba(255,255,255,0.58)" />
                    <Stop offset="100%" stopColor="rgba(255,255,255,0.42)" />
                  </LinearGradient>
                </Defs>
                <Rect
                  fill="url(#heroGlass)"
                  height="100"
                  rx="50"
                  width="100"
                  x="0"
                  y="0"
                />
              </Svg>

              <View style={styles.heroContent}>
                <View style={styles.scanRow}>
                  <View style={styles.scanDot} />
                  <Text style={styles.scanLabel}>ACTIVE SCAN</Text>
                </View>
                <Text style={styles.heroTitle}>-- PENDING INITIAL SETUP</Text>
              </View>
            </View>
          </View>

          <View style={styles.featureSection}>
            <Text style={styles.featureBackdropText}>FLUID</Text>
            <Text style={styles.featureBackdropSubtext}>
              TRACED HYDRATION SIGNALS
            </Text>

            {FEATURE_ITEMS.map((item) => (
              <View key={item.label} style={styles.featureItem}>
                <MaterialIcons
                  color="rgba(13, 95, 212, 0.45)"
                  name={item.icon}
                  size={28}
                />
                <Text style={styles.featureLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={onContinue} style={styles.ctaButton}>
          <Svg
            height="100%"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFillObject}
            viewBox="0 0 100 100"
            width="100%"
          >
            <Defs>
              <LinearGradient
                id="ctaGradient"
                x1="0%"
                x2="100%"
                y1="50%"
                y2="50%"
              >
                <Stop offset="0%" stopColor={sipupColors.teal} />
                <Stop offset="100%" stopColor={sipupColors.primaryStrong} />
              </LinearGradient>
            </Defs>
            <Rect
              fill="url(#ctaGradient)"
              height="100"
              rx="50"
              width="100"
              x="0"
              y="0"
            />
          </Svg>
          <Text style={styles.ctaText}>Log In or Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: sipupColors.background,
    zIndex: 30,
  },
  topGlow: {
    position: "absolute",
    top: -150,
    left: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  sideGlow: {
    position: "absolute",
    top: 60,
    right: -80,
    width: 280,
    height: 460,
    borderRadius: 140,
    backgroundColor: "rgba(10, 115, 140, 0.05)",
  },
  bottomArtworkWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
    overflow: "hidden",
  },
  bottomArtwork: {
    width: "100%",
    height: "100%",
    opacity: 0.18,
  },
  bottomArtworkFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(251,247,248,0.2)",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  eyebrow: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 4.2,
    color: "rgba(57, 66, 86, 0.55)",
  },
  mainSection: {
    flex: 1,
  },
  heroWrap: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heroHalo: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
    shadowColor: "#d8d1d5",
    shadowOpacity: 0.22,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  heroCircle: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 26,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scanDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#2d77d4",
  },
  scanLabel: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3.4,
    color: "#2d77d4",
  },
  heroTitle: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 3.2,
    color: "#1c1d22",
    fontWeight: "300",
  },
  featureSection: {
    flex: 1,
    marginTop: -8,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    position: "relative",
    paddingBottom: 18,
  },
  featureBackdropText: {
    position: "absolute",
    bottom: 76,
    fontSize: 86,
    lineHeight: 92,
    letterSpacing: 16,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "200",
  },
  featureBackdropSubtext: {
    position: "absolute",
    bottom: 56,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 7,
    color: "rgba(255,255,255,0.36)",
    fontWeight: "400",
  },
  featureItem: {
    alignItems: "center",
    gap: 6,
  },
  featureLabel: {
    fontSize: 15,
    lineHeight: 21,
    color: "#364054",
    fontWeight: "500",
  },
  ctaButton: {
    height: 62,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 336,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 2,
    ...sipupShadow,
    shadowColor: "#0f4eaa",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
});
