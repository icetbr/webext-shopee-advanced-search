#!/bin/bash

PATH=$PATH:node_modules/.bin
. ./.env

# NOTES
# - web-ext lint is always needed because if the extension doesn’t meet the standards, it is rejected by the browser store
# - I lint only the `dist`` folder because I rely on the IDE to lint the `src` folder

# TEMP
# - the code is not ready to be airbnb-lintable
_lintAirbnb     () { eslint dist && web-ext lint                                                                                                                                                                               ;}
_lintJustWebext () { web-ext lint                                                                                                                                                                                              ;}

# SUPPORT
sync             () { if [ -n "$(diff $1 ../utils/$1)" ]; then code --diff --wait $1 ../utils/$1 ; fi                                                                                                                           ;}
syncConfigs      () { sync .eslintrc.json && sync .gitignore                                                                                                                                                                    ;}
zipSrc           () { cd dist && zip -r -FS ../$WEBEXT_ID *                                                                                                                                                                     ;}
lint             () { _lintJustWebext "$@"                                                                                                                                                                                      ;}
bundle           () { rollup --config rollup.config.js                                                                                                                                                                          ;}
copyFiles        () { cp -R manifest.json media/icons dist                                                                                                                                                                      ;}
adjustManifestV3 () { sed -i 's/2/3/' dist/manifest.json && sed -i '18,23d' dist/manifest.json                                                                                                                                  ;}
listDependencies () { node -e "import('../utils/src/listDependencies.js').then(m => m.listDependencies())" ;}


# MAIN
build            () { bundle && copyFiles && lint                                                                                                                                                                               ;}
firstRun         () { build && zipSrc && firefox https://addons.mozilla.org/en-US/developers/addon/submit/upload-listed                                                                                                         ;}
publishFirefox   () { build && web-ext sign --channel= listed --api-key=$FIREFOX_KEY --api-secret=$FIREFOX_SECRET --id=$WEBEXT_ID                                                                                               ;}
# publishChrome    () { build && adjustManifestV3 && chrome-webstore-upload upload --source dist --extension-id $WEBEXT_ID --client-id $CHROME_KEY --client-secret $CHROME_SECRET --refresh-token $CHROME_REFRESH_TOKEN           ;}
publishChrome    () { build && adjustManifestV3 && chrome-webstore-upload publish --source dist --extension-id $WEBEXT_ID --client-id $CHROME_KEY --client-secret $CHROME_SECRET --refresh-token $CHROME_REFRESH_TOKEN           ;}

# ./node_modules/.bin/cspell README.md

"$@"
