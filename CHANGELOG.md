# Changelog

## [1.0.6](https://github.com/udondan/marktguru-cli/compare/v1.0.5...v1.0.6) (2026-11-08)


### Dependencies

* **deps:** update amannn/action-semantic-pull-request action to v6.1.2 ([#76](https://github.com/udondan/marktguru-cli/issues/76)) ([d39aac9](https://github.com/udondan/marktguru-cli/commit/d39aac951a4c3e1d2ebae9b1afaa47aa791957aa))
* **deps:** update dependency eslint to v10.14.0 ([#66](https://github.com/udondan/marktguru-cli/issues/66)) ([bdc699e](https://github.com/udondan/marktguru-cli/commit/bdc699efd00dc7ee7b2fa51e79110e956755b735))
* **deps:** update dependency zizmor to v1.32.0 ([#74](https://github.com/udondan/marktguru-cli/issues/74)) ([4d276cb](https://github.com/udondan/marktguru-cli/commit/4d276cb95a892554fd0470f686ca106cd38bdaf5))
* **deps:** update jdx/mise-action action to v5.2.5 ([#69](https://github.com/udondan/marktguru-cli/issues/69)) ([1f0e382](https://github.com/udondan/marktguru-cli/commit/1f0e382137176cb2430651d229f4de1842ddcda3))
* **deps:** update jdx/mise-action action to v5.2.6 ([#73](https://github.com/udondan/marktguru-cli/issues/73)) ([7f974da](https://github.com/udondan/marktguru-cli/commit/7f974daaad8f99644dc03abecd9f092ad61ec222))
* **deps:** update udondan/wait-for-turn action to v1.11.0 ([#67](https://github.com/udondan/marktguru-cli/issues/67)) ([75e2b24](https://github.com/udondan/marktguru-cli/commit/75e2b24dde449d1aadace18c8d6286b8c15a5e75))
* **deps:** update udondan/wait-for-turn action to v1.12.0 ([#70](https://github.com/udondan/marktguru-cli/issues/70)) ([4e2bbf3](https://github.com/udondan/marktguru-cli/commit/4e2bbf3c6047f8bed243fb4ff039c2e85d0ffc72))
* **deps:** update udondan/wait-for-turn action to v1.13.0 ([#71](https://github.com/udondan/marktguru-cli/issues/71)) ([3620312](https://github.com/udondan/marktguru-cli/commit/36203121e81e008dd2ac117cb130433b8904207b))
* **deps:** update udondan/wait-for-turn action to v1.13.1 ([#72](https://github.com/udondan/marktguru-cli/issues/72)) ([bb3824e](https://github.com/udondan/marktguru-cli/commit/bb3824e7a6121aa7a4c56b6205429a5c987f7a67))
* **deps:** update udondan/wait-for-turn action to v1.14.0 ([#75](https://github.com/udondan/marktguru-cli/issues/75)) ([0138aa2](https://github.com/udondan/marktguru-cli/commit/0138aa23ad8ffc09627e5049293568deb92038ea))

## [1.0.5](https://github.com/udondan/marktguru-cli/compare/v1.0.4...v1.0.5) (2026-11-02)


### Bug Fixes

* **deps:** override minimatch to patched version ([#59](https://github.com/udondan/marktguru-cli/issues/59)) ([0368be5](https://github.com/udondan/marktguru-cli/commit/0368be5b24313994e5a1eb31f26af53a6346d55b))

## [1.0.4](https://github.com/udondan/marktguru-cli/compare/v1.0.3...v1.0.4) (2026-10-26)

Only development dependencies were updated. Nothing changed for users.

## [1.0.3](https://github.com/udondan/marktguru-cli/compare/v1.0.2...v1.0.3) (2026-10-19)

Only development dependencies were updated. Nothing changed for users.

## [1.0.2](https://github.com/udondan/marktguru-cli/compare/v1.0.1...v1.0.2) (2026-10-13)

Only development dependencies were updated. Nothing changed for users.

## [1.0.1](https://github.com/udondan/marktguru-cli/compare/v1.0.0...v1.0.1) (2026-09-18)


### Miscellaneous Chores

* drop header-generator dependency ([fdb70d0](https://github.com/udondan/marktguru-cli/commit/fdb70d072693d2ac99c33ccc54060a61c13d40a1))

## [1.0.0](https://github.com/udondan/marktguru-cli/compare/v0.1.0...v1.0.0) (2026-09-17)


### Features

* add country selection for AT/DE support ([6f65c21](https://github.com/udondan/marktguru-cli/commit/6f65c216014e935f7cbfe168e2e4deff1326e6ab))
* add country selection for AT/DE support ([75c8873](https://github.com/udondan/marktguru-cli/commit/75c8873a661381d11c225400a41ad594c3af90c9))
* add tests for getApiBase ([f64c91c](https://github.com/udondan/marktguru-cli/commit/f64c91cc0106f9e4aaebe607d11a19b9143014a9))


### Bug Fixes

* clear API key when country changes in set-country ([8277f3f](https://github.com/udondan/marktguru-cli/commit/8277f3f28f0177b2617564b1e3d035496eef3d5d))
* keep --version in sync with the released version ([#13](https://github.com/udondan/marktguru-cli/issues/13)) ([95d2a73](https://github.com/udondan/marktguru-cli/commit/95d2a7373f5994fd92d6bad5e14eb89fd8eb1066))
* only report apiKeyCleared:true in JSON when a key was actually cleared ([beb63ac](https://github.com/udondan/marktguru-cli/commit/beb63ac1584e3b28bc05936c1969b7d8c7c6ca59))
* pass country to extractApiKey during auto-login in search ([d52f2cf](https://github.com/udondan/marktguru-cli/commit/d52f2cf28059922826958fedd8ea0e23c16db73f))
* validate country code before interpolating into URLs ([4ac9f76](https://github.com/udondan/marktguru-cli/commit/4ac9f76a7f4fcad0a5f9da829ffdfd5c856a1ca1))


### Miscellaneous Chores

* set up release-please, npm trusted publishing and publish as @udondan/marktguru-cli ([#2](https://github.com/udondan/marktguru-cli/issues/2)) ([4cf577e](https://github.com/udondan/marktguru-cli/commit/4cf577e30fe57269e9a344ad3483078424d884d3))
