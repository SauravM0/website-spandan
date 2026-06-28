'use client';

import AmbientIcon from './AmbientIcon';
import { HeartIcon } from '../icons/HeartIcon';

export default function CardioBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <AmbientIcon
        delay={0}
        duration={6}
        amplitude={14}
        className="absolute -top-8 -right-8 opacity-[0.06]"
      >
        <HeartIcon size={180} color="#D6336C" />
      </AmbientIcon>

      <AmbientIcon
        delay={2}
        duration={5}
        amplitude={10}
        className="absolute bottom-12 left-8 opacity-[0.07]"
      >
        <HeartIcon size={60} color="#D6336C" />
      </AmbientIcon>

      <AmbientIcon
        delay={1}
        duration={7}
        amplitude={8}
        className="absolute top-1/2 right-16 opacity-[0.05]"
      >
        <HeartIcon size={90} color="#1B3A57" />
      </AmbientIcon>
    </div>
  );
}
