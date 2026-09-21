// src/components/public/Footer.jsx
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import './Footer.css';

export default function Footer({ contact }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="container footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-mark">DFS</span>
              <span>
                <strong>Duty Free Sourcing Inc.</strong>
                <small>(PTY) LTD</small>
              </span>
            </div>
            <p className="footer__tagline">
              Crafting Excellence, Driving Growth Across Southern Africa since 2014.
            </p>
            <div className="footer__stats">
              <div>
                <strong>2,000+</strong>
                <span>Employees</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Factories</span>
              </div>
              <div>
                <strong>10+</strong>
                <span>Years</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="footer__col">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/leadership">Leadership Team</Link></li>
              <li><Link to="/factories">Our Factories</Link></li>
              <li><Link to="/products">Products & Services</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer__col">
            <h4>Services</h4>
            <ul>
              <li><span>Cut, Make & Trim (CMT)</span></li>
              <li><span>Full Package Production</span></li>
              <li><span>Private Label Manufacturing</span></li>
              <li><span>Sampling & Prototyping</span></li>
              <li><span>Screen Printing & Embroidery</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4>Contact</h4>
            <ul className="footer__contact-list">
              {contact?.address && (
                <li>
                  <MapPin size={14} />
                  <span>{contact.address}</span>
                </li>
              )}
              {contact?.phone && (
                <li>
                  <Phone size={14} />
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </li>
              )}
              {contact?.email && (
                <li>
                  <Mail size={14} />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>© {year} Duty Free Sourcing Inc. (PTY) LTD. All rights reserved.</p>
          <p>
            Maseru, Lesotho &nbsp;·&nbsp; Southern Africa
          </p>
        </div>
      </div>
    </footer>
  );
}
