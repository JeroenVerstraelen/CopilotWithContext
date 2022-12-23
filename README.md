# Copilot with Context
Simple plugin that adds snippets and other tools for Github copilot to improve productivity.

## How does it work?
![](https://i.imgur.com/GP94OfP.gif)
1. Use <i>paste snippet</i> to quickly add any class, method, piece of code, ... as a special comment
2. Prompt github copilot
3. Use <i>remove snippets</i> to remove the comment you used as a reference

Or use any of the other utility functions provided by this extension.

## Benefits
* Ensure Copilot knows how to call any API with the correct parameters
* Ensure Copilot knows the parameters for any function in your code
* Save any of your Copilot prompts as a snippet for easy access
    * Find other prompts on the github discussions page!
* Quickly reformat code without fumbling around with prompts
* Generally make working with Copilot easier
  
## Commands

### Paste snippet
Search for any snippet, class, method, function, ... in your workspace and quickly paste it above your cursor.

### Remove snippets
Remove any comment between \<snippet\>\</snippet\> from the current file.

### Add snippet
Select a section of code and add it as snippet for later.

### Rewrite function
Quickly reformat a function.

Example: Both parameters are switched for all assertions in only a few seconds. 
![](https://i.imgur.com/4xrWIMC.gif)

## What are snippets
Snippets are simple comments in any language surrounded by \<snippet\> tags. They provide Copilot with the necessary context to call functions, etc. with the correct parameters.

The workflow is simple:
1. Paste a snippet
2. Call Copilot
3. Call the 'remove snippet' command when you are satisfied with the result.

Where do snippets come from?
1. You can add snippets by selecting some code and calling the 'add snippet' command
2. You can search for any symbol (function, class, struct) in your project and paste it as a snippet

In the future you can define various sources for your snippets:
1. Actual documentation pages 
2. Search for some term in your project files, then quickly paste a few lines before and after this term as a snippet.
3. Snippets created by others, so that Copilot can handle any API without issues.
4. Search snippets of code on github or grepper

