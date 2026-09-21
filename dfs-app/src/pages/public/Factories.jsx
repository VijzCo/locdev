// src/pages/public/Factories.jsx
import { MapPin, Users, Package, Award } from 'lucide-react';
import { useCollection } from '../../hooks/useFirestore';
import './Factories.css';

export default function Factories() {
  const { data: factories, loading } = useCollection('factories', 'order');

  return (
    <div className="factories-page">
      <section className="page-hero">
        <div className="container page-hero-content">
          <p className="page-hero-eyebrow">Our Infrastructure</p>
          <h1>Factories &amp; Strategic Group</h1>
          <p>
            Three state-of-the-art production facilities in Maseru, Lesotho — purpose-built
            for scale, quality, and efficiency.
          </p>
        </div>
      </section>

      {/* Group Overview */}
      <section className="section section--cream">
        <div className="container">
          <div className="group-overview">
            <div>
              <p className="section-eyebrow">The DFS Group</p>
              <h2>A Fully Integrated<br />Manufacturing Group</h2>
              <div className="gold-line gold-line--left" style={{ marginBottom: 28 }} />
              <p>
                The DFS Group operates as an integrated apparel manufacturing cluster in Lesotho.
                Each factory is purpose-built for a specific product category, allowing us to
                specialize deeply while maintaining group-wide quality standards, certifications,
                and shared services.
              </p>
              <p style={{ marginTop: 16 }}>
                Our strategic location in Lesotho provides unmatched advantages: AGOA preferential
                access to the US market, SACU duty-free access to South Africa, and competitive
                labor and operational costs — all within a 30-minute drive from Maseru city center.
              </p>
            </div>
            <div className="group-advantages">
              {[
                { icon: Award, title: 'AGOA Beneficiary', desc: 'Duty-free apparel exports to the United States.' },
                { icon: Package, title: 'SACU Access', desc: 'Duty-free trade across Southern African Customs Union.' },
                { icon: Users, title: 'Skilled Labour', desc: 'Trained, experienced garment workers with low turnover.' },
                { icon: MapPin, title: 'Strategic Location', desc: 'Adjacent to South Africa with strong logistics links.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="advantage-item">
                  <div className="advantage-item__icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Factories */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Production Facilities</p>
            <h2 className="section-title">Our Three Factories</h2>
            <div className="gold-line" />
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="factories-list">
              {(factories || []).map((factory, i) => (
                <div key={factory.id} className="factory-card">
                  <div className="factory-card__image">
                    {factory.imageUrl
                      ? <img src={factory.imageUrl} alt={factory.name} />
                      : (
                        <div className="factory-card__placeholder">
                          <span>F{i + 1}</span>
                        </div>
                      )
                    }
                    <div className="factory-card__number">0{i + 1}</div>
                  </div>
                  <div className="factory-card__content">
                    <h2>{factory.name}</h2>
                    <div className="factory-card__meta">
                      <span><MapPin size={14} /> {factory.location}</span>
                      <span><Users size={14} /> {factory.employees} Employees</span>
                      <span><Package size={14} /> {factory.capacity}</span>
                    </div>
                    <p>{factory.description}</p>
                    <div className="factory-card__specs">
                      <div className="factory-spec">
                        <span className="factory-spec__label">Established</span>
                        <span className="factory-spec__val">{factory.established}</span>
                      </div>
                      <div className="factory-spec">
                        <span className="factory-spec__label">Specialization</span>
                        <span className="factory-spec__val">{factory.specialization}</span>
                      </div>
                      <div className="factory-spec">
                        <span className="factory-spec__label">Capacity</span>
                        <span className="factory-spec__val">{factory.capacity}</span>
                      </div>
                    </div>
                    {factory.certifications && factory.certifications.length > 0 && (
                      <div className="factory-card__certs">
                        <p className="factory-certs__title">
                          <Award size={14} /> Certifications
                        </p>
                        <div className="factory-certs__list">
                          {factory.certifications.map(cert => (
                            <span key={cert} className="badge">{cert}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Certifications */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Standards & Compliance</p>
            <h2 className="section-title" style={{ color: 'var(--white)' }}>Our Certifications</h2>
            <div className="gold-line" />
            <p className="section-subtitle" style={{ color: 'rgba(255,255,255,.6)' }}>
              All DFS factories maintain industry-leading certifications, ensuring ethical,
              quality, and sustainable manufacturing practices.
            </p>
          </div>
          <div className="certs-grid">
            {[
              { name: 'WRAP Certified', desc: 'Worldwide Responsible Accredited Production — ethical manufacturing.' },
              { name: 'ISO 9001:2015', desc: 'International quality management system standard.' },
              { name: 'OEKO-TEX® Standard 100', desc: 'Tested for harmful substances — safe for skin contact.' },
              { name: 'GOTS Certified', desc: 'Global Organic Textile Standard for organic fibres.' },
              { name: 'OHSAS 18001', desc: 'Occupational Health and Safety Assessment Series.' },
              { name: 'AGOA Eligible', desc: 'African Growth & Opportunity Act preferential trade.' },
            ].map(({ name, desc }) => (
              <div key={name} className="cert-card">
                <div className="cert-card__badge">✓</div>
                <h4>{name}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
