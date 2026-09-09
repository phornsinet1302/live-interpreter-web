export interface NotificationPreferences {
	exportCompleted: boolean;
	translationCompleted: boolean;
	systemUpdates: boolean;
	reminders: boolean;
}

export interface UserAccount {
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
	preferredLanguage: string;
	theme: "light" | "dark" | "system";
	notifications: NotificationPreferences;
}

// Real backend shapes (FR-5) — History reads live from the API, no local
// mock data. A conversation's summary, when present, is one row generated
// either from the live quick-summary (saved as-is via PUT .../summary) or by
// regenerating through OpenAI (POST .../summary) — see summaries.service.ts.
export interface ConversationSummary {
	summary: string;
	keyPoints: string[];
	actionItems: { text: string }[];
	keywords: string[];
}

export interface ConversationEntry {
	id: string;
	title: string;
	sourceLang: string;
	targetLang: string;
	status: "waiting" | "active" | "paused" | "ended" | "archived";
	isFavorite: boolean;
	messageCount: number;
	createdAt: string;
	startedAt: string | null;
	endedAt: string | null;
	summary: ConversationSummary | null;
}

export interface ConversationMessage {
	id: string;
	originalText: string;
	translatedText: string;
	sourceLanguage: string;
	targetLanguage: string;
	speakerId: string | null;
	createdAt: string;
}
