# Changelog

## [1.1.0](https://github.com/finnjanssens/slack-copy/compare/slack-copy-v1.0.0...slack-copy-v1.1.0) (2026-09-21)


### Features

* add agent skill packaging ([f0386b5](https://github.com/finnjanssens/slack-copy/commit/f0386b5d710b20fe39cc0ecda448ff692585fa14))
* automatic versioning and publishing ([f8cb8d9](https://github.com/finnjanssens/slack-copy/commit/f8cb8d947316bab7ea25040b9ebe31135de3c1d3))
* automatic versioning and publishing via release-please ([d55cc69](https://github.com/finnjanssens/slack-copy/commit/d55cc699e0fb3768fd907e96c24aa8e9d16103a2))
* cross-platform clipboard support ([145931a](https://github.com/finnjanssens/slack-copy/commit/145931a680543f85f8ecd8d288fc7a395b263782))
* cross-platform clipboard support ([fbbcd42](https://github.com/finnjanssens/slack-copy/commit/fbbcd42a20b4008829fbc33907e53ec7957f93d6))
* data-driven evals with CI ([743e2b9](https://github.com/finnjanssens/slack-copy/commit/743e2b9c6f1b5fb46e407f565d0a0478548bebe4))
* markdown to slack mrkdwn CLI with clipboard copy ([561b20c](https://github.com/finnjanssens/slack-copy/commit/561b20ce10f176b1fa006970a5788326d686a5c2))
* migrate to TypeScript, require Node 26 ([6ac5f62](https://github.com/finnjanssens/slack-copy/commit/6ac5f62f6434defdfca963dec37f7c7a8c06f3a1))
* Node 26, TypeScript migration + evals ([f69c636](https://github.com/finnjanssens/slack-copy/commit/f69c636ff812e8b6f8d1365a153b9f6a38327fcd))
* trusted publishing, no npm token needed ([6eb9356](https://github.com/finnjanssens/slack-copy/commit/6eb93568c9c3e7bd4ebc24856c37b331c13b78cd))


### Bug Fixes

* copy as HTML, the rich composer does not read mrkdwn ([a037d25](https://github.com/finnjanssens/slack-copy/commit/a037d25638b7f5bd1a45e088285147f1377cf971))
* install dependencies before typecheck in CI ([5dd7bfe](https://github.com/finnjanssens/slack-copy/commit/5dd7bfe88a22c1bf2d3f14348e6df66fcb22d923))
* normalize clipboard read-back in tests (CRLF on windows, wl-copy newline) ([ba0e80c](https://github.com/finnjanssens/slack-copy/commit/ba0e80c96eeafb074ac886d77dd18d5989535c6a))
* publish compiled JS, node cannot strip types under node_modules ([1e2409e](https://github.com/finnjanssens/slack-copy/commit/1e2409ee1135ba9fc3e1584a59322da7a3ad1ad9))
* publish workflow per GitHub guide (provenance flag, action v6/v7) ([f4ea3a0](https://github.com/finnjanssens/slack-copy/commit/f4ea3a06ba80b0d0f106efe91febef866c71606f))
* release-please packages must be an object, array indexes become paths ([2221b53](https://github.com/finnjanssens/slack-copy/commit/2221b53e080c82005d35c1338bef09c761bd77ab))
* restore devDependencies and engines lost in the evals merge ([5e79ed3](https://github.com/finnjanssens/slack-copy/commit/5e79ed3ca610c61755eb4d0911d0b98b092bd24f))
* run CI on Node 26 for native TS support ([d07822d](https://github.com/finnjanssens/slack-copy/commit/d07822d91faea5ba34f428298ae4580a17049267))
* wl-paste flag is --no-newline ([373cb27](https://github.com/finnjanssens/slack-copy/commit/373cb27008467b9e34d6115350410278aa68ab01))
