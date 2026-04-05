import { PrismaClient, UserRole, Shift, BinType, StopStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ES-WMS database...\n");

  // ─── Clear existing data ──────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.fineEvent.deleteMany();
  await prisma.backlogEntry.deleteMany();
  await prisma.stopPhoto.deleteMany();
  await prisma.vehicleTelemetry.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.societyMember.deleteMany();
  await prisma.route.deleteMany();
  await prisma.society.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ward.deleteMany();

  console.log("🗑️  Cleared existing data.\n");

  // ─── Wards ────────────────────────────────────────────────────────────────
  const ward1 = await prisma.ward.create({
    data: { name: "Ward H/East - Chembur", zone: "Eastern Suburbs", area_sq_km: 12.5 },
  });
  const ward2 = await prisma.ward.create({
    data: { name: "Ward L - Kurla", zone: "Eastern Suburbs", area_sq_km: 9.8 },
  });
  console.log("✅ Created 2 wards");

  // ─── Admin Users ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);

  const admin1 = await prisma.user.create({
    data: {
      name: "Mr. Jitendra Jagtap",
      role: UserRole.ADMIN,
      email: "jagtap@bmc.gov.in",
      mobile: "9876543210",
      password_hash: adminHash,
      ward_id: ward1.id,
    },
  });
  const admin2 = await prisma.user.create({
    data: {
      name: "Priya Sharma (IT Admin)",
      role: UserRole.ADMIN,
      email: "priya.it@bmc.gov.in",
      mobile: "9876543211",
      password_hash: adminHash,
    },
  });
  console.log("✅ Created 2 admin users (password: admin123)");

  // ─── Supervisors ──────────────────────────────────────────────────────────
  const sup1 = await prisma.user.create({
    data: { name: "Ramesh Mukadam", role: UserRole.SUPERVISOR, mobile: "9111000001", ward_id: ward1.id },
  });
  const sup2 = await prisma.user.create({
    data: { name: "Suresh Patil", role: UserRole.SUPERVISOR, mobile: "9111000002", ward_id: ward1.id },
  });
  const sup3 = await prisma.user.create({
    data: { name: "Ganesh Kamble", role: UserRole.SUPERVISOR, mobile: "9111000003", ward_id: ward2.id },
  });
  console.log("✅ Created 3 supervisors");

  // ─── Drivers ──────────────────────────────────────────────────────────────
  const drivers = await Promise.all([
    prisma.user.create({ data: { name: "Rajesh Kumar", role: UserRole.DRIVER, mobile: "9222000001", ward_id: ward1.id } }),
    prisma.user.create({ data: { name: "Amit Yadav", role: UserRole.DRIVER, mobile: "9222000002", ward_id: ward1.id } }),
    prisma.user.create({ data: { name: "Santosh Jadhav", role: UserRole.DRIVER, mobile: "9222000003", ward_id: ward1.id } }),
    prisma.user.create({ data: { name: "Manoj Shinde", role: UserRole.DRIVER, mobile: "9222000004", ward_id: ward2.id } }),
    prisma.user.create({ data: { name: "Vinod Pawar", role: UserRole.DRIVER, mobile: "9222000005", ward_id: ward2.id } }),
    prisma.user.create({ data: { name: "Deepak Ghosh", role: UserRole.DRIVER, mobile: "9222000006", ward_id: ward1.id } }),
    prisma.user.create({ data: { name: "Raju Chauhan", role: UserRole.DRIVER, mobile: "9222000007", ward_id: ward2.id } }),
    prisma.user.create({ data: { name: "Sunil More", role: UserRole.DRIVER, mobile: "9222000008", ward_id: ward1.id } }),
    prisma.user.create({ data: { name: "Prakash Gaikwad", role: UserRole.DRIVER, mobile: "9222000009", ward_id: ward2.id } }),
    prisma.user.create({ data: { name: "Nitin Deshmukh", role: UserRole.DRIVER, mobile: "9222000010", ward_id: ward2.id } }),
  ]);
  console.log("✅ Created 10 drivers");

  // ─── Vehicles ─────────────────────────────────────────────────────────────
  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { registration_no: "MH-01-AB-1234", capacity_kg: 5000, vehicle_type: "compactor" } }),
    prisma.vehicle.create({ data: { registration_no: "MH-01-CD-5678", capacity_kg: 5000, vehicle_type: "compactor" } }),
    prisma.vehicle.create({ data: { registration_no: "MH-01-EF-9012", capacity_kg: 3000, vehicle_type: "tipper" } }),
    prisma.vehicle.create({ data: { registration_no: "MH-01-GH-3456", capacity_kg: 5000, vehicle_type: "compactor" } }),
    prisma.vehicle.create({ data: { registration_no: "MH-01-IJ-7890", capacity_kg: 3000, vehicle_type: "tipper" } }),
  ]);
  console.log("✅ Created 5 vehicles");

  // ─── Societies (Chembur area) ─────────────────────────────────────────────
  const societyData = [
    { name: "Shanti Nagar CHS", address: "Plot 12, Shanti Nagar, Chembur East", lat: 19.0622, lng: 72.8977, ward: ward1 },
    { name: "Sai Krupa Apartments", address: "Sector 7, Chembur Colony", lat: 19.0590, lng: 72.8940, ward: ward1 },
    { name: "Green Valley CHS", address: "Near RC Marg, Chembur", lat: 19.0535, lng: 72.8920, ward: ward1 },
    { name: "Sunrise Towers", address: "Tilak Nagar, Chembur East", lat: 19.0480, lng: 72.8965, ward: ward1 },
    { name: "Harmony Heights", address: "Diamond Garden, Chembur West", lat: 19.0612, lng: 72.8856, ward: ward1 },
    { name: "Lakshmi CHS", address: "Govandi Station Road", lat: 19.0550, lng: 72.9080, ward: ward1 },
    { name: "Ganga Vihar Society", address: "Deonar, Chembur", lat: 19.0518, lng: 72.9120, ward: ward1 },
    { name: "Krishna Nagar CHS", address: "BKC Road, Kurla", lat: 19.0700, lng: 72.8700, ward: ward2 },
    { name: "Saraswati Apartments", address: "LBS Marg, Kurla West", lat: 19.0720, lng: 72.8650, ward: ward2 },
    { name: "Om Sai Society", address: "Nehru Nagar, Kurla East", lat: 19.0680, lng: 72.8780, ward: ward2 },
    { name: "Vivekanand CHS", address: "Kurla Depot Road", lat: 19.0750, lng: 72.8720, ward: ward2 },
    { name: "Ganesh Niwas", address: "Jari Mari, Kurla", lat: 19.0660, lng: 72.8800, ward: ward2 },
    { name: "Mahatma Phule CHS", address: "Chunabhatti, Sion", lat: 19.0440, lng: 72.8830, ward: ward1 },
    { name: "Ambedkar Society", address: "Sion-Trombay Road", lat: 19.0460, lng: 72.8870, ward: ward1 },
    { name: "Nehru Nagar CHS", address: "Station Road, Chembur", lat: 19.0560, lng: 72.8950, ward: ward1 },
    { name: "Swami Vivekanand CHS", address: "RCF Colony, Chembur", lat: 19.0505, lng: 72.9010, ward: ward1 },
    { name: "Shivaji Park Society", address: "BMC Colony, Kurla", lat: 19.0710, lng: 72.8740, ward: ward2 },
    { name: "Tagore Nagar CHS", address: "Vikhroli-Chembur Link", lat: 19.0635, lng: 72.9050, ward: ward1 },
    { name: "Indira Nagar Society", address: "Turbhe Road, Chembur", lat: 19.0495, lng: 72.9030, ward: ward1 },
    { name: "Rajiv Gandhi CHS", address: "MHADA Colony, Kurla", lat: 19.0775, lng: 72.8690, ward: ward2 },
  ];

  const societies = await Promise.all(
    societyData.map((s) =>
      prisma.society.create({
        data: {
          name: s.name,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          ward_id: s.ward.id,
          wallet_balance: 10000,
          contact_name: `Secretary, ${s.name}`,
          contact_mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
      })
    )
  );
  console.log("✅ Created 20 societies");

  // ─── Citizen Users + Society Memberships ───────────────────────────────────
  const citizens = await Promise.all(
    societies.slice(0, 10).map((s, i) =>
      prisma.user.create({
        data: {
          name: `Citizen Member ${i + 1}`,
          role: UserRole.CITIZEN,
          mobile: `9333000${(i + 1).toString().padStart(3, "0")}`,
        },
      })
    )
  );

  await Promise.all(
    citizens.map((c, i) =>
      prisma.societyMember.create({
        data: { user_id: c.id, society_id: societies[i].id },
      })
    )
  );
  console.log("✅ Created 10 citizen users with society memberships");

  // ─── Routes with Stops ────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Route 1: Chembur East AM
  const route1 = await prisma.route.create({
    data: {
      ward_id: ward1.id,
      vehicle_id: vehicles[0].id,
      driver_id: drivers[0].id,
      supervisor_id: sup1.id,
      shift: Shift.AM,
      date: today,
    },
  });

  const route1Stops = societies.slice(0, 7).map((s, i) => ({
    route_id: route1.id,
    society_id: s.id,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    bin_type: i % 3 === 0 ? BinType.WET : i % 3 === 1 ? BinType.DRY : BinType.MIXED,
    sequence_order: i + 1,
    status: StopStatus.PENDING,
  }));
  await prisma.stop.createMany({ data: route1Stops });

  // Route 2: Chembur West PM
  const route2 = await prisma.route.create({
    data: {
      ward_id: ward1.id,
      vehicle_id: vehicles[1].id,
      driver_id: drivers[1].id,
      supervisor_id: sup2.id,
      shift: Shift.PM,
      date: today,
    },
  });

  const route2Stops = societies.slice(7, 14).map((s, i) => ({
    route_id: route2.id,
    society_id: s.id,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    bin_type: i % 2 === 0 ? BinType.WET : BinType.DRY,
    sequence_order: i + 1,
    status: StopStatus.PENDING,
  }));
  await prisma.stop.createMany({ data: route2Stops });

  // Route 3: Kurla AM
  const route3 = await prisma.route.create({
    data: {
      ward_id: ward2.id,
      vehicle_id: vehicles[2].id,
      driver_id: drivers[3].id,
      supervisor_id: sup3.id,
      shift: Shift.AM,
      date: today,
    },
  });

  const route3Stops = societies.slice(14, 20).map((s, i) => ({
    route_id: route3.id,
    society_id: s.id,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    bin_type: BinType.MIXED,
    sequence_order: i + 1,
    status: StopStatus.PENDING,
  }));
  await prisma.stop.createMany({ data: route3Stops });

  console.log("✅ Created 3 routes with 20 total stops");

  // ─── Sample Telemetry ─────────────────────────────────────────────────────
  await prisma.vehicleTelemetry.createMany({
    data: [
      { vehicle_id: vehicles[0].id, lat: 19.0622, lng: 72.8977, current_load_kg: 1200, status: "EN_ROUTE" },
      { vehicle_id: vehicles[1].id, lat: 19.0700, lng: 72.8700, current_load_kg: 0, status: "IDLE" },
      { vehicle_id: vehicles[2].id, lat: 19.0720, lng: 72.8650, current_load_kg: 800, status: "COLLECTING" },
    ],
  });
  console.log("✅ Created sample telemetry data");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin:  jagtap@bmc.gov.in / admin123");
  console.log("   Admin:  priya.it@bmc.gov.in / admin123");
  console.log("   Driver: 9222000001 (use OTP flow)");
  console.log("   Citizen: 9333000001 (use OTP flow)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
