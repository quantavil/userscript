import type { CodeSnippet, CommentItem, QuestionData } from './types';

const Q_DATA = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    content
    difficulty
    hints
    isPaidOnly
    topicTags { name }
    codeSnippets { lang langSlug code }
  }
}`;

// UNVERIFIED against the live site (introspection is disabled). If comments break, copy the real
// query from DevTools > Network on the Discussion tab and adjust these two.
const Q_TOPIC = `query questionDiscussionTopic($questionSlug: String!) {
  questionDiscussionTopic(questionSlug: $questionSlug) { id commentCount }
}`;

const Q_COMMENTS = `query discussComments($topicId: Int!, $orderBy: String, $pageNo: Int, $numPerPage: Int) {
  topicComments(topicId: $topicId, orderBy: $orderBy, pageNo: $pageNo, numPerPage: $numPerPage) {
    data { id post { content voteCount author { username } } }
  }
}`;

const TIMEOUT_MS = 15_000;

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

async function gql(operationName: string, query: string, variables: Json): Promise<Json> {
  const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? '';
  let res: Response;
  try {
    res = await fetch('/graphql/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-csrftoken': csrf },
      body: JSON.stringify({ operationName, query, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    throw new Error(timedOut ? 'LeetCode did not respond in time' : 'Network error talking to LeetCode');
  }
  if (res.status === 403 || res.status === 429) {
    throw new Error(`LeetCode blocked the request (HTTP ${res.status}). Reload the page and try again`);
  }
  if (!res.ok) throw new Error(`LeetCode returned HTTP ${res.status}`);

  const json: unknown = await res.json();
  if (!isObj(json)) throw new Error('Unexpected response from LeetCode');
  const first = asArr(json.errors)[0];
  if (first) throw new Error(isObj(first) && asStr(first.message) ? asStr(first.message) : 'GraphQL error');
  return isObj(json.data) ? json.data : {};
}

function parseQuestion(raw: unknown): QuestionData {
  if (!isObj(raw)) throw new Error('Problem not found');
  const questionId = asStr(raw.questionId);
  const title = asStr(raw.title);
  if (!questionId || !title) throw new Error('Unexpected question response (LeetCode API changed?)');

  const isPaidOnly = raw.isPaidOnly === true;
  const content = typeof raw.content === 'string' && raw.content ? raw.content : null;
  if (content == null) {
    throw new Error(isPaidOnly ? 'Premium-only problem: content unavailable' : 'Question content unavailable');
  }

  const codeSnippets: CodeSnippet[] = [];
  for (const s of asArr(raw.codeSnippets)) {
    if (isObj(s) && asStr(s.lang) && asStr(s.langSlug)) {
      codeSnippets.push({ lang: asStr(s.lang), langSlug: asStr(s.langSlug), code: asStr(s.code) });
    }
  }

  return {
    questionId,
    frontendId: asStr(raw.questionFrontendId) || questionId,
    title,
    titleSlug: asStr(raw.titleSlug),
    content,
    difficulty: asStr(raw.difficulty),
    hints: asArr(raw.hints).filter((h): h is string => typeof h === 'string' && h.trim() !== ''),
    topicTags: asArr(raw.topicTags).flatMap((t) => (isObj(t) && asStr(t.name) ? [{ name: asStr(t.name) }] : [])),
    codeSnippets,
    isPaidOnly,
  };
}

const TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; q: QuestionData }>();

export async function getQuestion(slug: string): Promise<QuestionData> {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < TTL) return hit.q;
  const data = await gql('questionData', Q_DATA, { titleSlug: slug });
  const q = parseQuestion(data.question);
  cache.set(slug, { at: Date.now(), q });
  return q;
}

export async function getComments(slug: string, count: number): Promise<CommentItem[]> {
  const topicData = await gql('questionDiscussionTopic', Q_TOPIC, { questionSlug: slug });
  const topic = topicData.questionDiscussionTopic;
  const topicId = isObj(topic) && typeof topic.id === 'number' ? topic.id : null;
  if (topicId == null) return [];

  const data = await gql('discussComments', Q_COMMENTS, {
    topicId,
    orderBy: 'most_votes',
    pageNo: 1,
    numPerPage: count,
  });
  const list = isObj(data.topicComments) ? data.topicComments.data : null;
  if (!Array.isArray(list)) throw new Error('Unexpected comments response');

  return list.flatMap((item): CommentItem[] => {
    const post = isObj(item) && isObj(item.post) ? item.post : null;
    const content = post ? asStr(post.content).trim() : '';
    if (!post || !content) return [];
    return [
      {
        author: isObj(post.author) && asStr(post.author.username) ? asStr(post.author.username) : 'anonymous',
        votes: typeof post.voteCount === 'number' ? post.voteCount : 0,
        content,
      },
    ];
  });
}
