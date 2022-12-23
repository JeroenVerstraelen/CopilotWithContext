import * as path from 'path';
import * as cp from 'child_process';

import {
	downloadAndUnzipVSCode,
	resolveCliPathFromVSCodeExecutablePath,
	runTests
} from '@vscode/test-electron';
  
async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to test runner
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		const vscodeExecutablePath = await downloadAndUnzipVSCode('1.70.2');
		const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath, 'win32-archive');
	
		// Use cp.spawn / cp.exec for custom setup
		cp.spawnSync(cliPath, ['--install-extension', 'GitHub.copilot'], {
		  encoding: 'utf-8',
		  stdio: 'inherit'
		});
	
		// Run the extension test
		await runTests({
		  // Use the specified `code` executable
		  vscodeExecutablePath,
		  extensionDevelopmentPath,
		  extensionTestsPath
		});
	  } catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	  }
	}

main();
