const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllDrivers = async (req, res) => {
    try {
        const { search, status } = req.query;
        const drivers = await prisma.user.findMany({
            where: {
                role: 'DRIVER',
                AND: [
                    search ? {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { currentVehicleNo: { contains: search, mode: 'insensitive' } },
                            { homeBaseCity: { contains: search, mode: 'insensitive' } }
                        ]
                    } : {},
                    status ? { status: status.toUpperCase().replace(' ', '_') } : {},
                    { registrationStatus: { not: 'REJECTED' } }
                ]
            },
            include: {
                trucks: true
            }
        });

        const formattedDrivers = drivers.map(d => ({
            id: d.id,
            name: d.name,
            vehicle: d.trucks?.[0]?.model || d.vehicleType || 'Unknown Vehicle',
            plate: d.currentVehicleNo || d.trucks?.[0]?.licensePlate || 'N/A',
            rating: d.rating,
            trips: d.deliveriesCount,
            status: d.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            avatar: d.initials || d.name.split(' ').map(n => n[0]).join(''),
            color: d.avatarColor || 'bg-orange-500',
            phone: d.phone,
            type: d.vehicleType || d.trucks?.[0]?.type || 'Standard',
            loc: d.homeBaseCity || 'Unknown'
        }));

        res.json(formattedDrivers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDriverById = async (req, res) => {
    try {
        const driver = await prisma.user.findUnique({
            where: { id: req.params.id }
        });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createDriver = async (req, res) => {
    try {
        const driver = await prisma.user.create({
            data: { ...req.body, role: 'DRIVER' }
        });
        res.status(201).json(driver);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDriver = async (req, res) => {
    try {
        const driver = await prisma.user.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDriver = async (req, res) => {
    try {
        const timestamp = Date.now();
        await prisma.user.update({ 
            where: { id: req.params.id },
            data: {
                registrationStatus: 'REJECTED',
                status: 'OFF_DUTY',
                name: 'Deleted Driver',
                phone: `deleted_${timestamp}_${req.params.id.substring(0, 5)}`,
                qrCode: `deleted_${timestamp}_${req.params.id.substring(0, 5)}`,
                currentVehicleNo: null
            }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getActiveRoute = async (req, res) => {
    try {
        const { truckId } = req.params;
        const activeRoute = await prisma.optimizedRoute.findFirst({
            where: {
                truckId: truckId,
                status: { in: ['Allocated', 'Active'] } 
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!activeRoute) {
            return res.status(404).json({ message: 'No active route found' });
        }

        res.json({
            truckId: truckId,
            routeId: activeRoute.id,
            polyline: activeRoute.routePolyline, 
            checkpoints: activeRoute.waypoints || [] 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
