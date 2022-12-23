import * as vscode from 'vscode';
import { Config } from "./utils/Config";
import { SymbolToString } from './sources/SymbolToString';


export class SnippetComments {

	static async pasteSnippetAsComment(snippet: string): Promise<void> {
		// TODO: Use TextLine.firstNonWhitespaceCharacterIndex to get the indentation level.
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let commentSymbol = Config.commentSymbol(editor.document.languageId);
			let cursorPosition = editor.selection.active;
			let whiteSpaceIndex = editor.document.lineAt(cursorPosition.line).firstNonWhitespaceCharacterIndex;
			let indentation = editor.document.lineAt(cursorPosition.line).text.substring(0, whiteSpaceIndex);

			let snippetWithTags = Config.snippetStartSymbol(editor.document.languageId) + '\n' + snippet + '\n' + Config.snippetEndSymbol(editor.document.languageId);

			// Add a comment to each line of the selection.
			let snippetAsComment = snippetWithTags.split('\n').map((line) => indentation + commentSymbol + line);

			// Insert the commented lines, one line above the original cursor position.
			let insertPosition = new vscode.Position(cursorPosition.line, 0);
			await editor.edit(editBuilder => {
				editBuilder.insert(insertPosition, snippetAsComment.join('\n') + '\n');
			})

			// Move the cursor one line below the end of the snippet.
			let endOfSnippetLine = editor.document.lineAt(cursorPosition.line + snippetAsComment.length);
			let newCursorPosition =  new vscode.Position(endOfSnippetLine.lineNumber, cursorPosition.character);
			editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
			editor.revealRange(new vscode.Range(newCursorPosition, newCursorPosition));
		}
	}

	static async pasteSymbolAsComment(symbol: vscode.SymbolInformation): Promise<void> {
		let snippet = await SymbolToString.anyToString(symbol);
		SnippetComments.pasteSnippetAsComment(snippet);
	}

	static async removeFromFile(): Promise<void> {
		// Remove any text that starts with Config.snippetStartSymbol and ends with Config.snippetEndSymbol.
		// E.g. <snippet>/nhello /nworld</snippet>
		let editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		// Set up regex.
		let commentSymbol = Config.commentSymbol(editor.document.languageId);
		let snippetStartSymbol = Config.snippetStartSymbol(editor.document.languageId);
		let snippetEndSymbol = Config.snippetEndSymbol(editor.document.languageId);
		var newline = '\r\n';
		if (editor.document.eol === vscode.EndOfLine.LF) {
			newline = '\n';
		}
		let whitespace = '\\s*';
		let regex = new RegExp(whitespace + commentSymbol + "\\s*" + snippetStartSymbol + '([\\s\\S]*?)' + "\\s*" + snippetEndSymbol + '([\\s\\S]*?)', 'g');

		// Calculate new cursor position. Ensure that it doesn't move when we replace the document text.
		let originalSelection = editor.selection;
		let document = editor.document;
		let preText = document.getText(new vscode.Range(new vscode.Position(0, 0), originalSelection.start));
		let newPreText = preText.replace(regex, '');
		let preTextLineCount = preText.split(new RegExp(newline)).length;
		let preTextNewLineCount = newPreText.split(new RegExp(newline)).length;
		let lineCountDifference = preTextLineCount - preTextNewLineCount;
		let selectionAnchorPos = originalSelection.anchor.translate(-lineCountDifference, 0);
		let selectionActivePos = originalSelection.active.translate(-lineCountDifference, 0);
		
		// Remove all snippet comments.
		let text = document.getText()
		let newText = text.replace(regex, '');
		await editor.edit(editBuilder => {
			editBuilder.replace(new vscode.Range(new vscode.Position(0,0), new vscode.Position(document.lineCount, 0)), newText);
		});
		
		// Set the cursor position back to the original location.
		editor.selection = new vscode.Selection(selectionAnchorPos, selectionActivePos);
		editor.revealRange(new vscode.Range(editor.selection.start, editor.selection.start));
	}
}
