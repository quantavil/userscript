export interface Settings {
  title: boolean;
  tags: boolean;
  statement: boolean;
  examples: boolean;
  constraints: boolean;
  hints: boolean;
  codeTemplate: boolean;
  currentCode: boolean;
  failingTest: boolean;
  comments: boolean;
  commentCount: number;
  prompt: string;
}

export interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

export interface QuestionData {
  questionId: string;
  frontendId: string;
  title: string;
  titleSlug: string;
  content: string | null;
  difficulty: string;
  hints: string[];
  topicTags: { name: string }[];
  codeSnippets: CodeSnippet[];
  isPaidOnly: boolean;
}

/** Last non-accepted Submit for a problem, captured from LeetCode's poll response. */
export interface FailRecord {
  slug: string;
  status: string;
  input: string;
  expected: string;
  output: string;
  stdout: string;
  error: string;
  /** e.g. "56 / 62" */
  passed: string;
  time: number;
}

export interface CommentItem {
  author: string;
  votes: number;
  content: string;
}
