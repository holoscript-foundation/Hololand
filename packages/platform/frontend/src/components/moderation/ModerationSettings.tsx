/**
 * ModerationSettings Component
 *
 * Per-world/tenant moderation configuration with:
 *   - Word filter management (add/remove, import/export)
 *   - Content type toggles
 *   - Rate limit configuration (messages per minute slider)
 *   - Link filter patterns (add/remove URL patterns)
 *   - Escalation thresholds (warns before mute, mutes before ban)
 *   - Auto-moderation toggle per rule type
 *
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module moderation/ModerationSettings
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  type ModerationSettings as ModerationSettingsType,
  type WordFilter,
  type LinkFilter,
  type ContentType,
  type AutoModerationRule,
  CONTENT_TYPE_CONFIG,
} from './ModerationTypes';
import { adminStyles, COLORS, FONTS } from '../admin/AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface ModerationSettingsProps {
  /** Current settings for the selected tenant */
  settings: ModerationSettingsType;
  /** Add a word to the filter list */
  onAddWord: (word: string) => void;
  /** Remove a word from the filter list */
  onRemoveWord: (wordId: string) => void;
  /** Import a list of words (from file or paste) */
  onImportWords: (words: string[]) => void;
  /** Export the current word list */
  onExportWords: () => void;
  /** Toggle a content type on/off */
  onToggleContentType: (contentType: ContentType, enabled: boolean) => void;
  /** Update rate limit configuration */
  onUpdateRateLimit: (messagesPerMinute: number, enabled: boolean) => void;
  /** Add a link filter pattern */
  onAddLinkFilter: (pattern: string) => void;
  /** Remove a link filter pattern */
  onRemoveLinkFilter: (filterId: string) => void;
  /** Update escalation thresholds */
  onUpdateEscalation: (warnsBeforeMute: number, mutesBeforeBan: number) => void;
  /** Toggle auto-moderation for a specific rule */
  onToggleAutoModeration: (ruleId: string, enabled: boolean) => void;
}

// =============================================================================
// SECTION HEADER SUB-COMPONENT
// =============================================================================

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: 8 }}>
    <h3
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: COLORS.textSecondary,
        margin: 0,
      }}
    >
      {title}
    </h3>
    {subtitle && (
      <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>
        {subtitle}
      </div>
    )}
  </div>
);

// =============================================================================
// SLIDER SUB-COMPONENT
// =============================================================================

const LabeledSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
    <span
      style={{
        fontSize: 10,
        color: COLORS.textSecondary,
        minWidth: 140,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      style={{
        flex: 1,
        accentColor: COLORS.accent,
        cursor: 'pointer',
      }}
      aria-label={label}
    />
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.textPrimary,
        fontVariantNumeric: 'tabular-nums',
        minWidth: 48,
        textAlign: 'right',
      }}
    >
      {value}{unit}
    </span>
  </div>
);

// =============================================================================
// TOGGLE SWITCH SUB-COMPONENT
// =============================================================================

