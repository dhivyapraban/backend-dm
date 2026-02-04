const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStats = async (req, res) => {
    try {
        const pendingRequests = await prisma.shipment.count({ where: { status: 'PENDING' } });
        const activeShipments = await prisma.shipment.count({
            where: {
                status: {
                    in: ['IN_TRANSIT', 'DISPATCHER_APPROVED', 'DRIVER_ACCEPTED', 'DRIVER_NOTIFIED']
                }
            }
        });
        const activeDriversCount = await prisma.user.count({ where: { role: 'DRIVER', status: 'ON_DUTY' } });

        // Fleet Capacity Analytics
        const totalVehicles = await prisma.truck.count();

        const totalCapacityResult = await prisma.truck.aggregate({
            _sum: {
                capacity: true
            }
        });

        const activeCapacityResult = await prisma.truck.aggregate({
            _sum: {
                capacity: true
            },
            where: {
                owner: {
                    status: 'ON_DUTY'
                }
            }
        });

        res.json({
            pendingRequests: pendingRequests.toString(),
            activeShipments: activeShipments.toString(),
            activeDrivers: activeDriversCount.toString(),
            fleetUtilization: "87%",
            // New Fleet Capacity Stats
            totalVehicles: totalVehicles,
            totalCapacity: totalCapacityResult._sum.capacity || 0,
            activeCapacity: activeCapacityResult._sum.capacity || 0,
            unit: 'kg',
            trends: {
                pendingRequests: "+8 today",
                activeShipments: "+12 today",
                activeDrivers: "+5 today",
                fleetUtilization: "+3% today"
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getActivity = async (req, res) => {
    try {
        // Get deliveries from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const deliveries = await prisma.delivery.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            select: {
                createdAt: true
            }
        });

        // Group by day
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = {};

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = dayNames[date.getDay()];
            counts[dayName] = 0;
        }

        // Count deliveries per day
        deliveries.forEach(delivery => {
            const dayName = dayNames[delivery.createdAt.getDay()];
            if (counts[dayName] !== undefined) {
                counts[dayName]++;
            }
        });

        // Format for frontend - maintain order
        const today = new Date().getDay();
        const orderedDays = [];
        for (let i = 6; i >= 0; i--) {
            const dayIndex = (today - i + 7) % 7;
            orderedDays.push(dayNames[dayIndex]);
        }

        const formattedActivity = orderedDays.map(day => ({
            day,
            requests: counts[day] || 0
        }));

        res.json(formattedActivity);
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getLiveTracking = async (req, res) => {
    try {
        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER', status: 'IN_TRANSIT' },
            take: 4
        });

        const trackingData = drivers.length > 0 ? drivers.map(d => ({
            id: d.id,
            name: d.homeBaseCity || 'Unknown Route',
            status: 'In Transit'
        })) : [
            { id: 1, name: 'Mumbai-Pune Highway', status: 'In Transit' },
            { id: 2, name: 'Ahmedabad City', status: 'Loading' },
            { id: 3, name: 'Delhi NCR', status: 'Unloading' },
            { id: 4, name: 'Virtual Hub A', status: 'Active' },
        ];

        res.json(trackingData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getLiveTrackingWeb = async (req, res) => {
    try {
        const trucks = await prisma.truck.findMany({
            where: { isAvailable: false },
            include: { owner: true },
            take: 4
        });

        const trackingData = trucks.length > 0 ? trucks.map(t => ({
            id: t.id,
            name: `${t.licensePlate} • ${t.owner?.name || 'Unassigned'}`,
            status: 'Active'
        })) : [
            { id: 1, name: 'MH-12-AB-1234 • Raj Kumar', status: 'In Transit' },
            { id: 2, name: 'DL-01-XY-9876 • Amit Singh', status: 'Loading' },
            { id: 3, name: 'KA-05-CD-4567 • Priya Sharma', status: 'Unloading' },
            { id: 4, name: 'TN-07-EF-3210 • Hub Transfer', status: 'Active' },
        ];

        res.json(trackingData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getLiveTrackingGPS = async (req, res) => {
    try {
        const trucks = await prisma.truck.findMany({
            where: { isAvailable: false },
            include: { owner: true },
            take: 20
        });

        const trackingData = trucks.map(t => ({
            id: t.id,
            name: `${t.licensePlate} • ${t.owner?.name || 'Unassigned'}`,
            status: 'Active',
            location: {
                lat: t.currentLat || 19.0760, // Fallback to Mumbai if null
                lng: t.currentLng || 72.8777,
                heading: 0,
                speed: 60
            }
        }));

        res.json(trackingData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRecentAbsorptions = async (req, res) => {
    try {
        // Get today's absorption opportunities
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const absorptions = await prisma.absorptionOpportunity.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                route1: {
                    select: {
                        id: true,
                        truck: {
                            select: {
                                licensePlate: true
                            }
                        }
                    }
                },
                route2: {
                    select: {
                        id: true,
                        truck: {
                            select: {
                                licensePlate: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 3
        });

        // Format for frontend
        const formattedAbsorptions = absorptions.map(abs => ({
            id: abs.id,
            type: 'Absorption',
            route: `${abs.route1.truck?.licensePlate || 'Route 1'} ↔ ${abs.route2.truck?.licensePlate || 'Route 2'}`,
            weight: `${abs.spaceRequiredWeight.toFixed(1)} kg`,
            priority: abs.totalDistanceSaved > 50 ? 'HIGH' : (abs.totalDistanceSaved > 20 ? 'MEDIUM' : 'LOW')
        }));

        res.json(formattedAbsorptions);
    } catch (error) {
        console.error('Get recent absorptions error:', error);
        res.status(500).json({ error: error.message });
    }
};
