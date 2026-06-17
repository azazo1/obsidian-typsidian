import { MarkdownView, Plugin, loadMathJax } from "obsidian";
import {
	DEFAULT_SETTINGS,
	TypsidianPluginSettings,
	TypsidianSettingTab,
} from "src/settings";
import TypstSvgElement from "src/typst-svg-element";

import { initTypst, regCmds } from "src/init";
import { isDarkMode } from "src/util";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const MathJax: any;

export default class TypsidianPlugin extends Plugin {
	settings: TypsidianPluginSettings;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tex2html: any; // mathjax tex2chtml function
	async onload() {
		await this.loadSettings();

		await initTypst(this);

		regCmds(this);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TypsidianSettingTab(this.app, this));
		await loadMathJax();
		this.tex2html = MathJax.tex2chtml;

		MathJax.tex2chtml = (e: string, r: { display: boolean }) =>
			this.typstTex2Html(e, r);

		// Register custom language template processors
		this.registerMarkdownCodeBlockProcessor("t-latex", (source, el, _) => {
			el.appendChild(this.tex2html(source, { display: true }));
		});
		this.registerCustomLanguageProcessors();
	}

	onunload() {
		MathJax.tex2chtml = this.tex2html;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Re-register custom language processors when settings change
		this.registerCustomLanguageProcessors();
		this.app.workspace
			.getActiveViewOfType(MarkdownView)
			?.previewMode.rerender(true);
	}

	private registerCustomLanguageProcessors() {
		// Unregister existing custom language processors
		// Note: Obsidian doesn't provide a direct way to unregister processors,
		// so we'll rely on the new registration to override the old ones

		// Register custom language template processors
		this.settings.customLanguageTemplates.forEach((template) => {
			if (template.enabled && template.language.trim()) {
				try {
					this.registerMarkdownCodeBlockProcessor(
						template.language,
						(source, el, ctx) => {
							const typstEl = document.createElement(
								"typst-svg"
							) as TypstSvgElement;
							// Replace {content} placeholder with user input
							const processedContent = template.template
								.replace(
									"{IsDarkMode}",
									isDarkMode() ? "true" : "false"
								)
								.replace(/\{content\}/g, source);
							typstEl.typstContent = processedContent;
							typstEl.plugin = this;
							el.appendChild(typstEl);
						}
					);
				} catch {
					console.log("");
				}
			}
		});
	}

	typstTex2Html(source: string, r: { display: boolean }): ChildNode | null {
		try {
			const matched = source.match(/^\s*#mitex\(`([\s\S]*)`\)\s*$/);
			if (matched) {
				if (matched.length > 1) {
					return this.tex2html(matched[1], r);
				}
			}

			if (r.display) {
				if (this.settings.enableMathBlockTypst) {
					if (this.looksLikeLatexMath(source)) {
						return this.tex2html(source, r);
					}
					return this.createTypstWasmSvgElement(source, true);
				}
			} else if (this.settings.enableInlineMathTypst) {
				if (this.looksLikeLatexMath(source)) {
					return this.tex2html(source, r);
				}
				return this.createTypstWasmSvgElement(source, false);
			}
			return this.tex2html(source, r);
		} catch (error) {
			// choose either to fallback to tex or print the error info
			if (this.settings.enableFallBackToTexInline && !r.display) {
				return this.tex2html(source, r);
			}
			if (this.settings.enableFallbackToTexBlock && r.display) {
				return this.tex2html(source, r);
			}
			const renderedString = `<span style="color: red;">${error}</span>`;
			return new DOMParser().parseFromString(renderedString, "text/html")
				.body.firstChild;
		}
	}

	private createTypstWasmSvgElement(
		source: string,
		displayMode: boolean
	): TypstSvgElement {
		TypstSvgElement.regisiter();
		const el = document.createElement("typst-svg") as TypstSvgElement;
		el.source = source;
		el.isinline = !displayMode;
		el.typstContent = this.buildMathTypstContent(source, displayMode);
		el.plugin = this;
		return el;
	}

	private buildMathTypstContent(
		source: string,
		displayMode: boolean
	): string {
		const template = this.settings.mathTypstTemplate.replace(
			"{IsDarkMode}",
			isDarkMode() ? "true" : "false"
		);
		const pageSetup =
			`#set page(width: auto, height: auto, margin: ${displayMode ? "4pt" : "0pt"}, fill: none)`;
		const mathSource = displayMode
			? `$ ${source} $`
			: `$${source.trim()}$`;
		return `${template}\n${pageSetup}\n${mathSource}`;
	}

	private looksLikeLatexMath(source: string): boolean {
		const text = source.trim();
		if (text.length === 0) {
			return false;
		}
		return (
			this.hasLatexEscape(text) ||
			this.hasLatexAlignmentTab(text) ||
			this.hasLatexGroupedAttachment(text)
		);
	}

	private hasLatexEscape(source: string): boolean {
		return source.includes("\\");
	}

	private hasLatexAlignmentTab(source: string): boolean {
		return /(^|[^\\])&/.test(source) && /(^|[^\\])\\\\/.test(source);
	}

	private hasLatexGroupedAttachment(source: string): boolean {
		return this.findLatexGroupedAttachments(source).length > 0;
	}

	private findLatexGroupedAttachments(source: string): string[] {
		const attachments: string[] = [];
		for (let index = 0; index < source.length; index += 1) {
			const marker = source[index];
			if (marker !== "_" && marker !== "^") {
				continue;
			}
			let cursor = index + 1;
			while (cursor < source.length && /\s/.test(source[cursor])) {
				cursor += 1;
			}
			if (source[cursor] !== "{") {
				continue;
			}
			const closeIndex = this.findMatchingBrace(source, cursor);
			if (closeIndex === -1) {
				continue;
			}
			const content = source.slice(cursor + 1, closeIndex);
			attachments.push(content);
			index = closeIndex;
		}
		return attachments;
	}

	private findMatchingBrace(source: string, openIndex: number): number {
		let depth = 0;
		for (let index = openIndex; index < source.length; index += 1) {
			const token = source[index];
			if (token === "{") {
				depth += 1;
				continue;
			}
			if (token === "}") {
				depth -= 1;
				if (depth === 0) {
					return index;
				}
			}
		}
		return -1;
	}
}
