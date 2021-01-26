// tslint:disable:no-console

const g = require('gulp')
const webpack: typeof import('webpack') = require('webpack')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const MonacoEditorWebpackPlugin = require('monaco-editor-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const builder: typeof import('electron-builder') = require('electron-builder')
const notifier = require('node-notifier')
const download = require('download')
const zipDir = require('zip-dir')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const glob: typeof import('fast-glob') = require('fast-glob')

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const { join, parse: pathParse } = require('path')
const { spawn } = require('child_process')

const NATIVE_MODULES = ['fontmanager-redux']

const paths = {
  src: {
    root: join(__dirname, './packages/'),
    plugins: join(__dirname, './packages/post-effect-plugins'),
    contribPEP: join(__dirname, './packages/contrib-posteffect'),
    frontend: join(__dirname, './packages/delir/'),
    core: join(__dirname, './packages/core/'),
  },
  compiled: {
    root: join(__dirname, './prepublish/'),
    plugins: join(__dirname, './prepublish/plugins'),
    frontend: join(__dirname, './prepublish/delir/'),
  },
  build: join(__dirname, './prepublish/'),
  release: join(__dirname, './release/'),
}

const isWindows = os.type() === 'Windows_NT'
const isMacOS = os.type() === 'Darwin'
const isLinux = os.type() === 'Linux'
const __DEV__ = process.env.NODE_ENV === 'development'

export function buildBrowserJs(done) {
  webpack(
    {
      mode: __DEV__ ? 'development' : 'production',
      target: 'electron-main',
      node: {
        __dirname: false,
      },
      watch: __DEV__,
      context: paths.src.frontend,
      entry: {
        browser: ['./src/browser'],
      },
      output: {
        filename: '[name].js',
        sourceMapFilename: 'map/[file].map',
        path: paths.compiled.frontend,
      },
      devtool: __DEV__ ? '#source-map' : false,
      resolve: {
        extensions: ['.js', '.ts'],
      },
      module: {
        rules: [
          {
            test: /\.ts?$/,
            exclude: /node_modules/,
            enforce: 'pre',
            loader: 'tslint-loader',
          },
          {
            test: /\.ts?$/,
            exclude: /node_modules\//,
            use: [
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                },
              },
            ],
          },
        ],
      },
      plugins: [
        ...(__DEV__
          ? [new (webpack as any).ExternalsPlugin('commonjs', ['devtron', 'electron-devtools-installer'])]
          : [new webpack.optimize.AggressiveMergingPlugin()]),
      ],
    },
    function(err, stats) {
      err && console.error(err)
      stats.compilation.errors.length &&
        stats.compilation.errors.forEach(e => {
          console.error(e.message)
          e.module && console.error(e.module.userRequest)
        })

      notifier.notify({ title: 'Delir browser build', message: 'Browser compiled' })
      done()
    },
  )
}

export async function buildPublishPackageJSON(done) {
  const string = await fs.readFile(join(paths.src.frontend, 'package.json'), { encoding: 'utf8' })
  const json = JSON.parse(string)

  delete json.devDependencies
  json.dependencies = {
    // install only native modules
    'fontmanager-redux': '1.0.0',
  }

  const newJson = JSON.stringify(json, null, '  ')

  try {
    await fs.mkdir(paths.compiled.root)
  } catch (e) {}
  try {
    await fs.writeFile(join(paths.compiled.root, 'package.json'), newJson, { encoding: 'utf8' })
  } catch (e) {}

  done()
}

export async function symlinkNativeModules(done) {
  const prepublishNodeModules = join(paths.compiled.root, 'node_modules/')

  await fs.remove(prepublishNodeModules)
  await fs.mkdir(prepublishNodeModules)

  for (let dep of NATIVE_MODULES) {
    try {
      if (dep.includes('/')) {
        const ns = dep.slice(0, dep.indexOf('/'))

        if (!(await fs.exists(join(prepublishNodeModules, ns)))) {
          await fs.mkdir(join(prepublishNodeModules, ns))
        }
      }

      await fs.symlink(join(__dirname, 'node_modules/', dep), join(prepublishNodeModules, dep), 'dir')
    } catch (e) {
      console.log(e)
    }
  }

  done()
}

