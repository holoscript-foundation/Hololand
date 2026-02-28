import React from 'react';
import { Link } from 'react-router-dom';

export function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">Trait Marketplace</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">
            Browse
          </Link>
          <Link to="/purchases" className="nav-link">
            My Purchases
          </Link>
          <Link to="/sell" className="nav-link nav-link-primary">
            Sell Traits
          </Link>
        </div>
      </div>
    </nav>
  );
}
