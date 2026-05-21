import React from 'react';
import { TopBar } from '../components/Navigation.tsx';
import { ShieldCheck, Lock, Eye, FileText, Scale, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface min-h-screen pb-12">
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex items-center px-6 h-16 border-b border-outline-variant/10">
        <button onClick={() => navigate(-1)} className="p-2 mr-4 hover:bg-surface-container-high rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="font-display font-black text-lg tracking-tight text-primary uppercase tracking-widest">Privacy Protocol</h1>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-10">
        <section className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-tertiary/10 mb-6">
            <ShieldCheck className="text-tertiary w-8 h-8" />
          </div>
          <h2 className="text-3xl font-display font-black tracking-tighter text-on-surface">Data Protection Sovereignty</h2>
          <p className="text-on-surface-variant font-medium mt-2">Compliance with GDPR, CCPA, and ISO 17267 standards.</p>
        </section>

        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display font-bold text-lg text-on-surface">
              <Eye className="w-5 h-5 text-primary" />
              1. Transparency & Collection
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              We collect precise geolocation data (compliant with NMEA 0183 protocols) exclusively to provide safety routing. This data is encrypted in transit and at rest using AES-256 standards.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display font-bold text-lg text-on-surface">
              <Scale className="w-5 h-5 text-primary" />
              2. Your Rights (GDPR/CCPA)
            </h3>
            <ul className="text-sm text-on-surface-variant space-y-2 list-disc pl-5">
              <li><strong>Right to Access:</strong> You can export all your data from the settings menu.</li>
              <li><strong>Right to be Forgotten:</strong> You can request permanent account deletion instantly.</li>
              <li><strong>Data Minimization:</strong> We only store reports relevant to current community safety.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display font-bold text-lg text-on-surface">
              <FileText className="w-5 h-5 text-primary" />
              3. Positional Integrity (ISO/ASPRS)
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Map data accuracy is monitored against ASPRS Positional Accuracy Standards for Digital Geospatial Data. Users are warned when GPS horizontal accuracy exceeds 15 meters.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-outline-variant/20">
          <p className="text-[10px] font-bold text-outline text-center uppercase tracking-widest">
            Last Updated: April 2026 • Version 2.4.0-Compliance
          </p>
        </div>
      </main>
    </div>
  );
}
