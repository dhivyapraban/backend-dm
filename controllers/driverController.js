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
                    status ? { status: status.toUpperCase().replace(' ', '_') } : {}
                ]
            }
        });
        res.json(drivers);
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
        await prisma.user.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
