-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Summary_videoId_language_key" ON "Summary"("videoId", "language");
