-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'video',
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Summary" ("content", "createdAt", "id", "language", "title", "updatedAt", "videoId") SELECT "content", "createdAt", "id", "language", "title", "updatedAt", "videoId" FROM "Summary";
DROP TABLE "Summary";
ALTER TABLE "new_Summary" RENAME TO "Summary";
CREATE UNIQUE INDEX "Summary_videoId_language_key" ON "Summary"("videoId", "language");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
