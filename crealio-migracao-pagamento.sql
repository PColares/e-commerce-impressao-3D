-- Crealio: forma de pagamento "saldo Mercado Pago" (ACCOUNT_MONEY).
-- Importe no phpMyAdmin, no banco u520460695_kamadadb, DEPOIS do crealio-migracao-producao.sql.
SET NAMES utf8mb4;

-- AlterTable
ALTER TABLE `Payment` MODIFY `method` ENUM('PIX', 'BOLETO', 'CREDIT_CARD', 'ACCOUNT_MONEY') NOT NULL;

INSERT INTO `_prisma_migrations` VALUES ('d9cce1c1-2448-4440-8254-5eaa06317d88', 'ef50fab4113da2ba518d017fb2ea8e343075ea07b709bdcab1beed9816242fbf', CURRENT_TIMESTAMP(3), '20260922180000_payment_account_money', NULL, NULL, CURRENT_TIMESTAMP(3), 1);
