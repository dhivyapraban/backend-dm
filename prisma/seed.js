const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.activityLog.deleteMany({});
  await prisma.eWayBill.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.relayNode.deleteMany({});
  await prisma.truck.deleteMany({});
  await prisma.virtualHub.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Users (Drivers and Shippers)
  const suresh = await prisma.user.create({
    data: {
      name: 'Suresh Kumar',
      phone: '+91 98765 00001',
      role: 'DRIVER',
      rating: 4.8,
      deliveriesCount: 142,
      status: 'ON_DUTY',
      avatarColor: 'bg-orange-500',
      initials: 'SK',
      vehicleType: 'Heavy Truck',
      currentVehicleNo: 'GJ-01-AB-1234',
      homeBaseCity: 'Ahmedabad'
    }
  });

  const ramesh = await prisma.user.create({
    data: {
      name: 'Ramesh Singh',
      phone: '+91 98765 00002',
      role: 'DRIVER',
      rating: 4.5,
      deliveriesCount: 98,
      status: 'RESTING',
      avatarColor: 'bg-blue-500',
      initials: 'RS',
      vehicleType: 'Trailer',
      currentVehicleNo: 'MH-12-CD-5678',
      homeBaseCity: 'Pune'
    }
  });

  const vikram = await prisma.user.create({
    data: {
      name: 'Vikram Patel',
      phone: '+91 98765 00003',
      role: 'DRIVER',
      rating: 4.9,
      deliveriesCount: 215,
      status: 'IN_TRANSIT',
      avatarColor: 'bg-emerald-500',
      initials: 'VP',
      vehicleType: 'Container',
      currentVehicleNo: 'GJ-05-EF-9012',
      homeBaseCity: 'Surat'
    }
  });

  const shipper = await prisma.user.create({
    data: {
      name: 'Urban Park Logistics',
      phone: '+91 99999 99999',
      role: 'EXTERNAL_SHIPPER',
    }
  });

  // 2. Create Activity Logs
  const activityData = [
    { day: 'Mon', requests: 18 },
    { day: 'Tue', requests: 22 },
    { day: 'Wed', requests: 20 },
    { day: 'Thu', requests: 19 },
    { day: 'Fri', requests: 28 },
    { day: 'Sat', requests: 15 },
    { day: 'Sun', requests: 12 },
  ];

  for (const item of activityData) {
    await prisma.activityLog.create({
      data: {
        day: item.day,
        requests: item.requests,
        type: 'WEEKLY_ACTIVITY'
      }
    });
  }

  // 3. Create Shipments (Absorption Requests)
  await prisma.shipment.create({
    data: {
      shipperId: shipper.id,
      type: 'Electronics',
      route: 'Ahmedabad → Mumbai',
      weight: '8.5T',
      priority: 'HIGH',
      status: 'ACTIVE'
    }
  });

  await prisma.shipment.create({
    data: {
      shipperId: shipper.id,
      type: 'Textiles',
      route: 'Surat → Delhi',
      weight: '12.3T',
      priority: 'MEDIUM',
      status: 'PENDING'
    }
  });

  await prisma.shipment.create({
    data: {
      shipperId: shipper.id,
      type: 'Furniture',
      route: 'Pune → Bangalore',
      weight: '6.7T',
      priority: 'LOW',
      status: 'PENDING'
    }
  });

  // 4. Create E-Way Bills
  await prisma.eWayBill.create({
    data: {
      billNo: 'EWB-2024-001',
      vehicleNo: 'GJ-01-AB-5678',
      from: 'Ahmedabad',
      to: 'Mumbai',
      distance: '520 km',
      driverId: suresh.id,
      cargoValue: '₹8.5L',
      validUntil: new Date('2024-01-26T18:00:00Z'),
      status: 'ACTIVE'
    }
  });

  await prisma.eWayBill.create({
    data: {
      billNo: 'EWB-2024-002',
      vehicleNo: 'MH-02-CD-1234',
      from: 'Pune',
      to: 'Delhi',
      distance: '1,450 km',
      driverId: ramesh.id,
      cargoValue: '₹12.3L',
      validUntil: new Date('2024-01-26T20:00:00Z'),
      status: 'ACTIVE'
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
