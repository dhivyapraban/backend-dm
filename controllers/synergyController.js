const prisma = require('../config/database');

/**
 * Phase 1: Continuous Proximity & Detection (moved to services/synergyMonitor.js)
 */

/**
 * Phase 2: Dispatcher Orchestration - Accept Synergy
 * Dispatcher approves the opportunity and initiates handshake
 */
async function dispatcherAcceptSynergy(req, res) {
    try {
        const { opportunityId, dispatcherId } = req.body;
        const io = req.app.get('io');

        // Validate opportunity
        const opportunity = await prisma.absorptionOpportunity.findUnique({
            where: { id: opportunityId },
            include: {
                route1: {
                    include: {
                        truck: { include: { owner: true } },
                        deliveries: true
                    }
                },
                route2: {
                    include: {
                        truck: { include: { owner: true } },
                        deliveries: true
                    }
                },
                nearestHub: true
            }
        });

        if (!opportunity) {
            return res.status(404).json({
                success: false,
                message: 'Opportunity not found'
            });
        }

        if (opportunity.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Opportunity already processed'
            });
        }

        // Update opportunity status
        await prisma.absorptionOpportunity.update({
            where: { id: opportunityId },
            data: {
                status: 'BOTH_ACCEPTED',
                acceptedByRoute1At: new Date(),
                acceptedByRoute2At: new Date()
            }
        });

        // Create AbsorptionTransfer record
        const transfer = await prisma.absorptionTransfer.create({
            data: {
                absorptionOpportunityId: opportunityId,
                exporterDriverId: opportunity.route2.truck.owner.id, // Truck B exports
                importerDriverId: opportunity.route1.truck.owner.id, // Truck A imports
                hubId: opportunity.nearestHubId,
                deliveryIdsToTransfer: opportunity.eligibleDeliveryIds,
                spaceAvailableExporter: opportunity.truck2SpaceAvailable,
                spaceAvailableImporter: opportunity.truck1SpaceAvailable,
                distanceSavedKm: opportunity.totalDistanceSaved,
                carbonSavedKg: opportunity.potentialCarbonSaved,
                status: 'PENDING'
            }
        });

        // Emit HANDSHAKE_REQUIRED to both drivers
        const handshakeData = {
            transferId: transfer.id,
            hubLat: opportunity.nearestHub.latitude,
            hubLng: opportunity.nearestHub.longitude,
            hubName: opportunity.nearestHub.name,
            hubAddress: opportunity.nearestHub.address
        };

        // Emit to Truck A driver (Importer)
        io.to(`driver_${opportunity.route1.truck.owner.id}`).emit('HANDSHAKE_REQUIRED', {
            ...handshakeData,
            role: 'IMPORTER',
            counterpartTruck: opportunity.route2.truck.licensePlate,
            counterpartDriver: opportunity.route2.truck.owner.name
        });

        // Emit to Truck B driver (Exporter)
        io.to(`driver_${opportunity.route2.truck.owner.id}`).emit('HANDSHAKE_REQUIRED', {
            ...handshakeData,
            role: 'EXPORTER',
            counterpartTruck: opportunity.route1.truck.licensePlate,
            counterpartDriver: opportunity.route1.truck.owner.name
        });

        res.status(200).json({
            success: true,
            message: 'Synergy accepted, drivers notified',
            data: {
                transferId: transfer.id,
                hubCoordinates: {
                    lat: opportunity.nearestHub.latitude,
                    lng: opportunity.nearestHub.longitude
                }
            }
        });
    } catch (error) {
        console.error('Dispatcher accept error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to accept synergy'
        });
    }
}

/**
 * Phase 3: Generate QR Code (Exporter - Truck B)
 */
