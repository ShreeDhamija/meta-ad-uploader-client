// Research page: structured expanded views for each research intel section.
// Each section turns its stored product_intel JSON into labeled blocks laid
// out on a two-column grid (the persona profile's visual model). Blocks marked
// `key` show by default; "View Full Details" reveals the rest. Fields a
// renderer does not know about still render through the generic blocks, so a
// schema change never hides data.
import { useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  AlertTriangle, Ban, BadgeCheck, ChevronDown, ChevronUp, CircleCheck, ClipboardList, Clapperboard, Compass,
  DollarSign, ExternalLink, Eye, FileSearch, Flame, Gauge, HelpCircle, Info, Layers, Lightbulb, ListChecks,
  Map as MapIcon, Megaphone, MessageCircle, Mic, Package, Palette, Puzzle, Quote, Repeat, Scale, Search, ShieldAlert,
  ShieldCheck, ShieldX, Sparkles, Star, Swords, Target, ThumbsDown, ThumbsUp, TrendingUp, Type, UserCheck,
  Users, UserX, Wrench, Zap,
} from "lucide-react";
import { humanize } from "../JsonView";

// ── Small value helpers ─────────────────────────────────────────────────────

const isFilled = (value) => {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some(isFilled);
  if (typeof value === "object") return Object.values(value).some(isFilled);
  return true;
};
const list = (value) => (Array.isArray(value) ? value.filter(isFilled) : []);
const text = (value) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const isUrl = (value) => typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
/** "solution_aware" → "Solution aware" */
const words = (value) => {
  const raw = String(value ?? "").replace(/[_-]+/g, " ").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
};
const money = (value) => (typeof value === "number" && Number.isFinite(value) ? `$${Math.round(value).toLocaleString()}` : text(value));
const percent = (value) => (typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : text(value));
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** Strings from an array, or from a bullet/line-separated string. */
function strings(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim()
        : typeof item === "number" ? String(item)
          : item && typeof item === "object" ? text(item.name || item.title || item.label || item.text || item.phrase) : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/\n+/).map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  }
  return [];
}

const shortList = (items) => items.length > 0 && items.every((item) => item.length <= 48);
const TITLE_KEYS = [
  "name", "title", "label", "theme", "driver", "objection", "pain", "phrase", "register", "trend", "pattern_name",
  "ad_derived_persona", "research_persona", "phase", "concept_name", "question", "request",
];

// ── Primitives ──────────────────────────────────────────────────────────────

