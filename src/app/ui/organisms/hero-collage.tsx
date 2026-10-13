import { Image } from "../atoms/image";
type Slot = { src: string; alt: string; width: number; height: number };
export function HeroCollage({ images }: { images: readonly Slot[] }) {
  return (
    <div aria-label="Imágenes destacadas">
      {images.slice(0, 3).map((image, index) => (
        <Image
          key={image.src}
          {...image}
          aboveTheFold
          fetchPriority={index === 0 ? "high" : "auto"}
          className={index > 0 ? "max-md:hidden" : undefined}
        />
      ))}
    </div>
  );
}
