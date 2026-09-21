// Placeholder. Full type definitions and Zod schemas land in Module 2.
export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  roleId: string;
  companyIds: string[];
  active: boolean;
  createdAt?: string;
}
