import type { Metadata } from "next";
import { FollowPage } from "../follow-page";

export const metadata: Metadata = { title: "Followers" };

export default async function FollowersPage({ params }: PageProps<"/[username]/followers">) {
  const { username } = await params;
  return <FollowPage username={decodeURIComponent(username)} mode="followers" />;
}
