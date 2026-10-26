"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleAlert } from "lucide-react";
import { changeEmail, changePassword, changeUsername, deactivateAccount, deleteAccount, logOutEverywhere } from "@/actions/account";
import { resendVerification } from "@/actions/auth";
import { useAction } from "@/components/use-action";
import { Modal } from "@/components/ui/modal";
import { FormError, FormSuccess, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";

type Account = {
  username: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  google: boolean;
  hasPassword: boolean;
  sessions: number;
  usernameChangedAt: string | null;
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border p-4">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function AccountForms({ account }: { account: Account }) {
  const router = useRouter();
  const [username, setUsername] = useState(account.username);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", password: "", confirm: "" });
  const [danger, setDanger] = useState<"deactivate" | "delete" | null>(null);
  const [confirm, setConfirm] = useState("");

  const uname = useAction(changeUsername);
  const mail = useAction(changeEmail);
  const resend = useAction(resendVerification);
  const pass = useAction(changePassword);
  const deactivate = useAction(deactivateAccount);
  const remove = useAction(deleteAccount);

  return (
    <div>
      <Section title="Username" description="You can change it once every 14 days. Your old profile link will stop working.">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await uname.execute({ username });
            if (r?.ok) {
              toast.success(`You're now @${r.data.username}`);
              router.refresh();
            }
          }}
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">@</span>
            <input
              className="input pl-8"
              value={username}
              maxLength={20}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              aria-label="Username"
            />
          </div>
          <button className="btn btn-secondary" disabled={uname.pending || username === account.username}>
            {uname.pending && <Spinner />} Save
          </button>
        </form>
        <div className="mt-2">
          <FormError message={uname.error} />
        </div>
      </Section>

      <Section title="Email">
        {account.email ? (
          <p className="flex items-center gap-2 text-sm">
            {account.email}
            {account.emailVerified ? (
              <span className="flex items-center gap-1 text-success">
                <CircleCheck className="h-4 w-4" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-danger">
                <CircleAlert className="h-4 w-4" /> Not verified
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted">No email on your account yet. Add one so you can recover your account.</p>
        )}
        {account.email && !account.emailVerified && (
          <button
            className="mt-2 text-sm link"
            disabled={resend.pending}
            onClick={async () => {
              const r = await resend.execute();
              if (r?.ok) toast.success("Verification email sent");
            }}
          >
            Resend verification email
          </button>
        )}
        <FormError message={resend.error} />
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await mail.execute({ email });
            if (r?.ok) {
              setEmailSent(email);
              setEmail("");
            }
          }}
        >
          <input
            type="email"
            className="input flex-1"
            placeholder={account.email ? "New email address" : "Email address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn btn-secondary" disabled={mail.pending}>
            {mail.pending && <Spinner />} {account.email ? "Change" : "Add"}
          </button>
        </form>
        <div className="mt-2 space-y-2">
          <FormError message={mail.error} />
          <FormSuccess message={emailSent ? `We sent a confirmation link to ${emailSent}. Your email changes once you click it.` : null} />
        </div>
      </Section>

      <Section title={account.hasPassword ? "Change password" : "Set a password"} description={account.hasPassword ? undefined : "Add a password so you can also log in with your email or username."}>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.password !== pw.confirm) return pass.setError("The new passwords don't match.");
            const r = await pass.execute({ current: pw.current, password: pw.password });
            if (r?.ok) {
              toast.success("Password saved. Other devices were signed out.");
              setPw({ current: "", password: "", confirm: "" });
            }
          }}
        >
          <FormError message={pass.error} />
          {account.hasPassword && (
            <input
              type="password"
              className="input"
              placeholder="Current password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              required
            />
          )}
          <input
            type="password"
            className="input"
            placeholder="New password (at least 8 characters)"
            autoComplete="new-password"
            value={pw.password}
            onChange={(e) => setPw({ ...pw, password: e.target.value })}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            required
          />
          <button className="btn btn-secondary" disabled={pass.pending}>
            {pass.pending && <Spinner />} Save password
          </button>
        </form>
      </Section>

      <Section title="Login methods">
        <ul className="space-y-1 text-sm">
          <li>Email &amp; password: {account.hasPassword && account.email ? "on" : "off"}</li>
          <li>Google: {account.google ? "connected" : "not connected"}</li>
          <li>Phone: {account.phone ?? "not added"}</li>
        </ul>
      </Section>

      <Section title="Sessions" description={`You're logged in on ${account.sessions} ${account.sessions === 1 ? "device" : "devices"}.`}>
        <form action={logOutEverywhere}>
          <button className="btn btn-secondary">Log out of all devices</button>
        </form>
      </Section>

      <Section title="Deactivate or delete">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={() => setDanger("deactivate")}>
            Deactivate account
          </button>
          <button className="btn btn-secondary text-danger" onClick={() => setDanger("delete")}>
            Delete account
          </button>
        </div>
      </Section>

      <Modal open={danger !== null} onClose={() => setDanger(null)} title={danger === "delete" ? "Delete your account?" : "Deactivate your account?"}>
        <form
          className="space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const payload = account.hasPassword ? { password: confirm } : { username: confirm };
            if (danger === "delete") remove.execute(payload);
            else deactivate.execute(payload);
          }}
        >
          <p className="text-sm text-muted">
            {danger === "delete"
              ? "This permanently deletes your profile, posts, comments, messages, listings and uploads. It can't be undone."
              : "Your profile, posts and listings will be hidden until you log in again. Nothing is deleted."}
          </p>
          <FormError message={danger === "delete" ? remove.error : deactivate.error} />
          <div>
            <label className="label" htmlFor="confirm-identity">
              {account.hasPassword ? "Enter your password to confirm" : `Type your username (${account.username}) to confirm`}
            </label>
            <input
              id="confirm-identity"
              type={account.hasPassword ? "password" : "text"}
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDanger(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={remove.pending || deactivate.pending}>
              {(remove.pending || deactivate.pending) && <Spinner />}
              {danger === "delete" ? "Delete forever" : "Deactivate"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
