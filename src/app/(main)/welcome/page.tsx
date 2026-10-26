import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Briefcase, CircleCheck, Compass, ImagePlus, Mail, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Columns } from "@/components/shell/right-rail";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const me = await requireUser();
  const [user, entries, posts, following] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { avatarUrl: true, headline: true, disciplines: true } }),
    db.profileEntry.count({ where: { userId: me.id } }),
    db.post.count({ where: { authorId: me.id, repostOfId: null } }),
    db.follow.count({ where: { followerId: me.id } }),
  ]);

  const steps = [
    {
      done: me.contactVerified,
      icon: Mail,
      title: "Confirm your email",
      text: me.email ? `We sent a link to ${me.email}. You need this to post and message.` : "Add an email so you can recover your account.",
      href: "/settings/account",
      cta: "Account settings",
    },
    {
      done: Boolean(user.avatarUrl && user.headline && user.disciplines.length),
      icon: UserRound,
      title: "Set up your profile",
      text: "Add a photo, a one-line headline (e.g. “Terracotta sculptor · Bishnupur”) and your disciplines.",
      href: "/settings/profile",
      cta: "Edit profile",
    },
    {
      done: entries > 0,
      icon: Briefcase,
      title: "Build your portfolio",
      text: "List exhibitions, training, experience and awards — like an artist CV.",
      href: "/settings/portfolio",
      cta: "Add portfolio entries",
    },
    {
      done: posts > 0,
      icon: ImagePlus,
      title: "Share your first work",
      text: "Post a photo, video or song with a short story behind it.",
      href: "/",
      cta: "Go to your feed",
    },
    {
      done: following >= 3,
      icon: Compass,
      title: "Follow a few artists",
      text: "Your home feed shows work from people you follow.",
      href: "/explore?tab=artists",
      cta: "Find artists",
    },
    {
      done: me.verified,
      icon: BadgeCheck,
      title: "Get verified",
      text: "Apply for the verified artist badge once your profile shows your original work.",
      href: "/settings/verification",
      cta: "Apply",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Columns>
      <div className="px-4 py-8">
        <p className="text-sm font-semibold text-primary-text uppercase tracking-wider">Welcome to OAACI</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Namaste, {me.name.split(" ")[0]}!</h1>
        <p className="mt-2 text-muted">A few steps to get the most out of OAACI. ({doneCount} of {steps.length} done)</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <ol className="mt-6 space-y-3">
          {steps.map((s) => (
            <li key={s.title} className={cn("card flex gap-4 p-4", s.done && "opacity-70")}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", s.done ? "bg-success-soft text-success" : "bg-primary-soft text-primary-text")}>
                {s.done ? <CircleCheck className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
              {!s.done && (
                <Link href={s.href} className="btn btn-secondary btn-sm self-center">
                  {s.cta}
                </Link>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Link href="/" className="btn btn-primary">
            Go to my feed
          </Link>
        </div>
      </div>
    </Columns>
  );
}