export async function downloadAndDeployFFmpeg() {
  const ffmpegBinUrl = {
    mac: {
      archiveUrl: 'https://ffmpeg.zeranoe.com/builds/macos64/static/ffmpeg-4.0.2-macos64-static.zip',
      binFile: 'ffmpeg',
      binDist: join(paths.release, 'mac/Delir.app/Contents/Resources/ffmpeg'),
      licenseDist: join(paths.release, 'mac/Delir.app/Contents/Resources/FFMPEG_LICENSE.txt'),
    },
    windows: {
      archiveUrl: 'https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-4.0.2-win64-static.zip',
      binFile: 'ffmpeg.exe',
      binDist: join(paths.release, 'win-unpacked/ffmpeg.exe'),
      licenseDist: join(paths.release, 'win-unpacked/FFMPEG_LICENSE.txt'),
    },
  }

  const downloadDir = join(__dirname, 'tmp/ffmpeg')

  await fs.remove(downloadDir)
  await fs.mkdirp(downloadDir)

  console.log('Downloading ffmpeg...')

  await Promise.all(
    Object.entries(ffmpegBinUrl).map(async ([platform, { archiveUrl, binFile, binDist, licenseDist }]) => {
      const dirname = path.parse(archiveUrl.slice(archiveUrl.lastIndexOf('/'))).name
      await download(archiveUrl, downloadDir, { extract: true })
      await fs.copy(join(downloadDir, dirname, 'bin', binFile), binDist)
      await fs.copy(join(downloadDir, dirname, 'LICENSE.txt'), licenseDist)
    }),
  )
}

export async function generateLicenses() {
  const destination = join(paths.src.frontend, '/src/modals/AboutModal/Licenses.ts')

  const jsons = [
    JSON.parse(await fs.readFile(join(__dirname, 'package.json'), { encoding: 'UTF-8' })),
    JSON.parse(await fs.readFile(join(paths.src.frontend, 'package.json'), { encoding: 'UTF-8' })),
    JSON.parse(await fs.readFile(join(paths.src.core, 'package.json'), { encoding: 'UTF-8' })),
  ]

  const deps = jsons.reduce((deps, json) => ({ ...deps, ...json.dependencies, ...json.devDependencies }), {})
  const sorted = Object.entries(deps).sort((a, b) => {
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  })

  const entries = sorted.map(([name]) => {
    const json = require(require.resolve(`${name}/package.json`, {
      paths: [__dirname, paths.src.frontend, paths.src.core],
    }))

    return { name, url: json.homepage || `https://www.npmjs.com/package/${name}` }
  })

  const content = `// This is auto generated file\n// tslint:disable\n// prettier-ignore\nexport const dependencies = ${JSON.stringify(
    entries,
    null,
    4,
  )}\n`
  await fs.writeFile(destination, content)
}

export function compileRendererJs(done) {
  webpack(
    {
      mode: __DEV__ ? 'development' : 'production',
      target: 'electron-renderer',
      watch: __DEV__,
      context: paths.src.frontend,
      entry: {
        main: ['./src/main'],
      },
      optimization: {
        splitChunks: {
          name: 'vendor',
          chunks: 'initial',
        },
      },
      output: {
        filename: '[name].js',
        sourceMapFilename: 'map/[file].map',
        path: paths.compiled.frontend,
      },
      devtool: false,
      resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        modules: ['node_modules'],
        alias: {
          // Disable React development build for performance measurement
          react: 'react/cjs/react.production.min.js',
          'react-dom': 'react-dom/cjs/react-dom.production.min.js',
          // Using fresh development packages always
          '@delirvfx/core': join(paths.src.core, 'src/index.ts'),
        },
        plugins: [
          new TsconfigPathsPlugin({
            configFile: join(paths.src.frontend, 'tsconfig.json'),
          }),
        ],
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            enforce: 'pre',
            loader: 'tslint-loader',
          },
          {
            test: /\.tsx?$/,
            exclude: /node_modules\//,
            use: [
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                },
              },
            ],
          },
          {
            test: /\.s(a|c)ss$/,
            use: [
              {
                loader: 'style-loader',
              },
              {
                loader: 'css-loader',
                options: {
                  modules: {
                    localIdentName: __DEV__ ? '[path][name]__[local]--[hash:base64:5]' : '[local]--[hash:base64:5]',
                  },
                },
              },
              {
                loader: 'sass-loader',
                options: {
                  implementation: require('sass'),
                },
              },
            ],
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.(eot|svg|ttf|woff|woff2|gif)$/,
            loader: 'file-loader',
            options: {
              name: '[name][hash].[ext]',
              publicPath: '',
            },
          },
        ],
      },
      plugins: [
        new webpack.DefinePlugin({ __DEV__: JSON.stringify(__DEV__) }),
        // preserve require() for native modules
        new (webpack as any).ExternalsPlugin('commonjs', [...NATIVE_MODULES, 'aws-sdk']),
        new MonacoEditorWebpackPlugin(),
        new HtmlWebpackPlugin({
          template: join(paths.src.frontend, 'src/index.html'),
        }),
        new ForkTsCheckerWebpackPlugin({
          tsconfig: join(paths.src.frontend, 'tsconfig.json'),
        }),
        new webpack.IgnorePlugin({ resourceRegExp: /@microsoft\/typescript-etw/, contextRegExp: /typescript/ }),
        ...(__DEV__ ? [] : [new webpack.optimize.AggressiveMergingPlugin()]),
      ],
    },
    function(err, stats) {
      err && console.error(err)
      stats.compilation.errors.length &&
        stats.compilation.errors.forEach(e => {
          console.error(e.message)
          e.module && console.error(e.module.userRequest)
        })

      notifier.notify({ title: 'Delir build', message: 'Renderer compiled', sound: true })
      console.log('Compiled')
      done()
    },
  )
}

