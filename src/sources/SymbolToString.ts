import * as vscode from 'vscode';
import { commands } from 'vscode';
import { WorkspaceSymbol, WorkspaceSymbols } from './WorkspaceSymbols';

export class SymbolToString {

	static async symbolWithChildrenToString(workspaceSymbol: WorkspaceSymbol, referenceDepth = 0, maxReferenceDepth = 0): Promise<string> {
		if (referenceDepth > maxReferenceDepth) { return ''; }
		let documentSymbol = await WorkspaceSymbols.getDocumentSymbol(workspaceSymbol);
		if (!documentSymbol) { return "" }

		// Go over every child and recursively add their definitions to the final string.
		let returnString = await SymbolToString.workspaceSymbolToString(workspaceSymbol);
		for (let field of documentSymbol.children) {
			let definitionSymbol = await SymbolToString.symbolToDefinitionSymbol(field, workspaceSymbol.uri);
			if (definitionSymbol) {
				let definitionAsString = await SymbolToString.symbolWithChildrenToString(definitionSymbol, referenceDepth + 1, maxReferenceDepth);
				if (definitionAsString != '') {
					returnString += '\n\n' + definitionAsString;
				}
			}
		}
		return returnString;
	}

	// Finds the definition documentsymbol of a variable or field.
	static async symbolToDefinitionSymbol(field: vscode.DocumentSymbol, uri: vscode.Uri): Promise<WorkspaceSymbol | undefined>{
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
					return new WorkspaceSymbol(definitionSymbol.name, definition.uri, definitionSymbol.range);
				}
			}
		}
		return undefined
	}

	static async functionSignatureToString(symbol: WorkspaceSymbol): Promise<string> {
		let uri = symbol.uri;
		let document = await vscode.workspace.openTextDocument(uri);
		return document.lineAt(symbol.range.start.line).text
	}

	static async lineToString(symbol: WorkspaceSymbol): Promise<string> {
		let uri = symbol.uri;
		let document = await vscode.workspace.openTextDocument(uri);
		let line = document.lineAt(symbol.range.start.line).text;
		return line
	}

	static async workspaceSymbolToString(symbol: WorkspaceSymbol): Promise<string> {
		let docSymbol: vscode.DocumentSymbol | undefined = await WorkspaceSymbols.getDocumentSymbol(symbol);
		if (!docSymbol) { return "" }
		let document = await vscode.workspace.openTextDocument(symbol.uri);
		return document.getText(docSymbol.range);
	}

	static async anyToString(symbol: vscode.SymbolInformation): Promise<string> {
		let workspaceSymbol = WorkspaceSymbols.symbolInfoToWorkspaceSymbol(symbol);
		switch (symbol.kind) {
			case vscode.SymbolKind.Struct:
				return await SymbolToString.symbolWithChildrenToString(workspaceSymbol, 0, 0);
			case vscode.SymbolKind.Class:
				return await SymbolToString.symbolWithChildrenToString(workspaceSymbol, 0, 0);
			case vscode.SymbolKind.Field:
				return await SymbolToString.lineToString(workspaceSymbol);
			case vscode.SymbolKind.Variable:
				return await SymbolToString.lineToString(workspaceSymbol);
			default:
				return await SymbolToString.workspaceSymbolToString(workspaceSymbol)
		}
	}
}
