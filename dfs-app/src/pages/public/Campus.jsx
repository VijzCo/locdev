// src/pages/public/Campus.jsx
import { Link } from 'react-router-dom';
import {
  ArrowRight, Users, Award, Briefcase, Target,
  Lightbulb, GraduationCap, Factory, BookOpen
} from 'lucide-react';
import { useDocument } from '../../hooks/useFirestore';
import './Campus.css';

// Icon map for highlights (matches admin icon names or falls back)
const ICON_MAP = {
  Factory, Award, Users, GraduationCap, Target, Lightbulb, Briefcase, BookOpen,
};

// Level badge colours
const LEVEL_COLOURS = {
  'Certificate':   { bg: '#eff6ff', color: '#1d4ed8' },
  'Diploma':       { bg: '#f0fdf4', color: '#15803d' },
  'Short Course':  { bg: '#fff7ed', color: '#c2410c' },
  'Degree':        { bg: '#faf5ff', color: '#7e22ce' },
};

export default function Campus() {
  const { data: campus, loading } = useDocument('settings', 'campus');

  // ── Pull everything from Firestore ──────────────────────────────────────
  const tagline        = campus?.tagline        || 'Where industry meets education — training the next generation of textile and apparel professionals right here in Lesotho.';
  const about          = campus?.about          || 'The Quantum Institute of Textile and Apparel (QIOTAA) is a specialist training campus established by Duty Free Sourcing Inc. to develop skilled, job-ready professionals for the textile and apparel industry in Lesotho and across Southern Africa.';
  const mission        = campus?.mission        || "QIOTAA exists to close the skills gap in Lesotho's textile and apparel sector. By combining classroom learning with direct factory experience, we produce graduates who are immediately productive, confident, and career-ready.";
  const established    = campus?.established    || '—';
  const studentsPerYear= campus?.studentsPerYear|| '200+';

  const programmes = campus?.programmes || [];
  const highlights  = campus?.highlights  || [];

  // Stats built from live Firestore values
  const STATS = [
    { val: String(established),         desc: 'Year Established' },
    { val: String(programmes.length || 6), desc: 'Programmes Offered' },
    { val: String(studentsPerYear) + (String(studentsPerYear).includes('+') ? '' : '+'), desc: 'Students per Year' },
    { val: '100%',                      desc: 'Industry-linked Curriculum' },
  ];

  return (
    <div className="campus-page">

      {/* ── Hero ── */}
      <section className="campus-hero">
        <div className="campus-hero__bg" />
        <div className="container campus-hero__content">
          <div className="campus-hero__badge">
            <GraduationCap size={16} />
            A Duty Free Sourcing Initiative
          </div>
          <h1>
            QIOTAA
            <span>Quantum Institute of<br />Textile and Apparel</span>
          </h1>
          <p>{tagline}</p>
          <div className="campus-hero__actions">
            <Link to="/contact" className="btn btn-primary">
              Enquire About Admission <ArrowRight size={16} />
            </Link>
            <a href="#programmes" className="btn btn-ghost">
              View Programmes
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats band — live from Firestore ── */}
      <section className="campus-stats-band">
        <div className="container campus-stats-band__grid">
          {STATS.map(({ val, desc }) => (
            <div key={desc} className="campus-stats-band__item">
              <div className="stat-number">{val}</div>
              <div className="stat-label">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section className="section">
        <div className="container campus-about">
          <div className="campus-about__text">
            <p className="section-eyebrow">About QIOTAA</p>
            <h2>Training Excellence,<br />Locally Rooted</h2>
            <div className="gold-line gold-line--left" style={{ marginBottom: 28 }} />
            {loading ? (
              <div className="loading-center" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : (
              <>
                <p>{about}</p>
                <p style={{ marginTop: 16 }}>
                  Located within the DFS industrial complex in Maseru, QIOTAA gives students direct
                  access to live factory environments, industry-standard equipment, and mentorship
                  from experienced professionals who work in the field every day.
                </p>
                <p style={{ marginTop: 16 }}>
                  Our graduates are equipped not just with technical skills, but with the workplace
                  readiness, discipline, and confidence to contribute meaningfully from day one.
                </p>
              </>
            )}
          </div>

          {/* Highlights — live from Firestore, fallback to defaults */}
          <div className="campus-about__highlights">
            {(highlights.length > 0 ? highlights : [
              { title: 'Factory-Integrated',    description: 'Students train inside real DFS production facilities alongside experienced workers.', icon: 'Factory' },
              { title: 'Accredited Programmes', description: 'Industry-recognised certificates and diplomas aligned to national and regional standards.', icon: 'Award' },
              { title: 'Local Focus',           description: 'Designed specifically for Basotho youth, creating lasting employment in the local economy.', icon: 'Users' },
              { title: 'Job Placement',         description: 'Top graduates are considered for direct employment within the DFS Group factories.', icon: 'GraduationCap' },
            ]).map(({ title, description, icon }) => {
              const Icon = ICON_MAP[icon] || GraduationCap;
              return (
                <div key={title} className="campus-highlight">
                  <div className="campus-highlight__icon"><Icon size={22} /></div>
                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Programmes — live from Firestore ── */}
      <section className="section section--cream" id="programmes">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">What We Offer</p>
            <h2 className="section-title">Programmes &amp; Courses</h2>
            <div className="gold-line" />
            <p className="section-subtitle">
              Practical, industry-aligned training for every level — from entry-level operators
              to supervisors and business managers.
            </p>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : programmes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
              <GraduationCap size={40} style={{ margin: '0 auto 16px', opacity: .4 }} />
              <p>Programmes coming soon. Check back shortly.</p>
            </div>
          ) : (
            <div className="programmes-grid">
              {programmes.map(({ title, description, duration, level }, i) => {
                const levelStyle = LEVEL_COLOURS[level] || LEVEL_COLOURS['Certificate'];
                return (
                  <div key={i} className="programme-card">
                    <div className="programme-card__icon">
                      <GraduationCap size={24} />
                    </div>
                    <span
                      className="programme-card__level"
                      style={{ background: levelStyle.bg, color: levelStyle.color }}
                    >
                      {level}
                    </span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    {duration && (
                      <div className="programme-card__footer">
                        <span>⏱ {duration}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Mission — live from Firestore ── */}
      <section className="section section--dark">
        <div className="container">
          <div className="campus-mission">
            <div>
              <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Our Mission</p>
              <h2 style={{ color: 'var(--white)', fontSize: 'clamp(26px,3.5vw,42px)', marginBottom: 20 }}>
                Building a Skilled<br />Textile Workforce
              </h2>
              <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, fontSize: 16 }}>
                {mission}
              </p>
              <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, fontSize: 16, marginTop: 16 }}>
                We are committed to empowering Basotho youth — particularly women — with
                the technical and professional skills to build long-term careers in one of
                Lesotho's most important industries.
              </p>
              <Link to="/contact" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>
                Get In Touch <ArrowRight size={16} />
              </Link>
            </div>
            <div className="campus-mission__values">
              {[
                { val: 'Practical',  desc: 'Hands-on factory training from day one' },
                { val: 'Accessible', desc: 'Affordable training for local youth' },
                { val: 'Employed',   desc: 'Direct pathway into DFS Group jobs' },
                { val: 'Empowered',  desc: 'Confidence, discipline, and career skills' },
              ].map(({ val, desc }) => (
                <div key={val} className="campus-mission__value">
                  <strong>{val}</strong>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="section-eyebrow">Join QIOTAA</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', marginBottom: 16 }}>
            Ready to Start Your Career<br />in Textiles?
          </h2>
          <p style={{ color: 'var(--gray-600)', maxWidth: 520, margin: '0 auto 36px', fontSize: 16, lineHeight: 1.7 }}>
            Applications are open for all programmes. Contact our admissions team today
            to find the right course for you.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary">
              Apply Now <ArrowRight size={16} />
            </Link>
            <Link to="/about" className="btn btn-outline">
              Learn About DFS
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
