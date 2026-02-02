const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRoutes() {
  console.log('🚀 Seeding Optimized Routes...');

  try {
    // 1. Fetch necessary relations
    const company = await prisma.courierCompany.findFirst();
    const drivers = await prisma.user.findMany({ where: { role: 'DRIVER' }, take: 5 });
    const trucks = await prisma.truck.findMany({ take: 5 });

    if (!company || drivers.length === 0 || trucks.length === 0) {
      console.error('❌ Error: Ensure you have seeded CourierCompany, Drivers, and Trucks first.');
      return;
    }

    // --- CLEANUP ---
    await prisma.optimizedRoute.deleteMany();

    const routes = [];

    for (let i = 0; i < 10; i++) {
      const driver = drivers[i % drivers.length];
      const truck = trucks[i % trucks.length];
      
      // Generate realistic metrics
      const baselineDist = 150 + (i * 10); // Standard distance
      const actualDist = baselineDist * 0.85; // 15% optimization
      const weight = 1000 + (i * 200);
      const utilization = (weight / truck.maxWeight) * 100;

      routes.push({
        courierCompanyId: company.id,
        truckId: truck.id,
        driverId: driver.id,
        status: i < 3 ? 'ACTIVE' : i < 6 ? 'COMPLETED' : 'PENDING',
        
        // Polyline placeholder (Encoded string representing the path)
        routePolyline: "a~l~Fjk_uOnud@u_q@h{m@pzh@v_u@~_q@...", 
        
        // Metrics for your Dashboard
        totalDistance: actualDist,
        totalDuration: 180 + (i * 15), // minutes
        baselineDistance: baselineDist,
        carbonSaved: (baselineDist - actualDist) * 0.25, // 0.25kg CO2 per km
        emptyMilesSaved: (baselineDist - actualDist),
        
        // Load Details
        totalPackages: 5 + i,
        totalWeight: weight,
        totalVolume: 400 + (i * 50),
        utilizationPercent: Math.min(utilization, 100),
        
        estimatedStartTime: new Date(),
        estimatedEndTime: new Date(Date.now() + 4 * 3600000), // 4 hours later
        
        isTSPOptimized: true,
        waypoints: [
          { name: "Mumbai Hub", lat: 19.1234, lng: 72.8765 },
          { name: "Lonavala Stop", lat: 18.7481, lng: 73.4072 },
          { name: "Pune Destination", lat: 18.5204, lng: 73.8567 }
        ]
      });
    }

    await prisma.optimizedRoute.createMany({ data: routes });

    console.log(`✅ Successfully seeded ${routes.length} Optimized Routes.`);
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedRoutes();
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const { v4: uuidv4 } = require('uuid');

// async function main() {
//   console.log('🚀 Seeding Heavy Dataset...');

//   // --- CLEANUP ---
//   const tables = [
//     'Notification', 'Transaction', 'EWayBill', 'AbsorptionTransfer', 
//     'AbsorptionOpportunity', 'Delivery', 'OptimizedRoute', 'BackhaulPickup', 
//     'GPSLog', 'Truck', 'Shipment', 'VirtualHub', 'User', 'CourierCompany'
//   ];
//   for (const table of tables) {
//     await prisma[table].deleteMany();
//   }

//   // --- 1. COURIER COMPANY ---
//   const ftl = await prisma.courierCompany.create({
//     data: { name: 'FastTrack Logistics', code: 'FTL-001' }
//   });

//   // --- 2. VIRTUAL HUBS (Checkpoints) ---
//   const hubs = await prisma.virtualHub.createMany({
//     data: [
//       { name: 'Mumbai North Hub', latitude: 19.1234, longitude: 72.8765, type: 'VIRTUAL' },
//       { name: 'Navi Mumbai Hub', latitude: 19.0330, longitude: 73.0297, type: 'VIRTUAL' },
//       { name: 'Lonavala Midpoint', latitude: 18.7481, longitude: 73.4072, type: 'VIRTUAL' },
//       { name: 'Pune West Hub', latitude: 18.5204, longitude: 73.8567, type: 'PHYSICAL' },
//     ]
//   });
//   const allHubs = await prisma.virtualHub.findMany();

//   // --- 3. USERS (Drivers & Dispatchers) ---
//   // Dispatchers
//   const disp1 = await prisma.user.create({
//     data: { name: 'Arjun Singh', phone: '+919876543210', role: 'DISPATCHER', registrationStatus: 'APPROVED' }
//   });

//   // Create 10 Drivers with varied work history for the RELAY logic
//   const driverData = [
//     { name: 'Rahul (High Work)', phone: '+919000000001', dist: 1200.5, hours: 150 },
//     { name: 'Amit (Low Work)', phone: '+919000000002', dist: 50.0, hours: 10 },
//     { name: 'Suresh', phone: '+919000000003', dist: 500.0, hours: 60 },
//     { name: 'Vikram', phone: '+919000000004', dist: 800.0, hours: 90 },
//     { name: 'Priya', phone: '+919000000005', dist: 100.0, hours: 15 },
//     { name: 'Deepak', phone: '+919000000006', dist: 300.0, hours: 40 },
//     { name: 'Anil', phone: '+919000000007', dist: 950.0, hours: 110 },
//     { name: 'Sunil', phone: '+919000000008', dist: 20.0, hours: 5 },
//     { name: 'Raj', phone: '+919000000009', dist: 400.0, hours: 55 },
//     { name: 'Vijay', phone: '+919000000010', dist: 650.0, hours: 75 },
//   ];

//   for (const d of driverData) {
//     await prisma.user.create({
//       data: {
//         name: d.name,
//         phone: d.phone,
//         role: 'DRIVER',
//         status: d.dist > 500 ? 'IN_TRANSIT' : 'ON_DUTY',
//         totalDistanceKm: d.dist,
//         totalHoursWorked: d.hours,
//         courierCompanyId: ftl.id,
//         registrationStatus: 'APPROVED',
//       }
//     });
//   }
//   const drivers = await prisma.user.findMany({ where: { role: 'DRIVER' } });

//   // --- 4. TRUCKS (Varied Capacities & Locations) ---
//   for (let i = 0; i < drivers.length; i++) {
//     await prisma.truck.create({
//       data: {
//         licensePlate: `MH-${10 + i}-AB-${1000 + i}`,
//         model: i % 2 === 0 ? 'Tata Ultra' : 'Mahindra Blazo',
//         maxWeight: i % 2 === 0 ? 5000 : 2500,
//         maxVolume: i % 2 === 0 ? 2000 : 800,
//         currentWeight: 0,
//         currentVolume: 0,
//         // Set first 4 trucks near Mumbai North Hub (19.1234, 72.8765) to test 10km proximity
//         currentLat: 19.1234 + (i < 4 ? i * 0.001 : i * 0.05),
//         currentLng: 72.8765 + (i < 4 ? i * 0.001 : i * 0.05),
//         ownerId: drivers[i].id,
//         courierCompanyId: ftl.id,
//         registrationStatus: 'APPROVED'
//       }
//     });
//   }
//   const trucks = await prisma.truck.findMany();

//   // --- 5. SHIPMENTS & DELIVERIES ---
//   const cargoTypes = ['ELECTRONICS', 'PHARMA', 'FOOD', 'TEXTILES', 'CHEMICALS'];

//   for (let i = 0; i < 15; i++) {
//     const shipment = await prisma.shipment.create({
//       data: {
//         shipperId: disp1.id,
//         cargoType: cargoTypes[i % 5],
//         cargoWeight: 100 + (i * 50),
//         cargoVolume: 50 + (i * 20),
//         status: 'DISPATCHER_APPROVED'
//       }
//     });

//     await prisma.delivery.create({
//       data: {
//         dispatcherId: disp1.id,
//         driverId: drivers[i % drivers.length].id,
//         truckId: trucks[i % trucks.length].id,
//         shipmentId: shipment.id,
//         packageId: `PKG-${1000 + i}`,
//         pickupLocation: 'Mumbai',
//         pickupLat: 19.0760,
//         pickupLng: 72.8777,
//         dropLocation: 'Pune',
//         dropLat: 18.5204,
//         dropLng: 73.8567,
//         cargoType: cargoTypes[i % 5],
//         cargoWeight: 100 + (i * 50),
//         cargoVolumeLtrs: 50 + (i * 20),
//         status: i < 5 ? 'IN_TRANSIT' : 'PENDING'
//       }
//     });
//   }

//   // --- 6. TRANSACTIONS & E-WAY BILLS ---
//   for (const driver of drivers) {
//     await prisma.transaction.create({
//       data: {
//         driverId: driver.id,
//         amount: 500.0,
//         type: 'BASE_DELIVERY',
//         description: 'Payment for route MU-PU'
//       }
//     });

//     await prisma.eWayBill.create({
//       data: {
//         billNo: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
//         vehicleNo: trucks.find(t => t.ownerId === driver.id).licensePlate,
//         from: 'Mumbai',
//         to: 'Pune',
//         distance: '150km',
//         driverId: driver.id,
//         cargoValue: '₹2,50,000',
//         validUntil: new Date(Date.now() + 86400000)
//       }
//     });
//   }

//   console.log('✅ Heavy Seeding Complete: 10 Drivers, 10 Trucks, 15 Deliveries created.');
// }

// main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());