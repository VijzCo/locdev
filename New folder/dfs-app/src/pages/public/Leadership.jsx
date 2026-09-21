// src/pages/public/Leadership.jsx
import { User } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import './Leadership.css';

export default function Leadership() {
  const { data: leaders, loading } = useCollection('leadership', 'order');

  return (
    <div className="leadership-page">
      <section className="page-hero">
        <div className="container page-hero-content">
          <p className="page-hero-eyebrow">Our People</p>
          <h1>Leadership Team</h1>
          <p>
            Guided by experienced professionals who bring decades of industry expertise and a
            shared commitment to excellence and growth.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Meet the Team</p>
            <h2 className="section-title">The People Driving DFS Forward</h2>
            <div className="gold-line" />
            <p className="section-subtitle">
              Our leadership brings together expertise in manufacturing, finance, operations,
              and people management — all focused on building Southern Africa's premier apparel company.
            </p>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="leaders-grid">
              {(leaders || []).map((leader, i) => (
                <div key={leader.id} className={`leader-card ${i === 0 ? 'leader-card--featured' : ''}`}>
                  <div className="leader-card__avatar">
                    {leader.imageUrl
                      ? <img src={leader.imageUrl} alt={leader.name} />
                      : (
                        <div className="leader-card__initials">
                          {leader.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )
                    }
                  </div>
                  <div className="leader-card__body">
                    <h3>{leader.name}</h3>
                    <span className="leader-card__role">{leader.role}</span>
                    <p>{leader.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Culture */}
      <section className="section section--dark">
        <div className="container">
          <div className="culture-split">
            <div>
              <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Our Culture</p>
              <h2 style={{ color: 'var(--white)', fontSize: 'clamp(26px,3.5vw,40px)' }}>
                People Are Our<br />Greatest Asset
              </h2>
              <div className="gold-line gold-line--left" style={{ margin: '16px 0 28px' }} />
              <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8 }}>
                At Duty Free Sourcing, we invest heavily in our workforce. From skills development
                programs and safety training to wellness initiatives and career progression — we
                believe a motivated, skilled, and healthy workforce is the foundation of everything
                we achieve.
              </p>
              <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, marginTop: 20 }}>
                Our 2,000-strong team represents the communities of Lesotho, and we take seriously
                our responsibility as one of the country's largest private employers.
              </p>
            </div>
            <div className="culture-stats">
              {[
                { val: '95%', desc: 'Local Workforce' },
                { val: '60%', desc: 'Women Employees' },
                { val: '40+', desc: 'Training Programs' },
                { val: '10yr', desc: 'Average Tenure' },
              ].map(({ val, desc }) => (
                <div key={desc} className="culture-stat">
                  <div className="stat-number">{val}</div>
                  <div className="stat-label" style={{ color: 'rgba(255,255,255,.5)' }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
