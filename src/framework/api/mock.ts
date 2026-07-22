// Dev-only mock backend (VITE_CITY_MOCK_AUTH=1). Lets the FULL activity loop run
// offline — registry list, progress, start/state/submit — with no real backend or
// credentials, so the F1 UI is verifiable in CI/e2e and offline dev. It is
// DYNAMICALLY imported only in mock mode (see client.ts), so it is a separate
// chunk and never ships in a real build.
//
// The mock scorer is deliberately simple and holds NO answer keys (those stay
// server-side). objective/order → assume correct (P3); metrics → apply the
// activity's client-computed check. Real scoring always happens server-side.

import type { HttpMethod } from './client';

const LEVEL_C4_BEGINNER = {
  competency: 'C4',
  level: 'BEGINNER',
  activities: [
    {
      id: 'C4-BEG-01',
      competencyCode: 'C4',
      level: 'BEGINNER',
      subtopic: 'needs_vs_wants',
      orderIndex: 1,
      activityType: 'DRAG_MATCH',
      title: 'Needs vs Wants',
      estMinutes: 4,
      passCriteria: { minProficiency: 2 },
      status: 'NOT_STARTED',
      bestProficiency: null,
    },
    {
      id: 'C4-BEG-02',
      competencyCode: 'C4',
      level: 'BEGINNER',
      subtopic: 'budgeting',
      orderIndex: 2,
      activityType: 'MCQ_FEEDBACK',
      title: 'Can Sam Afford This?',
      estMinutes: 4,
      passCriteria: { minProficiency: 2 },
      status: 'NOT_STARTED',
      bestProficiency: null,
    },
    {
      id: 'C4-BEG-05',
      competencyCode: 'C4',
      level: 'BEGINNER',
      subtopic: 'cash_flow',
      orderIndex: 5,
      activityType: 'SORT_ORDER',
      title: 'Money In, Money Out',
      estMinutes: 4,
      passCriteria: { minProficiency: 2 },
      status: 'NOT_STARTED',
      bestProficiency: null,
    },
    {
      id: 'C4-BEG-07',
      competencyCode: 'C4',
      level: 'BEGINNER',
      subtopic: 'needs_vs_wants',
      orderIndex: 7,
      activityType: 'MINI_SIM',
      title: 'The Pocket-Money Month',
      estMinutes: 5,
      passCriteria: { minProficiency: 2 },
      status: 'NOT_STARTED',
      bestProficiency: null,
    },
  ],
};

interface SubmitBody {
  result?: {
    metrics?: { values?: Record<string, unknown> };
    objective?: unknown;
    order?: unknown;
  };
}

function mockSubmit(activityId: string, body: SubmitBody) {
  const result = body?.result ?? {};
  let proficiency = 2;
  if (result.metrics) {
    const v = result.metrics.values ?? {};
    const needsCovered = v.needsCovered === true;
    const savings = typeof v.savings === 'number' ? v.savings : 0;
    proficiency = needsCovered ? (savings >= 50 ? 3 : 2) : 1;
  } else if (result.objective || result.order) {
    proficiency = 3; // mock assumes correct; real scoring is server-side
  }
  const passed = proficiency >= 2;
  const feedback =
    proficiency === 3
      ? 'Excellent — you nailed it! (mock)'
      : proficiency === 2
        ? 'Nice work, you passed. (mock)'
        : 'Not yet — give it another go. (mock)';
  const badgesAwarded =
    proficiency === 3
      ? [
          {
            id: 'BADGE-C4-BEGINNER',
            tier: 'BRONZE',
            competencyCode: 'C4',
            level: 'BEGINNER',
            name: 'Coin Counter',
            description: 'Passed a Money Smarts activity with top marks (mock).',
          },
        ]
      : [];
  return {
    activityId,
    proficiency,
    bestProficiency: proficiency,
    passed,
    status: 'COMPLETED',
    feedback,
    graded: 'server',
    badgesAwarded,
  };
}

export async function mockRequest(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<unknown> {
  // Small latency so loading states are exercised.
  await new Promise((r) => setTimeout(r, 120));

  if (path === '/api/v1/registry/modules') {
    return { registryVersion: 'mock', modules: [], metaBadges: [] };
  }
  if (/\/registry\/C4\/BEGINNER$/.test(path)) {
    return LEVEL_C4_BEGINNER;
  }
  if (path.startsWith('/api/v1/registry/activity/')) {
    const id = decodeURIComponent(path.split('/').pop() ?? '');
    return (
      LEVEL_C4_BEGINNER.activities.find((a) => a.id === id) ?? {
        id,
        activityType: 'UNKNOWN',
        title: id,
      }
    );
  }
  if (path === '/api/v1/progress') return { progress: [] };
  if (path === '/api/v1/badges') return { badges: [] };
  if (path === '/api/v1/profile') return { competencies: [] };
  if (method === 'POST' && path.endsWith('/submit')) {
    const activityId = path.split('/').slice(-2, -1)[0] ?? '';
    return mockSubmit(activityId, body as SubmitBody);
  }
  if (path.endsWith('/start') || path.endsWith('/state')) return {};
  return {};
}
