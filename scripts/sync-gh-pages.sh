#!/bin/bash
set -e

git checkout gh-pages
git merge main --no-edit
git push origin gh-pages
git checkout main
