import { CurrencyText } from "@/components/ui/CurrencyText";
import { useOnboardingStore, type Frequency } from "@/store/onboardingStore";
import { env } from "@tikli/env/native";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STEPS = ["Name", "Frequency", "Amount", "Members", "Start Date", "Review"];
const TOTAL_STEPS = STEPS.length;

const FREQUENCY_OPTIONS: { value: Frequency; label: string; desc: string }[] = [
  { value: "weekly", label: "Weekly", desc: "Every 7 days" },
  { value: "biweekly", label: "Bi-weekly", desc: "Every 14 days" },
  { value: "monthly", label: "Monthly", desc: "Once a month" },
];

export default function NewGroupScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { step, form, nextStep, prevStep, setField, reset } = useOnboardingStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const potAmountCentavos =
    (parseFloat(form.contributionAmount || "0") * 100) * form.maxMembers;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          contributionAmount: Math.round(parseFloat(form.contributionAmount) * 100),
          frequency: form.frequency,
          startDate: form.startDate.getTime(),
          maxMembers: form.maxMembers,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to create group");
      }

      reset();
      router.replace("/(app)/(tabs)/groups");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim().length >= 3;
    if (step === 2) return parseFloat(form.contributionAmount || "0") >= 1;
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (step === 0) { reset(); router.back(); }
              else prevStep();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
              {STEPS[step]}
            </Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
              Step {step + 1} of {TOTAL_STEPS}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: "#F3F4F6", marginHorizontal: 20, borderRadius: 2 }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: "#1D9E75",
              width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
            }}
          />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 0: Name */}
          {step === 0 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                What's your paluwagan called?
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                Give it a name your members will recognize.
              </Text>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: "#1D9E75",
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 17,
                  color: "#111827",
                  backgroundColor: "#F0FDF8",
                  marginBottom: 16,
                }}
                value={form.name}
                onChangeText={(v) => setField("name", v)}
                placeholder="e.g. Barkada Paluwagan 2026"
                placeholderTextColor="#9CA3AF"
                maxLength={80}
                autoFocus
              />
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 15,
                  color: "#374151",
                  backgroundColor: "#FAFAFA",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                value={form.description}
                onChangeText={(v) => setField("description", v)}
                placeholder="Optional description…"
                placeholderTextColor="#9CA3AF"
                maxLength={200}
                multiline
              />
            </View>
          )}

          {/* Step 1: Frequency */}
          {step === 1 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                How often do members contribute?
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                This sets the rhythm of your paluwagan.
              </Text>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    borderWidth: 2,
                    borderColor: form.frequency === opt.value ? "#1D9E75" : "#E5E7EB",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 12,
                    backgroundColor: form.frequency === opt.value ? "#F0FDF8" : "#ffffff",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onPress={() => setField("frequency", opt.value)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>{opt.label}</Text>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>{opt.desc}</Text>
                  </View>
                  {form.frequency === opt.value && (
                    <Text style={{ fontSize: 20, color: "#1D9E75" }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 2: Contribution Amount */}
          {step === 2 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                How much per contribution?
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                Every member pays this amount each cycle.
              </Text>
              <View
                style={{
                  borderWidth: 2,
                  borderColor: "#1D9E75",
                  borderRadius: 14,
                  padding: 16,
                  backgroundColor: "#F0FDF8",
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#1D9E75", marginRight: 8 }}>₱</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 28, fontWeight: "700", color: "#111827" }}
                  value={form.contributionAmount}
                  onChangeText={(v) => setField("contributionAmount", v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
              </View>
              {form.contributionAmount && parseFloat(form.contributionAmount) > 0 && (
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  Pot size: ₱{(parseFloat(form.contributionAmount) * form.maxMembers).toLocaleString()} ({form.maxMembers} members)
                </Text>
              )}
            </View>
          )}

          {/* Step 3: Max Members */}
          {step === 3 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                How many members?
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                This is the total number of slots in the rotation.
              </Text>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Text style={{ fontSize: 64, fontWeight: "800", color: "#1D9E75" }}>
                  {form.maxMembers}
                </Text>
                <Text style={{ fontSize: 15, color: "#6B7280" }}>members</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 16 }}>
                <TouchableOpacity
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: form.maxMembers <= 2 ? "#F3F4F6" : "#F0FDF8",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: form.maxMembers <= 2 ? "#E5E7EB" : "#1D9E75",
                  }}
                  onPress={() => setField("maxMembers", Math.max(2, form.maxMembers - 1))}
                  disabled={form.maxMembers <= 2}
                >
                  <Text style={{ fontSize: 24, color: form.maxMembers <= 2 ? "#9CA3AF" : "#1D9E75", fontWeight: "700" }}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: form.maxMembers >= 30 ? "#F3F4F6" : "#F0FDF8",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: form.maxMembers >= 30 ? "#E5E7EB" : "#1D9E75",
                  }}
                  onPress={() => setField("maxMembers", Math.min(30, form.maxMembers + 1))}
                  disabled={form.maxMembers >= 30}
                >
                  <Text style={{ fontSize: 24, color: form.maxMembers >= 30 ? "#9CA3AF" : "#1D9E75", fontWeight: "700" }}>+</Text>
                </TouchableOpacity>
              </View>
              {form.contributionAmount && parseFloat(form.contributionAmount) > 0 && (
                <View
                  style={{
                    marginTop: 24,
                    backgroundColor: "#F0FDF8",
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: "#374151", fontWeight: "600" }}>Pot Amount</Text>
                  <Text style={{ color: "#1D9E75", fontWeight: "800", fontSize: 16 }}>
                    ₱{(parseFloat(form.contributionAmount) * form.maxMembers).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step 4: Start Date */}
          {step === 4 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                When does it start?
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                First contribution due date.
              </Text>
              <View style={{ gap: 12 }}>
                {[0, 7, 14, 30].map((days) => {
                  const d = new Date();
                  d.setDate(d.getDate() + days);
                  const label = days === 0 ? "Today" : days === 7 ? "In 1 week" : days === 14 ? "In 2 weeks" : "In 1 month";
                  const isSelected = form.startDate.toDateString() === d.toDateString();
                  return (
                    <TouchableOpacity
                      key={days}
                      style={{
                        borderWidth: 2,
                        borderColor: isSelected ? "#1D9E75" : "#E5E7EB",
                        borderRadius: 14,
                        padding: 16,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        backgroundColor: isSelected ? "#F0FDF8" : "#ffffff",
                      }}
                      onPress={() => setField("startDate", d)}
                    >
                      <Text style={{ fontWeight: "700", color: "#111827" }}>{label}</Text>
                      <Text style={{ color: "#6B7280" }}>
                        {d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 24 }}>
                Review & Create
              </Text>

              {[
                ["Group Name", form.name],
                ["Frequency", FREQUENCY_OPTIONS.find((o) => o.value === form.frequency)?.label ?? ""],
                ["Contribution", `₱${parseFloat(form.contributionAmount || "0").toLocaleString()}`],
                ["Members", form.maxMembers.toString()],
                ["Pot Amount", `₱${(parseFloat(form.contributionAmount || "0") * form.maxMembers).toLocaleString()}`],
                ["Start Date", form.startDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })],
              ].map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <Text style={{ color: "#6B7280", fontSize: 14 }}>{label}</Text>
                  <Text style={{ color: "#111827", fontWeight: "700", fontSize: 14 }}>{value}</Text>
                </View>
              ))}

              {error && (
                <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginTop: 16 }}>
                  <Text style={{ color: "#DC2626", fontSize: 13 }}>{error}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer CTA */}
        <View style={{ padding: 20, paddingBottom: Platform.OS === "ios" ? 8 : 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: canProceed() ? "#1D9E75" : "#A7F3D0",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
            }}
            onPress={step === TOTAL_STEPS - 1 ? handleSubmit : nextStep}
            disabled={!canProceed() || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
                {step === TOTAL_STEPS - 1 ? "Create Paluwagan" : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
