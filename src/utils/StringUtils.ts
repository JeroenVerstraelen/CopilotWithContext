export const symbolKindToString = {
	0: 'File',
	1: 'Module',
	2: 'Namespace',
	3: 'Package',
	4: 'Class',
	5: 'Method',
	6: 'Property',
	7: 'Field',
	8: 'Constructor',
	9: 'Enum',
	10: 'Interface',
	11: 'Function',
	12: 'Variable',
	13: 'Constant',
	14: 'String',
	15: 'Number',
	16: 'Boolean',
	17: 'Array',
	18: 'Object',
	19: 'Key',
	20: 'Null',
	21: 'EnumMember',
	22: 'Struct',
	23: 'Event',
	24: 'Operator',
	25: 'TypeParameter'
}

export const stringToSymbolKind = {
	'File': 0,
	'Module': 1,
	'Namespace': 2,
	'Package': 3,
	'Class': 4,
	'Method': 5,
	'Property': 6,
	'Field': 7,
	'Constructor': 8,
	'Enum': 9,
	'Interface': 10,
	'Function': 11,
	'Variable': 12,
	'Constant': 13,
	'String': 14,
	'Number': 15,
	'Boolean': 16,
	'Array': 17,
	'Object': 18,
	'Key': 19,
	'Null': 20,
	'EnumMember': 21,
	'Struct': 22,
	'Event': 23,
	'Operator': 24,
	'TypeParameter': 25
}

export const canBeConvertToRegExp = (str: string) => {
	try {
		new RegExp(str);
		return true;
	} catch (e) {
		return false;
	}
};

export const trimStart = (str: string, chars: string = ' '): string => {
	let index = 0;
	while (chars.indexOf(str[index]) !== -1) {
		index++;
	}
	return str.slice(index);
};

export const trimEnd = (str: string, chars: string = ' '): string => {
	let length = str.length;
	while (length && chars.indexOf(str[length - 1]) !== -1) {
		length--;
	}
	return str.slice(0, length);
};

export const combineGlobsToRegExp = (globs: string[]) => {
	// only support very simple globs convert now
	const result = Array.from(
		new Set(globs.map((glob: string) => trimEnd(trimStart(glob, '*/'), '*/').replace(/^\./, '\\.')))
	)
		// if the glob still not can be convert to a regexp, just ignore it
		.filter((item) => canBeConvertToRegExp(item))
		.join('|');
	// ensure the result can be convert to a regexp
	return canBeConvertToRegExp(result) ? result : '';
};

export const escapeRegexp = (text: string): string => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');