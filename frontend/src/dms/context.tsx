import { createContext, useContext } from "react";
import type { User } from "./types";

export type WorkspaceContextValue = {
  user: User;
  refreshKey: number;
  refresh: () => void;
  notify: (message: string, error?: boolean) => void;
  openNewCase: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace context unavailable");
  return value;
}
