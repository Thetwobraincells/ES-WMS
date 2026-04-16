import {
  BacklogStatus,
  BinType,
  FineStatus,
  NotificationType,
  PrismaClient,
  Shift,
  SkipReason,
  StopStatus,
  UserRole,
  VehicleStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const addDays = (date: Date, days: number) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const getCurrentShift = () => (new Date().getHours() < 14 ? Shift.AM : Shift.PM);

const getOppositeShift = (shift: Shift) => (shift === Shift.AM ? Shift.PM : Shift.AM);

async function clearDatabase() {
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
}

async function createProofPhoto(params: {
  stopId: string;
  driverId: string;
  lat: number;
  lng: number;
  takenAt: Date;
  geofenceValid?: boolean;
  suffix: string;
}) {
  return prisma.stopPhoto.create({
    data: {
      stop_id: params.stopId,
      driver_id: params.driverId,
      url: `/uploads/${params.suffix}.jpg`,
      lat: params.lat,
      lng: params.lng,
      taken_at: params.takenAt,
      geofence_valid: params.geofenceValid ?? true,
    },
  });
}

async function main() {
  console.log("Seeding ES-WMS database...");

  await clearDatabase();

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(addDays(now, -1));
  const currentShift = getCurrentShift();
  const alternateShift = getOppositeShift(currentShift);
  const adminPasswordHash = await bcrypt.hash("admin123", 12);

  const wardEast = await prisma.ward.create({
    data: { name: "Ward H/East - Chembur", zone: "Eastern Suburbs", area_sq_km: 12.5 },
  });
  const wardKurla = await prisma.ward.create({
    data: { name: "Ward L - Kurla", zone: "Eastern Suburbs", area_sq_km: 9.8 },
  });

  const admins = await Promise.all([
    prisma.user.create({
      data: {
        name: "Mr. Jitendra Jagtap",
        role: UserRole.ADMIN,
        email: "jagtap@bmc.gov.in",
        mobile: "9876543210",
        password_hash: adminPasswordHash,
        ward_id: wardEast.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Sharma",
        role: UserRole.ADMIN,
        email: "priya.it@bmc.gov.in",
        mobile: "9876543211",
        password_hash: adminPasswordHash,
      },
    }),
  ]);

  const supervisors = await Promise.all([
    prisma.user.create({
      data: { name: "Ramesh Mukadam", role: UserRole.SUPERVISOR, mobile: "9111000001", ward_id: wardEast.id },
    }),
    prisma.user.create({
      data: { name: "Suresh Patil", role: UserRole.SUPERVISOR, mobile: "9111000002", ward_id: wardEast.id },
    }),
    prisma.user.create({
      data: { name: "Ganesh Kamble", role: UserRole.SUPERVISOR, mobile: "9111000003", ward_id: wardKurla.id },
    }),
  ]);

  const driverProfiles = [
    { name: "Rajesh Kumar", mobile: "9222000001", ward_id: wardEast.id },
    { name: "Amit Yadav", mobile: "9222000002", ward_id: wardEast.id },
    { name: "Santosh Jadhav", mobile: "9222000003", ward_id: wardEast.id },
    { name: "Manoj Shinde", mobile: "9222000004", ward_id: wardKurla.id },
    { name: "Vinod Pawar", mobile: "9222000005", ward_id: wardKurla.id },
    { name: "Deepak Ghosh", mobile: "9222000006", ward_id: wardEast.id },
    { name: "Raju Chauhan", mobile: "9222000007", ward_id: wardKurla.id },
    { name: "Sunil More", mobile: "9222000008", ward_id: wardEast.id },
    { name: "Prakash Gaikwad", mobile: "9222000009", ward_id: wardKurla.id },
    { name: "Nitin Deshmukh", mobile: "9222000010", ward_id: wardKurla.id },
  ];

  const drivers = await Promise.all(
    driverProfiles.map(profile =>
      prisma.user.create({
        data: {
          name: profile.name,
          role: UserRole.DRIVER,
          mobile: profile.mobile,
          ward_id: profile.ward_id,
        },
      }),
    ),
  );

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: { registration_no: "MH-01-AB-1234", capacity_kg: 5000, vehicle_type: "compactor" },
    }),
    prisma.vehicle.create({
      data: { registration_no: "MH-01-CD-5678", capacity_kg: 5000, vehicle_type: "compactor" },
    }),
    prisma.vehicle.create({
      data: { registration_no: "MH-01-EF-9012", capacity_kg: 3000, vehicle_type: "tipper" },
    }),
    prisma.vehicle.create({
      data: { registration_no: "MH-01-GH-3456", capacity_kg: 4500, vehicle_type: "compactor" },
    }),
    prisma.vehicle.create({
      data: { registration_no: "MH-01-IJ-7890", capacity_kg: 3500, vehicle_type: "tipper" },
    }),
  ]);

  const societyData = [
    { ward_id: wardEast.id, name: "Shanti Nagar CHS", address: "Plot 12, Shanti Nagar, Chembur East", lat: 19.0622, lng: 72.8977 },
    { ward_id: wardEast.id, name: "Sai Krupa Apartments", address: "Sector 7, Chembur Colony", lat: 19.059, lng: 72.894 },
    { ward_id: wardEast.id, name: "Green Valley CHS", address: "Near RC Marg, Chembur", lat: 19.0535, lng: 72.892 },
    { ward_id: wardEast.id, name: "Sunrise Towers", address: "Tilak Nagar, Chembur East", lat: 19.048, lng: 72.8965 },
    { ward_id: wardEast.id, name: "Harmony Heights", address: "Diamond Garden, Chembur West", lat: 19.0612, lng: 72.8856 },
    { ward_id: wardEast.id, name: "Lakshmi CHS", address: "Govandi Station Road", lat: 19.055, lng: 72.908 },
    { ward_id: wardEast.id, name: "Ganga Vihar Society", address: "Deonar, Chembur", lat: 19.0518, lng: 72.912 },
    { ward_id: wardKurla.id, name: "Krishna Nagar CHS", address: "BKC Road, Kurla", lat: 19.07, lng: 72.87 },
    { ward_id: wardKurla.id, name: "Saraswati Apartments", address: "LBS Marg, Kurla West", lat: 19.072, lng: 72.865 },
    { ward_id: wardKurla.id, name: "Om Sai Society", address: "Nehru Nagar, Kurla East", lat: 19.068, lng: 72.878 },
    { ward_id: wardKurla.id, name: "Vivekanand CHS", address: "Kurla Depot Road", lat: 19.075, lng: 72.872 },
    { ward_id: wardKurla.id, name: "Ganesh Niwas", address: "Jari Mari, Kurla", lat: 19.066, lng: 72.88 },
    { ward_id: wardEast.id, name: "Mahatma Phule CHS", address: "Chunabhatti, Sion", lat: 19.044, lng: 72.883 },
    { ward_id: wardEast.id, name: "Ambedkar Society", address: "Sion-Trombay Road", lat: 19.046, lng: 72.887 },
    { ward_id: wardEast.id, name: "Nehru Nagar CHS", address: "Station Road, Chembur", lat: 19.056, lng: 72.895 },
    { ward_id: wardEast.id, name: "Swami Vivekanand CHS", address: "RCF Colony, Chembur", lat: 19.0505, lng: 72.901 },
    { ward_id: wardKurla.id, name: "Shivaji Park Society", address: "BMC Colony, Kurla", lat: 19.071, lng: 72.874 },
    { ward_id: wardEast.id, name: "Tagore Nagar CHS", address: "Vikhroli-Chembur Link", lat: 19.0635, lng: 72.905 },
    { ward_id: wardEast.id, name: "Indira Nagar Society", address: "Turbhe Road, Chembur", lat: 19.0495, lng: 72.903 },
    { ward_id: wardKurla.id, name: "Rajiv Gandhi CHS", address: "MHADA Colony, Kurla", lat: 19.0775, lng: 72.869 },
  ];

  const societies = await Promise.all(
    societyData.map((society, index) =>
      prisma.society.create({
        data: {
          ward_id: society.ward_id,
          name: society.name,
          address: society.address,
          lat: society.lat,
          lng: society.lng,
          contact_name: `Secretary, ${society.name}`,
          contact_mobile: `98${String(index + 1).padStart(8, "0")}`,
          wallet_balance: 10000,
        },
      }),
    ),
  );

  const citizens = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      prisma.user.create({
        data: {
          name: `Citizen Member ${index + 1}`,
          role: UserRole.CITIZEN,
          mobile: `9333000${String(index + 1).padStart(3, "0")}`,
        },
      }),
    ),
  );

  await Promise.all(
    citizens.map((citizen, index) =>
      prisma.societyMember.create({
        data: {
          user_id: citizen.id,
          society_id: societies[index].id,
        },
      }),
    ),
  );

  const primaryRoute = await prisma.route.create({
    data: {
      ward_id: wardEast.id,
      vehicle_id: vehicles[0].id,
      driver_id: drivers[0].id,
      supervisor_id: supervisors[0].id,
      shift: currentShift,
      date: today,
    },
  });

  const primaryStopSpecs = [
    {
      society: societies[0],
      sequence: 1,
      binType: BinType.WET,
      status: StopStatus.COMPLETED,
      completedAt: addMinutes(today, currentShift === Shift.AM ? 390 : 930),
    },
    {
      society: societies[1],
      sequence: 2,
      binType: BinType.DRY,
      status: StopStatus.COMPLETED,
      completedAt: addMinutes(today, currentShift === Shift.AM ? 425 : 965),
    },
    {
      society: societies[2],
      sequence: 3,
      binType: BinType.MIXED,
      status: StopStatus.SKIPPED,
      skipReason: SkipReason.WASTE_MIXED,
      skippedAt: addMinutes(today, currentShift === Shift.AM ? 455 : 995),
    },
    {
      society: societies[3],
      sequence: 4,
      binType: BinType.WET,
      status: StopStatus.IN_PROGRESS,
    },
    { society: societies[4], sequence: 5, binType: BinType.DRY, status: StopStatus.PENDING },
    { society: societies[5], sequence: 6, binType: BinType.MIXED, status: StopStatus.PENDING },
    { society: societies[6], sequence: 7, binType: BinType.WET, status: StopStatus.PENDING },
  ];

  const primaryStops = [];
  for (const spec of primaryStopSpecs) {
    primaryStops.push(
      await prisma.stop.create({
        data: {
          route_id: primaryRoute.id,
          society_id: spec.society.id,
          address: spec.society.address,
          lat: spec.society.lat,
          lng: spec.society.lng,
          bin_type: spec.binType,
          sequence_order: spec.sequence,
          status: spec.status,
          skip_reason: spec.skipReason,
          skipped_at: spec.skippedAt,
          completed_at: spec.completedAt,
        },
      }),
    );
  }

  await createProofPhoto({
    stopId: primaryStops[0].id,
    driverId: drivers[0].id,
    lat: primaryStops[0].lat,
    lng: primaryStops[0].lng,
    takenAt: addMinutes(primaryStopSpecs[0].completedAt!, -3),
    suffix: "seed-primary-stop-1",
  });
  await createProofPhoto({
    stopId: primaryStops[1].id,
    driverId: drivers[0].id,
    lat: primaryStops[1].lat,
    lng: primaryStops[1].lng,
    takenAt: addMinutes(primaryStopSpecs[1].completedAt!, -2),
    suffix: "seed-primary-stop-2",
  });
  await createProofPhoto({
    stopId: primaryStops[3].id,
    driverId: drivers[0].id,
    lat: primaryStops[3].lat + 0.0012,
    lng: primaryStops[3].lng + 0.0012,
    takenAt: addMinutes(now, -10),
    geofenceValid: false,
    suffix: "seed-out-of-range-proof",
  });

  const backlogPending = await prisma.backlogEntry.create({
    data: {
      original_stop_id: primaryStops[2].id,
      reason: SkipReason.WASTE_MIXED,
      status: BacklogStatus.PENDING,
      created_at: addMinutes(today, currentShift === Shift.AM ? 460 : 1000),
    },
  });

  const secondaryRoute = await prisma.route.create({
    data: {
      ward_id: wardEast.id,
      vehicle_id: vehicles[1].id,
      driver_id: drivers[1].id,
      supervisor_id: supervisors[1].id,
      shift: alternateShift,
      date: today,
    },
  });

  for (const [index, society] of societies.slice(7, 13).entries()) {
    await prisma.stop.create({
      data: {
        route_id: secondaryRoute.id,
        society_id: society.id,
        address: society.address,
        lat: society.lat,
        lng: society.lng,
        bin_type: index % 2 === 0 ? BinType.WET : BinType.DRY,
        sequence_order: index + 1,
        status: StopStatus.PENDING,
      },
    });
  }

  const kurlaRoute = await prisma.route.create({
    data: {
      ward_id: wardKurla.id,
      vehicle_id: vehicles[2].id,
      driver_id: drivers[3].id,
      supervisor_id: supervisors[2].id,
      shift: currentShift,
      date: today,
    },
  });

  const kurlaStops = [];
  for (const [index, society] of societies.slice(13, 18).entries()) {
    kurlaStops.push(
      await prisma.stop.create({
        data: {
          route_id: kurlaRoute.id,
          society_id: society.id,
          address: society.address,
          lat: society.lat,
          lng: society.lng,
          bin_type: index % 3 === 0 ? BinType.MIXED : BinType.WET,
          sequence_order: index + 1,
          status: index < 2 ? StopStatus.COMPLETED : StopStatus.PENDING,
          completed_at: index < 2 ? addMinutes(today, currentShift === Shift.AM ? 420 + index * 15 : 960 + index * 15) : null,
        },
      }),
    );
  }

  await createProofPhoto({
    stopId: kurlaStops[0].id,
    driverId: drivers[3].id,
    lat: kurlaStops[0].lat,
    lng: kurlaStops[0].lng,
    takenAt: addMinutes(today, currentShift === Shift.AM ? 418 : 958),
    suffix: "seed-kurla-stop-1",
  });
  await createProofPhoto({
    stopId: kurlaStops[1].id,
    driverId: drivers[3].id,
    lat: kurlaStops[1].lat,
    lng: kurlaStops[1].lng,
    takenAt: addMinutes(today, currentShift === Shift.AM ? 433 : 973),
    suffix: "seed-kurla-stop-2",
  });

  const historicalRoute = await prisma.route.create({
    data: {
      ward_id: wardEast.id,
      vehicle_id: vehicles[3].id,
      driver_id: drivers[4].id,
      supervisor_id: supervisors[0].id,
      shift: alternateShift,
      date: yesterday,
    },
  });

  const historicalCompletedStop = await prisma.stop.create({
    data: {
      route_id: historicalRoute.id,
      society_id: societies[18].id,
      address: societies[18].address,
      lat: societies[18].lat,
      lng: societies[18].lng,
      bin_type: BinType.DRY,
      sequence_order: 1,
      status: StopStatus.COMPLETED,
      completed_at: addMinutes(yesterday, 510),
    },
  });
  const historicalSkippedStop = await prisma.stop.create({
    data: {
      route_id: historicalRoute.id,
      society_id: societies[19].id,
      address: societies[19].address,
      lat: societies[19].lat,
      lng: societies[19].lng,
      bin_type: BinType.MIXED,
      sequence_order: 2,
      status: StopStatus.SKIPPED,
      skip_reason: SkipReason.WASTE_MIXED,
      skipped_at: addMinutes(yesterday, 540),
    },
  });

  await createProofPhoto({
    stopId: historicalCompletedStop.id,
    driverId: drivers[4].id,
    lat: historicalCompletedStop.lat,
    lng: historicalCompletedStop.lng,
    takenAt: addMinutes(yesterday, 505),
    suffix: "seed-history-stop-1",
  });

  // Extra route for Driver 1 on the Alternate Shift
  const primaryRouteAlternate = await prisma.route.create({
    data: {
      ward_id: wardEast.id,
      vehicle_id: vehicles[0].id,
      driver_id: drivers[0].id,
      supervisor_id: supervisors[0].id,
      shift: alternateShift,
      date: today,
    },
  });

  for (const [index, society] of societies.slice(1, 5).entries()) {
    await prisma.stop.create({
      data: {
        route_id: primaryRouteAlternate.id,
        society_id: society.id,
        address: society.address,
        lat: society.lat,
        lng: society.lng,
        bin_type: index % 2 === 0 ? "MIXED" : "WET",
        sequence_order: index + 1,
        status: "PENDING",
      },
    });
  }

  // Extra route for Driver 2 on the Current Shift
  const secondaryRouteCurrent = await prisma.route.create({
    data: {
      ward_id: wardEast.id,
      vehicle_id: vehicles[1].id,
      driver_id: drivers[1].id,
      supervisor_id: supervisors[1].id,
      shift: currentShift,
      date: today,
    },
  });

  for (const [index, society] of societies.slice(8, 12).entries()) {
    await prisma.stop.create({
      data: {
        route_id: secondaryRouteCurrent.id,
        society_id: society.id,
        address: society.address,
        lat: society.lat,
        lng: society.lng,
        bin_type: index % 2 === 0 ? "WET" : "DRY",
        sequence_order: index + 1,
        status: "PENDING",
      },
    });
  }

  const assignedBacklog = await prisma.backlogEntry.create({
    data: {
      original_stop_id: historicalSkippedStop.id,
      new_route_id: secondaryRoute.id,
      reason: SkipReason.WASTE_MIXED,
      status: BacklogStatus.ASSIGNED,
      created_at: addMinutes(yesterday, 545),
    },
  });

  const pendingFine = await prisma.fineEvent.create({
    data: {
      society_id: primaryStops[2].society_id!,
      stop_id: primaryStops[2].id,
      reason: "Waste not segregated (mixed waste detected).",
      amount: 500,
      status: FineStatus.PENDING,
      created_at: addMinutes(today, currentShift === Shift.AM ? 458 : 998),
    },
  });

  const approvedFine = await prisma.fineEvent.create({
    data: {
      society_id: historicalSkippedStop.society_id!,
      stop_id: historicalSkippedStop.id,
      reason: "Repeated mixed waste violation.",
      amount: 500,
      status: FineStatus.APPROVED,
      admin_id: admins[0].id,
      notes: "Approved during daily review.",
      created_at: addMinutes(yesterday, 600),
    },
  });

  await prisma.society.update({
    where: { id: historicalSkippedStop.society_id! },
    data: { wallet_balance: { decrement: approvedFine.amount } },
  });

  await prisma.notification.createMany({
    data: [
      {
        target_society_id: primaryStops[2].society_id,
        type: NotificationType.SKIP_ALERT,
        title: "Collection Skipped for Your Society",
        body: "Reason: WASTE_MIXED. Expected next pickup: Next available shift.",
        sent_at: addMinutes(today, currentShift === Shift.AM ? 462 : 1002),
      },
      {
        target_user_id: citizens[2].id,
        type: NotificationType.SKIP_ALERT,
        title: "Today's Waste Collection Was Skipped",
        body: "Reason: WASTE_MIXED. Expected next pickup: Next available shift.",
        sent_at: addMinutes(today, currentShift === Shift.AM ? 462 : 1002),
      },
      {
        target_user_id: drivers[0].id,
        type: NotificationType.CAPACITY_WARNING,
        title: "Truck Approaching Capacity",
        body: "Vehicle MH-01-AB-1234 is at 84% capacity. 1-2 stops remaining.",
        sent_at: addMinutes(now, -20),
      },
      {
        target_user_id: supervisors[0].id,
        type: NotificationType.FALSE_CLAIM_ALERT,
        title: "Suspicious Truck Full Claim",
        body: "Rajesh Kumar claimed truck full below threshold during training data setup.",
        sent_at: addMinutes(now, -15),
      },
      {
        target_user_id: citizens[11].id,
        type: NotificationType.FINE_ISSUED,
        title: "Fine Approved",
        body: "A Rs. 500 fine has been approved for mixed waste violation.",
        sent_at: addMinutes(yesterday, 610),
      },
    ],
  });

  await prisma.vehicleTelemetry.createMany({
    data: [
      {
        vehicle_id: vehicles[0].id,
        lat: 19.0618,
        lng: 72.8968,
        current_load_kg: 1800,
        status: VehicleStatus.EN_ROUTE,
        recorded_at: addMinutes(now, -90),
      },
      {
        vehicle_id: vehicles[0].id,
        lat: 19.0587,
        lng: 72.8938,
        current_load_kg: 2900,
        status: VehicleStatus.COLLECTING,
        recorded_at: addMinutes(now, -60),
      },
      {
        vehicle_id: vehicles[0].id,
        lat: 19.0538,
        lng: 72.8924,
        current_load_kg: 3600,
        status: VehicleStatus.COLLECTING,
        recorded_at: addMinutes(now, -30),
      },
      {
        vehicle_id: vehicles[0].id,
        lat: 19.0482,
        lng: 72.8967,
        current_load_kg: 4200,
        status: VehicleStatus.COLLECTING,
        recorded_at: addMinutes(now, -5),
      },
      {
        vehicle_id: vehicles[1].id,
        lat: 19.0692,
        lng: 72.8712,
        current_load_kg: 900,
        status: VehicleStatus.EN_ROUTE,
        recorded_at: addMinutes(now, -8),
      },
      {
        vehicle_id: vehicles[2].id,
        lat: 19.0711,
        lng: 72.8738,
        current_load_kg: 1200,
        status: VehicleStatus.COLLECTING,
        recorded_at: addMinutes(now, -12),
      },
      {
        vehicle_id: vehicles[3].id,
        lat: 19.0491,
        lng: 72.9023,
        current_load_kg: 4500,
        status: VehicleStatus.FULL,
        recorded_at: addMinutes(yesterday, 570),
      },
      {
        vehicle_id: vehicles[4].id,
        lat: 19.077,
        lng: 72.8685,
        current_load_kg: 0,
        status: VehicleStatus.IDLE,
        recorded_at: addMinutes(now, -25),
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actor_id: drivers[0].id,
        action: "SKIP_STOP",
        entity_type: "Stop",
        entity_id: primaryStops[2].id,
        new_value: { reason: SkipReason.WASTE_MIXED, backlog_id: backlogPending.id },
        created_at: addMinutes(today, currentShift === Shift.AM ? 459 : 999),
      },
      {
        actor_id: admins[0].id,
        action: "APPROVE_FINE",
        entity_type: "FineEvent",
        entity_id: approvedFine.id,
        new_value: { status: FineStatus.APPROVED, amount: approvedFine.amount },
        created_at: addMinutes(yesterday, 602),
      },
      {
        actor_id: admins[0].id,
        action: "ASSIGN_BACKLOG",
        entity_type: "BacklogEntry",
        entity_id: assignedBacklog.id,
        new_value: { new_route_id: secondaryRoute.id, status: BacklogStatus.ASSIGNED },
        created_at: addMinutes(yesterday, 548),
      },
    ],
  });

  console.log("Seed completed successfully.");
  console.log("");
  console.log("Testing credentials");
  console.log(`Admin:   jagtap@bmc.gov.in / admin123`);
  console.log(`Admin:   priya.it@bmc.gov.in / admin123`);
  console.log(`Driver:  9222000001 (current-shift route on ${currentShift})`);
  console.log(`Driver:  9222000002 (alternate-shift route on ${alternateShift})`);
  console.log(`Citizen: 9333000003 (mapped to skipped society with notifications)`);
  console.log(`Citizen: 9333000012 (mapped to society with approved fine history)`);
  console.log("");
  console.log(
    `Created ${societies.length} societies, ${drivers.length} drivers, ${citizens.length} citizens, 4 routes, ${pendingFine.status.toLowerCase()} fine, and seeded telemetry/backlog records.`,
  );
}

main()
  .catch(error => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
