'use client';

import AmbientIcon from './AmbientIcon';
import { DropletIcon } from '../icons/DropletIcon';
import { SunIcon } from '../icons/SunIcon';

export default function EndoBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <AmbientIcon
        delay={0}
        duration={6.5}
        amplitude={12}
        className="absolute -top-4 right-12 opacity-[0.07]"
      >
        <DropletIcon size={140} color="#2E86C1" />
      </AmbientIcon>

      <AmbientIcon
        delay={1.5}
        duration={8}
        amplitude={10}
        className="absolute bottom-8 left-16 opacity-[0.06]"
      >
        <SunIcon size={100} color="#2E86C1" />
      </AmbientIcon>

      <AmbientIcon
        delay={3}
        duration={5.5}
        amplitude={8}
        className="absolute top-1/3 left-8 opacity-[0.05]"
      >
        <DropletIcon size={50} color="#1B3A57" />
      </AmbientIcon>
    </div>
  );
}
