import { Avatar } from "@/components/ui/Avatar";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { api } from "@tikli/backend/convex/_generated/api";
import { useAuth } from "@clerk/expo";
import { env } from "@tikli/env/native";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  paid:    { bg: "#D1FAE5", text: "#065F46", label: "✓" },
  late:    { bg: "#FEF3C7", text: "#92400E", label: "⏰" },
  excused: { bg: "#E0E7FF", text: "#3730A3", label: "—" },
  pending: { bg: "#F3F4F6", text: "#9CA3AF", label: "•" },
};

export default function PaymentsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const cycles = useQuery(api.cycles.listForGroup, { groupId: groupId as never });
  const members = useQuery(api.members.listForGroup, { groupId: groupId as never });
  const memberForUser = useQuery(api.members.getMemberForUser, { groupId: groupId as never });

  const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);
  const [markingPayment, setMarkingPayment] = useState<{ paymentId: string; memberName: string } | null>(null);
  const [markStatus, setMarkStatus] = useState<"paid" | "late" | "excused">("paid");
  const [markNotes, setMarkNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCycle = cycles?.[selectedCycleIndex];
  const cyclePayments = useQuery(
    api.payments.listForCycle,
    selectedCycle ? { cycleId: selectedCycle._id } : "skip",
  );

  const isOrganizer = group && memberForUser && group.organizerId === memberForUser.userId;
  const canCompleteCycle =
    isOrganizer &&
    selectedCycle?.status === "active" &&
    cyclePayments?.every((p) => p.status !== "pending");

  const handleMark = async () => {
    if (!markingPayment) return;
    setSubmitting(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/payments/${markingPayment.paymentId}/mark`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: markStatus, notes: markNotes || undefined }),
        },
      );
      if (!res.ok) throw new Error("Failed to mark payment");
      setMarkingPayment(null);
      setMarkNotes("");
    } catch {
      Alert.alert("Error", "Could not mark payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteCycle = async () => {
    if (!selectedCycle) return;
    Alert.alert(
      "Complete Cycle?",
      "This will close the current cycle and move to the next one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              const token = await getToken({ template: "convex" });
              const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/cycle-complete`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ cycleId: selectedCycle._id }),
              });
              if (!res.ok) throw new Error("Server returned an error");
            } catch {
              Alert.alert("Error", "Could not complete cycle.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ fontSize: 22 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginLeft: 16 }}>
              Payments
            </Text>
          </View>

          {/* Cycle selector */}
          <Skeleton
            isLoading={cycles === undefined}
            skeleton={<SkeletonBlock width="100%" height={40} borderRadius={12} />}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {cycles?.map((cycle, idx) => (
                  <TouchableOpacity
                    key={cycle._id}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: selectedCycleIndex === idx ? "#1D9E75" : "#ffffff",
                      borderWidth: 1,
                      borderColor: selectedCycleIndex === idx ? "#1D9E75" : "#E5E7EB",
                    }}
                    onPress={() => setSelectedCycleIndex(idx)}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color: selectedCycleIndex === idx ? "#ffffff" : "#374151",
                      }}
                    >
                      Cycle {idx + 1}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: selectedCycleIndex === idx ? "#A7F3D0" : "#9CA3AF",
                      }}
                    >
                      {cycle.status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Skeleton>
        </View>

        {/* Payment Grid */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          <Skeleton
            isLoading={cyclePayments === undefined || members === undefined}
            skeleton={
              <View style={{ gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <SkeletonBlock width={40} height={40} borderRadius={12} />
                    <SkeletonBlock width="60%" height={14} />
                    <SkeletonBlock width={40} height={32} borderRadius={8} />
                  </View>
                ))}
              </View>
            }
          >
            {members?.map((member) => {
              const payment = cyclePayments?.find((p) => p.memberId === member._id);
              const statusInfo = STATUS_COLOR[payment?.status ?? "pending"]!;

              return (
                <View
                  key={member._id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                  }}
                >
                  <Avatar
                    name={member.user?.displayName}
                    phone={member.user?.phoneNumber}
                    color={member.user?.avatarColor}
                    size="md"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
                      {member.user?.displayName ?? member.user?.phoneNumber ?? "Member"}
                    </Text>
                    {payment?.markedAt && (
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {new Date(payment.markedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: statusInfo.bg,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      minWidth: 48,
                      alignItems: "center",
                    }}
                    onPress={() => {
                      if (!isOrganizer || !payment) return;
                      if (payment.status !== "pending") return;
                      setMarkingPayment({
                        paymentId: payment._id,
                        memberName: member.user?.displayName ?? member.user?.phoneNumber ?? "Member",
                      });
                      setMarkStatus("paid");
                    }}
                    disabled={!isOrganizer || payment?.status !== "pending"}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16, color: statusInfo.text, fontWeight: "700" }}>
                      {statusInfo.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </Skeleton>

          {/* Legend */}
          <View style={{ flexDirection: "row", gap: 16, marginTop: 8, marginBottom: 24 }}>
            {Object.entries(STATUS_COLOR).map(([status, { bg, text, label }]) => (
              <View key={status} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, color: text, fontWeight: "800" }}>{label}</Text>
                </View>
                <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{status}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Complete Cycle CTA */}
        {canCompleteCycle && (
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#F3F4F6", backgroundColor: "#ffffff" }}>
            <TouchableOpacity
              style={{ backgroundColor: "#1D9E75", paddingVertical: 14, borderRadius: 14, alignItems: "center" }}
              onPress={handleCompleteCycle}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>
                ✓ Complete Cycle {(selectedCycleIndex ?? 0) + 1}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Mark Payment Modal */}
      <Modal visible={!!markingPayment} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 4 }}>
              Mark Payment
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>
              {markingPayment?.memberName}
            </Text>

            {/* Status selector */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {(["paid", "late", "excused"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: markStatus === s ? "#1D9E75" : "#E5E7EB",
                    backgroundColor: markStatus === s ? "#F0FDF8" : "#ffffff",
                    alignItems: "center",
                  }}
                  onPress={() => setMarkStatus(s)}
                >
                  <Text style={{ fontWeight: "700", color: markStatus === s ? "#1D9E75" : "#374151", fontSize: 13 }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: "#374151",
                backgroundColor: "#FAFAFA",
                marginBottom: 16,
              }}
              value={markNotes}
              onChangeText={setMarkNotes}
              placeholder="Optional note…"
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" }}
                onPress={() => setMarkingPayment(null)}
              >
                <Text style={{ fontWeight: "700", color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, padding: 14, borderRadius: 12, backgroundColor: "#1D9E75", alignItems: "center" }}
                onPress={handleMark}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={{ color: "#ffffff", fontWeight: "700" }}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