async function generateQRCode(req, res) {
    try {
        const { transferId, truckId } = req.body;
        const userId = req.user.id;

        // Validate transfer
        const transfer = await prisma.absorptionTransfer.findUnique({
            where: { id: transferId },
            include: {
                exporterDriver: true,
                absorptionOpportunity: {
                    include: {
                        route2: {
                            include: {
                                deliveries: {
                                    select: {
                                        id: true,
                                        packageId: true,
                                        cargoType: true,
                                        cargoWeight: true,
                                        cargoVolumeLtrs: true,
                                        pickupLocation: true,
                                        dropLocation: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found'
            });
        }

        // Verify user is the exporter
        if (transfer.exporterDriverId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only exporter can generate QR code'
            });
        }

        // Get deliveries to transfer
        const deliveryIds = transfer.deliveryIdsToTransfer.split(',');
        const deliveries = transfer.absorptionOpportunity.route2.deliveries.filter(
            d => deliveryIds.includes(d.id)
        );

        // Calculate totals
        const totalWeight = deliveries.reduce((sum, d) => sum + d.cargoWeight, 0);
        const totalVolume = deliveries.reduce((sum, d) => sum + d.cargoVolumeLtrs, 0);

        // Generate QR payload
        const qrPayload = {
            transferId: transfer.id,
            deliveryIds: deliveries.map(d => d.id),
            totalWeight,
            totalVolume,
            packageDetails: deliveries.map(d => ({
                packageId: d.packageId,
                cargoType: d.cargoType,
                weight: d.cargoWeight,
                volume: d.cargoVolumeLtrs,
                from: d.pickupLocation,
                to: d.dropLocation
            })),
            timestamp: new Date().toISOString()
        };

        const qrData = JSON.stringify(qrPayload);

        // Store QR data in transfer
        await prisma.absorptionTransfer.update({
            where: { id: transferId },
            data: { qrCodeData: qrData }
        });

        res.status(200).json({
            success: true,
            message: 'QR code generated',
            data: { qrData }
        });
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate QR code'
        });
    }
}

/**
 * Phase 3: Verify QR Code (Importer - Truck A)
 */
async function verifyQR(req, res) {
    try {
        const { transferId, qrData, currentLat, currentLng } = req.body;
        const userId = req.user.id;
        const io = req.app.get('io');

        // Validate transfer
        const transfer = await prisma.absorptionTransfer.findUnique({
            where: { id: transferId },
            include: {
                importerDriver: true,
                hub: true
            }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found'
            });
        }

        // Verify user is the importer
        if (transfer.importerDriverId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only importer can verify QR code'
            });
        }

        // Parse and validate QR data
        let scannedData;
        try {
            scannedData = JSON.parse(qrData);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'Invalid QR code format'
            });
        }

        // Verify transfer ID matches
        if (scannedData.transferId !== transferId) {
            return res.status(400).json({
                success: false,
                message: 'QR code does not match this transfer'
            });
        }

        // Verify delivery IDs match
        const expectedIds = transfer.deliveryIdsToTransfer.split(',').sort();
        const scannedIds = scannedData.deliveryIds.sort();

        if (JSON.stringify(expectedIds) !== JSON.stringify(scannedIds)) {
            return res.status(400).json({
                success: false,
                message: 'Delivery IDs mismatch'
            });
        }

        // Generate checklist data
        const checklistData = scannedData.packageDetails.map(pkg => ({
            packageId: pkg.packageId,
            cargoType: pkg.cargoType,
            weight: pkg.weight,
            volume: pkg.volume,
            from: pkg.from,
            to: pkg.to,
            verified: false
        }));

        // Update transfer status
        await prisma.absorptionTransfer.update({
            where: { id: transferId },
            data: {
                status: 'QR_SCANNED',
                qrCodeScanned: true,
                scannedAt: new Date(),
                checklistData: checklistData
            }
        });

        // Emit QR_SCANNED event to dispatcher
        io.emit('QR_SCANNED', {
            transferId,
            location: { lat: currentLat, lng: currentLng },
            timestamp: new Date().toISOString(),
            importerDriver: transfer.importerDriver.name
        });

        res.status(200).json({
            success: true,
            message: 'QR code verified successfully',
            data: { checklistData }
        });
    } catch (error) {
        console.error('QR verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify QR code'
        });
    }
}

/**
 * Phase 4: Complete Handover
 */
