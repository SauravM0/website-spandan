'use client';

export default function HeroVideo() {
  return (
    <video
      className="h-full w-full object-cover"
      src="/video_spandan.mp4"
      poster="/video_spandan_poster.jpg"
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      controls={false}
      controlsList="nodownload nofullscreen noremoteplayback"
      disablePictureInPicture
      draggable={false}
      aria-label="Spandan Clinic introduction video"
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
