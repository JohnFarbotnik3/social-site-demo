/*
sources:
https://esbuild.github.io/getting-started/#build-scripts
https://esbuild.github.io/content-types/#typescript
*/

import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["./src/application/api_simulation_test.ts"],
	bundle: true,
	outfile: "./bundle/simtest.cjs",
	tsconfig: "./tsconfig.json",
	// https://esbuild.github.io/api/#loader
	// https://esbuild.github.io/content-types/#typescript
	loader: { ".ts":"ts" },
	// https://esbuild.github.io/api/#platform
	platform: "node",
	// https://esbuild.github.io/api/#target
	target: "node23",
	// https://esbuild.github.io/api/#minify
	minify: false,
	// https://esbuild.github.io/api/#tree-shaking
	treeShaking: true,
	// https://esbuild.github.io/api/#sourcemap
	sourcemap: "linked",
});