async function completeHandover(req, res) {
    try {
        const { transferId, photos, checklistData } = req.body;
        const userId = req.user.id;
        const io = req.app.get('io');

        // Validate transfer
        const transfer = await prisma.absorptionTransfer.findUnique({
            where: { id: transferId },
            include: {
                importerDriver: true,
                exporterDriver: true,
                absorptionOpportunity: {
                    include: {
                        route1: { include: { truck: true } },
                        route2: { include: { truck: true } }
                    }
                }
            }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: 'Transfer not found'
            });
        }

        // Verify user is the importer
        if (transfer.importerDriverId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only importer can complete handover'
            });
        }

        // Verify QR was scanned
        if (transfer.status !== 'QR_SCANNED' && transfer.status !== 'CHECKLIST_VERIFIED') {
            return res.status(400).json({
                success: false,
                message: 'QR code must be scanned first'
            });
        }

        const deliveryIds = transfer.deliveryIdsToTransfer.split(',');
        const truckA = transfer.absorptionOpportunity.route1.truck;
        const truckB = transfer.absorptionOpportunity.route2.truck;

        // Execute handover in transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update photos
            await tx.absorptionTransfer.update({
                where: { id: transferId },
                data: {
                    photos: photos || [],
                    checklistData: checklistData,
                    status: 'COMPLETED',
                    completedAt: new Date()
                }
            });

            // 2. Get deliveries to calculate weight/volume
            const deliveries = await tx.delivery.findMany({
                where: { id: { in: deliveryIds } }
            });

            const totalWeight = deliveries.reduce((sum, d) => sum + d.cargoWeight, 0);
            const totalVolume = deliveries.reduce((sum, d) => sum + d.cargoVolumeLtrs, 0);

            // 3. Update E-Way Bills
            await tx.eWayBill.updateMany({
                where: {
                    driverId: transfer.exporterDriverId,
                    status: 'ACTIVE'
                },
                data: {
                    vehicleNo: truckA.licensePlate,
                    driverId: transfer.importerDriverId,
                    status: 'TRANSFERRED'
                }
            });

            // 4. Reassign deliveries from Truck B to Truck A
            await tx.delivery.updateMany({
                where: { id: { in: deliveryIds } },
                data: {
                    truckId: truckA.id,
                    driverId: transfer.importerDriverId,
                    status: 'ABSORPTION_TRANSFERRED'
                }
            });

            // 5. Update Truck A (add weight/volume)
            await tx.truck.update({
                where: { id: truckA.id },
                data: {
                    currentWeight: { increment: totalWeight },
                    currentVolume: { increment: totalVolume }
                }
            });

            // 6. Update Truck B (reduce weight/volume)
            await tx.truck.update({
                where: { id: truckB.id },
                data: {
                    currentWeight: { decrement: totalWeight },
                    currentVolume: { decrement: totalVolume }
                }
            });

            // 7. Update opportunity status
            await tx.absorptionOpportunity.update({
                where: { id: transfer.absorptionOpportunityId },
                data: { status: 'COMPLETED' }
            });
        });

        // Emit TRANSFER_COMPLETED event
        io.emit('TRANSFER_COMPLETED', {
            transferId,
            deliveryIds,
            newTruckId: truckA.id,
            newTruckPlate: truckA.licensePlate,
            importerDriver: transfer.importerDriver.name,
            exporterDriver: transfer.exporterDriver.name,
            timestamp: new Date().toISOString()
        });

        // Notify both drivers
        io.to(`driver_${transfer.importerDriverId}`).emit('TRANSFER_COMPLETED', {
            message: 'Handover completed successfully',
            role: 'IMPORTER'
        });

        io.to(`driver_${transfer.exporterDriverId}`).emit('TRANSFER_COMPLETED', {
            message: 'Handover completed successfully',
            role: 'EXPORTER'
        });

        res.status(200).json({
            success: true,
            message: 'Handover completed successfully',
            data: {
                updatedDeliveries: deliveryIds.length,
                updatedEWayBills: await prisma.eWayBill.count({
                    where: {
                        driverId: transfer.importerDriverId,
                        status: 'TRANSFERRED'
                    }
                })
            }
        });
    } catch (error) {
        console.error('Handover completion error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to complete handover'
        });
    }
}

/**
 * Legacy functions (kept for backward compatibility)
 */
async function searchSynergy(req, res) {
    try {
        const { truckId } = req.body;
        const truck = await prisma.truck.findUnique({ where: { id: truckId } });

        if (!truck) {
            return res.status(404).json({ message: 'Truck not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Manual search deprecated. Use continuous monitoring service.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function acceptSynergy(req, res) {
    try {
        const { opportunityId, routeId } = req.body;

        const opportunity = await prisma.absorptionOpportunity.findUnique({
            where: { id: opportunityId }
        });

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        let updateData = {};
        if (opportunity.route1Id === routeId) {
            updateData.status = opportunity.status === 'ACCEPTED_BY_ROUTE2' ? 'BOTH_ACCEPTED' : 'ACCEPTED_BY_ROUTE1';
            updateData.acceptedByRoute1At = new Date();
        } else if (opportunity.route2Id === routeId) {
            updateData.status = opportunity.status === 'ACCEPTED_BY_ROUTE1' ? 'BOTH_ACCEPTED' : 'ACCEPTED_BY_ROUTE2';
            updateData.acceptedByRoute2At = new Date();
        } else {
            return res.status(400).json({ message: 'Route ID does not match this opportunity' });
        }

        const updated = await prisma.absorptionOpportunity.update({
            where: { id: opportunityId },
            data: updateData
        });

        res.status(200).json({
            success: true,
            opportunity: updated
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function handleHandshake(req, res) {
    try {
        res.status(200).json({
            success: true,
            message: 'Use new QR-based handshake flow'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    // New Phase 2-4 functions
    dispatcherAcceptSynergy,
    generateQRCode,
    verifyQR,
    completeHandover,

    // Legacy functions
    searchSynergy,
    acceptSynergy,
    handleHandshake
};