export async function compilePlugins(done) {
  const contribPEP = (await glob.sync('*/index.ts', { cwd: paths.src.contribPEP })).reduce((memo, entry) => {
    const { dir, name } = pathParse(entry)
    memo[`${dir}/${name}`] = join(paths.src.contribPEP, entry)
    return memo
  }, {})

  webpack(
    {
      mode: __DEV__ ? 'development' : 'production',
      target: 'electron-renderer',
      watch: __DEV__,
      context: paths.src.plugins,
      entry: {
        'the-world/index': './the-world/index',
        'numeric-slider/index': './numeric-slider/index',
        'color-slider/index': './color-slider/index',
        'chromakey/index': './chromakey/index',
        'webgl/index': './webgl/index',
        'time-posterization/index': './time-posterization/index',
        'repeat-tile/index': './repeat-tile/index',
        // 'color-collection/index': './color-collection/index',
        ...contribPEP,
        ...(__DEV__
          ? {
              // 'gaussian-blur/index': '../experimental-plugins/gaussian-blur/index',
              // 'filler/index': '../experimental-plugins/filler/index',
              // 'mmd/index': '../experimental-plugins/mmd/index',
              // 'composition-layer/composition-layer': '../experimental-plugins/composition-layer/composition-layer',
              // 'plane/index': '../experimental-plugins/plane/index',
              // 'noise/index': '../experimental-plugins/noise/index',
            }
          : {}),
      },
      output: {
        filename: '[name].js',
        path: paths.compiled.plugins,
        libraryTarget: 'commonjs-module' as any,
      },
      devtool: __DEV__ ? '#source-map' : false,
      resolve: {
        extensions: ['.js', '.ts'],
        modules: ['node_modules'],
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules\//,
            use: [
              {
                loader: 'ts-loader',
                options: {
                  transpileOnly: true,
                },
              },
            ],
          },
          {
            test: /\.(frag|vert)$/,
            loader: 'raw-loader',
          },
        ],
      },
      plugins: [
        new webpack.DefinePlugin({ __DEV__: JSON.stringify(__DEV__) }),
        new (webpack as any).ExternalsPlugin('commonjs', ['@delirvfx/core']),
        ...(__DEV__ ? [] : [new webpack.optimize.AggressiveMergingPlugin()]),
      ],
    },
    function(err, stats) {
      err && console.error(err)
      stats.compilation.errors.length &&
        stats.compilation.errors.forEach(e => {
          console.error('Plugin compilation: ', e.message)
          e.module && console.error(e.module.userRequest)
        })

      notifier.notify({ title: 'Delir build', message: 'Plugin compiled', sound: true })
      console.log('Plugin compiled')
      done()
    },
  )
}

export function copyPluginsPackageJson() {
  return g
    .src(join(paths.src.plugins, '*/package.json'), { base: join(paths.src.plugins) })
    .pipe(g.dest(paths.compiled.plugins))
}

export function copyContribPEPPackageJson() {
  return g
    .src(join(paths.src.contribPEP, '*/package.json'), { base: join(paths.src.contribPEP) })
    .pipe(g.dest(paths.compiled.plugins))
}

export function copyExperimentalPluginsPackageJson() {
  return __DEV__
    ? g.src(join(paths.src.root, 'experimental-plugins/*/package.json')).pipe(g.dest(paths.compiled.plugins))
    : Promise.resolve()
}

export function copyImage() {
  return g
    .src(join(paths.src.frontend, 'assets/images/**/*'), { since: g.lastRun('copyImage') })
    .pipe(g.dest(join(paths.compiled.frontend, 'assets/images')))
}

export function makeIcon() {
  return new Promise((resolve, reject) => {
    const binName = isWindows ? 'electron-icon-maker.cmd' : 'electron-icon-maker'
    const binPath = join(__dirname, 'node_modules/.bin/', binName)
    const source = join(__dirname, 'build-assets/icon.png')

    const iconMaker = spawn(binPath, [`--input=${source}`, `--output=./build-assets`])
    iconMaker
      .on('error', err => reject(err))
      .on('close', (code, signal) => (code === 0 ? resolve() : reject(new Error(signal))))
  })
}

