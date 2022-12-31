// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import G = require('glob');
import * as vscode from 'vscode';
import { SnippetComments } from './SnippetComments';
import { SnippetFile } from './sources/SnippetFile';
import { Stackoverflow } from './sources/stackoverflow';
import { SymbolInformationUtils } from './sources/WorkspaceSymbols';
import { symbolKindToString, stringToSymbolKind } from './utils/StringUtils';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Snippet commands.
	let addSnippetDisposable = vscode.commands.registerCommand('copilot-with-context.addSelectedTextAsSnippet', () => addSelectedTextToSnippetFile());
	let pasteSnippetDisposable = vscode.commands.registerCommand('copilot-with-context.pasteSnippet', () => pasteSnippetUsingSelectionAsInput());
	let removeSnippetsDisposable = vscode.commands.registerCommand('copilot-with-context.removeSnippetsFromFile', () => SnippetComments.removeFromFile());
	
	// Utility commands.
	let rewriteRestOfFunctionDisposable = vscode.commands.registerCommand('copilot-with-context.rewriteRestOfFunction', () => rewriteRestOfFunction());
	
	context.subscriptions.push(addSnippetDisposable);
	context.subscriptions.push(removeSnippetsDisposable);
	context.subscriptions.push(pasteSnippetDisposable);
	context.subscriptions.push(rewriteRestOfFunctionDisposable);
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
	SnippetFile.addSnippet(snippet, title);
	vscode.window.showInformationMessage('Added selected text to ' + SnippetFile.fileName);
}

async function pasteSnippetUsingCursorAsInput() {
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	let cursorPosition = editor.selection.active;
	let range = new vscode.Range(0, 0, cursorPosition.line, cursorPosition.character);
	let inputText = editor.document.getText(range);
	// Look for the first word before the cursor.
	// e.g. 'Geotrellis.addLayer([cursor]' => 'addLayer'.
	let match = inputText.match(/(\w+)/g);
	let popupInput = match ? match[match.length - 1] : '';
	await pasteSnippetUsingPopupAsInput(popupInput);
}

async function pasteSnippetUsingSelectionAsInput() {
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	let selection = editor.document.getText(editor.selection);
	if (selection.length == 0) {
		// If there is no selection, fall back to cursor.
		pasteSnippetUsingCursorAsInput();
		return;
	}
	await pasteSnippetUsingPopupAsInput(selection);
}

// Selects a snippet or a symbol and pastes it as a comment.
async function pasteSnippetUsingPopupAsInput(initialInput: string = ''): Promise<void> {
	// Create a popup that automatically updates the input box while the user is typing.
	let quickPick: vscode.QuickPick<vscode.QuickPickItem> = await vscode.window.createQuickPick<vscode.QuickPickItem>()
	quickPick.value = initialInput;
	quickPick.matchOnDescription = true;
	quickPick.matchOnDetail = true;
	quickPick.placeholder = 'Select a snippet to add as a comment'

	// Sources
	let snippets: any[] = SnippetFile.getSnippets();
	let snippetQuickpickItems = snippets.map(snippet => <vscode.QuickPickItem>{ label: snippet.title, description: "Snippet" });
	var symbols: vscode.SymbolInformation[] = []

	snippetQuickpickItems.push(<vscode.QuickPickItem>{ label: 'Search on stackoverflow', alwaysShow: true });
	
	quickPick.onDidChangeValue(async (value) => {
		if (value.length > 0) {
			quickPick.busy = true;
			// Filter sources and combine.
			// let filteredSnippets = snippetQuickpickItems.filter(snippet => snippet.label.includes(value));
			symbols = await SymbolInformationUtils.getAny(value)
			let symbolQuickpickItems = symbols.map(symbol => <vscode.QuickPickItem>{ label: symbol.name, description: symbolKindToString[symbol.kind] });
			let quickpickItems = snippetQuickpickItems.concat(symbolQuickpickItems);
			
			// Show filtered sources.
			quickPick.items = quickpickItems;
			quickPick.busy = false;
		}
	});

	quickPick.onDidAccept(async () => {
		let selection: vscode.QuickPickItem = quickPick.selectedItems[0];
		let label = selection.label;
		let description = selection.description;
		if (description && description in stringToSymbolKind) {
			let symbol = symbols.find(symbol => symbol.name === label);
			if (!symbol) {
				vscode.window.showErrorMessage('Symbol not found');
				return;
			}
			SnippetComments.pasteSymbolAsComment(symbol);
		} else if (label === 'Search on stackoverflow') {
			let snippet = await Stackoverflow.search(quickPick.value);
			if (!snippet) {
				vscode.window.showErrorMessage('Nothing found on stackoverflow!');
				return;
			}
			SnippetComments.pasteSnippetAsComment(snippet);
		} else {
			let snippet = snippets.find(snippet => snippet.title === label)
			if (!snippet) {
				vscode.window.showErrorMessage('Snippet not found');
				return;
			}
			SnippetComments.pasteSnippetAsComment(snippet.snippet);
		}
		quickPick.dispose();
	});

	quickPick.onDidHide(() => { quickPick.dispose(); });
	quickPick.show()
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
