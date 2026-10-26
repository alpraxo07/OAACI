import { Columns } from "@/components/shell/right-rail";
import { PageHeader } from "@/components/ui/misc";

/** Simple long-form text page (about, terms, privacy, guidelines). */
export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <Columns>
      <PageHeader title={title} />
      <article className="space-y-4 px-5 py-6 leading-relaxed [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary-text [&_a]:underline">
        {updated && <p className="text-sm text-muted">Last updated: {updated}</p>}
        {children}
      </article>
    </Columns>
  );
}
