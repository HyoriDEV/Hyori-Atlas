import { ComingSoonCard } from "@/components/coming-soon-card";

export default function GalleryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Galerie</h1>
      <ComingSoonCard
        title="Contenu à venir"
        description="La galerie communautaire arrive bientôt."
      />
    </div>
  );
}