function Block({ icon: Icon, label, tone, children }) {
  return (
    <section className={`cs-persona-block cs-research-block ${tone ? `is-${tone}` : ""}`}>
      {label && <h4>{Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{label}</h4>}
      {children}
    </section>
  );
}

function Lead({ children, tags }) {
  return (
    <div className="cs-research-lead">
      {tags}
      <p>{children}</p>
    </div>
  );
}

function Stats({ items }) {
  const visible = items.filter((item) => item && isFilled(item.value));
  if (visible.length === 0) return null;
  return (
    <dl className="cs-research-stats">
      {visible.map((item) => (
        <div key={item.label} className={String(item.value).length > 16 ? "is-text" : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.hint && <small>{item.hint}</small>}
        </div>
      ))}
    </dl>
  );
}

function Callout({ icon: Icon = Lightbulb, label, tone, children }) {
  return (
    <div className={`cs-research-callout ${tone ? `is-${tone}` : ""}`}>
      {label && <span><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</span>}
      <div>{children}</div>
    </div>
  );
}

function Chips({ items, tone }) {
  const values = strings(items);
  if (values.length === 0) return null;
  return (
    <div className={`cs-persona-chips cs-research-chips ${tone ? `is-${tone}` : ""}`}>
      {values.map((item, index) => <span key={index}>{item}</span>)}
    </div>
  );
}

function Bullets({ items, numbered, limit }) {
  const values = strings(items);
  if (values.length === 0) return null;
  const shown = limit ? values.slice(0, limit) : values;
  const ListTag = numbered ? "ol" : "ul";
  return (
    <>
      <ListTag className={`cs-research-value-list ${numbered ? "is-numbered" : ""}`}>
        {shown.map((item, index) => <li key={index}><LinkedText value={item} /></li>)}
      </ListTag>
      {shown.length < values.length && <p className="cs-research-more">+{values.length - shown.length} more in full details</p>}
    </>
  );
}

/** A list of short tags reads as chips; longer statements read as bullets. */
function SmartList({ items, tone, numbered }) {
  const values = strings(items);
  if (values.length === 0) return null;
  return shortList(values) ? <Chips items={values} tone={tone} /> : <Bullets items={values} numbered={numbered} />;
}

function Tag({ tone = "neutral", title, children }) {
  if (!isFilled(children)) return null;
  return <span className={`cs-research-tag is-${tone}`} title={title}>{children}</span>;
}

const LEVEL_TONES = {
  high: "bad", medium: "warn", low: "neutral", positive: "good", negative: "bad", neutral: "neutral", mixed: "warn",
  complete: "good", partial: "warn", missing: "bad", failed: "bad", on_brand: "good", needs_reframe: "warn", insight_only: "neutral",
};
const toneFor = (value) => LEVEL_TONES[String(value ?? "").toLowerCase().replace(/[\s-]+/g, "_")] || "neutral";

function QuoteCard({ quote, href, source, meta }) {
  const body = text(quote).replace(/^["“]+|["”]+$/g, "");
  if (!body) return null;
  return (
    <figure className="cs-research-quote">
      <blockquote>“{body}”</blockquote>
      {(href || source || meta) && (
        <figcaption>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer">{source || sourceLabel(href)}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a> : source}
          {meta && <span>{meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function sourceLabel(url) {
  const reddit = /reddit\.com\/r\/([^/]+)/i.exec(url);
  if (reddit) return `r/${reddit[1]}`;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function LinkedText({ value }) {
  const raw = String(value);
  if (isUrl(raw)) return <a href={raw.trim()} target="_blank" rel="noopener noreferrer" className="cs-research-link">{sourceLabel(raw.trim())}</a>;
  return raw;
}

function ItemCard({ title, subtitle, tags, children }) {
  return (
    <article className="cs-research-item">
      {(title || tags) && (
        <header>
          {title && <h5>{title}</h5>}
          {tags && <div className="cs-research-tags">{tags}</div>}
        </header>
      )}
      {subtitle && <p className="cs-research-item__subtitle">{subtitle}</p>}
      {isFilled(children) && <div className="cs-research-item__body">{children}</div>}
    </article>
  );
}

function Items({ children, columns }) {
  return <div className={`cs-research-items ${columns === 1 ? "is-single" : ""}`}>{children}</div>;
}

function Field({ label, children }) {
  if (!isFilled(children)) return null;
  return (
    <div className="cs-research-field">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Para({ value }) {
  const body = text(value);
  if (!body) return null;
  return <p className="cs-research-para">{body}</p>;
}

function Note({ children, icon: Icon = Info }) {
  if (!isFilled(children)) return null;
  return <p className="cs-research-note"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{children}</p>;
}

/** Any value, rendered by shape: prose, link, chips/bullets, sub-cards or labeled fields. */
function SmartValue({ value }) {
  if (!isFilled(value)) return <p className="cs-research-muted">—</p>;
  if (typeof value === "boolean") return <p>{value ? "Yes" : "No"}</p>;
  if (typeof value !== "object") return isUrl(value) ? <LinkedText value={value} /> : <Para value={String(value)} />;
  if (Array.isArray(value)) {
    const items = list(value);
    if (items.every((item) => typeof item !== "object")) return <SmartList items={items} />;
    return <Items>{items.map((item, index) => <GenericCard key={index} item={item} />)}</Items>;
  }
  return (
    <div className="cs-research-fields">
      {Object.entries(value).filter(([, child]) => isFilled(child)).map(([key, child]) => (
        <Field key={key} label={words(key)}><SmartValue value={child} /></Field>
      ))}
    </div>
  );
}

/** A repeated object: its name up top, short scalar fields as tags, the rest as fields. */
function GenericCard({ item }) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return <ItemCard><SmartValue value={item} /></ItemCard>;
  const titleKey = TITLE_KEYS.find((key) => text(item[key]));
  const tagKeys = [];
  const fieldKeys = [];
  Object.entries(item).forEach(([key, value]) => {
    if (key === titleKey || /^id$|_id$|_ids$|^ad_ids$/.test(key) || !isFilled(value)) return;
    if ((typeof value === "number" || typeof value === "boolean" || (typeof value === "string" && value.length <= 24 && !isUrl(value)))) tagKeys.push(key);
    else fieldKeys.push(key);
  });
  return (
    <ItemCard
      title={titleKey ? text(item[titleKey]) : undefined}
      tags={tagKeys.length > 0 ? tagKeys.map((key) => (
        <Tag key={key} tone={toneFor(item[key])} title={words(key)}>
          {typeof item[key] === "boolean" ? `${words(key)}: ${item[key] ? "yes" : "no"}` : `${words(key)}: ${item[key]}`}
        </Tag>
      )) : undefined}
    >
      {fieldKeys.map((key) => <Field key={key} label={words(key)}><SmartValue value={item[key]} /></Field>)}
    </ItemCard>
  );
}

// ── Block builders ──────────────────────────────────────────────────────────

/**
 * A block descriptor: { id, node, key?: shown before "View Full Details",
 * wide?: spans both grid columns }. Builders return null for empty content.
 */
const block = (id, node, options = {}) => (node ? { id, node, ...options } : null);
/** Marks a section whose key view hides content that renders only in full mode. */
const MORE_MARKER = { id: "more", node: null, placeholder: true };

function textBlock(id, label, icon, value, options) {
  const body = text(value);
  return body ? block(id, <Block icon={icon} label={label}><Para value={body} /></Block>, { wide: body.length > 420, ...options }) : null;
}

function listBlock(id, label, icon, value, options = {}) {
  const values = strings(value);
  if (values.length === 0) return null;
  return block(id, (
    <Block icon={icon} label={label} tone={options.tone}>
      {options.chips || shortList(values) ? <Chips items={values} tone={options.tone} /> : <Bullets items={values} numbered={options.numbered} limit={options.limit} />}
    </Block>
  ), options);
}

/** Generic blocks for any keys a section renderer did not handle. */
function genericBlocks(data, handled = [], options = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const skip = new Set(handled);
  const entries = Object.entries(data).filter(([key, value]) => !skip.has(key) && isFilled(value));
  const scalars = entries.filter(([, value]) => typeof value !== "object" && !(typeof value === "string" && value.length > 60));
  const rest = entries.filter((entry) => !scalars.includes(entry));
  const blocks = [];
  if (scalars.length > 0) {
    blocks.push(block("generic-stats", (
      <Stats items={scalars.map(([key, value]) => ({ label: words(key), value: typeof value === "boolean" ? (value ? "Yes" : "No") : String(value) }))} />
    ), { wide: true, ...options }));
  }
  rest.forEach(([key, value]) => {
    const isCards = Array.isArray(value) && value.some((item) => item && typeof item === "object");
    const isLong = typeof value === "string" && value.length > 420;
    blocks.push(block(`generic-${key}`, (
      <Block icon={FileSearch} label={humanize(key)}><SmartValue value={value} /></Block>
    ), { wide: isCards || isLong || (value && typeof value === "object" && !Array.isArray(value)), ...options }));
  });
  return blocks;
}

/** Ingested product context is stored as { text }: bullets, or a markdown table. */
function contextTextBlocks(value, { label, icon, quotes } = {}) {
  const body = text(value);
  if (!body) return [];
  const lines = body.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const tableLines = lines.filter((line) => line.startsWith("|"));
  if (tableLines.length >= 3) {
    const rows = tableLines
      .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
      .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)));
    const [head, ...bodyRows] = rows;
    return [block("context-table", (
      <Block icon={icon} label={label}>
        <div className="cs-research-table-wrap">
          <table className="cs-research-table">
            <thead><tr>{head.map((cell, index) => <th key={index} scope="col">{cell}</th>)}</tr></thead>
            <tbody>{bodyRows.map((cells, rowIndex) => <tr key={rowIndex}>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Block>
    ), { key: true, wide: true })];
  }
  const items = strings(body);
  if (quotes) {
    return [block("context-quotes", (
      <Block icon={icon} label={label}>
        <div className="cs-research-quotes">{items.map((item, index) => <QuoteCard key={index} quote={item} />)}</div>
      </Block>
    ), { key: true, wide: true })];
  }
  if (items.length > 1) return [listBlock("context-list", label, icon, items, { key: true, wide: true })];
  return [textBlock("context-text", label, icon, body, { key: true, wide: true })];
}

const leadBlock = (value, tags) => (text(value) ? block("lead", <Lead tags={tags}>{text(value)}</Lead>, { key: true, wide: true }) : null);
const statsBlock = (items, options = {}) => (items.some((item) => item && isFilled(item.value))
  ? block("stats", <Stats items={items} />, { key: true, wide: true, ...options }) : null);

function evidenceQuotes(item) {
  const evidence = list(item?.evidence);
  if (evidence.length > 0) {
    return evidence.map((entry, index) => <QuoteCard key={index} quote={entry.quote || entry.text} href={entry.url} />);
  }
  return strings(item?.quotes || item?.customer_quotes).map((quote, index) => <QuoteCard key={index} quote={quote} />);
}

// ── Section renderers ───────────────────────────────────────────────────────

function redditBlocks(data) {
  const sources = list(data.sources);
  const communities = new Set(sources.map((source) => source.subreddit).filter(Boolean));
  const themeCards = (items) => list(items).map((item, index) => (
    <ItemCard
      key={item.id || index}
      title={words(item.theme || item.name || item.question || item.request || `Finding ${index + 1}`)}
      tags={<>
        {item.sentiment && <Tag tone={toneFor(item.sentiment)}>{words(item.sentiment)}</Tag>}
        {item.evidence_scope && <Tag title="What the evidence is about">{words(item.evidence_scope)}</Tag>}
        {item.supporting_threads != null && <Tag>{plural(item.supporting_threads, "thread")}</Tag>}
      </>}
    >
      {evidenceQuotes(item)}
    </ItemCard>
  ));
  const themeBlock = (id, label, icon, tone, items, options = {}) => (list(items).length > 0
    ? block(id, <Block icon={icon} label={label} tone={tone}><Items columns={options.wide ? undefined : 1}>{themeCards(items)}</Items></Block>, options) : null);
  const findings = ["positive", "negative", "alternatives_mentioned", "questions", "feature_requests"]
    .reduce((sum, key) => sum + list(data[key]).length, 0);

  return [
    leadBlock(data.summary),
    statsBlock([
      { label: "Threads analyzed", value: data.threads_analyzed ?? (sources.length || null) },
      { label: "Communities", value: communities.size || null },
      { label: "Findings", value: findings || null },
      { label: "Search country", value: data.coverage?.search_country },
    ]),
    themeBlock("positive", "What people like", ThumbsUp, "good", data.positive, { key: true }),
    themeBlock("negative", "What puts people off", ThumbsDown, "bad", data.negative, { key: true }),
    themeBlock("alternatives", "Alternatives mentioned", Swords, null, data.alternatives_mentioned, { wide: true }),
    themeBlock("questions", "Questions people ask", HelpCircle, null, data.questions),
    themeBlock("requests", "Feature requests", Wrench, null, data.feature_requests),
    sources.length > 0 ? block("sources", (
      <Block icon={MessageCircle} label={`Threads read (${sources.length})`}>
        <ul className="cs-research-links">
          {sources.map((source, index) => (
            <li key={source.id || index}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.url}</a>
              {source.subreddit && <small>r/{source.subreddit}</small>}
            </li>
          ))}
        </ul>
      </Block>
    ), { wide: true }) : null,
    listBlock("queries", "Searches run", Search, data.queries_used, { chips: false }),
    list(data.search_warnings).length > 0 ? block("warnings", (
      <Block icon={Info} label="How to read this">{strings(data.search_warnings).map((warning, index) => <Note key={index}>{warning}</Note>)}</Block>
    )) : null,
    ...genericBlocks(data, [
      "sources", "summary", "coverage", "negative", "positive", "questions", "generated_at", "queries_used",
      "search_warnings", "feature_requests", "threads_analyzed", "alternatives_mentioned",
    ]),
  ];
}

function pricingContent(pricing) {
  if (!pricing || typeof pricing !== "object") return null;
  const tiers = list(pricing.tiers);
  return (
    <div className="cs-research-stack">
      <Stats items={[
        { label: "Starts at", value: text(pricing.starts_at) },
        { label: "Subscription", value: text(pricing.subscription) },
      ]} />
      {text(pricing.summary) && <Para value={pricing.summary} />}
      {tiers.length > 0 && (
        <Items>
          {tiers.map((tier, index) => (
            <ItemCard key={index} title={text(tier.name) || `Tier ${index + 1}`} tags={<Tag tone="brand">{text(tier.price)}</Tag>}>
              {text(tier.includes) && <Para value={tier.includes} />}
            </ItemCard>
          ))}
        </Items>
      )}
      <Field label="Bundles and discounts"><SmartList items={pricing.bundles_or_discounts} /></Field>
    </div>
  );
}

function pricingBlocks(data, options = {}) {
  if (!data || typeof data !== "object") return [];
  if (typeof data.text === "string") return contextTextBlocks(data.text, { label: "Pricing", icon: DollarSign });
  return [block("pricing", <Block icon={DollarSign} label="Pricing">{pricingContent(data)}</Block>, { wide: true, key: true, ...options })];
}

function marketBlocks(data, options = {}) {
  if (!data || typeof data !== "object") return [];
  const level = data.sophistication_level ?? data.market_sophistication;
  const keyed = (extra) => ({ ...options, ...extra });
  return [
    statsBlock([
      { label: "Sophistication", value: level != null && level !== "" ? `Stage ${level} of 5` : null },
      { label: "Competition", value: words(data.competitive_density) },
    ], { id: "market-stats", ...options }),
    textBlock("landscape", "Market landscape", MapIcon, data.market_landscape, keyed({ wide: true })),
    text(data.competitive_positioning) ? block("positioning", (
      <Callout icon={Target} label="Competitive positioning">{text(data.competitive_positioning)}</Callout>
    ), keyed()) : null,
    textBlock("demographics", "Who buys", Users, data.customer_demographics, keyed()),
    listBlock("trends", "Key trends", TrendingUp, data.key_trends, { ...options, key: false }),
    listBlock("opportunities", "Market opportunities", Lightbulb, data.market_based_opportunities, { ...options, key: false, tone: "good" }),
    textBlock("sophistication", "Why this sophistication stage", Gauge, data.sophistication_reasoning, { ...options, key: false }),
    ...genericBlocks(data, [
      "key_trends", "market_landscape", "competitive_density", "sophistication_level", "market_sophistication",
      "customer_demographics", "competitive_positioning", "sophistication_reasoning", "market_based_opportunities",
    ]),
  ];
}

function emotionList(items) {
  const values = list(items);
  if (values.length === 0) return null;
  return (
    <ul className="cs-research-value-list">
      {values.map((item, index) => (
        <li key={index}>
          {typeof item === "object"
            ? <><strong>{item.emotion || item.name}</strong>{item.why && <span className="cs-persona-why"> {item.why}</span>}</>
            : String(item)}
        </li>
      ))}
    </ul>
  );
}

function brandDeepDiveBlocks(data, { full }) {
  const voice = data.brand_voice || {};
  const market = data.market_analysis || {};
  const level = market.sophistication_level;
  return [
    leadBlock(data.summary),
    statsBlock([
      { label: "Market", value: text(data.detected_market) },
      { label: "Sophistication", value: level != null && level !== "" ? `Stage ${level} of 5` : null },
      { label: "Competition", value: words(market.competitive_density) },
      { label: "Starts at", value: text(data.pricing?.starts_at) },
    ]),
    listBlock("usps", "Unique selling points", Star, data.usps, { key: true, numbered: true }),
    listBlock("claims", "Claims the brand makes", BadgeCheck, data.claims, { key: true, limit: full ? undefined : 5 }),
    isFilled(voice) ? block("voice", (
      <Block icon={Mic} label="Brand voice">
        <div className="cs-research-stack">
          <Chips items={voice.tone_descriptors} />
          <Field label="Sounds like"><Bullets items={voice.operates_in} /></Field>
          <Field label="Avoids"><Bullets items={voice.avoids} /></Field>
        </div>
      </Block>
    ), { key: true, wide: true }) : null,
    (text(data.product_description) || text(data.level_up_positioning)) ? block("product", (
      <Block icon={Package} label="The product">
        <div className="cs-research-stack">
          <Para value={data.product_description} />
          {text(data.level_up_positioning) && <Callout icon={TrendingUp} label="Level-up positioning">{text(data.level_up_positioning)}</Callout>}
        </div>
      </Block>
    ), { wide: true }) : null,
    listBlock("benefits", "Benefits", Sparkles, data.benefits),
    listBlock("features", "Features", Layers, data.features),
    listBlock("mechanisms", "How it works", Puzzle, data.mechanisms),
    listBlock("problems", "Unacceptable problems it solves", AlertTriangle, data.unacceptable_problems),
    listBlock("use-cases", "Use cases", Users, data.use_cases),
    list(data.life_force_8).length > 0 ? block("lf8", <Block icon={Flame} label="Life Force 8 emotions">{emotionList(data.life_force_8)}</Block>) : null,
    listBlock("awareness", "Awareness stages targeted", Eye, strings(data.current_awareness_stages_targeted).map(words), { chips: true }),
    isFilled(data.current_ad_gaps) ? block("ad-gaps", <Block icon={Target} label="Current ad gaps"><SmartValue value={data.current_ad_gaps} /></Block>) : null,
    isFilled(data.pricing) ? block("pricing", <Block icon={DollarSign} label="Pricing">{pricingContent(data.pricing)}</Block>, { wide: true }) : null,
    isFilled(market) ? block("market-heading", <h4 className="cs-research-subheading">Market analysis</h4>, { wide: true }) : null,
    ...marketBlocks(market, { key: false }).map((entry) => entry && { ...entry, id: `market-${entry.id}`, key: false }),
    ...genericBlocks(data, [
      "usps", "claims", "pricing", "summary", "benefits", "features", "use_cases", "mechanisms", "brand_voice",
      "life_force_8", "current_ad_gaps", "detected_market", "market_analysis", "product_description",
      "level_up_positioning", "unacceptable_problems", "current_awareness_stages_targeted",
    ]),
  ];
}

function painCards(items) {
  return list(items).map((item, index) => (typeof item === "object" ? (
    <ItemCard
      key={index}
      title={text(item.pain || item.name)}
      tags={<>
        {item.frequency && <Tag tone={toneFor(item.frequency)} title="How often it comes up">{words(item.frequency)}</Tag>}
        {item.source && <Tag title="Where it was found">{words(item.source)}</Tag>}
      </>}
    >
      {evidenceQuotes(item)}
    </ItemCard>
  ) : <ItemCard key={index} title={String(item)} />));
}

function languageEntryBlocks(entries, idPrefix = "language") {
  const values = list(entries);
  const groups = new Map();
  values.forEach((entry) => {
    const category = typeof entry === "object" ? (entry.category || entry.tag || "other") : "other";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(entry);
  });
  return [...groups.entries()].map(([category, items]) => block(`${idPrefix}-${category}`, (
    <Block icon={Quote} label={`${words(category)} language`} tone={toneFor(category)}>
      <div className="cs-research-quotes">
        {items.map((entry, index) => (typeof entry === "object" ? (
          <div key={index} className="cs-research-stack">
            <QuoteCard quote={entry.phrase || entry.text} href={entry.source_url} />
            {(entry.context || entry.reason || entry.reframe) && (
              <p className="cs-research-hint">
                {entry.context || entry.reason}
                {entry.reframe && <><br /><strong>Reframe:</strong> {entry.reframe}</>}
              </p>
            )}
          </div>
        ) : <QuoteCard key={index} quote={entry} />))}
      </div>
    </Block>
  ), { key: true }));
}

function reviewMiningBlocks(data) {
  const pains = list(data.pain_points);
  return [
    leadBlock(data.summary, data.partial_retrieval ? <Tag tone="warn" title="Some sources could not be retrieved">Partial data</Tag> : null),
    statsBlock([
      { label: "Reviews analyzed", value: data.reviews_analyzed_count_estimate, hint: "estimate" },
      { label: "Pain points", value: pains.length || null },
      { label: "Objections", value: list(data.objections).length || null },
      { label: "Trigger points", value: list(data.trigger_points).length || null },
    ]),
    pains.length > 0 ? block("pains", <Block icon={Zap} label="Pain points"><Items>{painCards(pains)}</Items></Block>, { key: true, wide: true }) : null,
    listBlock("objections", "Objections", ShieldAlert, data.objections, { key: true }),
    listBlock("triggers", "Trigger points", Flame, data.trigger_points, { key: true }),
    list(data.golden_nugget_reviews).length > 0 ? block("nuggets", (
      <Block icon={Star} label="Golden nugget reviews">
        <div className="cs-research-quotes">
          {list(data.golden_nugget_reviews).map((review, index) => (
            <div key={index} className="cs-research-stack">
              <QuoteCard quote={review.text} href={review.source_url} meta={review.rating ? `${review.rating}★` : null} />
              {review.why_gold && <p className="cs-research-hint">{review.why_gold}</p>}
            </div>
          ))}
        </div>
      </Block>
    ), { wide: true }) : null,
    listBlock("alternatives", "Alternatives tried", Repeat, data.alternatives_tried),
    listBlock("loyalty", "Loyalty drivers", ThumbsUp, data.loyalty_drivers, { tone: "good" }),
    listBlock("transformations", "Life transformations", Sparkles, data.life_transformations),
    listBlock("power-words", "Power words", Type, data.power_words, { chips: true }),
    ...languageEntryBlocks(data.language_bank, "review-language").map((entry) => entry && { ...entry, key: false }),
    list(data.retrieval_warnings).length > 0 ? block("warnings", (
      <Block icon={Info} label="Retrieval notes">{strings(data.retrieval_warnings).map((warning, index) => <Note key={index}>{warning}</Note>)}</Block>
    )) : null,
    ...genericBlocks(data, [
      "summary", "objections", "pain_points", "power_words", "language_bank", "trigger_points", "loyalty_drivers",
      "partial_retrieval", "alternatives_tried", "retrieval_warnings", "life_transformations", "golden_nugget_reviews",
      "reviews_analyzed_count_estimate",
    ]),
  ];
}

function languageBankBlocks(data) {
  const entries = list(data.entries);
  if (entries.length === 0) {
    return [block("empty", <Note>No verbatim customer language was captured in this run. Review mining found too few on-topic customer quotes.</Note>, { key: true, wide: true })];
  }
  return [
    statsBlock([{ label: "Phrases", value: entries.length }]),
    ...languageEntryBlocks(entries),
    ...genericBlocks(data, ["entries"]),
  ];
}

const COMPETITOR_HANDLED = new Set([
  "name", "domain", "category", "positioning", "music", "angles", "top_ads", "creators", "emotions", "text_hooks",
  "visual_hooks", "copy_patterns", "editing_style", "creative_types", "creative_velocity", "patterns_and_takeaways",
  "active_ads_count_estimate", "awareness_stages_targeted", "offers", "strengths", "weaknesses",
]);
const NOT_OBSERVED = /^(not applicable|unknown|not observable|n\/a|none|no data)/i;
const observed = (value) => {
  const body = text(value);
  return body && !NOT_OBSERVED.test(body) ? body : "";
};

function CompetitorCard({ competitor, index, full }) {
  const angles = strings(competitor.angles);
  const extras = Object.entries(competitor).filter(([key, value]) => !COMPETITOR_HANDLED.has(key) && isFilled(value));
  const copy = competitor.copy_patterns && typeof competitor.copy_patterns === "object"
    ? Object.entries(competitor.copy_patterns).filter(([, value]) => observed(value)) : [];
  const creative = [
    ["Formats", strings(competitor.creative_types).join(", ")],
    ["Editing style", observed(competitor.editing_style)],
    ["Creators", observed(competitor.creators)],
    ["Music", observed(competitor.music)],
  ].filter(([, value]) => value);
  const topAds = list(competitor.top_ads);
  const domain = text(competitor.domain);

  return (
    <article className={`cs-research-competitor ${index % 2 === 1 ? "is-orange" : ""}`}>
      <header>
        <div className="cs-research-competitor__title">
          <h5>{competitor.name || `Competitor ${index + 1}`}</h5>
          {domain && (
            <a href={/^https?:/i.test(domain) ? domain : `https://${domain}`} target="_blank" rel="noopener noreferrer">
              {domain.replace(/^https?:\/\/(www\.)?/i, "")}<ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
        {(text(competitor.positioning) || text(competitor.category)) && <p>{text(competitor.positioning) || text(competitor.category)}</p>}
        <div className="cs-research-competitor__tags">
          {text(competitor.positioning) && text(competitor.category) && <span>{text(competitor.category)}</span>}
          {competitor.active_ads_count_estimate != null && <span>~{competitor.active_ads_count_estimate} active ads</span>}
          {text(competitor.creative_velocity) && <span>{words(competitor.creative_velocity)} velocity</span>}
          {strings(competitor.awareness_stages_targeted).map((stage) => <span key={stage}>{words(stage)}</span>)}
        </div>
      </header>
      <div className="cs-research-competitor__body">
        {text(competitor.patterns_and_takeaways) && (
          <div className="is-wide"><Callout icon={Lightbulb} label="Takeaways">{text(competitor.patterns_and_takeaways)}</Callout></div>
        )}
        {strings(competitor.offers).length > 0 && <Field label="Offers"><SmartList items={competitor.offers} /></Field>}
        {angles.length > 0 && <Field label="Angles"><Bullets items={angles} limit={full ? undefined : 3} /></Field>}
        {strings(competitor.strengths).length > 0 && <Field label="Strengths"><SmartList items={competitor.strengths} tone="good" /></Field>}
        {strings(competitor.weaknesses).length > 0 && <Field label="Weaknesses"><SmartList items={competitor.weaknesses} tone="bad" /></Field>}
        {full && (
          <>
            {strings(competitor.text_hooks).length > 0 && <Field label="Text hooks"><Bullets items={competitor.text_hooks} /></Field>}
            {strings(competitor.visual_hooks).length > 0 && <Field label="Visual hooks"><Bullets items={competitor.visual_hooks} /></Field>}
            {strings(competitor.emotions).length > 0 && <Field label="Emotions"><Chips items={competitor.emotions} /></Field>}
            {copy.length > 0 && (
              <Field label="Copy patterns">
                <div className="cs-research-fields">
                  {copy.map(([key, value]) => (
                    <p key={key}><strong>{key === "ctas" ? "CTAs" : words(key)}:</strong> {text(value)}</p>
                  ))}
                </div>
              </Field>
            )}
            {creative.length > 0 && (
              <Field label="Creative">
                <div className="cs-research-fields">{creative.map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}</div>
              </Field>
            )}
            {topAds.length > 0 && (
              <div className="is-wide">
                <Field label={`Top ads (${topAds.length})`}><Items>{topAds.map((ad, adIndex) => <GenericCard key={adIndex} item={ad} />)}</Items></Field>
              </div>
            )}
            {extras.map(([key, value]) => <Field key={key} label={words(key)}><SmartValue value={value} /></Field>)}
          </>
        )}
      </div>
    </article>
  );
}

function competitorScanBlocks(data, { full }) {
  const competitors = list(data.competitors);
  return [
    leadBlock(data.summary),
    statsBlock([
      { label: "Competitors", value: competitors.length || null },
      { label: "Untapped angles", value: list(data.untapped_angles).length || null },
      { label: "Market clichés", value: list(data.market_cliches).length || null },
      { label: "Awareness gaps", value: list(data.awareness_stage_coverage_gaps).length || null },
    ]),
    competitors.length > 0 ? block("competitors", (
      <div className="cs-research-competitors">
        {competitors.map((competitor, index) => <CompetitorCard key={competitor.name || index} competitor={competitor} index={index} full={full} />)}
      </div>
    ), { key: true, wide: true }) : null,
    listBlock("untapped", "Untapped angles", Lightbulb, data.untapped_angles, { key: true, tone: "good", limit: full ? undefined : 4 }),
    listBlock("cliches", "Market clichés to avoid", Ban, data.market_cliches, { key: true, tone: "bad", limit: full ? undefined : 4 }),
    listBlock("awareness-gaps", "Awareness stage gaps", Eye, data.awareness_stage_coverage_gaps, { wide: true }),
    textBlock("formats", "Format patterns in the market", Clapperboard, data.market_format_patterns, { wide: true }),
    ...genericBlocks(data, ["summary", "competitors", "market_cliches", "untapped_angles", "market_format_patterns", "awareness_stage_coverage_gaps"]),
  ];
}

function sentimentAlignmentBlocks(data) {
  const guardrails = data.copy_guardrails || {};
  const lanes = [
    { key: "safe_to_use", label: "Safe to use", icon: ShieldCheck, tone: "good" },
    { key: "use_with_reframing", label: "Reframe first", icon: ShieldAlert, tone: "warn" },
    { key: "keep_as_research_only", label: "Research only", icon: ShieldX, tone: "bad" },
  ].filter((lane) => strings(guardrails[lane.key]).length > 0);
  const registerCards = (items, detailKey) => list(items).map((item, index) => (
    <ItemCard key={index} title={words(item.register)}>{text(item[detailKey]) && <Para value={item[detailKey]} />}</ItemCard>
  ));
  return [
    leadBlock(data.summary),
    text(data.the_line) ? block("line", <Callout icon={Scale} label="The line" tone="dark">{text(data.the_line)}</Callout>, { key: true, wide: true }) : null,
    lanes.length > 0 ? block("guardrails", (
      <Block icon={ListChecks} label="Copy guardrails">
        <div className="cs-research-lanes">
          {lanes.map((lane) => (
            <div key={lane.key} className={`cs-research-lane is-${lane.tone}`}>
              <h5><lane.icon className="h-3.5 w-3.5" aria-hidden="true" />{lane.label}</h5>
              <Bullets items={guardrails[lane.key]} />
            </div>
          ))}
        </div>
      </Block>
    ), { key: true, wide: true }) : null,
    list(data.brand_operates_in).length > 0 ? block("operates", (
      <Block icon={CircleCheck} label="Registers the brand uses" tone="good"><Items columns={1}>{registerCards(data.brand_operates_in, "evidence")}</Items></Block>
    )) : null,
    list(data.brand_avoids).length > 0 ? block("avoids", (
      <Block icon={Ban} label="Registers the brand avoids" tone="bad"><Items columns={1}>{registerCards(data.brand_avoids, "reason")}</Items></Block>
    )) : null,
    ...languageEntryBlocks(data.language_bank_tagged, "tagged-language").map((entry) => entry && { ...entry, key: false }),
    ...languageEntryBlocks(data.golden_nuggets_tagged, "tagged-nuggets").map((entry) => entry && { ...entry, key: false }),
    ...genericBlocks(data, ["summary", "the_line", "brand_avoids", "copy_guardrails", "brand_operates_in", "language_bank_tagged", "golden_nuggets_tagged"]),
  ];
}

function evidenceCards(items, titleKey) {
  return list(items).map((item, index) => (
    <ItemCard key={index} title={text(item[titleKey]) || String(item)}>
      {text(item.supporting_evidence) && <Field label="Evidence"><Para value={item.supporting_evidence} /></Field>}
    </ItemCard>
  ));
}

function consumerReportBlocks(data) {
  const languageSummary = data.language_bank_summary && typeof data.language_bank_summary === "object" ? data.language_bank_summary : {};
  const languageGroups = Object.entries(languageSummary).filter(([, values]) => strings(values).length > 0);
  return [
    leadBlock(data.summary),
    list(data.purchase_drivers).length > 0 ? block("drivers", (
      <Block icon={ThumbsUp} label="Why they buy" tone="good"><Items columns={1}>{evidenceCards(data.purchase_drivers, "driver")}</Items></Block>
    ), { key: true }) : null,
    list(data.common_objections).length > 0 ? block("objections", (
      <Block icon={ShieldAlert} label="Why they hesitate" tone="bad"><Items columns={1}>{evidenceCards(data.common_objections, "objection")}</Items></Block>
    ), { key: true }) : null,
    text(data.opportunities_summary) ? block("opportunities", (
      <Callout icon={Compass} label="Where to play" tone="dark">{text(data.opportunities_summary)}</Callout>
    ), { key: true, wide: true }) : null,
    textBlock("profile", "Customer profile", Users, data.customer_profile_summary),
    textBlock("market", "Market overview", MapIcon, data.market_overview),
    textBlock("landscape", "Competitive landscape", Swords, data.competitive_landscape, { wide: true }),
    languageGroups.length > 0 ? block("language", (
      <Block icon={Quote} label="Customer language">
        <div className="cs-research-lanes">
          {languageGroups.map(([group, values]) => (
            <div key={group} className={`cs-research-lane is-${toneFor(group === "desire" || group === "transformation" ? "positive" : group === "pain" ? "negative" : "mixed")}`}>
              <h5>{words(group)}</h5>
              <div className="cs-research-quotes">{strings(values).map((value, index) => <QuoteCard key={index} quote={value} />)}</div>
            </div>
          ))}
        </div>
      </Block>
    ), { wide: true }) : null,
    list(data.review_highlights).length > 0 ? block("highlights", (
      <Block icon={Star} label="Review highlights">
        <div className="cs-research-quotes">
          {list(data.review_highlights).map((review, index) => <QuoteCard key={index} quote={review.text || review} href={review.source_url} />)}
        </div>
      </Block>
    )) : null,
    list(data.data_completeness).length > 0 ? block("completeness", (
      <Block icon={ClipboardList} label="Data completeness">
        <ul className="cs-research-status-list">
          {list(data.data_completeness).map((row, index) => (
            <li key={index}>
              <div><strong>{row.phase}</strong><Tag tone={toneFor(row.status)}>{words(row.status)}</Tag></div>
              {row.notes && <p>{row.notes}</p>}
            </li>
          ))}
        </ul>
      </Block>
    )) : null,
    listBlock("followup", "Follow up manually", ListChecks, data.areas_for_manual_followup, { wide: true }),
    ...genericBlocks(data, [
      "summary", "market_overview", "purchase_drivers", "common_objections", "data_completeness", "review_highlights",
      "competitive_landscape", "language_bank_summary", "opportunities_summary", "customer_profile_summary",
      "areas_for_manual_followup",
    ]),
  ];
}

const SUMMARY_KEY_ROWS = new Set(["description", "core_beliefs", "desires", "key_usps"]);

function SummaryCell({ value }) {
  if (!isFilled(value)) return <span className="cs-research-muted">—</span>;
  if (typeof value === "string") return <p>{value}</p>;
  const items = list(value);
  if (items.some((item) => item && typeof item === "object" && ("problem" in item || "solution" in item))) {
    return (
      <ul className="cs-research-cell-pairs">
        {items.map((item, index) => <li key={index}><span>{item.problem}</span>{item.solution && <span>→ {item.solution}</span>}</li>)}
      </ul>
    );
  }
  if (items.some((item) => item && typeof item === "object" && "emotion" in item)) {
    return <div className="cs-persona-chips cs-research-chips">{items.map((item, index) => <span key={index} title={item.why}>{item.emotion}</span>)}</div>;
  }
  return <SmartList items={items} />;
}

function personaSummaryBlocks(data, { full }) {
  const columns = list(data.columns);
  if (columns.length === 0) return [block("empty", <Note>No research personas are available for comparison.</Note>, { key: true, wide: true })];
  const rows = list(data.rows).filter((row) => (full || SUMMARY_KEY_ROWS.has(row.field_key)));
  const table = (
    <div className="cs-research-table-wrap">
      <table className="cs-research-table is-compare">
        <caption className="sr-only">Side-by-side comparison of research personas</caption>
        <thead>
          <tr>
            <th scope="col">Field</th>
            {columns.map((column, index) => (
              <th key={index} scope="col"><span className="cs-research-table__persona">P{index + 1}</span>{column.persona_label || `Persona ${index + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.field_key || index}>
              <th scope="row">{row.field_label || humanize(row.field_key)}</th>
              {columns.map((_, columnIndex) => <td key={columnIndex}><SummaryCell value={row.values?.[columnIndex]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return [
    block("table", table, { key: true, wide: true }),
    list(data.rows).some((row) => !SUMMARY_KEY_ROWS.has(row.field_key)) ? MORE_MARKER : null,
  ];
}

function itemsBlocks(type, data) {
  const config = {
    features: { label: "Features", icon: Layers, chips: true },
    benefits: { label: "Benefits", icon: Sparkles },
    objections: { label: "Objections", icon: ShieldAlert },
    pain_points: { label: "Pain points", icon: Zap },
    testimonials: { label: "Testimonials", icon: Quote, quotes: true },
  }[type] || { label: humanize(type), icon: FileSearch };
  if (typeof data?.text === "string") return contextTextBlocks(data.text, config);
  const items = list(data?.items);
  if (items.length === 0) return genericBlocks(data, [], { key: true });
  if (items.some((item) => item && typeof item === "object")) {
    return [
      statsBlock([{ label: config.label, value: items.length }]),
      block("items", <Block icon={config.icon} label={config.label}><Items>{type === "pain_points" ? painCards(items) : items.map((item, index) => <GenericCard key={index} item={item} />)}</Items></Block>, { key: true, wide: true }),
    ];
  }
  if (config.chips) return [listBlock("items", `${config.label} (${items.length})`, config.icon, items, { key: true, wide: true, chips: true })];
  return [block("items", (
    <Block icon={config.icon} label={`${config.label} (${items.length})`}>
      <div className="cs-research-tiles">{strings(items).map((item, index) => <p key={index}><span>{index + 1}</span>{item}</p>)}</div>
    </Block>
  ), { key: true, wide: true })];
}

function brandingBlocks(data) {
  if (typeof data.text === "string") return contextTextBlocks(data.text, { label: "Branding", icon: Palette });
  const tones = typeof data.tone_of_voice === "string" ? data.tone_of_voice.split(/\s*,\s*/).filter(Boolean) : strings(data.tone_of_voice);
  return [
    statsBlock([
      { label: "Market", value: text(data.detected_market) },
      { label: "Sophistication", value: data.market_sophistication != null && data.market_sophistication !== "" ? `Stage ${data.market_sophistication} of 5` : null },
    ]),
    tones.length > 0 || text(data.writing_style) ? block("voice", (
      <Block icon={Mic} label="Voice">
        <div className="cs-research-stack">
          <Chips items={tones} />
          <Para value={data.writing_style} />
        </div>
      </Block>
    ), { key: true, wide: true }) : null,
    listBlock("usps", "Unique selling points", Star, data.usps, { key: true, numbered: true }),
    listBlock("avoids", "Voice avoids", Ban, data.voice_avoids, { key: true, tone: "bad" }),
    listBlock("claims", "Claims", BadgeCheck, data.claims, { wide: true }),
    ...genericBlocks(data, ["usps", "claims", "voice_avoids", "tone_of_voice", "writing_style", "detected_market", "market_sophistication"]),
  ];
}

function crossMapBlocks(data) {
  const summary = data.coverage_summary || {};
  const matched = list(data.matched_personas);
  const unmatched = list(data.unmatched_ad_personas);
  const unreached = list(data.unreached_research_personas);
  return [
    statsBlock([
      { label: "Coverage", value: summary.coverage_percentage != null ? percent(summary.coverage_percentage) : null, hint: "research personas reached by ads" },
      { label: "Matched", value: summary.matched_count ?? (matched.length || null) },
      { label: "Ad audiences not in research", value: summary.unmatched_ad_count ?? unmatched.length },
      { label: "Research personas not reached", value: summary.unreached_research_count ?? unreached.length },
    ]),
    text(summary.top_opportunity) ? block("opportunity", <Callout icon={Target} label="Top opportunity" tone="dark">{text(summary.top_opportunity)}</Callout>, { key: true, wide: true }) : null,
    matched.length > 0 ? block("matched", (
      <Block icon={UserCheck} label="Matched personas">
        <Items>
          {matched.map((match, index) => (
            <ItemCard
              key={index}
              title={text(match.ad_derived_persona) || `Match ${index + 1}`}
              subtitle={text(match.research_persona)}
              tags={<>
                {match.confidence && <Tag tone={match.confidence === "high" ? "good" : match.confidence === "low" ? "warn" : "neutral"}>{words(match.confidence)} confidence</Tag>}
                {match.ad_count != null && <Tag>{plural(match.ad_count, "ad")}</Tag>}
                {match.total_spend != null && <Tag tone="brand">{money(match.total_spend)}</Tag>}
              </>}
            >
              <Para value={match.overlap_summary} />
              <Field label="Angles tested"><Chips items={match.angles_tested} tone="good" /></Field>
              <Field label="Angles not yet tested"><Bullets items={match.angles_untested} /></Field>
            </ItemCard>
          ))}
        </Items>
      </Block>
    ), { key: true, wide: true }) : null,
    unmatched.length > 0 ? block("unmatched", (
      <Block icon={UserX} label="Ad audiences research didn't predict"><Items>{unmatched.map((item, index) => <GenericCard key={index} item={item} />)}</Items></Block>
    ), { wide: true }) : null,
    unreached.length > 0 ? block("unreached", (
      <Block icon={Users} label="Research personas no ads reach"><Items>{unreached.map((item, index) => <GenericCard key={index} item={item} />)}</Items></Block>
    ), { wide: true }) : null,
    ...genericBlocks(data, ["coverage_summary", "matched_personas", "unmatched_ad_personas", "unreached_research_personas"]),
  ];
}

function secondarySignalsBlocks(data) {
  const items = list(data.items);
  if (items.length === 0) return genericBlocks(data, [], { key: true });
  return [
    block("signals", (
      <Block icon={Users} label={`Secondary audiences (${items.length})`}>
        <Items>
          {items.map((item, index) => (
            <ItemCard
              key={index}
              title={text(item.label) || `Signal ${index + 1}`}
              tags={<>
                {item.evidence_count != null && <Tag>{plural(item.evidence_count, "signal")}</Tag>}
                {item.evidence_source && <Tag title="Where the evidence came from">{words(item.evidence_source)}</Tag>}
              </>}
            >
              <Field label="Why it isn't a persona"><Para value={item.why_not_a_persona} /></Field>
              {text(item.suggested_creative_direction) && <Callout icon={Megaphone} label="Creative direction">{text(item.suggested_creative_direction)}</Callout>}
            </ItemCard>
          ))}
        </Items>
      </Block>
    ), { key: true, wide: true }),
  ];
}

function avatarsBlocks(data, { full, renderPersona }) {
  if (typeof data.text === "string") return contextTextBlocks(data.text, { label: "Customer avatars", icon: Users });
  const personas = list(data.personas);
  if (personas.length === 0) return genericBlocks(data, [], { key: true });
  return [
    block("avatars", (
      <div className="cs-research-avatars">
        {personas.map((persona, index) => (
          <article key={index} className="cs-research-avatar">
            <header>
              <span className="cs-persona-modal__number">P{index + 1}</span>
              <h5>{persona.name || persona.label || `Persona ${index + 1}`}</h5>
            </header>
            {text(persona.description) && <p className="cs-research-para">{text(persona.description)}</p>}
            {full && renderPersona ? renderPersona(persona) : <Field label="Angles"><Chips items={persona.angles} /></Field>}
          </article>
        ))}
      </div>
    ), { key: true, wide: true }),
    renderPersona ? MORE_MARKER : null,
  ];
}

const SECTION_BLOCKS = {
  reddit_sentiment: redditBlocks,
  brand_deep_dive: brandDeepDiveBlocks,
  review_mining: reviewMiningBlocks,
  language_bank: languageBankBlocks,
  competitor_scan: competitorScanBlocks,
  sentiment_alignment: sentimentAlignmentBlocks,
  consumer_research_report: consumerReportBlocks,
  persona_summary_table: personaSummaryBlocks,
  market_analysis: (data) => marketBlocks(data, { key: true }),
  pricing: (data) => pricingBlocks(data),
  branding: brandingBlocks,
  persona_cross_map: crossMapBlocks,
  secondary_audience_signals: secondarySignalsBlocks,
  customer_avatars: avatarsBlocks,
  features: (data) => itemsBlocks("features", data),
  benefits: (data) => itemsBlocks("benefits", data),
  objections: (data) => itemsBlocks("objections", data),
  pain_points: (data) => itemsBlocks("pain_points", data),
  testimonials: (data) => itemsBlocks("testimonials", data),
};

function sectionBlocks(type, data, options) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return [block("value", <Block icon={FileSearch} label={humanize(type)}><SmartValue value={data} /></Block>, { key: true, wide: true })];
  }
  const builder = SECTION_BLOCKS[type];
  const blocks = (builder ? builder(data, options) : genericFallback(data)).filter(Boolean);
  // Always show something before "View Full Details".
  if (blocks.length > 0 && !blocks.some((entry) => entry.key)) {
    blocks.slice(0, 2).forEach((entry) => { entry.key = true; });
  }
  return blocks;
}

function genericFallback(data) {
  const blocks = [
    leadBlock(data.summary || data.description),
    ...genericBlocks(data, ["summary", "description"]),
  ].filter(Boolean);
  return blocks.map((entry, index) => ({ ...entry, key: entry.key || index < 3 }));
}

/** Short header line for a collapsed section: counts instead of key names. */
// eslint-disable-next-line react-refresh/only-export-components
export function researchSectionMeta(type, data) {
  if (!data || typeof data !== "object") return [];
  const count = (value, one, many) => (list(value).length ? plural(list(value).length, one, many) : null);
  const metas = {
    reddit_sentiment: () => [
      data.threads_analyzed != null ? plural(data.threads_analyzed, "thread") : null,
      (() => { const size = new Set(list(data.sources).map((source) => source.subreddit)).size; return size ? plural(size, "community", "communities") : null; })(),
    ],
    brand_deep_dive: () => [count(data.usps, "USP"), count(data.claims, "claim"), count(data.benefits, "benefit")],
    review_mining: () => [count(data.pain_points, "pain point"), count(data.objections, "objection")],
    language_bank: () => [list(data.entries).length ? count(data.entries, "phrase") : "No phrases captured"],
    competitor_scan: () => [count(data.competitors, "competitor"), count(data.untapped_angles, "untapped angle")],
    sentiment_alignment: () => ["Copy guardrails", count(data.brand_avoids, "register to avoid", "registers to avoid")],
    consumer_research_report: () => [count(data.purchase_drivers, "purchase driver"), count(data.common_objections, "objection")],
    persona_summary_table: () => [count(data.columns, "persona"), count(data.rows, "field")],
    persona_cross_map: () => [data.coverage_summary?.coverage_percentage != null ? `${percent(data.coverage_summary.coverage_percentage)} coverage` : null, count(data.matched_personas, "match", "matches")],
    secondary_audience_signals: () => [count(data.items, "audience signal")],
    customer_avatars: () => [count(data.personas, "persona")],
    market_analysis: () => [data.sophistication_level != null ? `Stage ${data.sophistication_level} sophistication` : null, words(data.competitive_density)],
    pricing: () => [text(data.starts_at) && text(data.starts_at).length <= 40 ? `From ${text(data.starts_at)}` : null, count(data.tiers, "tier")],
    branding: () => [text(data.tone_of_voice), count(data.usps, "USP")],
  };
  const items = metas[type] ? metas[type]() : [count(data.items, "item")];
  return items.filter(Boolean);
}

/**
 * Expanded body of one research section: the key blocks, then every block once
 * "View Full Details" is clicked.
 */
export function ResearchSectionBody({ type, data, renderPersona }) {
  const [full, setFull] = useState(false);
  const toggleRef = useRef(null);
  const blocks = sectionBlocks(type, data, { full, renderPersona });
  const hasMore = full || blocks.some((entry) => !entry.key);
  const visible = (full ? blocks : blocks.filter((entry) => entry.key)).filter((entry) => !entry.placeholder);

  const toggle = () => {
    if (full) {
      // Collapsing a long section would leave the reader far below it.
      const article = toggleRef.current?.closest(".cs-research-intel");
      if (article && article.getBoundingClientRect().top < 0) article.scrollIntoView({ block: "start" });
    }
    setFull((current) => !current);
  };

  return (
    <>
      <div className="cs-research-layout">
        {visible.map((entry) => (
          <div key={entry.id} className={`cs-research-layout__cell ${entry.wide ? "is-wide" : ""}`}>{entry.node}</div>
        ))}
      </div>
      {hasMore && (
        <button ref={toggleRef} type="button" onClick={toggle} className="cs-research-details-button" aria-expanded={full}>
          {full ? <>Hide Details <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /></> : <>View Full Details <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></>}
        </button>
      )}
    </>
  );
}

const node = PropTypes.node;
Block.propTypes = { icon: PropTypes.elementType, label: PropTypes.string, tone: PropTypes.string, children: node };
Lead.propTypes = { children: node, tags: node };
Stats.propTypes = { items: PropTypes.array.isRequired };
Callout.propTypes = { icon: PropTypes.elementType, label: PropTypes.string, tone: PropTypes.string, children: node };
Chips.propTypes = { items: PropTypes.any, tone: PropTypes.string };
Bullets.propTypes = { items: PropTypes.any, numbered: PropTypes.bool, limit: PropTypes.number };
SmartList.propTypes = { items: PropTypes.any, tone: PropTypes.string, numbered: PropTypes.bool };
Tag.propTypes = { tone: PropTypes.string, title: PropTypes.string, children: node };
QuoteCard.propTypes = { quote: PropTypes.any, href: PropTypes.string, source: PropTypes.string, meta: node };
LinkedText.propTypes = { value: PropTypes.any };
ItemCard.propTypes = { title: node, subtitle: node, tags: node, children: node };
Items.propTypes = { children: node, columns: PropTypes.number };
Field.propTypes = { label: PropTypes.string.isRequired, children: node };
Para.propTypes = { value: PropTypes.any };
Note.propTypes = { children: node, icon: PropTypes.elementType };
SmartValue.propTypes = { value: PropTypes.any };
GenericCard.propTypes = { item: PropTypes.any };
CompetitorCard.propTypes = { competitor: PropTypes.object.isRequired, index: PropTypes.number.isRequired, full: PropTypes.bool };
SummaryCell.propTypes = { value: PropTypes.any };
ResearchSectionBody.propTypes = { type: PropTypes.string.isRequired, data: PropTypes.any, renderPersona: PropTypes.func };
