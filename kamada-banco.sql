-- Kamada: estrutura + dados iniciais para importar no phpMyAdmin (banco u520460695_kamadadb).
-- Gerado a partir de apps/api/prisma/migrations/20260916150000_init_mysql/migration.sql e apps/api/prisma/seed.ts.
-- Importe UMA vez, num banco vazio.
SET NAMES utf8mb4;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Material` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceMultiplier` DECIMAL(4, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Material_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LayerHeight` (
    `id` VARCHAR(191) NOT NULL,
    `millimeters` DECIMAL(3, 2) NOT NULL,
    `priceMultiplier` DECIMAL(4, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `LayerHeight_millimeters_key`(`millimeters`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Color` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hex` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Color_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `imageUrl` TEXT NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `material` VARCHAR(191) NULL,
    `layerHeightLabel` VARCHAR(191) NULL,
    `specSheet` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Product_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `layerHeightId` VARCHAR(191) NOT NULL,
    `colorId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `calculatedPrice` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NULL,
    `status` ENUM('AWAITING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'AWAITING_PAYMENT',
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_quoteId_key`(`quoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `method` ENUM('PIX', 'BOLETO', 'CREDIT_CARD') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `mercadoPagoPaymentId` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_orderId_key`(`orderId`),
    UNIQUE INDEX `Payment_mercadoPagoPaymentId_key`(`mercadoPagoPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_layerHeightId_fkey` FOREIGN KEY (`layerHeightId`) REFERENCES `LayerHeight`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_colorId_fkey` FOREIGN KEY (`colorId`) REFERENCES `Color`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;



-- Registro da migration para o Prisma (`prisma migrate deploy` não tenta reaplicar depois)
CREATE TABLE `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `_prisma_migrations` VALUES ('26337545-dee7-4b93-9203-61218ce9ad3d', 'a632d2bb55d432f89c8c21cf74a42201d38b581ff59b5070f12779aedd64b5de', CURRENT_TIMESTAMP(3), '20260916150000_init_mysql', NULL, NULL, CURRENT_TIMESTAMP(3), 1);

-- Seed
INSERT INTO `Material` (`id`,`name`,`priceMultiplier`) VALUES
  ('c1917cb7f4fda984251abd757', 'PLA', 1),
  ('ca3f6f6cdef6e63b5922d4992', 'PETG', 1.25),
  ('c53dac3ebc8e65bb19094cf62', 'ABS', 1.35),
  ('c0e7302cde048e69add35204b', 'Resina', 1.8);
INSERT INTO `LayerHeight` (`id`,`millimeters`,`priceMultiplier`) VALUES
  ('cebd2e92d3f3af0142d75e701', 0.2, 0.85),
  ('c555a325f44efd76f734ee506', 0.12, 1),
  ('c5283f3b1c8e9d46fa6e1569e', 0.08, 1.4);
INSERT INTO `Color` (`id`,`name`,`hex`) VALUES
  ('c897987b913bb491ce0c19260', 'Branco', '#F5F5F0'),
  ('ce3a4732c3187a55d0ef2f6df', 'Preto', '#1A1A1A'),
  ('ccb394395a6bc6c403fb2d075', 'Cinza', '#8A8A8A'),
  ('ce8cf361be9c6585cec3641ff', 'Cobre', '#B5651D'),
  ('c29f96b647a4a43bde8478d75', 'Verde-oliva', '#6E7C4A');
INSERT INTO `Product` (`id`,`name`,`slug`,`description`,`imageUrl`,`basePrice`,`material`,`layerHeightLabel`,`specSheet`,`createdAt`) VALUES
  ('c6aa104f8357ebc207669198e', 'Braço articulado', 'braco-articulado', 'Braço articulado impresso sob demanda, ideal para suportes e protótipos móveis.', '/products/peca-braco-articulado.jpg', 89, 'PETG', '0.20mm', '12 cm · 48 g · preenchimento 20%', '2026-09-01 12:00:00.000'),
  ('cf63c3a4d346cc6a7ce8d8a69', 'Suporte de relógio', 'suporte-relogio', 'Suporte de precisão em resina para relógios e acessórios.', '/products/peca-suporte-relogio.jpg', 142, 'Resina', '0.08mm', '9 cm · 64 g · alta precisão', '2026-09-01 11:59:00.000'),
  ('c4bd8e56683d79192709cf514', 'Suporte de fone', 'suporte-fone', 'Suporte resistente em ABS para fones de ouvido de mesa.', '/products/peca-suporte-fone.jpg', 118, 'ABS', '0.20mm', '22 cm · 96 g · resistência térmica', '2026-09-01 11:58:00.000');
