import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// In-memory cache so repeat opens of the same game don't re-hit OpenAI
// within a single server instance.
const ttbCache = new Map<string, number | undefined>();

/**
 * Fallback "how long to beat" estimate for games IGDB has no
 * game_time_to_beats data for. Returns main-story hours, or undefined.
 */
export async function estimateGameHours(
  title: string,
  year?: number
): Promise<number | undefined> {
  const ai = getClient();
  if (!ai || !title) return undefined;

  const cacheKey = `${title}|${year ?? ""}`;
  if (ttbCache.has(cacheKey)) return ttbCache.get(cacheKey);

  try {
    const completion = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 8,
      messages: [
        {
          role: "system",
          content:
            "You estimate video game main-story completion times, like the site HowLongToBeat. Reply with ONLY an integer number of hours. If the game is endless/multiplayer-only, reply with a typical hours-to-see-the-core-content number. If you truly don't know the game, reply 0.",
        },
        {
          role: "user",
          content: `How many hours to beat the main story of "${title}"${year ? ` (${year})` : ""}?`,
        },
      ],
    });
    const hours = parseInt(completion.choices[0]?.message?.content?.trim() || "");
    const result = !isNaN(hours) && hours > 0 && hours < 1000 ? hours : undefined;
    ttbCache.set(cacheKey, result);
    return result;
  } catch {
    return undefined;
  }
}
