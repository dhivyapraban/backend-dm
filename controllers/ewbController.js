const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllBills = async (req, res) => {
    try {
        const bills = await prisma.eWayBill.findMany({
            include: { driver: true }
        });

        const formattedBills = bills.map(bill => {
            const date = new Date(bill.validUntil);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedDate = `${date.getDate()} ${months[date.getMonth()]}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            return {
                id: bill.billNo,
                vehicle: bill.vehicleNo,
                from: bill.from,
                to: bill.to,
                dist: bill.distance,
                driver: bill.driver.name,
                value: bill.cargoValue,
                valid: formattedDate,
                validUntil: bill.validUntil,
                status: bill.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            };
        });
        res.json(formattedBills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createBill = async (req, res) => {
    try {
        const bill = await prisma.eWayBill.create({
            data: req.body
        });
        res.status(201).json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/eway-bills/stats - Get statistics for e-way bills
const getStats = async (req, res) => {
    try {
        const now = new Date();
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

        const [totalActive, expireSoon, expired] = await Promise.all([
            // Total e-way bills (User requested total count from DB)
            prisma.eWayBill.count(),
            // Expire soon (valid_until - current_date < 2 days)
            prisma.eWayBill.count({
                where: {
                    validUntil: {
                        gte: now,
                        lt: twoDaysFromNow
                    },
                    status: 'ACTIVE'
                }
            }),
            // Expired (valid_until < current_date)
            prisma.eWayBill.count({
                where: {
                    validUntil: {
                        lt: now
                    }
                }
            })
        ]);

        res.json({
            active: totalActive,
            expireSoon: expireSoon,
            expired: expired
        });
    } catch (error) {
        console.error('Get e-way bills stats error:', error);
        res.status(500).json({ error: error.message });
    }
};
const updateBill = async (req, res) => {
    try {
        const bill = await prisma.eWayBill.update({
            where: { billNo: req.params.id }, // Assuming billNo is the ID used in params, or use 'id' if that's the primary key. Schema says id is UUID, billNo is unique string. Let's check route param usage. Usually ID is safer. req.params.id matches 'id' field.
            data: req.body
        });
        res.json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteBill = async (req, res) => {
    try {
        await prisma.eWayBill.delete({
            where: { billNo: req.params.id } // Frontend usually uses ID, but check what ID we send. In getAllBills we send 'id: bill.billNo'. So we should use billNo.
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllBills,
    createBill,
    getStats,
    updateBill,
    deleteBill
};
