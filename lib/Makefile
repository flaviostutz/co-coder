SHELL := /bin/bash

build: install
	@rm -rf dist

	@# lib build
	npx esbuild src/index.ts --bundle --platform=node --minify --outfile=dist/index.js

	@# cli build
	npx esbuild src/main.ts --bundle --platform=node --minify --outfile=dist/main.js
	npx tsc --emitDeclarationOnly --outDir dist

	@# Create pack to be used by examples app to simulate real usage of the lib
	pnpm pack --pack-destination dist

run-example-openai:
	pnpm exec ts-node src/main.ts run \
		--task "Discover any bug in this code, summarize them in 50 words and write it to summary.md" \
		--files ^src/workspacePromptRunner\.ts$ \
		--preview ^README.md$ \
		--model gpt-3.5-turbo \
		--output .out \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s flaviostutz-openai-apikey)"

lint:
	pnpm exec eslint ./src --ext .ts
	pnpm audit

lint-fix:
	pnpm exec eslint . --ext .ts --fix

test: unit-tests

test-watch:
	pnpm exec jest -i --watch

unit-tests:
	@# can't be in parallel because we use nock that has shared contexts
	pnpm exec jest -i --verbose

clean:
	rm -rf node_modules
	rm -rf dist

all: build lint test

install:
	# nvm install
	corepack enable
	pnpm install --frozen-lockfile --config.dedupe-peer-dependents=false

publish:
	@if [ "$${NPM_ACCESS_TOKEN}" == "" ]; then \
		echo "env NPM_ACCESS_TOKEN is required"; \
		exit 1; \
	fi

	git config --global user.email "flaviostutz@gmail.com"
	git config --global user.name "Flávio Stutz"
	npm version from-git --no-git-tag-version

	echo "" >> .npmrc
	echo "//registry.npmjs.org/:_authToken=$${NPM_ACCESS_TOKEN}" >> .npmrc
	pnpm publish --no-git-checks

