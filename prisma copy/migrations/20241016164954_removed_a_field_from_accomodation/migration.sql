-- DropForeignKey
ALTER TABLE `accomodation` DROP FOREIGN KEY `Accomodation_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `accomodation` DROP FOREIGN KEY `Accomodation_userId_fkey`;

-- AlterTable
ALTER TABLE `accomodation` MODIFY `userId` INTEGER NULL,
    MODIFY `groupId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Accomodation` ADD CONSTRAINT `Accomodation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Accomodation` ADD CONSTRAINT `Accomodation_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
