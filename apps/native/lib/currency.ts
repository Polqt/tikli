/**
 * Format centavos as Philippine Peso display string.
 * e.g. 100000 → "₱1,000.00"
 */
export function formatPeso(centavos: number): string {
	const pesos = centavos / 100;
	return new Intl.NumberFormat("en-PH", {
		style: "currency",
		currency: "PHP",
		currencyDisplay: "symbol",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})
		.format(pesos)
		.replace("PHP", "₱")
		.trim();
}

/** Parse a ₱ display string back to centavos. */
export function parsePeso(display: string): number {
	const numeric = display.replace(/[^0-9.]/g, "");
	return Math.round(Number.parseFloat(numeric || "0") * 100);
}
