// src/components/public/PublicLayout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useDocument } from '../../hooks/useFirestore';

export default function PublicLayout() {
  const { data: contact } = useDocument('settings', 'contact');

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer contact={contact} />
    </>
  );
}
