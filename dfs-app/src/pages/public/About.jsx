// src/pages/public/About.jsx
import { Eye, Target, Heart } from 'lucide-react';
import { useDocument } from '../../hooks/useFirestore';
import './About.css';

export default function About() {
  const { data: company, loading } = useDocument('company', 'overview');

  const values = company?.values || [
    { title: 'Quality First', description: 'Every stitch reflects our commitment to excellence.' },
    { title: 'Integrity', description: 'Transparent, honest, and ethical in all we do.' },
    { title: 'Innovation', description: 'Continuously improving our processes and products.' },
    { title: 'People-Centered', description: 'Our workforce is our greatest asset.' },
    { title: 'Sustainability', description: 'Responsible production for a better future.' },
  ];

  return (
    <div className="about-page">
      {/* Hero */}
      <section className="page-hero">
        <div className="container page-hero-content">
          <p className="page-hero-eyebrow">Our Story</p>
          <h1>A Decade of Apparel<br />Manufacturing Excellence</h1>
          <p>From a single factory in 2014 to 2,000 employees across three facilities — this is our journey.</p>
        </div>
      </section>

      {/* Story */}
      <section className="section">
        <div className="container about-story">
          <div className="about-story__text">
            <p className="section-eyebrow">Company Overview</p>
            <h2>Built on the Ground in Lesotho</h2>
            <div className="gold-line gold-line--left" style={{ marginBottom: 28 }} />
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <>
                <p>{company?.description || 'Duty Free Sourcing Inc. (PTY) LTD is a premier apparel sourcing and manufacturing company headquartered in Maseru, Lesotho.'}</p>
                <p style={{ marginTop: 20 }}>
                  Founded in 2014 with a clear mandate: to create world-class manufacturing capacity in Lesotho,
                  leveraging the country's preferential trade access and skilled workforce to serve major Southern
                  African retail and corporate clients.
                </p>
                <p style={{ marginTop: 20 }}>
                  Today, DFS operates three purpose-built factories employing approximately 2,000 skilled workers.
                  Our factories are WRAP-certified, ISO 9001:2015 accredited, and produce garments for leading
                  South African brands and retailers.
                </p>
              </>
            )}
          </div>
          <div className="about-story__timeline">
            {[
              { year: '2014', event: 'DFS founded with Factory 1 in Thetsane Industrial Area, Maseru.' },
              { year: '2016', event: 'First major South African retail client contract signed.' },
              { year: '2017', event: 'expanded 2 more major South African retail clients contract signed.' },
              { year: '2019', event: 'Employee headcount surpasses 1,000 workers.' },
              { year: '2020', event: 'Factory 3 commissioned for premium and technical garments.' },
              { year: '2024', event: '10-year anniversary — 2,000 employees, 3 factories, growing markets.' },
            ].map(({ year, event }) => (
              <div key={year} className="timeline-item">
                <div className="timeline-year">{year}</div>
                <div className="timeline-dot" />
                <div className="timeline-event">{event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="section section--cream">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">What Drives Us</p>
            <h2 className="section-title">Vision, Mission & Values</h2>
            <div className="gold-line" />
          </div>
          <div className="vm-grid">
            <div className="vm-card vm-card--vision">
              <div className="vm-card__icon">
                <Eye size={28} />
              </div>
              <h3>Our Vision</h3>
              <p>{company?.vision || 'To be the most trusted and innovative apparel manufacturing partner in Southern Africa.'}</p>
            </div>
            <div className="vm-card vm-card--mission">
              <div className="vm-card__icon">
                <Target size={28} />
              </div>
              <h3>Our Mission</h3>
              <p>{company?.mission || 'To deliver world-class apparel solutions through cutting-edge manufacturing and skilled craftsmanship.'}</p>
            </div>
          </div>

          <div style={{ marginTop: 64 }}>
            <div className="section-header">
              <p className="section-eyebrow">What We Stand For</p>
              <h2 className="section-title">Our Core Values</h2>
              <div className="gold-line" />
            </div>
            <div className="values-grid">
              {values.map((v, i) => (
                <div key={i} className="value-card">
                  <div className="value-card__number">0{i + 1}</div>
                  <h3>{v.title}</h3>
                  <p>{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Facts */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>By the Numbers</p>
            <h2 className="section-title" style={{ color: 'var(--white)' }}>DFS at a Glance</h2>
            <div className="gold-line" />
          </div>
          <div className="facts-grid">
            {[
              { val: '2014', desc: 'Year Founded' },
              { val: '~2,000', desc: 'Total Employees' },
              { val: '3', desc: 'Production Factories' },
              { val: '800,000', desc: 'Units / Month Capacity' },
              { val: 'WRAP', desc: 'Certified Manufacturer' },
              { val: 'AGOA', desc: 'Preferential Trade Access' },
              { val: 'SADC', desc: 'Regional Market Reach' },
            ].map(({ val, desc }) => (
              <div key={desc} className="fact-item">
                <div className="stat-number">{val}</div>
                <div className="stat-label" style={{ color: 'rgba(255,255,255,.5)' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
