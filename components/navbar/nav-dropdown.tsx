import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavDropdownProps {
  title: string;
  icon: LucideIcon;
  links: Array<{ href: string; label: string; icon: LucideIcon }>;
  isOpen: boolean;
  onToggle: () => void;
}

export function NavDropdown({ title, icon: Icon, links, isOpen, onToggle }: NavDropdownProps) {
  const pathname = usePathname();
  
  return (
    <div className="relative">
      <Button variant="ghost" className="gap-2 text-base" onClick={onToggle}>
        <Icon className="h-5 w-5" /> {title} <ChevronDown className="h-4 w-4" />
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"
          >
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={onToggle}>
                <div className={cn("flex items-center gap-3 rounded-lg px-4 py-3 text-base hover:bg-secondary", pathname === link.href && "bg-primary/10 text-primary")}>
                  <link.icon className="h-5 w-5" /> {link.label}
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}