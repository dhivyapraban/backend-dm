-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DRIVER', 'DISPATCHER', 'EXTERNAL_SHIPPER');

-- CreateEnum
CREATE TYPE "HandshakeStatus" AS ENUM ('WAITING_FOR_PEERS', 'PROXIMITY_LOCKED', 'AUTHORIZED', 'COMPLETED', 'DISPUTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DRIVER',
    "totalDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalHoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "homeBaseCity" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualHub" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VirtualHub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelayNode" (
    "id" TEXT NOT NULL,
    "hubId" TEXT NOT NULL,
    "truckAId" TEXT NOT NULL,
    "truckBId" TEXT NOT NULL,
    "segmentDistanceKm" DOUBLE PRECISION NOT NULL,
    "segmentTimeHrs" DOUBLE PRECISION NOT NULL,
    "handshakeStatus" "HandshakeStatus" NOT NULL DEFAULT 'WAITING_FOR_PEERS',
    "otpCode" TEXT NOT NULL,
    "gpsVerified" BOOLEAN NOT NULL DEFAULT false,
    "cargoImageUrls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelayNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "isMarketplaceLoad" BOOLEAN NOT NULL DEFAULT false,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_licensePlate_key" ON "Truck"("licensePlate");

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelayNode" ADD CONSTRAINT "RelayNode_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "VirtualHub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelayNode" ADD CONSTRAINT "RelayNode_truckAId_fkey" FOREIGN KEY ("truckAId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelayNode" ADD CONSTRAINT "RelayNode_truckBId_fkey" FOREIGN KEY ("truckBId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
