const prisma = require('../config/database');
const Joi = require('joi');

/**
 * GET /api/deliveries/assigned - Driver's active/pending deliveries
 */
const getAssignedDeliveries = async (req, res) => {
    try {
        const deliveries = await prisma.delivery.findMany({
            where: {
                driverId: req.user.id,
                status: {
                    not: 'COMPLETED',
                },
            },
            include: {
                shipment: true,
                truck: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            data: deliveries,
        });
    } catch (error) {
        console.error('Get assigned deliveries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assigned deliveries',
        });
    }
};

/**
 * POST /api/deliveries/:id/accept - Driver accepts delivery
 */
const acceptDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await prisma.delivery.findUnique({
            where: { id },
            include: { shipment: true },
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        if (delivery.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Delivery is already accepted or in progress',
            });
        }

        // Update delivery and shipment status
        const updatedDelivery = await prisma.$transaction([
            prisma.delivery.update({
                where: { id },
                data: { status: 'EN_ROUTE_TO_PICKUP' },
            }),
            prisma.shipment.update({
                where: { id: delivery.shipmentId },
                data: { status: 'DRIVER_ACCEPTED' },
            }),
        ]);

        res.status(200).json({
            success: true,
            message: 'Delivery accepted',
            data: updatedDelivery[0],
        });
    } catch (error) {
        console.error('Accept delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept delivery',
        });
    }
};

/**
 * POST /api/deliveries/:id/reject - Driver rejects delivery
 */
const rejectDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await prisma.delivery.findUnique({
            where: { id },
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        // Rejection usually means unassigning the driver or marking as cancelled
        await prisma.$transaction([
            prisma.delivery.update({
                where: { id },
                data: { status: 'CANCELLED' },
            }),
            prisma.shipment.update({
                where: { id: delivery.shipmentId },
                data: { status: 'DRIVER_REJECTED' },
            }),
        ]);

        res.status(200).json({
            success: true,
            message: 'Delivery rejected',
        });
    } catch (error) {
        console.error('Reject delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject delivery',
        });
    }
};

/**
 * POST /api/deliveries/:id/start - Start navigation to pickup
 */
const startDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await prisma.delivery.findUnique({
            where: { id },
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id },
            data: { status: 'IN_TRANSIT' },
        });

        // Also update shipment status
        await prisma.shipment.update({
            where: { id: delivery.shipmentId },
            data: { status: 'IN_TRANSIT' },
        });

        res.status(200).json({
            success: true,
            message: 'Delivery started',
            data: updatedDelivery,
        });
    } catch (error) {
        console.error('Start delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start delivery',
        });
    }
};

/**
 * POST /api/deliveries/:id/pickup - Cargo loaded
 */
const pickupCargo = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await prisma.delivery.findUnique({
            where: { id },
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        const updatedDelivery = await prisma.delivery.update({
            where: { id },
            data: {
                status: 'CARGO_LOADED',
                pickupTime: new Date(),
            },
        });

        res.status(200).json({
            success: true,
            message: 'Cargo marked as picked up',
            data: updatedDelivery,
        });
    } catch (error) {
        console.error('Pickup cargo error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark cargo as picked up',
        });
    }
};

/**
 * POST /api/deliveries/:id/complete - Delivery complete
 */
const completeDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await prisma.delivery.findUnique({
            where: { id },
            include: { shipment: true },
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        // Update statuses and create transaction
        const [updatedDelivery, updatedShipment, transaction] = await prisma.$transaction([
            prisma.delivery.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    dropTime: new Date(),
                },
            }),
            prisma.shipment.update({
                where: { id: delivery.shipmentId },
                data: { status: 'COMPLETED' },
            }),
            prisma.transaction.create({
                data: {
                    driverId: req.user.id,
                    deliveryId: id,
                    amount: delivery.totalEarnings || 0,
                    type: 'BASE_DELIVERY',
                    description: `Payment for delivery ${id}`,
                    route: `${delivery.pickupLocation} → ${delivery.dropLocation}`,
                },
            }),
            // Update driver's total earnings
            prisma.user.update({
                where: { id: req.user.id },
                data: {
                    totalEarnings: { increment: delivery.totalEarnings || 0 },
                    weeklyEarnings: { increment: delivery.totalEarnings || 0 },
                    deliveriesCount: { increment: 1 },
                    totalDistanceKm: { increment: delivery.distanceKm || 0 },
                },
            }),
        ]);

        res.status(200).json({
            success: true,
            message: 'Delivery completed successfully',
            data: {
                delivery: updatedDelivery,
                transaction,
            },
        });
    } catch (error) {
        console.error('Complete delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete delivery',
        });
    }
};

/**
 * POST /api/deliveries/:id/upload-photos - Upload photos (4 angles)
 */
const uploadPhotos = async (req, res) => {
    try {
        const { id } = req.params;
        const { photos } = req.body; // Expecting array of URLs

        if (!photos || !Array.isArray(photos)) {
            return res.status(400).json({
                success: false,
                message: 'Photos are required as an array of URLs',
            });
        }

        const delivery = await prisma.delivery.findUnique({
            where: { id },
        });

        if (!delivery || delivery.driverId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Delivery not found',
            });
        }

        // In a real app, we'd handle file uploads here. 
        // For now, we update the relay node or delivery record if applicable.
        // Assuming delivery has a way to store photos or it's linked to a relay node.

        res.status(200).json({
            success: true,
            message: 'Photos uploaded successfully (simulated)',
            count: photos.length,
        });
    } catch (error) {
        console.error('Upload photos error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload photos',
        });
    }
};

/**
 * POST /api/deliveries/create - Create new delivery from package form
 */
const createDelivery = async (req, res) => {
    try {
        const {
            pickupLocation,
            pickupLat,
            pickupLng,
            pickupTime,
            deliveryLocation,
            deliveryLat,
            deliveryLng,
            deliveryTime,
            cargoType,
            cargoWeight,
            cargoVolume,
            cargoValue,
            specialInstructions
        } = req.body;

        // Validate required fields
        if (!pickupLocation || !deliveryLocation || !cargoType || !cargoWeight) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Generate unique package ID
        const packageId = `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create delivery record
        const delivery = await prisma.delivery.create({
            data: {
                packageId,
                pickupLocation,
                pickupLat: pickupLat ? parseFloat(pickupLat) : null,
                pickupLng: pickupLng ? parseFloat(pickupLng) : null,
                pickupTime: pickupTime ? new Date(pickupTime) : null,
                dropLocation: deliveryLocation,
                dropLat: deliveryLat ? parseFloat(deliveryLat) : null,
                dropLng: deliveryLng ? parseFloat(deliveryLng) : null,
                dropTime: deliveryTime ? new Date(deliveryTime) : null,
                cargoType,
                cargoWeight: parseFloat(cargoWeight),
                cargoVolume: cargoVolume ? parseFloat(cargoVolume) : null,
                cargoValue: cargoValue ? parseFloat(cargoValue) : null,
                specialInstructions,
                specialInstructions,
                status: 'PENDING',
                dispatcherId: req.user ? req.user.id : (process.env.DEFAULT_DISPATCHER_ID || 'system-admin')
            }
        });

        res.status(201).json({
            success: true,
            message: 'Delivery created successfully',
            data: delivery
        });
    } catch (error) {
        console.error('Create delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create delivery',
            error: error.message
        });
    }
};

module.exports = {
    getAssignedDeliveries,
    acceptDelivery,
    rejectDelivery,
    startDelivery,
    pickupCargo,
    completeDelivery,
    uploadPhotos,
    createDelivery,
};
