-- CreateTable
CREATE TABLE `Printer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `buildVolume` VARCHAR(191) NULL,
    `nozzleDiameter` DECIMAL(3, 2) NOT NULL DEFAULT 0.4,
    `manualStatus` ENUM('ACTIVE', 'MAINTENANCE', 'OFFLINE') NOT NULL DEFAULT 'ACTIVE',
    `printedMinutes` INTEGER NOT NULL DEFAULT 0,
    `maintenanceIntervalHours` INTEGER NULL,
    `printedMinutesAtLastMaintenance` INTEGER NOT NULL DEFAULT 0,
    `lastMaintenanceAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Printer_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrinterSlot` (
    `id` VARCHAR(191) NOT NULL,
    `printerId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `materialId` VARCHAR(191) NULL,
    `colorId` VARCHAR(191) NULL,

    UNIQUE INDEX `PrinterSlot_printerId_position_key`(`printerId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrintJob` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'PREPARING', 'PRINTING', 'FINISHING', 'INSPECTION', 'READY') NOT NULL DEFAULT 'QUEUED',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL DEFAULT 'NORMAL',
    `printerId` VARCHAR(191) NULL,
    `estimatedMinutes` INTEGER NULL,
    `estimatedGrams` INTEGER NULL,
    `dueDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `printedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrintFailure` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `printerId` VARCHAR(191) NULL,
    `reason` ENUM('WARPING', 'SPAGHETTI', 'NOZZLE_CLOG', 'BED_ADHESION', 'LAYER_SHIFT', 'FILAMENT_RUNOUT', 'POWER_OUTAGE', 'OTHER') NOT NULL,
    `notes` TEXT NULL,
    `wastedGrams` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PrinterSlot` ADD CONSTRAINT `PrinterSlot_printerId_fkey` FOREIGN KEY (`printerId`) REFERENCES `Printer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrinterSlot` ADD CONSTRAINT `PrinterSlot_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrinterSlot` ADD CONSTRAINT `PrinterSlot_colorId_fkey` FOREIGN KEY (`colorId`) REFERENCES `Color`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintJob` ADD CONSTRAINT `PrintJob_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintJob` ADD CONSTRAINT `PrintJob_printerId_fkey` FOREIGN KEY (`printerId`) REFERENCES `Printer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintFailure` ADD CONSTRAINT `PrintFailure_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `PrintJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrintFailure` ADD CONSTRAINT `PrintFailure_printerId_fkey` FOREIGN KEY (`printerId`) REFERENCES `Printer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

