import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';
import { Config } from "../../Config";

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		// print something
		let regexInput = 		
		`
		func testsomething() {
			// Create a player
			// <snippet>
			// 	networkID = uint32(5)
			// 	playerConns = []*DummyConnection{}
			// 	for i := uint32(0); i <snippet networkID; i++ {
			// 		playerConn := NewDummyConnectionWithUserID(i, i)
			// 		playerConns = append(playerConns, playerConn)
			// 		playerName := "Player" + strconv.Itoa(int(i))
			// 		entities.NewPlayerEntity(playerConn, playerName)
			// 	}
			// </snippet>
			networkID := uint32(5)
			playerConns := []*DummyConnection{}
			playerEntity := entities.NewPlayerEntity(playerConn, "TestCharacter")
		}
		`
		let regexOutput = 		
		`
		func testsomething() {
			// Create a player
			networkID := uint32(5)
			playerConns := []*DummyConnection{}
			playerEntity := entities.NewPlayerEntity(playerConn, "TestCharacter")
		}
		`
		let commentSymbol = Config.commentSymbol;
		let snippetStartSymbol = Config.snippetStartSymbol;
		let snippetEndSymbol = Config.snippetEndSymbol;
		let newline = '(\r\n|\r|\n)';
		let whitespace = '\\s*';
		let regex = new RegExp(newline + '?' + whitespace + commentSymbol + snippetStartSymbol + '([\\s\\S]*?)' + snippetEndSymbol + '([\\s\\S]*?)', 'g');
		let actualRegexOutput = regexInput.replace(regex, '');
		assert.strictEqual(actualRegexOutput.toString(), regexOutput.toString());
	});
});