export async function pack(done) {
  const yarnBin = isWindows ? 'yarn.cmd' : 'yarn'
  const electronVersion = require('./package.json').devDependencies.electron

  await fs.remove(join(paths.build, 'node_modules'))

  await new Promise((resolve, reject) => {
    spawn(yarnBin, ['install'], { cwd: paths.build, stdio: 'inherit' })
      .on('error', err => reject(err))
      .on('close', (code, signal) => (code === 0 ? resolve() : reject(new Error(code))))
  })

  const targets = [
    ...(isMacOS ? [builder.Platform.MAC.createTarget()] : []),
    ...(isWindows ? [builder.Platform.WINDOWS.createTarget()] : []),
    ...(isLinux ? [builder.Platform.LINUX.createTarget()] : []),
  ]

  for (const target of targets) {
    await builder.build({
      // targets: builder.Platform.MAC.createTarget(),
      targets: target,
      publish: 'never',
      config: {
        appId: 'studio.delir',
        copyright: '© 2017 Ragg',
        productName: 'Delir',
        electronVersion,
        asar: true,
        asarUnpack: ['node_modules/'],
        npmRebuild: true,
        // nodeGypRebuild: true,
        directories: {
          buildResources: join(__dirname, 'build-assets/build'),
          app: paths.build,
          output: paths.release,
        },
        mac: {
          target: 'dir',
          type: 'distribution',
          category: 'AudioVideo',
          icon: join(__dirname, 'build-assets/icons/mac/icon.icns'),
        },
        win: {
          target: 'dir',
          icon: join(__dirname, 'build-assets/icons/win/icon.ico'),
        },
        linux: {
          target: [{ target: 'AppImage' }, { target: 'deb' }],
          category: 'Video',
        },
        deb: {
          depends: ['gconf2', 'gconf-service', 'libnotify4', 'libappindicator1', 'libxtst6', 'libnss3', 'libdbus-1-3'],
        },
      },
    })
  }
}

export async function zipPackage() {
  const version = require('./package.json').version

  await Promise.all([
    new Promise((resolve, reject) =>
      zipDir(join(paths.release, 'mac'), { saveTo: join(paths.release, `Delir-${version}-mac.zip`) }, err => {
        err ? reject(err) : resolve()
      }),
    ),
    new Promise((resolve, reject) =>
      zipDir(join(paths.release, 'win-unpacked'), { saveTo: join(paths.release, `Delir-${version}-win.zip`) }, err => {
        err ? reject(err) : resolve()
      }),
    ),
  ])
}

export async function clean(done) {
  await fs.remove(paths.release)
  await fs.remove(paths.compiled.root)

  if (fs.existsSync(join(paths.compiled.root, 'node_modules'))) {
    try {
      await fs.unlink(join(paths.compiled.root, 'node_modules'))
    } catch (e) {}
  }

  done()
}

export async function cleanRendererScripts(done) {
  await fs.remove(join(paths.compiled.frontend, 'scripts'))
  done()
}

export function run(done) {
  const electron = spawn(require('electron'), [join(paths.compiled.frontend, 'browser.js')], { stdio: 'inherit' })
  electron.on('close', code => {
    code === 0 && run(() => {})
  })
  done()
}

export function watch() {
  g.watch(join(paths.src.frontend, '**/*'), buildRendererWithoutJs)
  g.watch(
    join(paths.src.root, '**/package.json'),
    g.parallel(copyPluginsPackageJson, copyContribPEPPackageJson, copyExperimentalPluginsPackageJson),
  )
  g.watch(join(__dirname, 'node_modules'), symlinkNativeModules)
}

export function runStorybook(done) {
  const yarnBin = isWindows ? 'yarn.cmd' : 'yarn'
  spawn(yarnBin, ['storybook', '--ci', '--quiet'], { stdio: 'inherit', cwd: paths.src.frontend })
  done()
}

const buildRendererWithoutJs = g.parallel(copyImage)
const buildRenderer = g.parallel(
  g.series(
    generateLicenses,
    compileRendererJs,
    g.parallel(compilePlugins, copyPluginsPackageJson, copyContribPEPPackageJson, copyExperimentalPluginsPackageJson),
  ),
  copyImage,
)

const buildBrowser = g.parallel(buildBrowserJs, g.series(buildPublishPackageJSON, symlinkNativeModules))
const build = g.parallel(buildRenderer, buildBrowser)
const buildAndWatch = g.series(clean, g.parallel(runStorybook, build), run, watch)
const publish = g.series(clean, generateLicenses, build, makeIcon, pack, downloadAndDeployFFmpeg, zipPackage)

export { publish, build }
export default buildAndWatch
