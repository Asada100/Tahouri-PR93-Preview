# Composite activity preview

The mobile preview is published at:

`https://asada100.github.io/Tahouri-Edu-Platform/preview/`

It keeps the production site at the repository Pages root and copies the `feature/composite-matching-adapter-v1` branch into `/preview/`. Preview browser storage is namespaced separately so testing does not overwrite production profile data.

To refresh the preview, run the production GitHub Pages deployment on `master`; the `Composite Matching Mobile Preview` workflow then builds and deploys the isolated preview. The game PR remains separate and must not be merged until the mobile browser test is complete.
