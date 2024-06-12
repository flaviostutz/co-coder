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
	rm -rf .out
	pnpm exec ts-node src/main.ts run \
		--task "Convert main.ts to Golang" \
		--files **/main.ts \
		--model gpt-4o \
		--output .out \
		--max-tokens-total 50000 \
		--max-file-requests 5 \
		--log debug \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s flaviostutz-openai-apikey)"

	@# --task "Write a documentation for the cli with a summary, api and examples of usage" \

run-example-azure:
	rm -rf .out
	pnpm exec ts-node src/main.ts run \
		--task "Convert main.ts to Golang" \
		--files **/main.ts \
		--preview README.md \
		--model gpt-4-turbo \
		--output .out \
		--max-tokens-total 40000 \
		--max-file-requests 5 \
		--log debug \
		--api-provider azure \
		--api-url https://sc01openaiservices03.openai.azure.com/ \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s nn-azure-openai-sc01openaiservices03)"

	@# --task "Describe what the file workspacePromptRunner does and write the output to the file /summary.md"
	@# --model gpt-3.5-turbo-0125 \

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

