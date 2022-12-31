import * as vscode from 'vscode';
import { commands } from 'vscode';
import { SymbolInformationUtils } from './SymbolInformationUtils';

export class SymbolToString {

	static async symbolWithChildrenToString(workspaceSymbol: vscode.SymbolInformation | vscode.DocumentSymbol, uri: vscode.Uri, referenceDepth = 0, maxReferenceDepth = 0): Promise<string> {
		if (referenceDepth > maxReferenceDepth) { return ''; }
		if (!workspaceSymbol.hasOwnProperty('children')) {
			let docSymbol = await SymbolInformationUtils.getDocumentSymbol(workspaceSymbol as vscode.SymbolInformation);
			if (!docSymbol) { return ""; }
			return await SymbolToString.symbolWithChildrenToString(docSymbol, uri, referenceDepth, maxReferenceDepth);
		}
		let documentSymbol = workspaceSymbol as vscode.DocumentSymbol;
		// Go over every child and recursively add their definitions to the final string.
		let returnString = await SymbolToString.documentSymbolToString(documentSymbol, uri);
		for (let field of documentSymbol.children) {
			let definition = await SymbolToString.symbolToDefinitionSymbol(field, uri);
			if (definition) {
				let [definitionSymbol, definitionUri] = definition;
				let definitionAsString = await SymbolToString.symbolWithChildrenToString(definitionSymbol, definitionUri, referenceDepth + 1, maxReferenceDepth);
				if (definitionAsString != '') {
					returnString += '\n\n' + definitionAsString;
				}
			}
		}
		return returnString;
	}

	// Finds the definition documentsymbol of a variable or field.
	// Returns a tuple of DocumentSymbol, and the uri of the document it was found in or undefined if it was not found.
	static async symbolToDefinitionSymbol(field: vscode.DocumentSymbol, uri: vscode.Uri): Promise<[vscode.DocumentSymbol, vscode.Uri] | undefined> {
		let definitions: (vscode.Location | vscode.LocationLink)[] = await commands.executeCommand('vscode.executeTypeDefinitionProvider', uri, field.range.start);
		if (definitions.length > 0) {
			// We only allow one definition.
			let definition = definitions[0];
			if (definition instanceof vscode.Location) {
				// Find the name of this struct.
				let definitionDocument = await vscode.workspace.openTextDocument(definition.uri);
				let definitionRange = definitionDocument.getWordRangeAtPosition(definition.range.start, /[a-zA-Z0-9_]+/g);
				let definitionName = definitionDocument.getText(definitionRange);
				// Get the documentSymbol using this name.
				let fieldDocSymbols: vscode.DocumentSymbol[] = await commands.executeCommand('vscode.executeDocumentSymbolProvider', definition.uri);
				let definitionSymbol = fieldDocSymbols.find(s => s.name == definitionName);
				if (definitionSymbol) {
					return [definitionSymbol, definition.uri];
				}
			}
		}
		return undefined
	}

	static async functionSignatureToString(symbol: vscode.SymbolInformation): Promise<string> {
		let document = await vscode.workspace.openTextDocument(symbol.location.uri);
		return document.lineAt(symbol.location.range.start.line).text
	}

	static async lineToString(symbol: vscode.SymbolInformation): Promise<string> {
		let document = await vscode.workspace.openTextDocument(symbol.location.uri);
		let line = document.lineAt(symbol.location.range.start.line).text;
		return line
	}

	static async workspaceSymbolToString(symbol: vscode.SymbolInformation): Promise<string> {
		let docSymbol: vscode.DocumentSymbol | undefined = await SymbolInformationUtils.getDocumentSymbol(symbol);
		if (!docSymbol) { return "" }
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
				return await SymbolToString.workspaceSymbolToString(workspaceSymbol)
		}
	}
}
