const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllRequests = async (req, res) => {
    try {
        const requests = await prisma.shipment.findMany({
            where: {
                status: {
                    in: ['PENDING', 'AWAITING_DISPATCHER', 'DISPATCHER_APPROVED', 'DRIVER_NOTIFIED', 'IN_TRANSIT']
                }
            }
        });

        const formattedRequests = requests.map(req => ({
            id: `#AR-${req.id.slice(0, 4).toUpperCase()}`,
            type: req.cargoType || 'General Cargo',
            route: `${req.pickupLocation || 'Unknown'} → ${req.dropLocation || 'Unknown'}`,
            weight: req.cargoWeight ? `${req.cargoWeight}T` : 'N/A',
            priority: req.priority.charAt(0) + req.priority.slice(1).toLowerCase(),
            status: req.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            pickup: req.pickupLocation,
            drop: req.dropLocation,
            color: req.priority === 'HIGH' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                req.priority === 'MEDIUM' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                    'text-blue-500 bg-blue-500/10 border-blue-500/20'
        }));

        res.json(formattedRequests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const request = await prisma.shipment.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRecommendedDrivers = async (req, res) => {
    try {
        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER', status: 'ON_DUTY' },
            take: 2,
            orderBy: { rating: 'desc' }
        });

        const recommendations = drivers.map((d, index) => ({
            id: d.id,
            name: d.name,
            initials: d.initials || d.name.split(' ').map(n => n[0]).join(''),
            plate: d.currentVehicleNo || 'N/A',
            rating: d.rating,
            dist: index === 0 ? '12 km' : '18 km',
            eta: index === 0 ? '22 mins' : '32 mins',
            profit: index === 0 ? '+₹2,400' : '+₹2,100',
            bestMatch: index === 0
        }));

        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