const ToggleSwitch: React.FC<{
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: `1px solid ${COLORS.borderLight}`,
    }}
  >
    <div>
      <span style={{ fontSize: 10, color: COLORS.textPrimary, fontWeight: 600 }}>
        {label}
      </span>
      {description && (
        <div style={{ fontSize: 8, color: COLORS.textMuted, marginTop: 1 }}>
          {description}
        </div>
      )}
    </div>
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
      onClick={() => onChange(!enabled)}
      style={{
        width: 36,
        height: 18,
        borderRadius: 9,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: enabled ? COLORS.accent : 'rgba(255, 255, 255, 0.12)',
        position: 'relative',
        transition: 'background-color 0.2s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: enabled ? 20 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: '#fff',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ModerationSettingsComponent = React.memo<ModerationSettingsProps>(
  function ModerationSettingsComponent(props) {
    const {
      settings,
      onAddWord,
      onRemoveWord,
      onImportWords,
      onExportWords,
      onToggleContentType,
      onUpdateRateLimit,
      onAddLinkFilter,
      onRemoveLinkFilter,
      onUpdateEscalation,
      onToggleAutoModeration,
    } = props;

    // -----------------------------------------------------------------------
    // Local state for input fields
    // -----------------------------------------------------------------------
    const [newWord, setNewWord] = useState('');
    const [newLinkPattern, setNewLinkPattern] = useState('');
    const [importText, setImportText] = useState('');
    const [showImportArea, setShowImportArea] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // -----------------------------------------------------------------------
    // Word filter handlers
    // -----------------------------------------------------------------------
    const handleAddWord = useCallback(() => {
      const word = newWord.trim();
      if (word) {
        onAddWord(word);
        setNewWord('');
      }
    }, [newWord, onAddWord]);

    const handleImportFromText = useCallback(() => {
      const words = importText
        .split(/[\n,;]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);
      if (words.length > 0) {
        onImportWords(words);
        setImportText('');
        setShowImportArea(false);
      }
    }, [importText, onImportWords]);

    const handleFileImport = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const words = text
            .split(/[\n,;]+/)
            .map((w) => w.trim())
            .filter((w) => w.length > 0);
          if (words.length > 0) {
            onImportWords(words);
          }
        };
        reader.readAsText(file);
        // Reset input so same file can be re-uploaded
        e.target.value = '';
      },
      [onImportWords]
    );

    // -----------------------------------------------------------------------
    // Link filter handler
    // -----------------------------------------------------------------------
    const handleAddLinkFilter = useCallback(() => {
      const pattern = newLinkPattern.trim();
      if (pattern) {
        onAddLinkFilter(pattern);
        setNewLinkPattern('');
      }
    }, [newLinkPattern, onAddLinkFilter]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Moderation settings">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <div>
            <span style={adminStyles.panelTitle}>Moderation Settings</span>
            <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>
              {settings.tenantName}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ ...adminStyles.panelBody, padding: '12px 16px' }}>
          {/* ============================================================= */}
          {/* WORD FILTER MANAGEMENT                                        */}
          {/* ============================================================= */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader
              title="Word Filters"
              subtitle={`${settings.wordFilters.length} blocked words`}
            />

            {/* Add word input */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Add blocked word..."
                style={{ ...adminStyles.input, flex: 1 }}
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                aria-label="New blocked word"
              />
              <button
                style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
                onClick={handleAddWord}
                disabled={!newWord.trim()}
              >
                Add
              </button>
            </div>

            {/* Import/Export buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button
                style={adminStyles.button}
                onClick={() => setShowImportArea(!showImportArea)}
              >
                {showImportArea ? 'Cancel Import' : 'Import'}
              </button>
              <button
                style={adminStyles.button}
                onClick={() => fileInputRef.current?.click()}
              >
                Import File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                style={{ display: 'none' }}
                onChange={handleFileImport}
              />
              <button
                style={adminStyles.button}
                onClick={onExportWords}
              >
                Export
              </button>
            </div>

            {/* Import textarea (shown conditionally) */}
            {showImportArea && (
              <div style={{ marginBottom: 8 }}>
                <textarea
                  style={{ ...adminStyles.input, minHeight: 60, resize: 'vertical' }}
                  placeholder="Paste words separated by commas, semicolons, or newlines..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  aria-label="Import word list"
                />
                <button
                  style={{ ...adminStyles.button, ...adminStyles.buttonPrimary, marginTop: 4 }}
                  onClick={handleImportFromText}
                  disabled={!importText.trim()}
                >
                  Import Words
                </button>
              </div>
            )}

            {/* Word list */}
            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 5,
                padding: 4,
              }}
            >
              {settings.wordFilters.length === 0 ? (
                <div style={{ ...adminStyles.emptyState, padding: '12px 8px' }}>
                  No blocked words configured
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {settings.wordFilters.map((wf) => (
                    <span
                      key={wf.id}
                      style={{
                        ...adminStyles.tag,
                        backgroundColor: COLORS.errorBg,
                        color: COLORS.error,
                        gap: 4,
                        padding: '2px 6px',
                      }}
                    >
                      {wf.word}
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: COLORS.error,
                          cursor: 'pointer',
                          fontFamily: FONTS.mono,
                          fontSize: 9,
                          padding: 0,
                          lineHeight: 1,
                        }}
                        onClick={() => onRemoveWord(wf.id)}
                        aria-label={`Remove word: ${wf.word}`}
                        title="Remove"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={adminStyles.divider} />

          {/* ============================================================= */}
          {/* CONTENT TYPE TOGGLES                                          */}
          {/* ============================================================= */}
          <div style={{ marginBottom: 20, marginTop: 12 }}>
            <SectionHeader
              title="Content Types"
              subtitle="Toggle which content types are moderated"
            />
            {(Object.keys(CONTENT_TYPE_CONFIG) as ContentType[]).map((ct) => (
              <ToggleSwitch
                key={ct}
                label={CONTENT_TYPE_CONFIG[ct].label}
                description={`Enable moderation for ${ct} content`}
                enabled={settings.contentTypeToggles[ct]}
                onChange={(enabled) => onToggleContentType(ct, enabled)}
              />
            ))}
          </div>

          <div style={adminStyles.divider} />

          {/* ============================================================= */}
          {/* RATE LIMIT CONFIGURATION                                      */}
          {/* ============================================================= */}
          <div style={{ marginBottom: 20, marginTop: 12 }}>
            <SectionHeader
              title="Rate Limiting"
              subtitle="Control message frequency"
            />
            <ToggleSwitch
              label="Enable Rate Limiting"
              enabled={settings.rateLimit.enabled}
              onChange={(enabled) =>
                onUpdateRateLimit(settings.rateLimit.messagesPerMinute, enabled)
              }
            />
            {settings.rateLimit.enabled && (
              <LabeledSlider
                label="Messages per minute"
                value={settings.rateLimit.messagesPerMinute}
                min={1}
                max={60}
                unit="/min"
                onChange={(val) => onUpdateRateLimit(val, settings.rateLimit.enabled)}
              />
            )}
          </div>

          <div style={adminStyles.divider} />

          {/* ============================================================= */}
          {/* LINK FILTER PATTERNS                                          */}
          {/* ============================================================= */}
          <div style={{ marginBottom: 20, marginTop: 12 }}>
            <SectionHeader
              title="Link Filters"
              subtitle={`${settings.linkFilters.length} URL patterns blocked`}
            />

            {/* Add pattern input */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Add URL pattern (e.g., *.malware.com)"
                style={{ ...adminStyles.input, flex: 1 }}
                value={newLinkPattern}
                onChange={(e) => setNewLinkPattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLinkFilter()}
                aria-label="New link filter pattern"
              />
              <button
                style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
                onClick={handleAddLinkFilter}
                disabled={!newLinkPattern.trim()}
              >
                Add
              </button>
            </div>

            {/* Pattern list */}
            <div
              style={{
                maxHeight: 120,
                overflowY: 'auto',
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 5,
              }}
            >
              {settings.linkFilters.length === 0 ? (
                <div style={{ ...adminStyles.emptyState, padding: '12px 8px' }}>
                  No link filter patterns configured
                </div>
              ) : (
                settings.linkFilters.map((lf) => (
                  <div
                    key={lf.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderBottom: `1px solid ${COLORS.borderLight}`,
                    }}
                  >
                    <span style={{ fontSize: 10, color: COLORS.textPrimary, fontFamily: FONTS.mono }}>
                      {lf.pattern}
                    </span>
                    <button
                      style={{
                        ...adminStyles.button,
                        padding: '2px 6px',
                        fontSize: 8,
                      }}
                      onClick={() => onRemoveLinkFilter(lf.id)}
                      aria-label={`Remove pattern: ${lf.pattern}`}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={adminStyles.divider} />

          {/* ============================================================= */}
          {/* ESCALATION THRESHOLDS                                         */}
          {/* ============================================================= */}
          <div style={{ marginBottom: 20, marginTop: 12 }}>
            <SectionHeader
              title="Escalation Thresholds"
              subtitle="Configure automatic escalation levels"
            />
            <LabeledSlider
              label="Warns before mute"
              value={settings.escalationThresholds.warnsBeforeMute}
              min={1}
              max={10}
              onChange={(val) =>
                onUpdateEscalation(val, settings.escalationThresholds.mutesBeforeBan)
              }
            />
            <LabeledSlider
              label="Mutes before ban"
              value={settings.escalationThresholds.mutesBeforeBan}
              min={1}
              max={10}
              onChange={(val) =>
                onUpdateEscalation(settings.escalationThresholds.warnsBeforeMute, val)
              }
            />
          </div>

          <div style={adminStyles.divider} />

          {/* ============================================================= */}
          {/* AUTO-MODERATION RULES                                         */}
          {/* ============================================================= */}
          <div style={{ marginTop: 12 }}>
            <SectionHeader
              title="Auto-Moderation"
              subtitle="Toggle automated moderation per rule type"
            />
            {settings.autoModerationRules.map((rule) => (
              <ToggleSwitch
                key={rule.id}
                label={rule.name}
                description={rule.description}
                enabled={rule.enabled}
                onChange={(enabled) => onToggleAutoModeration(rule.id, enabled)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

export { ModerationSettingsComponent as ModerationSettings };
export default ModerationSettingsComponent;
