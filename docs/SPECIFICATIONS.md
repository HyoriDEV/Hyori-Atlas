# Hyori Atlas

## 1. Project Overview

Hyori Atlas is a centralized web application designed to manage the "Hyori RP" Minecraft server.
It serves as both the hub for the player community, and the back-office platform for the staff to manage players, their roleplay progression, their conflicts, and internal tasks.

## 2. Technical Stack

The application will be built using a modern containerized architecture:

- Framework: Next.js with TypeScript.
- UI Library: shadcn/ui using Mira style.
- Database: PostgreSQL.
- ORM: Prisma with Prisma Studio.
- Infrastructure: Docker Compose for the entire stack (Next.js, PostgreSQL and Prisma Studio).
- External APIs: Discord OAuth2 used for authentication.

## 3. Public Site (Frontend)

### 3.1. Navigation Bar

A sticky or fixed top navigation bar containing:

- Branding: The text "Hyori RP" (acting as a temporary placeholder logo).
- Links: Actualités, Galerie, Lore, Règlement.
- Call to Action: A button labeled "Espace Joueur" that gives access to the authentication gate.

### 3.2. Static & Dynamic Pages

- Home: A minimalist landing page displaying only the text: "Bienvenue sur Hyori RP.".
- Actualités: A dynamic page featuring a two-tab interface, displaying updates from the latest to the oldest:
  - Annonces: Chronological feed of official announcements published by Administrators.
  - Changelog: Technical or server updates published by Administrators/Developers.
- Galerie: A placeholder page intended for future community screenshots (currently rendered empty).
- Lore & Règlement: Static placeholder pages (currently rendered empty).

### 3.3. Authentication Flow

1. User clicks "Espace Joueur" in the navigation bar.
2. If not logged in, the user is redirected to Discord OAuth2 for authentication.
3. Upon successful Discord first login, the user's account is registered in the database, and they are redirected to the "Premiers pas" view within the Player Dashboard.
4. The Ticketing system is immediately unlocked at this stage, so the player can report any issues to the staff.

## 4. Player Dashboard (Espace Joueur)

Once authenticated via Discord, the user accesses a private dashboard featuring the following modules, progressively unlocked according to their registration status.
The User Dashboard is called "Espace Joueur" and has the same layout as the Staff Dashboard, with a sidebar on the left.
The "Premier pas" view is the default onboarding page of the sidebar. It disappears once the registration process ends for the user.

### 4.1. Registration Progress (Premiers pas)

The initial landing view for newly authenticated players, displaying an overview of their profile and registration progress.

- Linked Accounts Display:
  - Discord: Displays the linked Discord profile picture, display name, and username.
  - Minecraft: Displays the 2D skin head and in-game display name.
- Account Linking Logic:
  - Initially, only the Discord account is linked.
  - The UI features a button to link the Minecraft account. This button is currently a non-functional placeholder for display purposes only, as the in-game linking plugin is not yet implemented.
  - Temporary Workaround: The Minecraft account linkage (UUID and display name) will be performed manually directly in the database by the developer.
