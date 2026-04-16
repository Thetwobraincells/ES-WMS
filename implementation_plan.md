# Synchronizing ICCC, Driver, and Citizen Real-Time Demo Flows

This plan addresses the full-circle demo requirements, ensuring that when a Driver skips a stop, especially with "Mixed Waste," the system requires photo proof, notifies the driver (live), and deducts/notifies the Citizen app about the wallet/fine.

## User Review Required

> [!IMPORTANT]
> The demo relies heavily on "live" connectivity. Since WebSockets (`socket.io`) are not baked into the mobile app yet, the UI will implement high-frequency background polling (e.g., refreshing every 5-10 seconds) on the Driver and Citizen dashboards to simulate real-time notification pushes and wallet deduction. If you prefer WebSockets instead, please advise. 

## Proposed Changes

---

### Phase 1: Image Verification for "Mixed Waste" Skip

When the driver selects "Waste Mixed," the skip must not process immediately. Instead, they must submit a geofenced photo.

#### [MODIFY] `apps/mobile/src/navigation/DriverStack.tsx`
- Add an optional `mode?: 'complete' | 'skip_mixed'` to the `CameraProof` route params.

#### [MODIFY] `apps/mobile/src/screens/driver/StopDetail.tsx`
- In `handleSkipConfirmed`, check if `result.reason === 'WASTE_MIXED'`.
- If true, navigate to `CameraProof` with the new `mode` parameter instead of processing the API immediately.

#### [MODIFY] `apps/mobile/src/screens/driver/CameraProof.tsx`
- Read the `mode` param from the route.
- On successful image upload:
  - If `mode === 'skip_mixed'`, run `useRouteStore.getState().skipStop(stopId, 'WASTE_MIXED')`.
  - Else, run the standard `completeStop(stopId)`.
- Update completion alerts to say "Proof of mixed waste saved. Stop Skipped."

---

### Phase 2: Backend Notifications for Drivers

The driver needs to receive alerts when they skip a stop, especially if it was flagged or generally logged for demo visibility.

#### [MODIFY] `server/src/controllers/stop.controller.ts`
- In `skipStop`, add `prisma.notification.create` calls attached to the `req.user.userId` (the Driver) to produce alerts like:
  - `"Skip Claim Flagged"` (for low load TRUCK_FULL skips).
  - `"Stop Skipped"` confirmation for mixed-waste or generic skips, so the driver sees an immediate ping.

#### [NEW] `apps/mobile/src/stores/notificationStore.ts` (or direct fetch Hook)
- Create a simple Zustand store or hook to fetch `GET /api/v1/notifications` on a polling interval.

#### [MODIFY] `apps/mobile/src/screens/driver/AlertsScreen.tsx`
- Remove `MOCK_ALERTS`.
- Use the generated backend notifications array to populate the alerts list.
- Show the unread count in the tab bar (via updated state mapping).

---

### Phase 3: Citizen Wallet & Fines Connectivity

The citizen dashboard currently uses `MOCK_CITIZEN`. It needs to read real `societyStatus` and fine counts so the wallet decreases and fines pop up when the driver skips them.

#### [MODIFY] `apps/mobile/src/screens/citizen/CitizenDashboard.tsx`
- Utilize `useAuthStore` to find the user's mapped `society_id`.
- Use a polling mechanism to continuously fetch `GET /api/v1/societies/:id/status` and `GET /api/v1/societies/:id/fines`.
- Connect the `walletBalance` variable to `society.wallet_balance`.
- Calculate `pendingFines` dynamically by parsing the fines array for `status === "PENDING"`.
- This ensures that if the Driver submits a "Mixed Waste" claim, the Citizen UI will re-render within a few seconds, showing the Fine banner and wallet impact.

## Open Questions

> [!NOTE]
> Currently, the backend creates fines in a `PENDING` state when "Mixed Waste" is logged. Under normal PRD operations, an admin must approve the fine for it to deduct from the wallet (`wallet_balance: { decrement: fine.amount }`). For the sake of the live demo flow to be fully automatic, do you want me to update the backend to *auto-approve* fines (so the wallet drops live), or should the Citizen Dashboard just show the "1 unpaid fine" warning banner without impacting the physical wallet balance until Admin approval?

## Verification Plan

### Automated Tests
- Ensure `npx tsc --noEmit` passes for `apps/mobile`.

### Manual Verification
- In the Driver App, click Skip -> Mixed Waste. Verify the camera opens.
- Take a photo; verify the backend logs the photo and the Stop is marked SKIPPED.
- Go to Driver Alerts tab and verify the new push notification is present.
- Open Citizen App simultaneously, wait 5 seconds, and verify the wallet/fine warning banner appears automatically.
