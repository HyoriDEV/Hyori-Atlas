-- CreateTable
CREATE TABLE "player_classes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_class_roles" (
    "id" TEXT NOT NULL,
    "playerClassId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "ratio" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_class_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_classes_name_key" ON "player_classes"("name");

-- CreateIndex
CREATE INDEX "player_class_roles_playerClassId_idx" ON "player_class_roles"("playerClassId");

-- CreateIndex
CREATE UNIQUE INDEX "player_class_roles_playerClassId_name_key" ON "player_class_roles"("playerClassId", "name");

-- AddForeignKey
ALTER TABLE "player_class_roles" ADD CONSTRAINT "player_class_roles_playerClassId_fkey" FOREIGN KEY ("playerClassId") REFERENCES "player_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
