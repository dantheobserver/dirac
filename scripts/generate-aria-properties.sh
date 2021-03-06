#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

cd "$CHROMIUM_BLINK_RENDERER_DIR"

rm -rf _build_devtools

gn gen _build_devtools

ninja -C _build_devtools third_party/blink/renderer/devtools:aria_properties

file "$GENERATED_ARIA_PROPERTIES_JS_FILE"

js-beautify -f "$GENERATED_ARIA_PROPERTIES_JS_FILE" -o "$ARIA_PROPERTIES_JS_FILE_DESTINATION"
