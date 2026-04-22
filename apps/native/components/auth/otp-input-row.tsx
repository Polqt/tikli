import type { MutableRefObject } from "react";
import { TextInput, View } from "react-native";
import { OTP_INPUT_KEYS } from "@/utils/otp-input-row";

type OtpInputRowProps = {
	code: string[];
	inputRefs: MutableRefObject<(TextInput | null)[]>;
	onChangeDigit: (value: string, index: number) => void;
	onKeyPressDigit: (key: string, index: number) => void;
};

export function OtpInputRow({
	code,
	inputRefs,
	onChangeDigit,
	onKeyPressDigit,
}: OtpInputRowProps) {
	return (
		<View className="flex-row gap-2">
			{OTP_INPUT_KEYS.map((key, index) => {
				const filled = Boolean(code[index]);
				return (
					<TextInput
						key={key}
						ref={(node) => { inputRefs.current[index] = node; }}
						value={code[index] ?? ""}
						onChangeText={(v) => onChangeDigit(v, index)}
						onKeyPress={({ nativeEvent }) => onKeyPressDigit(nativeEvent.key, index)}
						keyboardType="number-pad"
						textContentType="oneTimeCode"
						autoComplete="sms-otp"
						maxLength={index === 0 ? 6 : 1}
						returnKeyType="done"
						style={{
							flex: 1,
							minHeight: 62,
							borderRadius: 16,
							borderWidth: filled ? 2 : 1,
							borderColor: filled ? "#242424" : "rgba(36,36,36,0.12)",
							backgroundColor: filled ? "#242424" : "#EDEAE4",
							textAlign: "center",
							fontSize: 22,
							fontWeight: "800",
							color: filled ? "#ffffff" : "#242424",
						}}
					/>
				);
			})}
		</View>
	);
}
