import { describe, it, expect } from 'vitest';
import {
  validateRecommendationPayload,
  computeAlgorithmicRecommendation,
  handleAiRecommend,
  RoomCandidate
} from '../aiRecommend';

describe('AI Recommendation Engine', () => {
  const sampleRooms: RoomCandidate[] = [
    {
      id: 'room-focus',
      name: 'Focus Studio',
      capacity: 4,
      facilities: ['Acoustic Panels', 'High-Speed Wi-Fi', 'Whiteboard'],
    },
    {
      id: 'room-seminar',
      name: 'Department Seminar Hall',
      capacity: 35,
      facilities: ['Projector', 'Audio System', 'AC', 'Whiteboard'],
    },
    {
      id: 'room-auditorium',
      name: 'Swatantrata Main Auditorium',
      capacity: 1500,
      facilities: ['Stage Lighting', 'Live Streaming', 'Projector', 'AC'],
    },
  ];

  describe('validateRecommendationPayload', () => {
    it('accepts valid payload structure', () => {
      const payload = {
        prompt: 'Need room for 30 students with projector',
        attendeeCount: 30,
        requiredFeatures: ['Projector', 'AC'],
        rooms: sampleRooms
      };

      const result = validateRecommendationPayload(payload);
      expect(result.valid).toBe(true);
      expect(result.sanitized?.attendeeCount).toBe(30);
      expect(result.sanitized?.requiredFeatures).toEqual(['Projector', 'AC']);
      expect(result.sanitized?.rooms?.length).toBe(3);
    });

    it('rejects invalid or non-object payloads', () => {
      expect(validateRecommendationPayload(null).valid).toBe(false);
      expect(validateRecommendationPayload('invalid string').valid).toBe(false);
    });

    it('rejects prompts exceeding maximum length (1000 chars)', () => {
      const oversizedPrompt = 'A'.repeat(1005);
      const result = validateRecommendationPayload({ prompt: oversizedPrompt });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Prompt exceeds maximum length');
    });

    it('rejects negative or excessively large attendee counts', () => {
      expect(validateRecommendationPayload({ attendeeCount: -5 }).valid).toBe(false);
      expect(validateRecommendationPayload({ attendeeCount: 60000 }).valid).toBe(false);
    });

    it('rejects room lists exceeding 100 items', () => {
      const hugeList = Array.from({ length: 105 }, (_, i) => ({
        id: `room-${i}`,
        name: `Room ${i}`,
        capacity: 20
      }));
      const result = validateRecommendationPayload({ rooms: hugeList });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 100 items');
    });
  });

  describe('computeAlgorithmicRecommendation', () => {
    it('recommends best capacity fit over excessively large rooms', () => {
      const rec = computeAlgorithmicRecommendation(sampleRooms, 25, ['Projector']);
      expect(rec.recommendedRoomId).toBe('room-seminar');
      expect(rec.source).toBe('algorithmic_fallback');
      expect(rec.reasoning).toContain('Department Seminar Hall');
    });

    it('recommends small studio when attendee count is low', () => {
      const rec = computeAlgorithmicRecommendation(sampleRooms, 3, ['Whiteboard']);
      expect(rec.recommendedRoomId).toBe('room-focus');
    });

    it('handles empty room candidate list cleanly', () => {
      const rec = computeAlgorithmicRecommendation([]);
      expect(rec.recommendedRoomId).toBeNull();
      expect(rec.source).toBe('algorithmic_fallback');
    });
  });

  describe('handleAiRecommend', () => {
    it('gracefully uses algorithmic fallback when GEMINI_API_KEY is not set', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const result = await handleAiRecommend({
        attendeeCount: 30,
        requiredFeatures: ['Projector'],
        rooms: sampleRooms
      });

      expect(result.source).toBe('algorithmic_fallback');
      expect(result.recommendedRoomId).toBe('room-seminar');

      process.env.GEMINI_API_KEY = originalKey;
    });
  });
});
