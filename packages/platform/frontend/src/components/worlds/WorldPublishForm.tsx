'use client';

/**
 * WorldPublishForm Component
 *
 * Multi-step publish wizard for creators with 4 steps:
 *   Step 1: Basic Info (title, description, category)
 *   Step 2: Media (thumbnail upload, screenshots upload, preview video URL)
 *   Step 3: Settings (max capacity, age rating, visibility, tags)
 *   Step 4: Review summary with publish button
 *
 * Wires to WorldPublishingService via worldsApi.
 *
 * @module worlds/WorldPublishForm
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  worldsAPI,
  type WorldMetadata,
  type TopCategory,
  type AgeRating,
  type WorldVisibility,
} from './worldsApi';

// ============================================================================
// Props
// ============================================================================

export interface WorldPublishFormProps {
  /** The scene ID to publish */
  sceneId: string;
  /** Called when publishing is complete */
  onPublishComplete: (worldId: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Pre-fill metadata (e.g., from an existing draft) */
  initialMetadata?: Partial<WorldMetadata>;
  /** If editing an existing draft, provide the world ID */
  existingWorldId?: string;
}

// ============================================================================
// Types
// ============================================================================

type WizardStep = 1 | 2 | 3 | 4;

interface FormState {
  // Step 1: Basic Info
  title: string;
  description: string;
  category: TopCategory | '';

  // Step 2: Media
  thumbnailUrl: string;
  screenshotUrls: string[];
  previewVideoUrl: string;

  // Step 3: Settings
  maxCapacity: number;
  ageRating: AgeRating;
  visibility: WorldVisibility;
  tags: string[];
  tagInput: string;
}

