// References:
// https://github.com/alexeystrakh/vscode-stackoverflow-extension
// https://github.com/arnavs-0/Stack-Helper/blob/master/stackhelper/src/extension.ts#L377
// https://stackapps.com/apps/oauth/view/24193

// import vscode
import * as vscode from 'vscode';
import * as request from "request-promise-native";

export interface StackoverflowResponse {
    items: StackoverflowItem[];
}

export interface StackoverflowItem {
    answers:            StackoverflowAnswer[];
    accepted_answer_id: number;
    score:              number;
    question_id:        number;
    title:              string;
    body:               string;
}

export interface StackoverflowAnswer {
    is_accepted: boolean;
    score:       number;
    body:        string;
}

export class Stackoverflow {

    static async search(searchTerm: string): Promise<string | undefined> {
        if (!searchTerm || searchTerm.trim() === '') {
            return;
        }

        searchTerm = searchTerm.trim();
        console.log(`User initiated a stackoverflow search with [${searchTerm}] search term`);
        
        // process tags
        const tags: string[] = [];
        const changeChar = /\[(.+?)\]/gm;
        let tagsMatch;
        let updatedSearchTerm = searchTerm;
        while ((tagsMatch = changeChar.exec(updatedSearchTerm)) !== null) {
            // Avoid Null Searches
            if (tagsMatch.index === changeChar.lastIndex) {
                changeChar.lastIndex++;
            }
            
            tagsMatch.forEach((match, groupIndex) => {
                if(groupIndex === 0) { // full match without group for replace
                    updatedSearchTerm = updatedSearchTerm.replace(match, "").trim();
                } else if(groupIndex === 1) { // not a full match
                    tags.push(match);
                }
            });  
        }

        const stackoverflowApiKey = 'O6c9kXQmlELyo)2Y1Fan9g((';
        const encodedTagsString = encodeURIComponent(tags.join(';'));
        const encodedAPISearchTerm = encodeURIComponent(updatedSearchTerm);
        const encodeWeb = encodeURIComponent(searchTerm);
        const filter = encodeURIComponent('!6VClS.317RM6C(_Ig3IlHwys1')
        // const apiSearchUrl = `https://api.stackexchange.com/2.2/search?order=desc&sort=relevance&intitle=${encodedAPISearchTerm}&tagged=${encodedTagsString}&site=stackoverflow&key=${stackoverflowApiKey}`;
        const apiSearchUrl = `https://api.stackexchange.com/2.3/search/advanced?page=1&pagesize=10&order=desc&sort=relevance&accepted=True&closed=False&q=${encodedAPISearchTerm}&tagged=${encodedTagsString}&site=stackoverflow&key=${stackoverflowApiKey}&filter=${filter}`;

        const stackoverflowSearchUrl = `https://stackoverflow.com/search?q=${encodeWeb}`;
        const googleSearchUrl = `https://www.google.com/search?q=${encodeWeb}`;
        const urlOpt = {
            uri: apiSearchUrl,
            json: true,
            gzip: true,
        };
        
        const searchResponseItems: StackoverflowItem[] = []
        try {
            const searchResponse: StackoverflowResponse = await request.get(urlOpt);
            if (searchResponse.items && searchResponse.items.length > 0) {
                searchResponse.items.forEach((q: StackoverflowItem, i: number) => {
                    q.title = `Q: ${decodeURIComponent(q.title)}`;
                    searchResponseItems.push(q)
                });
            }
        } catch (error) {
            console.error(error);
        }

        const questions = searchResponseItems.map(q => <vscode.QuickPickItem>{ label: q.title, detail: q.body });
        questions.push({ label: 'Search Stack Overflow', alwaysShow: true });
        const selectedTitle = await vscode.window.showQuickPick(questions, { canPickMany: false });
        if (!selectedTitle) { return; }
        if (selectedTitle.label === 'Search Stack Overflow') {
            const newSearchTerm = await vscode.window.showInputBox({
                prompt: 'Search Stack Overflow',
                placeHolder: 'Search Stack Overflow',
                value: searchTerm,
            });
            if (!newSearchTerm) { return; }
            return await Stackoverflow.search(newSearchTerm);
        }

        const selectedQuestionMeta = searchResponseItems.find(q => q.title === selectedTitle.label);
        //return selectedQuestionMeta?.answers.
        // add body to selected answer body.
        if (!selectedQuestionMeta) { return; }
        const selectedAnswer = selectedQuestionMeta.answers.find(a => a.is_accepted);
        let retString = "Question: \n" + selectedQuestionMeta.body + "\n\n" + "Answer: \n" + selectedAnswer?.body;
        // santize retString by removing any html <> tags except for <code></code> tags.
        return retString.replace(/<(?!\/code|code).*?>/gm, '');
    }

}