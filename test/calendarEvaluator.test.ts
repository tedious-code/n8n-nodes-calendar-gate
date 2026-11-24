import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCalendarGate } from '../nodes/CalendarGate/calendarEvaluator';

describe('evaluateCalendarGate', () => {
	it('stops workflow on static recurring public holidays (01-01-*, 12-25-*)', () => {
		const newYears = new Date('2026-01-01T12:00:00Z');
		const christmas = new Date('2026-12-25T15:30:00Z');
		const regularDay = new Date('2026-03-10T12:00:00Z');

		const rules = [{ type: 'holiday' as const, patterns: '01-01-*, 12-25-*' }];

		assert.equal(evaluateCalendarGate(rules, { date: newYears }).shouldStop, true);
		assert.equal(evaluateCalendarGate(rules, { date: christmas }).shouldStop, true);
		assert.equal(evaluateCalendarGate(rules, { date: regularDay }).shouldStop, false);
	});

	it('supports exact YYYY-MM-DD holiday dates and timezone conversion', () => {
		// 2026-11-26T04:00:00Z is 2026-11-25 22:00 in America/Chicago (CST, UTC-6)
		const utcNov26Early = new Date('2026-11-26T04:00:00Z');
		const rules = [{ type: 'holiday' as const, patterns: '2026-11-25' }];

		const inChicago = evaluateCalendarGate(rules, {
			date: utcNov26Early,
			timezone: 'America/Chicago',
		});
		const inUtc = evaluateCalendarGate(rules, {
			date: utcNov26Early,
			timezone: 'UTC',
		});

		assert.equal(inChicago.shouldStop, true);
		assert.equal(inUtc.shouldStop, false);
	});

	it('stops workflow on selected days of the week with optional time window', () => {
		// 2026-11-23 is a Monday (dayOfWeek = 1)
		const mondayMorning = new Date('2026-11-23T10:00:00Z');
		const mondayEvening = new Date('2026-11-23T20:00:00Z');

		const rules = [
			{
				type: 'dayOfWeek' as const,
				days: [1],
				startTime: '09:00',
				endTime: '17:00',
			},
		];

		assert.equal(evaluateCalendarGate(rules, { date: mondayMorning }).shouldStop, true);
		assert.equal(evaluateCalendarGate(rules, { date: mondayEvening }).shouldStop, false);
	});

	it('supports date & time ranges', () => {
		const insideRange = new Date('2026-12-25T10:00:00Z');
		const outsideRange = new Date('2026-12-27T10:00:00Z');

		const rules = [
			{
				type: 'dateTimeRange' as const,
				startDateTime: '2026-12-24T18:00:00Z',
				endDateTime: '2026-12-26T08:00:00Z',
			},
		];

		assert.equal(evaluateCalendarGate(rules, { date: insideRange }).shouldStop, true);
		assert.equal(evaluateCalendarGate(rules, { date: outsideRange }).shouldStop, false);
	});

	it('supports overnight timeWindow and allowOnlyOnMatch mode', () => {
		const lateNight = new Date('2026-11-23T23:30:00Z');
		const midday = new Date('2026-11-23T12:00:00Z');

		const rules = [
			{
				type: 'timeWindow' as const,
				startTime: '22:00',
				endTime: '06:00',
			},
		];

		assert.equal(
			evaluateCalendarGate(rules, {
				date: lateNight,
				gateMode: 'allowOnlyOnMatch',
			}).shouldStop,
			false,
		);
		assert.equal(
			evaluateCalendarGate(rules, {
				date: midday,
				gateMode: 'allowOnlyOnMatch',
			}).shouldStop,
			true,
		);
	});

	it('supports ALL (AND) vs ANY (OR) match logic across multiple rules', () => {
		// 2026-12-25 is a Friday (dayOfWeek = 5)
		const christmasFriday = new Date('2026-12-25T10:00:00Z');
		const regularFriday = new Date('2026-12-18T10:00:00Z');

		const rules = [
			{ type: 'holiday' as const, patterns: '12-25-*' },
			{ type: 'dayOfWeek' as const, days: [5] },
		];

		assert.equal(
			evaluateCalendarGate(rules, { date: christmasFriday, matchMode: 'all' }).shouldStop,
			true,
		);
		assert.equal(
			evaluateCalendarGate(rules, { date: regularFriday, matchMode: 'all' }).shouldStop,
			false,
		);
		assert.equal(
			evaluateCalendarGate(rules, { date: regularFriday, matchMode: 'any' }).shouldStop,
			true,
		);
	});
});
