<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;

  const compactNumber = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  });

  const preciseNumber = new Intl.NumberFormat('en-US');

  const dateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  function formatCompact(value: number) {
    return compactNumber.format(value);
  }

  function formatPrecise(value: number) {
    return preciseNumber.format(value);
  }

  function formatDate(value: string) {
    return dateTime.format(new Date(value));
  }

  function filterHref(slug: string) {
    return slug === 'all' ? '/' : `/?language=${slug}`;
  }
</script>

<svelte:head>
  <title>Trend Ledger</title>
  <meta
    name="description"
    content="A lightweight GitHub Trending dashboard with merged daily and weekly repo discovery across multiple languages."
  />
</svelte:head>

<div class="relative z-10 min-h-[100dvh]">
  <div class="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
    <header class="grid gap-8 border-b border-zinc-900/10 pb-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          GitHub trending monitor
        </p>

        <h1 class="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl md:leading-none">
          Trend Ledger
        </h1>

        <p class="mt-4 max-w-[65ch] text-base leading-relaxed text-zinc-600">
          Daily and weekly GitHub Trending pages, merged into one cleaner dashboard. Repositories
          collapse by owner and name, so repeats across time ranges only show once per language
          section.
        </p>

        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div class="border-t border-zinc-900/10 pt-4">
            <dt class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Unique repositories
            </dt>
            <dd class="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {formatCompact(data.totalRepos)}
            </dd>
            <p class="mt-2 text-sm text-zinc-600">
              {formatPrecise(data.totalRepos)} deduplicated repos across all tracked pages.
            </p>
          </div>

          <div class="border-t border-zinc-900/10 pt-4">
            <dt class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Merged appearances
            </dt>
            <dd class="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {formatCompact(data.totalAppearances)}
            </dd>
            <p class="mt-2 text-sm text-zinc-600">
              Daily and weekly mentions preserved as appearance badges.
            </p>
          </div>

          <div class="border-t border-zinc-900/10 pt-4">
            <dt class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Snapshot time
            </dt>
            <dd class="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
              {formatDate(data.fetchedAt)}
            </dd>
            <p class="mt-2 text-sm text-zinc-600">
              Server-side cache keeps this snapshot stable for 10 minutes.
            </p>
          </div>
        </div>
      </div>

      <aside class="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl">
        <div class="border-b border-zinc-900/8 pb-4">
          <p class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Filter
          </p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Narrow to one language
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600">
            Keep the full overview or isolate one section. Unknown is included, but GitHub may not
            resolve that slug consistently.
          </p>
        </div>

        <form method="GET" class="mt-5 space-y-5">
          <div class="grid gap-2">
            <label for="language" class="text-sm font-medium text-zinc-950">View scope</label>
            <select
              id="language"
              name="language"
              class="h-12 rounded-2xl border border-zinc-900/10 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none ring-0 focus:border-emerald-600/40"
            >
              <option value="all" selected={data.selectedLanguage === 'all'}>
                All languages
              </option>

              {#each data.sections as section}
                <option
                  value={section.slug}
                  selected={data.selectedLanguage === section.slug}
                >
                  {section.label}
                </option>
              {/each}
            </select>
            <p class="text-xs leading-relaxed text-zinc-500">
              Daily and weekly sources are always merged.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="submit"
              class="inline-flex h-11 items-center justify-center rounded-full border border-emerald-600/15 bg-emerald-600 px-5 text-sm font-medium text-white"
            >
              Apply filter
            </button>

            <button
              type="submit"
              name="refresh"
              value="1"
              class="inline-flex h-11 items-center justify-center rounded-full border border-zinc-900/10 bg-white px-5 text-sm font-medium text-zinc-900"
            >
              Refresh snapshot
            </button>
          </div>
        </form>

        <div class="mt-5 border-t border-zinc-900/8 pt-4">
          <p class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Tracking
          </p>
          <p class="mt-2 text-sm leading-relaxed text-zinc-600">
            {data.sections.length} languages, 2 time windows, one merged index.
          </p>
        </div>
      </aside>
    </header>

    {#if data.warnings.length}
      <section class="mt-6 border-l-2 border-emerald-700/35 pl-4">
        <h2 class="text-sm font-medium text-zinc-950">Fetch notes</h2>
        <ul class="mt-2 space-y-1 text-sm leading-relaxed text-zinc-600">
          {#each data.warnings as warning}
            <li>{warning}</li>
          {/each}
        </ul>
      </section>
    {/if}

    <nav class="sticky top-0 z-20 mt-8 border-y border-zinc-900/8 bg-[rgba(246,247,244,0.88)] backdrop-blur-xl">
      <div class="flex gap-3 overflow-x-auto py-3 [scrollbar-width:none]">
        <a
          href={filterHref('all')}
          aria-current={data.selectedLanguage === 'all' ? 'page' : undefined}
          class={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${
            data.selectedLanguage === 'all'
              ? 'border-emerald-600/20 bg-emerald-600 text-white'
              : 'border-zinc-900/10 bg-white/80 text-zinc-700'
          }`}
        >
          All languages
        </a>

        {#each data.sections as section}
          <a
            href={filterHref(section.slug)}
            aria-current={data.selectedLanguage === section.slug ? 'page' : undefined}
            class={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
              data.selectedLanguage === section.slug
                ? 'border-emerald-600/20 bg-emerald-600 text-white'
                : 'border-zinc-900/10 bg-white/80 text-zinc-700'
            }`}
          >
            <span>{section.label}</span>
            <span
              class={`font-mono text-xs ${
                data.selectedLanguage === section.slug ? 'text-white/80' : 'text-zinc-500'
              }`}
            >
              {section.repoCount}
            </span>
          </a>
        {/each}
      </div>
    </nav>

    <main class="mt-10 space-y-14">
      {#each data.visibleSections as section}
        <section id={section.slug} class="scroll-mt-28">
          <div class="grid gap-4 border-t border-zinc-900/10 pt-6 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                    Language
                  </p>
                  <h2 class="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                    {section.label}
                  </h2>
                </div>

                {#if data.selectedLanguage === 'all'}
                  <a
                    href={filterHref(section.slug)}
                    class="inline-flex h-10 items-center rounded-full border border-zinc-900/10 bg-white/80 px-4 text-sm font-medium text-zinc-700"
                  >
                    View only
                  </a>
                {/if}
              </div>

              <p class="mt-3 max-w-[65ch] text-sm leading-relaxed text-zinc-600">
                {section.label} repositories pulled from GitHub Trending daily and weekly pages,
                merged into one list for scanning.
              </p>
            </div>

            <dl class="grid grid-cols-3 gap-4 text-sm md:text-right">
              <div>
                <dt class="text-xs uppercase tracking-[0.22em] text-zinc-500">Repos</dt>
                <dd class="mt-2 font-mono text-zinc-950">{formatPrecise(section.repoCount)}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-[0.22em] text-zinc-500">Daily</dt>
                <dd class="mt-2 font-mono text-zinc-950">{formatPrecise(section.dailyCount)}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-[0.22em] text-zinc-500">Weekly</dt>
                <dd class="mt-2 font-mono text-zinc-950">{formatPrecise(section.weeklyCount)}</dd>
              </div>
            </dl>
          </div>

          {#if section.error}
            <div class="mt-4 rounded-2xl border border-emerald-700/15 bg-emerald-700/[0.06] px-4 py-3 text-sm leading-relaxed text-zinc-700">
              Partial fetch issue: {section.error}
            </div>
          {/if}

          {#if section.repos.length === 0}
            <div class="mt-6 rounded-[1.75rem] border border-dashed border-zinc-900/12 bg-white/60 px-6 py-8">
              <h3 class="text-lg font-semibold tracking-tight text-zinc-950">
                Nothing parsed for {section.label}
              </h3>
              <p class="mt-2 max-w-[60ch] text-sm leading-relaxed text-zinc-600">
                GitHub may not expose this language slug right now, or the trending markup changed.
                The rest of the dashboard still renders.
              </p>
            </div>
          {:else}
            <div class="mt-6 overflow-hidden rounded-[2rem] border border-zinc-900/10 bg-white/80 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl">
              <div class="divide-y divide-zinc-900/8">
                {#each section.repos as repo}
                  {@const relevantAppearances = repo.appearances.filter(
                    (appearance) => appearance.language === section.slug
                  )}

                  <article class="grid gap-4 px-5 py-5 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-zinc-50/70 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_auto] md:items-start md:gap-6">
                    <div>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        class="group inline-flex flex-wrap items-baseline gap-2 text-zinc-900"
                      >
                        <span class="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
                          {repo.owner}
                        </span>
                        <span class="text-lg font-semibold tracking-tight group-hover:text-emerald-700">
                          {repo.name}
                        </span>
                      </a>

                      {#if repo.description}
                        <p class="mt-2 max-w-[68ch] text-sm leading-relaxed text-zinc-600">
                          {repo.description}
                        </p>
                      {:else}
                        <p class="mt-2 text-sm text-zinc-500">
                          No description exposed on the trending page.
                        </p>
                      {/if}
                    </div>

                    <div class="flex flex-wrap gap-2">
                      {#if repo.primaryLanguage}
                        <span class="inline-flex h-8 items-center rounded-full border border-zinc-900/10 bg-zinc-900/[0.04] px-3 text-xs font-medium text-zinc-700">
                          {repo.primaryLanguage}
                        </span>
                      {/if}

                      {#each relevantAppearances as appearance}
                        <span
                          class={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${
                            appearance.since === 'daily'
                              ? 'border-emerald-600/15 bg-emerald-600/10 text-emerald-800'
                              : 'border-zinc-900/10 bg-zinc-900/[0.04] text-zinc-700'
                          }`}
                        >
                          {appearance.since}
                        </span>
                      {/each}

                      <span class="inline-flex h-8 items-center rounded-full border border-zinc-900/10 bg-white px-3 text-xs font-medium text-zinc-700">
                        tracked {repo.appearanceCount}
                        {repo.appearanceCount === 1 ? ' time' : ' times'}
                      </span>
                    </div>

                    <dl class="grid grid-cols-3 gap-4 text-right text-sm">
                      <div>
                        <dt class="text-xs uppercase tracking-[0.18em] text-zinc-500">Stars</dt>
                        <dd class="mt-2 font-mono text-zinc-950">{formatPrecise(repo.stars)}</dd>
                      </div>
                      <div>
                        <dt class="text-xs uppercase tracking-[0.18em] text-zinc-500">Forks</dt>
                        <dd class="mt-2 font-mono text-zinc-950">{formatPrecise(repo.forks)}</dd>
                      </div>
                      <div>
                        <dt class="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Trend
                        </dt>
                        <dd class="mt-2 font-mono text-zinc-950">
                          {formatPrecise(repo.starsPeriod)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                {/each}
              </div>
            </div>
          {/if}
        </section>
      {/each}
    </main>
  </div>
</div>
