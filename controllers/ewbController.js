const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllBills = async (req, res) => {
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
                status: bill.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
            };
        });
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
