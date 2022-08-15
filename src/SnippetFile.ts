import fs = require('fs');
import * as vscode from 'vscode';
import { QuickPickOptions } from 'vscode';
import { Config } from "./Config";
import { SnippetComments } from "./SnippetComments";

export class SnippetFile {
	static fileName = Config.snippetFileName;

	static getAbsoluteFilePath(): string {
		let workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			return '';
		}
		let workspacePath = workspaceFolders[0].uri.fsPath;
		return workspacePath + '/' + SnippetFile.fileName;
	}

	static getSnippets(): any[] {
		let jsonFile = SnippetFile.getAbsoluteFilePath();
		let json = fs.readFileSync(jsonFile, 'utf8');
		let snippets = JSON.parse(json);
		return snippets;
	}

	static addSnippet(snippet: string, title: string) {
		let jsonFile = SnippetFile.getAbsoluteFilePath();
		let snippets = SnippetFile.getSnippets();
		let newSnippet = {
			title: title,
			snippet: snippet
		}
		snippets.push(newSnippet);
		fs.writeFileSync(jsonFile, JSON.stringify(snippets));
		vscode.window.showInformationMessage('Added selected text to ' + SnippetFile.fileName);
	}

}
