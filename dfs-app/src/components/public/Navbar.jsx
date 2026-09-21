// src/components/public/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useBrand } from '../../hooks/useBrand';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/',           label: 'Home' },
  { to: '/about',      label: 'About' },
  { to: '/leadership', label: 'Leadership' },
  { to: '/factories',  label: 'Factories' },
  { to: '/products',   label: 'Products & Services' },
  { to: '/campus',     label: 'Campus' },
  { to: '/contact',    label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const location                = useLocation();
  const { brand }               = useBrand();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setOpen(false); }, [location]);

  const hasCustomLogo = brand.logoType === 'image' && brand.logoImageUrl;

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">

        {/* ── Logo ── */}
        <Link to="/" className="navbar__logo">
          {hasCustomLogo ? (
            /* Image logo — always show company name beside it */
            <>
              <img
                src={brand.logoImageUrl}
                alt={brand.companyShort || 'DFS'}
                className="navbar__logo-img"
              />
              <span className="navbar__logo-text">
                {brand.companyShort || 'Duty Free Sourcing'}<br />
                <small>{brand.companySuffix || 'Inc. (PTY) LTD'}</small>
              </span>
            </>
          ) : (
            /* Text / initials logo */
            <>
              <span className="navbar__logo-mark">{brand.logoText || 'DFS'}</span>
              <span className="navbar__logo-text">
                {brand.companyShort || 'Duty Free Sourcing'}<br />
                <small>{brand.companySuffix || 'Inc. (PTY) LTD'}</small>
              </span>
            </>
          )}
        </Link>

        {/* ── Nav links (no Admin button) ── */}
        <nav className={`navbar__nav ${open ? 'navbar__nav--open' : ''}`}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `navbar__link ${isActive ? 'navbar__link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          className="navbar__toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
