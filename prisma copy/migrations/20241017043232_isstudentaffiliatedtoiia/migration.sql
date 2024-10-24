/*
  Warnings:

  - You are about to drop the column `isStudent` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `payment` MODIFY `type` ENUM('ACCOMMODATION', 'REGISTRATION', 'BOTH') NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `isStudent`,
    ADD COLUMN `isStudentAffiliatedToIia` BOOLEAN NOT NULL DEFAULT false;
