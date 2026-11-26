// The inventory: everything you carry, to look at and to use.
//
// Categories down the left, your things in a grid, and the one you picked on
// the right: big, with what it is, its details, and — for anything that has
// two sides, like a card or a cheque — a Flip button that turns it over.
//
// Nothing here is a new thing to collect: the inventory is drawn from what you
// already have. Your wallet and phone and the cards in your pocket; your bank
// card, passbook, cheque book and any cheque you haven't paid in yet; and what
// you've bought at the Shop, which can be equipped. No selling, no capacity.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/ui/Modal";
import { audio } from "@/framework/audio/audioManager";
import { api } from "@/framework/api";
import type { OwnedItem } from "@/framework/api";
import { useEconomyStore } from "@/framework/economy/economyStore";
import { loadBank, useBankStore } from "@/framework/bank/bankStore";
import { lookOf, useIdentity } from "@/framework/player/identity";
import { pocketFor } from "@/buildings/bank/pocket";
import {
  CardBack,
  CardFront,
  ChequeBack,
  ChequeBookCover,
  ChequeFace,
  IdBack,
  IdFront,
  PassbookCover,
  PassbookPage,
  PhoneBack,
  PhoneFront,
  ShopItemArt,
  WalletFront,
  WalletInside,
} from "./itemArt";
import { SHAPE_CLASS, THUMB, type Shape } from "./shapes";

type Category = "all" | "wallet" | "documents" | "shop";

const CATEGORIES: { id: Category; label: string; glyph: string }[] = [
  { id: "all", label: "All", glyph: "∞" },
  { id: "wallet", label: "Wallet & cards", glyph: "▭" },
  { id: "documents", label: "Documents", glyph: "▤" },
  { id: "shop", label: "Shop items", glyph: "✦" },
];

interface Item {
  id: string;
  category: Exclude<Category, "all">;
  name: string;
  kind: string;
  count?: number;
  description: string;
  stats: [string, string][];
  shape: Shape;
  front: ReactNode;
  back?: ReactNode;
  /** The labels for the two sides, when there are two. */
  sides?: [string, string];
  use?: { label: string; run: () => void };
  hint?: string;
}

