// src/pages/public/Contact.jsx
import { useForm } from 'react-hook-form';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocument } from '../../hooks/useFirestore';
import './Contact.css';

export default function Contact() {
  const { data: contact } = useDocument('settings', 'contact');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    // In production, connect to EmailJS, Firebase Functions, or similar
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Message sent! We\'ll be in touch within 24 hours.');
    reset();
  };

  const INFO_ITEMS = [
    {
      icon: MapPin,
      label: 'Head Office',
      value: contact?.address || 'Plot 23, Thetsane Industrial Area, Maseru, Lesotho',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: contact?.phone || '+266 2231 5000',
      href: `tel:${contact?.phone}`,
    },
    {
      icon: Mail,
      label: 'General Enquiries',
      value: contact?.email || 'info@dutyfreesourcing.co.ls',
      href: `mailto:${contact?.email}`,
    },
    {
      icon: Mail,
      label: 'Sales',
      value: contact?.salesEmail || 'sales@dutyfreesourcing.co.ls',
      href: `mailto:${contact?.salesEmail}`,
    },
    {
      icon: Clock,
      label: 'Office Hours',
      value: contact?.officeHours || 'Mon – Fri: 08:00 – 17:00 CAT',
    },
  ];

  return (
    <div className="contact-page">
      <section className="page-hero">
        <div className="container page-hero-content">
          <p className="page-hero-eyebrow">Get In Touch</p>
          <h1>Contact Us</h1>
          <p>
            We'd love to hear from you. Whether it's a product enquiry, quote request,
            or partnership opportunity — reach out and our team will respond promptly.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-layout">
          {/* Info */}
          <div className="contact-info">
            <h2>Let's Talk Business</h2>
            <div className="gold-line gold-line--left" style={{ marginBottom: 28 }} />
            <p>
              Our sales and client relations team is ready to discuss your manufacturing requirements,
              minimum order quantities, lead times, and pricing.
            </p>

            <div className="contact-info__list">
              {INFO_ITEMS.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="contact-info__item">
                  <div className="contact-info__icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <span className="contact-info__label">{label}</span>
                    {href
                      ? <a href={href} className="contact-info__value contact-info__value--link">{value}</a>
                      : <span className="contact-info__value">{value}</span>
                    }
                  </div>
                </div>
              ))}
            </div>

            <div className="contact-map-placeholder">
              <MapPin size={32} className="contact-map-placeholder__icon" />
              <p>Maseru, Lesotho</p>
              <small>Thetsane Industrial Area</small>
            </div>
          </div>

          {/* Form */}
          <div className="contact-form-wrap">
            <div className="contact-form-card">
              <h3>Send Us a Message</h3>
              <p>Fill in the form and we'll respond within 1 business day.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="contact-form" noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      placeholder="John Smith"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company</label>
                    <input className="form-input" placeholder="Your Company" {...register('company')} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="john@company.com"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' }
                      })}
                    />
                    {errors.email && <span className="form-error">{errors.email.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="+27 11 000 0000" {...register('phone')} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <select
                    className="form-select"
                    {...register('subject', { required: 'Please select a subject' })}
                  >
                    <option value="">Select a subject...</option>
                    <option>Product Enquiry</option>
                    <option>Request a Quote</option>
                    <option>Factory Visit</option>
                    <option>Partnership Opportunity</option>
                    <option>General Enquiry</option>
                  </select>
                  {errors.subject && <span className="form-error">{errors.subject.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    placeholder="Tell us about your requirements, products of interest, quantities, and any other relevant details..."
                    {...register('message', { required: 'Message is required', minLength: { value: 20, message: 'Message too short' } })}
                  />
                  {errors.message && <span className="form-error">{errors.message.message}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary contact-form__submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : (<>Send Message <Send size={15} /></>)}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
