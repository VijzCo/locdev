// src/pages/public/Home.jsx
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, Factory, Globe, Award } from 'lucide-react';
import { useDocument } from '../../hooks/useFirestore';
import { useCollection } from '../../hooks/useFirestore';
import './Home.css';

const STATS = [
  { value: '2,000+', label: 'Skilled Employees', icon: Users },
  { value: '3', label: 'Production Factories', icon: Factory },
  { value: '10+', label: 'Years of Excellence', icon: Award },
  { value: 'SADC', label: 'Regional Markets', icon: Globe },
];

const WHY_US = [
  'WRAP-certified ethical manufacturing',
  'ISO 9001:2015 quality management',
  'Competitive AGOA & SACU trade advantages',
  'In-house sampling & rapid prototyping',
  'Full package & CMT production capabilities',
  'Reliable delivery to South African retail chains',
];

export default function Home() {
  const { data: company } = useDocument('company', 'overview');
  const { data: products } = useCollection('products', 'order');
  const { data: services } = useCollection('services', 'order');

  const featuredProducts = (products || []).filter(p => p.featured).slice(0, 3);

  return (
    <div className="home">
      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__bg" />
        <div className="hero__overlay" />
        <div className="container hero__content">
          <div className="hero__eyebrow">
            <span className="hero__flag">🇱🇸</span>
            Maseru, Lesotho · Est. 2014
          </div>
          <h1 className="hero__title">
            Southern Africa's<br />
            <em>Premier Apparel</em><br />
            Manufacturer
          </h1>
          <p className="hero__subtitle">
            {company?.tagline || 'Crafting Excellence, Driving Growth Across Southern Africa'}
          </p>
          <div className="hero__actions">
            <Link to="/products" className="btn btn-primary">
              Our Products <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Get a Quote
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="hero__scroll-cue">
          <div className="hero__scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── STATS BAND ─────────────────────────────────────────────── */}
      <section className="stats-band">
        <div className="container stats-band__grid">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="stats-band__item">
              <Icon size={28} className="stats-band__icon" />
              <div className="stat-number">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT INTRO ─────────────────────────────────────────────── */}
      <section className="section">
        <div className="container home-about">
          <div className="home-about__text">
            <p className="section-eyebrow">Who We Are</p>
            <h2>A Decade of Crafting<br />Quality Apparel</h2>
            <div className="gold-line gold-line--left" style={{ marginBottom: 28 }} />
            <p>
              {company?.description ||
                `Duty Free Sourcing Inc. (PTY) LTD is a premier apparel sourcing and manufacturing company 
                headquartered in Maseru, Lesotho. Since 2014, we have grown to become one of the leading 
                garment manufacturers in Southern Africa, operating three state-of-the-art factories.`}
            </p>
            <ul className="home-about__checklist">
              {WHY_US.map(item => (
                <li key={item}>
                  <CheckCircle size={16} />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/about" className="btn btn-primary" style={{ marginTop: 32 }}>
              Our Story <ArrowRight size={16} />
            </Link>
          </div>
          <div className="home-about__visual">
            <div className="home-about__card home-about__card--1">
              <div className="home-about__badge">Factory 1</div>
              <div className="home-about__big-stat">
                <span className="stat-number">800+</span>
                <span className="stat-label">Workers</span>
              </div>
            </div>
            <div className="home-about__card home-about__card--2">
              <div className="home-about__badge">Factory 2</div>
              <div className="home-about__big-stat">
                <span className="stat-number">700+</span>
                <span className="stat-label">Workers</span>
              </div>
            </div>
            <div className="home-about__card home-about__card--3">
              <div className="home-about__badge">Factory 3</div>
              <div className="home-about__big-stat">
                <span className="stat-number">500+</span>
                <span className="stat-label">Workers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ───────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="section section--cream">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">What We Make</p>
              <h2 className="section-title">Featured Products</h2>
              <div className="gold-line" />
              <p className="section-subtitle">
                High-quality garments for retail, corporate, and specialist markets across Southern Africa.
              </p>
            </div>
            <div className="grid-3">
              {featuredProducts.map(product => (
                <div key={product.id} className="card product-card">
                  <div className="product-card__image">
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} />
                      : <div className="product-card__placeholder">
                          <span>{product.name.charAt(0)}</span>
                        </div>
                    }
                    <span className="badge product-card__category">{product.category}</span>
                  </div>
                  <div className="product-card__body">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-card__meta">
                      <span>MOQ: {product.moq}</span>
                      <span>Lead Time: {product.leadTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link to="/products" className="btn btn-primary">
                All Products & Services <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES STRIP ─────────────────────────────────────────── */}
      {services && services.length > 0 && (
        <section className="section section--dark">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>What We Do</p>
              <h2 className="section-title" style={{ color: 'var(--white)' }}>Our Core Services</h2>
              <div className="gold-line" />
            </div>
            <div className="grid-3">
              {services.slice(0, 6).map(service => (
                <div key={service.id} className="service-card">
                  <div className="service-card__dot" />
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="home-cta">
        <div className="container home-cta__inner">
          <div>
            <h2>Ready to Start Your<br />Manufacturing Journey?</h2>
            <p>Let's discuss how Duty Free Sourcing can power your next apparel collection.</p>
          </div>
          <div className="home-cta__actions">
            <Link to="/contact" className="btn btn-primary">
              Contact Us Today <ArrowRight size={16} />
            </Link>
            <Link to="/factories" className="btn btn-outline">
              Tour Our Factories
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
