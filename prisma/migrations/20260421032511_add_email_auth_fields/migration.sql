-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProvider" TEXT NOT NULL DEFAULT 'google',
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifyExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerifyToken" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordResetExpiry" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;
