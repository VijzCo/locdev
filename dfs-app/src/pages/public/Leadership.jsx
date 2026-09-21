// src/pages/public/Leadership.jsx
import { useCollection } from '../../hooks/useFirestore';
import './Leadership.css';

export default function Leadership() {
  const { data: allPeople, loading } = useCollection('leadership', 'order');

  const senior = (allPeople || []).filter(p => !p.tier || p.tier === 'senior');
  const middle = (allPeople || []).filter(p => p.tier === 'middle');

  return (
    <div className="leadership-page">
      <section className="page-hero">
        <div className="container page-hero-content">
          <p className="page-hero-eyebrow">Our People</p>
          <h1>Leadership &amp; Management</h1>
          <p>
            Guided by experienced professionals who bring decades of industry expertise
            and a shared commitment to excellence, growth, and community.
          </p>
        </div>
      </section>

      {/* ── Senior Leadership ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Executive Team</p>
            <h2 className="section-title">Senior Leadership</h2>
            <div className="gold-line" />
            <p className="section-subtitle">
              Our executive team brings together expertise in manufacturing, finance, operations,
              and people management — all focused on building Southern Africa's premier apparel company.
            </p>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="leaders-grid">
              {senior.map((leader, i) => (
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

      {/* ── Middle Management — The Backbone ── */}
      {!loading && middle.length > 0 && (
        <section className="backbone-section">
          {/* Motivational banner */}
          <div className="backbone-banner">
            <div className="container backbone-banner__inner">
              <div className="backbone-banner__quote">
                <span className="backbone-banner__mark">"</span>
                <p>
                  Every factory floor, every shift, every deadline met — it starts with them.
                  They don't just manage teams, they carry the heartbeat of this company.
                </p>
              </div>
              <div className="backbone-banner__label">
                <div className="backbone-banner__line" />
                <span>The Backbone of DFS</span>
                <div className="backbone-banner__line" />
              </div>
            </div>
          </div>

          <div className="container">
            <div className="section-header backbone-header">
              <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>
                The Force Behind Every Stitch
              </p>
              <h2 className="section-title" style={{ color: 'var(--white)' }}>
                The People Who Make It Happen
              </h2>
              <div className="gold-line" />
              <p className="section-subtitle" style={{ color: 'rgba(255,255,255,.7)' }}>
                They lead from the front — on the floor, in the departments, across every factory.
                These are the managers who turn vision into reality, day after day.
              </p>
            </div>

            {/* Stat strip */}
            <div className="backbone-stats">
              {[
                { val: '95%', desc: 'Locally Recruited' },
                { val: '60%', desc: 'Women Leaders' },
                { val: '8+',  desc: 'Years Avg. Tenure' },
                { val: '3',   desc: 'Factories They Run' },
              ].map(({ val, desc }) => (
                <div key={desc} className="backbone-stat">
                  <div className="backbone-stat__val">{val}</div>
                  <div className="backbone-stat__desc">{desc}</div>
                </div>
              ))}
            </div>

            <div className="middle-grid">
              {middle.map(person => (
                <div key={person.id} className="middle-card">
                  <div className="middle-card__avatar">
                    {person.imageUrl
                      ? <img src={person.imageUrl} alt={person.name} />
                      : (
                        <div className="middle-card__initials">
                          {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )
                    }
                  </div>
                  <div className="middle-card__body">
                    <h4>{person.name}</h4>
                    <span className="middle-card__role">{person.role}</span>
                    {person.department && (
                      <span className="middle-card__dept">{person.department}</span>
                    )}
                    {person.bio && <p>{person.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closing empowerment strip */}
          <div className="backbone-footer-strip">
            <div className="container backbone-footer-strip__inner">
              <p>
                🇱🇸 &nbsp; Proudly Basotho · Locally Grown · Industry Proven
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Culture ── */}
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
                { val: '95%',  desc: 'Local Workforce' },
                { val: '60%',  desc: 'Women Employees' },
                { val: '40+',  desc: 'Training Programs' },
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
