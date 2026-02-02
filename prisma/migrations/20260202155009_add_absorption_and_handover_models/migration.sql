/*
  Warnings:

  - The values [HANDOVER_COMPLETE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `relayNodeId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `dispatcherApprovedAt` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `dispatcherId` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `dispatcherRejectedAt` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the `RelayNode` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[packageId]` on the table `Delivery` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cargoVolumeLtrs` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dispatcherId` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Made the column `packageId` on table `Delivery` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `maxVolume` to the `Truck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxWeight` to the `Truck` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PENDING', 'ALLOCATED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AbsorptionStatus" AS ENUM ('PENDING', 'ACCEPTED_BY_ROUTE1', 'ACCEPTED_BY_ROUTE2', 'BOTH_ACCEPTED', 'REJECTED', 'EXPIRED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'QR_SCANNED', 'CHECKLIST_VERIFIED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackhaulStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'PICKED_UP', 'DELIVERED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeliveryStatus" ADD VALUE 'ALLOCATED';
ALTER TYPE "DeliveryStatus" ADD VALUE 'ABSORPTION_PROPOSED';
ALTER TYPE "DeliveryStatus" ADD VALUE 'ABSORPTION_ACCEPTED';
ALTER TYPE "DeliveryStatus" ADD VALUE 'ABSORPTION_TRANSFERRED';

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('DELIVERY_ASSIGNED', 'ABSORPTION_AVAILABLE', 'ABSORPTION_ACCEPTED', 'ABSORPTION_COMPLETED', 'BACKHAUL_OPPORTUNITY', 'DELIVERY_UPDATE', 'ROUTE_UPDATE', 'SYSTEM_ALERT', 'GPS_VERIFIED', 'SHIPMENT_APPROVED', 'SHIPMENT_REJECTED', 'PAYMENT_PROCESSED', 'REGISTRATION_APPROVED', 'REGISTRATION_REJECTED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'BACKHAUL_BONUS';

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_relayNodeId_fkey";

-- DropForeignKey
ALTER TABLE "RelayNode" DROP CONSTRAINT "RelayNode_hubId_fkey";

-- DropForeignKey
ALTER TABLE "RelayNode" DROP CONSTRAINT "RelayNode_truckAId_fkey";

-- DropForeignKey
ALTER TABLE "RelayNode" DROP CONSTRAINT "RelayNode_truckBId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_dispatcherId_fkey";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "relayNodeId",
ADD COLUMN     "baselineDistance" DOUBLE PRECISION,
ADD COLUMN     "carbonEmitted" DOUBLE PRECISION,
ADD COLUMN     "cargoVolumeLtrs" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "courierCompanyId" TEXT,
ADD COLUMN     "dispatcherId" TEXT NOT NULL,
ADD COLUMN     "distanceTraveled" DOUBLE PRECISION,
ADD COLUMN     "optimizedRouteId" TEXT,
ADD COLUMN     "packageCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "timeWindowEnd" TIMESTAMP(3),
ADD COLUMN     "timeWindowStart" TIMESTAMP(3),
ALTER COLUMN "driverId" DROP NOT NULL,
ALTER COLUMN "distanceKm" DROP NOT NULL,
ALTER COLUMN "packageId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "dispatcherApprovedAt",
DROP COLUMN "dispatcherId",
DROP COLUMN "dispatcherRejectedAt",
DROP COLUMN "rejectionReason",
ADD COLUMN     "cargoVolume" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "co2PerKm" DOUBLE PRECISION,
ADD COLUMN     "courierCompanyId" TEXT,
ADD COLUMN     "currentVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "currentWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "fuelConsumption" DOUBLE PRECISION,
ADD COLUMN     "fuelType" "FuelType",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxVolume" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "maxWeight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sourceHubId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "courierCompanyId" TEXT,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "VirtualHub" ADD COLUMN     "radius" DOUBLE PRECISION;

-- DropTable
DROP TABLE "RelayNode";

-- DropEnum
DROP TYPE "HandshakeStatus";

-- CreateTable
CREATE TABLE "CourierCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "adminEmail" TEXT,
    "adminPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GPSLog" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GPSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizedRoute" (
    "id" TEXT NOT NULL,
    "courierCompanyId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "routePolyline" TEXT,
    "waypoints" JSONB,
    "totalDistance" DOUBLE PRECISION DEFAULT 0.0,
    "totalDuration" DOUBLE PRECISION DEFAULT 0.0,
    "estimatedStartTime" TIMESTAMP(3) NOT NULL,
    "estimatedEndTime" TIMESTAMP(3) NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "totalVolume" DOUBLE PRECISION NOT NULL,
    "utilizationPercent" DOUBLE PRECISION NOT NULL,
    "baselineDistance" DOUBLE PRECISION NOT NULL,
    "carbonSaved" DOUBLE PRECISION NOT NULL,
    "emptyMilesSaved" DOUBLE PRECISION NOT NULL,
    "isTSPOptimized" BOOLEAN NOT NULL DEFAULT true,
    "status" "RouteStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsorptionOpportunity" (
    "id" TEXT NOT NULL,
    "route1Id" TEXT NOT NULL,
    "route2Id" TEXT NOT NULL,
    "overlapDistanceKm" DOUBLE PRECISION NOT NULL,
    "overlapStartTime" TIMESTAMP(3) NOT NULL,
    "overlapEndTime" TIMESTAMP(3) NOT NULL,
    "nearestHubId" TEXT NOT NULL,
    "overlapPolyline" TEXT,
    "overlapCenterLat" DOUBLE PRECISION NOT NULL,
    "overlapCenterLng" DOUBLE PRECISION NOT NULL,
    "estimatedMeetTime" TIMESTAMP(3) NOT NULL,
    "timeWindow" INTEGER NOT NULL,
    "eligibleDeliveryIds" TEXT NOT NULL,
    "truck1DistanceBefore" DOUBLE PRECISION NOT NULL,
    "truck1DistanceAfter" DOUBLE PRECISION NOT NULL,
    "truck2DistanceBefore" DOUBLE PRECISION NOT NULL,
    "truck2DistanceAfter" DOUBLE PRECISION NOT NULL,
    "totalDistanceSaved" DOUBLE PRECISION NOT NULL,
    "potentialCarbonSaved" DOUBLE PRECISION NOT NULL,
    "spaceRequiredVolume" DOUBLE PRECISION NOT NULL,
    "spaceRequiredWeight" DOUBLE PRECISION NOT NULL,
    "truck1SpaceAvailable" DOUBLE PRECISION NOT NULL,
    "truck2SpaceAvailable" DOUBLE PRECISION NOT NULL,
    "status" "AbsorptionStatus" NOT NULL DEFAULT 'PENDING',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByRoute1At" TIMESTAMP(3),
    "acceptedByRoute2At" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsorptionOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsorptionTransfer" (
    "id" TEXT NOT NULL,
    "absorptionOpportunityId" TEXT NOT NULL,
    "exporterDriverId" TEXT NOT NULL,
    "importerDriverId" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "deliveryIdsToTransfer" TEXT NOT NULL,
    "exportedDeliveryId" TEXT,
    "importedDeliveryId" TEXT,
    "qrCodeScanned" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeData" TEXT,
    "scannedAt" TIMESTAMP(3),
    "checklistData" JSONB,
    "photos" JSONB,
    "spaceAvailableExporter" DOUBLE PRECISION NOT NULL,
    "spaceAvailableImporter" DOUBLE PRECISION NOT NULL,
    "distanceSavedKm" DOUBLE PRECISION NOT NULL,
    "carbonSavedKg" DOUBLE PRECISION NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AbsorptionTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackhaulPickup" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "shipperName" TEXT NOT NULL,
    "shipperPhone" TEXT NOT NULL,
    "shipperLocation" TEXT NOT NULL,
    "shipperLat" DOUBLE PRECISION NOT NULL,
    "shipperLng" DOUBLE PRECISION NOT NULL,
    "destinationHubId" TEXT NOT NULL,
    "packageCount" INTEGER NOT NULL,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "totalVolume" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "carbonSavedKg" DOUBLE PRECISION NOT NULL,
    "status" "BackhaulStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "BackhaulPickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarbonMetric" (
    "id" TEXT NOT NULL,
    "courierCompanyId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "totalDeliveries" INTEGER NOT NULL,
    "totalOptimizedRoutes" INTEGER NOT NULL,
    "totalAbsorptions" INTEGER NOT NULL,
    "totalBackhauls" INTEGER NOT NULL,
    "baselineDistance" DOUBLE PRECISION NOT NULL,
    "actualDistance" DOUBLE PRECISION NOT NULL,
    "distanceSaved" DOUBLE PRECISION NOT NULL,
    "baselineCarbon" DOUBLE PRECISION NOT NULL,
    "actualCarbon" DOUBLE PRECISION NOT NULL,
    "carbonSaved" DOUBLE PRECISION NOT NULL,
    "emptyMilesPrevented" DOUBLE PRECISION NOT NULL,
    "avgUtilization" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarbonMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteCache" (
    "id" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destLat" DOUBLE PRECISION NOT NULL,
    "destLng" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "polyline" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'google_maps',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierCompany_name_key" ON "CourierCompany"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CourierCompany_code_key" ON "CourierCompany"("code");

-- CreateIndex
CREATE INDEX "GPSLog_truckId_timestamp_idx" ON "GPSLog"("truckId", "timestamp");

-- CreateIndex
CREATE INDEX "GPSLog_latitude_longitude_idx" ON "GPSLog"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "OptimizedRoute_courierCompanyId_status_idx" ON "OptimizedRoute"("courierCompanyId", "status");

-- CreateIndex
CREATE INDEX "OptimizedRoute_truckId_status_idx" ON "OptimizedRoute"("truckId", "status");

-- CreateIndex
CREATE INDEX "OptimizedRoute_estimatedStartTime_idx" ON "OptimizedRoute"("estimatedStartTime");

-- CreateIndex
CREATE INDEX "OptimizedRoute_createdAt_idx" ON "OptimizedRoute"("createdAt");

-- CreateIndex
CREATE INDEX "AbsorptionOpportunity_route1Id_status_idx" ON "AbsorptionOpportunity"("route1Id", "status");

-- CreateIndex
CREATE INDEX "AbsorptionOpportunity_route2Id_status_idx" ON "AbsorptionOpportunity"("route2Id", "status");

-- CreateIndex
CREATE INDEX "AbsorptionOpportunity_nearestHubId_idx" ON "AbsorptionOpportunity"("nearestHubId");

-- CreateIndex
CREATE INDEX "AbsorptionOpportunity_status_expiresAt_idx" ON "AbsorptionOpportunity"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AbsorptionOpportunity_overlapStartTime_idx" ON "AbsorptionOpportunity"("overlapStartTime");

-- CreateIndex
CREATE UNIQUE INDEX "AbsorptionTransfer_absorptionOpportunityId_key" ON "AbsorptionTransfer"("absorptionOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsorptionTransfer_exportedDeliveryId_key" ON "AbsorptionTransfer"("exportedDeliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsorptionTransfer_importedDeliveryId_key" ON "AbsorptionTransfer"("importedDeliveryId");

-- CreateIndex
CREATE INDEX "AbsorptionTransfer_exporterDriverId_idx" ON "AbsorptionTransfer"("exporterDriverId");

-- CreateIndex
CREATE INDEX "AbsorptionTransfer_importerDriverId_idx" ON "AbsorptionTransfer"("importerDriverId");

-- CreateIndex
CREATE INDEX "AbsorptionTransfer_hubId_idx" ON "AbsorptionTransfer"("hubId");

-- CreateIndex
CREATE INDEX "AbsorptionTransfer_status_idx" ON "AbsorptionTransfer"("status");

-- CreateIndex
CREATE INDEX "BackhaulPickup_truckId_status_idx" ON "BackhaulPickup"("truckId", "status");

-- CreateIndex
CREATE INDEX "BackhaulPickup_driverId_idx" ON "BackhaulPickup"("driverId");

-- CreateIndex
CREATE INDEX "BackhaulPickup_destinationHubId_idx" ON "BackhaulPickup"("destinationHubId");

-- CreateIndex
CREATE INDEX "CarbonMetric_date_idx" ON "CarbonMetric"("date");

-- CreateIndex
CREATE INDEX "CarbonMetric_courierCompanyId_idx" ON "CarbonMetric"("courierCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "CarbonMetric_courierCompanyId_date_key" ON "CarbonMetric"("courierCompanyId", "date");

-- CreateIndex
CREATE INDEX "RouteCache_expiresAt_idx" ON "RouteCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteCache_originLat_originLng_destLat_destLng_key" ON "RouteCache"("originLat", "originLng", "destLat", "destLng");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_packageId_key" ON "Delivery"("packageId");

-- CreateIndex
CREATE INDEX "Delivery_postalCode_status_idx" ON "Delivery"("postalCode", "status");

-- CreateIndex
CREATE INDEX "Delivery_courierCompanyId_idx" ON "Delivery"("courierCompanyId");

-- CreateIndex
CREATE INDEX "Delivery_optimizedRouteId_idx" ON "Delivery"("optimizedRouteId");

-- CreateIndex
CREATE INDEX "Delivery_packageId_idx" ON "Delivery"("packageId");

-- CreateIndex
CREATE INDEX "Delivery_dispatcherId_idx" ON "Delivery"("dispatcherId");

-- CreateIndex
CREATE INDEX "Delivery_driverId_idx" ON "Delivery"("driverId");

-- CreateIndex
CREATE INDEX "Delivery_timeWindowStart_timeWindowEnd_idx" ON "Delivery"("timeWindowStart", "timeWindowEnd");

-- CreateIndex
CREATE INDEX "Truck_ownerId_isAvailable_idx" ON "Truck"("ownerId", "isAvailable");

-- CreateIndex
CREATE INDEX "Truck_courierCompanyId_registrationStatus_idx" ON "Truck"("courierCompanyId", "registrationStatus");

-- CreateIndex
CREATE INDEX "Truck_currentLat_currentLng_idx" ON "Truck"("currentLat", "currentLng");

-- CreateIndex
CREATE INDEX "Truck_sourceHubId_idx" ON "Truck"("sourceHubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_qrCode_key" ON "User"("qrCode");

-- CreateIndex
CREATE INDEX "User_courierCompanyId_registrationStatus_idx" ON "User"("courierCompanyId", "registrationStatus");

-- CreateIndex
CREATE INDEX "User_qrCode_idx" ON "User"("qrCode");

-- CreateIndex
CREATE INDEX "VirtualHub_latitude_longitude_idx" ON "VirtualHub"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_sourceHubId_fkey" FOREIGN KEY ("sourceHubId") REFERENCES "VirtualHub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GPSLog" ADD CONSTRAINT "GPSLog_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_optimizedRouteId_fkey" FOREIGN KEY ("optimizedRouteId") REFERENCES "OptimizedRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedRoute" ADD CONSTRAINT "OptimizedRoute_courierCompanyId_fkey" FOREIGN KEY ("courierCompanyId") REFERENCES "CourierCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedRoute" ADD CONSTRAINT "OptimizedRoute_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizedRoute" ADD CONSTRAINT "OptimizedRoute_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionOpportunity" ADD CONSTRAINT "AbsorptionOpportunity_route1Id_fkey" FOREIGN KEY ("route1Id") REFERENCES "OptimizedRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionOpportunity" ADD CONSTRAINT "AbsorptionOpportunity_route2Id_fkey" FOREIGN KEY ("route2Id") REFERENCES "OptimizedRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionOpportunity" ADD CONSTRAINT "AbsorptionOpportunity_nearestHubId_fkey" FOREIGN KEY ("nearestHubId") REFERENCES "VirtualHub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionTransfer" ADD CONSTRAINT "AbsorptionTransfer_absorptionOpportunityId_fkey" FOREIGN KEY ("absorptionOpportunityId") REFERENCES "AbsorptionOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionTransfer" ADD CONSTRAINT "AbsorptionTransfer_exporterDriverId_fkey" FOREIGN KEY ("exporterDriverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionTransfer" ADD CONSTRAINT "AbsorptionTransfer_importerDriverId_fkey" FOREIGN KEY ("importerDriverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionTransfer" ADD CONSTRAINT "AbsorptionTransfer_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "VirtualHub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionTransfer" ADD CONSTRAINT "AbsorptionTransfer_exportedDeliveryId_fkey" FOREIGN KEY ("exportedDeliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsorptionTransfer" ADD CONSTRAINT "AbsorptionTransfer_importedDeliveryId_fkey" FOREIGN KEY ("importedDeliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackhaulPickup" ADD CONSTRAINT "BackhaulPickup_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackhaulPickup" ADD CONSTRAINT "BackhaulPickup_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackhaulPickup" ADD CONSTRAINT "BackhaulPickup_destinationHubId_fkey" FOREIGN KEY ("destinationHubId") REFERENCES "VirtualHub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
