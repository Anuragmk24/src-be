/*
  Warnings:

  - Added the required column `groupId` to the `Accomodation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `accomodation` ADD COLUMN `groupId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Accomodation` ADD CONSTRAINT `Accomodation_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
