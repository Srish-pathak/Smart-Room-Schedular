/**
 * Production-ready AI Room Allocation Recommendation Handler.
 * Compatible with both Express (server.ts) and Vercel Serverless Functions.
 */

export interface RoomCandidate {
  id: string;
  name: string;
  capacity: number;
  features?: string[];
  facilities?: string[];
  building?: string;
  floor?: string;
  category?: string;
}

export interface RecommendationRequest {
  prompt?: string;
  rooms?: RoomCandidate[];
  attendeeCount?: number;
  requiredFeatures?: string[];
}

export interface RecommendationResponse {
  recommendedRoomId: string | null;
  reasoning: string;
  alternativeRoomId?: string | null;
  source: 'gemini_ai' | 'algorithmic_fallback';
}

/**
 * Deterministic algorithmic room recommendation fallback.
 * Scores rooms based on capacity fit and amenity match.
 */
export function computeAlgorithmicRecommendation(
  rooms: RoomCandidate[],
  attendeeCount: number = 20,
  requiredFeatures: string[] = []
): RecommendationResponse {
  if (!rooms || rooms.length === 0) {
    return {
      recommendedRoomId: null,
      reasoning: 'No rooms available in directory to evaluate.',
      source: 'algorithmic_fallback',
    };
  }

  const normalizedRequired = requiredFeatures.map((f) => f.toLowerCase().trim()).filter(Boolean);

  const scoredRooms = rooms.map((room) => {
    let score = 0;
    const roomCapacity = Number(room.capacity || 0);
    const roomFeatures = [...(room.features || []), ...(room.facilities || [])]
      .map((f) => String(f).toLowerCase().trim())
      .filter(Boolean);

    // 1. Capacity Scoring
    if (roomCapacity >= attendeeCount) {
      score += 50;
      // Bonus for optimal capacity sizing (penalize extreme oversizing)
      const excess = roomCapacity - attendeeCount;
      if (excess <= 10) score += 30;
      else if (excess <= 30) score += 20;
      else if (excess <= 60) score += 10;
      else score += 5;
    } else {
      // Under capacity penalty
      const deficit = attendeeCount - roomCapacity;
      score -= Math.min(deficit * 2, 40);
    }

    // 2. Feature / Amenity Scoring
    if (normalizedRequired.length > 0) {
      let matchedCount = 0;
      for (const req of normalizedRequired) {
        if (roomFeatures.some((rf) => rf.includes(req) || req.includes(rf))) {
          matchedCount++;
        }
      }
      score += (matchedCount / normalizedRequired.length) * 40;
    } else {
      score += 15;
    }

    return { room, score };
  });

  scoredRooms.sort((a, b) => b.score - a.score);

  const best = scoredRooms[0]?.room;
  const runnerUp = scoredRooms[1]?.room;

  let reasoning = `Algorithmic recommendation: "${best.name}" best accommodates ${attendeeCount} attendees with capacity for ${best.capacity}.`;
  if (normalizedRequired.length > 0) {
    reasoning += ` Matches requested facilities (${requiredFeatures.join(', ')}).`;
  }

  return {
    recommendedRoomId: best.id,
    reasoning,
    alternativeRoomId: runnerUp && runnerUp.id !== best.id ? runnerUp.id : null,
    source: 'algorithmic_fallback',
  };
}

/**
 * Validates and sanitizes the recommendation request payload.
 */
