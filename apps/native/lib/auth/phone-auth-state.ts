const PHILIPPINE_COUNTRY_CODE = "+63";
const PHILIPPINE_LOCAL_PREFIX = "09";
// A valid PH mobile in E.164: +63XXXXXXXXXX = 13 chars total, 10 local digits after +63
const PHILIPPINE_E164_LENGTH = 13;
const OTP_LENGTH = 6;

type OtpActionState = {
	isOnline: boolean;
	isBusy: boolean;
};

type SendOtpState = OtpActionState & {
	phoneNumber: string;
};

type VerifyOtpState = OtpActionState & {
	code: string;
};

export function normalizePhilippinePhoneInput(value: string) {
	const digits = value.replace(/\D/g, "");

	// Already has country code: 63XXXXXXXXXX
	if (digits.startsWith("63")) {
		return `+${digits.slice(0, 12)}`; // keep 12 digits → +63XXXXXXXXXX
	}

	// Local format starting with 9: 9XXXXXXXXX
	if (digits.startsWith("9")) {
		return `${PHILIPPINE_COUNTRY_CODE}${digits.slice(0, 10)}`;
	}

	// Local format starting with 0: 09XXXXXXXXX
	if (digits.startsWith("0")) {
		return `${PHILIPPINE_COUNTRY_CODE}${digits.slice(1, 11)}`;
	}

	return `${PHILIPPINE_COUNTRY_CODE}${digits.slice(0, 10)}`;
}

export function canSendOtp({
	isOnline,
	phoneNumber,
	isBusy,
}: SendOtpState) {
	return isOnline && !isBusy && isPhilippineMobileNumber(phoneNumber);
}

export function canVerifyOtp({ isOnline, code, isBusy }: VerifyOtpState) {
	const normalizedCode = code.replace(/\D/g, "");
	return isOnline && !isBusy && normalizedCode.length === OTP_LENGTH;
}

export function formatMaskedPhoneNumber(phoneNumber: string) {
	if (!phoneNumber) {
		return `${PHILIPPINE_COUNTRY_CODE} *** *** ****`;
	}

	const normalized = normalizePhilippinePhoneInput(phoneNumber);
	if (normalized.length < PHILIPPINE_E164_LENGTH) {
		return normalized;
	}

	return `${normalized.slice(0, 3)} *** *** ${normalized.slice(-4)}`;
}

function isPhilippineMobileNumber(phoneNumber: string) {
	const normalized = normalizePhilippinePhoneInput(phoneNumber);
	return (
		normalized.startsWith(PHILIPPINE_COUNTRY_CODE) &&
		normalized.length === PHILIPPINE_E164_LENGTH &&
		normalized[3] === PHILIPPINE_LOCAL_PREFIX[1] // must be '9'
	);
}
