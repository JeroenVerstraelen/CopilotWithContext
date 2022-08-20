import * as vscode from 'vscode';
import { QuickPickOptions } from 'vscode';
import { SnippetFile } from './SnippetFile';
import { WorkspaceSymbol, WorkspaceSymbols } from './WorkspaceSymbols';
import { Config } from "./Config";
import { SymbolToString } from './SymbolToString';


export class SnippetComments {

	static async pasteSnippetAsComment(snippet: string): Promise<void> {
		// TODO: Use TextLine.firstNonWhitespaceCharacterIndex to get the indentation level.
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let commentSymbol = Config.commentSymbol(editor.document.languageId);
			// Insert the snippet one live above the cursor position.
			let cursorPosition = editor.selection.active;
			let insertPosition = new vscode.Position(cursorPosition.line, 0);
			let whiteSpaceIndex = editor.document.lineAt(cursorPosition.line).firstNonWhitespaceCharacterIndex;
			let indentation = editor.document.lineAt(cursorPosition.line).text.substring(0, whiteSpaceIndex);
			var firstLettersOfSnippet = ''
			// let firstWordOfSnippetMatch = snippet.match(/(?<=^[\s"']*)(\w+)/)
			// if (firstWordOfSnippetMatch) {
			// 	firstLettersOfSnippet = firstWordOfSnippetMatch[0].substring(0, 3);
			// }
			let taggedSelection = Config.snippetStartSymbol(editor.document.languageId) + '\n' + snippet + '\n' + Config.snippetEndSymbol(editor.document.languageId);
			// Add a comment to each line of the selection.
			let commentedLines = taggedSelection.split('\n').map((line) => indentation + commentSymbol + line);
			await editor.edit(editBuilder => {
				editBuilder.insert(insertPosition, commentedLines.join('\n') + '\n' + indentation + firstLettersOfSnippet + '\n');
			})

			if (Config.collapseSnippetComments(editor.document.languageId)) {
				// Collapse the insertPosition.
				editor.selection = new vscode.Selection(insertPosition.line, 0, insertPosition.line, 0);
				await vscode.commands.executeCommand('editor.fold');
			}
			
			// Move the cursor one line below the end of the snippet.
			let endOfSnippetLine = editor.document.lineAt(cursorPosition.line + commentedLines.length);
			let newCursorPosition =  new vscode.Position(endOfSnippetLine.lineNumber, endOfSnippetLine.range.end.character);
			editor.selection = new vscode.Selection(newCursorPosition, newCursorPosition);
			editor.revealRange(new vscode.Range(newCursorPosition, newCursorPosition));
		}
	}

	static async pasteSymbolAsComment(inputFunction: () => Promise<string>): Promise<void> {
		// Ask user if we should search for structs, function, classes or everything.
		let options: QuickPickOptions = {
			matchOnDescription: true,
			matchOnDetail: true,
			placeHolder: 'Select the type of the symbol to search for.'
		};
		let userSymbolKindSelection = await vscode.window.showQuickPick([
			'struct',
			'struct with field definitions',
			'struct with field definitions 2x',
			'function',
			'function signature',
			'class',
			'any'
		], options);
		var snippet = '';

		let structOption = async (inputText: string, maxReferenceDepth: number) => {
			let structs = await WorkspaceSymbols.getStructs(inputText);
			let structNames = structs.map((struct) => struct.name);
			// Make the user select a struct.
			let selectedStructName = await vscode.window.showQuickPick(structNames);
			if (selectedStructName) {
				let selectedStruct = structs.find((struct) => struct.name === selectedStructName);
				if (selectedStruct) {
					let structWorkspaceSymbol = new WorkspaceSymbol(selectedStruct.name, selectedStruct.location.uri, selectedStruct.location.range);
					let selectedDocumentSymbol = await WorkspaceSymbols.getDocumentSymbol(structWorkspaceSymbol);
					if (selectedDocumentSymbol) {
						snippet = await SymbolToString.structToString(selectedDocumentSymbol, selectedStruct.location.uri, 0, maxReferenceDepth);
					}
				}
			}
		}

		if (userSymbolKindSelection) {
			let inputText = await inputFunction();
			// Switch over the selection and search for the selected text. 
			switch (userSymbolKindSelection) {
				case '':
					return;
				case 'struct':
					await structOption(inputText, 0);
					break;
				case 'struct with field definitions':
					await structOption(inputText, 1);
					break;
				case 'struct with field definitions 2x':
					await structOption(inputText, 2);
					break;
				case 'function signature':
				case 'function':
					let functions = await WorkspaceSymbols.getFunctions(inputText);
					let methods: WorkspaceSymbol[] = await WorkspaceSymbols.getMethods(inputText);
					var functionNames = functions.map((functionSymbol) => functionSymbol.name);
					functionNames.push(...methods.map((methodSymbol) => methodSymbol.name));
					// Make the user select a function.
					let selectedFunctionName = await vscode.window.showQuickPick(functionNames);
					if (selectedFunctionName) {
						let editor = vscode.window.activeTextEditor;
						if (!editor) { return; }

						let selectedFunction = functions.find((functionSymbol) => functionSymbol.name === selectedFunctionName);
						if (!selectedFunction) {
							let selectedMethod = methods.find((methodSymbol) => methodSymbol.name === selectedFunctionName);
							if (selectedMethod) {
								let uri = selectedMethod.uri;
								let document = await vscode.workspace.openTextDocument(uri);
								let start = selectedMethod.range.start
								if (userSymbolKindSelection === 'function signature') {
									snippet = document.lineAt(start.line).text;
									break;
								} 
								let methodDocSymbol: vscode.DocumentSymbol | undefined = await WorkspaceSymbols.getDocumentSymbol(selectedMethod);
								if (methodDocSymbol) {
									let end = methodDocSymbol?.range.end;
									snippet = document.getText(new vscode.Range(start, end));
									break;
								}
							}
						} else {
							let uri = selectedFunction.location.uri;
							let document = await vscode.workspace.openTextDocument(uri);
							let start = selectedFunction.location.range.start
							if (userSymbolKindSelection === 'function signature') {
								snippet = document.lineAt(start.line).text;
								break;
							}
							let selectedFunctionWorkspaceSymbol = new WorkspaceSymbol(selectedFunction.name, uri, selectedFunction.location.range);
							let functionDocSymbol: vscode.DocumentSymbol | undefined = await WorkspaceSymbols.getDocumentSymbol(selectedFunctionWorkspaceSymbol);
							if (functionDocSymbol) {
								let end = functionDocSymbol.range.end;
								snippet = document.getText(new vscode.Range(start, end));
								break;
							}
						}
					}
					break;
				case 'class':
					let classes = await WorkspaceSymbols.getClasses(inputText);
					let classNames = classes.map((classSymbol) => classSymbol.name);
					// Make the user select a class.
					let selectedClassName = await vscode.window.showQuickPick(classNames);
					if (selectedClassName) {
						let selectedClass = classes.find((classSymbol) => classSymbol.name === selectedClassName);
						if (selectedClass) {
							snippet = 'class ' + selectedClass.name + ' {\n\n}';
						}
					}
					break;
				case 'any':
					let symbols = await WorkspaceSymbols.getAny(inputText);
					let symbolNames = symbols.map((symbol) => symbol.name);
					// Make the user select a symbol.
					let selectedSymbolName = await vscode.window.showQuickPick(symbolNames);
					if (selectedSymbolName) {
						let selectedSymbol = symbols.find((symbol) => symbol.name === selectedSymbolName);
						if (selectedSymbol) {
							snippet = '// ' + selectedSymbol.name + '\n';
						}
					}
					break;
			}
			SnippetComments.pasteSnippetAsComment(snippet);
		}
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
		let regex = new RegExp(newline + '?' + whitespace + commentSymbol + snippetStartSymbol + '([\\s\\S]*?)' + snippetEndSymbol + '([\\s\\S]*?)', 'g');

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
