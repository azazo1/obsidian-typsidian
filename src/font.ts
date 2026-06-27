import {
	TypstSnippet,
	$typst,
} from "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs";

interface FontData {
	postscriptName: string;
	fullName: string;
	family: string;
	style: string;
	blob: () => Promise<Blob>;
}

interface Window {
	queryLocalFonts?: () => Promise<FontData[]>;
}

export async function fontInit(setFontStr: string) {
	const queryLocalFonts = (window as Window).queryLocalFonts;
	if (!setFontStr.trim() || typeof queryLocalFonts !== "function") {
		return;
	}

	let fonts: FontData[];
	try {
		fonts = await queryLocalFonts.call(window);
	} catch {
		return;
	}

	const setFontNames = setFontStr
		.split(",")
		.map((f) => f.trim().toLowerCase());
	const setFonts = fonts.filter((f) =>
		setFontNames.includes(f.family.trim().toLowerCase())
	);
	for (const font of setFonts) {
		const bi = await font.blob();
		$typst.use(TypstSnippet.preloadFontFromUrl(URL.createObjectURL(bi)));
	}
}
