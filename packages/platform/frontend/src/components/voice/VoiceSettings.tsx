/**
 * VoiceSettings Component
 *
 * Voice settings panel providing:
 *   - Input device selector (dropdown of available audio inputs via
 *     navigator.mediaDevices.enumerateDevices)
 *   - Output device selector
 *   - Noise suppression toggle
 *   - Echo cancellation toggle
 *   - VAD sensitivity slider
 *   - Push-to-talk key rebind
 *
 * @module voice/VoiceSettings
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioDevices, type VoiceSettings as VoiceSettingsState } from './useVoice';

// ============================================================================
// Props
// ============================================================================

export interface VoiceSettingsProps {
  /** Current settings state (controlled). */
  settings: VoiceSettingsState;
  /** Callback when any setting changes. */
  onSettingsChange: (settings: VoiceSettingsState) => void;
  /** Callback to close the settings panel. */
  onClose?: () => void;
  /** Optional CSS class name. */
  className?: string;
}

// ============================================================================
// Subcomponents
// ============================================================================

function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <label htmlFor={id} className="text-sm text-neutral-200 cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-indigo-500' : 'bg-neutral-600'
        }`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
          style={{ width: 18, height: 18 }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function DeviceSelector({
  id,
  label,
  devices,
  selectedId,
  onChange,
}: {
  id: string;
  label: string;
  devices: { deviceId: string; label: string }[];
  selectedId: string;
  onChange: (deviceId: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">
        {label}
      </label>
      <select
        id={id}
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {devices.length === 0 ? (
          <option value="">No devices found</option>
        ) : (
          devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

// ============================================================================
// Push-to-Talk Key Rebind
// ============================================================================

function PTTKeyBinder({
  currentKey,
  onKeyChange,
}: {
  currentKey: string;
  onKeyChange: (keyCode: string) => void;
}) {
  const [isBinding, setIsBinding] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const displayKey = currentKey.replace('Key', '').replace('Digit', '');

  useEffect(() => {
    if (!isBinding) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onKeyChange(e.code);
      setIsBinding(false);
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isBinding, onKeyChange]);

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">
        Push-to-Talk Key
      </label>
      <button
        ref={buttonRef}
        onClick={() => setIsBinding(true)}
        className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
          isBinding
            ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300 animate-pulse'
            : 'bg-neutral-800 border-neutral-700 text-neutral-100 hover:border-neutral-600'
        }`}
        aria-label={
          isBinding
            ? 'Press any key to bind'
            : `Push to talk key: ${displayKey}. Click to rebind.`
        }
      >
        {isBinding ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Press any key...
          </span>
        ) : (
          <span className="flex items-center justify-between">
            <span>{displayKey}</span>
            <span className="text-xs text-neutral-500">Click to rebind</span>
          </span>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VoiceSettings({
  settings,
  onSettingsChange,
  onClose,
  className = '',
}: VoiceSettingsProps) {
  const {
    inputDevices,
    outputDevices,
    selectedInput,
    selectedOutput,
    setSelectedInput,
    setSelectedOutput,
  } = useAudioDevices();

  // Sync device selections from settings
  useEffect(() => {
    if (settings.inputDeviceId) {
      setSelectedInput(settings.inputDeviceId);
    }
    if (settings.outputDeviceId) {
      setSelectedOutput(settings.outputDeviceId);
    }
  }, [settings.inputDeviceId, settings.outputDeviceId, setSelectedInput, setSelectedOutput]);

  const updateSetting = useCallback(
    <K extends keyof VoiceSettingsState>(key: K, value: VoiceSettingsState[K]) => {
      onSettingsChange({ ...settings, [key]: value });
    },
    [settings, onSettingsChange],
  );

  const handleInputDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedInput(deviceId);
      updateSetting('inputDeviceId', deviceId);
    },
    [setSelectedInput, updateSetting],
  );

  const handleOutputDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedOutput(deviceId);
      updateSetting('outputDeviceId', deviceId);
    },
    [setSelectedOutput, updateSetting],
  );

  return (
    <div
      className={`bg-neutral-900/95 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md ${className}`}
      role="dialog"
      aria-label="Voice Settings"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">Voice Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            aria-label="Close voice settings"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Settings content */}
      <div className="p-4 space-y-5 overflow-y-auto max-h-[480px] scrollbar-thin scrollbar-thumb-neutral-700">
        {/* Device Selection */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Devices
          </h3>
          <div className="space-y-3">
            <DeviceSelector
              id="voice-input-device"
              label="Input Device"
              devices={inputDevices}
              selectedId={selectedInput || settings.inputDeviceId}
              onChange={handleInputDeviceChange}
            />
            <DeviceSelector
              id="voice-output-device"
              label="Output Device"
              devices={outputDevices}
              selectedId={selectedOutput || settings.outputDeviceId}
              onChange={handleOutputDeviceChange}
            />
          </div>
        </section>

        {/* Audio Processing */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Audio Processing
          </h3>
          <div className="space-y-1">
            <ToggleSwitch
              id="voice-noise-suppression"
              label="Noise Suppression"
              description="Reduces background noise from your microphone"
              checked={settings.noiseSuppression}
              onChange={(v) => updateSetting('noiseSuppression', v)}
            />
            <ToggleSwitch
              id="voice-echo-cancellation"
              label="Echo Cancellation"
              description="Prevents audio feedback loops"
              checked={settings.echoCancellation}
              onChange={(v) => updateSetting('echoCancellation', v)}
            />
          </div>
        </section>

        {/* Voice Detection */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Voice Detection
          </h3>

          {/* VAD Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="vad-sensitivity"
                className="text-sm text-neutral-200"
              >
                VAD Sensitivity
              </label>
              <span className="text-xs text-neutral-500 font-mono">
                {settings.vadSensitivity}%
              </span>
            </div>
            <input
              id="vad-sensitivity"
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.vadSensitivity}
              onChange={(e) => updateSetting('vadSensitivity', Number(e.target.value))}
              className="w-full h-1.5 accent-indigo-500 bg-neutral-700 rounded-full cursor-pointer"
              aria-label="Voice activity detection sensitivity"
            />
            <div className="flex justify-between text-xs text-neutral-600">
              <span>Less sensitive</span>
              <span>More sensitive</span>
            </div>
          </div>
        </section>

        {/* Push-to-Talk */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Push-to-Talk
          </h3>
          <PTTKeyBinder
            currentKey={settings.pushToTalkKey}
            onKeyChange={(key) => updateSetting('pushToTalkKey', key)}
          />
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// Inline SVG Icons
// ============================================================================

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
