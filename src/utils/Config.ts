import * as vscode from 'vscode';

export class Config {
	static _ext_config(_languageId: string) {
		if (_languageId) {
			return vscode.workspace.getConfiguration('copilotcontext', { languageId: _languageId });
		}
		return vscode.workspace.getConfiguration("copilotcontext");
	}

	static snippetStartSymbol(languageId: string) {
		return Config._ext_config(languageId).get('snippetStartSymbol', '<snippet>')
	}
	static snippetEndSymbol(languageId: string) {
		return Config._ext_config(languageId).get('snippetEndSymbol', '</snippet>')
	}
	static snippetFileName(languageId: string) {
		return Config._ext_config(languageId).get('snippetFileName', 'copilot_snippets.json')
	}

	static commentSymbol(languageId: string) {
		return Config._ext_config(languageId).get('commentSymbol', '//')
	}

	static languageFileExtension(languageId: string) {
		return Config._ext_config(languageId).get('languageFileExtension', '.go')
	}

	static collapseSnippetComments(languageId: string) {
		return Config._ext_config(languageId).get('collapseSnippetComments', true)
	}
}
