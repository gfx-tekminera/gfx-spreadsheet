import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import externals from 'rollup-plugin-node-externals';
import resolve from '@rollup/plugin-node-resolve';
// import scss from 'rollup-plugin-scss';
import del from 'rollup-plugin-delete';
import replace from 'rollup-plugin-replace';
import copy from 'rollup-plugin-copy';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';

const gfxComponents = 'src/gfxComponents.ts';
const gfxComponentsCore = 'src/core/index.ts'
const NODE_ENV = JSON.stringify(process.env.NODE_ENV || 'development');
const includeSourceMaps = true;

const plugins = [
    replace({
        'process.env.NODE_ENV': NODE_ENV
    }),
    typescript({
        typescript: require('typescript'),
        useTsconfigDeclarationDir: true,
        tsconfig: 'tsconfig.prod.json',
        exclude: ['src/test/**/*'],
    }),
    externals({
        devDeps: false,
    }),
    resolve(),
    commonjs(),
    postcss(),
    terser({
        format: {
            comments: false,
        },
        compress: true,
        keep_classnames: true,
    }),
];

const executeOncePlugins = [
    del({ targets: ['dist/*'] }),
    copy({
        targets: [
            { src: ['src/*.css', 'package.json', 'README.md', 'LICENSE', '.npmignore'], dest: 'dist' },
            // { src: 'src/test/theming-test.scss', dest: 'dist/test' },
            // { src: 'cypress/integration', dest: 'dist/cypress' },
            // { src: 'src/test/flagCell/flag-cell-style.scss', dest: 'dist/test/flagCell' },
        ]
    }),
]

const rollupConfig = [
    {
        input: [gfxComponentsCore, gfxComponents],
        output: {
            entryFileNames: '[name].esm.js',
            dir: 'dist/core/',
            format: 'esm',
            sourcemap: includeSourceMaps,
        },
        plugins: [
            ...plugins,
        ],
    },
    {
        input: [gfxComponentsCore, gfxComponents],
        output: {
            entryFileNames: '[name].js',
            dir: 'dist/core/',
            format: 'cjs',
            sourcemap: includeSourceMaps,
        },
        plugins: [
            ...plugins,
        ],
    },
    {
        input: './dist/types/lib/index.d.ts',
        output: [
            { file: './dist/gfxComponents.d.ts', format: 'es' }
        ],
        plugins: [
            dts(),
        ],
    },
];

rollupConfig[0].plugins.push(...executeOncePlugins);

export default rollupConfig; 
