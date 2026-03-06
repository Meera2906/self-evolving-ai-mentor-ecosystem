-- DropIndex
DROP INDEX "Quiz_studentId_topic_idx";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "concept" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "onboardingProfile" JSONB;

-- CreateTable
CREATE TABLE "ConceptProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "planJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConceptProgress_studentId_topic_concept_key" ON "ConceptProgress"("studentId", "topic", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPlan_studentId_topic_key" ON "LearningPlan"("studentId", "topic");

-- AddForeignKey
ALTER TABLE "ConceptProgress" ADD CONSTRAINT "ConceptProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPlan" ADD CONSTRAINT "LearningPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
