import { View } from "react-native";

export function Divider({ className = "", style = {} }: { className?: string; style?: any }) {
  return <View className={"h-[1px] bg-black/10 " + className} style={style} />;
}
