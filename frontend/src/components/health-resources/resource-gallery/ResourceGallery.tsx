import { resourceGalleryItems } from './galleryData';

export default function ResourceGallery() {
  return (
    <div className="grid-3">
      {resourceGalleryItems.map((item) => (
        <article key={item.title} className="card border border-border">
          <div className="flex aspect-[4/3] items-center justify-center bg-bg-alt p-8">
            <img
              src={item.imageUrl}
              alt=""
              className="h-24 w-auto object-contain"
              loading="lazy"
            />
          </div>
          <div className="p-5">
            <h3 className="text-lg font-bold text-navy">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-light">{item.caption}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
