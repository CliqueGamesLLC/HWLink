import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
}
