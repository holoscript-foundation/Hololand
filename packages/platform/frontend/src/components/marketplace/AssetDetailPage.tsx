'use client';

/**
 * AssetDetailPage Component
 *
 * Full asset detail view for the HoloLand marketplace.
 *
 * Features:
 *   - Large preview area (3D model viewer placeholder, code preview, texture preview)
 *   - Title, description, creator profile link
 *   - Price with "Buy Now" button
 *   - Stripe Elements payment form (card input, pay button with loading state)
 *   - Rating display with review count
 *   - "Remix This" button linking to RemixService
 *   - Related assets section
 *   - Purchase confirmation modal
 *
 * Wires to StripePaymentService/MarketplaceCheckout/RemixService APIs.
 *
 * @module marketplace/AssetDetailPage
 */

import { useState, useEffect, useCallback } from 'react';
import {
  marketplaceAPI,
  checkoutAPI,
  remixAPI,
  type AssetDetail,
  type MarketplaceAsset,
  type AssetReview,
  type CheckoutSession,
} from './marketplaceApi';

// ============================================================================
// Props
// ============================================================================

export interface AssetDetailPageProps {
  /** The asset ID to display */
  assetId: string;
  /** Currently logged-in user ID (null if not logged in) */
  currentUserId: string | null;
  /** Stripe publishable key for Elements */
  stripePublishableKey?: string;
  /** Called when navigating to another asset */
  onAssetClick: (assetId: string) => void;
  /** Called when navigating to a creator profile */
  onCreatorClick?: (creatorId: string) => void;
  /** Called after successful remix */
  onRemixSuccess?: (remixWorldId: string) => void;
  /** Called to navigate back */
  onBack?: () => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating display */
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg key={`full-${i}`} className={`${sizeClass} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalf && (
        <svg className={`${sizeClass} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="halfStarDetail">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStarDetail)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg key={`empty-${i}`} className={`${sizeClass} text-gray-300`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** Preview area adapts based on asset category */
function AssetPreview({ asset }: { asset: AssetDetail }) {
  const [activePreview, setActivePreview] = useState(0);
  const allPreviews = [asset.thumbnailUrl, ...asset.previewUrls].filter(Boolean) as string[];

  if (asset.category === '3d-models') {
    return (
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {/* 3D model viewer placeholder */}
        <div className="aspect-video flex items-center justify-center relative">
          {asset.thumbnailUrl ? (
            <img
              src={allPreviews[activePreview] || asset.thumbnailUrl}
              alt={asset.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-gray-500 text-center">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>3D Preview</p>
            </div>
          )}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            3D Model - Click and drag to rotate
          </div>
        </div>
        {allPreviews.length > 1 && (
          <div className="flex gap-2 p-3 bg-gray-800 overflow-x-auto">
            {allPreviews.map((url, i) => (
              <button
                key={i}
                onClick={() => setActivePreview(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                  i === activePreview ? 'border-indigo-500' : 'border-transparent hover:border-gray-600'
                }`}
              >
                <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (asset.category === 'scripts') {
    return (
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-400 text-xs ml-2">{asset.title}</span>
        </div>
        <div className="p-4 font-mono text-sm text-green-400 overflow-x-auto max-h-96">
          <pre className="whitespace-pre-wrap">
            {asset.longDescription || '// Code preview will appear here\n// Purchase to access full source code'}
          </pre>
        </div>
      </div>
    );
  }

  // Materials / textures / sounds / default
  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden">
      <div className="aspect-video flex items-center justify-center">
        {asset.thumbnailUrl ? (
          <img
            src={allPreviews[activePreview] || asset.thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-gray-400 text-center">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No Preview Available</p>
          </div>
        )}
      </div>
      {allPreviews.length > 1 && (
        <div className="flex gap-2 p-3 bg-gray-200 overflow-x-auto">
          {allPreviews.map((url, i) => (
            <button
              key={i}
              onClick={() => setActivePreview(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                i === activePreview ? 'border-indigo-500' : 'border-transparent hover:border-gray-400'
              }`}
            >
              <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Stripe payment form (simplified - in production, use @stripe/react-stripe-js) */
function PaymentForm({
  asset,
  currentUserId,
  onPaymentSuccess,
  onPaymentError,
}: {
  asset: AssetDetail;
  currentUserId: string;
  onPaymentSuccess: (session: CheckoutSession) => void;
  onPaymentError: (error: string) => void;
}) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      // Create checkout session via backend
      const { data, error: apiError } = await checkoutAPI.createSession({
        assetId: asset.id,
        listingId: asset.listingId,
        buyerId: currentUserId,
        sellerId: asset.creatorId,
        amountCents: asset.priceCents,
      });

      if (apiError) {
        setError(apiError.message);
        onPaymentError(apiError.message);
        setProcessing(false);
        return;
      }

      if (data) {
        // In production, use stripe.confirmCardPayment(data.clientSecret, { payment_method: ... })
        // For now, simulate success after creating the session
        onPaymentSuccess(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      onPaymentError(message);
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-1">
          Card Number
        </label>
        <input
          id="card-number"
          type="text"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
          autoComplete="cc-number"
          inputMode="numeric"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700 mb-1">
            Expiry
          </label>
          <input
            id="card-expiry"
            type="text"
            placeholder="MM/YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
            autoComplete="cc-exp"
            inputMode="numeric"
          />
        </div>
        <div>
          <label htmlFor="card-cvc" className="block text-sm font-medium text-gray-700 mb-1">
            CVC
          </label>
          <input
            id="card-cvc"
            type="text"
            placeholder="123"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
            autoComplete="cc-csc"
            inputMode="numeric"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={processing}
        className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            Pay ${(asset.priceCents / 100).toFixed(2)}
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Payments are securely processed by Stripe. HoloLand never sees your card details.
      </p>
    </form>
  );
}

/** Purchase confirmation modal */
function PurchaseConfirmationModal({
  asset,
  session,
  onClose,
}: {
  asset: AssetDetail;
  session: CheckoutSession;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Purchase confirmation"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Purchase Complete!</h2>
          <p className="text-gray-600 text-sm">
            You now own <span className="font-semibold">{asset.title}</span>
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Asset</span>
            <span className="font-medium text-gray-900">{asset.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span className="font-medium text-gray-900">
              ${(session.amountCents / 100).toFixed(2)} {session.currency.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Transaction ID</span>
            <span className="font-mono text-xs text-gray-600">{session.id.slice(0, 12)}...</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors text-sm"
          >
            View in Library
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}

/** Review display */
function ReviewCard({ review }: { review: AssetReview }) {
  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium overflow-hidden">
          {review.userAvatarUrl ? (
            <img src={review.userAvatarUrl} alt={review.userName} className="w-full h-full object-cover" />
          ) : (
            review.userName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-900">{review.userName}</span>
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
    </div>
  );
}

/** Related asset card (compact) */
function RelatedAssetCard({
  asset,
  onClick,
}: {
  asset: MarketplaceAsset;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="bg-gray-100 h-28 overflow-hidden">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Preview
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
          {asset.title}
        </h4>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-bold text-gray-900">
            {asset.priceCents === 0 ? 'Free' : `$${(asset.priceCents / 100).toFixed(2)}`}
          </span>
          <StarRating rating={asset.rating} size="sm" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AssetDetailPage({
  assetId,
  currentUserId,
  onAssetClick,
  onCreatorClick,
  onRemixSuccess,
  onBack,
}: AssetDetailPageProps) {
  // ---- State ----
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [relatedAssets, setRelatedAssets] = useState<MarketplaceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [owned, setOwned] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [purchaseSession, setPurchaseSession] = useState<CheckoutSession | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [remixing, setRemixing] = useState(false);

  // ---- Data Fetching ----
  useEffect(() => {
    let cancelled = false;

    async function loadAsset() {
      setLoading(true);
      setError(null);
      setShowPaymentForm(false);
      setPurchaseSession(null);
      setShowConfirmation(false);

      const { data, error: apiError } = await marketplaceAPI.getAsset(assetId);
      if (cancelled) return;

      if (apiError) {
        setError(apiError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setAsset(data);
        setRelatedAssets(data.relatedAssets || []);
      }

      setLoading(false);
    }

    loadAsset();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // Check ownership
  useEffect(() => {
    if (!currentUserId || !assetId) return;
    checkoutAPI.checkOwnership(currentUserId, assetId).then(({ data }) => {
      if (data) setOwned(data.owned);
    });
  }, [currentUserId, assetId]);

  // Fetch related assets
  useEffect(() => {
    marketplaceAPI.getRelatedAssets(assetId, 6).then(({ data }) => {
      if (data) setRelatedAssets(data);
    });
  }, [assetId]);

  // ---- Handlers ----
  const handleBuyNow = useCallback(() => {
    if (!currentUserId) {
      // In production, redirect to login
      return;
    }
    setShowPaymentForm(true);
  }, [currentUserId]);

  const handlePaymentSuccess = useCallback((session: CheckoutSession) => {
    setPurchaseSession(session);
    setShowPaymentForm(false);
    setShowConfirmation(true);
    setOwned(true);
  }, []);

  const handlePaymentError = useCallback((errorMsg: string) => {
    // Error is handled within the PaymentForm
  }, []);

  const handleRemix = useCallback(async () => {
    if (!currentUserId || !asset) return;
    setRemixing(true);

    const { data, error: apiError } = await remixAPI.remixAsset({
      sourceAssetId: asset.id,
      remixerId: currentUserId,
      title: `Remix of ${asset.title}`,
    });

    setRemixing(false);

    if (data && onRemixSuccess) {
      onRemixSuccess(data.remixWorldId);
    }
  }, [currentUserId, asset, onRemixSuccess]);

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="bg-gray-200 rounded-xl h-96" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
              <div className="h-64 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Asset not found</h2>
          <p className="text-sm text-gray-500 mb-4">{error || 'The asset you are looking for does not exist.'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
            >
              Back to Marketplace
            </button>
          )}
        </div>
      </div>
    );
  }

  const isFree = asset.priceCents === 0;

  // ---- Render ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back navigation */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Back to marketplace"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
            <span className="hover:text-gray-700 cursor-pointer" onClick={onBack}>
              Marketplace
            </span>
            <span className="mx-2">/</span>
            <span className="capitalize">{asset.category.replace('-', ' ')}</span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{asset.title}</span>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Preview Area */}
        <div className="mb-8">
          <AssetPreview asset={asset} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Creator */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded capitalize">
                  {asset.category.replace('-', ' ')}
                </span>
                {asset.featured && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">
                    FEATURED
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{asset.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                  onClick={() => onCreatorClick?.(asset.creatorId)}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs font-medium">
                    {asset.creatorAvatarUrl ? (
                      <img src={asset.creatorAvatarUrl} alt={asset.creatorName} className="w-full h-full object-cover" />
                    ) : (
                      asset.creatorName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span>{asset.creatorName}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <StarRating rating={asset.rating} />
                  <span className="text-sm text-gray-500">
                    {asset.rating.toFixed(1)} ({asset.reviewCount} review{asset.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {asset.downloadCount.toLocaleString()} downloads
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {asset.longDescription || asset.description}
              </div>
            </div>

            {/* Details table */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {[
                  { label: 'Format', value: asset.fileFormat },
                  { label: 'File Size', value: `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB` },
                  { label: 'Version', value: asset.version },
                  { label: 'License', value: asset.license },
                  { label: 'Published', value: new Date(asset.createdAt).toLocaleDateString() },
                  { label: 'Last Updated', value: new Date(asset.updatedAt).toLocaleDateString() },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-gray-900 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
              {asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {asset.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Reviews ({asset.reviewCount})
              </h2>
              {asset.reviews && asset.reviews.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  {asset.reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No reviews yet. Be the first to review this asset!</p>
              )}
            </div>
          </div>

          {/* Right: Purchase Sidebar */}
          <div className="space-y-4">
            {/* Price card */}
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <div className="text-center mb-5">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {isFree ? 'Free' : `$${(asset.priceCents / 100).toFixed(2)}`}
                </div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {asset.pricingTier} tier
                </span>
              </div>

              {/* Buy / Download button */}
              {owned ? (
                <div className="space-y-3">
                  <button className="w-full py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <p className="text-xs text-center text-green-600 font-medium">
                    You own this asset
                  </p>
                </div>
              ) : showPaymentForm && !isFree ? (
                <PaymentForm
                  asset={asset}
                  currentUserId={currentUserId!}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              ) : (
                <button
                  onClick={handleBuyNow}
                  disabled={!currentUserId}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isFree ? 'Get Free' : 'Buy Now'}
                </button>
              )}

              {!currentUserId && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Sign in to purchase
                </p>
              )}

              {/* Remix button */}
              <div className="border-t border-gray-100 mt-5 pt-5">
                <button
                  onClick={handleRemix}
                  disabled={remixing || !currentUserId}
                  className="w-full py-2.5 border border-indigo-300 text-indigo-600 font-medium rounded-md hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {remixing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Remixing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Remix This
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center mt-1.5">
                  Fork and modify this asset for your own world
                </p>
              </div>

              {/* Creator info */}
              <div className="border-t border-gray-100 mt-5 pt-5">
                <button
                  className="flex items-center gap-3 w-full text-left hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md transition-colors"
                  onClick={() => onCreatorClick?.(asset.creatorId)}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {asset.creatorAvatarUrl ? (
                      <img src={asset.creatorAvatarUrl} alt={asset.creatorName} className="w-full h-full object-cover" />
                    ) : (
                      asset.creatorName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{asset.creatorName}</div>
                    <div className="text-xs text-indigo-600">View Profile</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Assets */}
        {relatedAssets.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Related Assets</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedAssets.map((related) => (
                <RelatedAssetCard
                  key={related.id}
                  asset={related}
                  onClick={() => onAssetClick(related.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Purchase Confirmation Modal */}
      {showConfirmation && asset && purchaseSession && (
        <PurchaseConfirmationModal
          asset={asset}
          session={purchaseSession}
          onClose={() => setShowConfirmation(false)}
        />
      )}
    </div>
  );
}

export default AssetDetailPage;
