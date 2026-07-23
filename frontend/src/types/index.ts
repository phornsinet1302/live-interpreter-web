export interface UserAccount {
	name: string;
	email: string;
}

export interface ConversationExchange {
	source: string;
	translated: string;
}

export interface ConversationEntry {
	id: string;
	date: string;
	sourceLang: string;
	targetLang: string;
	title: string;
	duration: string;
	exchanges: ConversationExchange[];
	summary: string[];
	nextSteps: string[];
}
