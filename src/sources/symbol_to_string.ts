import * as vscode from 'vscode';
import { commands } from 'vscode';
import { DocumentSymbolUtils } from './document_symbol_utils';
import { SymbolInformationUtils } from './symbol_information_utils';

export class SymbolToString {

	static async symbolWithChildrenToString(workspaceSymbol: vscode.SymbolInformation | vscode.DocumentSymbol, uri: vscode.Uri, referenceDepth = 0, maxReferenceDepth = 0): Promise<string> {
		if (referenceDepth > maxReferenceDepth) { return ''; }
		if (!workspaceSymbol.hasOwnProperty('children')) {
			let docSymbol = await DocumentSymbolUtils.getDocumentSymbol(workspaceSymbol as vscode.SymbolInformation);
			if (!docSymbol) { return ""; }
			return await SymbolToString.symbolWithChildrenToString(docSymbol, uri, referenceDepth, maxReferenceDepth);
		}
		let documentSymbol = workspaceSymbol as vscode.DocumentSymbol;
		// Go over every child and recursively add their definitions to the final string.
		let returnString = await SymbolToString.documentSymbolToString(documentSymbol, uri);
		for (let field of documentSymbol.children) {
			let definition = await DocumentSymbolUtils.getDefinition(field, uri);
			if (definition) {
				let [definitionSymbol, definitionUri] = definition;
				let definitionAsString = await SymbolToString.symbolWithChildrenToString(definitionSymbol, definitionUri, referenceDepth + 1, maxReferenceDepth);
				if (definitionAsString !== '') {
					returnString += '\n\n' + definitionAsString;
				}
			}
		}
		return returnString;
	}

	static async functionSignatureToString(symbol: vscode.SymbolInformation): Promise<string> {
		let document = await vscode.workspace.openTextDocument(symbol.location.uri);
		// TODO: What about multiline function signatures?
		// This information is not contained in the symbol information.
		return document.lineAt(symbol.location.range.start.line).text;
	}

	static async lineToString(symbol: vscode.SymbolInformation): Promise<string> {
		let document = await vscode.workspace.openTextDocument(symbol.location.uri);
		let line = document.lineAt(symbol.location.range.start.line).text;
		return line;
	}

	static async workspaceSymbolToString(symbol: vscode.SymbolInformation): Promise<string> {
		let docSymbol: vscode.DocumentSymbol | undefined = await DocumentSymbolUtils.getDocumentSymbol(symbol);
		if (!docSymbol) { return ""; };
		return SymbolToString.documentSymbolToString(docSymbol, symbol.location.uri);
	}

	static async documentSymbolToString(documentSymbol: vscode.DocumentSymbol, uri: vscode.Uri): Promise<string> {
		let document = await vscode.workspace.openTextDocument(uri);
		return document.getText(documentSymbol.range);
	}

	static async anyToString(workspaceSymbol: vscode.SymbolInformation): Promise<string> {
		switch (workspaceSymbol.kind) {
			case vscode.SymbolKind.Struct:
				return await SymbolToString.symbolWithChildrenToString(workspaceSymbol, workspaceSymbol.location.uri, 0, 0);
			case vscode.SymbolKind.Class:
				return await SymbolToString.symbolWithChildrenToString(workspaceSymbol,  workspaceSymbol.location.uri, 0, 0);
			case vscode.SymbolKind.Field:
				return await SymbolToString.lineToString(workspaceSymbol);
			case vscode.SymbolKind.Variable:
				return await SymbolToString.lineToString(workspaceSymbol);
			default:
				return await SymbolToString.workspaceSymbolToString(workspaceSymbol);
		}
	}
}
