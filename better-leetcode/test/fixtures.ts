import type { QuestionData } from '../src/types';

/** Shape of modern LeetCode content (Two Sum): top-level inline Follow-up, &nbsp; spacers, sup inside code. */
export const TWO_SUM = `<p>Given an array of integers <code>nums</code>&nbsp;and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>

<p>You may assume that each input would have <strong><em>exactly</em> one solution</strong>, and you may not use the <em>same</em> element twice.</p>

<p>&nbsp;</p>
<p><strong class="example">Example 1:</strong></p>

<pre>
<strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].
</pre>

<p><strong class="example">Example 2:</strong></p>

<pre>
<strong>Input:</strong> nums = [3,2,4], target = 6
<strong>Output:</strong> [1,2]
</pre>

<p>&nbsp;</p>
<p><strong>Constraints:</strong></p>

<ul>
	<li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
	<li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
	<li><strong>Only one valid answer exists.</strong></li>
</ul>

<p>&nbsp;</p>
<strong>Follow-up:&nbsp;</strong>Can you come up with an algorithm that is less than <code>O(n<sup>2</sup>)</code><font face="monospace">&nbsp;</font>time complexity?`;

/** Old-style: image-only paragraph, <pre> with sup + <br>, ordered list, nested list, a table. */
export const OLD_STYLE = `<p>Count the islands &amp; return <code>10<sup>9</sup> + 7</code>.</p>
<p><img alt="" src="https://assets.leetcode.com/uploads/2020/10/02/grid.jpg" style="width: 483px; height: 342px;" /></p>
<ol>
	<li>First <code>a_b</code></li>
	<li>Second
		<ul>
			<li>nested one</li>
			<li>nested two</li>
		</ul>
	</li>
</ol>
<table><thead><tr><th>Col A</th><th>Col B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>
<p><strong>Example 1:</strong></p>
<pre><strong>Input:</strong> n = 10<sup>5</sup>
<strong>Output:</strong> 2<sup>31</sup>-1<br /><strong>Note:</strong> -   not a list
</pre>
<p><strong>Constraints:</strong></p>
<ul><li><code>1 &lt;= n &lt;= 10<sup>5</sup></code></li></ul>`;

export const question = (over: Partial<QuestionData> = {}): QuestionData => ({
  questionId: '1',
  frontendId: '1',
  title: 'Two Sum',
  titleSlug: 'two-sum',
  content: TWO_SUM,
  difficulty: 'Easy',
  hints: [
    'A really brute force way would be to search for all possible pairs of numbers.',
    'Use a <code>HashMap</code>.<br />Second line.',
  ],
  topicTags: [{ name: 'Array' }, { name: 'Hash Table' }],
  codeSnippets: [
    {
      lang: 'C++',
      langSlug: 'cpp',
      code: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};',
    },
    { lang: 'Python3', langSlug: 'python3', code: 'class Solution:\n    def twoSum(self, nums, target):\n        ' },
  ],
  isPaidOnly: false,
  ...over,
});
