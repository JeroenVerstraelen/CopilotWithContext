import * as vscode from 'vscode';
import { commands } from 'vscode';

export class SymbolToString {

	static async structToString(documentSymbol: vscode.DocumentSymbol, uri: vscode.Uri, referenceDepth = 0, maxReferenceDepth = 0): Promise<string> {
		/*
			Recursively converts a Struct DocumentSymbol to a string.
		*/
		if (referenceDepth > maxReferenceDepth) {
			return '';
		}

		// 1. Add this struct as a comment.
		let fsPath = uri.fsPath;
		let document = await vscode.workspace.openTextDocument(fsPath);
		let range = documentSymbol.range;
		// Convert every line to comment.
		let returnString = document.getText(range);

		// 2. Look at the fields of this struct.
		// If any field is a struct, find its definition and recursively add it to the comment.
		for (let field of documentSymbol.children) {
			// Look for definitions of this field using its field name.
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
						// Add the documentSymbol (= struct) recursively to the comment.
						let definitionAsString = await SymbolToString.structToString(definitionSymbol, definition.uri, referenceDepth + 1, maxReferenceDepth);
						if (definitionAsString != '') {
							returnString += '\n\n' + definitionAsString;
						}
					}
				}
			}
		}
		return returnString;
	}


}
