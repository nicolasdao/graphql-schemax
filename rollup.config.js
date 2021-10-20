import multiInput from 'rollup-plugin-multi-input'

export default {
	input: ['src/**/*.mjs'], // Thanks to 'rollup-plugin-multi-input', an array can be used instead of a single string.
	output: {
		dir: 'dist',
		format: 'cjs',
		chunkFileNames: '[name]-[hash].cjs',
		entryFileNames: '[name].cjs'
	},
	plugins:[multiInput()]
}