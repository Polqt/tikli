import type { StyleProp, TextStyle } from "react-native";
import { Text } from "react-native";
import { formatPeso } from "@/lib/currency";

interface CurrencyTextProps {
	centavos: number;
	style?: StyleProp<TextStyle>;
}

export function CurrencyText({ centavos, style }: CurrencyTextProps) {
	return <Text style={style}>{formatPeso(centavos)}</Text>;
}
