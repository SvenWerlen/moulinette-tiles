# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [12.0.1] - 2024-04-23
### Fixed
- Missing dependency to moulinette-core (v12)
### Changed
- Support for v12

## [11.1.3] - 2024-01-04
### Fixed
- 11.1.1: Small images scaled up in the preview (making them look ugly)
- 11.1.2: Animated assets do not display image when on the favoritte window (#69)
- 11.1.3: Path separators entity-encoded since recently #13

## [11.1.0] - 2023-06-08
### Added
- Avif support

## [11.0.2] - 2023-05-07
### Fixed
- 11.0.4: Fix rendering for special characters (&,+)
- 11.0.3: Official support for V11
- 11.0.2: macros from modules not working (specially TokenMagic Portfolio)
### Changed
- Indexes are now world-specific
- Optimizations for The Forge (hosting provider) & S3
### Added
- Support for drag & drop animated tiles (as video)

## [10.7.0] - 2023-03-21
### Added
- API for retrieving the URL of an asset

## [10.6.0] - 2023-02-19
### Added
- Marketplace integration (available assets)

## [10.5.1] - 2022-01-28
### Fixed
- 10.5.1 Missing thumb resizing for Prefabs
### Changed
- New look-and-feel general availability

## [10.4.0] - 2022-12-22
### Changed
- New interface (auto-scroll lists, breadcrumbs)
- Improved footer
### Added
- Create article from image
- Whole word search & regex search

## [10.3.2] - 2022-12-04
### Fixed
- 10.3.1: fix (tentative) for prefabs and PF2 system
- 10.3.2: fix tiles not showing on top of others (due to FoundryVTT bug: https://github.com/foundryvtt/foundryvtt/issues/8656)
- 10.3.3: fix backward-compatible fix (10.3.2) for V10 (using document.sort rather than data.z)
### Added
- Improved UI for "in progress" indexing

## [10.2.3] - 2022-10-30
### Fixed
- 10.2.1: fix V10 compatibility
- 10.2.2: fix Prefabs not showing up on scene on drag & drop
- 10.2.3: fix Prefabs without stats block. Make "clean prefabs data" configurable for backwards compatibility with other systems.
### Changed
- Sources filtered for tiles/images only

## [10.1.0] - 2022-09-24
### Changed
- Download action closes the window
- Middle mouse click on tile adds to clipboard (after downloading it)

## [10.0.4] - 2022-09-02
### Fixed
- 10.0.2: folder view doesn't list subfolders systematically
- 10.0.3: image previews broken for faceted search on The Forge
- 10.0.4: V10 duplicate folders on actor/article import
### Changed
- Compatibility with V10
- Major version based on FVTT

## [4.9.1] - 2022-07-31
### Fixed
- 4.9.1: Dropped tiles not at the highest most point
- 4.9.3: folder view doesn't list subfolders systematically
### Added
- Support for thumb sizes (increase/decrease)

## [4.8.0] - 2022-05-15
### Changed
- Manage sources (for indexing process)

## [4.7.2] - 2021-04-07
### Fixed
- Tiles not listed into history
- 4.7.1 : fix faceted search for specific ScenePacker packs
- 4.7.2 : remove useless CDN for thumbs
- 4.7.3 : prefabs not importing in PF2 system
### Added
- Randomly drops a image as tile/article/token on the scene (for all)
- Support for ScenePacker Adventures

## [4.6.0] - 2021-02-26
### Fixed
- Moulinette Favorites only shows 100 first assets
### Added
- Randomly drops a image as tile/article/token on the scene (early release)
- Moulinette faceted search : zoom / preview on mouse over
- Integration with The Token Vault

## [4.5.0] - 2021-02-12
### Fixed
- ScenePacker prefabs/actors cannot import selected
### Added
- Support for The Token Vault (integration)

## [4.4.0] - 2021-02-06
### Added
- Support for ScenePacker (actors/prefabs)
### Changed
- Icon changed to "users" (less confusing)

## [4.3.1] - 2021-01-30
### Fixed
- 4.3.1 : not working when special characters like # in filename
- 4.3.2 : typo in jp translations
### Added
- Japanese translations
### Changed
- Help & controls (see core)

## [4.1.0/4.2.0] - 2021-01-15
### Fixed
- V9 support for Prefabs
### Changed
- Faceted Search for Moulinette Cloud
- Moulinette categories

## [4.0.1] - 2021-12-23
### Fixed
- 4.0.1 : V9 scene import does not nest folders (Issue #28)
### Changed
- Support for FVTT 9.x
- Support for FVTT 0.7 and 0.8 removed

## [3.7.1] - 2021-10-31
### Fixed
- 3.7.1: Warning when 'navigator.clipboard' not supported
- 3.7.2: Fix for supporting overloaded Actor.create()
### Changed
- Rename tab Tiles => Tiles/Tokens to make it more intuitive

## [3.6.1] - 2021-10-31
### Fixed
- Unable to create scenes with Webm files from within Moulinette

## [3.6.0] - 2021-10-11
### Added
- Drag as token : automatically creates actor
### Changed
- Remove 0.7.x support
- "Forge" removed from all the UI (to avoid confusion with The Forge)

## [3.5.0] - 2021-09-25
### Added
- Previews (available tiles on Moulinette Cloud)

## [3.4.2] - 2021-09-12
### Fixed
- Support for 0.8.9
### Added
- Favorites : history, groups

## [3.3.1] - 2021-08-21
### Fixed
- 3.3.1: Fix error in the console (isFavorite) when packId doesn't exist
### Added
- Path copied into clipboard after downloading it (detail page only)

## [3.2.0] - 2021-08-02
### Added
- Support for Moulinette Cloud (private storage)
- Create scenes from an image

## [3.1.0] - 2021-06-24
### Added
- Support for UI mode "compact"

## [3.0.1] - 2021-06-24
### Added
- Support for new Moulinette FilePicker
### Fixed
- Tiles added to background layer even when foreground layer selected

## [2.7.1] - 2021-06-18
### Changed
- Drag & drop prefabs will create folder structure

## [2.6.0] - 2021-06-17
### Changed
- Drag & drop as journal article will create folder structure

## [2.5.0] - 2021-06-16
### Added
- Browse mode by creator (rather than pack)

## [2.4.0] - 2021-06-15
- Prefabs for 0.8.x

## [2.3.4] - 2021-06-12
### Added
- Support for new view mode (browse)
### Fixed
- Tiles don't show up if download not yet finished
- Macros not working anymore (ex: shadow)
- Indexing doesn't clear the cache

## [2.2.0] - 2021-06-04
### Changed
- Multiple macros can now be specified (comma-separated)

## [2.1.0] - 2021-05-29
### Added
- Support for assets caching

## [2.0.0] - 2021-05-24
### Added
- Compatibility with FVTT 0.8.5

## [1.11.3] - 2021-05-24
### Added
- Moulinette Prefabs

## [1.10.1] - 2021-05-15
### Fixed
- Moulinette scans other sources (for S3)

## [1.10.0] - 2021-05-09
### Added
- Video (webm) preview on hover and in details page
- DisplayMode : tiles / list
- Integration with Moulinette Cloud and Patreon (preview)

## [1.9.0] - 2021-05-08
### Added
- Moulinette support for .webm videos

## [1.8.0] - 2021-05-03
### Added
- Moulinette scans images & tiles
- Moulinette scans other sources (defined by other modules)

## [1.7.0] - 2021-05-03
### Changed
- Canvas layer activation according to drag & drop mode (eg. drop a tile -> activates TilesLayer)
- Make tile on top of other after drag&drop

## [1.6.0] - 2021-04-28
### Added
- Support for S3 as storage

## [1.5.0] - 2021-04-22
### Changed
- Support for showcase content

## [1.4.0] - 2021-04-21
### Added
- Support for executing macros after creating a tile/token/note

## [1.3.0] - 2021-04-20
### Added
- Tilesize (DPI mode)
### Changed
- Improved display of numbers (separator)

## [1.2.0] - 2021-04-18
### Added
- Drag-and-drop mode available for other modules

## [1.1.0] - 2021-04-17
### Added
- Drag-and-drop as actor
- Drag-and-drop as journal article

## [1.0.1] - 2021-04-16
### Added
- Download, install, manage tiles
