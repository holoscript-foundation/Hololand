import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { theme } from "../utils/theme";

interface CodeLine {
  content: string;
  highlight?: boolean;
  dim?: boolean;
  annotation?: string;
  type?: "added" | "removed" | "normal";
}

interface CodeStepProps {
  title: string;
  description: string;
  lines: CodeLine[];
  language?: string;
  stepNumber?: number;
  totalSteps?: number;
}

export const CodeStep: React.FC<CodeStepProps> = ({
  title,
  description,
  lines,
  language = "holo",
  stepNumber,
  totalSteps,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        padding: theme.padding,
        display: "flex",
        flexDirection: "column",
        gap: 32,
        fontFamily: theme.titleFont,
      }}
    >
      {/* Step indicator */}
      {stepNumber && totalSteps && (
        <div
          style={{
            color: theme.accent,
            fontFamily: theme.font,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Step {stepNumber} / {totalSteps}
        </div>
      )}

      {/* Title */}
      <h2
        style={{
          color: theme.text,
          fontSize: 48,
          fontWeight: 700,
          margin: 0,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {title}
      </h2>

      {/* Description */}
      <p
        style={{
          color: theme.textMuted,
          fontSize: 26,
          margin: 0,
          maxWidth: 900,
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {description}
      </p>

      {/* Code panel */}
      <div
        style={{
          background: theme.surface,
          borderRadius: theme.borderRadius,
          border: `1px solid ${theme.accentGlow}44`,
          overflow: "hidden",
          flex: 1,
        }}
      >
        {/* Window chrome */}
        <div
          style={{
            background: theme.surfaceAlt,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: `1px solid ${theme.accentGlow}22`,
          }}
        >
          {["#ff5f57", "#ffbd2e", "#28c940"].map((c) => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
          ))}
          <span
            style={{
              color: theme.textMuted,
              fontFamily: theme.font,
              fontSize: 14,
              marginLeft: 12,
            }}
          >
            {language}
          </span>
        </div>

        {/* Lines */}
        <div style={{ padding: "20px 24px", fontFamily: theme.font, fontSize: 20 }}>
          {lines.map((line, i) => {
            const lineDelay = i * 4;
            const lineOpacity = interpolate(frame, [lineDelay, lineDelay + 10], [0, 1], {
              extrapolateRight: "clamp",
            });
            const lineColor = line.type === "added"
              ? theme.success
              : line.type === "removed"
              ? "#f87171"
              : line.highlight
              ? theme.text
              : line.dim
              ? `${theme.textMuted}55`
              : theme.textMuted;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  minHeight: 32,
                  opacity: lineOpacity,
                  background: line.highlight ? `${theme.accent}11` : "transparent",
                  padding: "2px 8px",
                  borderRadius: 4,
                  borderLeft: line.highlight ? `3px solid ${theme.accent}` : "3px solid transparent",
                }}
              >
                <span style={{ color: lineColor, whiteSpace: "pre" }}>{line.content}</span>
                {line.annotation && (
                  <span
                    style={{
                      color: theme.secondary,
                      fontSize: 15,
                      marginLeft: "auto",
                      fontStyle: "italic",
                    }}
                  >
                    // {line.annotation}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
