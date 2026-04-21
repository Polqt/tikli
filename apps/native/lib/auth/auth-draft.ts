import * as SecureStore from "expo-secure-store";

const EMAIL_DRAFT_KEY = "auth.emailDraft";

export async function saveEmailDraft(email: string) {
	await SecureStore.setItemAsync(EMAIL_DRAFT_KEY, email);
}

export async function loadEmailDraft() {
	return SecureStore.getItemAsync(EMAIL_DRAFT_KEY);
}

export async function clearEmailDraft() {
	await SecureStore.deleteItemAsync(EMAIL_DRAFT_KEY);
}
