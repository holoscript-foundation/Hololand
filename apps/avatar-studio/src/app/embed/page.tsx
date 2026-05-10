'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlueprint } from '@/hooks/useBlueprint';
import {
  notifyReady,
  notifyAvatarCreated,
  notifyCancelled,
  onParentMessage,
  isEmbedded,
} from '@/lib/postMessage';
import type { AvatarBlueprint, EmbedParams } from '@/lib/types';
import { AvatarPreview } from '@/components/preview/AvatarPreview';
import { TabBar } from '@/components/editor/TabBar';
import {
  BodyTab,
  FaceTab,
  HairTab,
  ClothingTab,
  AccessoriesTab,
  ExpressionsTab,
  ExportTab,
} from '@/components/editor';

/**
 * Embed Page (/embed)
 *
 * This is the page loaded by AvatarStudioSDK when using iframe or popup mode.
 * It reads configuration from URL query parameters and communicates back to
 * the parent window via postMessage.
 *
 * Query params are set by AvatarStudioSDK.buildStudioUrl() in the SDK package.
 */
function EmbedPageContent() {
  const searchParams = useSearchParams();

  // Parse embed params from URL
  const embedParams = useMemo<Partial<EmbedParams>>(() => {
    return {
      appId: searchParams.get('appId') ?? undefined,
      mode: (searchParams.get('mode') as 'iframe' | 'popup') ?? 'iframe',
      quality: searchParams.get('quality') ?? 'optimized',
      upload: searchParams.get('upload') ?? 'true',
      theme: (searchParams.get('theme') as 'light' | 'dark' | 'auto') ?? 'auto',
      locale: searchParams.get('locale') ?? 'en',
      showExport: searchParams.get('showExport') ?? undefined,
      bodyPresets: searchParams.get('bodyPresets') ?? undefined,
      clothingCategories: searchParams.get('clothingCategories') ?? undefined,
      userToken: searchParams.get('userToken') ?? undefined,
      blueprint: searchParams.get('blueprint') ?? undefined,
    };
  }, [searchParams]);

  // Decode initial blueprint from base64 if provided
  const initialBlueprint = useMemo<Partial<AvatarBlueprint> | undefined>(() => {
    if (!embedParams.blueprint) return undefined;
    try {
      return JSON.parse(atob(embedParams.blueprint));
    } catch {
      console.warn('Failed to decode initial blueprint from URL params');
      return undefined;
    }
  }, [embedParams.blueprint]);

  const store = useBlueprint(initialBlueprint);

  // Notify parent that studio is ready
  useEffect(() => {
    if (!isEmbedded()) return;

    notifyReady();

    // Listen for commands from parent (SDK)
    const cleanup = onParentMessage((type, payload) => {
      switch (type) {
        case 'load-blueprint':
          if (payload && typeof payload === 'object') {
            store.reset(payload as Partial<AvatarBlueprint>);
          }
          break;
        case 'request-export':
          handleExportAndNotify();
          break;
        case 'request-cancel':
          notifyCancelled();
          break;
      }
    });

    return cleanup;
  }, []);

  const handleExportAndNotify = () => {
    // In full implementation: export via AvatarStudio, then send to parent
    notifyAvatarCreated({
      avatarId: store.blueprint.id,
      blueprint: store.blueprint,
      thumbnailDataUrl: undefined,
    });
  };

  const handleDone = () => {
    notifyAvatarCreated({
      avatarId: store.blueprint.id,
      blueprint: store.blueprint,
    });

    // If popup mode, close the window
    if (embedParams.mode === 'popup') {
      window.close();
    }
  };

  const handleCancel = () => {
    notifyCancelled();
    if (embedParams.mode === 'popup') {
      window.close();
    }
  };

  const showExport = embedParams.showExport !== 'false';

  const renderActiveTab = () => {
    switch (store.activeTab) {
      case 'body':
        return <BodyTab store={store} />;
      case 'face':
        return <FaceTab store={store} />;
      case 'hair':
        return <HairTab store={store} />;
      case 'clothing':
        return <ClothingTab store={store} />;
      case 'accessories':
        return <AccessoriesTab store={store} />;
      case 'expressions':
        return <ExpressionsTab store={store} />;
      case 'export':
        return showExport ? <ExportTab store={store} /> : <BodyTab store={store} />;
      default:
        return <BodyTab store={store} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-studio-bg">
      {/* Compact header for embed */}
      <header className="flex items-center justify-between px-3 py-1.5 border-b border-studio-border bg-studio-panel">
        <span className="text-xs font-semibold text-studio-text">
          Avatar Studio
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="studio-btn-secondary text-xs px-3 py-1"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="studio-btn-primary text-xs px-3 py-1"
          >
            Done
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 3D Preview */}
        <div className="flex-1 min-w-0">
          <AvatarPreview blueprint={store.blueprint} />
        </div>

        {/* Editor Panel */}
        <aside className="w-[320px] flex-shrink-0 border-l border-studio-border bg-studio-panel flex flex-col">
          <TabBar activeTab={store.activeTab} onTabChange={store.setTab} />
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderActiveTab()}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-studio-bg" />}>
      <EmbedPageContent />
    </Suspense>
  );
}
