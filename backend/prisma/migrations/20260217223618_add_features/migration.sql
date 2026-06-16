-- AlterTable
ALTER TABLE `order` ADD COLUMN `deliveryMethod` ENUM('PICKUP', 'DELIVERY') NOT NULL DEFAULT 'PICKUP',
    ADD COLUMN `deliveryNotes` VARCHAR(191) NULL,
    ADD COLUMN `shippingAddress` TEXT NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `seasonalTips` TEXT NULL;
