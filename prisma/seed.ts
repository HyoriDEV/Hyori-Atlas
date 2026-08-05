import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const newsSeed = [
  {
    type: "ANNOUNCEMENT" as const,
    title: "Ouverture des candidatures whitelist",
    excerpt: "La whitelist Hyori RP est désormais ouverte à tous les nouveaux joueurs.",
    content:
      "Nous sommes heureux d'annoncer l'ouverture officielle des candidatures whitelist pour la saison à venir. Rendez-vous dans votre Espace Joueur pour lier vos comptes Discord et Minecraft.",
    authorLabel: "Administration Hyori RP",
    publishedAt: new Date("2026-07-20T10:00:00Z"),
  },
  {
    type: "ANNOUNCEMENT" as const,
    title: "Nouvelle saison RP : Les Terres de l'Aube",
    excerpt: "Découvrez la nouvelle trame narrative qui débutera le mois prochain.",
    content:
      "La prochaine saison RP introduira une nouvelle région, de nouvelles factions et des événements scénarisés par l'équipe Suivi RP.",
    authorLabel: "Administration Hyori RP",
    publishedAt: new Date("2026-07-28T14:30:00Z"),
  },
  {
    type: "ANNOUNCEMENT" as const,
    title: "Rappel : règlement du serveur mis à jour",
    excerpt: "Merci de prendre connaissance des dernières modifications du règlement.",
    content:
      "Quelques ajustements ont été apportés au règlement, notamment concernant les rapports BDA. Consultez la page Règlement pour plus de détails.",
    authorLabel: "Administration Hyori RP",
    publishedAt: new Date("2026-08-01T09:15:00Z"),
  },
  {
    type: "CHANGELOG" as const,
    title: "Mise à jour serveur 1.4.2",
    excerpt: "Corrections de bugs et améliorations de performance.",
    content:
      "Cette mise à jour corrige plusieurs problèmes de synchronisation et améliore les temps de chargement des chunks en zone urbaine.",
    authorLabel: "Équipe Développement",
    publishedAt: new Date("2026-07-22T18:00:00Z"),
  },
  {
    type: "CHANGELOG" as const,
    title: "Déploiement de Hyori Atlas v1",
    excerpt: "Le nouveau hub communautaire et back-office est désormais en ligne.",
    content:
      "Hyori Atlas remplace les anciens outils dispersés par une plateforme unique : suivi de whitelist, tickets, fiches de personnage et bien plus.",
    authorLabel: "Équipe Développement",
    publishedAt: new Date("2026-08-03T12:00:00Z"),
  },
  {
    type: "CHANGELOG" as const,
    title: "Correctif : synchronisation des skins Minecraft",
    excerpt: "Résolution d'un problème d'affichage des têtes de skin dans l'Atlas des joueurs.",
    content:
      "Les aperçus de skin 2D affichaient parfois un skin par défaut après un changement récent. Ce problème est désormais résolu.",
    authorLabel: "Équipe Développement",
    publishedAt: new Date("2026-08-04T16:45:00Z"),
  },
];

async function main() {
  for (const news of newsSeed) {
    await prisma.news.upsert({
      where: { id: `seed-${news.title}` },
      update: news,
      create: { id: `seed-${news.title}`, ...news },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
