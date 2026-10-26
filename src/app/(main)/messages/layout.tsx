import { requireUser } from "@/lib/auth/session";
import { getInbox } from "@/lib/messages";
import { Inbox } from "@/components/messages/inbox";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const inbox = await getInbox(me.id);
  return (
    <div className="flex">
      <Inbox initial={inbox} />
      {children}
    </div>
  );
}
