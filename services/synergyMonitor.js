const prisma = require('../config/database');

/**
 * Cargo Compatibility Check
 * Prevents mixing incompatible cargo types
 */
function isCargoCompatible(cargoType1, cargoType2) {
    const incompatibleGroups = [
        ['Food', 'Pharma'],
        ['Chemicals', 'Hazardous']
    ];

    for (const group of incompatibleGroups) {
        const type1InGroup = group.some(type => cargoType1?.toLowerCase().includes(type.toLowerCase()));
        const type2InGroup = group.some(type => cargoType2?.toLowerCase().includes(type.toLowerCase()));

        // If one is in Food/Pharma and other is in Chemicals/Hazardous, incompatible
        if (type1InGroup && !type2InGroup) {
            const otherGroup = incompatibleGroups.find(g => g !== group);
            if (otherGroup.some(type => cargoType2?.toLowerCase().includes(type.toLowerCase()))) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Path Overlap Detection
 * Checks if two routes share at least one common VirtualHub
 */
function hasPathOverlap(waypointsA, waypointsB) {
    if (!waypointsA || !waypointsB) return false;

    try {
        const hubsA = Array.isArray(waypointsA) ? waypointsA : JSON.parse(waypointsA);
        const hubsB = Array.isArray(waypointsB) ? waypointsB : JSON.parse(waypointsB);

        // Extract hub IDs from waypoints
        const hubIdsA = hubsA.map(wp => wp.hubId || wp.id).filter(Boolean);
        const hubIdsB = hubsB.map(wp => wp.hubId || wp.id).filter(Boolean);

        // Check for common hub
        return hubIdsA.some(id => hubIdsB.includes(id));
    } catch (error) {
        console.error('Path overlap detection error:', error);
        return false;
    }
}

/**
 * Continuous Proximity & Constraint Engine
 * Monitors GPS logs every 2 minutes and detects synergy opportunities
 */
class SynergyMonitor {
    constructor(io) {
        this.io = io;
        this.isRunning = false;
        this.intervalId = null;
    }

    start() {
        if (this.isRunning) {
            console.log('Synergy Monitor already running');
            return;
        }

        console.log('🚀 Starting Synergy Monitor (2-minute interval)');
        this.isRunning = true;

        // Run immediately on start
        this.scanForOpportunities();

        // Then run every 2 minutes (120000ms)
        this.intervalId = setInterval(() => {
            this.scanForOpportunities();
        }, 120000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️  Synergy Monitor stopped');
    }

    async scanForOpportunities() {
        try {
            console.log('🔍 Scanning for synergy opportunities...');

            // Get all active trucks with their latest GPS position
            const activeTrucks = await prisma.truck.findMany({
                where: {
                    isAvailable: true,
                    currentLat: { not: null },
                    currentLng: { not: null },
                    owner: {
                        status: { in: ['ON_DUTY', 'IN_TRANSIT'] }
                    }
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            status: true,
                            totalDistanceKm: true,
                            totalHoursWorked: true
                        }
                    },
                    optimizedRoutes: {
                        where: { status: 'ACTIVE' },
                        include: {
                            deliveries: {
                                select: {
                                    id: true,
                                    cargoType: true,
                                    cargoWeight: true,
                                    cargoVolumeLtrs: true,
                                    packageId: true
                                }
                            }
                        }
                    }
                }
            });

            console.log(`Found ${activeTrucks.length} active trucks`);

            // Check each truck pair
            for (let i = 0; i < activeTrucks.length; i++) {
                const truckA = activeTrucks[i];

                // Skip if no active route
                if (!truckA.optimizedRoutes || truckA.optimizedRoutes.length === 0) continue;

                const routeA = truckA.optimizedRoutes[0];

                for (let j = i + 1; j < activeTrucks.length; j++) {
                    const truckB = activeTrucks[j];

                    // Skip if no active route
                    if (!truckB.optimizedRoutes || truckB.optimizedRoutes.length === 0) continue;

                    const routeB = truckB.optimizedRoutes[0];

                    // Calculate distance between trucks using Haversine formula
                    const distance = this.calculateDistance(
                        truckA.currentLat,
                        truckA.currentLng,
                        truckB.currentLat,
                        truckB.currentLng
                    );

                    // Check if within 10km
                    if (distance > 10) continue;

                    console.log(`✅ Found trucks within 10km: ${truckA.licensePlate} & ${truckB.licensePlate} (${distance.toFixed(2)}km)`);

                    // CONSTRAINT 1: Capacity Check
                    const availableWeightA = (truckA.maxWeight || 0) - (truckA.currentWeight || 0);
                    const availableVolumeA = (truckA.maxVolume || 0) - (truckA.currentVolume || 0);

                    const canAbsorb = (availableWeightA >= truckB.currentWeight) &&
                        (availableVolumeA >= truckB.currentVolume);

                    if (!canAbsorb) {
                        console.log(`❌ Capacity constraint failed for ${truckA.licensePlate}`);
                        continue;
                    }

                    // CONSTRAINT 2: Cargo Compatibility
                    const cargoTypesA = routeA.deliveries.map(d => d.cargoType);
                    const cargoTypesB = routeB.deliveries.map(d => d.cargoType);

                    let compatible = true;
                    for (const typeA of cargoTypesA) {
                        for (const typeB of cargoTypesB) {
                            if (!isCargoCompatible(typeA, typeB)) {
                                compatible = false;
                                break;
                            }
                        }
                        if (!compatible) break;
                    }

                    if (!compatible) {
                        console.log(`❌ Cargo compatibility failed`);
                        continue;
                    }

                    // CONSTRAINT 3: Path Overlap
                    if (!hasPathOverlap(routeA.waypoints, routeB.waypoints)) {
                        console.log(`❌ No path overlap detected`);
                        continue;
                    }

                    // Find nearest VirtualHub
                    const nearestHub = await this.findNearestHub(
                        truckA.currentLat,
                        truckA.currentLng
                    );

                    if (!nearestHub) {
                        console.log(`❌ No nearby hub found`);
                        continue;
                    }

                    // Check if opportunity already exists
                    const existingOpportunity = await prisma.absorptionOpportunity.findFirst({
                        where: {
                            OR: [
                                { route1Id: routeA.id, route2Id: routeB.id },
                                { route1Id: routeB.id, route2Id: routeA.id }
                            ],
                            status: { in: ['PENDING', 'ACCEPTED_BY_ROUTE1', 'ACCEPTED_BY_ROUTE2', 'BOTH_ACCEPTED'] },
                            expiresAt: { gt: new Date() }
                        }
                    });

                    if (existingOpportunity) {
                        console.log(`⚠️  Opportunity already exists`);
                        continue;
                    }

                    // Create Absorption Opportunity
                    const carbonSaved = distance * (truckA.co2PerKm || 0.5);

                    const opportunity = await prisma.absorptionOpportunity.create({
                        data: {
                            route1Id: routeA.id,
                            route2Id: routeB.id,
                            overlapDistanceKm: parseFloat(distance.toFixed(2)),
                            overlapStartTime: new Date(),
                            overlapEndTime: new Date(Date.now() + 3600000), // 1 hour
                            nearestHubId: nearestHub.id,
                            overlapCenterLat: (truckA.currentLat + truckB.currentLat) / 2,
                            overlapCenterLng: (truckA.currentLng + truckB.currentLng) / 2,
                            estimatedMeetTime: new Date(Date.now() + 1800000), // 30 min
                            timeWindow: 30,
                            eligibleDeliveryIds: routeB.deliveries.map(d => d.id).join(','),
                            truck1DistanceBefore: 0,
                            truck1DistanceAfter: 0,
                            truck2DistanceBefore: 0,
                            truck2DistanceAfter: 0,
                            totalDistanceSaved: parseFloat(distance.toFixed(2)),
                            potentialCarbonSaved: carbonSaved,
                            spaceRequiredVolume: truckB.currentVolume,
                            spaceRequiredWeight: truckB.currentWeight,
                            truck1SpaceAvailable: availableVolumeA,
                            truck2SpaceAvailable: (truckB.maxVolume || 0) - (truckB.currentVolume || 0),
                            expiresAt: new Date(Date.now() + 3600000), // 1 hour
                            status: 'PENDING'
                        }
                    });

                    console.log(`🎯 Created opportunity: ${opportunity.id}`);

                    // Emit SYNERGY_PROPOSED to Dispatcher Dashboard
                    this.io.emit('SYNERGY_PROPOSED', {
                        opportunityId: opportunity.id,
                        truckA: {
                            id: truckA.id,
                            licensePlate: truckA.licensePlate,
                            driverId: truckA.owner.id
                        },
                        truckB: {
                            id: truckB.id,
                            licensePlate: truckB.licensePlate,
                            driverId: truckB.owner.id
                        },
                        hubId: nearestHub.id,
                        hubName: nearestHub.name,
                        distance: distance.toFixed(2),
                        carbonSaved: carbonSaved.toFixed(2),
                        expiresAt: opportunity.expiresAt
                    });
                }
            }

            console.log('✅ Scan complete');
        } catch (error) {
            console.error('❌ Synergy scan error:', error);
        }
    }

    /**
     * Haversine formula to calculate distance between two coordinates
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Find nearest VirtualHub within 10km
     */
    async findNearestHub(lat, lng) {
        const hubs = await prisma.$queryRaw`
      SELECT id, name, latitude, longitude,
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )) AS distance
      FROM "VirtualHub"
      WHERE (6371 * acos(
        cos(radians(${lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      )) < 10
      ORDER BY distance
      LIMIT 1
    `;

        return hubs.length > 0 ? hubs[0] : null;
    }
}

module.exports = SynergyMonitor;
