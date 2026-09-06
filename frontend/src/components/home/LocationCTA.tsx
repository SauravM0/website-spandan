import React from 'react';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import type { ClinicSettings } from '@/lib/settings';
import Button from '@/components/ui/Button';

export default function LocationCTA({ settings }: { settings: ClinicSettings }) {
  return (
    <section className="soft-cta py-12">
      <div className="container relative grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-center">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Visit {settings.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-light sm:text-base">
            {settings.address}, {settings.city}, {settings.state} {settings.pincode}
          </p>
          <p className="mt-3 text-sm font-semibold text-accent">{settings.timings}</p>
        </div>

        <div className="grid gap-3 min-[420px]:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
          <Button href={settings.social.whatsapp} target="_blank" rel="noopener noreferrer" variant="accent">
            <MessageCircle size={18} aria-hidden="true" />
            WhatsApp
          </Button>
          <Button href={`tel:${settings.phone}`} variant="outline">
            <Phone size={18} aria-hidden="true" />
            Call
          </Button>
          <Button href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer" variant="outline">
            <MapPin size={18} aria-hidden="true" />
            Map
          </Button>
        </div>
      </div>
    </section>
  );
}
