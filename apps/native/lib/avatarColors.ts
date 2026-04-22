const PALETTE = [
	"#1D9E75",
	"#0EA5E9",
	"#8B5CF6",
	"#F59E0B",
	"#EF4444",
	"#EC4899",
	"#14B8A6",
	"#F97316",
	"#6366F1",
	"#84CC16",
	"#06B6D4",
	"#D946EF",
];

/** Deterministically pick a color from the palette based on a string. */
export function avatarColorFromString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return PALETTE[Math.abs(hash) % PALETTE.length] ?? PALETTE[0]!;
}

/** Derive 1-2 character initials from a name or email. */
export function initialsFromName(name?: string | null, email?: string): string {
	if (name?.trim()) {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
		}
		return name.trim().slice(0, 2).toUpperCase();
	}
	if (email) return email.slice(0, 2).toUpperCase();
	return "??";
}
