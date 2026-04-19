#!/bin/bash
set -e
npm run build
npx gh-pages -d dist
