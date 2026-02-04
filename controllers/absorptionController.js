const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// GET /api/absorption/map-data - Get routes and virtual hubs for map visualization
const getMapData = async (req, res) => {
    try {
        const [routes, hubs] = await Promise.all([
            prisma.optimizedRoute.findMany({
                where: {
                    status: {
                        in: ['ACTIVE', 'PENDING', 'ALLOCATED']
                    }
                },
                include: {
                    deliveries: {
                        select: {
                            pickupLat: true,
                            pickupLng: true,
                            dropLat: true,
                            dropLng: true,
                            pickupLocation: true,
                            dropLocation: true
                        }
                    },
                    truck: {
                        select: {
                            licensePlate: true,
                            currentLat: true,
                            currentLng: true
                        }
                    }
                },
                take: 20
            }),
            prisma.virtualHub.findMany({
                select: {
                    id: true,
                    name: true,
                    latitude: true,
                    longitude: true,
                    type: true,
                    radius: true
                }
            })
        ]);
        // Format routes for map display
        const formattedRoutes = routes.map(route => {
            const firstDelivery = route.deliveries[0];
            const lastDelivery = route.deliveries[route.deliveries.length - 1];
            
            return {
                id: route.id,
                truckPlate: route.truck?.licensePlate || 'Unknown',
                source: {
                    lat: firstDelivery?.pickupLat || route.truck?.currentLat,
                    lng: firstDelivery?.pickupLng || route.truck?.currentLng,
                    location: firstDelivery?.pickupLocation || 'Source'
                },
                destination: {
                    lat: lastDelivery?.dropLat,
                    lng: lastDelivery?.dropLng,
                    location: lastDelivery?.dropLocation || 'Destination'
                },
                polyline: route.routePolyline,
                status: route.status
            };
        });
        res.json({
            routes: formattedRoutes,
            hubs: hubs
        });
    } catch (error) {
        console.error('Get map data error:', error);
        res.status(500).json({ error: error.message });
    }
};
// GET /api/absorption/active - Get active absorption requests
const getActiveAbsorptions = async (req, res) => {
    try {
        const absorptions = await prisma.absorptionOpportunity.findMany({
            where: {
                status: {
                    in: ['PENDING', 'ACCEPTED_BY_ROUTE1', 'ACCEPTED_BY_ROUTE2']
                }
            },
            include: {
                route1: {
                    include: {
                        truck: true,
                        driver: true
                    }
                },
                route2: {
                    include: {
                        truck: true,
                        driver: true
                    }
                },
                nearestHub: true
            },
            orderBy: {
                proposedAt: 'desc'
            }
        });
        const formattedAbsorptions = absorptions.map(abs => ({
            id: abs.id,
            route1: {
                id: abs.route1.id,
                truck: abs.route1.truck?.licensePlate,
                driver: abs.route1.driver?.name
            },
            route2: {
                id: abs.route2.id,
                truck: abs.route2.truck?.licensePlate,
                driver: abs.route2.driver?.name
            },
            hub: {
                name: abs.nearestHub.name,
                location: `${abs.nearestHub.latitude}, ${abs.nearestHub.longitude}`
            },
            overlapDistance: abs.overlapDistanceKm,
            distanceSaved: abs.totalDistanceSaved,
            carbonSaved: abs.potentialCarbonSaved,
            meetTime: abs.estimatedMeetTime,
            status: abs.status,
            proposedAt: abs.proposedAt,
            // Added fields for frontend compatibility
            truck1: abs.route1.truck?.licensePlate,
            truck2: abs.route2.truck?.licensePlate,
            weight: abs.spaceRequiredWeight,
            type: abs.route1.truck?.type || 'Standard', // Default to Standard if undefined
         }));
        res.json(formattedAbsorptions);
    } catch (error) {
        console.error('Get active absorptions error:', error);
        res.status(500).json({ error: error.message });
    }
};
module.exports = {
    getMapData,
    getActiveAbsorptions
};