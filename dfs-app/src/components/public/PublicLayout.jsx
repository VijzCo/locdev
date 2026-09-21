// src/components/public/PublicLayout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useDocument } from '../../hooks/useFirestore';
import { useBrand } from '../../hooks/useBrand';

export default function PublicLayout() {
  const { data: contact } = useDocument('settings', 'contact');
  useBrand(); // applies CSS variables globally

  return (
    <>
      <Navbar />
      <main><Outlet /></main>
      <Footer contact={contact} />
    </>
  );
}
