import { Image } from "../atoms/image";
type Slot = { src: string; alt: string; width: number; height: number };
export function HeroCollage({ images }: { images: readonly Slot[] }) {
  return (
    <div
      aria-label="Imágenes destacadas"
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
      {images.slice(0, 3).map((image, index) => (
        <Image
          key={image.src}
          {...image}
          aboveTheFold
          fetchPriority={index === 0 ? "high" : "auto"}
          className={
            index > 0
              ? "w-full rounded-sm object-cover max-md:hidden"
              : "w-full rounded-sm object-cover md:row-span-2 md:h-full"
          }
        />
      ))}
    </div>
  );
}
