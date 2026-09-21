// src/pages/public/Products.jsx
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../hooks/useFirestore';
import './Products.css';

export default function Products() {
  const { data: products, loading: pLoading } = useCollection('products', 'order');
  const { data: services, loading: sLoading } = useCollection('services', 'order');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...new Set((products || []).map(p => p.category).filter(Boolean))];
  const filtered = activeCategory === 'All'
    ? (products || [])
    : (products || []).filter(p => p.category === activeCategory);

  return (
    <div className="products-page">
      <section className="page-hero">
        <div className="container page-hero-content">
          <p className="page-hero-eyebrow">What We Offer</p>
          <h1>Products &amp; Services</h1>
          <p>
            From casual T-shirts to technical workwear — high-quality garments manufactured to
            your specifications, at scale.
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Our Product Range</p>
            <h2 className="section-title">Garment Products</h2>
            <div className="gold-line" />
          </div>

          {/* Category Filter */}
          <div className="category-filter">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${activeCategory === cat ? 'category-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {pLoading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="products-grid">
              {filtered.map(product => (
                <div key={product.id} className="card product-item">
                  <div className="product-item__image">
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt={product.name} />
                      : (
                        <div className="product-item__placeholder">
                          <span>{product.name.charAt(0)}</span>
                        </div>
                      )
                    }
                  </div>
                  <div className="product-item__body">
                    <span className="badge">{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-item__specs">
                      <div>
                        <span className="spec-label">Min. Order</span>
                        <span className="spec-val">{product.moq}</span>
                      </div>
                      <div>
                        <span className="spec-label">Lead Time</span>
                        <span className="spec-val">{product.leadTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Services */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>How We Work</p>
            <h2 className="section-title" style={{ color: 'var(--white)' }}>Manufacturing Services</h2>
            <div className="gold-line" />
            <p className="section-subtitle" style={{ color: 'rgba(255,255,255,.6)' }}>
              Comprehensive end-to-end apparel manufacturing services tailored to your business needs.
            </p>
          </div>

          {sLoading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="services-grid">
              {(services || []).map((service, i) => (
                <div key={service.id} className="service-item">
                  <div className="service-item__num">0{i + 1}</div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Process */}
      <section className="section section--cream">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">How It Works</p>
            <h2 className="section-title">Our Production Process</h2>
            <div className="gold-line" />
          </div>
          <div className="process-steps">
            {[
              { step: '01', title: 'Enquiry & Brief', desc: 'Submit your product brief, quantities, and requirements. Our sales team responds within 24 hours.' },
              { step: '02', title: 'Sampling', desc: 'Our team develops accurate production samples for your approval. Rapid turnaround from our R&D department.' },
              { step: '03', title: 'Pricing & Contract', desc: 'Competitive pricing based on your specifications, volumes, and timelines. Clear contractual terms.' },
              { step: '04', title: 'Production', desc: 'Full-scale manufacturing begins with quality checks at every stage of production.' },
              { step: '05', title: 'QC & Finishing', desc: 'Rigorous final quality inspection and finishing before packing and dispatch.' },
              { step: '06', title: 'Delivery', desc: 'On-time delivery to your warehouse or distribution center across Southern Africa.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="process-step">
                <div className="process-step__num">{step}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section section--dark" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Get Started</p>
          <h2 style={{ color: 'var(--white)', fontSize: 'clamp(26px,3.5vw,42px)', marginBottom: 16 }}>
            Ready to Place an Order?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.65)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Contact our sales team today to discuss your requirements and receive a competitive quote.
          </p>
          <Link to="/contact" className="btn btn-primary">
            Request a Quote <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