export function validateRecommendationPayload(body: any): {
  valid: boolean;
  error?: string;
  sanitized?: RecommendationRequest;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  // 1. Prompt validation
  let prompt: string | undefined = undefined;
  if (body.prompt !== undefined) {
    if (typeof body.prompt !== 'string') {
      return { valid: false, error: 'Prompt must be a string.' };
    }
    if (body.prompt.length > 1000) {
      return { valid: false, error: 'Prompt exceeds maximum length of 1000 characters.' };
    }
    prompt = body.prompt.trim();
  }

  // 2. Attendee count validation
  let attendeeCount = 20;
  if (body.attendeeCount !== undefined) {
    const num = Number(body.attendeeCount);
    if (isNaN(num) || num <= 0 || num > 5000) {
      return { valid: false, error: 'attendeeCount must be an integer between 1 and 5000.' };
    }
    attendeeCount = Math.floor(num);
  }

  // 3. Required features validation
  let requiredFeatures: string[] = [];
  if (body.requiredFeatures !== undefined) {
    if (!Array.isArray(body.requiredFeatures)) {
      return { valid: false, error: 'requiredFeatures must be an array of strings.' };
    }
    if (body.requiredFeatures.length > 30) {
      return { valid: false, error: 'requiredFeatures cannot exceed 30 items.' };
    }
    requiredFeatures = body.requiredFeatures
      .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      .map((item: string) => item.slice(0, 100).trim());
  }

  // 4. Rooms list validation
  let rooms: RoomCandidate[] = [];
  if (body.rooms !== undefined) {
    if (!Array.isArray(body.rooms)) {
      return { valid: false, error: 'rooms must be an array of room objects.' };
    }
    if (body.rooms.length > 100) {
      return { valid: false, error: 'rooms array cannot exceed 100 items for AI evaluation.' };
    }
    rooms = body.rooms
      .filter((r: any) => r && typeof r === 'object' && (r.id || r.roomId))
      .map((r: any) => ({
        id: String(r.id || r.roomId),
        name: String(r.name || r.roomName || 'Unnamed Room'),
        capacity: Number(r.capacity || 0),
        features: Array.isArray(r.features) ? r.features : (Array.isArray(r.facilities) ? r.facilities : []),
        facilities: Array.isArray(r.facilities) ? r.facilities : [],
        building: r.building ? String(r.building) : undefined,
        floor: r.floor ? String(r.floor) : undefined,
        category: r.category ? String(r.category) : undefined,
      }));
  }

  return {
    valid: true,
    sanitized: {
      prompt,
      attendeeCount,
      requiredFeatures,
      rooms,
    },
  };
}

/**
 * Main AI Recommendation handler with automatic graceful fallback.
 */
export async function handleAiRecommend(body: any): Promise<RecommendationResponse> {
  const validation = validateRecommendationPayload(body);
  if (!validation.valid || !validation.sanitized) {
    throw new Error(validation.error || 'Invalid request payload');
  }

  const { prompt, rooms = [], attendeeCount = 20, requiredFeatures = [] } = validation.sanitized;

  // Fallback immediately if no rooms provided
  if (rooms.length === 0) {
    return {
      recommendedRoomId: null,
      reasoning: 'No room candidates provided to evaluate.',
      source: 'algorithmic_fallback',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return computeAlgorithmicRecommendation(rooms, attendeeCount, requiredFeatures);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an AI Smart Room Allocation Assistant for an enterprise campus system.
Analyze the user's request, expected attendees (${attendeeCount}), required amenities (${JSON.stringify(requiredFeatures)}), and available rooms list:
${JSON.stringify(rooms, null, 2)}

Return a JSON response with:
1. "recommendedRoomId": string (ID of the best matching room from the provided list)
2. "reasoning": concise explanation (2-3 sentences) why this room best satisfies the requirements.
3. "alternativeRoomId": string or null (optional alternative room ID)
Respond strictly in valid JSON format.`;

    const userPrompt =
      prompt ||
      `Recommend the best matching room for ${attendeeCount} people requiring ${
        requiredFeatures.length > 0 ? requiredFeatures.join(', ') : 'standard classroom setup'
      }.`;

    // Timeout protection: abort after 8 seconds to prevent serverless function hangs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI generation timed out after 8000ms')), 8000);
    });

    const aiPromise = ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    const text = response.text;

    if (text) {
      const parsed = JSON.parse(text);
      // Validate that recommendedRoomId actually matches one of the candidates
      const matchingRoom = rooms.find((r) => r.id === parsed.recommendedRoomId);
      if (matchingRoom) {
        return {
          recommendedRoomId: parsed.recommendedRoomId,
          reasoning: parsed.reasoning || `Recommended ${matchingRoom.name} based on attendee and feature requirements.`,
          alternativeRoomId: parsed.alternativeRoomId || null,
          source: 'gemini_ai',
        };
      }
    }

    // If AI output was invalid or empty, gracefully use algorithmic fallback
    return computeAlgorithmicRecommendation(rooms, attendeeCount, requiredFeatures);
  } catch (err: any) {
    console.warn(`[AIRecommend] Gemini invocation failed (${err.message}). Using algorithmic fallback.`);
    return computeAlgorithmicRecommendation(rooms, attendeeCount, requiredFeatures);
  }
}
