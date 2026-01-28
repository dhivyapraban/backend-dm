const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllRequests = async (req, res) => {
    try {
        const requests = await prisma.shipment.findMany({
            where: { status: { in: ['PENDING', 'ACTIVE'] } }
        });
        res.json(requests);
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
        // In a real app, this would use a matching algorithm. 
        // For now returning top rated drivers.
        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER', status: 'ON_DUTY' },
            take: 2,
            orderBy: { rating: 'desc' }
        });
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
