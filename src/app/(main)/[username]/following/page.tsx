import type { Metadata } from "next";
import { FollowPage } from "../follow-page";

export const metadata: Metadata = { title: "Following" };

export default async function FollowingPage({ params }: PageProps<"/[username]/following">) {
  const { username } = await params;
  return <FollowPage username={decodeURIComponent(username)} mode="following" />;
}
