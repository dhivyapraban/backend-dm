const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* ============================================
   CONSTANT DATA
============================================ */

const CITIES = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
];

const NAMES = [
  { name: 'Rajesh Kumar', initials: 'RK' },
  { name: 'Amit Sharma', initials: 'AS' },
  { name: 'Vikram Patel', initials: 'VP' },
  { name: 'Ramesh Verma', initials: 'RV' },
  { name: 'Anil Gupta', initials: 'AG' },
];

const TRUCKS = [
  { model: 'Tata Prima', type: 'Heavy', capacity: 16 },
  { model: 'Ashok Leyland 4825', type: 'Container', capacity: 18 },
  { model: 'Volvo FM 440', type: 'Heavy', capacity: 22 },
];

const CARGO_TYPES = [
  'Electronics',
  'Textiles',
  'Automobile Parts',
  'FMCG',
  'Pharmaceuticals',
];

/* ============================================
   HELPERS
============================================ */

const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (arr) => arr[rand(0, arr.length - 1)];

const phone = () => `+91${rand(9000000000, 9999999999)}`;

const vehicleNo = () =>
  `MH-${rand(10, 99)}-${String.fromCharCode(65 + rand(0, 25))}${String.fromCharCode(
    65 + rand(0, 25)
  )}-${rand(1000, 9999)}`;

const tripId = () => `TRP-${rand(1000, 9999)}`;

const ewbNo = () => `EWB-2026-${rand(100000, 999999)}`;

/* ============================================
   MAIN SEED
============================================ */

async function main() {
  console.log('🌱 Seeding started...\n');

  await prisma.transaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.eWayBill.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.virtualHub.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();

  /* -------- Dispatcher -------- */
  const dispatcher = await prisma.user.create({
    data: {
      name: 'EcoLogiq Dispatch',
      phone: phone(),
      role: 'DISPATCHER',
    },
  });

  /* -------- Drivers + Trucks -------- */
  const drivers = [];
  const trucks = [];

  for (let i = 0; i < 6; i++) {
    const name = pick(NAMES);
    const city = pick(CITIES);
    const truckInfo = pick(TRUCKS);

    const driver = await prisma.user.create({
      data: {
        name: name.name,
        initials: name.initials,
        phone: phone(),
        role: 'DRIVER',
        homeBaseCity: city.name,
        vehicleType: truckInfo.model,
        currentVehicleNo: vehicleNo(),
      },
    });

    const truck = await prisma.truck.create({
      data: {
        licensePlate: driver.currentVehicleNo,
        model: truckInfo.model,
        type: truckInfo.type,
        capacity: truckInfo.capacity,
        ownerId: driver.id,
        currentLat: city.lat,
        currentLng: city.lng,
      },
    });

    drivers.push(driver);
    trucks.push(truck);
  }

  /* -------- Shippers -------- */
  const shippers = [];
  for (let i = 0; i < 4; i++) {
    shippers.push(
      await prisma.user.create({
        data: {
          name: `Shipper Company ${i + 1}`,
          phone: phone(),
          role: 'SHIPPER',
        },
      })
    );
  }

  /* -------- Shipments → Deliveries → Transactions -------- */
  for (let i = 0; i < 10; i++) {
    const shipper = pick(shippers);
    const driver = pick(drivers);
    const truck = trucks.find((t) => t.ownerId === driver.id);
    const from = pick(CITIES);
    let to = pick(CITIES);
    while (to.name === from.name) to = pick(CITIES);

    const distanceKm = rand(200, 1200);
    const weight = rand(5, 18);

    const shipment = await prisma.shipment.create({
      data: {
        shipperId: shipper.id,
        dispatcherId: dispatcher.id,
        pickupLocation: from.name,
        pickupLat: from.lat,
        pickupLng: from.lng,
        dropLocation: to.name,
        dropLat: to.lat,
        dropLng: to.lng,
        cargoType: pick(CARGO_TYPES),
        cargoWeight: weight,
        estimatedPrice: distanceKm * 18,
        finalPrice: distanceKm * 19,
        status: 'COMPLETED',
      },
    });

    const delivery = await prisma.delivery.create({
      data: {
        driverId: driver.id,
        truckId: truck.id,
        shipmentId: shipment.id,
        pickupLocation: shipment.pickupLocation,
        pickupLat: shipment.pickupLat,
        pickupLng: shipment.pickupLng,
        dropLocation: shipment.dropLocation,
        dropLat: shipment.dropLat,
        dropLng: shipment.dropLng,
        cargoType: shipment.cargoType,
        cargoWeight: shipment.cargoWeight,
        distanceKm,
        packageId: tripId(),
        baseEarnings: distanceKm * 18,
        fuelSurcharge: distanceKm * 2,
        totalEarnings: distanceKm * 20,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await prisma.transaction.create({
      data: {
        driverId: driver.id,
        deliveryId: delivery.id,
        amount: delivery.totalEarnings,
        type: 'BASE_DELIVERY',
        description: 'Delivery completed',
        route: `${from.name} → ${to.name}`,
      },
    });

    /* -------- E-Way Bill (STRING distance – schema safe) -------- */
    await prisma.eWayBill.create({
      data: {
        billNo: ewbNo(),
        vehicleNo: truck.licensePlate,
        from: from.name,
        to: to.name,
        distance: `${distanceKm} km`,
        driverId: driver.id,
        cargoValue: `₹${rand(5, 15)}L`,
        validUntil: new Date(Date.now() + 48 * 3600000),
        status: 'TRANSFERRED',
      },
    });
  }

  console.log('🎉 Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