export function Inventory({
  onClose,
  onOpenWallet,
  onOpenPassbook,
}: {
  onClose: () => void;
  onOpenWallet: () => void;
  onOpenPassbook: () => void;
}) {
  const cash = useEconomyStore((s) => s.coinBalance);
  const account = useBankStore((s) => s.account);
  const cheques = useBankStore((s) => s.cheques);
  const identity = useIdentity((s) => s.identity);
  const [owned, setOwned] = useState<OwnedItem[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<Category>("all");
  const [selected, setSelected] = useState<string>("wallet");
  const [flipped, setFlipped] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void loadBank().catch(() => undefined);
    void api
      .getInventory()
      .then((r) => setOwned(r.items))
      .catch(() => undefined);
    void api
      .getAvatar()
      .then((r) => setEquipped(r.equipped ?? {}))
      .catch(() => undefined);
  }, []);

  const items = useMemo<Item[]>(() => {
    const name = identity?.name ?? "";
    const pocket = pocketFor(name);
    const look = identity ? lookOf(identity) : undefined;
    const out: Item[] = [];

    // ── Wallet & cards ──
    out.push({
      id: "wallet",
      category: "wallet",
      name: "Wallet",
      kind: "Wallet",
      description:
        "Your cash. It's safe enough in your pocket, but it doesn't earn interest and it can't be paid by card.",
      stats: [
        ["Cash", cash === null ? "—" : `$${cash}`],
        ["In the bank", account ? `$${account.balance}` : "No account"],
      ],
      shape: "card",
      front: <WalletFront />,
      back: <WalletInside cash={cash} />,
      sides: ["Closed", "Open"],
      use: { label: "Wallet history", run: onOpenWallet },
    });
    if (account?.cardLast4) {
      out.push({
        id: "card",
        category: "wallet",
        name: "Meridian debit card",
        kind: "Bank card",
        description:
          "Takes money straight from your bank account, at the ATM or at the Shop's till. Protected by your PIN, which nobody from the bank will ever ask for.",
        stats: [
          ["Card", `•••• ${account.cardLast4}`],
          ["Expires", account.cardExpiry ?? ""],
          ["Account", `••••${account.accountNumber.slice(-4)}`],
          ["ATM limit", "$500 a time"],
        ],
        shape: "card",
        front: (
          <CardFront
            holder={account.holder}
            last4={account.cardLast4}
            expiry={account.cardExpiry ?? ""}
          />
        ),
        back: <CardBack signature={account.signature} />,
        sides: ["Front", "Back"],
        hint: "Use it at the ATMs in Meridian Bank, or pay by card at The Shop.",
      });
    }
    if (look) {
      for (const c of pocket.cards) {
        out.push({
          id: c.id,
          category: "wallet",
          name: c.title,
          kind: c.valid ? "Proof of identity" : "Card",
          description: c.valid
            ? "Your City ID: the card the bank accepts as proof of who you are."
            : (c.refusal ?? ""),
          stats: [
            ["Name", c.name],
            ["Address", c.address],
            ["Status", c.status],
          ],
          shape: "card",
          front: (
            <IdFront
              title={c.title}
              colour={c.colour}
              name={c.name}
              address={c.address}
              status={c.status}
              look={look}
            />
          ),
          back: <IdBack title={c.title} colour={c.colour} valid={c.valid} />,
          sides: ["Front", "Back"],
        });
      }
    }
    out.push({
      id: "phone",
      category: "wallet",
      name: "Phone",
      kind: "Phone",
      description:
        "The bank uses this number to warn you about anything unusual. A real bank never asks for your PIN or password by phone or text.",
      stats: [
        [
          "Number",
          `${pocket.phone.slice(0, 3)} ${pocket.phone.slice(3, 6)} ${pocket.phone.slice(6)}`,
        ],
      ],
      shape: "phone",
      front: <PhoneFront number={pocket.phone} />,
      back: <PhoneBack />,
      sides: ["Screen", "Back"],
    });

    // ── Documents ──
    if (account) {
      out.push({
        id: "passbook",
        category: "documents",
        name: "Passbook",
        kind: "Bank document",
        description:
          "Every dollar in and out of your account, with the balance after each. Print new entries at the passbook printer.",
        stats: [
          ["Account no.", account.accountNumber],
          ["Type", account.type],
          ["Balance", `$${account.balance}`],
        ],
        shape: "book",
        front: <PassbookCover />,
        back: (
          <PassbookPage
            holder={account.holder}
            number={account.accountNumber}
            type={account.type}
            balance={account.balance}
          />
        ),
        sides: ["Cover", "First page"],
        use: { label: "Read it", run: onOpenPassbook },
      });
      if (account.chequeLeaves > 0) {
        const next = String(account.nextCheque ?? 1).padStart(6, "0");
        out.push({
          id: "chequebook",
          category: "documents",
          name: "Cheque book",
          kind: "Bank document",
          count: account.chequeLeaves,
          description:
            "Numbered cheques, with your account number printed on every one. Never sign one until you've filled it in.",
          stats: [
            ["Cheques left", String(account.chequeLeaves)],
            ["Next number", next],
          ],
          shape: "cheque",
          front: <ChequeBookCover leaves={account.chequeLeaves} />,
          back: (
            <ChequeFace
              bank="MERIDIAN BANK"
              from={account.signature}
              to=""
              amount={0}
              words=""
              date=""
              number={next}
            />
          ),
          sides: ["Cover", "A blank cheque"],
          hint: "Write one at window 2 in Meridian Bank.",
        });
      }
    }
    for (const c of cheques.filter(
      (x) => x.direction === "in" && (x.status === "held" || x.status === "clearing"),
    )) {
      out.push({
        id: `cheque-${c.id}`,
        category: "documents",
        name: `Cheque from ${c.from}`,
        kind: "Cheque",
        description:
          c.status === "held"
            ? "Not money yet: pay it in at window 2 or the drop box, and the bank will clear it."
            : "Paid in and clearing: the money arrives when it clears.",
        stats: [
          ["Amount", `$${c.amount}`],
          ["Number", c.number],
          ["Status", c.status === "held" ? "Not paid in" : "Clearing"],
        ],
        shape: "cheque",
        front: (
          <ChequeFace
            bank="CITY SAVINGS BANK"
            from={c.from}
            to={account?.holder ?? name}
            amount={c.amount}
            words={c.words}
            date={c.date}
            number={c.number}
            crossed={c.crossed}
            memo={c.memo}
          />
        ),
        back: <ChequeBack paidIn={c.status !== "held"} />,
        sides: ["Front", "Back"],
        hint:
          c.status === "held"
            ? "Pay it in at window 2 (B ticket) or the cheque drop box."
            : undefined,
      });
    }

    // ── Shop items ──
    for (const it of owned) {
      const on = equipped[it.slot || it.category] === it.id;
      out.push({
        id: `shop-${it.id}`,
        category: "shop",
        name: it.name,
        kind: `${it.category.charAt(0)}${it.category.slice(1).toLowerCase()} · ${it.rarity.toLowerCase()}`,
        description: it.description,
        stats: [
          ["Rarity", it.rarity.toLowerCase()],
          ["Paid", it.priceCoins ? `$${it.priceCoins}` : "free"],
          ["Equipped", on ? "yes" : "no"],
        ],
        shape: "square",
        front: <ShopItemArt category={it.category} rarity={it.rarity} />,
        use: {
          label: on ? "Take off" : "Equip",
          run: () => {
            const slot = it.slot || it.category;
            const req = on ? api.unequipSlot(slot) : api.equipItem(it.id);
            void req
              .then((r) => {
                setEquipped(r.equipped ?? {});
                audio.play("ui_confirm");
                setNote(on ? `${it.name} taken off.` : `${it.name} equipped.`);
              })
              .catch(() => setNote("Couldn't change that just now."));
          },
        },
      });
    }
    return out;
  }, [cash, account, cheques, identity, owned, equipped, onOpenWallet, onOpenPassbook]);

  const shown = items.filter((i) => category === "all" || i.category === category);
  const current = items.find((i) => i.id === selected) ?? shown[0];

  const pick = (id: string) => {
    audio.play("ui_click");
    setSelected(id);
    setFlipped(false);
    setNote(null);
  };

  return (
    <Modal onClose={onClose} width="lg" className="!max-w-5xl !p-0">
      <div className="grid min-h-[520px] grid-cols-[64px_1fr] md:grid-cols-[64px_1fr_340px]">
        {/* Categories */}
        <nav
          aria-label="Inventory categories"
          className="flex flex-col items-center gap-2 border-r border-gold/30 bg-[#11151f] py-4"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                audio.play("ui_click");
                setCategory(c.id);
              }}
              aria-pressed={category === c.id}
              title={c.label}
              className={`grid h-11 w-11 place-items-center rounded-full text-lg transition ${
                category === c.id
                  ? "bg-gold text-ink"
                  : "text-gold/70 hover:bg-gold/15 hover:text-gold"
              }`}
            >
              {c.glyph}
            </button>
          ))}
        </nav>

        {/* The grid */}
        <section className="p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-gold">Inventory</h2>
              <p className="text-sm text-gold/70">
                {CATEGORIES.find((c) => c.id === category)?.label}
              </p>
            </div>
            <p className="text-sm text-gold/80">
              {items.length} item{items.length === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {shown.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => pick(it.id)}
                  aria-pressed={current?.id === it.id}
                  aria-label={it.name}
                  className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-lg border p-2 transition ${
                    current?.id === it.id
                      ? "border-gold bg-gold/15 shadow-[0_0_0_2px_rgba(201,162,74,0.35)]"
                      : "border-gold/30 bg-[#0e1220] hover:border-gold/60"
                  }`}
                >
                  <div
                    className={`${SHAPE_CLASS[it.shape]} pointer-events-none absolute left-1/2 top-1/2 !max-w-none`}
                    style={{
                      width: THUMB[it.shape].width,
                      transform: `translate(-50%, -50%) scale(${THUMB[it.shape].scale})`,
                    }}
                  >
                    {it.front}
                  </div>
                  {it.count !== undefined && (
                    <span className="absolute bottom-1 right-1.5 text-sm font-bold text-white drop-shadow">
                      x{it.count}
                    </span>
                  )}
                </button>
                <p className="mt-1 truncate text-center text-[11px] text-muted">{it.name}</p>
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="mt-6 text-sm text-muted">Nothing here yet.</p>}
        </section>

        {/* The detail panel */}
        {current && (
          <aside className="col-span-2 flex flex-col border-t border-gold/30 bg-[#0e1220] p-5 md:col-span-1 md:border-l md:border-t-0">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                aria-label="Close inventory"
                className="grid h-9 w-9 place-items-center rounded-full border border-gold/60 text-gold hover:bg-gold/15"
              >
                ↩
              </button>
            </div>
            <div
              className="mt-2 grid min-h-[210px] place-items-center"
              style={{ perspective: "1000px" }}
            >
              <div
                className={`relative ${SHAPE_CLASS[current.shape]} transition-transform duration-500`}
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "none",
                }}
              >
                <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                  {current.front}
                </div>
                {current.back && (
                  <div
                    className="absolute inset-0"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    {current.back}
                  </div>
                )}
              </div>
            </div>
            {current.sides && (
              <p className="mt-2 text-center text-[11px] uppercase tracking-widest text-muted">
                {flipped ? current.sides[1] : current.sides[0]}
              </p>
            )}
            <p className="mt-3 text-[11px] uppercase tracking-widest text-gold/70">
              {current.kind}
            </p>
            <h3 className="font-display text-2xl text-gold">{current.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text/90">{current.description}</p>
            <dl className="mt-3 divide-y divide-line/40 border-y border-line/40 text-sm">
              {current.stats.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-1.5">
                  <dt className="text-xs uppercase tracking-widest text-muted">{k}</dt>
                  <dd className="truncate text-right capitalize text-text">{v}</dd>
                </div>
              ))}
            </dl>
            {(current.hint || note) && (
              <p className="mt-3 text-xs leading-relaxed text-gold">{note ?? current.hint}</p>
            )}
            <div className="mt-auto flex gap-2 pt-4">
              {current.back && (
                <button
                  onClick={() => {
                    audio.play("ui_click");
                    setFlipped((f) => !f);
                  }}
                  className="flex-1 rounded-lg border border-gold/60 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/15"
                >
                  Flip ⟲
                </button>
              )}
              {current.use && (
                <button
                  onClick={current.use.run}
                  className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink hover:brightness-110"
                >
                  {current.use.label}
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </Modal>
  );
}
