const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/packages/history - Get last 10 package deliveries with location data
const getHistory = async (req, res) => {
    try {
        const packages = await prisma.delivery.findMany({
            where: {
                status: {
                    in: ['COMPLETED', 'IN_TRANSIT', 'EN_ROUTE_TO_DROP', 'CARGO_LOADED']
                }
            },
            include: {
                driver: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        const formattedPackages = packages.map(pkg => ({
            id: pkg.id,
            trackingNo: pkg.trackingNumber || `PKG-${pkg.id.substring(0, 8)}`,
            pickup: {
                location: pkg.pickupLocation,
                lat: pkg.pickupLat,
                lng: pkg.pickupLng
            },
            delivery: {
                location: pkg.dropLocation,
                lat: pkg.dropLat,
                lng: pkg.dropLng
            },
            driver: pkg.driver?.name || 'Unassigned',
            status: pkg.status,
            date: pkg.createdAt,
            weight: pkg.cargoWeight || 0
        }));

        res.json(formattedPackages);
    } catch (error) {
        console.error('Get package history error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHistoryWeb = async (req, res) => {
    try {
        const packages = await prisma.delivery.findMany({
            where: {
                status: {
                    in: ['COMPLETED', 'IN_TRANSIT', 'EN_ROUTE_TO_DROP', 'CARGO_LOADED']
                }
            },
            include: {
                driver: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        });

        const formattedPackages = packages.map(pkg => ({
            id: pkg.id,
            trackingNo: pkg.trackingNumber || `PKG-${pkg.id.substring(0, 8)}`,
            pickup: {
                location: pkg.pickupLocation,
                lat: pkg.pickupLat,
                lng: pkg.pickupLng
            },
            delivery: {
                location: pkg.dropLocation,
                lat: pkg.dropLat,
                lng: pkg.dropLng
            },
            driver: pkg.driver?.name || 'Unassigned',
            status: pkg.status,
            date: pkg.createdAt,
            weight: pkg.cargoWeight || 0
        }));

        res.json(formattedPackages);
    } catch (error) {
        console.error('Get package history error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getHistory,
    getHistoryWeb
};
