/**
 * pii.ts — PII Stripping Utility
 * Removes recognisable personally identifiable information from text before
 * it is embedded or injected into LLM prompts.
 *
 * Patterns removed:
 *  - Email addresses
 *  - Indian/international phone numbers (7-15 digits, optional country code)
 *  - Aadhaar-style 12-digit numbers
 *  - PAN card patterns
 *  - URLs (may carry session tokens)
 */

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  {
    name: "phone_intl",
    // Matches +91-XXXXXXXXXX, 0XXXXXXXXXX, plain 10-digit mobile, etc.
    pattern: /(\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4,6}/g,
    replacement: "[PHONE]",
  },
  {
    name: "aadhaar",
    pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    replacement: "[AADHAAR]",
  },
  {
    name: "pan",
    pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    replacement: "[PAN]",
  },
  {
    name: "url",
    pattern: /https?:\/\/[^\s"'<>]+/g,
    replacement: "[URL]",
  },
];

/**
 * Strip PII from a string. Safe to call with null/undefined (returns "").
 * Maximum output length is capped at 4 000 characters to limit prompt injection surface.
 */
export function stripPii(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  // Cap length to limit prompt-injection attack surface
  return cleaned.slice(0, 4000);
}

/**
 * Sanitise a string for safe LLM prompt interpolation:
 * 1. Strip PII
 * 2. Remove markdown-injection sequences that could override system instructions
 */
export function sanitiseForPrompt(text: string | null | undefined): string {
  const stripped = stripPii(text);
  // Remove sequences that look like system-prompt overrides
  return stripped
    .replace(/^#+\s*/gm, "")           // markdown headings
    .replace(/```[\s\S]*?```/g, "")    // code fences
    .replace(/\[SYSTEM\]/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/ignore\s+(?:all\s+)?(?:previous|above|prior|earlier|all)?\s*instructions?/gi, "[FILTERED]")
    .replace(/disregard\s+(?:all\s+)?(?:previous|above|prior|earlier|all)?\s*instructions?/gi, "[FILTERED]")
    .replace(/override\s+(?:all\s+)?(?:system|previous|all)?\s*instructions?/gi, "[FILTERED]")
    .replace(/you are now/gi, "[FILTERED]")
    .trim();
}
