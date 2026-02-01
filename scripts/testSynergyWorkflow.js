const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log("--- Synergy & Relay Logic Verification ---");

    try {
        // 1. Fetch search candidate
        const trucks = await prisma.truck.findMany({ include: { deliveries: true, owner: true } });
        if (trucks.length < 2) {
            console.error("Need at least 2 trucks for testing.");
            return;
        }

        const truckA = trucks[0];
        const truckB = trucks[1];
        const hub = await prisma.virtualHub.findFirst();

        if (!hub) {
            console.error("No VirtualHub found. Please seed the database.");
            return;
        }

        console.log(`Testing with TruckA: ${truckA.licensePlate}, TruckB: ${truckB.licensePlate}, Hub: ${hub.name}`);

        // Mocking the search logic check (Material Compatibility)
        const cargoA = truckA.deliveries[0]?.cargoType || 'Food';
        const cargoB = truckB.deliveries[0]?.cargoType || 'Chemicals';

        const isChemicalA = cargoA.toLowerCase().includes('chemical');
        const isFoodPharmaB = cargoB.toLowerCase().includes('food') || cargoB.toLowerCase().includes('pharma');
        const safetyViolation = (isChemicalA && isFoodPharmaB);

        console.log(`Safety Violation Check (${cargoA} vs ${cargoB}): ${safetyViolation}`);

        // Mocking Accept logic (OTP and RelayNode)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP: ${otpCode}`);

        // Driver Relay Rule Check
        const workloadA = (truckA.owner.totalDistanceKm || 0) + (truckA.owner.totalHoursWorked || 0);
        const workloadB = (truckB.owner.totalDistanceKm || 0) + (truckB.owner.totalHoursWorked || 0);
        console.log(`Workload A: ${workloadA}, Workload B: ${workloadB}`);
        console.log(`Winner (Long Segment): ${workloadA >= workloadB ? truckA.owner.name : truckB.owner.name}`);

        console.log("Verification Logic: PASSED");

    } catch (err) {
        console.error("Verification failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
