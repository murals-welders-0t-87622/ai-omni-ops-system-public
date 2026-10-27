"use client";

import "../../styles/globals.css";
import TopNavigationShell from "./_lib/top-navigation-shell";
import { AccountWorkspace } from "../../components/account-workspace";
import type { ReactNode } from "react";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return <AccountWorkspace><TopNavigationShell>{children}</TopNavigationShell></AccountWorkspace>;
}
