type NamedItem = {
  name: string;
};

type ScoredItem<T> = {
  item: T;
  score: number;
};

export function fuzzyFilterByName<T extends NamedItem>(items: T[], query: string): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  return items
    .map((item) => ({ item, score: scoreNameMatch(item.name, normalizedQuery) }))
    .filter((entry): entry is ScoredItem<T> => entry.score !== null)
    .sort((first, second) => {
      if (first.score !== second.score) return first.score - second.score;
      return first.item.name.localeCompare(second.item.name, "pt-BR");
    })
    .map((entry) => entry.item);
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreNameMatch(name: string, normalizedQuery: string) {
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return null;

  const directIndex = normalizedName.indexOf(normalizedQuery);
  if (directIndex >= 0) return directIndex;

  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const nameTokens = normalizedName.split(" ").filter(Boolean);
  let score = 0;

  for (const queryTerm of queryTerms) {
    const bestScore = bestTermScore(queryTerm, nameTokens, normalizedName);
    if (bestScore === null) return null;
    score += bestScore;
  }

  return score + 100;
}

function bestTermScore(queryTerm: string, nameTokens: string[], normalizedName: string) {
  const scores = nameTokens
    .map((token) => scoreTermMatch(queryTerm, token))
    .filter((score): score is number => score !== null);

  if (scores.length > 0) return Math.min(...scores);

  if (isSubsequence(queryTerm, normalizedName)) {
    return Math.max(8, queryTerm.length);
  }

  return null;
}

function scoreTermMatch(queryTerm: string, token: string) {
  if (token === queryTerm) return 0;
  if (token.startsWith(queryTerm)) return 1;
  if (token.includes(queryTerm)) return 2;
  if (isSubsequence(queryTerm, token)) return 4;

  const maxDistance = queryTerm.length <= 4 ? 1 : Math.max(1, Math.floor(queryTerm.length * 0.35));
  const distance = levenshteinDistance(queryTerm, token, maxDistance);
  if (distance <= maxDistance) return 6 + distance;

  return null;
}

function isSubsequence(queryTerm: string, target: string) {
  if (queryTerm.length < 3) return false;

  let queryIndex = 0;
  for (const char of target) {
    if (char === queryTerm[queryIndex]) queryIndex += 1;
    if (queryIndex === queryTerm.length) return true;
  }

  return false;
}

function levenshteinDistance(source: string, target: string, maxDistance: number) {
  if (Math.abs(source.length - target.length) > maxDistance) return maxDistance + 1;

  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  const current = Array.from({ length: target.length + 1 }, () => 0);

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    current[0] = sourceIndex;
    let rowMinimum = current[0];

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const cost = source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      current[targetIndex] = Math.min(
        current[targetIndex - 1] + 1,
        previous[targetIndex] + 1,
        previous[targetIndex - 1] + cost,
      );
      rowMinimum = Math.min(rowMinimum, current[targetIndex]);
    }

    if (rowMinimum > maxDistance) return maxDistance + 1;

    for (let index = 0; index <= target.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[target.length];
}
