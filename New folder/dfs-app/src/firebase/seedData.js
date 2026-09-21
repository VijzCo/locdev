// src/firebase/seedData.js
import { db } from './config';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

export async function seedDatabase() {
  try {
    await setDoc(doc(db, 'company', 'overview'), {
      name: 'Duty Free Sourcing Inc. (PTY) LTD',
      tagline: 'Crafting Excellence, Driving Growth Across Southern Africa',
      founded: 2014,
      employees: 2000,
      factories: 3,
      industry: 'Apparel Sourcing & Manufacturing',
      headquarters: 'Plot 23, Thetsane Industrial Area, Maseru, Lesotho',
      markets: 'Southern Africa (primarily South Africa)',
      description: 'Duty Free Sourcing Inc. (PTY) LTD is a premier apparel sourcing and manufacturing company headquartered in Maseru, Lesotho. Since 2014, we have grown to become one of the leading garment manufacturers in Southern Africa, operating three state-of-the-art factories with approximately 2,000 skilled employees.',
      vision: 'To be the most trusted and innovative apparel manufacturing partner in Southern Africa, setting the benchmark for quality, sustainability, and ethical production.',
      mission: 'To deliver world-class apparel solutions through cutting-edge manufacturing, skilled craftsmanship, and unwavering commitment to quality — empowering our clients to succeed in competitive markets while uplifting the communities we operate in.',
      values: [
        { title: 'Quality First', description: 'Every stitch reflects our commitment to excellence.' },
        { title: 'Integrity', description: 'Transparent, honest, and ethical in all we do.' },
        { title: 'Innovation', description: 'Continuously improving our processes and products.' },
        { title: 'People-Centered', description: 'Our workforce is our greatest asset.' },
        { title: 'Sustainability', description: 'Responsible production for a better future.' },
      ],
      updatedAt: new Date(),
    });

    const leaders = [
      { name: 'Thabo Mokoena', role: 'Chief Executive Officer', bio: 'With over 20 years in the apparel industry, Thabo has steered DFS from a startup to a 2,000-employee powerhouse. His vision for sustainable manufacturing has defined the company trajectory.', order: 1, imageUrl: '' },
      { name: 'Sarah Dlamini', role: 'Chief Operations Officer', bio: 'Sarah oversees all factory operations across three facilities. Her expertise in lean manufacturing and supply chain optimization has driven significant efficiency gains.', order: 2, imageUrl: '' },
      { name: 'James Ndlovu', role: 'Chief Financial Officer', bio: 'James brings 15 years of financial leadership, managing the company financial health and driving investment in infrastructure and technology.', order: 3, imageUrl: '' },
      { name: 'Lerato Sithole', role: 'Head of Quality Assurance', bio: 'Lerato leads quality control systems ensuring every product meets international standards. She implemented ISO-certified frameworks across all three factories.', order: 4, imageUrl: '' },
      { name: 'Michael Thabane', role: 'Head of Sales & Client Relations', bio: 'Michael manages key account relationships with major South African retailers and brands, driving revenue growth and long-term client partnerships.', order: 5, imageUrl: '' },
      { name: 'Nomsa Leshoele', role: 'HR & Sustainability Director', bio: 'Nomsa champions employee welfare and CSR, overseeing training programs, wellness initiatives, and sustainability reporting.', order: 6, imageUrl: '' },
    ];
    for (const l of leaders) await addDoc(collection(db, 'leadership'), { ...l, createdAt: new Date() });

    const factories = [
      { name: 'DFS Factory 1 — Main Production Hub', location: 'Plot 23, Thetsane Industrial Area, Maseru, Lesotho', established: 2014, employees: 800, capacity: '50,000 units/month', specialization: 'T-shirts, Polo Shirts, Casual Wear', description: 'Our flagship facility houses cutting, sewing, finishing, and packing under one roof. Equipped with the latest Juki and Brother sewing machinery.', certifications: ['WRAP Certified', 'ISO 9001:2015', 'OEKO-TEX Standard 100'], imageUrl: '', order: 1 },
      { name: 'DFS Factory 2 — Workwear Division', location: 'Industrial Road, Maseru West, Lesotho', established: 2017, employees: 700, capacity: '40,000 units/month', specialization: 'Corporate Workwear, Uniforms, PPE', description: 'Dedicated to high-volume corporate and workwear contracts. Features specialized embroidery and screen printing units.', certifications: ['WRAP Certified', 'OHSAS 18001'], imageUrl: '', order: 2 },
      { name: 'DFS Factory 3 — Premium Garments', location: 'Ha Tikoe Industrial Estate, Maseru, Lesotho', established: 2020, employees: 500, capacity: '25,000 units/month', specialization: 'Premium Knitwear, Activewear, Sportswear', description: 'Our newest facility, purpose-built for technical garments and premium product lines. Includes a dedicated sampling and R&D department.', certifications: ['WRAP Certified', 'ISO 9001:2015', 'GOTS Certified'], imageUrl: '', order: 3 },
    ];
    for (const f of factories) await addDoc(collection(db, 'factories'), { ...f, createdAt: new Date() });

    const products = [
      { name: 'Corporate T-Shirts', category: 'Casual Wear', description: 'High-quality cotton and poly-cotton blend T-shirts for corporate branding, retail, and promotional use.', moq: '500 units', leadTime: '4-6 weeks', imageUrl: '', featured: true, order: 1 },
      { name: 'Polo Shirts', category: 'Corporate Wear', description: 'Classic and performance polo shirts with custom embroidery or screen printing options for corporate uniforms and retail.', moq: '300 units', leadTime: '4-6 weeks', imageUrl: '', featured: true, order: 2 },
      { name: 'Corporate Uniforms', category: 'Workwear', description: 'Complete uniform solutions for hospitality, retail, and corporate environments including shirts, pants, jackets, and accessories.', moq: '100 sets', leadTime: '6-8 weeks', imageUrl: '', featured: true, order: 3 },
      { name: 'Activewear & Sportswear', category: 'Performance Wear', description: 'Technical activewear from moisture-wicking fabrics, suitable for gym wear, team sports, and athletic brands.', moq: '500 units', leadTime: '5-7 weeks', imageUrl: '', featured: true, order: 4 },
      { name: 'PPE & Safety Wear', category: 'Safety', description: 'SANS-compliant PPE including high-visibility vests, overalls, and safety jackets for industrial and mining sectors.', moq: '200 units', leadTime: '3-5 weeks', imageUrl: '', featured: false, order: 5 },
      { name: 'School Uniforms', category: 'Education', description: 'Durable, affordable school uniform solutions for primary and secondary schools across Southern Africa.', moq: '500 units', leadTime: '4-6 weeks', imageUrl: '', featured: false, order: 6 },
    ];
    for (const p of products) await addDoc(collection(db, 'products'), { ...p, createdAt: new Date() });

    const services = [
      { title: 'Cut, Make & Trim (CMT)', description: 'Full CMT service where clients supply fabric and trims. We handle cutting, sewing, and finishing with precision and speed.', icon: 'scissors', order: 1 },
      { title: 'Full Package Production', description: 'End-to-end manufacturing including sourcing of fabrics, trims, and all materials. One point of contact from concept to delivery.', icon: 'package', order: 2 },
      { title: 'Private Label Manufacturing', description: 'Manufacture garments under your brand label. We work with your designs or develop new ones for you.', icon: 'tag', order: 3 },
      { title: 'Sampling & Prototyping', description: 'Rapid sampling for new designs. Our R&D team works closely with clients to develop accurate production samples.', icon: 'flask', order: 4 },
      { title: 'Screen Printing & Embroidery', description: 'In-house branding services including multi-color screen printing, embroidery, and heat transfer printing.', icon: 'printer', order: 5 },
      { title: 'Warehousing & Logistics', description: 'Secure warehousing and coordinated logistics to South Africa and across the SADC region.', icon: 'truck', order: 6 },
    ];
    for (const s of services) await addDoc(collection(db, 'services'), { ...s, createdAt: new Date() });

    await setDoc(doc(db, 'settings', 'contact'), {
      address: 'Plot 23, Thetsane Industrial Area, Maseru, Lesotho',
      phone: '+266 2231 5000',
      email: 'info@dutyfreesourcing.co.ls',
      salesEmail: 'sales@dutyfreesourcing.co.ls',
      website: 'www.dutyfreesourcing.co.ls',
      linkedIn: '',
      facebook: '',
      officeHours: 'Monday - Friday: 08:00 - 17:00 (CAT)',
      companyProfileUrl: '',
      certDocUrl: '',
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Seed error:', error);
    return { success: false, error };
  }
}
