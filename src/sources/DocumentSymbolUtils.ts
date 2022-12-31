import * as vscode from 'vscode';
import { commands } from 'vscode';
import { Config } from "../utils/Config";

export class DocumentSymbolUtils {

	static async getDocumentSymbol(inputSymbol: vscode.SymbolInformation): Promise<vscode.DocumentSymbol | undefined> {
		// Assume executeDocumentSymbolProvider only returns DocumentSymbols.
		let documentSymbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', inputSymbol.location.uri);
		if (documentSymbols !== undefined) {
			let documentSymbol: vscode.DocumentSymbol | undefined = documentSymbols.find(s => s.range.start.line === inputSymbol.location.range.start.line);
			return documentSymbol;
		}
    }
    
	// Finds the definition documentsymbol of a variable or field.
	// Returns a tuple of DocumentSymbol, and the uri of the document it was found in or undefined if it was not found.
	static async getDefinition(field: vscode.DocumentSymbol, uri: vscode.Uri): Promise<[vscode.DocumentSymbol, vscode.Uri] | undefined> {
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
}
