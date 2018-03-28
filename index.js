const path = require('path');
const WebTorrent = require('webtorrent');
const Progress = require('progress');
const n = require('numeral');
const yargs = require('yargs');

const cwd = process.cwd();

const args = yargs
  .option('torrent', {
    alias: 't',
    demandOption: true,
    describe: 'A magnet link, http/https link, or a path to a torrent file.',
    type: 'string',
    coerce: arg => {
      if (!arg.startsWith('magnet') && !arg.startsWith('http')) {
        return arg.charAt(0) === '/' ? arg : path.resolve(process.cwd(), arg);
      }

      return arg;
    },
  })
  .option('out-dir', {
    alias: 'o',
    describe: 'Directory to write file(s) to.',
    default: cwd,
    type: 'string',
    coerce: arg => {
      return arg.charAt(0) === '/' ? arg : path.resolve(process.cwd(), arg);
    },
  })
  .help()
  .parse();

const { torrent, outDir } = args;
const client = new WebTorrent();

function shutdown() {
  console.log('\nshuting down.');
  client.destroy(() => {
    console.log('shut down gracefully.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.add(torrent, { path: outDir }, t => {
  const bar = new Progress(
    'downloading [:bar] speed: :speed/s / downloaded: :downloaded / time remaining: :remainings / peers: :peers',
    {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: 100,
    },
  );
  let currentTick = 0;

  t.on('done', () => {
    bar.tick({ curr: 100 });
    console.log('finished');
    shutdown();
  });

  t.on('download', () => {
    const p = Math.floor(t.progress * 100);

    if (p > currentTick) {
      currentTick = p;

      bar.tick({
        speed: n(t.downloadSpeed).format('0.0b'),
        downloaded: n(t.downloaded).format('0.0b'),
        remaining: n(t.timeRemaining / 1000).format('00:00:00'),
        peers: n(t.numPeers).format('0,0'),
        curr: currentTick,
      });
    }
  });
});
