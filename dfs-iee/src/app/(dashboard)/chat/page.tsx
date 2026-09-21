import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function ChatPage() {
  return (
    <ScaffoldPage
      title="Chat"
      description="Internal team communication scoped to your tenant."
      nextSteps={[
        "Schema is already defined: tenants/{tenantId}/chatRooms/{roomId}/messages/{messageId}",
        "Use onSnapshot with orderBy('createdAt') and limit(50) to stream messages",
        "Security rules already enforce chat.access permission and senderId match",
        "Add file upload using Firebase Storage (rules already enforce 10MB cap)",
        "Premium-only feature — check tenant.subscription.limits.chatEnabled",
      ]}
    />
  );
}
