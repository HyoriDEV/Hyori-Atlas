import { ComingSoonCard } from "@/components/coming-soon-card";

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight sm:text-[40px]">Règlement</h1>
      <ComingSoonCard
        title="Contenu à venir"
        description="Le règlement du serveur arrive bientôt."
      />
    </div>
  );
}
