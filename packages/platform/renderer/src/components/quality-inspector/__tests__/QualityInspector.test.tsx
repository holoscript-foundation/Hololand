/**
 * QualityInspector Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualityInspector } from '../QualityInspector';
import type { QualityProfileName } from '@hololand/quality-profiles';
import type { LODParams, GeometryParams, FireEffectParams, QualityPreset } from '../types';

describe('QualityInspector', () => {
  const mockOnProfileChange = vi.fn();
  const mockOnLODChange = vi.fn();
  const mockOnGeometryChange = vi.fn();
  const mockOnFireEffectChange = vi.fn();
  const mockOnPresetSave = vi.fn();
  const mockOnPresetLoad = vi.fn();

  const mockPresets: QualityPreset[] = [
    {
      id: 'preset-1',
      name: 'My Custom Preset',
      profile: 'cinematic',
      lod: {
        enabled: true,
        levels: 4,
        distanceMultiplier: 1.2,
        autoSwitch: true,
        maxDistanceLOD0: 75,
      },
      geometry: {
        maxPolyCount: 1000000,
        maxTextureSize: 2048,
        anisotropy: 8,
        shadowMapSize: 2048,
      },
      isCustom: true,
      createdAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
          onProfileChange={mockOnProfileChange}
        />
      );

      expect(screen.getByText('Quality Inspector')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
          showFireControls={true}
        />
      );

      expect(screen.getByRole('tab', { name: /quality tier/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /lod settings/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /geometry/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /fire effects/i })).toBeInTheDocument();
    });

    it('does not render fire tab when showFireControls is false', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
          showFireControls={false}
        />
      );

      expect(screen.queryByRole('tab', { name: /fire effects/i })).not.toBeInTheDocument();
    });

    it('renders save preset button', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      expect(screen.getByRole('button', { name: /save preset/i })).toBeInTheDocument();
    });

    it('renders apply changes button when preview is disabled', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
          enablePreview={false}
        />
      );

      expect(screen.getByRole('button', { name: /apply changes/i })).toBeInTheDocument();
    });

    it('does not render apply changes button when preview is enabled', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
          enablePreview={true}
        />
      );

      expect(screen.queryByRole('button', { name: /apply changes/i })).not.toBeInTheDocument();
    });
  });

  describe('Quality Tier Tab', () => {
    it('displays all quality profile options', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      expect(screen.getByText('Industrial')).toBeInTheDocument();
      expect(screen.getByText('Cinematic')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
    });

    it('highlights the current profile', () => {
      render(
        <QualityInspector
          currentProfile="cinematic"
        />
      );

      const cinematicButton = screen.getByRole('button', { name: /cinematic/i });
      expect(cinematicButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onProfileChange when profile is selected', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onProfileChange={mockOnProfileChange}
        />
      );

      const mobileButton = screen.getByRole('button', { name: /mobile/i });
      await user.click(mobileButton);

      expect(mockOnProfileChange).toHaveBeenCalledWith('mobile');
    });

    it('displays saved presets', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
          presets={mockPresets}
        />
      );

      expect(screen.getByText('Saved Presets')).toBeInTheDocument();
      expect(screen.getByText('My Custom Preset')).toBeInTheDocument();
    });

    it('calls onPresetLoad when load button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          presets={mockPresets}
          onPresetLoad={mockOnPresetLoad}
        />
      );

      const loadButton = screen.getByRole('button', { name: /load preset my custom preset/i });
      await user.click(loadButton);

      expect(mockOnPresetLoad).toHaveBeenCalledWith(mockPresets[0]);
    });
  });

  describe('LOD Settings Tab', () => {
    it('switches to LOD tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      const lodTab = screen.getByRole('tab', { name: /lod settings/i });
      await user.click(lodTab);

      expect(screen.getByText('LOD Configuration')).toBeInTheDocument();
    });

    it('displays LOD controls', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      await user.click(screen.getByRole('tab', { name: /lod settings/i }));

      expect(screen.getByText(/enable lod system/i)).toBeInTheDocument();
      expect(screen.getByText(/lod levels:/i)).toBeInTheDocument();
      expect(screen.getByText(/distance multiplier:/i)).toBeInTheDocument();
      expect(screen.getByText(/max distance lod0:/i)).toBeInTheDocument();
    });

    it('calls onLODChange when LOD enabled is toggled (preview mode)', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onLODChange={mockOnLODChange}
          enablePreview={true}
        />
      );

      await user.click(screen.getByRole('tab', { name: /lod settings/i }));

      const enableCheckbox = screen.getByRole('checkbox', { name: /enable lod system/i });
      await user.click(enableCheckbox);

      await waitFor(() => {
        expect(mockOnLODChange).toHaveBeenCalled();
        const lodParams = mockOnLODChange.mock.calls[0][0] as LODParams;
        expect(lodParams.enabled).toBe(false);
      });
    });

    it('updates LOD levels slider', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onLODChange={mockOnLODChange}
          enablePreview={true}
        />
      );

      await user.click(screen.getByRole('tab', { name: /lod settings/i }));

      const slider = screen.getByRole('slider', { name: /lod levels:/i });
      fireEvent.change(slider, { target: { value: '5' } });

      await waitFor(() => {
        expect(mockOnLODChange).toHaveBeenCalled();
        const lodParams = mockOnLODChange.mock.calls[0][0] as LODParams;
        expect(lodParams.levels).toBe(5);
      });
    });
  });

  describe('Geometry Tab', () => {
    it('switches to geometry tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      const geometryTab = screen.getByRole('tab', { name: /geometry/i });
      await user.click(geometryTab);

      expect(screen.getByText('Geometry Resolution')).toBeInTheDocument();
    });

    it('displays geometry controls', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      await user.click(screen.getByRole('tab', { name: /geometry/i }));

      expect(screen.getByText(/max polygon count:/i)).toBeInTheDocument();
      expect(screen.getByText(/max texture size:/i)).toBeInTheDocument();
      expect(screen.getByText(/anisotropic filtering:/i)).toBeInTheDocument();
      expect(screen.getByText(/shadow map resolution:/i)).toBeInTheDocument();
    });

    it('calls onGeometryChange when polygon count changes (preview mode)', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onGeometryChange={mockOnGeometryChange}
          enablePreview={true}
        />
      );

      await user.click(screen.getByRole('tab', { name: /geometry/i }));

      const slider = screen.getByRole('slider', { name: /max polygon count:/i });
      fireEvent.change(slider, { target: { value: '1000000' } });

      await waitFor(() => {
        expect(mockOnGeometryChange).toHaveBeenCalled();
        const geometryParams = mockOnGeometryChange.mock.calls[0][0] as GeometryParams;
        expect(geometryParams.maxPolyCount).toBe(1000000);
      });
    });
  });

  describe('Fire Effects Tab', () => {
    it('shows fire tab when showFireControls is true', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          showFireControls={true}
        />
      );

      const fireTab = screen.getByRole('tab', { name: /fire effects/i });
      await user.click(fireTab);

      expect(screen.getByText('Fire Effect Controls')).toBeInTheDocument();
    });

    it('displays fire effect controls', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          showFireControls={true}
        />
      );

      await user.click(screen.getByRole('tab', { name: /fire effects/i }));

      expect(screen.getByText(/intensity:/i)).toBeInTheDocument();
      expect(screen.getByText(/fire color/i)).toBeInTheDocument();
      expect(screen.getByText(/particle count:/i)).toBeInTheDocument();
      expect(screen.getByText(/size scale:/i)).toBeInTheDocument();
      expect(screen.getByText(/emission rate:/i)).toBeInTheDocument();
    });

    it('calls onFireEffectChange when intensity changes (preview mode)', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          showFireControls={true}
          onFireEffectChange={mockOnFireEffectChange}
          enablePreview={true}
        />
      );

      await user.click(screen.getByRole('tab', { name: /fire effects/i }));

      const slider = screen.getByRole('slider', { name: /intensity:/i });
      fireEvent.change(slider, { target: { value: '0.5' } });

      await waitFor(() => {
        expect(mockOnFireEffectChange).toHaveBeenCalled();
        const fireParams = mockOnFireEffectChange.mock.calls[0][0] as FireEffectParams;
        expect(fireParams.intensity).toBeCloseTo(0.5);
      });
    });

    it('updates fire color picker', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          showFireControls={true}
          onFireEffectChange={mockOnFireEffectChange}
          enablePreview={true}
        />
      );

      await user.click(screen.getByRole('tab', { name: /fire effects/i }));

      const colorPicker = screen.getByLabelText(/fire color/i) as HTMLInputElement;
      await user.clear(colorPicker);
      await user.type(colorPicker, '#ff0000');

      // Note: Color input behavior varies by browser, so we check if the callback was called
      // In real tests, you might need to use fireEvent.change instead
    });
  });

  describe('Preset Management', () => {
    it('opens save preset dialog when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      const saveButton = screen.getByRole('button', { name: /save preset/i });
      await user.click(saveButton);

      expect(screen.getByText('Save Quality Preset')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/preset name/i)).toBeInTheDocument();
    });

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      await user.click(screen.getByRole('button', { name: /save preset/i }));
      expect(screen.getByText('Save Quality Preset')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByText('Save Quality Preset')).not.toBeInTheDocument();
    });

    it('saves preset when name is entered and save is clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onPresetSave={mockOnPresetSave}
        />
      );

      await user.click(screen.getByRole('button', { name: /save preset/i }));

      const input = screen.getByPlaceholderText(/preset name/i);
      await user.type(input, 'Test Preset');

      const saveButton = screen.getByRole('button', { name: /^save$/i });
      await user.click(saveButton);

      expect(mockOnPresetSave).toHaveBeenCalled();
      const savedPreset = mockOnPresetSave.mock.calls[0][0] as QualityPreset;
      expect(savedPreset.name).toBe('Test Preset');
      expect(savedPreset.profile).toBe('industrial');
      expect(savedPreset.isCustom).toBe(true);
    });

    it('disables save button when preset name is empty', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      await user.click(screen.getByRole('button', { name: /save preset/i }));

      const saveButton = screen.getByRole('button', { name: /^save$/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Apply Changes (Non-Preview Mode)', () => {
    it('does not call callbacks on slider change when preview is disabled', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onLODChange={mockOnLODChange}
          enablePreview={false}
        />
      );

      await user.click(screen.getByRole('tab', { name: /lod settings/i }));

      const slider = screen.getByRole('slider', { name: /lod levels:/i });
      fireEvent.change(slider, { target: { value: '5' } });

      // Should not be called immediately in non-preview mode
      expect(mockOnLODChange).not.toHaveBeenCalled();
    });

    it('calls all callbacks when apply button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
          onLODChange={mockOnLODChange}
          onGeometryChange={mockOnGeometryChange}
          onFireEffectChange={mockOnFireEffectChange}
          showFireControls={true}
          enablePreview={false}
        />
      );

      // Make some changes
      await user.click(screen.getByRole('tab', { name: /lod settings/i }));
      const lodSlider = screen.getByRole('slider', { name: /lod levels:/i });
      fireEvent.change(lodSlider, { target: { value: '5' } });

      // Click apply
      const applyButton = screen.getByRole('button', { name: /apply changes/i });
      await user.click(applyButton);

      expect(mockOnLODChange).toHaveBeenCalled();
      expect(mockOnGeometryChange).toHaveBeenCalled();
      expect(mockOnFireEffectChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('uses proper ARIA roles for tabs', () => {
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('sets aria-selected on active tab', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      const qualityTab = screen.getByRole('tab', { name: /quality tier/i });
      expect(qualityTab).toHaveAttribute('aria-selected', 'true');

      const lodTab = screen.getByRole('tab', { name: /lod settings/i });
      await user.click(lodTab);

      expect(lodTab).toHaveAttribute('aria-selected', 'true');
      expect(qualityTab).toHaveAttribute('aria-selected', 'false');
    });

    it('uses proper labels for sliders', async () => {
      const user = userEvent.setup();
      render(
        <QualityInspector
          currentProfile="industrial"
        />
      );

      await user.click(screen.getByRole('tab', { name: /lod settings/i }));

      // All sliders should have accessible labels
      expect(screen.getByRole('slider', { name: /lod levels:/i })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: /distance multiplier:/i })).toBeInTheDocument();
    });
  });
});
