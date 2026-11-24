import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	CalendarRule,
	evaluateCalendarGate,
	GateMode,
	MatchMode,
} from './calendarEvaluator';

export class CalendarGate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calendar Gate',
		name: 'calendarGate',
		icon: {
			light: 'file:calendarGate.svg',
			dark: 'file:calendarGate.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Stop or allow workflow execution based on date/time ranges, public holidays (e.g. 01-01-*), and days of the week',
		defaults: {
			name: 'Calendar Gate',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Stop Workflow on Match',
						value: 'stopOnMatch',
						action: 'Stop workflow when calendar rules match',
						description:
							'Stop the workflow if the calendar rules match (e.g. stop on holidays or weekends)',
					},
					{
						name: 'Allow Only on Match',
						value: 'allowOnlyOnMatch',
						action: 'Allow workflow only when calendar rules match',
						description:
							'Only continue the workflow when the calendar rules match (e.g. allow only during business hours)',
					},
				],
				default: 'stopOnMatch',
			},
			{
				displayName: 'On Stop Action',
				name: 'onStopAction',
				type: 'options',
				options: [
					{
						name: 'Halt Branch (Return No Items)',
						value: 'halt',
						description:
							'Silently stop downstream nodes by returning an empty output',
					},
					{
						name: 'Throw Error',
						value: 'error',
						description: 'Fail the execution with a descriptive error message',
					},
				],
				default: 'halt',
			},
			{
				displayName: 'Match Logic',
				name: 'matchMode',
				type: 'options',
				options: [
					{
						name: 'Any Rule Matches (OR)',
						value: 'any',
					},
					{
						name: 'All Rules Match (AND)',
						value: 'all',
					},
				],
				default: 'any',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: 'UTC',
				placeholder: 'e.g. America/Chicago, Asia/Ho_Chi_Minh, UTC',
				description: 'IANA timezone used when evaluating days, holidays, and times',
			},
			{
				displayName: 'Reference Date/Time',
				name: 'referenceDateTime',
				type: 'string',
				default: '',
				placeholder: 'Leave empty for current time, or pass ISO timestamp',
				description:
					'Optional ISO date/time to evaluate instead of the current time',
			},
			{
				displayName: 'Calendar Rules',
				name: 'rules',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Calendar Rule',
				options: [
					{
						name: 'ruleValues',
						displayName: 'Rule',
						values: [
							{
								displayName: 'Days of Week',
								name: 'days',
								type: 'multiOptions',
								displayOptions: {
									show: {
										type: ['dayOfWeek'],
									},
								},
								options: [
									{ name: 'Sunday', value: 0 },
									{ name: 'Monday', value: 1 },
									{ name: 'Tuesday', value: 2 },
									{ name: 'Wednesday', value: 3 },
									{ name: 'Thursday', value: 4 },
									{ name: 'Friday', value: 5 },
									{ name: 'Saturday', value: 6 },
								],
								default: [0, 6],
							},
							{
								displayName: 'End Date & Time',
								name: 'endDateTime',
								type: 'dateTime',
								displayOptions: {
									show: {
										type: ['dateTimeRange'],
									},
								},
								default: '',
							},
							{
								displayName: 'End Time',
								name: 'endTime',
								type: 'string',
								displayOptions: {
									show: {
										type: ['dayOfWeek', 'timeWindow'],
									},
								},
								default: '',
								placeholder: '17:00',
								description: 'End time in 24-hour HH:mm format',
							},
							{
								displayName: 'Holiday Patterns',
								name: 'patterns',
								type: 'string',
								displayOptions: {
									show: {
										type: ['holiday'],
									},
								},
								default: '01-01-*, 12-25-*',
								placeholder: '01-01-*, 12-25-*, 2026-11-26',
								description:
									'Comma-separated patterns: MM-DD-* (recurring), MM-DD, or YYYY-MM-DD',
							},
							{
								displayName: 'Rule Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Day of Week',
										value: 'dayOfWeek',
									},
									{
										name: 'Public Holiday / Recurring Date',
										value: 'holiday',
									},
									{
										name: 'Date & Time Range',
										value: 'dateTimeRange',
									},
									{
										name: 'Daily Time Window',
										value: 'timeWindow',
									},
								],
								default: 'holiday',
							},
							{
								displayName: 'Start Date & Time',
								name: 'startDateTime',
								type: 'dateTime',
								displayOptions: {
									show: {
										type: ['dateTimeRange'],
									},
								},
								default: '',
							},
							{
								displayName: 'Start Time',
								name: 'startTime',
								type: 'string',
								displayOptions: {
									show: {
										type: ['dayOfWeek', 'timeWindow'],
									},
								},
								default: '',
								placeholder: '09:00',
								description: 'Start time in 24-hour HH:mm format',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const gateMode = this.getNodeParameter('operation', 0) as GateMode;
		const onStopAction = this.getNodeParameter('onStopAction', 0) as string;
		const matchMode = this.getNodeParameter('matchMode', 0) as MatchMode;
		const timezone = this.getNodeParameter('timezone', 0) as string;
		const referenceDateTime = this.getNodeParameter(
			'referenceDateTime',
			0,
		) as string;

		const rawRules = this.getNodeParameter('rules.ruleValues', 0, []) as Array<
			Record<string, unknown>
		>;

		const rules: CalendarRule[] = rawRules.map((r) => {
			const type = r.type as CalendarRule['type'];
			switch (type) {
				case 'dayOfWeek':
					return {
						type: 'dayOfWeek',
						days: (r.days as number[]) ?? [],
						startTime: (r.startTime as string) || undefined,
						endTime: (r.endTime as string) || undefined,
					};
				case 'holiday':
					return {
						type: 'holiday',
						patterns: (r.patterns as string) ?? '',
					};
				case 'dateTimeRange':
					return {
						type: 'dateTimeRange',
						startDateTime: (r.startDateTime as string) ?? '',
						endDateTime: (r.endDateTime as string) ?? '',
					};
				case 'timeWindow':
					return {
						type: 'timeWindow',
						startTime: (r.startTime as string) ?? '',
						endTime: (r.endTime as string) ?? '',
					};
			}
		});

		const date = referenceDateTime ? new Date(referenceDateTime) : new Date();
		if (Number.isNaN(date.getTime())) {
			throw new NodeOperationError(
				this.getNode(),
				`Invalid Reference Date/Time: "${referenceDateTime}"`,
			);
		}

		const result = evaluateCalendarGate(rules, {
			date,
			timezone,
			matchMode,
			gateMode,
		});

		if (result.shouldStop) {
			if (onStopAction === 'error') {
				throw new NodeOperationError(
					this.getNode(),
					`Workflow stopped by Calendar Gate (${gateMode}, matched rules: [${result.matchedRules.join(', ')}] at ${result.evaluatedAt} ${result.timezone})`,
				);
			}
			return [[]];
		}

		return [items];
	}
}
