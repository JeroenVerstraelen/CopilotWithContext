// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import G = require('glob');
import * as vscode from 'vscode';
import { Config } from './Config';
import { SnippetComments } from './SnippetComments';
import { SnippetFile } from './SnippetFile';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Snippet file commands.
	let disposable = vscode.commands.registerCommand('copilot-with-context.addSelectedTextAsSnippet', () => addSelectedTextToSnippetFile());
	let disposable2 = vscode.commands.registerCommand('copilot-with-context.pasteSnippetAsCommentUsingPopupAsInput', () => selectSnippetAndPasteItUsingPopupAsInput());
	let disposable10 = vscode.commands.registerCommand('copilot-with-context.pasteSnippetAsCommentUsingCursorAsInput', () => selectSnippetAndPasteItUsingCursorAsInput());
	
	// Symbol commands.
	let disposable4 = vscode.commands.registerCommand('copilot-with-context.pasteSymbolUsingSelectedTextAsInput', () => pasteSymbolAsCommentUsingSelectedTextAsInput());
	let disposable5 = vscode.commands.registerCommand('copilot-with-context.pasteSymbolUsingPopupAsInput', () => pasteSymbolAsCommentUsingPopupAsInput());
	let disposable9 = vscode.commands.registerCommand('copilot-with-context.pasteSymbol', () => pasteSymbolAsCommentUsingCursorAsInput());
	let disposable6 = vscode.commands.registerCommand('copilot-with-context.rewriteRestOfFunction', () => rewriteRestOfFunction());
	let disposable8 = vscode.commands.registerCommand('copilot-with-context.fixFunction', () => fixFunction());

	// API helpers
	// Q: search by function name
	// A1: Just use snippets?
	// Geotrellis.addLayer =>
	// title: addLayer [Geotrellis]
	// Snippet:
	/*
		val layer = new Layer()
		val zoomLevel = 3
		Geotrellis.addLayer(layer, zoomLevel)
	*/

	// Command, use clipboard as context.
	
	// Add similar to above but with name.
	// Copy line above but with context.
	let disposable7 = vscode.commands.registerCommand('copilot-with-context.copyLineWithContext', () => copyLineWithContext());

	// Snippet removal commands.
	let disposable3 = vscode.commands.registerCommand('copilot-with-context.removeSnippetsFromFile', () => SnippetComments.removeFromFile());

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable4);
	context.subscriptions.push(disposable5);
	context.subscriptions.push(disposable3);
	context.subscriptions.push(disposable6);
	context.subscriptions.push(disposable7);
	context.subscriptions.push(disposable8);
	context.subscriptions.push(disposable9);
	context.subscriptions.push(disposable10);
}

// this method is called when your extension is deactivated
export function deactivate() { }

async function addSelectedTextToSnippetFile(): Promise<void> {
	var editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let snippet = editor.document.getText(editor.selection);

	let title = await vscode.window.showInputBox({
		prompt: 'Enter a title for the snippet.'
	});
	if (!title) {
		return;
	}
	// Show snippet to user, and ask for permission to write it to file.
	vscode.window.showInformationMessage('Added selected text to ' + SnippetFile.fileName);
	SnippetFile.addSnippet(snippet, title);
}

async function selectSnippetAndPasteItUsingPopupAsInput() {
	var snippets: any[] = SnippetFile.getSnippets();
	var snippetTitles = snippets.map(snippet => snippet.title);
	// Do a fuzzy search on the content of the snippets.
	let options: vscode.QuickPickOptions = {
		matchOnDescription: true,
		matchOnDetail: true,
		placeHolder: 'Select a snippet to add as a comment'
	};
	let selection = await vscode.window.showQuickPick(snippetTitles, options);
	if (selection) {
		let snippet = snippets.find(snippet => snippet.title === selection).snippet;
		SnippetComments.pasteSnippetAsComment(snippet);
		// await vscode.commands.executeCommand('github.copilot.generate');
	}
}

async function selectSnippetAndPasteItUsingCursorAsInput() {
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	let cursorPosition = editor.selection.active;
	let line = editor.document.lineAt(cursorPosition.line);
	// Take current word as input. 
	// e.g. 'Geotrellis.addLayer([cursor])' => 'addLayer'.
	let inputText = line.text.substring(0, cursorPosition.character);
	let regex = /\w+$/;
	let match = inputText.match(regex);
	if (match) {
		inputText = match[0].toString();
		let snippets: any[] = SnippetFile.getSnippets();
		let quickPickItems = snippets.map(snippet => <vscode.QuickPickItem>{ label: snippet.title, description: snippet.snippet });
		quickPickItems = quickPickItems.concat(<vscode.QuickPickItem>{ label: 'Search for usages of input', alwaysShow: true });
		quickPickItems = quickPickItems.concat(<vscode.QuickPickItem>{ label: 'Search for symbols', alwaysShow: true });

		// Do a fuzzy search on the content of the snippets.
		let quickPick: vscode.QuickPick<vscode.QuickPickItem> = await vscode.window.createQuickPick<vscode.QuickPickItem>()
		quickPick.value = inputText;
		quickPick.items = quickPickItems;
		quickPick.matchOnDescription = true;
		quickPick.matchOnDetail = true;
		quickPick.placeholder = 'Select a snippet to add as a comment'
		await quickPick.onDidAccept(async () => {
			let selection = quickPick.selectedItems[0].label;
			if (selection === 'Search for usages of input') {
				vscode.window.showInformationMessage('Search for usages of input not yet implemented');
			}
			else if (selection === 'Search for symbols') {
				pasteSymbolAsCommentUsingPopupAsInput();	
				quickPick.dispose();
				return;
			}
			else {
				let snippet = snippets.find(snippet => snippet.title === selection).snippet;
				SnippetComments.pasteSnippetAsComment(snippet);
				// await vscode.commands.executeCommand('github.copilot.generate');
			}
			quickPick.dispose();
		});

		quickPick.onDidHide(() => { quickPick.dispose(); });
		quickPick.show()
		return;
	}
	await selectSnippetAndPasteItUsingPopupAsInput();
}

