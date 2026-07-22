// C4 (Financial Discipline / "Money Smarts") — BEGINNER content. Item keys match
// the backend's hidden answer/order keys so the server grades submissions
// correctly (verified against academy-backend registry/content/c4.json).

import type { ActivityContent } from './types';

export const c4Beg: Record<string, ActivityContent> = {
  // DRAG_MATCH → objective. Server answerKey: 5 needs / 5 wants.
  'C4-BEG-01': {
    kind: 'drag_match',
    prompt: 'Sort each thing into Needs or Wants.',
    zones: [
      { id: 'needs', label: 'Needs' },
      { id: 'wants', label: 'Wants' },
    ],
    items: [
      { key: 'lunch', label: 'Lunch', emoji: '🍱' },
      { key: 'notebook', label: 'Notebook', emoji: '📒' },
      { key: 'busfare', label: 'Bus fare', emoji: '🚌' },
      { key: 'repair', label: 'Shoe repair', emoji: '🔧' },
      { key: 'water', label: 'Drinking water', emoji: '💧' },
      { key: 'game', label: 'Video game', emoji: '🎮' },
      { key: 'stickers', label: 'Stickers', emoji: '✨' },
      { key: 'candy', label: 'Candy', emoji: '🍬' },
      { key: 'cap', label: 'Cap', emoji: '🧢' },
      { key: 'movie', label: 'Movie ticket', emoji: '🎬' },
    ],
  },

  // MCQ_FEEDBACK → objective. 8 questions; correct option value matches the
  // server answerKey (q1→b, q2→a, q3→c, q4→b, q5→d, q6→a, q7→c, q8→b).
  'C4-BEG-02': {
    kind: 'mcq',
    prompt: 'Help Sam make smart money choices.',
    questions: [
      {
        id: 'q1',
        text: 'Sam has $10. A toy costs $12. Can Sam buy it right now?',
        options: [
          { value: 'a', label: 'Yes, easily' },
          { value: 'b', label: 'No — it costs more than Sam has' },
          { value: 'c', label: 'Only by never paying it back' },
          { value: 'd', label: 'Toys are always free' },
        ],
      },
      {
        id: 'q2',
        text: 'What is a budget?',
        options: [
          { value: 'a', label: 'A plan for spending and saving money' },
          { value: 'b', label: 'A kind of coin' },
          { value: 'c', label: 'A shop downtown' },
          { value: 'd', label: 'Money you owe' },
        ],
      },
      {
        id: 'q3',
        text: 'Sam earns $20 and spends $25. What happened?',
        options: [
          { value: 'a', label: 'Saved $5' },
          { value: 'b', label: 'Broke even' },
          { value: 'c', label: 'Spent $5 more than earned' },
          { value: 'd', label: 'Doubled the money' },
        ],
      },
      {
        id: 'q4',
        text: 'Which of these is a need?',
        options: [
          { value: 'a', label: 'A video game' },
          { value: 'b', label: 'Bus fare to school' },
          { value: 'c', label: 'Candy' },
          { value: 'd', label: 'A movie ticket' },
        ],
      },
      {
        id: 'q5',
        text: 'Best way to reach a savings goal?',
        options: [
          { value: 'a', label: 'Spend it all today' },
          { value: 'b', label: 'Ignore the goal' },
          { value: 'c', label: 'Borrow even more' },
          { value: 'd', label: 'Set aside a little each week' },
        ],
      },
      {
        id: 'q6',
        text: 'Sam wants a $30 item and saves $6 each week. About how long?',
        options: [
          { value: 'a', label: 'About 5 weeks' },
          { value: 'b', label: 'About 2 weeks' },
          { value: 'c', label: '30 weeks' },
          { value: 'd', label: 'Just 1 week' },
        ],
      },
      {
        id: 'q7',
        text: '"Money in" minus "money out" is…',
        options: [
          { value: 'a', label: 'A tax' },
          { value: 'b', label: 'The rent' },
          { value: 'c', label: "What's left (savings or profit)" },
          { value: 'd', label: 'A new loan' },
        ],
      },
      {
        id: 'q8',
        text: "Sam's stand earns $40 and spends $15 on supplies. Profit?",
        options: [
          { value: 'a', label: '$55' },
          { value: 'b', label: '$25' },
          { value: 'c', label: '$15' },
          { value: 'd', label: '$40' },
        ],
      },
    ],
  },

  // SORT_ORDER → order. Correct sequence = the server orderKey.
  'C4-BEG-05': {
    kind: 'sort_order',
    prompt: "Put the ice-cream stand's day in the right order — money in, money out.",
    // Presented scrambled; the correct order is pocket_money → buy_stock →
    // till_low → fair_sales → pay_helper → count_profit.
    items: [
      { key: 'fair_sales', label: 'Afternoon rush — good sales', emoji: '☀️' },
      { key: 'pocket_money', label: 'Get pocket money to start', emoji: '💰' },
      { key: 'count_profit', label: "Count the day's profit", emoji: '🧮' },
      { key: 'buy_stock', label: 'Buy ice-cream stock', emoji: '🧊' },
      { key: 'pay_helper', label: 'Pay your helper', emoji: '🧑‍🍳' },
      { key: 'till_low', label: 'Till runs low mid-day', emoji: '📉' },
    ],
  },

  // MINI_SIM → metrics. Client computes { needsCovered, savings }; server
  // bounds-checks (savings 0–500) and applies P3: needs covered + savings ≥ 50.
  'C4-BEG-07': {
    kind: 'mini_sim',
    prompt: 'You have $150 for the month. Cover your needs first, then decide what to save.',
    budget: 150,
    currency: '$',
    needs: [
      { key: 'busfare', label: 'Bus fare', cost: 30, emoji: '🚌' },
      { key: 'lunch', label: 'School lunch', cost: 25, emoji: '🍱' },
      { key: 'notebook', label: 'Notebook', cost: 15, emoji: '📒' },
    ],
    wants: [
      { key: 'game', label: 'Video game', cost: 40, emoji: '🎮' },
      { key: 'treat', label: 'Ice-cream treat', cost: 20, emoji: '🍦' },
      { key: 'cap', label: 'New cap', cost: 25, emoji: '🧢' },
    ],
    savingsGoalHint: 'Tip: cover all 3 needs and still save $50+ for a top score.',
  },
};
