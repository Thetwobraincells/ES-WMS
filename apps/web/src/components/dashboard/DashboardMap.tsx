import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import {
  type CircleMarker as LeafletCircleMarker,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
  type Polyline as LeafletPolyline,
} from "leaflet";
import type { MapStop } from "@/services/stop.service";
import type { LiveVehicle } from "@/services/vehicle.service";
import "leaflet/dist/leaflet.css";

type DashboardMapProps = {
  vehicles: LiveVehicle[];
  stops: MapStop[];
  selectedVehicleId: string | null;
  showStops: boolean;
  onSelectVehicle: (vehicleId: string) => void;
  centerOnUser: boolean;
  onCentered: () => void;
};

type MarkerColor = "green" | "orange" | "red";

function getVehicleMarkerColor(vehicle: LiveVehicle): MarkerColor {
  const status = vehicle.status.toLowerCase();
  if (status.includes("full") || status.includes("halt")) {
    return "red";
  }
  if (vehicle.load_percent >= 85) {
    return "orange";
  }
  return "green";
}

function getStopColor(status: MapStop["status"]) {
  if (status === "COMPLETED") return "#2E7D32";
  if (status === "SKIPPED") return "#EF4444";
  if (status === "BACKLOGGED") return "#F59E0B";
  return "#9CA3AF";
}

function buildVehicleIcon(color: MarkerColor, isSelected: boolean) {
  const size = isSelected ? 22 : 18;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;height:${size}px;width:${size}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Marker for route stop waypoints along the path */
function getRouteStopColor(status: string) {
  if (status === "COMPLETED") return "#2E7D32";
  if (status === "SKIPPED") return "#EF4444";
  if (status === "BACKLOGGED") return "#F59E0B";
  if (status === "IN_PROGRESS") return "#3B82F6";
  return "#9CA3AF";
}

export function DashboardMap({
  vehicles,
  stops,
  selectedVehicleId,
  showStops,
  onSelectVehicle,
  centerOnUser,
  onCentered,
}: DashboardMapProps) {
  const initialCenter = useMemo<[number, number]>(() => [19.076, 72.8777], []);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const vehicleMarkersRef = useRef<LeafletMarker[]>([]);
  const stopMarkersRef = useRef<LeafletCircleMarker[]>([]);
  const routePathRef = useRef<LeafletPolyline[]>([]);
  const routeStopMarkersRef = useRef<LeafletCircleMarker[]>([]);

  // ── Initialize map ────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = L.map(mapContainerRef.current).setView(initialCenter, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);
  }, [initialCenter]);

  // ── Vehicle markers ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    vehicleMarkersRef.current.forEach((marker) => marker.removeFrom(map));
    vehicleMarkersRef.current = vehicles
      .filter((vehicle) => vehicle.position)
      .map((vehicle) => {
        const marker = L.marker([vehicle.position!.lat, vehicle.position!.lng], {
          icon: buildVehicleIcon(getVehicleMarkerColor(vehicle), selectedVehicleId === vehicle.id),
        });
        marker
          .bindPopup(
            `<p style="margin:0;font-weight:600;">${vehicle.registration_no}</p><p style="margin:0;font-size:12px;color:#4b5563;">${vehicle.driver?.name ?? "Unassigned"}</p>`,
          )
          .on("click", () => onSelectVehicle(vehicle.id))
          .addTo(map);
        return marker;
      });
  }, [onSelectVehicle, selectedVehicleId, vehicles]);

  // ── Route paths for ALL vehicles (Google Maps style) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up previous route paths + endpoint markers
    routePathRef.current.forEach((line) => line.removeFrom(map));
    routePathRef.current = [];
    routeStopMarkersRef.current.forEach((marker) => marker.removeFrom(map));
    routeStopMarkersRef.current = [];

    // Distinct route colors
    const routeColors = [
      "#4285F4", "#EA4335", "#FBBC04", "#34A853", "#FF6D01",
      "#46BDC6", "#7B1FA2", "#E91E63", "#00ACC1", "#8D6E63",
    ];

    vehicles.forEach((vehicle, vehicleIndex) => {
      if (!vehicle.route_stops || vehicle.route_stops.length < 2) return;

      const routeCoords: [number, number][] = vehicle.route_stops.map((s) => [s.lat, s.lng]);
      const color = routeColors[vehicleIndex % routeColors.length];
      const isSelected = vehicle.id === selectedVehicleId;

      // Outline (darker border behind the main line)
      const outlineLine = L.polyline(routeCoords, {
        color: "#1a1a2e",
        weight: isSelected ? 10 : 7,
        opacity: isSelected ? 0.5 : 0.35,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      routePathRef.current.push(outlineLine);

      // Main solid fill line
      const mainLine = L.polyline(routeCoords, {
        color,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1 : 0.75,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      routePathRef.current.push(mainLine);

      // Start marker — hollow circle (white fill, colored border)
      const startCoord = routeCoords[0];
      const startMarker = L.circleMarker(startCoord, {
        radius: isSelected ? 8 : 6,
        color,
        weight: 3,
        fillColor: "#FFFFFF",
        fillOpacity: 1,
      })
        .bindTooltip(
          `<strong>${vehicle.registration_no}</strong><br/>Start: ${vehicle.route_stops[0].address}`,
          { direction: "top", offset: [0, -10] },
        )
        .addTo(map);
      routeStopMarkersRef.current.push(startMarker);

      // End marker — filled dot (solid color)
      const endCoord = routeCoords[routeCoords.length - 1];
      const endStop = vehicle.route_stops[vehicle.route_stops.length - 1];
      const endMarker = L.circleMarker(endCoord, {
        radius: isSelected ? 8 : 6,
        color: "#FFFFFF",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindTooltip(
          `<strong>${vehicle.registration_no}</strong><br/>End: ${endStop.address}`,
          { direction: "top", offset: [0, -10] },
        )
        .addTo(map);
      routeStopMarkersRef.current.push(endMarker);
    });
  }, [selectedVehicleId, vehicles]);

  // ── Stop layer toggle ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stopMarkersRef.current.forEach((marker) => marker.removeFrom(map));
    if (!showStops) {
      stopMarkersRef.current = [];
      return;
    }

    stopMarkersRef.current = stops.map((stop) =>
      L.circleMarker([stop.lat, stop.lng], {
        radius: 5,
        color: getStopColor(stop.status),
        fillOpacity: 0.8,
      })
        .bindTooltip(stop.address)
        .addTo(map),
    );
  }, [showStops, stops]);

  // ── Center on user ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerOnUser) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo([position.coords.latitude, position.coords.longitude], 14);
        onCentered();
      },
      () => onCentered(),
      { maximumAge: 10000, timeout: 5000 },
    );
  }, [centerOnUser, onCentered]);

  // ── Cleanup ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!mapRef.current) return;
      mapRef.current.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="h-[540px] w-full" />;
}
