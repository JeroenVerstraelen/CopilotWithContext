import * as vscode from 'vscode';
import { commands } from 'vscode';
import { Config } from "../utils/Config";

export class SimpleSymbol {
	constructor(public name: string, public uri: vscode.Uri, public range: vscode.Range) { }
}

export class SymbolInformationUtils {

	static symbolInfoToSimpleSymbol(symbolInformation: vscode.SymbolInformation): SimpleSymbol {
		return new SimpleSymbol(symbolInformation.name, symbolInformation.location.uri, symbolInformation.location.range);
	}

	static async getWorkspaceSymbolInformation(name: string, filterKind: vscode.SymbolKind) {
		let editor = vscode.window.activeTextEditor;
		if (!editor) { return []; }
		let fileEnding = Config.languageFileExtension(editor.document.languageId);
		let symbols: vscode.SymbolInformation[] = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', name);
		let filteredSymbols = symbols.filter(symbol => symbol.kind === filterKind && symbol.location.uri.path.includes(fileEnding));
		return filteredSymbols;
	}

	static async getDocumentSymbol(inputSymbol: SimpleSymbol): Promise<vscode.DocumentSymbol | undefined> {
		let documentSymbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', inputSymbol.uri);
		if (documentSymbols !== undefined) {
			let documentSymbol: vscode.DocumentSymbol | undefined = documentSymbols.find(s => s.range.start.line === inputSymbol.range.start.line);
			return documentSymbol;
		}
	}

	static async getAny(name: string): Promise<vscode.SymbolInformation[]> {
		let editor = vscode.window.activeTextEditor;
		if (!editor) { return []; }
		let fileEnding = Config.languageFileExtension(editor.document.languageId);
		let symbols: vscode.SymbolInformation[] = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', name);
		let filteredSymbols = symbols.filter(symbol => symbol.location.uri.path.includes(fileEnding));
		return filteredSymbols;
	}

	static async getStructs(name: string): Promise<vscode.SymbolInformation[]> {
		return SymbolInformationUtils.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Struct);
	}

	static async getInterfaces(name: string): Promise<vscode.SymbolInformation[]> {
		return SymbolInformationUtils.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Interface);
	}

	static async getMethods(name: string): Promise<vscode.SymbolInformation[]> {
		return SymbolInformationUtils.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Method);
	}

	static async getVariables(name: string): Promise<vscode.SymbolInformation[]> {
		return SymbolInformationUtils.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Variable);
	}

	static async getFunctions(name: string): Promise<vscode.SymbolInformation[]> {
		return SymbolInformationUtils.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Function);
	}

	static async getClasses(name: string): Promise<vscode.SymbolInformation[]> {
		return SymbolInformationUtils.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Class);
	}
}
