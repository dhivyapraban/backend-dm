const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllBills = async (req, res) => {
    try {
        const bills = await prisma.eWayBill.findMany({
            include: { driver: true }
        });
        // Format response to match frontend expectations
        const formattedBills = bills.map(bill => ({
            id: bill.billNo,
            vehicle: bill.vehicleNo,
            from: bill.from,
            to: bill.to,
            dist: bill.distance,
            driver: bill.driver.name,
            value: bill.cargoValue,
            valid: bill.validUntil.toLocaleDateString(),
            status: bill.status
        }));
        res.json(formattedBills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createBill = async (req, res) => {
    try {
        const bill = await prisma.eWayBill.create({
            data: req.body
        });
        res.status(201).json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
