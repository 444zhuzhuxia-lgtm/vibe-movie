-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialMood" TEXT NOT NULL,
    "moodCategory" TEXT NOT NULL,
    "healingMessage" TEXT NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "userMemo" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false
);
