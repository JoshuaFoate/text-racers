export const WORD_LIST: string[] = [
  "the", "of", "and", "a", "to", "in", "is", "you", "that", "it",
  "he", "was", "for", "on", "are", "as", "with", "his", "they", "i",
  "at", "be", "this", "have", "from", "or", "one", "had", "by", "word",
  "but", "not", "what", "all", "were", "we", "when", "your", "can", "said",
  "there", "use", "an", "each", "which", "she", "do", "how", "their", "if",
  "will", "up", "other", "about", "out", "many", "then", "them", "these", "so",
  "some", "her", "would", "make", "like", "him", "into", "time", "has", "look",
  "two", "more", "write", "go", "see", "number", "no", "way", "could", "people",
  "my", "than", "first", "water", "been", "call", "who", "oil", "its", "now",
  "find", "long", "down", "day", "did", "get", "come", "made", "may", "part",
  "over", "new", "sound", "take", "only", "little", "work", "know", "place", "year",
  "live", "me", "back", "give", "most", "very", "after", "thing", "our", "just",
  "name", "good", "sentence", "man", "think", "say", "great", "where", "help", "through",
  "much", "before", "line", "right", "too", "mean", "old", "any", "same", "tell",
  "boy", "follow", "came", "want", "show", "also", "around", "form", "three", "small",
  "set", "put", "end", "does", "another", "well", "large", "must", "big", "even",
  "such", "because", "turn", "here", "why", "ask", "went", "men", "read", "need",
  "land", "different", "home", "us", "move", "try", "kind", "hand", "picture", "again",
  "change", "off", "play", "spell", "air", "away", "animal", "house", "point", "page",
  "letter", "mother", "answer", "found", "study", "still", "learn", "should", "america", "world",
];

export type PassageLength = "short" | "medium" | "long";

export const PASSAGE_WORD_COUNT: Record<PassageLength, number> = {
  short: 15,
  medium: 25,
  long: 40,
};

const SENTENCE_MIN_WORDS = 8;
const SENTENCE_MAX_EXTRA_WORDS = 5;
const COMMA_CHANCE = 0.1;

export function punctuateWords(words: string[], rng: () => number = Math.random): string {
  const parts: string[] = [];
  let sinceSentenceStart = 0;
  let sentenceTarget = SENTENCE_MIN_WORDS + Math.floor(rng() * SENTENCE_MAX_EXTRA_WORDS);
  let capitalizeNext = true;

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    if (capitalizeNext) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
      capitalizeNext = false;
    }

    sinceSentenceStart++;
    const isLastWord = i === words.length - 1;

    if (isLastWord) {
      word += ".";
    } else if (sinceSentenceStart >= sentenceTarget) {
      word += ".";
      sinceSentenceStart = 0;
      sentenceTarget = SENTENCE_MIN_WORDS + Math.floor(rng() * SENTENCE_MAX_EXTRA_WORDS);
      capitalizeNext = true;
    } else if (sinceSentenceStart > 1 && rng() < COMMA_CHANCE) {
      word += ",";
    }

    parts.push(word);
  }

  return parts.join(" ");
}

export function generatePassage(length: PassageLength, rng: () => number = Math.random): string {
  const wordCount = PASSAGE_WORD_COUNT[length];
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(WORD_LIST[Math.floor(rng() * WORD_LIST.length)]);
  }
  return punctuateWords(words, rng);
}