function pasteSymbolAsCommentUsingSelectedTextAsInput(): void {
	let inputFunction = async function (): Promise<string> {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return '';
		}
		return editor.document.getText(editor.selection);
	}
	SnippetComments.pasteSymbolAsComment(inputFunction);
}

async function pasteSymbolAsCommentUsingPopupAsInput(): Promise<void> {
	let inputFunction = async function(): Promise<string> {
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return '';
		}
		let input = await vscode.window.showInputBox({
			prompt: 'Enter (partial) name of the symbol to search for.'
		})
		if (input) {
			return input;
		}
		return '';
	}
	SnippetComments.pasteSymbolAsComment(inputFunction);
}

async function pasteSymbolAsCommentUsingCursorAsInput(): Promise<void> {
	let inputFunction = async function (): Promise<string> {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return '';
		}
		let cursorPosition = editor.selection.active;
		let line = editor.document.lineAt(cursorPosition.line);
		// Take current word as input.
		// e.g. 'Geotrellis.addLayer([cursor])' => 'addLayer'.
		let inputText = line.text.substring(0, cursorPosition.character);
		let regex = /\w+$/;
		let match = inputText.match(regex);
		if (match) {
			inputText = match[0];
			return inputText;
		}
		return '';
	}
	SnippetComments.pasteSymbolAsComment(inputFunction);
}

async function rewriteRestOfFunction(): Promise<any> {
	// Get the current function that the cursor resides in.
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	let cursorPosition = editor.selection.active;
	let symbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
	let symbol = symbols.find(s => s.range.contains(cursorPosition) && (s.kind === vscode.SymbolKind.Function || s.kind === vscode.SymbolKind.Method));
	if (!symbol) {
		// Explicitly search for methods inside classes.
		let classSymbols = symbols.filter(s => s.kind === vscode.SymbolKind.Class);
		for (let classSymbol of classSymbols) {
			let methodSymbols = classSymbol.children.filter(s => s.kind === vscode.SymbolKind.Method);
			for (let methodSymbol of methodSymbols) {
				if (methodSymbol.range.contains(cursorPosition)) {
					symbol = methodSymbol;
					break;
				}
			}
		}
		// If we still haven't found a function, inform the user.
		if (!symbol) {
			vscode.window.showInformationMessage('Your cursor is not inside a valid function or method.');
			return;
		}
	}
	let start = new vscode.Position(cursorPosition.line, 0);
	let startLineText = editor.document.getText(new vscode.Range(start, cursorPosition));
	let endLine = symbol.range.end.line - 1
	let endLineChar = editor.document.lineAt(endLine).text.length;
	let end = new vscode.Position(endLine, endLineChar);
	let restOfFunctionRange = new vscode.Range(start, end);
	let restOfFunctionText = editor.document.getText(restOfFunctionRange);
	// Convert restOfFunctionText to a snippet and move the cursor below it.
	await editor.edit(editBuilder => {
		// 1. Remove the rest of the function.
		editBuilder.delete(restOfFunctionRange);
	})

	// 2. Paste the function again as a snippet.
	// The cursor will automatically be below the snippet.
	await SnippetComments.pasteSnippetAsComment(restOfFunctionText);

	// 3. Insert the text of the start line up to cursor position.
	await editor?.edit(editBuilder => {
		if (editor) {
			editBuilder.insert(editor.selection.start, startLineText);
		}
	});
}

async function fixFunction(): Promise<void> {
	// Get the current function that the cursor resides in.
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	let symbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
	if (!symbols) { return; }
	let cursorPosition = editor.selection.active;
	let symbol = symbols.find(s => {
		if (!s) { false; }
		s.range.contains(cursorPosition) && (s.kind === vscode.SymbolKind.Function || s.kind === vscode.SymbolKind.Method)
	});
	if (!symbol) { return; }

	let restOfFunctionRange = symbol.range;
	let restOfFunctionText = editor.document.getText(restOfFunctionRange);
	let fixFunctionText = '\nThere is something wrong with this function. The fix can be found below.'
	// Convert restOfFunctionText to a snippet and move the cursor below it.
	await editor.edit(editBuilder => {
		// 1. Remove the rest of the function.
		editBuilder.delete(restOfFunctionRange);
	})

	// 2. Paste the function again as a snippet.
	// The cursor will automatically be below the snippet.
	await SnippetComments.pasteSnippetAsComment(restOfFunctionText + fixFunctionText);

	// 3. Insert the text of the start line up to cursor position.
	let functionSignature = symbol.detail
	await editor?.edit(editBuilder => {
		if (editor) {
			editBuilder.insert(editor.selection.start, functionSignature);
		}
	});
}

async function copyLineWithContext(): Promise<void> {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let cursorPosition = editor.selection.active;
	let userInput = await vscode.window.showInputBox({
		prompt: 'Enter a context for the copied line.'
	});
	let textToInsert = 'Repeat the line above, but with ' + userInput;
	SnippetComments.pasteSnippetAsComment(textToInsert);
	await editor.edit(editBuilder => {
		editBuilder.insert(cursorPosition, '\n' + textToInsert + '\n');
	});
	await vscode.commands.executeCommand('github.copilot.generate');
}
