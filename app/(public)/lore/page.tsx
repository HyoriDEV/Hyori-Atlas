import { ComingSoonCard } from "@/components/coming-soon-card";

export default function LorePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Lore</h1>
      <ComingSoonCard title="Contenu à venir" description="Le lore du serveur arrive bientôt." />
    </div>
  );
}
