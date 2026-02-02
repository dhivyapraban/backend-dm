const prisma = require('../config/database');

/**
 * Helper to calculate haversine distance (simplistic)
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * POST /api/routes/create-and-assign
 * Create and assign optimized route with driver relay logic
 */
exports.createAndAssignRoute = async (req, res) => {
    try {
        const {
            courierCompanyId,
            truckId,
            driverId,
            deliveryIds,
            totalDistance,
            totalDuration,
            estimatedStartTime,
            estimatedEndTime,
            baselineDistance,
            carbonSaved,
            emptyMilesSaved
        } = req.body;

        // Validate required fields
        if (!courierCompanyId || !truckId || !driverId || !deliveryIds || !totalDistance) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: courierCompanyId, truckId, driverId, deliveryIds, totalDistance'
            });
        }

        if (!Array.isArray(deliveryIds) || deliveryIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'deliveryIds must be a non-empty array'
            });
        }

        // 1. COMPANY-LEVEL ISOLATION: Validate all entities belong to same company
        const [driver, truck] = await Promise.all([
            prisma.user.findUnique({
                where: { id: driverId },
                select: {
                    id: true,
                    courierCompanyId: true,
                    totalDistanceKm: true,
                    role: true
                }
            }),
            prisma.truck.findUnique({
                where: { id: truckId },
                select: {
                    id: true,
                    courierCompanyId: true,
                    maxWeight: true,
                    maxVolume: true,
                    currentWeight: true,
                    currentVolume: true,
                    isAvailable: true
                }
            })
        ]);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        if (!truck) {
            return res.status(404).json({
                success: false,
                message: 'Truck not found'
            });
        }

        if (driver.role !== 'DRIVER') {
            return res.status(400).json({
                success: false,
                message: 'Specified user is not a driver'
            });
        }

        // Company isolation check
        if (driver.courierCompanyId !== courierCompanyId || truck.courierCompanyId !== courierCompanyId) {
            return res.status(403).json({
                success: false,
                message: 'Driver and/or Truck does not belong to the specified courier company'
            });
        }

        if (!truck.isAvailable) {
            return res.status(400).json({
                success: false,
                message: 'Truck is not available for assignment'
            });
        }

        // 2. DRIVER RELAY LOGIC: Distance-based assignment validation
        const isLongDistance = totalDistance > 300;
        const driverHistoricalDistance = driver.totalDistanceKm || 0;
        const HIGH_WORKLOAD_THRESHOLD = 500; // km

        if (isLongDistance && driverHistoricalDistance < HIGH_WORKLOAD_THRESHOLD) {
            return res.status(400).json({
                success: false,
                message: `Long-distance route (${totalDistance}km) requires experienced driver with high historical distance (>${HIGH_WORKLOAD_THRESHOLD}km). Driver has only ${driverHistoricalDistance}km.`
            });
        }

        if (!isLongDistance && driverHistoricalDistance >= HIGH_WORKLOAD_THRESHOLD) {
            return res.status(400).json({
                success: false,
                message: `Short-distance route (${totalDistance}km) should be assigned to driver with lower workload. Driver has ${driverHistoricalDistance}km historical distance.`
            });
        }

        // 3. Fetch and validate deliveries
        const deliveries = await prisma.delivery.findMany({
            where: {
                id: { in: deliveryIds },
                courierCompanyId
            },
            orderBy: { pickupTime: 'asc' }
        });

        if (deliveries.length !== deliveryIds.length) {
            return res.status(404).json({
                success: false,
                message: 'One or more deliveries not found or do not belong to the specified company'
            });
        }

        // Check if any delivery is already allocated
        const allocatedDeliveries = deliveries.filter(d => d.status !== 'PENDING');
        if (allocatedDeliveries.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Deliveries already allocated: ${allocatedDeliveries.map(d => d.packageId).join(', ')}`
            });
        }

        // 4. Calculate total weight and volume
        const totalWeight = deliveries.reduce((sum, d) => sum + (d.cargoWeight || 0), 0);
        const totalVolume = deliveries.reduce((sum, d) => sum + (d.cargoVolumeLtrs || 0), 0);

        // Check truck capacity
        const availableWeight = truck.maxWeight - truck.currentWeight;
        const availableVolume = truck.maxVolume - truck.currentVolume;

        if (totalWeight > availableWeight) {
            return res.status(400).json({
                success: false,
                message: `Truck capacity exceeded. Required: ${totalWeight}kg, Available: ${availableWeight}kg`
            });
        }

        if (totalVolume > availableVolume) {
            return res.status(400).json({
                success: false,
                message: `Truck volume exceeded. Required: ${totalVolume}L, Available: ${availableVolume}L`
            });
        }

        // 5. MULTI-STOP ARCHITECTURE: Generate waypoints
        const waypoints = [];
        deliveries.forEach(delivery => {
            // Add pickup waypoint
            waypoints.push({
                type: 'PICKUP',
                location: delivery.pickupLocation,
                lat: delivery.pickupLat,
                lng: delivery.pickupLng,
                deliveryId: delivery.id,
                packageId: delivery.packageId
            });

            // Add drop waypoint
            waypoints.push({
                type: 'DROP',
                location: delivery.dropLocation,
                lat: delivery.dropLat,
                lng: delivery.dropLng,
                deliveryId: delivery.id,
                packageId: delivery.packageId
            });
        });

        // 6. DATABASE INTEGRITY: Use transaction for atomic operations
        const result = await prisma.$transaction(async (tx) => {
            // Create optimized route
            const route = await tx.optimizedRoute.create({
                data: {
                    courierCompanyId,
                    truckId,
                    driverId,
                    totalDistance,
                    totalDuration: totalDuration || 0,
                    estimatedStartTime: estimatedStartTime ? new Date(estimatedStartTime) : new Date(),
                    estimatedEndTime: estimatedEndTime ? new Date(estimatedEndTime) : new Date(Date.now() + (totalDuration || 60) * 60000),
                    totalPackages: deliveries.length,
                    totalWeight,
                    totalVolume,
                    utilizationPercent: truck.maxWeight ? ((totalWeight / truck.maxWeight) * 100) : 0,
                    baselineDistance: baselineDistance || totalDistance,
                    carbonSaved: carbonSaved || 0,
                    emptyMilesSaved: emptyMilesSaved || 0,
                    waypoints: waypoints,
                    isTSPOptimized: true,
                    status: 'ALLOCATED'
                },
                include: {
                    _count: {
                        select: { deliveries: true }
                    }
                }
            });

            // Update all deliveries
            await tx.delivery.updateMany({
                where: { id: { in: deliveryIds } },
                data: {
                    optimizedRouteId: route.id,
                    truckId,
                    driverId,
                    status: 'ALLOCATED'
                }
            });

            // Update truck capacity and availability
            await tx.truck.update({
                where: { id: truckId },
                data: {
                    currentWeight: { increment: totalWeight },
                    currentVolume: { increment: totalVolume },
                    isAvailable: false
                }
            });

            // Update driver's total distance (for future relay logic)
            await tx.user.update({
                where: { id: driverId },
                data: {
                    totalDistanceKm: { increment: totalDistance }
                }
            });

            return route;
        });

        res.status(201).json({
            success: true,
            message: `Route created and assigned successfully with ${deliveries.length} deliveries`,
            data: {
                route: result
            }
        });

    } catch (error) {
        console.error('Create and assign route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create and assign route',
            error: error.message
        });
    }
};

/**
 * POST /api/routes/allocate
 * Triggers TSP/Greedy allocation for pending deliveries
 */
exports.allocateRoutes = async (req, res) => {
    try {
        const { courierCompanyId } = req.body;

        if (!courierCompanyId) {
            return res.status(400).json({ success: false, message: 'courierCompanyId is required' });
        }

        // 1. Fetch pending deliveries for this company
        const pendingDeliveries = await prisma.delivery.findMany({
            where: {
                courierCompanyId,
                status: 'PENDING'
            },
            orderBy: { timeWindowStart: 'asc' }
        });

        if (pendingDeliveries.length === 0) {
            return res.status(200).json({ success: true, message: 'No pending deliveries to allocate' });
        }

        // 2. Fetch available trucks for this company
        const availableTrucks = await prisma.truck.findMany({
            where: {
                courierCompanyId,
                isAvailable: true,
                registrationStatus: 'APPROVED'
            },
            include: { owner: true }
        });

        if (availableTrucks.length === 0) {
            return res.status(400).json({ success: false, message: 'No available trucks for allocation' });
        }

        // 3. Greedy Allocation Logic
        // For simplicity, we loop through trucks and fill them up with deliveries
        const allocations = [];
        let deliveryIndex = 0;

        for (const truck of availableTrucks) {
            if (deliveryIndex >= pendingDeliveries.length) break;

            let currentWeight = 0;
            let currentVolume = 0;
            const routeDeliveries = [];

            while (deliveryIndex < pendingDeliveries.length) {
                const delivery = pendingDeliveries[deliveryIndex];

                // Check capacity
                const fitsWeight = (currentWeight + delivery.cargoWeight) <= (truck.maxWeight || Infinity);
                const fitsVolume = (currentVolume + delivery.cargoVolumeLtrs) <= (truck.maxVolume || Infinity);

                if (fitsWeight && fitsVolume) {
                    routeDeliveries.push(delivery);
                    currentWeight += delivery.cargoWeight;
                    currentVolume += delivery.cargoVolumeLtrs;
                    deliveryIndex++;
                } else {
                    // Truck full
                    break;
                }
            }

            if (routeDeliveries.length > 0) {
                allocations.push({
                    truck,
                    deliveries: routeDeliveries,
                    totalWeight: currentWeight,
                    totalVolume: currentVolume
                });
            }
        }

        // 4. Create OptimizedRoute records and update deliveries
        const results = await prisma.$transaction(async (tx) => {
            const createdRoutes = [];

            for (const alloc of allocations) {
                const { truck, deliveries, totalWeight, totalVolume } = alloc;

                // Create Route
                const route = await tx.optimizedRoute.create({
                    data: {
                        courierCompanyId,
                        truckId: truck.id,
                        driverId: truck.ownerId,
                        totalDistance: 0, // Placeholder
                        totalDuration: 60, // Placeholder
                        estimatedStartTime: new Date(),
                        estimatedEndTime: new Date(Date.now() + 3600000),
                        totalPackages: deliveries.length,
                        totalWeight,
                        totalVolume,
                        utilizationPercent: truck.maxWeight ? (totalWeight / truck.maxWeight) * 100 : 0,
                        baselineDistance: 0,
                        carbonSaved: 0,
                        emptyMilesSaved: 0,
                        status: 'ALLOCATED'
                    }
                });

                // Update Deliveries
                await tx.delivery.updateMany({
                    where: { id: { in: deliveries.map(d => d.id) } },
                    data: {
                        truckId: truck.id,
                        driverId: truck.ownerId,
                        optimizedRouteId: route.id,
                        status: 'ALLOCATED'
                    }
                });

                // Update Truck availability
                await tx.truck.update({
                    where: { id: truck.id },
                    data: { isAvailable: false }
                });

                createdRoutes.push(route);
            }
            return createdRoutes;
        });

        res.status(201).json({
            success: true,
            message: `Allocated ${allocations.length} routes for ${pendingDeliveries.length} packages`,
            data: results
        });

    } catch (err) {
        console.error('Allocation Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error during allocation', error: err.message });
    }
};
