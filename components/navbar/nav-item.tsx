import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavItemProps {
  link: { href: string; label: string; icon: LucideIcon };
  isActive: boolean;
  onClick?: () => void;
  isMobile?: boolean;
}

export function NavItem({ link, isActive, onClick, isMobile = false }: NavItemProps) {
  const Icon = link.icon;

  if (isMobile) {
    return (
      <Link href={link.href} onClick={onClick}>
        <div className={cn("flex items-center gap-3 rounded-lg px-4 py-3 text-lg hover:bg-secondary", isActive && "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
          {link.label}
        </div>
      </Link>
    );
  }

  return (
    <Link href={link.href}>
      <Button variant={isActive ? "secondary" : "ghost"} className={cn("gap-2 text-base", isActive && "bg-primary/10 text-primary")}>
        <Icon className="h-5 w-5" />
        {link.label}
      </Button>
    </Link>
  );
}