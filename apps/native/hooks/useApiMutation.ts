import { useAuth } from "@clerk/expo";
import { env } from "@tikli/env/native";
import { useCallback, useState } from "react";

type HttpMethod = "POST" | "PATCH" | "DELETE";

interface ApiMutationOptions {
	onSuccess?: (data: unknown) => void;
	onError?: (message: string) => void;
}

interface MutateArgs {
	path: string;
	method?: HttpMethod;
	body?: Record<string, unknown>;
}

export function useApiMutation(options: ApiMutationOptions = {}) {
	const { getToken } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const mutate = useCallback(
		async ({ path, method = "POST", body }: MutateArgs) => {
			setLoading(true);
			setError(null);
			try {
				const token = await getToken({ template: "convex" });
				const res = await fetch(`${env.EXPO_PUBLIC_API_URL}${path}`, {
					method,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					...(body ? { body: JSON.stringify(body) } : {}),
				});

				const data = await res.json().catch(() => ({}));

				if (!res.ok) {
					const msg = (data as { error?: string }).error ?? "Request failed";
					setError(msg);
					options.onError?.(msg);
					return null;
				}

				options.onSuccess?.(data);
				return data as unknown;
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Something went wrong";
				setError(msg);
				options.onError?.(msg);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[getToken, options],
	);

	return { mutate, loading, error, setError };
}
