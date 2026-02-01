const prisma = require('../config/database');

/**
 * Task 1: Synergy Matching API
 * POST /api/synergy/search
 */
const searchSynergy = async (req, res) => {
    try {
        const { truckId } = req.body;
        const io = req.app.get('io');

        if (!truckId) {
            return res.status(400).json({ success: false, message: 'truckId is required' });
        }

        // 1. Get Truck A (searching vehicle)
        const truckA = await prisma.truck.findUnique({
            where: { id: truckId },
            include: {
                deliveries: {
                    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                    include: { shipment: true }
                }
            }
        });

        if (!truckA) {
            return res.status(404).json({ success: false, message: 'Truck A not found' });
        }

        const activeDeliveryA = truckA.deliveries[0];
        const currentLoadA = activeDeliveryA ? activeDeliveryA.cargoWeight : 0;
        const cargoTypeA = activeDeliveryA?.shipment?.cargoType || '';

        // 2. Proximity: Haversine Raw Query for candidates within 10km
        const truckBLat = truckA.currentLat || 0;
        const truckBLng = truckA.currentLng || 0;

        // Haversine query provided by user
        const nearbyTrucks = await prisma.$queryRaw`
            SELECT id, "currentLat", "currentLng", "capacity", "ownerId", ( 6371 * acos( cos( radians(${truckBLat}) ) * cos( radians( "currentLat" ) ) 
            * cos( radians( "currentLng" ) - radians(${truckBLng}) ) + sin( radians(${truckBLat}) ) 
            * sin( radians( "currentLat" ) ) ) ) AS distance 
            FROM "Truck" 
            WHERE id != ${truckId}
            AND (6371 * acos( cos( radians(${truckBLat}) ) * cos( radians( "currentLat" ) ) 
            * cos( radians( "currentLng" ) - radians(${truckBLng}) ) + sin( radians(${truckBLat}) ) 
            * sin( radians( "currentLat" ) ) )) < 10
            ORDER BY distance;
        `;

        // 3. Compatibility Filtering
        const results = [];
        for (const candidate of nearbyTrucks) {
            // Get active delivery for Truck B
            const truckB = await prisma.truck.findUnique({
                where: { id: candidate.id },
                include: {
                    deliveries: {
                        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                        include: { shipment: true }
                    },
                    owner: true
                }
            });

            const activeDeliveryB = truckB.deliveries[0];
            if (!activeDeliveryB) continue; // Must have an active mission

            const cargoTypeB = activeDeliveryB.shipment.cargoType || '';

            // Rule 1: Capacity
            const residualCapacityA = (truckA.capacity || 0) - currentLoadA;
            const capacityMet = residualCapacityA >= (activeDeliveryB.cargoWeight || 0);
            if (!capacityMet) continue;

            // Rule 2: Material (No Food/Pharma + Chemicals)
            const isChemicalA = cargoTypeA.toLowerCase().includes('chemical');
            const isFoodPharmaA = cargoTypeA.toLowerCase().includes('food') || cargoTypeA.toLowerCase().includes('pharma');
            const isChemicalB = cargoTypeB.toLowerCase().includes('chemical');
            const isFoodPharmaB = cargoTypeB.toLowerCase().includes('food') || cargoTypeB.toLowerCase().includes('pharma');

            const safetyViolation = (isChemicalA && isFoodPharmaB) || (isFoodPharmaA && isChemicalB);
            if (safetyViolation) continue;

            // Rule 3: Path (Same homeBaseCity or dropLocation)
            const pathMet =
                (truckA.owner?.homeBaseCity === truckB.owner?.homeBaseCity) ||
                (activeDeliveryA?.dropLocation === activeDeliveryB.dropLocation);

            // Note: Users specified "Only return trucks that share similar destination_id or next_checkpoint_id" in previous prompt,
            // and "Same homeBaseCity or dropLocation" in this prompt. I'll prioritize the current prompt.

            results.push({
                truckId: truckB.id,
                plate: truckB.licensePlate,
                distance: parseFloat(candidate.distance).toFixed(2),
                cargoType: cargoTypeB,
                cargoWeight: activeDeliveryB.cargoWeight,
                dropLocation: activeDeliveryB.dropLocation,
                pathMet
            });
        }

        // 4. Notification
        if (results.length > 0) {
            io.emit('synergy:matches_found', {
                searchingTruckId: truckId,
                matches: results
            });
        }

        res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Synergy Search Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Task 2 & 3: Acceptance & Relay Workflow
 * POST /api/synergy/accept
 */
const acceptSynergy = async (req, res) => {
    try {
        const { truckAId, truckBId, hubId } = req.body;

        if (!truckAId || !truckBId || !hubId) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        // 1. Fetch data
        const [truckA, truckB, hub] = await prisma.$transaction([
            prisma.truck.findUnique({ where: { id: truckAId }, include: { owner: true, deliveries: { where: { status: 'IN_TRANSIT' } } } }),
            prisma.truck.findUnique({ where: { id: truckBId }, include: { owner: true, deliveries: { where: { status: 'IN_TRANSIT' } } } }),
            prisma.virtualHub.findUnique({ where: { id: hubId } })
        ]);

        if (!truckA || !truckB || !hub) {
            return res.status(404).json({ success: false, message: 'Entities not found' });
        }

        const deliveryA = truckA.deliveries[0];
        const deliveryB = truckB.deliveries[0];

        // 2. JIT Sync Calculation (Mock logic for speed recommendation)
        // In a real app, distance to hub would be calculated via map API
        const distAtoHub = calculateDistance(truckA.currentLat, truckA.currentLng, hub.latitude, hub.longitude);
        const distBtoHub = calculateDistance(truckB.currentLat, truckB.currentLng, hub.latitude, hub.longitude);

        const targetArrivalInHrs = 0.5; // Example: both should arrive in 30 mins
        const speedA = distAtoHub / targetArrivalInHrs;
        const speedB = distBtoHub / targetArrivalInHrs;

        // 3. Driver Relay Rule (Workload-based assignment)
        // Assign longest segment to driver with highest workload
        const workloadA = (truckA.owner.totalDistanceKm || 0) + (truckA.owner.totalHoursWorked || 0);
        const workloadB = (truckB.owner.totalDistanceKm || 0) + (truckB.owner.totalHoursWorked || 0);

        let primaryDriver, secondaryDriver;
        if (workloadA >= workloadB) {
            primaryDriver = truckA.owner;
            secondaryDriver = truckB.owner;
        } else {
            primaryDriver = truckB.owner;
            secondaryDriver = truckA.owner;
        }

        // 4. Initialize RelayNode & OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        const relayNode = await prisma.relayNode.create({
            data: {
                hubId: hub.id,
                truckAId: truckA.id,
                truckBId: truckB.id,
                segmentDistanceKm: distAtoHub + distBtoHub,
                segmentTimeHrs: targetArrivalInHrs,
                handshakeStatus: 'WAITING_FOR_PEERS',
                otpCode: otpCode,
                // Using delivery records or other fields if needed for schema compatibility
            }
        });

        // 5. Update Delivery Assignments (Re-routing B's load to the "Primary" truck for the long haul)
        // This is a simplified consolidation logic
        if (deliveryB) {
            await prisma.delivery.update({
                where: { id: deliveryB.id },
                data: {
                    truckId: workloadA >= workloadB ? truckA.id : truckB.id,
                    driverId: primaryDriver.id,
                    relayNodeId: relayNode.id
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                relayId: relayNode.id,
                otpCode,
                syncSpeeds: {
                    truckA: speedA.toFixed(2) + ' km/h',
                    truckB: speedB.toFixed(2) + ' km/h'
                },
                assignments: {
                    longRouteDriver: primaryDriver.name,
                    shortRouteDriver: secondaryDriver.name
                }
            }
        });

    } catch (error) {
        console.error('Accept Synergy Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Helper for distance (Earth Radius 6371km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const p = 0.017453292519943295;    // Math.PI / 180
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

module.exports = {
    searchSynergy,
    acceptSynergy
};
