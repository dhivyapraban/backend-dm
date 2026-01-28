const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStats = async (req, res) => {
    try {
        const pendingRequests = await prisma.shipment.count({ where: { status: 'PENDING' } });
        const activeShipments = await prisma.shipment.count({ where: { status: 'ACTIVE' } });
        const activeDrivers = await prisma.user.count({ where: { role: 'DRIVER', status: 'ON_DUTY' } });

        // Mock fleet utilization for now
        res.json({
            pendingRequests: pendingRequests.toString(),
            activeShipments: activeShipments.toString(),
            activeDrivers: activeDrivers.toString(),
            fleetUtilization: "87%",
            trends: {
                pendingRequests: "+8 today",
                activeShipments: "+12 today",
                activeDrivers: "+5 today",
                fleetUtilization: "+3% today"
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getActivity = async (req, res) => {
    try {
        const activity = await prisma.activityLog.findMany({
            where: { type: 'WEEKLY_ACTIVITY' },
            orderBy: { createdAt: 'asc' }
        });
        res.json(activity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getLiveTracking = async (req, res) => {
    try {
        // Return some simulation data matching frontend icons
        res.json([
            { id: 1, name: 'Mumbai-Pune Highway', status: 'In Transit' },
            { id: 2, name: 'Ahmedabad City', status: 'Loading' },
            { id: 3, name: 'Delhi NCR', status: 'Unloading' },
            { id: 4, name: 'Virtual Hub A', status: 'Active' },
        ]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
