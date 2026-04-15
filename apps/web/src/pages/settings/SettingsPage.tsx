import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSectionCard } from "@/components/settings/SettingsSectionCard";
import {
  getSystemSettings,
  updateSystemSetting,
  type SystemSetting,
  type SystemSettingKey,
} from "@/services/settings.service";
import { Save } from "lucide-react";

type SettingsForm = {
  geofence_radius: string;
  fine_amount: string;
  alert_thresholds: string;
  notification_templates: string;
};

const DEFAULT_FORM: SettingsForm = {
  geofence_radius: "",
  fine_amount: "",
  alert_thresholds: "",
  notification_templates: "Truck full alert template\nSkip alert template\nFine issued template",
};

function mapSettingsToForm(settings: SystemSetting[]): SettingsForm {
  const byKey = new Map(settings.map((item) => [item.key, item.value]));
  return {
    geofence_radius: String(byKey.get("GEOFENCE_RADIUS_METERS") ?? ""),
    fine_amount: String(byKey.get("DEFAULT_FINE_AMOUNT") ?? ""),
    alert_thresholds: String(byKey.get("TRUCK_FULL_THRESHOLD_PERCENT") ?? ""),
    notification_templates: DEFAULT_FORM.notification_templates,
  };
}

export function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const settings = await getSystemSettings();
      setForm(mapSettingsToForm(settings));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const savePayload = useMemo(
    () => [
      { key: "GEOFENCE_RADIUS_METERS" as SystemSettingKey, value: Number(form.geofence_radius) },
      { key: "DEFAULT_FINE_AMOUNT" as SystemSettingKey, value: Number(form.fine_amount) },
      { key: "TRUCK_FULL_THRESHOLD_PERCENT" as SystemSettingKey, value: Number(form.alert_thresholds) },
    ],
    [form.alert_thresholds, form.fine_amount, form.geofence_radius],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await Promise.all(savePayload.map((item) => updateSystemSetting(item.key, item.value)));
      setSuccess("Configuration saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure operational thresholds and notification defaults</p>
        </header>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}
        {success ? (
          <Card className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-center text-sm text-gray-500">Loading settings...</Card>
        ) : (
          <>
            <SettingsSectionCard
              title="Geofence Radius"
              description="Maximum distance allowed for geotagged stop verification."
            >
              <Input
                type="number"
                value={form.geofence_radius}
                onChange={(event) => setForm((prev) => ({ ...prev, geofence_radius: event.target.value }))}
                placeholder="Meters"
              />
            </SettingsSectionCard>

            <SettingsSectionCard
              title="Fine Amount"
              description="Default penalty applied to mixed waste violations."
            >
              <Input
                type="number"
                value={form.fine_amount}
                onChange={(event) => setForm((prev) => ({ ...prev, fine_amount: event.target.value }))}
                placeholder="Amount"
              />
            </SettingsSectionCard>

            <SettingsSectionCard
              title="Alert Thresholds"
              description="Truck-full validation threshold percentage for operational alerts."
            >
              <Input
                type="number"
                value={form.alert_thresholds}
                onChange={(event) => setForm((prev) => ({ ...prev, alert_thresholds: event.target.value }))}
                placeholder="Percentage"
              />
            </SettingsSectionCard>

            <SettingsSectionCard
              title="Notification Templates"
              description="Template preview for operational notifications (read-only)."
            >
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-surface-border bg-surface p-3.5 text-sm text-gray-700 outline-none"
                value={form.notification_templates}
                onChange={(event) => setForm((prev) => ({ ...prev, notification_templates: event.target.value }))}
                readOnly
              />
            </SettingsSectionCard>
          </>
        )}
      </div>

      <div className="sticky bottom-4 mx-auto mt-5 flex max-w-5xl justify-end">
        <Button variant="primary" onClick={handleSave} disabled={saving || loading}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </main>
  );
}
