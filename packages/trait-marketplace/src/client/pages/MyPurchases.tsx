import React from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../App';

export function MyPurchases() {
  const { data: purchases, isLoading } = trpc.getMyPurchases.useQuery();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return (
      <div className="empty-purchases">
        <div className="empty-icon">🛒</div>
        <h2>No purchases yet</h2>
        <p>Browse the marketplace to find amazing traits!</p>
        <Link to="/" className="browse-button">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="my-purchases">
      <h1>My Purchases</h1>
      <p className="subtitle">All your purchased traits and license keys</p>

      <div className="purchases-grid">
        {purchases.map((purchase) => (
          <div key={purchase.id} className="purchase-card">
            <Link to={`/trait/${purchase.trait.id}`} className="trait-link">
              <div className="purchase-header">
                <div className="trait-icon-medium">@{purchase.trait.name.replace('@', '')}</div>
                <div className="trait-info">
                  <h3 className="trait-name">{purchase.trait.displayName}</h3>
                  <p className="trait-category">{purchase.trait.category}</p>
                </div>
              </div>
            </Link>

            <div className="purchase-details">
              <div className="detail-row">
                <span className="detail-label">Purchased:</span>
                <span className="detail-value">
                  {new Date(purchase.purchasedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Price:</span>
                <span className="detail-value">
                  ${purchase.price} {purchase.currency}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">License:</span>
                <span className="detail-value">{purchase.trait.license}</span>
              </div>
              <div className="detail-row license-key-row">
                <span className="detail-label">License Key:</span>
                <code className="license-key">{purchase.licenseKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(purchase.licenseKey)}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="creator-info-small">
              <img
                src={purchase.trait.creator.avatar || '/default-avatar.png'}
                alt=""
                className="creator-avatar-tiny"
              />
              <span>by {purchase.trait.creator.username}</span>
            </div>

            <div className="purchase-actions">
              <button className="download-button">Download Code</button>
              <Link to={`/trait/${purchase.trait.id}`} className="view-button">
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
