import { create } from "zustand";

export type Frequency = "weekly" | "biweekly" | "monthly";

export interface CreateGroupFormData {
	name: string;
	description: string;
	frequency: Frequency;
	contributionAmount: string; // string for input, parsed to centavos on submit
	maxMembers: number;
	startDate: Date;
}

interface OnboardingStore {
	step: number;
	form: CreateGroupFormData;
	setStep: (step: number) => void;
	nextStep: () => void;
	prevStep: () => void;
	setField: <K extends keyof CreateGroupFormData>(
		key: K,
		value: CreateGroupFormData[K],
	) => void;
	reset: () => void;
}

const DEFAULT_FORM: CreateGroupFormData = {
	name: "",
	description: "",
	frequency: "monthly",
	contributionAmount: "",
	maxMembers: 10,
	startDate: new Date(),
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
	step: 0,
	form: { ...DEFAULT_FORM },
	setStep: (step) => set({ step }),
	nextStep: () => set((s) => ({ step: s.step + 1 })),
	prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
	setField: (key, value) => set((s) => ({ form: { ...s.form, [key]: value } })),
	reset: () =>
		set({ step: 0, form: { ...DEFAULT_FORM, startDate: new Date() } }),
}));
