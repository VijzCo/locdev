import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function UsersPage() {
  return (
    <ScaffoldPage
      title="Users"
      description="Invite, manage, and assign roles to team members."
      nextSteps={[
        "List users from /users where tenantId == current tenantId",
        "Build an Invite Modal using inviteUserSchema (in src/lib/validators)",
        "POST to /api/users/invite which creates a UserInvitation doc + sends an email",
        "On accept, Cloud Function creates the Firebase Auth user and user doc",
        "Show role badge using ROLE_LABELS (in src/lib/utils/rbac)",
        "Add role-change UI that calls a Cloud Function (server enforces permissions array)",
      ]}
    />
  );
}
