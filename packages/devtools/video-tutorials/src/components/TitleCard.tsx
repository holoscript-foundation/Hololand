import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { theme } from "../utils/theme";

interface TitleCardProps {
  title: string;
  subtitle?: string;
  tag?: string;
  packageName?: string;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  subtitle,
  tag = "HoloLand",
  packageName,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });
  const y = interpolate(frame, [0, 20], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: theme.padding,
        fontFamily: theme.titleFont,
        opacity,
      }}
    >
      {/* Purple glow blob */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "10%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.accentDim} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ transform: `translateY(${y}px)` }}>
        {/* Tag */}
        <div
          style={{
            display: "inline-block",
            padding: "6px 18px",
            borderRadius: 24,
            background: theme.accentDim,
            border: `1px solid ${theme.accentGlow}`,
            color: theme.accent,
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 28,
            fontFamily: theme.font,
          }}
        >
          {tag}
        </div>

        {/* Main title */}
        <h1
          style={{
            color: theme.text,
            fontSize: 72,
            fontWeight: 800,
            margin: "0 0 16px",
            lineHeight: 1.1,
            letterSpacing: "-1px",
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              color: theme.textMuted,
              fontSize: 32,
              margin: "0 0 32px",
              fontWeight: 400,
              maxWidth: 900,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Package name */}
        {packageName && (
          <div
            style={{
              fontFamily: theme.font,
              fontSize: 22,
              color: theme.secondary,
              background: `${theme.secondary}15`,
              padding: "8px 20px",
              borderRadius: 8,
              display: "inline-block",
              border: `1px solid ${theme.secondary}44`,
            }}
          >
            {packageName}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
