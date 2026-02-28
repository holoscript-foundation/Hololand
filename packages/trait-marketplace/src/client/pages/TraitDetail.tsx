import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trpc } from '../App';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export function TraitDetail() {
  const { id } = useParams<{ id: string }>();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { data: trait, isLoading } = trpc.getTrait.useQuery({ id: id! });
  const purchaseMutation = trpc.purchaseTrait.useMutation();
  const favoriteMutation = trpc.toggleFavorite.useMutation();
  const reviewMutation = trpc.submitReview.useMutation();

  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!trait) {
    return (
      <div className="error-container">
        <h2>Trait not found</h2>
        <Link to="/">← Back to marketplace</Link>
      </div>
    );
  }

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      if (paymentMethod === 'stripe') {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe not loaded');

        // In production, create a payment method first
        const result = await purchaseMutation.mutateAsync({
          traitId: trait.id,
          paymentMethod: 'stripe',
          paymentMethodId: 'pm_card_visa', // Mock - replace with real payment method
        });

        alert(`Purchase successful! License key: ${result.licenseKey}`);
      } else {
        // Crypto payment flow
        alert('Crypto payment not yet implemented');
      }
    } catch (error: any) {
      alert(`Purchase failed: ${error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleFavorite = async () => {
    try {
      await favoriteMutation.mutateAsync({ traitId: trait.id });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reviewMutation.mutateAsync({
        traitId: trait.id,
        rating,
        title: reviewTitle,
        comment: reviewComment,
      });
      setReviewTitle('');
      setReviewComment('');
      alert('Review submitted successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="trait-detail">
      <div className="detail-header">
        <Link to="/" className="back-link">← Back to marketplace</Link>
      </div>

      <div className="detail-content">
        {/* Left Column */}
        <div className="detail-main">
          <div className="trait-showcase">
            <div className="trait-icon-large">@{trait.name.replace('@', '')}</div>
            {trait.isNFT && <div className="nft-badge-large">NFT Trait</div>}
          </div>

          {trait.demoVideoUrl && (
            <div className="demo-video">
              <video src={trait.demoVideoUrl} controls className="video-player"></video>
            </div>
          )}

          <div className="trait-info-section">
            <h1 className="trait-detail-title">{trait.displayName}</h1>
            <p className="trait-detail-subtitle">{trait.description}</p>

            <div className="trait-tags">
              <span className="tag">{trait.category}</span>
              {trait.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>

            <div className="trait-stats-detail">
              <div className="stat-item">
                <span className="stat-value">⭐ {trait.rating.toFixed(1)}</span>
                <span className="stat-label">{trait.reviewCount} reviews</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">↓ {trait.downloads}</span>
                <span className="stat-label">downloads</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">👁 {trait.views}</span>
                <span className="stat-label">views</span>
              </div>
            </div>
          </div>

          <div className="trait-description">
            <h2>About this trait</h2>
            <p>{trait.longDescription || trait.description}</p>
          </div>

          <div className="trait-code">
            <h2>Implementation Preview</h2>
            <pre className="code-preview">
              <code>{trait.code.slice(0, 500)}...</code>
            </pre>
          </div>

          {/* Reviews */}
          <div className="reviews-section">
            <h2>Reviews ({trait.reviews.length})</h2>
            {trait.reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <img src={review.user.avatar || '/default-avatar.png'} alt="" className="reviewer-avatar" />
                    <div>
                      <div className="reviewer-name">{review.user.username}</div>
                      <div className="review-rating">
                        {'⭐'.repeat(review.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {review.title && <h3 className="review-title">{review.title}</h3>}
                {review.comment && <p className="review-comment">{review.comment}</p>}
                {review.verified && <span className="verified-badge">✓ Verified Purchase</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="detail-sidebar">
          {/* Creator Info */}
          <div className="creator-card">
            <img src={trait.creator.avatar || '/default-avatar.png'} alt="" className="creator-avatar-large" />
            <h3 className="creator-name">{trait.creator.username}</h3>
            {trait.creator.bio && <p className="creator-bio">{trait.creator.bio}</p>}
            <div className="creator-stats">
              <div className="creator-stat">
                <span className="stat-value">⭐ {trait.creator.rating.toFixed(1)}</span>
                <span className="stat-label">Rating</span>
              </div>
              <div className="creator-stat">
                <span className="stat-value">{trait.creator.totalSales}</span>
                <span className="stat-label">Sales</span>
              </div>
            </div>
          </div>

          {/* Purchase Card */}
          <div className="purchase-card">
            <div className="price-display">
              <span className="price-label">Price</span>
              <span className="price-value">${trait.price}</span>
              <span className="price-currency">{trait.currency}</span>
            </div>

            <div className="license-info">
              <span className="license-badge">{trait.license}</span>
            </div>

            <div className="payment-methods">
              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`payment-method ${paymentMethod === 'stripe' ? 'active' : ''}`}
              >
                💳 Credit Card
              </button>
              <button
                onClick={() => setPaymentMethod('crypto')}
                className={`payment-method ${paymentMethod === 'crypto' ? 'active' : ''}`}
              >
                ⟠ Crypto
              </button>
            </div>

            <button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="purchase-button"
            >
              {isPurchasing ? 'Processing...' : 'Purchase Trait'}
            </button>

            <button onClick={handleFavorite} className="favorite-button">
              ❤️ Add to Favorites
            </button>

            <div className="purchase-includes">
              <h4>Includes:</h4>
              <ul>
                <li>✓ Full source code</li>
                <li>✓ {trait.license} license</li>
                <li>✓ Lifetime updates</li>
                <li>✓ Community support</li>
              </ul>
            </div>
          </div>

          {/* Leave Review */}
          <div className="review-form-card">
            <h3>Leave a Review</h3>
            <form onSubmit={handleSubmitReview}>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`star-button ${star <= rating ? 'active' : ''}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Review title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="review-input"
              />
              <textarea
                placeholder="Share your experience (optional)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="review-textarea"
                rows={4}
              ></textarea>
              <button type="submit" className="submit-review-button">
                Submit Review
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
