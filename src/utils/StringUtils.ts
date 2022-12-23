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