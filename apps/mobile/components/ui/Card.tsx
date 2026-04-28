import { View } from "react-native";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className }: Props) {
  return (
    <View
      className={`bg-brand-card rounded-3xl p-6 shadow-sm ${className ?? ""}`}
      style={{
        shadowColor: "#1B4F8A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 20,
        elevation: 4,
      }}
    >
      {children}
    </View>
  );
}