interface StepValidation {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: { value: TopCategory; label: string; description: string; icon: string }[] = [
  { value: 'games', label: 'Games', description: 'Interactive games and playable experiences', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
  { value: 'art', label: 'Art', description: 'Visual art, galleries, and creative showcases', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { value: 'education', label: 'Education', description: 'Learning environments and training', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { value: 'social', label: 'Social', description: 'Social hangouts, events, and meeting spaces', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { value: 'enterprise', label: 'Enterprise', description: 'Business tools, dashboards, workspaces', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
];

const AGE_RATINGS: { value: AgeRating; label: string; description: string; badge: string }[] = [
  { value: 'everyone', label: 'Everyone', description: 'Suitable for all ages', badge: 'E' },
  { value: 'teen', label: 'Teen', description: 'May contain moderate content', badge: 'T' },
  { value: 'mature', label: 'Mature', description: 'Contains adult themes or content', badge: 'M' },
];

const VISIBILITY_OPTIONS: { value: WorldVisibility; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Visible to everyone in the world directory' },
  { value: 'unlisted', label: 'Unlisted', description: 'Only accessible via direct link' },
  { value: 'private', label: 'Private', description: 'Only you can access this world' },
];

const MAX_TAGS = 20;
const MAX_SCREENSHOTS = 10;
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;

// ============================================================================
// Validation
// ============================================================================

function validateStep1(form: FormState): StepValidation {
  const errors: string[] = [];
  if (!form.title.trim() || form.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  if (form.title.trim().length > MAX_TITLE_LENGTH) {
    errors.push(`Title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }
  if (!form.description.trim() || form.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
  }
  if (!form.category) {
    errors.push('Please select a category');
  }
  return { isValid: errors.length === 0, errors };
}

function validateStep2(_form: FormState): StepValidation {
  // Media is optional but recommended
  return { isValid: true, errors: [] };
}

function validateStep3(form: FormState): StepValidation {
  const errors: string[] = [];
  if (form.maxCapacity < 1 || form.maxCapacity > 100) {
    errors.push('Max capacity must be between 1 and 100');
  }
  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Step indicator progress bar */
function StepIndicator({ currentStep, totalSteps }: { currentStep: WizardStep; totalSteps: number }) {
  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Media' },
    { num: 3, label: 'Settings' },
    { num: 4, label: 'Review' },
  ];

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.slice(0, totalSteps).map((step, idx) => (
        <div key={step.num} className="flex items-center flex-1">
          <div className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                step.num < currentStep
                  ? 'bg-green-500 text-white'
                  : step.num === currentStep
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              {step.num < currentStep ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            <span
              className={`text-sm hidden sm:block ${
                step.num <= currentStep ? 'text-white font-medium' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-2 rounded ${
                step.num < currentStep ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Tag input component */
function TagInput({
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}: {
  tags: string[];
  tagInput: string;
  onTagInputChange: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      onAddTag();
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-3 bg-gray-900 border border-gray-700 rounded-lg min-h-[48px] focus-within:ring-2 focus-within:ring-indigo-500">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 text-indigo-300 text-sm rounded-md"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="text-indigo-400 hover:text-indigo-200 ml-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            type="text"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (tagInput.trim()) onAddTag(); }}
            placeholder={tags.length === 0 ? 'Add tags (press Enter)...' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none"
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-600">Separate tags with Enter or comma</span>
        <span className="text-xs text-gray-600">{tags.length}/{MAX_TAGS}</span>
      </div>
    </div>
  );
}

/** URL-based media input (image/video URL) */
function MediaUrlInput({
  label,
  value,
  onChange,
  placeholder,
  preview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  preview?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {preview && value && (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-700/50 max-w-xs">
          <img
            src={value}
            alt="Preview"
            className="w-full h-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

/** Step 1: Basic Info */
function Step1BasicInfo({
  form,
  onChange,
  validation,
}: {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
  validation: StepValidation;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Basic Information</h2>
        <p className="text-gray-500 text-sm">Tell visitors what your world is about.</p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          World Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Enter a memorable title for your world"
          maxLength={MAX_TITLE_LENGTH}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-600">Minimum 3 characters</span>
          <span className={`text-xs ${form.title.length > MAX_TITLE_LENGTH - 10 ? 'text-yellow-500' : 'text-gray-600'}`}>
            {form.title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe your world. What can visitors expect? What makes it unique?"
          rows={6}
          maxLength={MAX_DESCRIPTION_LENGTH}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-600">Minimum 10 characters</span>
          <span className={`text-xs ${form.description.length > MAX_DESCRIPTION_LENGTH - 100 ? 'text-yellow-500' : 'text-gray-600'}`}>
            {form.description.length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Category <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map(({ value, label, description, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ category: value })}
              className={`p-4 rounded-xl border text-left transition-all ${
                form.category === value
                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className={`w-5 h-5 ${form.category === value ? 'text-indigo-400' : 'text-gray-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                </svg>
                <span className={`font-medium ${form.category === value ? 'text-indigo-300' : 'text-white'}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-gray-500">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Validation errors */}
      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <ul className="text-red-400 text-sm space-y-1">
            {validation.errors.map((err, i) => (
              <li key={i} className="flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Step 2: Media */
function Step2Media({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
}) {
  const addScreenshot = (url: string) => {
    if (url.trim() && form.screenshotUrls.length < MAX_SCREENSHOTS) {
      onChange({ screenshotUrls: [...form.screenshotUrls, url.trim()] });
    }
  };

  const removeScreenshot = (idx: number) => {
    onChange({ screenshotUrls: form.screenshotUrls.filter((_, i) => i !== idx) });
  };

  const [newScreenshotUrl, setNewScreenshotUrl] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Media</h2>
        <p className="text-gray-500 text-sm">Add images and videos to showcase your world.</p>
      </div>

      {/* Thumbnail */}
      <MediaUrlInput
        label="Thumbnail Image URL"
        value={form.thumbnailUrl}
        onChange={(v) => onChange({ thumbnailUrl: v })}
        placeholder="https://example.com/thumbnail.jpg"
        preview
      />

      {/* Screenshots */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Screenshots ({form.screenshotUrls.length}/{MAX_SCREENSHOTS})
        </label>

        {form.screenshotUrls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {form.screenshotUrls.map((url, idx) => (
              <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-gray-700/50">
                <img
                  src={url}
                  alt={`Screenshot ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).className = 'w-full h-full bg-gray-700';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {form.screenshotUrls.length < MAX_SCREENSHOTS && (
          <div className="flex gap-2">
            <input
              type="url"
              value={newScreenshotUrl}
              onChange={(e) => setNewScreenshotUrl(e.target.value)}
              placeholder="https://example.com/screenshot.jpg"
              className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addScreenshot(newScreenshotUrl);
                  setNewScreenshotUrl('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                addScreenshot(newScreenshotUrl);
                setNewScreenshotUrl('');
              }}
              disabled={!newScreenshotUrl.trim()}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Preview Video */}
      <MediaUrlInput
        label="Preview Video URL (optional)"
        value={form.previewVideoUrl}
        onChange={(v) => onChange({ previewVideoUrl: v })}
        placeholder="https://youtube.com/watch?v=... or direct video URL"
      />

      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-blue-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Worlds with thumbnails and screenshots get 3x more visits on average.
        </p>
      </div>
    </div>
  );
}

/** Step 3: Settings */
function Step3Settings({
  form,
  onChange,
  validation,
}: {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
  validation: StepValidation;
}) {
  const handleAddTag = () => {
    const tag = form.tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !form.tags.includes(tag) && form.tags.length < MAX_TAGS) {
      onChange({ tags: [...form.tags, tag], tagInput: '' });
    } else {
      onChange({ tagInput: '' });
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange({ tags: form.tags.filter(t => t !== tag) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Settings</h2>
        <p className="text-gray-500 text-sm">Configure how your world behaves and who can access it.</p>
      </div>

      {/* Max Capacity */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Capacity
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="100"
            value={form.maxCapacity}
            onChange={(e) => onChange({ maxCapacity: Number(e.target.value) })}
            className="flex-1 accent-indigo-500"
          />
          <div className="w-20 text-center">
            <input
              type="number"
              min="1"
              max="100"
              value={form.maxCapacity}
              onChange={(e) => onChange({ maxCapacity: Math.max(1, Math.min(100, Number(e.target.value))) })}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1">Maximum number of simultaneous players (1-100)</p>
      </div>

      {/* Age Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Age Rating</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AGE_RATINGS.map(({ value, label, description, badge }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ageRating: value })}
              className={`p-4 rounded-xl border text-left transition-all ${
                form.ageRating === value
                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold ${
                  value === 'everyone'
                    ? 'bg-green-500/20 text-green-400'
                    : value === 'teen'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {badge}
                </span>
                <span className={`font-medium ${form.ageRating === value ? 'text-indigo-300' : 'text-white'}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-gray-500">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ visibility: value })}
              className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${
                form.visibility === value
                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                form.visibility === value ? 'border-indigo-500' : 'border-gray-600'
              }`}>
                {form.visibility === value && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </div>
              <div>
                <div className={`font-medium ${form.visibility === value ? 'text-indigo-300' : 'text-white'}`}>
                  {label}
                </div>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
        <TagInput
          tags={form.tags}
          tagInput={form.tagInput}
          onTagInputChange={(v) => onChange({ tagInput: v })}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      </div>

      {/* Validation errors */}
      {validation.errors.length > 0 && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <ul className="text-red-400 text-sm space-y-1">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Step 4: Review & Publish */
function Step4Review({
  form,
  sceneId,
  isSubmitting,
  submitError,
}: {
  form: FormState;
  sceneId: string;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const categoryLabel = CATEGORIES.find(c => c.value === form.category)?.label ?? form.category;
  const ageLabel = AGE_RATINGS.find(a => a.value === form.ageRating)?.label ?? form.ageRating;
  const visLabel = VISIBILITY_OPTIONS.find(v => v.value === form.visibility)?.label ?? form.visibility;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Review & Publish</h2>
        <p className="text-gray-500 text-sm">Review your world details before publishing.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
        {/* Thumbnail preview */}
        {form.thumbnailUrl && (
          <div className="aspect-video max-h-48 overflow-hidden">
            <img
              src={form.thumbnailUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Title & Category */}
          <div>
            <h3 className="text-2xl font-bold text-white">{form.title || 'Untitled World'}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded capitalize">
                {categoryLabel}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${
                form.ageRating === 'everyone'
                  ? 'bg-green-500/20 text-green-300'
                  : form.ageRating === 'teen'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {ageLabel}
              </span>
              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                {visLabel}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {form.description || 'No description provided.'}
            </p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700/50">
            <div>
              <span className="text-xs text-gray-500 block">Max Capacity</span>
              <span className="text-white font-medium">{form.maxCapacity} players</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Scene ID</span>
              <span className="text-white font-mono text-sm">{sceneId}</span>
            </div>
          </div>

          {/* Tags */}
          {form.tags.length > 0 && (
            <div className="pt-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500 block mb-2">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Media count */}
          <div className="pt-3 border-t border-gray-700/50 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-xs text-gray-500 block">Thumbnail</span>
              <span className={`text-sm font-medium ${form.thumbnailUrl ? 'text-green-400' : 'text-gray-600'}`}>
                {form.thumbnailUrl ? 'Uploaded' : 'None'}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Screenshots</span>
              <span className="text-sm font-medium text-white">{form.screenshotUrls.length}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Preview Video</span>
              <span className={`text-sm font-medium ${form.previewVideoUrl ? 'text-green-400' : 'text-gray-600'}`}>
                {form.previewVideoUrl ? 'Set' : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Publishing info */}
      <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
        <h4 className="text-indigo-300 font-medium mb-1 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          What happens next?
        </h4>
        <p className="text-indigo-300/70 text-sm">
          Your world will be submitted for review. Once approved by a moderator, it will be
          published to the world directory and visible to other users based on your visibility settings.
        </p>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{submitError}</p>
        </div>
      )}

      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-indigo-400 py-4">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Creating and submitting your world...</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorldPublishForm({
  sceneId,
  onPublishComplete,
  onCancel,
  initialMetadata = {},
  existingWorldId,
}: WorldPublishFormProps) {
  // -- State --
  const [step, setStep] = useState<WizardStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    title: initialMetadata.title ?? '',
    description: initialMetadata.description ?? '',
    category: initialMetadata.category ?? '',
    thumbnailUrl: initialMetadata.thumbnailUrl ?? '',
    screenshotUrls: initialMetadata.screenshotUrls ?? [],
    previewVideoUrl: initialMetadata.previewVideoUrl ?? '',
    maxCapacity: initialMetadata.maxCapacity ?? 20,
    ageRating: initialMetadata.ageRating ?? 'everyone',
    visibility: initialMetadata.visibility ?? 'public',
    tags: initialMetadata.tags ?? [],
    tagInput: '',
  });

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  // -- Step validation --
  const step1Validation = useMemo(() => validateStep1(form), [form]);
  const step2Validation = useMemo(() => validateStep2(form), [form]);
  const step3Validation = useMemo(() => validateStep3(form), [form]);

  const canProceed = (currentStep: WizardStep): boolean => {
    switch (currentStep) {
      case 1: return step1Validation.isValid;
      case 2: return step2Validation.isValid;
      case 3: return step3Validation.isValid;
      case 4: return true;
      default: return false;
    }
  };

  // -- Navigation --
  const goNext = useCallback(() => {
    if (step < 4 && canProceed(step)) {
      setStep((step + 1) as WizardStep);
    }
  }, [step, form]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  }, [step]);

  // -- Submit --
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const metadata: WorldMetadata = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category as TopCategory,
        tags: form.tags,
        maxCapacity: form.maxCapacity,
        ageRating: form.ageRating,
        visibility: form.visibility,
        thumbnailUrl: form.thumbnailUrl || undefined,
        screenshotUrls: form.screenshotUrls.length > 0 ? form.screenshotUrls : undefined,
        previewVideoUrl: form.previewVideoUrl || undefined,
      };

      if (existingWorldId) {
        // Update existing draft
        await worldsAPI.updateMetadata(existingWorldId, metadata);
        await worldsAPI.submitForReview(existingWorldId);
        onPublishComplete(existingWorldId);
      } else {
        // Create new draft and submit
        const draft = await worldsAPI.createDraft(sceneId, metadata);
        await worldsAPI.submitForReview(draft.id);
        onPublishComplete(draft.id);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to publish world');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, sceneId, existingWorldId, isSubmitting, onPublishComplete]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Publish World</h1>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} totalSteps={4} />

        {/* Step content */}
        <div className="bg-gray-850 rounded-2xl">
          {step === 1 && (
            <Step1BasicInfo form={form} onChange={updateForm} validation={step1Validation} />
          )}
          {step === 2 && (
            <Step2Media form={form} onChange={updateForm} />
          )}
          {step === 3 && (
            <Step3Settings form={form} onChange={updateForm} validation={step3Validation} />
          )}
          {step === 4 && (
            <Step4Review
              form={form}
              sceneId={sceneId}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
          <div>
            {step > 1 ? (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : (
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                onClick={goNext}
                disabled={!canProceed(step)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !step1Validation.isValid || !step3Validation.isValid}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-500/20"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit for Review
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorldPublishForm;
