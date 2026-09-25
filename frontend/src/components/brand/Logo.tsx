import logoAsset from "@/assets/opteraos-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="opteraOS logo"
      className={cn("h-9 w-9 rounded-lg object-cover", className)}
      loading="eager"
      width={36}
      height={36}
    />
  );
}

export function Wordmark({ className }: { className?: string | undefined }) {
  return (
    <span className={cn("text-lg font-bold tracking-tight", className || "text-[#0F2423]")}>
      optera<span className="text-gradient">OS</span>
    </span>
  );
}

export function BrandLockup({ className, wordmarkClassName }: { className?: string | undefined; wordmarkClassName?: string | undefined }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <Wordmark className={wordmarkClassName} />
    </div>
  );
}
