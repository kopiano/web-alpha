import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.85)",
          boxShadow: "0 20px 60px -10px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "12px 16px",
          fontSize: "13px",
        },
        classNames: {
          description: "text-white/50 text-xs",
          success: "border-l-2 border-l-[#22d3ee]",
          error: "border-l-2 border-l-[#fb7185]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