- Waiting List: Once both Discord and Minecraft accounts are linked, the player is automatically placed on the Waiting List (Liste d'attente) and must wait for Administrator approval before proceeding.

### 4.2. Whitelist Interview (Entretien Whitelist)

Gate: Unlocked only after the player is accepted from the Waiting List by an Administrator.

- Functionality: Players must schedule a vocal interview to present their RP project. They can book an available slot at their convenience.
- UI/UX: A calendar component displaying available dates. Selecting a date reveals available time slots (configured by Admins) as a list, with existing reservations greyed out.
- Statuses of the Whitelist Application:
  - Inscrit (Default upon booking)
  - Modifications demandées (if requested, the player must book a new time slot. A player might need to book vocal interviews multiple times until validation).
  - Accepté

### 4.3. Character Sheet (Fiche Personnage)

Gate: Unlocked in parallel with the Whitelist Interview phase. Players can fill this out at their convenience (before or after booking an interview).

- Locking Mechanism:
  - The sheet remains fully editable until it is automatically locked when marked as "Validée" by Admins in the Staff Dashboard.
  - If marked as "Modifications demandées", the sheet remains editable so the player can apply changes, and they must book a new interview slot.
- Civil Information: Nom, Surnom, Âge (16-72), Genre, Statut, Taille (1.50m - 2.00m). These are stored as separate fields.
- Description: Temperament, expressions, daily habits. This is a single paragraph stored as the "description" field.
- Background: Story, objectives, and motivations. This is a single paragraph stored as the "background" field.
- Additional Comments: Optional field, for example to specify the character's relations to other characters or groups.
- Skill Map: A pool of 50 points distributed (1 to 5 points max per skill) across 10 skills in 3 categories:
  - Physical: Force, Endurance, Discrétion, Dextérité.
  - Mental: Intelligence, Sang-froid, Maîtrise des armes et outils.
  - Social: Charisme, Persuasion, Violence.
  - These points are defined by the player for each skill, using a row of five squares to choose from 1 to 5 points.

### 4.4. Ticketing System (Tickets)

Gate: Unlocked immediately upon the very first registration (Discord login).

- View: A dashboard listing all active tickets labelled by category. Archived tickets can also be listed, but are hidden by default.
- Creation: A pop-up modal form to create a new ticket.
- Categories: Question générale, Whitelist, Demande RP, Plainte contre un joueur, Report de bug.
- Statuses: En attente du staff (default), En attente du joueur, Archivé. Archived tickets remain readable by both the player and the staff, and are not deleted.

### 4.5. Writing (Écriture)

Gate: Unlocked only when the player's final status is manually set to "Inscrit à la whitelist" by the administration.

- A rich-text editor environment where players draft their character's canonical history chapter by chapter.
- Supports formatting (bold, italics, strikethrough, underline), hyperlinks.
- Images can be uploaded and added between paragraphs of a chapter.
- Serves as a parallel narrative tool alongside Staff RP Tracking, eventually forming a public Wiki page (Wiki rendering out of scope for MVP).

### 4.6. RP Tracking (Suivi RP)

Gate: Unlocked only when the player's final status is manually set to "Inscrit à la whitelist" by the administration.

- A direct, live-chat interface (similar to Discord DMs) between the player and the RP Staff team.
- Supports image attachments within the chat.
- System messages automatically notify this chat when the player creates a "Demande RP" ticket, including a clickable hyperlink to the ticket.

## 5. Staff Dashboard (Back-Office)

The Staff Dashboard features a persistent left-hand sidebar. Navigation links within this sidebar are conditionally rendered based on the user's role.

### 5.1. Waiting List Management (Liste d'attente)

- A dedicated view allowing Administrators to manage players who have successfully linked both their Discord and Minecraft accounts.
- Admins can accept or reject players to grant them access to the Whitelist Interview and Character Sheet phases.
- Note: Until this back-office feature is fully operational, this validation will be handled directly in the database.

### 5.2. Player Atlas (Atlas des joueurs)

A comprehensive, paginated data table listing all registered players. Includes robust sorting and filtering capabilities. Clicking a row opens a detailed, split-screen player profile:

Left Column (Player Data & Notes):

- 2D Minecraft Skin preview.
- Discord & Minecraft usernames, corresponding IDs, and UUID.
- Timestamps: Site registration, Whitelist registration, Whitelist acceptance, First server login.
- Playtime metrics: Total hours played, Last login timestamp.
- Full view of the Character Sheet and Skill Map.
- Validation Workflow:
  - Staff can mark the Character Sheet as "Validée" (which automatically locks it for the player) or "Modifications demandées" (keeps it editable, forces the player to book a new interview).
  - Once everything is satisfactory, Admins manually promote the player to the final status: "Inscrit à la whitelist". This action automatically marks the Character Sheet as "Validée" (if not done previously) and unlocks the Writing and RP Tracking modules for the player.
- Staff Notes: A private text area where authorized staff can leave chronological, readable notes about the player (invisible to the player).

Right Column (Historical Timelines - 2 Tabs):

- Tab 1 - Action History: A vertical timeline tracking site interactions (whitelist status changes, lore writing updates, ticket creations). It also displays Minecraft server sanctions (bans, kicks, mutes) fetched via database (mock data will be used for MVP).
- Tab 2 - Session History: A chronological log of Minecraft login/logout events grouped as playing sessions, fetched via database (mock data will be used for MVP).

### 5.3. BDA Reports (Rapports BDA)

A dedicated module for the GC team to handle player disputes objectively.

- List View: Displays active and archived conflict reports.
- Creation Flow:
  - Define each involved party in the dispute.
  - Select involved players for each party, via a searchable dropdown fetching the player list from the database.
  - Short summary as title for the report.
  - Detailed, objective description of the incident.
  - Optional image attachments for proof.
  - Optional dropdown to link an existing player complaint ticket.
- Statuses: Non lu (default), Résolu, Archivé.

### 5.4. Staff Backlog

An internal Kanban-style task management system.

- Task Creation (Comms Team primary): Title, detailed description, file/image attachments, and optional linking of specific player tickets.
- Properties: Assignee (or self-assign), Status, Priority, Optional Deadline.
- Board View: Standard drag-and-drop or status-update Kanban board with filters/sorts.
- Statuses: À faire, En cours, En validation, Terminé.
- Task History: A vertical timeline inside each task logging every modification (creation, status changes, assignments).

## 6. Role-Based Access Control (RBAC) Matrix

- Administrator: Full access to all features below. Manages User Accounts. Configures Whitelist slots & validations. Publishes News (Annonces & Changelogs).
- Communication: Reads Player Atlas. Manages Player Tickets. Writes to Staff Backlog.
- Gestion des conflits (GC): Reads Player Atlas. Manages Player Tickets. Writes/Manages BDA Reports. Writes to Staff Backlog.
- Suivi RP: Reads Player Atlas. Manages Player RP Tracking chats & Lore Writing validation.
- Développeur: Writes to Staff Backlog. Publishes News (Changelogs only).
- Joueur: Access restricted entirely to the Frontend and the Espace Joueur dashboard.
