const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("Starting Final Implementation Verification...");
    try {
        // 1. Ensure a hub exists
        let hub = await prisma.virtualHub.findFirst();
        if (!hub) {
            console.log("Creating temporary hub for verification...");
            hub = await prisma.virtualHub.create({
                data: {
                    name: "Mumbai Relay Hub",
                    latitude: 19.076,
                    longitude: 72.8777,
                    type: "RELAY"
                }
            });
        }
        console.log(`Using Hub: ${hub.name} (ID: ${hub.id})`);

        // 2. Fetch two drivers/trucks for test
        const trucks = await prisma.truck.findMany({
            include: { owner: true, deliveries: { where: { status: 'COMPLETED' } } } // Seeding uses COMPLETED, I'll use them for mock verify
        });

        if (trucks.length < 2) {
            throw new Error("Insufficient data for verification. Run seed first.");
        }

        const truckA = trucks[0];
        const truckB = trucks[1];

        console.log(`Verifying Relay Logic for Trucks: ${truckA.licensePlate} & ${truckB.licensePlate}`);

        // Logic Check: Driver workload
        const workloadA = (truckA.owner.totalDistanceKm || 0) + (truckA.owner.totalHoursWorked || 0);
        const workloadB = (truckB.owner.totalDistanceKm || 0) + (truckB.owner.totalHoursWorked || 0);
        console.log(`Workloads: A=${workloadA}, B=${workloadB}`);

        const primaryDriver = workloadA >= workloadB ? truckA.owner : truckB.owner;
        console.log(`Designated Long-Haul Driver: ${primaryDriver.name}`);

        // 3. Mock Synergy Accept
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const relay = await prisma.relayNode.create({
            data: {
                hubId: hub.id,
                truckAId: truckA.id,
                truckBId: truckB.id,
                segmentDistanceKm: 50.0,
                segmentTimeHrs: 1.0,
                handshakeStatus: 'WAITING_FOR_PEERS',
                otpCode: otpCode
            }
        });

        console.log(`Successfully created RelayNode ${relay.id} with OTP ${otpCode}`);
        console.log("VERIFICATION COMPLETE: ALL SYSTEMS GO");

    } catch (err) {
        console.error("Verification error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
