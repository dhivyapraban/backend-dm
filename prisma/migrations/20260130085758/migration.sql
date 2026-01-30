/*
  Warnings:

  - The values [EXTERNAL_SHIPPER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `revenueGenerated` on the `Shipment` table. All the data in the column will be lost.
  - The `status` column on the `Shipment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `RelayNode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Truck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ON_DUTY', 'IN_TRANSIT', 'RESTING', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'AWAITING_DISPATCHER', 'DISPATCHER_APPROVED', 'DISPATCHER_REJECTED', 'DRIVER_NOTIFIED', 'DRIVER_ACCEPTED', 'DRIVER_REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'EN_ROUTE_TO_PICKUP', 'CARGO_LOADED', 'IN_TRANSIT', 'EN_ROUTE_TO_DROP', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BASE_DELIVERY', 'MARKETPLACE_BONUS', 'ABSORPTION_BONUS', 'FUEL_SURCHARGE', 'TOLL_REIMBURSEMENT', 'PENALTY', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DELIVERY_ASSIGNED', 'ABSORPTION_AVAILABLE', 'DELIVERY_UPDATE', 'ROUTE_UPDATE', 'SYSTEM_ALERT', 'GPS_VERIFIED', 'HANDOVER_COMPLETE', 'SHIPMENT_APPROVED', 'SHIPMENT_REJECTED', 'PAYMENT_PROCESSED');

-- CreateEnum
CREATE TYPE "EwbStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRING_SOON', 'TRANSFERRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HandshakeStatus" ADD VALUE 'GPS_VERIFIED';
ALTER TYPE "HandshakeStatus" ADD VALUE 'PHOTOS_CAPTURED';
ALTER TYPE "HandshakeStatus" ADD VALUE 'QR_SCANNED';
ALTER TYPE "HandshakeStatus" ADD VALUE 'SIGNATURES_COLLECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('DRIVER', 'SHIPPER', 'DISPATCHER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DRIVER';
COMMIT;

-- AlterTable
ALTER TABLE "RelayNode" ADD COLUMN     "driverASignature" TEXT,
ADD COLUMN     "driverBSignature" TEXT,
ADD COLUMN     "eWayBillStatus" TEXT,
ADD COLUMN     "eWayBillsTransferred" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "photoBack" TEXT,
ADD COLUMN     "photoFront" TEXT,
ADD COLUMN     "photoLeft" TEXT,
ADD COLUMN     "photoRight" TEXT,
ADD COLUMN     "photoTimestamp" TIMESTAMP(3),
ADD COLUMN     "qrCodeData" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "otpCode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "revenueGenerated",
ADD COLUMN     "cargoType" TEXT,
ADD COLUMN     "cargoWeight" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dispatcherApprovedAt" TIMESTAMP(3),
ADD COLUMN     "dispatcherId" TEXT,
ADD COLUMN     "dispatcherRejectedAt" TIMESTAMP(3),
ADD COLUMN     "dropLat" DOUBLE PRECISION,
ADD COLUMN     "dropLng" DOUBLE PRECISION,
ADD COLUMN     "dropLocation" TEXT,
ADD COLUMN     "dropTime" TIMESTAMP(3),
ADD COLUMN     "estimatedPrice" DOUBLE PRECISION,
ADD COLUMN     "finalPrice" DOUBLE PRECISION,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "pickupLocation" TEXT,
ADD COLUMN     "pickupTime" TIMESTAMP(3),
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "capacity" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fuelLevel" DOUBLE PRECISION,
ADD COLUMN     "mileage" DOUBLE PRECISION,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "nextService" DOUBLE PRECISION,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarColor" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentVehicleNo" TEXT,
ADD COLUMN     "deliveriesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "initials" TEXT,
ADD COLUMN     "lastActiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "status" "DriverStatus" NOT NULL DEFAULT 'ON_DUTY',
ADD COLUMN     "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vehicleType" TEXT,
ADD COLUMN     "weekResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "weeklyEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "weeklyKmDriven" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "VirtualHub" ADD COLUMN     "address" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "truckId" TEXT,
    "shipmentId" TEXT,
    "pickupLocation" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "pickupTime" TIMESTAMP(3),
    "dropLocation" TEXT NOT NULL,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "dropTime" TIMESTAMP(3),
    "estimatedETA" TIMESTAMP(3),
    "cargoType" TEXT NOT NULL,
    "cargoWeight" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "packageId" TEXT,
    "baseEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "marketplaceBonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "absorptionBonus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fuelSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "relayNodeId" TEXT,
    "isMarketplaceLoad" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deliveryId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "route" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EWayBill" (
    "id" TEXT NOT NULL,
    "billNo" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "distance" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "cargoValue" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "EwbStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EWayBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "requests" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_shipmentId_key" ON "Delivery"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EWayBill_billNo_key" ON "EWayBill"("billNo");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_relayNodeId_fkey" FOREIGN KEY ("relayNodeId") REFERENCES "RelayNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EWayBill" ADD CONSTRAINT "EWayBill_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
