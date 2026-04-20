import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { useColorScheme } from "nativewind";

type ThemeName = "light" | "dark";

type AppThemeContextType = {
	currentTheme: ThemeName;
	isLight: boolean;
	isDark: boolean;
	setTheme: (theme: ThemeName) => void;
	toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined,
);

export const AppThemeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { colorScheme, setColorScheme } = useColorScheme();
	const theme: ThemeName = colorScheme === "dark" ? "dark" : "light";

	const isLight = theme === "light";
	const isDark = theme === "dark";

	const setTheme = useCallback(
		(newTheme: ThemeName) => {
			setColorScheme(newTheme);
		},
		[setColorScheme],
	);

	const toggleTheme = useCallback(() => {
		setColorScheme(theme === "light" ? "dark" : "light");
	}, [theme, setColorScheme]);

	const value = useMemo(
		() => ({ currentTheme: theme, isLight, isDark, setTheme, toggleTheme }),
		[theme, isLight, isDark, setTheme, toggleTheme],
	);

	return (
		<AppThemeContext.Provider value={value}>
			{children}
		</AppThemeContext.Provider>
	);
};

export function useAppTheme() {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
}
