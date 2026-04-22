import { Text } from "react-native";

export function SectionLabel({ children, className = "", style = {} }: { children: string; className?: string; style?: any }) {
  return (
    <Text className={"text-xs font-extrabold text-black/30 tracking-widest uppercase mb-3 mt-8 " + className} style={style}>
      {children}
    </Text>
  );
}
