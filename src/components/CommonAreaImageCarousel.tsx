import { MapPin } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

interface CommonAreaImageCarouselProps {
  images: string[];
  areaName: string;
  className?: string;
}

const CommonAreaImageCarousel = ({
  images,
  areaName,
  className = "",
}: CommonAreaImageCarouselProps) => {
  // Se não houver imagens, mostra placeholder
  if (!images || images.length === 0) {
    return (
      <div className={`aspect-video bg-muted flex flex-col items-center justify-center ${className}`}>
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary/5 to-primary/10 w-full">
          <MapPin className="h-12 w-12 text-primary/30" />
          <span className="text-xs text-muted-foreground mt-2">Sem imagem</span>
        </div>
      </div>
    );
  }

  // Se houver apenas uma imagem, mostra diretamente sem carrossel
  if (images.length === 1) {
    return (
      <div className={`aspect-video overflow-hidden ${className}`}>
        <img
          src={images[0]}
          alt={areaName}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // Múltiplas imagens - usa carrossel
  return (
    <Carousel className={`w-full ${className}`}>
      <CarouselContent className="ml-0">
        {images.map((url, index) => (
          <CarouselItem key={index} className="pl-0">
            <div className="aspect-video overflow-hidden">
              <img
                src={url}
                alt={`${areaName} - Imagem ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 h-8 w-8 opacity-70 hover:opacity-100" />
      <CarouselNext className="right-2 h-8 w-8 opacity-70 hover:opacity-100" />
      
      {/* Indicadores de posição */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, index) => (
          <div
            key={index}
            className="w-1.5 h-1.5 rounded-full bg-white/50"
          />
        ))}
      </div>
    </Carousel>
  );
};

export default CommonAreaImageCarousel;