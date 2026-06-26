import { $typst } from "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs";
import TypsidianPlugin from "main";
export default class TypstSvgElement extends HTMLElement {
	typstContent: string;
	plugin: TypsidianPlugin;
	isinline: boolean;
	source = "";

	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.isinline = false; // 默认为 false
	}

	async connectedCallback() {
		let svgText = "";
		try {
			svgText = await $typst.svg({
				mainContent: this.typstContent,
			});
		} catch (error) {
			if (this.renderLatexFallback()) {
				return;
			}
			svgText = "in: " + this.typstContent + "\n" + error;
		}

		if (this.shadowRoot) {
			this.renderSvg(svgText);
		}
	}

	private renderLatexFallback(): boolean {
		const displayMode = !this.isinline;
		const enabled = this.isinline
			? this.plugin.settings.enableFallBackToTexInline
			: this.plugin.settings.enableFallbackToTexBlock;
		if (!enabled) {
			return false;
		}
		this.replaceWith(this.plugin.tex2html(this.source, { display: displayMode }));
		return true;
	}

	private renderSvg(svgText: string) {
		if (!this.shadowRoot) {
			return;
		}
		const doc = new DOMParser().parseFromString(svgText, "text/html");
		const svg = doc.querySelector("svg");
		if (!svg) {
			this.renderError(svgText);
			return;
		}
		const style = document.createElement("style");
		style.textContent = `
			:host {
				display: ${this.isinline ? "inline-block" : "block"};
				text-align: ${this.isinline ? "left" : "center"};
				vertical-align: ${this.isinline ? "baseline" : "initial"};
				color: inherit;
				max-width: 100%;
				line-height: 0;
				overflow-x: ${this.isinline ? "visible" : "auto"};
			}
			svg {
				display: ${this.isinline ? "block" : "inline-block"};
				max-width: 100%;
				height: auto;
				background: transparent;
			}
		`;
		this.shadowRoot.replaceChildren(style, document.importNode(svg, true));
	}

	private renderError(message: string) {
		if (!this.shadowRoot) {
			return;
		}
		const span = document.createElement("span");
		span.style.color = "red";
		span.textContent = message;
		this.shadowRoot.replaceChildren(span);
	}

	static regisiter() {
		if (customElements.get("typst-svg") === undefined) {
			customElements.define("typst-svg", TypstSvgElement);
		}
	}
}
