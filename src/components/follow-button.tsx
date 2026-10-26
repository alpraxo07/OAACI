"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/actions/social";
import { useMe } from "@/components/providers";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";

export function FollowButton({
  userId,
  initialFollowing,
  size = "md",
  className,
  onChange,
}: {
  userId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  className?: string;
  onChange?: (following: boolean) => void;
}) {
  const me = useMe();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [hover, setHover] = useState(false);

  if (me?.id === userId) return null;

  const click = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!me) return router.push("/login");
    setPending(true);
    setFollowing(!following);
    const r = await toggleFollow({ userId });
    setPending(false);
    if (!r.ok) {
      setFollowing(following);
      return toast.error(r.error);
    }
    setFollowing(r.data.following);
    onChange?.(r.data.following);
  };

  return (
    <button
      onClick={click}
      disabled={pending}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "btn min-w-24",
        size === "sm" && "btn-sm min-w-20",
        following ? "btn-secondary hover:border-danger hover:text-danger" : "btn-primary",
        className,
      )}
    >
      {following ? (hover ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
