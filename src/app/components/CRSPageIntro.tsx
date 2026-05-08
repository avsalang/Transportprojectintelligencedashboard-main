import type { ReactNode } from 'react';

type CRSPageIntroProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  note?: ReactNode;
  aside?: ReactNode;
};

export function CRSPageIntro({ title, eyebrow, children, note, aside }: CRSPageIntroProps) {
  const secondary = aside ?? null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className={secondary ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.36fr)] lg:items-start' : undefined}>
        <div>
          {eyebrow ? <p className="mb-1 text-[13px] font-medium text-blue-600">{eyebrow}</p> : null}
          <h1 className="text-2xl tracking-tight text-slate-900">{title}</h1>
          <div className="mt-3 w-full space-y-2 text-sm leading-6 text-slate-600 sm:text-justify">
            {children}
            {note ? <p>{note}</p> : null}
          </div>
        </div>
        {secondary ? <div className="lg:pt-1">{secondary}</div> : null}
      </div>
    </section>
  );
}
