import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Shield, Search, MessageCircle, Star, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { user, userProfile, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user && userProfile) {
      if (userProfile.profileComplete < 50) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, userProfile, loading]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error('Sign in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--warm-white)' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-rose-gold/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8956C, #4A9E4A)' }}>
              <Heart size={14} fill="white" color="white" />
            </div>
            <span className="font-display font-semibold text-lg" style={{ color: 'var(--charcoal)' }}>NikahConnect</span>
          </div>
          <button onClick={handleSignIn} className="btn-primary text-sm py-2 px-5">
            Sign In with Google
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="pattern-bg relative overflow-hidden pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Arabic text accent */}
          <p className="font-arabic text-rose-gold text-xl mb-4 opacity-70">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          
          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-tight mb-6 animate-fade-up" style={{ color: 'var(--charcoal)' }}>
            Find Your <em className="italic" style={{ color: 'var(--rose-gold)' }}>Life Partner</em>
            <br />with Dignity
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed stagger-1 animate-fade-up" style={{ animationFillMode: 'both', opacity: 0 }}>
            A privacy-first, family-friendly platform for serious matrimonial matches. 
            Designed with respect for Islamic values and modern needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center stagger-2 animate-fade-up" style={{ animationFillMode: 'both', opacity: 0 }}>
            <button onClick={handleSignIn} className="btn-primary flex items-center gap-2 justify-center">
              Begin Your Journey
              <ArrowRight size={16} />
            </button>
            <button className="btn-secondary">
              Learn How It Works
            </button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-14 stagger-3 animate-fade-up" style={{ animationFillMode: 'both', opacity: 0 }}>
            {[
              { icon: Shield, text: 'Privacy Protected' },
              { icon: Check, text: 'Verified Profiles' },
              { icon: Heart, text: 'Serious Matches Only' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm" style={{ color: '#6E6E62' }}>
                <Icon size={16} style={{ color: 'var(--rose-gold)' }} />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-5" style={{ background: 'var(--rose-gold)' }} />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-5" style={{ background: '#4A9E4A' }} />
      </section>

      {/* Ornament */}
      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className="ornament">
          <span className="text-rose-gold text-sm font-arabic">❖</span>
        </div>
      </div>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-center mb-3" style={{ color: 'var(--charcoal)' }}>
            Designed for Serious Seekers
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Every feature built with intention — to facilitate meaningful connections, not casual encounters.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="card p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: feature.bg }}>
                  <feature.icon size={22} style={{ color: feature.color }} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--charcoal)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account Types */}
      <section className="py-16 px-6" style={{ background: 'white' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-center mb-3" style={{ color: 'var(--charcoal)' }}>
            Two Ways to Join
          </h2>
          <p className="text-center text-gray-500 mb-10">Find the account type that fits your situation</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-8 border-2" style={{ borderColor: 'rgba(200,149,108,0.3)' }}>
              <div className="text-3xl mb-3">👤</div>
              <h3 className="font-display text-2xl font-semibold mb-3" style={{ color: 'var(--charcoal)' }}>Individual Account</h3>
              <p className="text-gray-500 text-sm mb-6">Manage your own profile and search for matches independently, with full control over your privacy.</p>
              <ul className="space-y-2">
                {['Personal profile management', 'Direct match requests', 'Private messaging', 'Full privacy controls'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="card p-8 border-2" style={{ borderColor: 'rgba(74,158,74,0.3)' }}>
              <div className="text-3xl mb-3">👨‍👩‍👧</div>
              <h3 className="font-display text-2xl font-semibold mb-3" style={{ color: 'var(--charcoal)' }}>Parent/Guardian Account</h3>
              <p className="text-gray-500 text-sm mb-6">Create and manage a profile on behalf of your child with built-in family oversight and transparency.</p>
              <ul className="space-y-2">
                {['Child profile management', 'Family visibility controls', 'Guardian-led communication', 'Safe & supervised process'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 pattern-bg">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl mb-4" style={{ color: 'var(--charcoal)' }}>
            Ready to Begin?
          </h2>
          <p className="text-gray-500 mb-8">Your journey to finding a righteous partner starts here.</p>
          <button onClick={handleSignIn} className="btn-primary text-base px-10 py-4">
            Create Your Profile — It's Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8956C, #4A9E4A)' }}>
              <Heart size={10} fill="white" color="white" />
            </div>
            <span className="font-display font-medium text-sm" style={{ color: 'var(--charcoal)' }}>NikahConnect</span>
          </div>
          <p className="text-xs text-gray-400">© 2025 NikahConnect. Designed for dignified matchmaking.</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <a href="#" className="hover:text-rose-gold transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-rose-gold transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-rose-gold transition-colors">Community Guidelines</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Shield,
    title: 'Privacy First',
    desc: 'Control exactly who sees your profile, photos, and contact details. Pause or hide at any time.',
    bg: 'rgba(200,149,108,0.1)', color: '#C8956C',
  },
  {
    icon: Check,
    title: 'Verified Profiles',
    desc: 'Email and identity verification ensures you\'re connecting with real, genuine profiles.',
    bg: 'rgba(74,158,74,0.1)', color: '#4A9E4A',
  },
  {
    icon: Search,
    title: 'Smart Search',
    desc: 'Filter by age, location, education, religion, and lifestyle preferences to find compatible matches.',
    bg: 'rgba(200,149,108,0.1)', color: '#C8956C',
  },
  {
    icon: MessageCircle,
    title: 'Safe Messaging',
    desc: 'Only matched profiles can message each other. Full block and report functionality included.',
    bg: 'rgba(74,158,74,0.1)', color: '#4A9E4A',
  },
  {
    icon: Heart,
    title: 'Compatibility Matching',
    desc: 'Our system surfaces profiles that align with your stated preferences and values.',
    bg: 'rgba(200,149,108,0.1)', color: '#C8956C',
  },
  {
    icon: Star,
    title: 'Family Friendly',
    desc: 'Parent/guardian accounts allow family oversight and participation throughout the process.',
    bg: 'rgba(74,158,74,0.1)', color: '#4A9E4A',
  },
];
