import * as vscode from 'vscode';
import { commands } from 'vscode';
import { Config } from "./Config";

export class WorkspaceSymbol {
	constructor(public name: string, public uri: vscode.Uri, public range: vscode.Range) { }
}

export class WorkspaceSymbols {
	static async getWorkspaceSymbolInformation(name: string, filterKind: vscode.SymbolKind) {
		let fileEnding = Config.languageFileEnding;
		let symbols: vscode.SymbolInformation[] = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', name);
		let filteredSymbols = symbols.filter(symbol => symbol.kind === filterKind && symbol.location.uri.path.includes(fileEnding));
		return filteredSymbols;
	}

	static async getDocumentSymbol(inputSymbol: WorkspaceSymbol): Promise<vscode.DocumentSymbol | undefined> {
		// return commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', symbolInformation.location.uri)
		// .then(documentSymbols => {
		// 	if (documentSymbols !== undefined) {
		// 		let documentSymbol: vscode.DocumentSymbol | undefined = documentSymbols.find(s => s.name === symbolInformation.name);
		// 		return documentSymbol;
		// 	}
		// });
		let documentSymbols: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', inputSymbol.uri);
		if (documentSymbols !== undefined) {
			let documentSymbol: vscode.DocumentSymbol | undefined = documentSymbols.find(s => s.range.start.line === inputSymbol.range.start.line);
			return documentSymbol;
		}
	}

	static async getAny(name: string): Promise<vscode.SymbolInformation[]> {
		let fileEnding = Config.languageFileEnding;
		let symbols: vscode.SymbolInformation[] = await commands.executeCommand('vscode.executeWorkspaceSymbolProvider', name);
		let filteredSymbols = symbols.filter(symbol => symbol.location.uri.path.includes(fileEnding));
		return filteredSymbols;
	}

	static async getStructs(name: string): Promise<vscode.SymbolInformation[]> {
		return WorkspaceSymbols.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Struct);
	}

	static async getFunctions(name: string): Promise<vscode.SymbolInformation[]> {
		return WorkspaceSymbols.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Function);
	}

	static async getMethods(methodName: string): Promise<WorkspaceSymbol[]> {
		let methods = await WorkspaceSymbols.getWorkspaceSymbolInformation(methodName, vscode.SymbolKind.Method);
		if (methods.length > 0) {
			let retSymbols = [];
			for (let method of methods) {
				let docSymbolWithUri = new WorkspaceSymbol(method.name, method.location.uri, method.location.range);
				retSymbols.push(docSymbolWithUri);
			} 	
			return retSymbols;
		}
		// TODO: Check if this works for other languages. E.g. Javascript
		let classes = await WorkspaceSymbols.getClasses('');
		let structs = await WorkspaceSymbols.getStructs('');
		let classMethods = [];
		let uris: vscode.Uri[] = [];
		for (let classSymbol of classes) {
			let classWorkspaceSymbol = new WorkspaceSymbol(classSymbol.name, classSymbol.location.uri, classSymbol.location.range);
			let classDocumentSymbol: vscode.DocumentSymbol | undefined = await WorkspaceSymbols.getDocumentSymbol(classWorkspaceSymbol);
			if (classDocumentSymbol !== undefined) {
				classMethods.push(...classDocumentSymbol.children.filter(child => child.kind === vscode.SymbolKind.Method && child.name.includes(methodName)));
				uris.push(classSymbol.location.uri);
			}
		}
		for (let structSymbol of structs) {
			let structWorkspaceSymbol = new WorkspaceSymbol(structSymbol.name, structSymbol.location.uri, structSymbol.location.range);
			let structDocumentSymbol: vscode.DocumentSymbol | undefined = await WorkspaceSymbols.getDocumentSymbol(structWorkspaceSymbol);
			if (structDocumentSymbol !== undefined) {
				classMethods.push(...structDocumentSymbol.children.filter(child => child.kind === vscode.SymbolKind.Method && child.name.includes(methodName)));
				uris.push(structSymbol.location.uri);
			}
		}
		return classMethods.map((method, index) => new WorkspaceSymbol(method.name, uris[index], method.range));
	}

	static async getMethodsOfClass(className: string): Promise<vscode.DocumentSymbol[]> {
		let classes = await WorkspaceSymbols.getClasses(className);
		if (classes.length > 0) {
			return WorkspaceSymbols.getMethodsOfClassSymbol(classes[0])
		}
		return [];
	}

	static async getMethodsOfClassSymbol(classSymbol: vscode.SymbolInformation): Promise<vscode.DocumentSymbol[]> {
		let classWorkspaceSymbol = new WorkspaceSymbol(classSymbol.name, classSymbol.location.uri, classSymbol.location.range);
		let classDocumentSymbol: vscode.DocumentSymbol | undefined = await WorkspaceSymbols.getDocumentSymbol(classWorkspaceSymbol);
		if (classDocumentSymbol !== undefined) {
			return classDocumentSymbol.children.filter(child => child.kind === vscode.SymbolKind.Method);
		}
		return [];
	}

	static async getClasses(name: string): Promise<vscode.SymbolInformation[]> {
		return WorkspaceSymbols.getWorkspaceSymbolInformation(name, vscode.SymbolKind.Class);
	}
}
