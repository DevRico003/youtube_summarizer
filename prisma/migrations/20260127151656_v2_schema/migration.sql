/*
  Warnings:

  - You are about to drop the column `language` on the `Summary` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `Summary` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Summary` table. All the data in the column will be lost.
  - Added the required column `transcript` to the `Summary` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summaryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Topic_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTopicEdit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "customTitle" TEXT,
    "customStartMs" INTEGER,
    "customEndMs" INTEGER,
    CONSTRAINT "UserTopicEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTopicEdit_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserTopicEdit_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "detailLevel" INTEGER NOT NULL DEFAULT 3,
    "preferredModel" TEXT NOT NULL DEFAULT 'glm-4.7',
    "customPrompt" TEXT,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "service" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "creditsUsed" REAL NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Summary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "hasTimestamps" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Summary" ("content", "createdAt", "id", "title", "updatedAt", "videoId") SELECT "content", "createdAt", "id", "title", "updatedAt", "videoId" FROM "Summary";
DROP TABLE "Summary";
ALTER TABLE "new_Summary" RENAME TO "Summary";
CREATE UNIQUE INDEX "Summary_videoId_key" ON "Summary"("videoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserTopicEdit_userId_topicId_key" ON "UserTopicEdit"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfig_key_key" ON "AppConfig"("key");
