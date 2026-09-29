import {
  LayoutDashboard,
  FolderOpen,
  Search,
  BookOpen,
  FileText,
  BarChart3,
  Users,
  Settings,
  FilePlus,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_MAIN: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "Case Directory", icon: FolderOpen },
  { to: "/screen/new", label: "New Investigation", icon: FilePlus },
  { to: "/search", label: "Unified Search", icon: Search },
  { to: "/audit", label: "Audit Ledger", icon: BookOpen },
  { to: "/reports", label: "Reports & Certificates", icon: FileText },
];

export const NAV_SECONDARY: NavItem[] = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/users", label: "User Management", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];
